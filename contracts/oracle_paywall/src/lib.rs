//! Aurum OraclePaywall domain contract.
//!
//! The paywall models how x402-gated credit queries should behave on Casper
//! testnet. For the hackathon MVP, payment proof verification is isolated to
//! a placeholder validator so the query path and security rules can be tested
//! without pretending that live facilitator settlement is already complete.
//!
//! TODO: Replace `verify_payment_proof` with real Casper x402 facilitator
//! verification and settle logic once the official facilitator details are
//! available in the environment.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PaywallRole {
    Admin,
    Reader,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OracleCreditProfile {
    pub borrower: String,
    pub credit_score: u16,
    pub tier: String,
    pub attestation_hash: String,
    pub expiry_at: u64,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaymentProof {
    pub payer: String,
    pub amount_motes: u64,
    pub nonce: String,
    pub deadline: u64,
    pub network: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct QueryLog {
    pub requester: String,
    pub borrower: String,
    pub queried_at: u64,
    pub amount_motes: u64,
    pub nonce: String,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum OraclePaywallError {
    #[error("caller is not authorized")]
    Unauthorized,
    #[error("query price must be greater than zero")]
    InvalidQueryPrice,
    #[error("borrower profile is missing")]
    MissingCredential,
    #[error("borrower profile is inactive or stale")]
    StaleCredential,
    #[error("payment proof has expired")]
    ProofExpired,
    #[error("payment proof was already used")]
    DuplicateProof,
    #[error("payment proof amount is below the query price")]
    InsufficientPayment,
    #[error("payment proof network does not match the configured network")]
    WrongNetwork,
}

#[derive(Debug, Default)]
pub struct OraclePaywall {
    roles: HashMap<String, PaywallRole>,
    profiles: HashMap<String, OracleCreditProfile>,
    used_nonces: HashSet<String>,
    query_logs: Vec<QueryLog>,
    treasury_account: String,
    query_price_motes: u64,
    network: String,
}

impl OraclePaywall {
    pub fn new(
        admin: impl Into<String>,
        treasury_account: impl Into<String>,
        query_price_motes: u64,
        network: impl Into<String>,
    ) -> Result<Self, OraclePaywallError> {
        if query_price_motes == 0 {
            return Err(OraclePaywallError::InvalidQueryPrice);
        }
        let admin = admin.into();
        let mut roles = HashMap::new();
        roles.insert(admin, PaywallRole::Admin);
        Ok(Self {
            roles,
            profiles: HashMap::new(),
            used_nonces: HashSet::new(),
            query_logs: Vec::new(),
            treasury_account: treasury_account.into(),
            query_price_motes,
            network: network.into(),
        })
    }

    pub fn assign_role(
        &mut self,
        caller: &str,
        account: impl Into<String>,
        role: PaywallRole,
    ) -> Result<(), OraclePaywallError> {
        self.ensure_admin(caller)?;
        self.roles.insert(account.into(), role);
        Ok(())
    }

    /// Stores a normalized profile snapshot that the paid oracle can expose.
    pub fn upsert_profile(
        &mut self,
        caller: &str,
        profile: OracleCreditProfile,
    ) -> Result<(), OraclePaywallError> {
        self.ensure_reader(caller)?;
        self.profiles.insert(profile.borrower.clone(), profile);
        Ok(())
    }

    pub fn set_query_price(
        &mut self,
        caller: &str,
        query_price_motes: u64,
    ) -> Result<(), OraclePaywallError> {
        self.ensure_admin(caller)?;
        if query_price_motes == 0 {
            return Err(OraclePaywallError::InvalidQueryPrice);
        }
        self.query_price_motes = query_price_motes;
        Ok(())
    }

    pub fn query_credit_profile(
        &mut self,
        requester: &str,
        borrower: &str,
        proof: PaymentProof,
        now: u64,
    ) -> Result<OracleCreditProfile, OraclePaywallError> {
        self.verify_payment_proof(&proof, now)?;
        let profile = self
            .profiles
            .get(borrower)
            .ok_or(OraclePaywallError::MissingCredential)?;

        if !profile.active || profile.expiry_at <= now {
            return Err(OraclePaywallError::StaleCredential);
        }

        self.used_nonces.insert(proof.nonce.clone());
        self.query_logs.push(QueryLog {
            requester: requester.to_string(),
            borrower: borrower.to_string(),
            queried_at: now,
            amount_motes: proof.amount_motes,
            nonce: proof.nonce,
        });
        Ok(profile.clone())
    }

    pub fn bulk_query(
        &mut self,
        requester: &str,
        borrowers: &[String],
        proofs: &[PaymentProof],
        now: u64,
    ) -> Result<Vec<OracleCreditProfile>, OraclePaywallError> {
        let mut profiles = Vec::with_capacity(borrowers.len());
        for (borrower, proof) in borrowers.iter().zip(proofs.iter()) {
            profiles.push(self.query_credit_profile(requester, borrower, proof.clone(), now)?);
        }
        Ok(profiles)
    }

    pub fn query_logs(&self) -> &[QueryLog] {
        &self.query_logs
    }

    pub fn treasury_account(&self) -> &str {
        &self.treasury_account
    }

    fn verify_payment_proof(
        &self,
        proof: &PaymentProof,
        now: u64,
    ) -> Result<(), OraclePaywallError> {
        if proof.network != self.network {
            return Err(OraclePaywallError::WrongNetwork);
        }
        if proof.deadline <= now {
            return Err(OraclePaywallError::ProofExpired);
        }
        if self.used_nonces.contains(&proof.nonce) {
            return Err(OraclePaywallError::DuplicateProof);
        }
        if proof.amount_motes < self.query_price_motes {
            return Err(OraclePaywallError::InsufficientPayment);
        }
        Ok(())
    }

    fn ensure_admin(&self, caller: &str) -> Result<(), OraclePaywallError> {
        match self.roles.get(caller) {
            Some(PaywallRole::Admin) => Ok(()),
            _ => Err(OraclePaywallError::Unauthorized),
        }
    }

    fn ensure_reader(&self, caller: &str) -> Result<(), OraclePaywallError> {
        match self.roles.get(caller) {
            Some(PaywallRole::Admin | PaywallRole::Reader) => Ok(()),
            _ => Err(OraclePaywallError::Unauthorized),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_reused_nonces() {
        let mut paywall =
            OraclePaywall::new("admin", "account-hash-treasury", 100, "casper-test").unwrap();
        paywall
            .assign_role("admin", "reader", PaywallRole::Reader)
            .unwrap();
        paywall
            .upsert_profile(
                "reader",
                OracleCreditProfile {
                    borrower: "account-hash-1".to_string(),
                    credit_score: 800,
                    tier: "A".to_string(),
                    attestation_hash: "hash".to_string(),
                    expiry_at: 500,
                    active: true,
                },
            )
            .unwrap();

        let proof = PaymentProof {
            payer: "protocol".to_string(),
            amount_motes: 100,
            nonce: "nonce-1".to_string(),
            deadline: 200,
            network: "casper-test".to_string(),
        };

        paywall
            .query_credit_profile("protocol", "account-hash-1", proof.clone(), 150)
            .unwrap();
        let duplicate = paywall.query_credit_profile("protocol", "account-hash-1", proof, 151);
        assert_eq!(duplicate, Err(OraclePaywallError::DuplicateProof));
    }
}
