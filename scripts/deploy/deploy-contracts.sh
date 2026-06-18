#!/usr/bin/env bash
set -euo pipefail

# Aurum Dev 2 deployment helper.
# This script validates the testnet-only deployment environment, builds the
# Rust workspace, and broadcasts deployable Wasm artifacts with casper-client
# when they exist. It fails clearly while the repository only contains Rust
# domain crates without Odra-generated contract Wasm.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="${ROOT_DIR}/contracts"
ENV_CHECK_SCRIPT="${ROOT_DIR}/scripts/check-dev2-env.sh"
EXPECTED_CONTRACTS=(
  "credit_registry"
  "compliance_registry"
  "oracle_paywall"
  "reputation_registry"
)
DEFAULT_PAYMENT_AMOUNT="${CASPER_DEPLOY_PAYMENT_AMOUNT:-300000000000}"
ODRA_ALLOW_KEY_OVERRIDE="${ODRA_ALLOW_KEY_OVERRIDE:-true}"
ODRA_IS_UPGRADABLE="${ODRA_IS_UPGRADABLE:-false}"
ORACLE_PAYWALL_QUERY_PRICE_MOTES="${ORACLE_PAYWALL_QUERY_PRICE_MOTES:-${X402_QUERY_PRICE_MOTES:-1500000000}}"

log() {
  echo "[aurum-dev2] $*"
}

fail() {
  echo "[aurum-dev2] ERROR: $*" >&2
  exit 1
}

contract_env_prefix() {
  local contract="$1"
  printf '%s' "${contract^^}"
}

contract_struct_name() {
  local contract="$1"
  case "${contract}" in
    credit_registry) printf '%s' "CreditRegistry" ;;
    compliance_registry) printf '%s' "ComplianceRegistry" ;;
    oracle_paywall) printf '%s' "OraclePaywall" ;;
    reputation_registry) printf '%s' "ReputationRegistry" ;;
    *) printf '%s' "${contract}" ;;
  esac
}

validate_bool() {
  local name="$1"
  local value="$2"
  case "${value}" in
    true|false) return 0 ;;
    *) fail "${name} must be exactly true or false" ;;
  esac
}

validate_u64() {
  local name="$1"
  local value="$2"
  if [[ ! "${value}" =~ ^[0-9]+$ ]]; then
    fail "${name} must be an integer mote value"
  fi
}

find_contract_wasm() {
  local contract="$1"
  local struct_name
  struct_name="$(contract_struct_name "${contract}")"
  local candidates=(
    "${CONTRACTS_DIR}/wasm/${struct_name}.wasm"
    "${CONTRACTS_DIR}/odra/wasm/${struct_name}.wasm"
    "${CONTRACTS_DIR}/target/wasm32-unknown-unknown/release/${contract}.wasm"
    "${CONTRACTS_DIR}/target/wasm32-unknown-unknown/release/${contract//_/-}.wasm"
    "${CONTRACTS_DIR}/${contract}/target/wasm32-unknown-unknown/release/${contract}.wasm"
    "${CONTRACTS_DIR}/${contract}/target/wasm32-unknown-unknown/release/${contract//_/-}.wasm"
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -f "${candidate}" ]]; then
      printf '%s' "${candidate}"
      return 0
    fi
  done

  return 1
}

odra_session_args() {
  local contract="$1"
  local struct_name
  struct_name="$(contract_struct_name "${contract}")"

  ODRA_SESSION_ARGS=(
    --session-arg "odra_cfg_package_hash_key_name:string='${struct_name}_package_hash'"
    --session-arg "odra_cfg_allow_key_override:bool='${ODRA_ALLOW_KEY_OVERRIDE}'"
    --session-arg "odra_cfg_is_upgradable:bool='${ODRA_IS_UPGRADABLE}'"
    --session-arg "odra_cfg_is_upgrade:bool='false'"
  )

  case "${contract}" in
    credit_registry|compliance_registry|reputation_registry)
      ODRA_SESSION_ARGS+=(--session-arg "admin:string='${CASPER_ACCOUNT_HASH}'")
      ;;
    oracle_paywall)
      ODRA_SESSION_ARGS+=(
        --session-arg "admin:string='${CASPER_ACCOUNT_HASH}'"
        --session-arg "treasury_account:string='${X402_TREASURY_ACCOUNT}'"
        --session-arg "query_price_motes:u64='${ORACLE_PAYWALL_QUERY_PRICE_MOTES}'"
        --session-arg "network:string='${CASPER_DEPLOY_CHAIN_NAME:-${CASPER_NETWORK_NAME}}'"
      )
      ;;
    *)
      fail "unknown contract for Odra session args: ${contract}"
      ;;
  esac
}

log "Starting Dev 2 Casper testnet deployment"
log "Testnet-only flow. Coordinate with teammates before submitting deploys when using a shared deployer key."

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

if [[ -z "${CASPER_RPC_URL:-}" || -z "${CASPER_PUBLIC_KEY:-}" || -z "${CASPER_ACCOUNT_HASH:-}" ]]; then
  fail "CASPER_RPC_URL, CASPER_PUBLIC_KEY, and CASPER_ACCOUNT_HASH are required for deployment"
fi

if [[ -z "${X402_TREASURY_ACCOUNT:-}" ]]; then
  fail "X402_TREASURY_ACCOUNT is required for OraclePaywall init"
fi

validate_bool "ODRA_ALLOW_KEY_OVERRIDE" "${ODRA_ALLOW_KEY_OVERRIDE}"
validate_bool "ODRA_IS_UPGRADABLE" "${ODRA_IS_UPGRADABLE}"
validate_u64 "ORACLE_PAYWALL_QUERY_PRICE_MOTES" "${ORACLE_PAYWALL_QUERY_PRICE_MOTES}"

