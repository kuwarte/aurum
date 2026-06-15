# Dev 2 TODO

## Contract TODOs

- Wrap the Rust state-machine crates with the final Odra module/storage/event macros.
- Add contract-level integration tests against Casper testnet or a compatible local runtime.
- Emit CES-compatible events once the final Odra version is pinned.

## x402 TODOs

- Replace mock verifier success with real facilitator verification.
- Persist used nonces outside process memory.
- Add replay-protection, idempotency, and settlement-audit storage before production.

## CSPR.cloud TODOs

- Confirm final REST route templates for wallet and DeFi datasets.
- Replace environment-level route placeholders with tested defaults after integration validation.
- Add response schema validation for live mode once payloads are fixed.

## Deployment TODOs

- Install and pin the final Odra CLI/toolchain version.
- Deploy to Casper testnet and record contract hashes.
- Add deploy transcript and verification evidence to team demo notes.

## Handoff TODOs

- Dev 1: review the suggested paid-query gateway snippet in `docs/dev2/INTEGRATION_NOTES.md`.
- Dev 3: wire the new wrappers into scoring/attestation flows after contract hashes are available.
