# Dev 2 Environment

## Required Variables

```env
CASPER_RPC_URL=https://node.testnet.cspr.cloud/rpc
CASPER_NETWORK_NAME=casper-test
CASPER_PRIVATE_KEY=replace_with_server_side_private_key_or_secret_mount
CASPER_PUBLIC_KEY=01_replace_with_testnet_public_key
CASPER_ACCOUNT_HASH=account-hash-replace-with-testnet-account
X402_TREASURY_ACCOUNT=account-hash-replace-with-testnet-treasury
```

## Optional Variables

```env
X402_MODE=mock
X402_FACILITATOR_URL=https://todo-facilitator.example
X402_QUERY_PRICE_CSPR=1.50
X402_NETWORK=casper-test
CSPR_CLOUD_MODE=mock
CSPR_CLOUD_KEY=replace-with-cspr-cloud-api-key
CSPR_CLOUD_BASE_URL=https://api.testnet.cspr.cloud
CSPR_CLOUD_WALLET_ACTIVITY_PATH=
CSPR_CLOUD_DEFI_POSITIONS_PATH=
CSPR_CLOUD_LOANS_PATH=
CSPR_CLOUD_REPAYMENTS_PATH=
CSPR_CLOUD_YIELD_PATH=
CSPR_CLOUD_RWA_PATH=
```

## Contract Hash Variables

```env
CREDIT_REGISTRY_HASH=hash-todo-credit-registry
COMPLIANCE_REGISTRY_HASH=hash-todo-compliance-registry
ORACLE_PAYWALL_HASH=hash-todo-oracle-paywall
REPUTATION_REGISTRY_HASH=hash-todo-reputation-registry
```

## Security Notes

- Never commit real private keys, treasury accounts tied to production value, or API keys.
- Keep all secrets server-side only.
- The MVP is testnet-only; mainnet CSPR is not required.
- `X402_MODE=mock` and `CSPR_CLOUD_MODE=mock` are acceptable for the hackathon demo as long as they are labeled clearly.

## Testnet Funding Requirement

Testnet CSPR is required for:

- deploying future Odra-wrapped contracts
- future write calls to the registries
- demo paid-query flows once live contract interaction is added

Use the Casper faucet referenced in the repository `README.md`.
