//! Aurum ReputationRegistry domain contract.
//!
//! The reputation registry captures the slower-moving trust data that Aurum
//! wants to keep independent from the short-horizon credit credential.
//! It is intentionally smaller priority-wise, but still exposes a concrete
//! interface and tests for the MVP.
//!
//! TODO: Promote these methods to Odra entrypoints after the P0 registries
//! and paywall are deployed on Casper testnet.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ReputationRole {
    Admin,
    Attestor,
    Moderator,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReputationProfile {
    pub borrower: String,
    pub reputation_score: u8,
    pub dao_participation_count: u32,
    pub loans_fulfilled_count: u32,
    pub disputes_count: u32,
    pub peer_attestations_count: u32,
    pub evidence_hash: String,
    pub last_updated_at: u64,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ReputationError {
    #[error("caller is not authorized")]
    Unauthorized,
    #[error("reputation score must be between 0 and 100")]
    InvalidScore,
    #[error("reputation profile not found")]
    ProfileNotFound,
}

#[derive(Debug, Default)]
pub struct ReputationRegistry {
    roles: HashMap<String, ReputationRole>,
    profiles: HashMap<String, ReputationProfile>,
}

impl ReputationRegistry {
    pub fn new(admin: impl Into<String>) -> Self {
        let mut roles = HashMap::new();
        roles.insert(admin.into(), ReputationRole::Admin);
        Self {
            roles,
            profiles: HashMap::new(),
        }
    }

    pub fn assign_role(
        &mut self,
        caller: &str,
        account: impl Into<String>,
        role: ReputationRole,
    ) -> Result<(), ReputationError> {
        self.ensure_admin(caller)?;
        self.roles.insert(account.into(), role);
        Ok(())
    }

    pub fn attest_reputation(
        &mut self,
        caller: &str,
        borrower: impl Into<String>,
        profile: ReputationProfile,
    ) -> Result<(), ReputationError> {
        self.ensure_attestor(caller)?;
        self.validate_score(profile.reputation_score)?;
        self.profiles.insert(borrower.into(), profile);
        Ok(())
    }

    pub fn slash_reputation(
        &mut self,
        caller: &str,
        borrower: &str,
        new_score: u8,
        disputes_count: u32,
        evidence_hash: impl Into<String>,
        timestamp: u64,
    ) -> Result<(), ReputationError> {
        self.ensure_moderator(caller)?;
        self.validate_score(new_score)?;
        let profile = self
            .profiles
            .get_mut(borrower)
            .ok_or(ReputationError::ProfileNotFound)?;
        profile.reputation_score = new_score;
        profile.disputes_count = disputes_count;
        profile.evidence_hash = evidence_hash.into();
        profile.last_updated_at = timestamp;
        Ok(())
    }

    pub fn get_reputation(&self, borrower: &str) -> Option<ReputationProfile> {
        self.profiles.get(borrower).cloned()
    }

    fn ensure_admin(&self, caller: &str) -> Result<(), ReputationError> {
        match self.roles.get(caller) {
            Some(ReputationRole::Admin) => Ok(()),
            _ => Err(ReputationError::Unauthorized),
        }
    }

    fn ensure_attestor(&self, caller: &str) -> Result<(), ReputationError> {
        match self.roles.get(caller) {
            Some(ReputationRole::Admin | ReputationRole::Attestor) => Ok(()),
            _ => Err(ReputationError::Unauthorized),
        }
    }

    fn ensure_moderator(&self, caller: &str) -> Result<(), ReputationError> {
        match self.roles.get(caller) {
            Some(ReputationRole::Admin | ReputationRole::Moderator) => Ok(()),
            _ => Err(ReputationError::Unauthorized),
        }
    }

    fn validate_score(&self, score: u8) -> Result<(), ReputationError> {
        if score <= 100 {
            Ok(())
        } else {
            Err(ReputationError::InvalidScore)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn moderator_can_slash_reputation() {
        let mut registry = ReputationRegistry::new("admin");
        registry
            .assign_role("admin", "attestor", ReputationRole::Attestor)
            .unwrap();
        registry
            .assign_role("admin", "moderator", ReputationRole::Moderator)
            .unwrap();
        registry
            .attest_reputation(
                "attestor",
                "account-hash-1",
                ReputationProfile {
                    borrower: "account-hash-1".to_string(),
                    reputation_score: 88,
                    dao_participation_count: 5,
                    loans_fulfilled_count: 3,
                    disputes_count: 0,
                    peer_attestations_count: 4,
                    evidence_hash: "hash-1".to_string(),
                    last_updated_at: 10,
                },
            )
            .unwrap();

        registry
            .slash_reputation("moderator", "account-hash-1", 70, 1, "hash-2", 20)
            .unwrap();
        assert_eq!(
            registry.get_reputation("account-hash-1").unwrap().reputation_score,
            70
        );
    }
}
