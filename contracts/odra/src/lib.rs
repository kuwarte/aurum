#![no_std]

extern crate alloc;

use odra::prelude::*;

pub const ROLE_ADMIN: u8 = 1;
pub const ROLE_ATTESTATION_AGENT: u8 = 2;
pub const ROLE_MONITORING_AGENT: u8 = 3;
pub const ROLE_ISSUER: u8 = 4;
pub const ROLE_READER: u8 = 5;
pub const ROLE_ATTESTOR: u8 = 6;
pub const ROLE_MODERATOR: u8 = 7;

const ERR_UNAUTHORIZED: u16 = 100;
const ERR_INVALID_SCORE: u16 = 101;
const ERR_INVALID_EXPIRY: u16 = 102;
const ERR_ALREADY_EXISTS: u16 = 103;
const ERR_NOT_FOUND: u16 = 104;
const ERR_INVALID_PAYMENT: u16 = 105;
const ERR_STALE: u16 = 106;
const ERR_DUPLICATE: u16 = 107;
const ERR_WRONG_NETWORK: u16 = 108;

fn user_error(code: u16) -> OdraError {
    #[cfg(target_arch = "wasm32")]
    {
        OdraError::user(code)
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        OdraError::user(code, "Aurum contract validation failed")
    }
}

macro_rules! require {
    ($module:expr, $condition:expr, $code:expr) => {
        if !$condition {
            $module.env().revert(user_error($code));
        }
    };
}

#[odra::module]
pub struct CreditRegistry {
    roles: Mapping<String, u8>,
    scores: Mapping<String, u32>,
    tiers: Mapping<String, String>,
    default_probability_bps: Mapping<String, u32>,
    borrowing_limit_motes: Mapping<String, u64>,
    attestation_hashes: Mapping<String, String>,
    issued_at: Mapping<String, u64>,
    expiry_at: Mapping<String, u64>,
    active: Mapping<String, bool>,
    history_count: Mapping<String, u32>,
}

#[odra::module]
impl CreditRegistry {
    pub fn init(&mut self, admin: String) {
        self.roles.set(&admin, ROLE_ADMIN);
    }

    pub fn assign_role(&mut self, caller: String, account: String, role: u8) {
        self.ensure_admin(&caller);
        self.roles.set(&account, role);
    }

    pub fn issue_credit_score(
        &mut self,
        caller: String,
        borrower: String,
        score: u32,
        tier: String,
        default_probability_bps: u32,
        borrowing_limit_motes: u64,
        attestation_hash: String,
        issued_at: u64,
        expiry_at: u64,
    ) {
        self.ensure_attestation_writer(&caller);
        self.validate_score(score);
        require!(self, default_probability_bps <= 10_000, ERR_INVALID_SCORE);
        self.validate_timestamps(issued_at, expiry_at);
        require!(self, !self.active.get_or_default(&borrower), ERR_ALREADY_EXISTS);

        self.write_credit(
            &borrower,
            score,
            tier,
            default_probability_bps,
            borrowing_limit_motes,
            attestation_hash,
            issued_at,
            expiry_at,
            true,
        );
        self.history_count.set(&borrower, 1);
    }

    pub fn update_score(
        &mut self,
        caller: String,
        borrower: String,
        score: u32,
        tier: String,
        default_probability_bps: u32,
        borrowing_limit_motes: u64,
        attestation_hash: String,
        issued_at: u64,
        expiry_at: u64,
    ) {
        self.ensure_attestation_writer(&caller);
        self.validate_score(score);
        require!(self, default_probability_bps <= 10_000, ERR_INVALID_SCORE);
        self.validate_timestamps(issued_at, expiry_at);
        require!(self, self.exists(&borrower), ERR_NOT_FOUND);

        self.write_credit(
            &borrower,
            score,
            tier,
            default_probability_bps,
            borrowing_limit_motes,
            attestation_hash,
            issued_at,
            expiry_at,
            true,
        );
        self.history_count.add(&borrower, 1);
    }

    pub fn revoke_credit_score(&mut self, caller: String, borrower: String, revoked_at: u64) {
        self.ensure_monitoring_writer(&caller);
        require!(self, self.exists(&borrower), ERR_NOT_FOUND);
        self.active.set(&borrower, false);
        self.expiry_at.set(&borrower, revoked_at);
    }

