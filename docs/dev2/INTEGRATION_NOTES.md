# Dev 2 Integration Notes

This file contains Dev 2 handoff guidance only. It does not modify Dev 1 or Dev 3 owned files.

## Contract Hash Placeholders

Populate these values after Casper testnet deployment:

```env
CREDIT_REGISTRY_HASH=hash-todo-credit-registry
COMPLIANCE_REGISTRY_HASH=hash-todo-compliance-registry
ORACLE_PAYWALL_HASH=hash-todo-oracle-paywall
REPUTATION_REGISTRY_HASH=hash-todo-reputation-registry
```

## Python Entry Points

Dev 3 can import:

```python
from casper.contracts import load_contracts_from_env
from cspr_cloud.wallet import load_wallet_service_from_env
from cspr_cloud.defi import load_defi_service_from_env
```

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
- Do not treat `mock` x402 verification as real settlement.

## For Dev 3 Review

Suggested backend integration snippet:

```python
from casper.contracts import load_contracts_from_env
from cspr_cloud.wallet import load_wallet_service_from_env
from cspr_cloud.defi import load_defi_service_from_env

contracts = load_contracts_from_env()
wallet_service = load_wallet_service_from_env()
defi_service = load_defi_service_from_env()

wallet_summary = wallet_service.get_wallet_volume_summary(account_hash)
defi_summary = defi_service.get_liquidity_positions(account_hash)
```

Notes:

- Treat `warning` fields as mode indicators during scoring.
- Swap mock/live CSPR.cloud modes via environment variables only.
- Replace placeholder contract hashes after testnet deployment before calling write paths.
