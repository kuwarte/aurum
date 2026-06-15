#!/usr/bin/env bash
set -euo pipefail

# Aurum Dev 2 deployment helper.
# This script stays conservative on purpose: it validates the testnet-focused
# deployment environment, builds the Rust workspace, and prints the exact
# records the team must capture during Casper deployment. It does not invent
# Odra CLI deploy commands while the final toolchain version is still unpinned.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="${ROOT_DIR}/contracts"
ENV_CHECK_SCRIPT="${ROOT_DIR}/scripts/check-dev2-env.sh"
EXPECTED_CONTRACTS=(
  "credit_registry"
  "compliance_registry"
  "oracle_paywall"
  "reputation_registry"
)

log() {
  echo "[aurum-dev2] $*"
}

fail() {
  echo "[aurum-dev2] ERROR: $*" >&2
  exit 1
}

log "Starting Dev 2 deployment preparation"

if ! command -v cargo >/dev/null 2>&1; then
  fail "cargo is required to build the Rust contract crates"
fi

if [[ ! -d "${CONTRACTS_DIR}" ]]; then
  fail "contracts workspace not found at ${CONTRACTS_DIR}"
fi

if [[ -x "${ENV_CHECK_SCRIPT}" ]]; then
  log "Running environment validation helper"
  "${ENV_CHECK_SCRIPT}" --deploy
fi

if [[ -z "${CASPER_NETWORK_NAME:-}" ]]; then
  fail "CASPER_NETWORK_NAME is required"
fi

if [[ "${CASPER_NETWORK_NAME,,}" != *test* ]]; then
  fail "refusing to continue because the MVP must target Casper testnet"
fi

if [[ -n "${CASPER_DEPLOY_CHAIN_NAME:-}" && "${CASPER_DEPLOY_CHAIN_NAME,,}" != *test* ]]; then
  fail "CASPER_DEPLOY_CHAIN_NAME must point to testnet for the MVP"
fi

if [[ -z "${CASPER_RPC_URL:-}" || -z "${CASPER_PUBLIC_KEY:-}" || -z "${CASPER_ACCOUNT_HASH:-}" || -z "${CASPER_PRIVATE_KEY:-}" ]]; then
  fail "CASPER_RPC_URL, CASPER_PUBLIC_KEY, CASPER_ACCOUNT_HASH, and CASPER_PRIVATE_KEY are required for deployment prep"
fi

log "Expected contracts to deploy:"
for contract in "${EXPECTED_CONTRACTS[@]}"; do
  log "  - ${contract}"
done

log "Building Rust contract workspace"
(cd "${CONTRACTS_DIR}" && cargo build --workspace)

cat <<'EOF'
[aurum-dev2] Build completed successfully.

Manual deployment checklist:
1. Confirm the configured deploy account is funded with Casper testnet CSPR.
2. Install the final Odra CLI/toolchain version agreed by the team.
3. Run the final contract deploy commands once the Odra version is pinned.
4. Record deploy hashes:
   - CREDIT_REGISTRY_DEPLOY_HASH
   - COMPLIANCE_REGISTRY_DEPLOY_HASH
   - ORACLE_PAYWALL_DEPLOY_HASH
   - REPUTATION_REGISTRY_DEPLOY_HASH
5. Record resulting contract hashes:
   - CREDIT_REGISTRY_HASH
   - COMPLIANCE_REGISTRY_HASH
   - ORACLE_PAYWALL_HASH
   - REPUTATION_REGISTRY_HASH
6. Verify deploy status and entrypoints in Casper testnet explorer or CSPR.cloud tooling.
7. Hand the contract hashes to Dev 1 and Dev 3 using docs/dev2/INTEGRATION_NOTES.md.

TODO:
- Add concrete cargo-odra deploy commands once the exact Odra CLI and package
  layout are confirmed for this repository.
- Add post-deploy automated verification once real deployed hashes exist.
EOF