    pub fn get_score(&self, borrower: String) -> u32 {
        self.scores.get_or_default(&borrower)
    }

    pub fn get_tier(&self, borrower: String) -> String {
        self.tiers.get_or_default(&borrower)
    }

    pub fn get_attestation_hash(&self, borrower: String) -> String {
        self.attestation_hashes.get_or_default(&borrower)
    }

    pub fn get_history_count(&self, borrower: String) -> u32 {
        self.history_count.get_or_default(&borrower)
    }

    pub fn is_credential_active_at(&self, borrower: String, now: u64) -> bool {
        self.active.get_or_default(&borrower)
            && self.expiry_at.get_or_default(&borrower) > now
    }

    fn write_credit(
        &mut self,
        borrower: &String,
        score: u32,
        tier: String,
        default_probability_bps: u32,
        borrowing_limit_motes: u64,
        attestation_hash: String,
        issued_at: u64,
        expiry_at: u64,
        active: bool,
    ) {
        self.scores.set(borrower, score);
        self.tiers.set(borrower, tier);
        self.default_probability_bps.set(borrower, default_probability_bps);
        self.borrowing_limit_motes.set(borrower, borrowing_limit_motes);
        self.attestation_hashes.set(borrower, attestation_hash);
        self.issued_at.set(borrower, issued_at);
        self.expiry_at.set(borrower, expiry_at);
        self.active.set(borrower, active);
    }

    fn exists(&self, borrower: &String) -> bool {
        self.history_count.get_or_default(borrower) > 0
    }

    fn ensure_admin(&self, caller: &String) {
        require!(self, self.roles.get_or_default(caller) == ROLE_ADMIN, ERR_UNAUTHORIZED);
    }

    fn ensure_attestation_writer(&self, caller: &String) {
        let role = self.roles.get_or_default(caller);
        require!(self, role == ROLE_ADMIN || role == ROLE_ATTESTATION_AGENT, ERR_UNAUTHORIZED);
    }

    fn ensure_monitoring_writer(&self, caller: &String) {
        let role = self.roles.get_or_default(caller);
        require!(self, role == ROLE_ADMIN || role == ROLE_MONITORING_AGENT, ERR_UNAUTHORIZED);
    }

    fn validate_score(&self, score: u32) {
        require!(self, score <= 1000, ERR_INVALID_SCORE);
    }

    fn validate_timestamps(&self, issued_at: u64, expiry_at: u64) {
        require!(self, expiry_at > issued_at, ERR_INVALID_EXPIRY);
    }
}

#[odra::module]
pub struct ComplianceRegistry {
    roles: Mapping<String, u8>,
    levels: Mapping<String, u8>,
    aml_flags: Mapping<String, bool>,
    issued_at: Mapping<String, u64>,
    expiry_at: Mapping<String, u64>,
    active: Mapping<String, bool>,
    history_count: Mapping<String, u32>,
}

#[odra::module]
impl ComplianceRegistry {
    pub fn init(&mut self, admin: String) {
        self.roles.set(&admin, ROLE_ADMIN);
    }

    pub fn assign_role(&mut self, caller: String, account: String, role: u8) {
        self.ensure_admin(&caller);
        self.roles.set(&account, role);
    }

    pub fn issue_compliance_token(
        &mut self,
        caller: String,
        borrower: String,
        level: u8,
        aml_flag: bool,
        issued_at: u64,
        expiry_at: u64,
    ) {
        self.ensure_issuer(&caller);
        require!(self, expiry_at > issued_at, ERR_INVALID_EXPIRY);
        require!(self, !self.exists(&borrower), ERR_ALREADY_EXISTS);
        self.levels.set(&borrower, level);
        self.aml_flags.set(&borrower, aml_flag);
        self.issued_at.set(&borrower, issued_at);
        self.expiry_at.set(&borrower, expiry_at);
        self.active.set(&borrower, true);
        self.history_count.set(&borrower, 1);
    }

    pub fn revoke_compliance(&mut self, caller: String, borrower: String, revoked_at: u64) {
        self.ensure_monitor(&caller);
        require!(self, self.exists(&borrower), ERR_NOT_FOUND);
        self.active.set(&borrower, false);
        self.aml_flags.set(&borrower, true);
        self.expiry_at.set(&borrower, revoked_at);
        self.history_count.add(&borrower, 1);
    }

