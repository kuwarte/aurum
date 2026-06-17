# Dev 2 Environment

All values are for local development and Casper testnet. Do not commit real `.env` values, private keys, API keys, or funded account details.

## Casper Network

```env
CASPER_RPC_URL=https://rpc.testnet.casper.network/rpc
CASPER_NETWORK_NAME=casper-test
CASPER_DEPLOY_CHAIN_NAME=casper-test
CASPER_PUBLIC_KEY=<wsl_deployer_public_key>
CASPER_ACCOUNT_HASH=<wsl_deployer_account_hash>
```

`CASPER_NETWORK_NAME` and `CASPER_DEPLOY_CHAIN_NAME` must remain testnet values for this flow.

## Signing

Preferred:

```env
CASPER_PRIVATE_KEY_PATH=./keys/deployer/secret_key.pem
CASPER_PRIVATE_KEY=
```

Fallback only:

```env
CASPER_PRIVATE_KEY=<discouraged_key_path_or_secret_mount>
```

Use `CASPER_PRIVATE_KEY_PATH` whenever possible. Never print `secret_key.pem` or paste private key contents into chat, docs, scripts, or source.

## Deployment Records

Deploy hashes are populated after each successful testnet deploy submission:

```env
CREDIT_REGISTRY_DEPLOY_HASH=
COMPLIANCE_REGISTRY_DEPLOY_HASH=
ORACLE_PAYWALL_DEPLOY_HASH=
REPUTATION_REGISTRY_DEPLOY_HASH=
```

Contract hashes are populated only after deploy confirmation and inspection of deploy effects:

```env
CREDIT_REGISTRY_HASH=
COMPLIANCE_REGISTRY_HASH=
ORACLE_PAYWALL_HASH=
REPUTATION_REGISTRY_HASH=
```

Until these are real values, downstream contract calls should treat the contracts as not deployed.

## x402

Mock mode:

```env
X402_MODE=mock
X402_NETWORK=casper-test
X402_TREASURY_ACCOUNT=<wsl_deployer_account_hash>
X402_QUERY_PRICE_CSPR=1.50
X402_FACILITATOR_URL=
```

Live mode:

```env
X402_MODE=live
X402_NETWORK=casper-test
X402_TREASURY_ACCOUNT=<testnet_treasury_account_hash>
X402_QUERY_PRICE_CSPR=1.50
X402_FACILITATOR_URL=<tested_facilitator_url>
```

Do not set `X402_MODE=live` unless real payment-proof verification and settlement have been implemented and tested.

## CSPR.cloud

Mock mode:

```env
CSPR_CLOUD_MODE=mock
CSPR_CLOUD_BASE_URL=https://api.testnet.cspr.cloud
CSPR_CLOUD_KEY=
```

Live mode:

```env
CSPR_CLOUD_MODE=live
CSPR_CLOUD_BASE_URL=https://api.testnet.cspr.cloud
CSPR_CLOUD_STREAMING_URL=wss://streaming.testnet.cspr.cloud
CSPR_NODE_RPC_URL=https://node.testnet.cspr.cloud
CSPR_NODE_SSE_URL=https://node-sse.testnet.cspr.cloud
CSPR_CLOUD_KEY=<server_side_api_key>
CSPR_CLOUD_WALLET_ACTIVITY_PATH=wallets/{account_hash}/activity
CSPR_CLOUD_DEFI_POSITIONS_PATH=defi/{account_hash}/positions
CSPR_CLOUD_LOANS_PATH=defi/{account_hash}/loans
CSPR_CLOUD_REPAYMENTS_PATH=defi/{account_hash}/repayments
CSPR_CLOUD_YIELD_PATH=defi/{account_hash}/yield
CSPR_CLOUD_RWA_PATH=rwa/{account_hash}/events
```

Only use live mode when route templates and credentials are confirmed against testnet.

## Optional Deployment Tuning

```env
CASPER_DEPLOY_PAYMENT_AMOUNT=300000000000
CASPER_EXPECTED_CONTRACTS=credit_registry,compliance_registry,oracle_paywall,reputation_registry
```

`CASPER_DEPLOY_PAYMENT_AMOUNT` is passed to `casper-client put-deploy` when Wasm artifacts exist.

## Security Notes

- `.env`, `keys/`, and `*.pem` are local-only.
- `target/` is build output and should not be committed.
- `Cargo.toml` and `Cargo.lock` are safe to commit.
- Mainnet CSPR is not required and must not be used for this Dev 2 flow.
- Testnet CSPR is required for deployment testing.
- Mock/live labels must be accurate for x402 and CSPR.cloud.
