use aurum_odra_contracts::{
    ComplianceRegistry, ComplianceRegistryInitArgs, CreditRegistry, CreditRegistryInitArgs,
    OraclePaywall, OraclePaywallInitArgs, ReputationRegistry, ReputationRegistryInitArgs,
    ROLE_ATTESTATION_AGENT, ROLE_ATTESTOR, ROLE_ISSUER, ROLE_MODERATOR, ROLE_MONITORING_AGENT,
    ROLE_READER,
};
use odra::host::{Deployer, HostEnv};
use odra_vm::{OdraVm, OdraVmHost};

fn env() -> HostEnv {
    HostEnv::new(OdraVmHost::new(OdraVm::new()))
}

#[test]
fn credit_registry_issues_updates_and_revokes() {
    let env = env();
    let mut registry = CreditRegistry::deploy(
        &env,
        CreditRegistryInitArgs {
            admin: "admin".to_string(),
        },
    );

    registry.assign_role(
        "admin".to_string(),
        "attestor".to_string(),
        ROLE_ATTESTATION_AGENT,
    );
    registry.assign_role(
        "admin".to_string(),
        "monitor".to_string(),
        ROLE_MONITORING_AGENT,
    );

    registry.issue_credit_score(
        "attestor".to_string(),
        "account-hash-1".to_string(),
        720,
        "B".to_string(),
        450,
        15_000_000_000,
        "ipfs://attestation-1".to_string(),
        100,
        200,
    );
    registry.update_score(
        "attestor".to_string(),
        "account-hash-1".to_string(),
        790,
        "A".to_string(),
        320,
        18_000_000_000,
        "ipfs://attestation-2".to_string(),
        150,
        250,
    );

    assert_eq!(registry.get_score("account-hash-1".to_string()), 790);
    assert_eq!(registry.get_history_count("account-hash-1".to_string()), 2);
    assert!(registry.is_credential_active_at("account-hash-1".to_string(), 200));

    registry.revoke_credit_score("monitor".to_string(), "account-hash-1".to_string(), 210);
    assert!(!registry.is_credential_active_at("account-hash-1".to_string(), 211));
}

#[test]
fn compliance_registry_flags_non_compliant_accounts() {
    let env = env();
    let mut registry = ComplianceRegistry::deploy(
        &env,
        ComplianceRegistryInitArgs {
            admin: "admin".to_string(),
        },
    );
    registry.assign_role("admin".to_string(), "issuer".to_string(), ROLE_ISSUER);
    registry.assign_role(
        "admin".to_string(),
        "monitor".to_string(),
        ROLE_MONITORING_AGENT,
    );

    registry.issue_compliance_token(
        "issuer".to_string(),
        "account-hash-1".to_string(),
        2,
        false,
        10,
        100,
    );
    assert!(registry.is_compliant("account-hash-1".to_string(), 50));

    registry.elevate_risk_flag("monitor".to_string(), "account-hash-1".to_string());
    assert!(!registry.is_compliant("account-hash-1".to_string(), 60));
}

#[test]
fn oracle_paywall_rejects_reused_nonces() {
    let env = env();
    let mut paywall = OraclePaywall::deploy(
        &env,
        OraclePaywallInitArgs {
            admin: "admin".to_string(),
            treasury_account: "account-hash-treasury".to_string(),
            query_price_motes: 100,
            network: "casper-test".to_string(),
        },
    );
    paywall.assign_role("admin".to_string(), "reader".to_string(), ROLE_READER);
    paywall.upsert_profile(
        "reader".to_string(),
        "account-hash-1".to_string(),
        800,
        "A".to_string(),
        "hash".to_string(),
        500,
        true,
    );

    assert_eq!(
        paywall.query_credit_profile(
            "account-hash-1".to_string(),
            100,
            "nonce-1".to_string(),
            200,
            "casper-test".to_string(),
            150,
        ),
        800
    );
    assert_eq!(paywall.get_query_count(), 1);
}

#[test]
fn reputation_registry_attests_and_slashes() {
    let env = env();
    let mut registry = ReputationRegistry::deploy(
        &env,
        ReputationRegistryInitArgs {
            admin: "admin".to_string(),
        },
    );
    registry.assign_role("admin".to_string(), "attestor".to_string(), ROLE_ATTESTOR);
    registry.assign_role("admin".to_string(), "moderator".to_string(), ROLE_MODERATOR);

    registry.attest_reputation(
        "attestor".to_string(),
        "account-hash-1".to_string(),
        88,
        5,
        3,
        0,
        4,
        "hash-1".to_string(),
        10,
    );
    registry.slash_reputation(
        "moderator".to_string(),
        "account-hash-1".to_string(),
        70,
        1,
        "hash-2".to_string(),
        20,
    );

    assert_eq!(registry.get_reputation_score("account-hash-1".to_string()), 70);
    assert_eq!(
        registry.get_evidence_hash("account-hash-1".to_string()),
        "hash-2".to_string()
    );
}
