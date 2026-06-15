#!/usr/bin/env bash
set -euo pipefail

# Aurum Dev 2 verification helper.
# This script validates the safe, repo-local verification surface. It can run
# contract tests and Python compile checks when the local toolchain is present,
# and it prints the manual on-chain verification checklist without pretending
# to prove chain state from placeholder configuration.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_CARGO_TESTS=1
RUN_PYTHON_COMPILE=1

log() {
  echo "[aurum-dev2] $*"
}

warn() {
  echo "[aurum-dev2] WARNING: $*" >&2
}

fail() {
  echo "[aurum-dev2] ERROR: $*" >&2
  exit 1
}

for arg in "$@"; do
  case "${arg}" in
    --skip-cargo-tests)
      RUN_CARGO_TESTS=0
      ;;
    --skip-python-compile)
      RUN_PYTHON_COMPILE=0
      ;;
    *)
      fail "unknown argument: ${arg}"
      ;;
  esac
done

if [[ -z "${CASPER_NETWORK_NAME:-}" ]]; then
  fail "CASPER_NETWORK_NAME is required for verification guidance"
fi

if [[ "${CASPER_NETWORK_NAME,,}" != *test* ]]; then
  fail "verification is restricted to Casper testnet for the MVP"
fi

if [[ ${RUN_CARGO_TESTS} -eq 1 ]]; then
  if ! command -v cargo >/dev/null 2>&1; then
    fail "cargo is required to run contract tests"
  fi
  log "Running Rust unit tests"
  (cd "${ROOT_DIR}/contracts" && cargo test --workspace)
fi

if [[ ${RUN_PYTHON_COMPILE} -eq 1 ]]; then
  if command -v python >/dev/null 2>&1; then
    log "Compiling Dev 2 Python modules"
    (cd "${ROOT_DIR}" && python -m compileall api/casper api/cspr_cloud)
  else
    warn "python was not found; skipping compileall check"
  fi
fi

MISSING_HASHES=()
for hash_name in \
  CREDIT_REGISTRY_HASH \
  COMPLIANCE_REGISTRY_HASH \
  ORACLE_PAYWALL_HASH \
  REPUTATION_REGISTRY_HASH
do
  if [[ -z "${!hash_name:-}" || "${!hash_name}" == hash-todo-* ]]; then
    MISSING_HASHES+=("${hash_name}")
  fi
done

if [[ ${#MISSING_HASHES[@]} -gt 0 ]]; then
  warn "The following contract hashes are not populated yet: ${MISSING_HASHES[*]}"
fi

cat <<'EOF'
[aurum-dev2] Manual Casper testnet verification checklist:
1. Confirm each deploy hash reached success on Casper testnet explorer or CSPR.cloud.
2. Confirm each resulting contract hash is recorded in local environment configuration.
3. Confirm visible entrypoints for:
   - CreditRegistry
   - ComplianceRegistry
   - OraclePaywall
   - ReputationRegistry
4. Confirm Dev 1 and Dev 3 received the final hash set from docs/dev2/INTEGRATION_NOTES.md.
5. Confirm x402 mode is labeled accurately as mock or live.
6. Confirm CSPR.cloud mode is labeled accurately as mock or live.
EOF

log "Verification script completed"
