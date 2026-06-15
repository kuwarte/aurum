//! Aurum CreditRegistry domain contract.
//!
//! This crate implements the contract-side state machine that Dev 2 will
//! later wrap with exact Odra entrypoints during Casper testnet deployment.
//! The logic is intentionally isolated and fully testable in Rust so the
//! permission model, score bounds, and expiry handling are stable before
//! wiring the final Odra runtime layer.
//!
//! TODO: Replace the in-memory storage adapter with Odra storage primitives
//! once the final Odra toolchain version is locked for the buildathon repo.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

/// Fixed borrower role assignments used by Aurum's agent pipeline.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentRole {
    Admin,
    AttestationAgent,
    MonitoringAgent,
    ReadOnlyAgent,
}

/// Tier output consumed by lending and oracle integrations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CreditTier {
    A,
    B,
    C,
    D,
}

/// Covenant metadata kept flexible for the MVP while still being explicit.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CovenantRecord {
    pub label: String,
    pub value: String,
    pub updated_at: u64,
}

/// Historical snapshots let off-chain agents diff score changes over time.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreditScoreSnapshot {
    pub score: u16,
    pub tier: CreditTier,
    pub default_probability_bps: u16,
    pub borrowing_limit_motes: u64,
    pub attestation_hash: String,
    pub issued_at: u64,
    pub expiry_at: u64,
    pub active: bool,
}

/// Current credential returned to downstream integrations.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreditCredential {
    pub borrower: String,
    pub score: u16,
    pub tier: CreditTier,
    pub default_probability_bps: u16,
    pub borrowing_limit_motes: u64,
    pub attestation_hash: String,
    pub issued_at: u64,
    pub expiry_at: u64,
    pub active: bool,
    pub score_history: Vec<CreditScoreSnapshot>,
    pub covenants: Vec<CovenantRecord>,
}

/// Event-like records mirror what should be emitted once wrapped in Odra CES.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CreditRegistryEvent {
    CreditIssued { borrower: String, score: u16 },
    CreditUpdated { borrower: String, score: u16 },
    CreditRevoked { borrower: String, revoked_at: u64 },
    CovenantSet { borrower: String, label: String },
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum CreditRegistryError {
    #[error("caller is not authorized to perform this action")]
    Unauthorized,
    #[error("credit score must be between 0 and 1000")]
    InvalidScore,
    #[error("default probability must be between 0 and 10000 basis points")]
    InvalidDefaultProbability,
    #[error("expiry timestamp must be later than issue timestamp")]
    InvalidExpiry,
    #[error("borrower credential already exists")]
    CredentialAlreadyExists,
    #[error("borrower credential was not found")]
    CredentialNotFound,
}

/// In-memory contract core that can be wrapped by Odra storage later.
#[derive(Debug, Default)]
pub struct CreditRegistry {
    roles: HashMap<String, AgentRole>,
    credentials: HashMap<String, CreditCredential>,
    events: Vec<CreditRegistryEvent>,
}

impl CreditRegistry {
    /// Creates a new registry and assigns the admin role to the provided account.
    pub fn new(admin: impl Into<String>) -> Self {
        let mut roles = HashMap::new();
        roles.insert(admin.into(), AgentRole::Admin);
        Self {
            roles,
            credentials: HashMap::new(),
            events: Vec::new(),
        }
    }

    /// Grants or updates a role for a known agent account.
    pub fn assign_role(
        &mut self,
        caller: &str,
        account: impl Into<String>,
        role: AgentRole,
    ) -> Result<(), CreditRegistryError> {
        self.ensure_admin(caller)?;
        self.roles.insert(account.into(), role);
        Ok(())
    }

