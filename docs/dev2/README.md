# Dev 2 README

This document tracks the Dev 2 scope for Aurum Protocol: Rust contract logic, Casper data-layer helpers, CSPR.cloud wrappers, x402 payment support scaffolding, deployment helpers, and teammate integration notes. The work in this folder stays within the allowed Dev 2 ownership boundary and does not modify Dev 1 or Dev 3 application code.

## Scope Summary

Implemented in this branch:

- Rust contract-domain crates for `CreditRegistry`, `ComplianceRegistry`, `OraclePaywall`, and `ReputationRegistry`
- Python modules under `api/casper/` for Casper configuration, contract wrapper envelopes, and x402 verification/scaffolding
- Python modules under `api/cspr_cloud/` for wallet and DeFi normalized data wrappers
- Dev 2 helper scripts under `scripts/`
- Root `.env.example` with testnet-only placeholders
- Dev 2 documentation and integration notes under `docs/dev2/`

## Files Created Or Modified

- `contracts/Cargo.toml`
- `contracts/credit_registry/`
- `contracts/compliance_registry/`
- `contracts/oracle_paywall/`
- `contracts/reputation_registry/`
- `api/casper/__init__.py`
- `api/casper/client.py`
- `api/casper/contracts.py`
- `api/casper/x402.py`
- `api/cspr_cloud/__init__.py`
- `api/cspr_cloud/wallet.py`
- `api/cspr_cloud/defi.py`
- `scripts/deploy-contracts.sh`
- `scripts/verify-contracts.sh`
- `.env.example`
- `docs/dev2/README.md`
- `docs/dev2/INTEGRATION_NOTES.md`
- `docs/dev2/ENVIRONMENT.md`
- `docs/dev2/DEPLOYMENT.md`
- `docs/dev2/TODO.md`

## Local Setup

1. Install Rust and confirm `cargo` is available.
2. Install Python dependencies already used by the backend, including `httpx`.
3. Copy `.env.example` to a local untracked environment file and replace placeholders with Casper testnet values.
4. Keep `X402_MODE=mock` and `CSPR_CLOUD_MODE=mock` until live facilitator and CSPR.cloud route details are pinned.

## Build And Test

Rust contracts:

```bash
cd contracts
cargo build --workspace
cargo test --workspace
```

Python data layer:

```bash
python -m compileall api/casper api/cspr_cloud
```

Combined verification:

```bash
./scripts/verify-contracts.sh
```

## Deploy Preparation

The included deployment script intentionally stops at local build preparation and environment validation. The exact Odra deploy commands remain a TODO because this repo does not yet pin the final Odra CLI version or package layout.

```bash
./scripts/deploy-contracts.sh
```

Casper testnet CSPR is required for:

- contract deployment fees
- future write calls to registry contracts
- future live x402 paid query flows

## Integration Notes

Dev 1 and Dev 3 should use `docs/dev2/INTEGRATION_NOTES.md` for the expected data shapes, contract hash placeholders, and suggested snippets to wire the new Dev 2 modules into their owned code.

## Known Limitations

- The Rust crates implement the contract state machines and tests, but the final Odra macro/runtime layer is still a TODO.
- The Casper Python client builds normalized call envelopes rather than signing and broadcasting deploys.
- `X402_MODE=live` is not complete; facilitator settlement verification is still a placeholder.
- `CSPR_CLOUD_MODE=live` requires final route templates to be set through environment variables.

## TODO Checklist

- Pin the final Odra toolchain and wrap the Rust logic with real on-chain entrypoints.
- Record live testnet contract hashes after deployment.
- Replace in-memory x402 nonce tracking with durable storage.
- Replace configurable CSPR.cloud route placeholders with tested endpoint templates.
- Add integration tests once deployed contract hashes are available.
