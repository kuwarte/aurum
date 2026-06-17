# Dev 2 Integration Notes

This file contains Dev 2 handoff guidance only. It does not modify Dev 1 or Dev 3 owned files.

## Contract Hash Handoff Process

Dev 2 owns contract deployment and must hand off values only after Casper testnet confirmation. Do not ask Dev 1 or Dev 3 to hardcode placeholders.

1. Run `./scripts/deploy-contracts.sh` from WSL after deployable Odra Wasm artifacts exist.
2. Record each deploy hash from `casper-client put-deploy`.
3. Wait until each deploy succeeds on Casper testnet.
4. Extract each resulting contract hash from explorer, CSPR.cloud tooling, or deploy effects.
5. Share the deploy hashes, contract hashes, x402 mode, and CSPR.cloud mode together.

Populate these values after deployment:

```env
CREDIT_REGISTRY_DEPLOY_HASH=deploy-hash-todo-credit-registry
COMPLIANCE_REGISTRY_DEPLOY_HASH=deploy-hash-todo-compliance-registry
ORACLE_PAYWALL_DEPLOY_HASH=deploy-hash-todo-oracle-paywall
REPUTATION_REGISTRY_DEPLOY_HASH=deploy-hash-todo-reputation-registry
CREDIT_REGISTRY_HASH=hash-todo-credit-registry
COMPLIANCE_REGISTRY_HASH=hash-todo-compliance-registry
ORACLE_PAYWALL_HASH=hash-todo-oracle-paywall
REPUTATION_REGISTRY_HASH=hash-todo-reputation-registry
```

## Python Entry Points

Dev 3 can import:

```python
from casper.contracts import load_contracts_from_env
from casper.client import load_client_from_env
from cspr_cloud.wallet import load_wallet_service_from_env
from cspr_cloud.defi import load_defi_service_from_env
```

These helpers should read their final values from environment variables rather than hardcoded hashes.

## Sample Normalized Wallet JSON

```json
{
  "account_hash": "account-hash-example",
  "mode": "mock",
  "transactions": [
    {
      "tx_hash": "mock-tx-1",
      "timestamp": "2026-06-01T00:00:00Z",
      "amount_cspr": 125.0,
      "direction": "in",
      "counterparty": "account-hash-vendor-1"
    }
  ],
  "warning": "Mock/demo wallet history in use; replace with live CSPR.cloud data for production."
}
```

## Sample DeFi JSON

```json
{
  "account_hash": "account-hash-example",
  "mode": "mock",
  "positions": [
    {
      "protocol": "AurumSwap",
      "pool": "CSPR-USDC",
      "liquidity_usd": 2500.0,
      "status": "active"
    }
  ]
}
```

## Sample x402 Query Envelope

```json
{
  "contract_hash": "hash-todo-oracle-paywall",
  "entrypoint": "query_credit_profile",
  "borrower": "account-hash-example",
  "payment_verification": {
    "mode": "mock",
    "verified": true,
    "payer_account": "account-hash-lender",
    "receiver_account": "account-hash-treasury",
    "amount_cspr": "1.50",
    "nonce": "nonce-123"
  }
}
```

## Sample Contract Hash Handoff JSON

```json
{
  "network": "casper-test",
  "deploy_hashes": {
    "credit_registry": "deploy-hash-todo-credit-registry",
    "compliance_registry": "deploy-hash-todo-compliance-registry",
    "oracle_paywall": "deploy-hash-todo-oracle-paywall",
    "reputation_registry": "deploy-hash-todo-reputation-registry"
  },
  "contract_hashes": {
    "credit_registry": "hash-todo-credit-registry",
    "compliance_registry": "hash-todo-compliance-registry",
    "oracle_paywall": "hash-todo-oracle-paywall",
    "reputation_registry": "hash-todo-reputation-registry"
  },
  "x402_mode": "mock",
  "cspr_cloud_mode": "mock"
}
```

## For Dev 1 Review

Suggested gateway/server snippet if the frontend needs a paid profile preview route later:

```python
from casper.contracts import load_contracts_from_env
from casper.x402 import load_x402_verifier_from_env

contracts = load_contracts_from_env()
verifier = load_x402_verifier_from_env()
payment_requirement = verifier.build_payment_requirement()
```

Notes:

- Do not expose private keys or CSPR.cloud keys to the browser.
- `CASPER_PRIVATE_KEY_PATH` stays local to Dev 2 deployment and is never handed to frontend/backend consumers.
- Read final contract hashes from `CREDIT_REGISTRY_HASH`, `COMPLIANCE_REGISTRY_HASH`, `ORACLE_PAYWALL_HASH`, and `REPUTATION_REGISTRY_HASH`.
- Do not treat `mock` x402 verification as real settlement.
- Mainnet CSPR is not required for the MVP.

## For Dev 3 Review

Suggested backend integration snippet:

```python
from casper.contracts import load_contracts_from_env
from cspr_cloud.wallet import load_wallet_service_from_env
from cspr_cloud.defi import load_defi_service_from_env

contracts = load_contracts_from_env()
client = load_client_from_env()
wallet_service = load_wallet_service_from_env()
defi_service = load_defi_service_from_env()

wallet_summary = wallet_service.get_wallet_volume_summary(account_hash)
defi_summary = defi_service.get_liquidity_positions(account_hash)
```

Notes:

- Read final contract hashes from environment variables, not source code.
- Use `load_client_from_env()` if deploy/network diagnostics are needed.
- Treat `warning` fields as mode indicators during scoring.
- Treat `X402_MODE=mock` as simulated payment verification only.
- Treat `CSPR_CLOUD_MODE=mock` as demo fallback data only.
- Swap mock/live CSPR.cloud modes via environment variables only.
- Replace placeholder contract hashes after testnet deployment before calling write paths.
- Do not call write paths until Dev 2 has confirmed deploy hashes and contract hashes.
- Mainnet CSPR is not required for the MVP.