    /// Issues the first active credit credential for a borrower.
    pub fn issue_credit_score(
        &mut self,
        caller: &str,
        borrower: impl Into<String>,
        score: u16,
        tier: CreditTier,
        default_probability_bps: u16,
        borrowing_limit_motes: u64,
        attestation_hash: impl Into<String>,
        issued_at: u64,
        expiry_at: u64,
    ) -> Result<(), CreditRegistryError> {
        self.ensure_attestation_writer(caller)?;
        self.validate_score(score)?;
        self.validate_default_probability(default_probability_bps)?;
        self.validate_timestamps(issued_at, expiry_at)?;

        let borrower = borrower.into();
        if self.credentials.contains_key(&borrower) {
            return Err(CreditRegistryError::CredentialAlreadyExists);
        }

        let snapshot = CreditScoreSnapshot {
            score,
            tier,
            default_probability_bps,
            borrowing_limit_motes,
            attestation_hash: attestation_hash.into(),
            issued_at,
            expiry_at,
            active: true,
        };

        let credential = CreditCredential {
            borrower: borrower.clone(),
            score,
            tier,
            default_probability_bps,
            borrowing_limit_motes,
            attestation_hash: snapshot.attestation_hash.clone(),
            issued_at,
            expiry_at,
            active: true,
            score_history: vec![snapshot.clone()],
            covenants: Vec::new(),
        };

        self.credentials.insert(borrower.clone(), credential);
        self.events.push(CreditRegistryEvent::CreditIssued { borrower, score });
        Ok(())
    }

    /// Updates an existing borrower score while preserving the historical trail.
    pub fn update_score(
        &mut self,
        caller: &str,
        borrower: &str,
        score: u16,
        tier: CreditTier,
        default_probability_bps: u16,
        borrowing_limit_motes: u64,
        attestation_hash: impl Into<String>,
        issued_at: u64,
        expiry_at: u64,
    ) -> Result<(), CreditRegistryError> {
        self.ensure_attestation_writer(caller)?;
        self.validate_score(score)?;
        self.validate_default_probability(default_probability_bps)?;
        self.validate_timestamps(issued_at, expiry_at)?;

        let credential = self
            .credentials
            .get_mut(borrower)
            .ok_or(CreditRegistryError::CredentialNotFound)?;

        let snapshot = CreditScoreSnapshot {
            score,
            tier,
            default_probability_bps,
            borrowing_limit_motes,
            attestation_hash: attestation_hash.into(),
            issued_at,
            expiry_at,
            active: true,
        };

        credential.score = score;
        credential.tier = tier;
        credential.default_probability_bps = default_probability_bps;
        credential.borrowing_limit_motes = borrowing_limit_motes;
        credential.attestation_hash = snapshot.attestation_hash.clone();
        credential.issued_at = issued_at;
        credential.expiry_at = expiry_at;
        credential.active = true;
        credential.score_history.push(snapshot);

        self.events.push(CreditRegistryEvent::CreditUpdated {
            borrower: borrower.to_string(),
            score,
        });
        Ok(())
    }

    /// Revokes an active borrower credential without destroying history.
    pub fn revoke_credit_score(
        &mut self,
        caller: &str,
        borrower: &str,
        revoked_at: u64,
    ) -> Result<(), CreditRegistryError> {
        self.ensure_monitoring_writer(caller)?;
        let credential = self
            .credentials
            .get_mut(borrower)
            .ok_or(CreditRegistryError::CredentialNotFound)?;

        credential.active = false;
        if let Some(last) = credential.score_history.last_mut() {
            last.active = false;
            last.expiry_at = revoked_at;
        }

        self.events.push(CreditRegistryEvent::CreditRevoked {
            borrower: borrower.to_string(),
            revoked_at,
        });
        Ok(())
    }

    /// Updates covenant metadata linked to the borrower profile.
    pub fn set_covenant(
        &mut self,
        caller: &str,
        borrower: &str,
        label: impl Into<String>,
        value: impl Into<String>,
        updated_at: u64,
    ) -> Result<(), CreditRegistryError> {
        self.ensure_attestation_writer(caller)?;
        let label = label.into();
        let credential = self
            .credentials
            .get_mut(borrower)
            .ok_or(CreditRegistryError::CredentialNotFound)?;
        credential.covenants.push(CovenantRecord {
            label: label.clone(),
            value: value.into(),
            updated_at,
        });
        self.events.push(CreditRegistryEvent::CovenantSet {
            borrower: borrower.to_string(),
            label,
        });
        Ok(())
    }

