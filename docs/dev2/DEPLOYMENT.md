# Dev 2 Deployment

This runbook is testnet-only. It covers the Windows/WSL setup, local validation, real deploy submission path, and the current Odra blocker for Aurum Dev 2.

## Current Contract Status

The current `contracts/` workspace contains Rust domain/state-machine crates:

- `credit_registry`
- `compliance_registry`
- `oracle_paywall`
- `reputation_registry`

They are not deployable Odra contracts yet. There is no `Odra.toml`, no Odra dependency, and no `wasm32-unknown-unknown` contract artifact. `scripts/deploy-contracts.sh` now supports real Casper testnet deployment with `casper-client put-deploy` once deployable Wasm artifacts exist, but it intentionally fails before broadcasting if those artifacts are missing.

Exact next technical step: pin the Odra toolchain, wrap the current Rust logic with Odra modules/storage/events/entrypoints, build release Wasm artifacts, then rerun the deploy script.

## Windows And WSL Setup

Run this from PowerShell as Administrator:

```bash
wsl --install
```

After restart, open Ubuntu/WSL:

```bash
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev curl git python3 python3-pip

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

cargo --version
rustc --version

cargo install casper-client
casper-client --version
```

Locate the Windows repo from WSL using `/mnt/<drive>/...`:

```bash
cd /mnt/d/zeank/Desktop/Projects/aurum
git checkout feature/contracts-data-layer
```

## Generate Deployer Keys

Generate a testnet deployer keypair inside the repo:

```bash
mkdir -p keys/deployer
casper-client keygen keys/deployer
cat keys/deployer/public_key_hex
```

Do not print, copy into chat, or commit `keys/deployer/secret_key.pem`.

## Environment

Use local `.env` values like this:

```env
CASPER_RPC_URL=https://rpc.testnet.casper.network/rpc
CASPER_NETWORK_NAME=casper-test
CASPER_DEPLOY_CHAIN_NAME=casper-test

CASPER_PUBLIC_KEY=<wsl_deployer_public_key>
CASPER_ACCOUNT_HASH=<wsl_deployer_account_hash>
CASPER_PRIVATE_KEY_PATH=./keys/deployer/secret_key.pem
CASPER_PRIVATE_KEY=

X402_TREASURY_ACCOUNT=<wsl_deployer_account_hash>

X402_MODE=mock
X402_NETWORK=casper-test
X402_QUERY_PRICE_CSPR=<demo_price>

CSPR_CLOUD_MODE=mock
CSPR_CLOUD_BASE_URL=https://api.testnet.cspr.cloud

CREDIT_REGISTRY_DEPLOY_HASH=
COMPLIANCE_REGISTRY_DEPLOY_HASH=
ORACLE_PAYWALL_DEPLOY_HASH=
REPUTATION_REGISTRY_DEPLOY_HASH=

CREDIT_REGISTRY_HASH=
COMPLIANCE_REGISTRY_HASH=
ORACLE_PAYWALL_HASH=
REPUTATION_REGISTRY_HASH=
```

Load `.env` in WSL:

```bash
set -a
source .env
set +a
```

## Fund The WSL Deployer

1. Use the Casper testnet faucet to fund a Casper Wallet testnet account.
2. Transfer testnet CSPR from Casper Wallet to the public key printed from `keys/deployer/public_key_hex`.
3. Confirm the deployer account exists on testnet and record its `account-hash`.
4. Put that value in `CASPER_ACCOUNT_HASH`.
5. Use the same account hash for `X402_TREASURY_ACCOUNT` during the demo if no separate treasury exists.

Do not use mainnet CSPR for this Dev 2 flow.

## Build And Test

```bash
./scripts/check-dev2-env.sh --deploy

cd contracts
cargo build --workspace
cargo test --workspace
cd ..

python3 -m compileall api/casper api/cspr_cloud
```

## Deploy Contracts

Required tools:

- WSL Ubuntu
- Rust/Cargo
- `casper-client`
- pinned Odra toolchain capable of producing Casper Wasm artifacts
- funded Casper testnet deployer keypair

When deployable Wasm artifacts exist:

```bash
./scripts/deploy-contracts.sh
```

The script looks for each contract artifact under:

```txt
contracts/target/wasm32-unknown-unknown/release/<contract>.wasm
contracts/target/wasm32-unknown-unknown/release/<contract-with-dashes>.wasm
contracts/<contract>/target/wasm32-unknown-unknown/release/<contract>.wasm
contracts/<contract>/target/wasm32-unknown-unknown/release/<contract-with-dashes>.wasm
```

It broadcasts with `casper-client put-deploy` using:

- `CASPER_RPC_URL`
- `CASPER_DEPLOY_CHAIN_NAME`
- `CASPER_PRIVATE_KEY_PATH` preferred
- `CASPER_PRIVATE_KEY` fallback only
- `CASPER_DEPLOY_PAYMENT_AMOUNT` optional, default `300000000000`

## Record Deploy Hashes

After each successful submission, record:

```env
CREDIT_REGISTRY_DEPLOY_HASH=<deploy_hash>
COMPLIANCE_REGISTRY_DEPLOY_HASH=<deploy_hash>
ORACLE_PAYWALL_DEPLOY_HASH=<deploy_hash>
REPUTATION_REGISTRY_DEPLOY_HASH=<deploy_hash>
```

Capture the deploy timestamp, deployer account, network, and deploy hash.

## Verify Deploys

```bash
./scripts/verify-contracts.sh
```

Also inspect each deploy hash in Casper testnet explorer or CSPR.cloud tooling and confirm success before extracting contract hashes.

## Record Contract Hashes

After deploy confirmation, inspect the successful deploy effects in explorer, CSPR.cloud tooling, or Casper client state queries. Record the resulting contract hashes:

```env
CREDIT_REGISTRY_HASH=<contract_hash>
COMPLIANCE_REGISTRY_HASH=<contract_hash>
ORACLE_PAYWALL_HASH=<contract_hash>
REPUTATION_REGISTRY_HASH=<contract_hash>
```

These are the values Dev 1 and Dev 3 consume. Do not hardcode them in source.

## Handoff To Dev 1 And Dev 3

Share:

- network: `casper-test`
- all four deploy hashes
- all four contract hashes
- `X402_MODE` as `mock` or `live`
- `CSPR_CLOUD_MODE` as `mock` or `live`
- note that live x402 settlement is not complete unless it has actually been implemented and tested

Use [INTEGRATION_NOTES.md](/d:/zeank/Desktop/Projects/aurum/docs/dev2/INTEGRATION_NOTES.md) for the handoff JSON.

## Safety Warnings

- Do not commit `.env`.
- Do not commit `keys/`.
- Do not commit `*.pem`.
- Do not print `secret_key.pem`.
- Do not use mainnet CSPR for this Dev 2 flow.
- Testnet CSPR is required for deploy testing.
- `target/` is build output and should not be committed.
- `Cargo.lock` and `Cargo.toml` are safe to commit.
- Keep x402 and CSPR.cloud modes labeled accurately as `mock` or `live`.
