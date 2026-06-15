#!/usr/bin/env bash
set -euo pipefail

# Aurum Dev 2 deployment helper.
# This script prepares the local contract build and records the environment
# values required for Casper testnet deployment. It does not embed secrets or
# pretend that deployment is complete without the final Odra toolchain.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="${ROOT_DIR}/contracts"

echo "[aurum-dev2] Starting contract build preparation"

if ! command -v cargo >/dev/null 2>&1; then
  echo "[aurum-dev2] cargo is required to build the Rust contract crates" >&2
  exit 1
fi

if [[ -z "${CASPER_NETWORK_NAME:-}" ]]; then
  echo "[aurum-dev2] CASPER_NETWORK_NAME is required" >&2
  exit 1
fi

if [[ "${CASPER_NETWORK_NAME}" != *test* ]]; then
  echo "[aurum-dev2] Refusing to continue because the MVP must target Casper testnet" >&2
  exit 1
fi

if [[ -z "${CASPER_RPC_URL:-}" || -z "${CASPER_PUBLIC_KEY:-}" || -z "${CASPER_ACCOUNT_HASH:-}" ]]; then
  echo "[aurum-dev2] CASPER_RPC_URL, CASPER_PUBLIC_KEY, and CASPER_ACCOUNT_HASH are required" >&2
  exit 1
fi

echo "[aurum-dev2] Building Rust contract crates"
(cd "${CONTRACTS_DIR}" && cargo build --workspace)

cat <<'EOF'
[aurum-dev2] Build completed.

Next steps:
1. Fund the configured Casper testnet account with faucet CSPR.
2. Install the final Odra CLI/toolchain version agreed by the team.
3. Deploy each contract and record the resulting hashes in .env.example/.env.
4. Update docs/dev2/DEPLOYMENT.md with the final command transcript.

TODO: Add concrete cargo-odra deploy commands once the Odra toolchain version
and package layout are finalized for this repository.
EOF
