# Dev 2 Deployment

## Prerequisites

- Rust toolchain with `cargo`
- Casper testnet account funded with testnet CSPR
- Final Odra CLI/toolchain version agreed by the team
- Environment variables populated from `.env.example`

## Current Repository-Safe Commands

Build all contract crates:

```bash
cd contracts
cargo build --workspace
```

Run unit tests:

```bash
cd contracts
cargo test --workspace
```

Run the helper script:

```bash
./scripts/deploy-contracts.sh
```

## Recording Contract Hashes

After deploying each contract to Casper testnet, record the resulting hashes in the environment:

```env
CREDIT_REGISTRY_HASH=
COMPLIANCE_REGISTRY_HASH=
ORACLE_PAYWALL_HASH=
REPUTATION_REGISTRY_HASH=
```

## Verification Steps

1. Confirm the deploy account has testnet CSPR.
2. Confirm `CASPER_NETWORK_NAME` contains `test`.
3. Run `cargo test --workspace`.
4. Capture deploy transaction hashes and resulting contract hashes.
5. Update local environment values.
6. Verify Python wrapper imports and query envelopes with `python -m compileall api/casper api/cspr_cloud`.

## Explorer Notes

Use the appropriate Casper testnet explorer or CSPR.cloud testnet tooling to confirm:

- deploy status
- contract package hashes
- entrypoint visibility

## Known Limitations

- The exact `cargo-odra` deployment commands are intentionally not claimed here because the final Odra version is not pinned in the repository yet.
- Live x402 settlement verification is still a TODO.
- Live CSPR.cloud route templates still need to be pinned in the environment.
