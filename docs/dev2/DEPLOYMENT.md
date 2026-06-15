# Dev 2 Deployment

This runbook covers the safe Dev 2 deployment flow for Aurum's contract and data-layer scope. It is intentionally testnet-only for the hackathon MVP and does not claim on-chain deployment success unless real deploy commands and explorer confirmations have happened.

## Prerequisites

- Rust toolchain with `cargo`
- Python available for `compileall` checks
- Casper testnet account funded with testnet CSPR
- Final Odra CLI/toolchain version agreed by the team
- Environment variables populated from `.env.example`

## Required Tools

- `cargo`
- `bash`
- `python`
- final Odra CLI once the team pins the version
- access to a Casper testnet explorer or CSPR.cloud testnet tooling

## Required Environment Variables

At minimum, set:

```env
CASPER_RPC_URL=https://node.testnet.cspr.cloud/rpc
CASPER_NETWORK_NAME=casper-test
CASPER_DEPLOY_CHAIN_NAME=casper-test
CASPER_PRIVATE_KEY=replace_with_server_side_private_key_or_secret_mount
CASPER_PUBLIC_KEY=01_replace_with_testnet_public_key
CASPER_ACCOUNT_HASH=account-hash-replace-with-testnet-account
X402_TREASURY_ACCOUNT=account-hash-replace-with-testnet-treasury
```

Post-deploy, also record:

```env
CREDIT_REGISTRY_DEPLOY_HASH=
COMPLIANCE_REGISTRY_DEPLOY_HASH=
ORACLE_PAYWALL_DEPLOY_HASH=
REPUTATION_REGISTRY_DEPLOY_HASH=
CREDIT_REGISTRY_HASH=
COMPLIANCE_REGISTRY_HASH=
ORACLE_PAYWALL_HASH=
REPUTATION_REGISTRY_HASH=
```

See [ENVIRONMENT.md](/d:/zeank/Desktop/Projects/aurum/docs/dev2/ENVIRONMENT.md) for the full matrix.

If CSPR.cloud live-mode verification is needed later, also configure the optional testnet endpoints:

```env
CSPR_CLOUD_BASE_URL=https://api.testnet.cspr.cloud
CSPR_CLOUD_STREAMING_URL=wss://streaming.testnet.cspr.cloud
CSPR_NODE_RPC_URL=https://node.testnet.cspr.cloud
CSPR_NODE_SSE_URL=https://node-sse.testnet.cspr.cloud
```

## Confirm Casper Testnet Funding

Before deployment:

1. Confirm the deploy account matches `CASPER_PUBLIC_KEY` and `CASPER_ACCOUNT_HASH`.
2. Fund that account with testnet CSPR from the Casper faucet referenced in the root `README.md`.
3. Record the faucet transaction or resulting balance evidence for the demo checklist.
4. Do not proceed if the configured network or chain name does not look like testnet.

## Current Repository-Safe Commands

Check the environment first:

```bash
./scripts/check-dev2-env.sh --build
./scripts/check-dev2-env.sh --deploy
```

Build all contracts:

```bash
cd contracts
cargo build --workspace
```

Run all contract tests:

```bash
cd contracts
cargo test --workspace
```

Run Python compile checks:

```bash
python -m compileall api/casper api/cspr_cloud
```

Run the deployment helper:

```bash
./scripts/deploy-contracts.sh
```

Run the verification helper:

```bash
./scripts/verify-contracts.sh
```

## Deployment Script Flow

The deployment helper currently does the safe part of the process:

1. validates the expected testnet-only environment
2. checks that the contract workspace exists
3. builds the Rust workspace
4. prints the manual checklist for deploy hashes and contract hashes

It does not yet run final Odra deploy commands because the exact CLI and package layout are not pinned in this repository.

## Running the Deployment Scripts

Recommended order:

```bash
./scripts/check-dev2-env.sh --deploy
./scripts/deploy-contracts.sh
./scripts/verify-contracts.sh
```