    /// Returns the current borrower credential if it exists.
    pub fn get_credit_score(&self, borrower: &str) -> Option<CreditCredential> {
        self.credentials.get(borrower).cloned()
    }

    /// Returns the historical score trail for audit and analytics consumers.
    pub fn get_score_history(&self, borrower: &str) -> Option<Vec<CreditScoreSnapshot>> {
        self.credentials
            .get(borrower)
            .map(|credential| credential.score_history.clone())
    }

    /// Distinguishes credentials that are active on paper from those already stale.
    pub fn is_credential_active_at(&self, borrower: &str, now: u64) -> bool {
        self.credentials
            .get(borrower)
            .map(|credential| credential.active && credential.expiry_at > now)
            .unwrap_or(false)
    }

    /// Exposes the event trail until on-chain CES events are wired in.
    pub fn events(&self) -> &[CreditRegistryEvent] {
        &self.events
    }

    fn ensure_admin(&self, caller: &str) -> Result<(), CreditRegistryError> {
        match self.roles.get(caller) {
            Some(AgentRole::Admin) => Ok(()),
            _ => Err(CreditRegistryError::Unauthorized),
        }
    }

    fn ensure_attestation_writer(&self, caller: &str) -> Result<(), CreditRegistryError> {
        match self.roles.get(caller) {
            Some(AgentRole::Admin | AgentRole::AttestationAgent) => Ok(()),
            _ => Err(CreditRegistryError::Unauthorized),
        }
    }

    fn ensure_monitoring_writer(&self, caller: &str) -> Result<(), CreditRegistryError> {
        match self.roles.get(caller) {
            Some(AgentRole::Admin | AgentRole::MonitoringAgent) => Ok(()),
            _ => Err(CreditRegistryError::Unauthorized),
        }
    }

    fn validate_score(&self, score: u16) -> Result<(), CreditRegistryError> {
        if score <= 1000 {
            Ok(())
        } else {
            Err(CreditRegistryError::InvalidScore)
        }
    }

    fn validate_default_probability(
        &self,
        value: u16,
    ) -> Result<(), CreditRegistryError> {
        if value <= 10_000 {
            Ok(())
        } else {
            Err(CreditRegistryError::InvalidDefaultProbability)
        }
    }

    fn validate_timestamps(
        &self,
        issued_at: u64,
        expiry_at: u64,
    ) -> Result<(), CreditRegistryError> {
        if expiry_at > issued_at {
            Ok(())
        } else {
            Err(CreditRegistryError::InvalidExpiry)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn registry() -> CreditRegistry {
        let mut registry = CreditRegistry::new("admin");
        registry
            .assign_role("admin", "attestor", AgentRole::AttestationAgent)
            .unwrap();
        registry
            .assign_role("admin", "monitor", AgentRole::MonitoringAgent)
            .unwrap();
        registry
    }

    #[test]
    fn issues_and_updates_a_score() {
        let mut registry = registry();
        registry
            .issue_credit_score(
                "attestor",
                "account-hash-1",
                720,
                CreditTier::B,
                450,
                15_000_000_000,
                "ipfs://attestation-1",
                100,
                200,
            )
            .unwrap();

        registry
            .update_score(
                "attestor",
                "account-hash-1",
                790,
                CreditTier::A,
                320,
                18_000_000_000,
                "ipfs://attestation-2",
                150,
                250,
            )
            .unwrap();

        let credential = registry.get_credit_score("account-hash-1").unwrap();
        assert_eq!(credential.score, 790);
        assert_eq!(credential.score_history.len(), 2);
    }

    #[test]
    fn rejects_unauthorized_revocation() {
        let mut registry = registry();
        registry
            .issue_credit_score(
                "attestor",
                "account-hash-1",
                600,
                CreditTier::C,
                800,
                8_000_000_000,
                "hash",
                10,
                20,
            )
            .unwrap();

        let result = registry.revoke_credit_score("attestor", "account-hash-1", 12);
        assert_eq!(result, Err(CreditRegistryError::Unauthorized));
    }
}
