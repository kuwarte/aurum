#!/usr/bin/env bash
set -euo pipefail

# Aurum Dev 2 environment checker.
# This helper separates build-only configuration from deployment-required
# configuration so developers can see what is missing without leaking secrets.

MODE="build"

for arg in "$@"; do
  case "${arg}" in
    --deploy)
      MODE="deploy"
      ;;
    --build)
      MODE="build"
      ;;
    *)
      echo "[aurum-dev2] ERROR: unknown argument: ${arg}" >&2
      exit 1
      ;;
  esac
done

log() {
  echo "[aurum-dev2] $*"
}

warn() {
  echo "[aurum-dev2] WARNING: $*" >&2
}

mask_value() {
  local raw_value="$1"
  if [[ -z "${raw_value}" ]]; then
    printf '%s' "<missing>"
  elif [[ ${#raw_value} -le 6 ]]; then
    printf '%s' "***"
  else
    printf '%s' "${raw_value:0:3}***${raw_value: -3}"
  fi
}

check_required() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "${value}" ]]; then
    warn "Missing required variable: ${name}"
    return 1
  fi
  log "Required ${name} present: $(mask_value "${value}")"
  return 0
}

check_optional() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "${value}" ]]; then
    warn "Optional variable not set: ${name}"
  else
    log "Optional ${name} present: $(mask_value "${value}")"
  fi
}

FAILURES=0

log "Checking Dev 2 environment in ${MODE} mode"

for name in CASPER_RPC_URL CASPER_NETWORK_NAME CASPER_DEPLOY_CHAIN_NAME; do
  check_required "${name}" || FAILURES=1
done

if [[ "${CASPER_NETWORK_NAME:-}" != "" && "${CASPER_NETWORK_NAME,,}" != *test* ]]; then
  warn "CASPER_NETWORK_NAME does not look like testnet"
  FAILURES=1
fi

if [[ "${CASPER_DEPLOY_CHAIN_NAME:-}" != "" && "${CASPER_DEPLOY_CHAIN_NAME,,}" != *test* ]]; then
  warn "CASPER_DEPLOY_CHAIN_NAME does not look like testnet"
  FAILURES=1
fi

if [[ "${MODE}" == "deploy" ]]; then
  for name in CASPER_PUBLIC_KEY CASPER_ACCOUNT_HASH X402_TREASURY_ACCOUNT; do
    check_required "${name}" || FAILURES=1
  done

  if [[ -n "${CASPER_PRIVATE_KEY_PATH:-}" ]]; then
    if [[ -f "${CASPER_PRIVATE_KEY_PATH}" ]]; then
      log "Preferred CASPER_PRIVATE_KEY_PATH points to an existing key file: $(mask_value "${CASPER_PRIVATE_KEY_PATH}")"
    else
      warn "CASPER_PRIVATE_KEY_PATH is set but the file does not exist: $(mask_value "${CASPER_PRIVATE_KEY_PATH}")"
      FAILURES=1
    fi
  elif [[ -n "${CASPER_PRIVATE_KEY:-}" ]]; then
    warn "CASPER_PRIVATE_KEY is set as a discouraged fallback; prefer CASPER_PRIVATE_KEY_PATH=./keys/deployer/secret_key.pem"
  else
    warn "Missing deploy signing config: set CASPER_PRIVATE_KEY_PATH to an existing PEM file, or CASPER_PRIVATE_KEY as a discouraged fallback"
    FAILURES=1
  fi
else
  for name in CASPER_PRIVATE_KEY_PATH CASPER_PRIVATE_KEY CASPER_PUBLIC_KEY CASPER_ACCOUNT_HASH; do
    check_optional "${name}"
  done
fi

for name in \
  CREDIT_REGISTRY_HASH \
  COMPLIANCE_REGISTRY_HASH \
  ORACLE_PAYWALL_HASH \
  REPUTATION_REGISTRY_HASH \
  X402_MODE \
  X402_QUERY_PRICE_CSPR \
  X402_NETWORK \
  CSPR_CLOUD_MODE \
  CSPR_CLOUD_BASE_URL
do
  check_optional "${name}"
done

warn "Mock modes are acceptable for the hackathon MVP, but they must stay labeled as mock/demo."
warn "Mainnet CSPR is not required and should not be used for this Dev 2 flow."

if [[ ${FAILURES} -ne 0 ]]; then
  exit 1
fi

log "Environment check completed successfully"