If the final Odra CLI becomes pinned later, add the actual deploy commands to `scripts/deploy-contracts.sh` and record the resulting deploy output in this runbook.

## Recording Deploy Hashes

After each successful testnet deploy command, record the transaction hash in local environment management and in the handoff notes if needed:

```env
CREDIT_REGISTRY_DEPLOY_HASH=
COMPLIANCE_REGISTRY_DEPLOY_HASH=
ORACLE_PAYWALL_DEPLOY_HASH=
REPUTATION_REGISTRY_DEPLOY_HASH=
```

Capture:

- deploy timestamp
- deployer account
- network name
- transaction hash

## Recording Contract Hashes

After the deploy succeeds and contract/package hashes are visible in explorer or CSPR.cloud tooling, record:

```env
CREDIT_REGISTRY_HASH=
COMPLIANCE_REGISTRY_HASH=
ORACLE_PAYWALL_HASH=
REPUTATION_REGISTRY_HASH=
```

These are the values Dev 1 and Dev 3 should consume from environment variables, not hardcoded source.

## Verification Steps

1. Confirm the deploy account has testnet CSPR.
2. Confirm `CASPER_NETWORK_NAME` and `CASPER_DEPLOY_CHAIN_NAME` contain `test`.
3. Run `cargo test --workspace`.
4. Run `python -m compileall api/casper api/cspr_cloud`.
5. Capture deploy transaction hashes and resulting contract hashes.
6. Update local environment values.
7. Check each deploy hash in Casper testnet explorer or CSPR.cloud tooling.
8. Confirm the expected entrypoints are visible for each contract.
9. Hand final hash values to Dev 1 and Dev 3 through the documented env variable names in [INTEGRATION_NOTES.md](/d:/zeank/Desktop/Projects/aurum/docs/dev2/INTEGRATION_NOTES.md).

## Explorer Notes

Use the appropriate Casper testnet explorer or CSPR.cloud testnet tooling to confirm:

- deploy status
- contract package hashes
- entrypoint visibility
- expected contract ownership/deployer account

Expected entrypoint groups to confirm:

- `CreditRegistry`: issue, update, revoke, query-oriented entrypoints once the Odra layer is finalized
- `ComplianceRegistry`: issue, revoke, flag, compliance-read entrypoints once finalized
- `OraclePaywall`: query and pricing entrypoints once finalized
- `ReputationRegistry`: attest, slash, and read entrypoints once finalized

## Handoff To Dev 1 And Dev 3

After recording hashes:

1. Update local environment values for backend use.
2. Share the final hash set using the sample JSON structure in [INTEGRATION_NOTES.md](/d:/zeank/Desktop/Projects/aurum/docs/dev2/INTEGRATION_NOTES.md).
3. Tell Dev 1 and Dev 3 whether `X402_MODE` is `mock` or `live`.
4. Tell Dev 1 and Dev 3 whether `CSPR_CLOUD_MODE` is `mock` or `live`.
5. Remind the team that mainnet CSPR is not required for the MVP.

## Known Limitations

- The exact `cargo-odra` deployment commands are intentionally not claimed here because the final Odra version is not pinned in the repository yet.
- The current Rust contract crates model the contract logic, but the final Odra runtime wrappers still need to be completed.
- Live x402 settlement verification is still a TODO.
- Live CSPR.cloud route templates still need to be pinned in the environment.
- This runbook cannot verify on-chain state automatically without real deployed hashes and a pinned deploy toolchain.

## Production Readiness TODO Checklist

- Pin the final Odra CLI/toolchain version and document the exact deploy command.
- Add real deploy execution and post-deploy verification into the scripts.
- Replace x402 mock verification with facilitator-backed settlement validation.
- Replace configurable live CSPR.cloud path placeholders with tested route templates.
- Add persistent storage for replay protection and deployment audit logs.