SECRET_KEY_ARGS=()
if [[ -n "${CASPER_PRIVATE_KEY_PATH:-}" ]]; then
  if [[ ! -f "${CASPER_PRIVATE_KEY_PATH}" ]]; then
    fail "CASPER_PRIVATE_KEY_PATH is set but the file does not exist"
  fi
  log "Using CASPER_PRIVATE_KEY_PATH for signing; private key contents will not be printed"
  SECRET_KEY_ARGS=(--secret-key "${CASPER_PRIVATE_KEY_PATH}")
elif [[ -n "${CASPER_PRIVATE_KEY:-}" ]]; then
  warn_message="CASPER_PRIVATE_KEY fallback is set. Prefer CASPER_PRIVATE_KEY_PATH; never paste or print the key."
  log "WARNING: ${warn_message}"
  SECRET_KEY_ARGS=(--secret-key "${CASPER_PRIVATE_KEY}")
else
  fail "set CASPER_PRIVATE_KEY_PATH=./keys/deployer/secret_key.pem or CASPER_PRIVATE_KEY as a discouraged fallback"
fi

log "Expected contracts to deploy:"
for contract in "${EXPECTED_CONTRACTS[@]}"; do
  log "  - ${contract}"
done

log "Building Rust contract workspace"
(cd "${CONTRACTS_DIR}" && cargo build --workspace)

MISSING_WASM=()
for contract in "${EXPECTED_CONTRACTS[@]}"; do
  if ! find_contract_wasm "${contract}" >/dev/null; then
    MISSING_WASM+=("${contract}")
  fi
done

if [[ ${#MISSING_WASM[@]} -gt 0 ]]; then
  cat <<EOF
[aurum-dev2] Build completed, but real deployment cannot continue.

Missing deployable Wasm artifacts for: ${MISSING_WASM[*]}

Current blocker:
- Build the Odra wrappers first and copy artifacts into contracts/wasm/<Contract>.wasm.

Exact next technical step:
1. Install wasm32 target and Odra build tools from docs/dev2/DEPLOYMENT.md.
2. Build each module with ODRA_MODULE=<Contract> and the aurum_odra_contracts_build_contract bin.
3. Copy each output to contracts/wasm/<Contract>.wasm.
4. Re-run ./scripts/deploy-contracts.sh from WSL.
EOF
  exit 1
fi

if ! command -v casper-client >/dev/null 2>&1; then
  fail "casper-client is required for real deployment. Install it in WSL with: cargo install casper-client"
fi

log "Found deployable Wasm artifacts; broadcasting to Casper testnet"
log "WARNING: If another teammate already deployed this artifact set, stop here and use their deploy hashes instead."
log "Using Odra install args: odra_cfg_is_upgradable=${ODRA_IS_UPGRADABLE}, odra_cfg_allow_key_override=${ODRA_ALLOW_KEY_OVERRIDE}"

for contract in "${EXPECTED_CONTRACTS[@]}"; do
  wasm_path="$(find_contract_wasm "${contract}")"
  prefix="$(contract_env_prefix "${contract}")"
  odra_session_args "${contract}"
  log "Deploying ${contract} from ${wasm_path}"
  output="$(
    casper-client put-deploy \
      --node-address "${CASPER_RPC_URL}" \
      --chain-name "${CASPER_DEPLOY_CHAIN_NAME:-${CASPER_NETWORK_NAME}}" \
      "${SECRET_KEY_ARGS[@]}" \
      --payment-amount "${DEFAULT_PAYMENT_AMOUNT}" \
      --session-path "${wasm_path}" \
      "${ODRA_SESSION_ARGS[@]}"
  )"
  printf '%s\n' "${output}"

  deploy_hash="$(printf '%s\n' "${output}" | sed -nE 's/.*deploy hash:?[[:space:]]*([0-9a-fA-F]{64}).*/\1/ip' | head -n 1)"
  if [[ -z "${deploy_hash}" ]]; then
    deploy_hash="$(printf '%s\n' "${output}" | sed -nE 's/.*"deploy_hash"[[:space:]]*:[[:space:]]*"([0-9a-fA-F]{64})".*/\1/p' | head -n 1)"
  fi

  if [[ -n "${deploy_hash}" ]]; then
    log "Record ${prefix}_DEPLOY_HASH=${deploy_hash}"
  else
    log "Record ${prefix}_DEPLOY_HASH from the casper-client output above"
  fi
  log "Keep this deploy hash in local .env or the Dev 2 handoff record; do not commit .env."
done

cat <<'EOF'
[aurum-dev2] Deployment submissions completed.

Next steps:
1. Wait for each deploy hash to succeed on Casper testnet.
2. Record these deploy hash variables in local .env:
   CREDIT_REGISTRY_DEPLOY_HASH
   COMPLIANCE_REGISTRY_DEPLOY_HASH
   ORACLE_PAYWALL_DEPLOY_HASH
   REPUTATION_REGISTRY_DEPLOY_HASH
3. Inspect each successful deploy in explorer, CSPR.cloud tooling, or casper-client query-state output.
4. Record the resulting contract hashes in local .env:
   CREDIT_REGISTRY_HASH
   COMPLIANCE_REGISTRY_HASH
   ORACLE_PAYWALL_HASH
   REPUTATION_REGISTRY_HASH
5. Run ./scripts/verify-contracts.sh after the hash variables are populated.
EOF