    pub fn elevate_risk_flag(&mut self, caller: String, borrower: String) {
        self.ensure_monitor(&caller);
        require!(self, self.exists(&borrower), ERR_NOT_FOUND);
        self.aml_flags.set(&borrower, true);
        self.history_count.add(&borrower, 1);
    }

    pub fn is_compliant(&self, borrower: String, now: u64) -> bool {
        self.active.get_or_default(&borrower)
            && !self.aml_flags.get_or_default(&borrower)
            && self.expiry_at.get_or_default(&borrower) > now
    }

    pub fn get_level(&self, borrower: String) -> u8 {
        self.levels.get_or_default(&borrower)
    }

    fn exists(&self, borrower: &String) -> bool {
        self.history_count.get_or_default(borrower) > 0
    }

    fn ensure_admin(&self, caller: &String) {
        require!(self, self.roles.get_or_default(caller) == ROLE_ADMIN, ERR_UNAUTHORIZED);
    }

    fn ensure_issuer(&self, caller: &String) {
        let role = self.roles.get_or_default(caller);
        require!(self, role == ROLE_ADMIN || role == ROLE_ISSUER, ERR_UNAUTHORIZED);
    }

    fn ensure_monitor(&self, caller: &String) {
        let role = self.roles.get_or_default(caller);
        require!(self, role == ROLE_ADMIN || role == ROLE_MONITORING_AGENT, ERR_UNAUTHORIZED);
    }
}

#[odra::module]
pub struct OraclePaywall {
    roles: Mapping<String, u8>,
    scores: Mapping<String, u32>,
    tiers: Mapping<String, String>,
    attestation_hashes: Mapping<String, String>,
    expiry_at: Mapping<String, u64>,
    active: Mapping<String, bool>,
    used_nonces: Mapping<String, bool>,
    treasury_account: Var<String>,
    query_price_motes: Var<u64>,
    network: Var<String>,
    query_count: Var<u32>,
}

#[odra::module]
impl OraclePaywall {
    pub fn init(
        &mut self,
        admin: String,
        treasury_account: String,
        query_price_motes: u64,
        network: String,
    ) {
        require!(self, query_price_motes > 0, ERR_INVALID_PAYMENT);
        self.roles.set(&admin, ROLE_ADMIN);
        self.treasury_account.set(treasury_account);
        self.query_price_motes.set(query_price_motes);
        self.network.set(network);
    }

    pub fn assign_role(&mut self, caller: String, account: String, role: u8) {
        self.ensure_admin(&caller);
        self.roles.set(&account, role);
    }

    pub fn upsert_profile(
        &mut self,
        caller: String,
        borrower: String,
        credit_score: u32,
        tier: String,
        attestation_hash: String,
        expiry_at: u64,
        active: bool,
    ) {
        self.ensure_reader(&caller);
        require!(self, credit_score <= 1000, ERR_INVALID_SCORE);
        self.scores.set(&borrower, credit_score);
        self.tiers.set(&borrower, tier);
        self.attestation_hashes.set(&borrower, attestation_hash);
        self.expiry_at.set(&borrower, expiry_at);
        self.active.set(&borrower, active);
    }

    pub fn set_query_price(&mut self, caller: String, query_price_motes: u64) {
        self.ensure_admin(&caller);
        require!(self, query_price_motes > 0, ERR_INVALID_PAYMENT);
        self.query_price_motes.set(query_price_motes);
    }

    pub fn query_credit_profile(
        &mut self,
        borrower: String,
        amount_motes: u64,
        nonce: String,
        deadline: u64,
        network: String,
        now: u64,
    ) -> u32 {
        require!(self, network == self.network.get_or_default(), ERR_WRONG_NETWORK);
        require!(self, deadline > now, ERR_INVALID_PAYMENT);
        require!(self, !self.used_nonces.get_or_default(&nonce), ERR_DUPLICATE);
        require!(self, amount_motes >= self.query_price_motes.get_or_default(), ERR_INVALID_PAYMENT);
        require!(self, self.active.get_or_default(&borrower), ERR_NOT_FOUND);
        require!(self, self.expiry_at.get_or_default(&borrower) > now, ERR_STALE);
        self.used_nonces.set(&nonce, true);
        self.query_count.add(1);
        self.scores.get_or_default(&borrower)
    }

