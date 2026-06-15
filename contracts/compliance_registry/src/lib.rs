//! Aurum ComplianceRegistry domain contract.
//!
//! The module models KYC/AML credential issuance, revocation, and risk flag
//! changes for the MVP. The exact Odra storage and event macros remain a
//! follow-up once the final toolchain version is pinned.
//!
//! TODO: Replace the event vector with CES-compatible Odra event emission.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ComplianceRole {
    Admin,
    Issuer,
    Monitor,
    ReadOnly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ComplianceLevel {
    None,
    Basic,
    Enhanced,
    Institutional,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComplianceSnapshot {
    pub level: ComplianceLevel,
    pub aml_flag: bool,
    pub reason: String,
    pub issued_at: u64,
    pub expiry_at: u64,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComplianceCredential {
    pub borrower: String,
    pub level: ComplianceLevel,
    pub aml_flag: bool,
    pub issued_at: u64,
    pub expiry_at: u64,
    pub active: bool,
    pub history: Vec<ComplianceSnapshot>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ComplianceEvent {
    ComplianceIssued { borrower: String, level: ComplianceLevel },
    ComplianceRevoked { borrower: String, revoked_at: u64 },
    RiskFlagElevated { borrower: String, reason: String },
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ComplianceError {
    #[error("caller is not authorized")]
    Unauthorized,
    #[error("expiry timestamp must be later than issue timestamp")]
    InvalidExpiry,
    #[error("compliance credential already exists")]
    CredentialAlreadyExists,
    #[error("compliance credential not found")]
    CredentialNotFound,
}

#[derive(Debug, Default)]
pub struct ComplianceRegistry {
    roles: HashMap<String, ComplianceRole>,
    credentials: HashMap<String, ComplianceCredential>,
    events: Vec<ComplianceEvent>,
}

impl ComplianceRegistry {
    pub fn new(admin: impl Into<String>) -> Self {
        let mut roles = HashMap::new();
        roles.insert(admin.into(), ComplianceRole::Admin);
        Self {
            roles,
            credentials: HashMap::new(),
            events: Vec::new(),
        }
    }

    pub fn assign_role(
        &mut self,
        caller: &str,
        account: impl Into<String>,
        role: ComplianceRole,
    ) -> Result<(), ComplianceError> {
        self.ensure_admin(caller)?;
        self.roles.insert(account.into(), role);
        Ok(())
    }

    pub fn issue_compliance_token(
        &mut self,
        caller: &str,
        borrower: impl Into<String>,
        level: ComplianceLevel,
        aml_flag: bool,
        issued_at: u64,
        expiry_at: u64,
    ) -> Result<(), ComplianceError> {
        self.ensure_issuer(caller)?;
        self.validate_timestamps(issued_at, expiry_at)?;
        let borrower = borrower.into();
        if self.credentials.contains_key(&borrower) {
            return Err(ComplianceError::CredentialAlreadyExists);
        }

        let snapshot = ComplianceSnapshot {
            level,
            aml_flag,
            reason: "initial_issue".to_string(),
            issued_at,
            expiry_at,
            active: true,
        };
        let credential = ComplianceCredential {
            borrower: borrower.clone(),
            level,
            aml_flag,
            issued_at,
            expiry_at,
            active: true,
            history: vec![snapshot],
        };
        self.credentials.insert(borrower.clone(), credential);
        self.events
            .push(ComplianceEvent::ComplianceIssued { borrower, level });
        Ok(())
    }

    pub fn revoke_compliance(
        &mut self,
        caller: &str,
        borrower: &str,
        revoked_at: u64,
        reason: impl Into<String>,
    ) -> Result<(), ComplianceError> {
        self.ensure_monitor(caller)?;
        let credential = self
            .credentials
            .get_mut(borrower)
            .ok_or(ComplianceError::CredentialNotFound)?;
        credential.active = false;
        credential.expiry_at = revoked_at;
        credential.history.push(ComplianceSnapshot {
            level: credential.level,
            aml_flag: true,
            reason: reason.into(),
            issued_at: revoked_at,
            expiry_at: revoked_at,
            active: false,
        });
        self.events.push(ComplianceEvent::ComplianceRevoked {
            borrower: borrower.to_string(),
            revoked_at,
        });
        Ok(())
    }

    pub fn elevate_risk_flag(
        &mut self,
        caller: &str,
        borrower: &str,
        reason: impl Into<String>,
        timestamp: u64,
    ) -> Result<(), ComplianceError> {
        self.ensure_monitor(caller)?;
        let reason = reason.into();
        let credential = self
            .credentials
            .get_mut(borrower)
            .ok_or(ComplianceError::CredentialNotFound)?;
        credential.aml_flag = true;
        credential.history.push(ComplianceSnapshot {
            level: credential.level,
            aml_flag: true,
            reason: reason.clone(),
            issued_at: timestamp,
            expiry_at: credential.expiry_at,
            active: credential.active,
        });
        self.events.push(ComplianceEvent::RiskFlagElevated {
            borrower: borrower.to_string(),
            reason,
        });
        Ok(())
    }

    pub fn is_compliant(&self, borrower: &str, now: u64) -> bool {
        self.credentials
            .get(borrower)
            .map(|credential| credential.active && !credential.aml_flag && credential.expiry_at > now)
            .unwrap_or(false)
    }

    pub fn get_credential(&self, borrower: &str) -> Option<ComplianceCredential> {
        self.credentials.get(borrower).cloned()
    }

    pub fn events(&self) -> &[ComplianceEvent] {
        &self.events
    }

    fn ensure_admin(&self, caller: &str) -> Result<(), ComplianceError> {
        match self.roles.get(caller) {
            Some(ComplianceRole::Admin) => Ok(()),
            _ => Err(ComplianceError::Unauthorized),
        }
    }

    fn ensure_issuer(&self, caller: &str) -> Result<(), ComplianceError> {
        match self.roles.get(caller) {
            Some(ComplianceRole::Admin | ComplianceRole::Issuer) => Ok(()),
            _ => Err(ComplianceError::Unauthorized),
        }
    }

    fn ensure_monitor(&self, caller: &str) -> Result<(), ComplianceError> {
        match self.roles.get(caller) {
            Some(ComplianceRole::Admin | ComplianceRole::Monitor) => Ok(()),
            _ => Err(ComplianceError::Unauthorized),
        }
    }

    fn validate_timestamps(&self, issued_at: u64, expiry_at: u64) -> Result<(), ComplianceError> {
        if expiry_at > issued_at {
            Ok(())
        } else {
            Err(ComplianceError::InvalidExpiry)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expired_or_flagged_credentials_are_not_compliant() {
        let mut registry = ComplianceRegistry::new("admin");
        registry
            .assign_role("admin", "issuer", ComplianceRole::Issuer)
            .unwrap();
        registry
            .assign_role("admin", "monitor", ComplianceRole::Monitor)
            .unwrap();
        registry
            .issue_compliance_token(
                "issuer",
                "account-hash-1",
                ComplianceLevel::Enhanced,
                false,
                10,
                100,
            )
            .unwrap();

        assert!(registry.is_compliant("account-hash-1", 50));
        registry
            .elevate_risk_flag("monitor", "account-hash-1", "sanctions-watch", 60)
            .unwrap();
        assert!(!registry.is_compliant("account-hash-1", 70));
    }
}
