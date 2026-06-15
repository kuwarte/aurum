# Dev 2 Environment

This document explains which values Dev 2 needs for local build checks, Casper testnet deployment preparation, Python helper usage, x402 payment mode selection, and CSPR.cloud mode selection. All values must be configured with placeholders or local secrets only; mainnet CSPR is not required for the MVP.

## Build-Only Variables

```env
CASPER_RPC_URL=https://node.testnet.cspr.cloud/rpc
CASPER_NETWORK_NAME=casper-test
CASPER_DEPLOY_CHAIN_NAME=casper-test
CASPER_PRIVATE_KEY=replace_with_server_side_private_key_or_secret_mount
CASPER_PUBLIC_KEY=01_replace_with_testnet_public_key
CASPER_ACCOUNT_HASH=account-hash-replace-with-testnet-account
```

Use these values for:

- Python wrapper imports and config loading
- Rust build/test preparation
- local deployment scripting

## Testnet Deployment Variables

```env
CASPER_EXPECTED_CONTRACTS=credit_registry,compliance_registry,oracle_paywall,reputation_registry
CREDIT_REGISTRY_DEPLOY_HASH=deploy-hash-todo-credit-registry
COMPLIANCE_REGISTRY_DEPLOY_HASH=deploy-hash-todo-compliance-registry
ORACLE_PAYWALL_DEPLOY_HASH=deploy-hash-todo-oracle-paywall
REPUTATION_REGISTRY_DEPLOY_HASH=deploy-hash-todo-reputation-registry
CREDIT_REGISTRY_HASH=hash-todo-credit-registry
COMPLIANCE_REGISTRY_HASH=hash-todo-compliance-registry
ORACLE_PAYWALL_HASH=hash-todo-oracle-paywall
REPUTATION_REGISTRY_HASH=hash-todo-reputation-registry
```

Use these values for:

- recording successful deploy transactions
- handing final contract hashes to Dev 1 and Dev 3
- post-deploy Python wrapper testing

## x402 Mock Mode Variables

```env
X402_MODE=mock
X402_FACILITATOR_URL=https://todo-facilitator.example
X402_TREASURY_ACCOUNT=account-hash-replace-with-testnet-treasury
X402_QUERY_PRICE_CSPR=1.50
X402_NETWORK=casper-test
```

Use these values for:

- hackathon demo flows where payment verification is simulated
- backend tests that must label payment state clearly as mock

## x402 Live Mode Variables

```env
X402_MODE=live
X402_FACILITATOR_URL=https://todo-facilitator.example
X402_TREASURY_ACCOUNT=account-hash-replace-with-testnet-treasury
X402_QUERY_PRICE_CSPR=1.50
X402_NETWORK=casper-test
```

Use these values only when:

- the real facilitator URL is known
- payment-proof verification is actually implemented and tested

Live mode is not production-complete in the current branch.

## CSPR.cloud Mock Mode Variables

```env
CSPR_CLOUD_MODE=mock
CSPR_CLOUD_KEY=replace-with-cspr-cloud-api-key
CSPR_CLOUD_BASE_URL=https://api.testnet.cspr.cloud
CSPR_CLOUD_STREAMING_URL=wss://streaming.testnet.cspr.cloud
CSPR_NODE_RPC_URL=https://node.testnet.cspr.cloud
CSPR_NODE_SSE_URL=https://node-sse.testnet.cspr.cloud
CSPR_CLOUD_WALLET_ACTIVITY_PATH=
CSPR_CLOUD_DEFI_POSITIONS_PATH=
CSPR_CLOUD_LOANS_PATH=
CSPR_CLOUD_REPAYMENTS_PATH=
CSPR_CLOUD_YIELD_PATH=
CSPR_CLOUD_RWA_PATH=
```

Use these values for:

- demo-safe mock data during scoring and backend integration
- local wrapper tests when live CSPR.cloud routes are not pinned

## CSPR.cloud Live Mode Variables

```env
CSPR_CLOUD_MODE=live
CSPR_CLOUD_KEY=replace-with-cspr-cloud-api-key
CSPR_CLOUD_BASE_URL=https://api.testnet.cspr.cloud
CSPR_CLOUD_STREAMING_URL=wss://streaming.testnet.cspr.cloud
CSPR_NODE_RPC_URL=https://node.testnet.cspr.cloud
CSPR_NODE_SSE_URL=https://node-sse.testnet.cspr.cloud
CSPR_CLOUD_WALLET_ACTIVITY_PATH=wallets/{account_hash}/activity
CSPR_CLOUD_DEFI_POSITIONS_PATH=defi/{account_hash}/positions
CSPR_CLOUD_LOANS_PATH=defi/{account_hash}/loans
CSPR_CLOUD_REPAYMENTS_PATH=defi/{account_hash}/repayments
CSPR_CLOUD_YIELD_PATH=defi/{account_hash}/yield
CSPR_CLOUD_RWA_PATH=rwa/{account_hash}/events
```

Use these values only when:

- the route templates have been confirmed against CSPR.cloud
- the API key is available server-side
- the team is ready to distinguish live data from mock/demo fallback
- REST, streaming, and node endpoints are pointed at Casper testnet

## Security Notes

- Never commit real private keys, treasury accounts tied to production value, or API keys.
- Keep all secrets server-side only.
- The MVP is testnet-only; mainnet CSPR is not required.
- `X402_MODE=mock` and `CSPR_CLOUD_MODE=mock` are acceptable for the hackathon demo as long as they are labeled clearly.
- `CASPER_DEPLOY_CHAIN_NAME` should match the testnet target used by the final Odra deploy command.

## Testnet Funding Requirement

Testnet CSPR is required for:

- deploying future Odra-wrapped contracts
- future write calls to the registries and oracle paywall
- demo paid-query flows once live contract interaction is added

Use the Casper faucet referenced in the repository `README.md`.