    pub fn get_treasury_account(&self) -> String {
        self.treasury_account.get_or_default()
    }

    pub fn get_query_count(&self) -> u32 {
        self.query_count.get_or_default()
    }

    fn ensure_admin(&self, caller: &String) {
        require!(self, self.roles.get_or_default(caller) == ROLE_ADMIN, ERR_UNAUTHORIZED);
    }

    fn ensure_reader(&self, caller: &String) {
        let role = self.roles.get_or_default(caller);
        require!(self, role == ROLE_ADMIN || role == ROLE_READER, ERR_UNAUTHORIZED);
    }
}

#[odra::module]
pub struct ReputationRegistry {
    roles: Mapping<String, u8>,
    reputation_scores: Mapping<String, u8>,
    dao_participation_count: Mapping<String, u32>,
    loans_fulfilled_count: Mapping<String, u32>,
    disputes_count: Mapping<String, u32>,
    peer_attestations_count: Mapping<String, u32>,
    evidence_hashes: Mapping<String, String>,
    last_updated_at: Mapping<String, u64>,
    exists: Mapping<String, bool>,
}

#[odra::module]
impl ReputationRegistry {
    pub fn init(&mut self, admin: String) {
        self.roles.set(&admin, ROLE_ADMIN);
    }

    pub fn assign_role(&mut self, caller: String, account: String, role: u8) {
        self.ensure_admin(&caller);
        self.roles.set(&account, role);
    }

    pub fn attest_reputation(
        &mut self,
        caller: String,
        borrower: String,
        reputation_score: u8,
        dao_participation_count: u32,
        loans_fulfilled_count: u32,
        disputes_count: u32,
        peer_attestations_count: u32,
        evidence_hash: String,
        last_updated_at: u64,
    ) {
        self.ensure_attestor(&caller);
        require!(self, reputation_score <= 100, ERR_INVALID_SCORE);
        self.reputation_scores.set(&borrower, reputation_score);
        self.dao_participation_count.set(&borrower, dao_participation_count);
        self.loans_fulfilled_count.set(&borrower, loans_fulfilled_count);
        self.disputes_count.set(&borrower, disputes_count);
        self.peer_attestations_count.set(&borrower, peer_attestations_count);
        self.evidence_hashes.set(&borrower, evidence_hash);
        self.last_updated_at.set(&borrower, last_updated_at);
        self.exists.set(&borrower, true);
    }

    pub fn slash_reputation(
        &mut self,
        caller: String,
        borrower: String,
        new_score: u8,
        disputes_count: u32,
        evidence_hash: String,
        timestamp: u64,
    ) {
        self.ensure_moderator(&caller);
        require!(self, new_score <= 100, ERR_INVALID_SCORE);
        require!(self, self.exists.get_or_default(&borrower), ERR_NOT_FOUND);
        self.reputation_scores.set(&borrower, new_score);
        self.disputes_count.set(&borrower, disputes_count);
        self.evidence_hashes.set(&borrower, evidence_hash);
        self.last_updated_at.set(&borrower, timestamp);
    }

    pub fn get_reputation_score(&self, borrower: String) -> u8 {
        self.reputation_scores.get_or_default(&borrower)
    }

    pub fn get_evidence_hash(&self, borrower: String) -> String {
        self.evidence_hashes.get_or_default(&borrower)
    }

    fn ensure_admin(&self, caller: &String) {
        require!(self, self.roles.get_or_default(caller) == ROLE_ADMIN, ERR_UNAUTHORIZED);
    }

    fn ensure_attestor(&self, caller: &String) {
        let role = self.roles.get_or_default(caller);
        require!(self, role == ROLE_ADMIN || role == ROLE_ATTESTOR, ERR_UNAUTHORIZED);
    }

    fn ensure_moderator(&self, caller: &String) {
        let role = self.roles.get_or_default(caller);
        require!(self, role == ROLE_ADMIN || role == ROLE_MODERATOR, ERR_UNAUTHORIZED);
    }
}
