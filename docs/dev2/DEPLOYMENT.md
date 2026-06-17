# Dev 2 Deployment

This runbook is testnet-only. It covers the Windows/WSL setup, local validation, real deploy submission path, and the current Odra blocker for Aurum Dev 2.

## Current Contract Status

The `contracts/` workspace now contains two layers:

- existing Rust domain/state-machine crates under `credit_registry`, `compliance_registry`, `oracle_paywall`, and `reputation_registry`
- deployable Odra MVP wrappers under `contracts/odra`

The Odra wrappers preserve the core MVP behavior: role assignment, credit issuance/update/revocation, compliance flagging, oracle paid-query nonce protection, and reputation attestation/slashing. They intentionally use Casper/Odra-supported primitive entrypoint types. For example, credit score values are `u32` in the Odra entrypoints even though the pure Rust domain crate uses `u16`.

Pinned toolchain:

- `odra = 2.8.1`
- `odra-build = 2.8.1`
- `odra-vm = 2.8.1`
- `cargo-odra = 0.1.7`
- `wasm32-unknown-unknown` Rust target
- `casper-client` installed in WSL

Odra 2.8.1 currently requires a nightly-capable compiler path because `odra-macros` uses a nightly feature. In local verification this was handled with `RUSTC_BOOTSTRAP=1`. In WSL, prefer a pinned nightly toolchain or export `RUSTC_BOOTSTRAP=1` for the Odra build/test commands.

## Windows And WSL Setup

Run this from PowerShell as Administrator:

```bash
wsl --install
```

After restart, open Ubuntu/WSL:

```bash
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev curl git python3 python3-pip binaryen wabt

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown

cargo --version
rustc --version

cargo install casper-client
casper-client --version

cargo install cargo-odra --locked
cargo odra --help
```

Locate the Windows repo from WSL using `/mnt/<drive>/...`:

```bash
cd /mnt/d/zeank/Desktop/Projects/aurum
git checkout feature/contracts-data-layer
```

## Generate Deployer Keys

Only run this when creating a new testnet deployer. If a trusted teammate sends the existing hackathon testnet deployer key, use the shared-key workflow below instead and do not overwrite it.

Generate a testnet deployer keypair inside the repo:

```bash
mkdir -p keys/deployer
casper-client keygen keys/deployer
cat keys/deployer/public_key_hex
```

Do not print, copy into chat, or commit `keys/deployer/secret_key.pem`.

## Team Deployment Workflows

Workflow A is preferred: one Dev 2 operator deploys, then shares only public deployment outputs. Teammates receive:

```env
CREDIT_REGISTRY_DEPLOY_HASH=
COMPLIANCE_REGISTRY_DEPLOY_HASH=
ORACLE_PAYWALL_DEPLOY_HASH=
REPUTATION_REGISTRY_DEPLOY_HASH=
CREDIT_REGISTRY_HASH=
COMPLIANCE_REGISTRY_HASH=
ORACLE_PAYWALL_HASH=
REPUTATION_REGISTRY_HASH=
```

They do not need the deployer private key for normal Dev 1 or Dev 3 integration.

Workflow B is allowed only for trusted hackathon testnet testing: trusted teammates use the same funded Casper testnet deployer keypair. This must never be used for mainnet or production funds. Coordinate before running `./scripts/deploy-contracts.sh`; shared deployer access can create duplicate valid contract deployments if more than one person submits the same artifacts.

## Trusted Teammate Shared Key Setup

If you receive the shared testnet deployer package, place it locally without printing file contents:

```txt
keys/deployer/public_key.pem
keys/deployer/public_key_hex
keys/deployer/secret_key.pem
```

Use the matching received `.env` locally and confirm it points at the file path, not inline secret contents:

```env
CASPER_PRIVATE_KEY_PATH=./keys/deployer/secret_key.pem
CASPER_PRIVATE_KEY=
```

Before deployment, verify the local files are excluded from Git on your machine:

```bash
git status --short -- .env keys
```

If your local exclude file does not already ignore them, add local-only excludes yourself:

```bash
printf '\n.env\nkeys/\n*.pem\n' >> .git/info/exclude
```

Do not commit `.env`, `keys/`, `*.pem`, or generated `target/` output. Do not paste `secret_key.pem` into chat, tickets, docs, or source.

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
set -a
source .env
set +a

./scripts/check-dev2-env.sh --deploy

cd contracts
export RUSTC_BOOTSTRAP=1
cargo test --workspace
cargo odra build
cd ..

python3 -m compileall api/casper api/cspr_cloud
```

## Build Wasm Artifacts

Preferred WSL build command:

```bash
cd contracts
export RUSTC_BOOTSTRAP=1
cargo odra build
```

Expected artifacts:

```txt
contracts/wasm/CreditRegistry.wasm
contracts/wasm/ComplianceRegistry.wasm
contracts/wasm/OraclePaywall.wasm
contracts/wasm/ReputationRegistry.wasm
```

`cargo-odra` also copies workspace artifacts into module-local `wasm/` directories when running in a supported Unix-like environment. The deploy script accepts both root `contracts/wasm/` and `contracts/odra/wasm/` artifact locations.

If `cargo odra build` is unavailable, each module can be built manually and copied to the root `wasm/` directory:

```bash
cd contracts
mkdir -p wasm
export RUSTC_BOOTSTRAP=1
export ODRA_BACKEND=casper

ODRA_MODULE=CreditRegistry cargo build -p aurum_odra_contracts --release --target wasm32-unknown-unknown --bin aurum_odra_contracts_build_contract
cp target/wasm32-unknown-unknown/release/aurum_odra_contracts_build_contract.wasm wasm/CreditRegistry.wasm

ODRA_MODULE=ComplianceRegistry cargo build -p aurum_odra_contracts --release --target wasm32-unknown-unknown --bin aurum_odra_contracts_build_contract
cp target/wasm32-unknown-unknown/release/aurum_odra_contracts_build_contract.wasm wasm/ComplianceRegistry.wasm

ODRA_MODULE=OraclePaywall cargo build -p aurum_odra_contracts --release --target wasm32-unknown-unknown --bin aurum_odra_contracts_build_contract
cp target/wasm32-unknown-unknown/release/aurum_odra_contracts_build_contract.wasm wasm/OraclePaywall.wasm

ODRA_MODULE=ReputationRegistry cargo build -p aurum_odra_contracts --release --target wasm32-unknown-unknown --bin aurum_odra_contracts_build_contract
cp target/wasm32-unknown-unknown/release/aurum_odra_contracts_build_contract.wasm wasm/ReputationRegistry.wasm
```

## Deploy Contracts

Required tools:

- WSL Ubuntu
- Rust/Cargo
- `casper-client`
- `cargo-odra`
- `binaryen` for `wasm-opt`
- `wabt` for `wasm-strip`
- funded Casper testnet deployer keypair

When deployable Wasm artifacts exist:

```bash
./scripts/deploy-contracts.sh
```

Stop and coordinate first if another teammate already submitted deployments from the same shared deployer. In that case, use their deploy hashes and contract hashes instead of deploying another set.

The script looks for each contract artifact under:

```txt
contracts/wasm/CreditRegistry.wasm
contracts/wasm/ComplianceRegistry.wasm
contracts/wasm/OraclePaywall.wasm
contracts/wasm/ReputationRegistry.wasm
contracts/odra/wasm/CreditRegistry.wasm
contracts/odra/wasm/ComplianceRegistry.wasm
contracts/odra/wasm/OraclePaywall.wasm
contracts/odra/wasm/ReputationRegistry.wasm
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
- Odra install args:
  - `odra_cfg_package_hash_key_name:string='<Contract>_package_hash'`
  - `odra_cfg_allow_key_override:bool='true'` by default
  - `odra_cfg_is_upgradable:bool='false'` by default
  - `odra_cfg_is_upgrade:bool='false'`
- Odra constructor args:
  - `admin:string='${CASPER_ACCOUNT_HASH}'` for all contracts
  - `treasury_account:string='${X402_TREASURY_ACCOUNT}'` for `OraclePaywall`
  - `query_price_motes:u64='${ORACLE_PAYWALL_QUERY_PRICE_MOTES}'` for `OraclePaywall`
  - `network:string='${CASPER_DEPLOY_CHAIN_NAME:-${CASPER_NETWORK_NAME}}'` for `OraclePaywall`

Do not deploy the generated Odra Wasm with only `--session-path`. Odra 2.8.1 install Wasm expects the `odra_cfg_*` session arguments above. Missing those arguments reverts on-chain with Odra `ExecutionError::MissingArg`, surfaced by Casper as `User error: 64658`.

Correct command shape for `CreditRegistry`:

```bash
casper-client put-deploy \
  --node-address "$CASPER_RPC_URL" \
  --chain-name "${CASPER_DEPLOY_CHAIN_NAME:-$CASPER_NETWORK_NAME}" \
  --secret-key "$CASPER_PRIVATE_KEY_PATH" \
  --payment-amount "${CASPER_DEPLOY_PAYMENT_AMOUNT:-300000000000}" \
  --session-path contracts/wasm/CreditRegistry.wasm \
  --session-arg "odra_cfg_package_hash_key_name:string='CreditRegistry_package_hash'" \
  --session-arg "odra_cfg_allow_key_override:bool='true'" \
  --session-arg "odra_cfg_is_upgradable:bool='false'" \
  --session-arg "odra_cfg_is_upgrade:bool='false'" \
  --session-arg "admin:string='${CASPER_ACCOUNT_HASH}'"
```

Correct command shape for `OraclePaywall`:

```bash
casper-client put-deploy \
  --node-address "$CASPER_RPC_URL" \
  --chain-name "${CASPER_DEPLOY_CHAIN_NAME:-$CASPER_NETWORK_NAME}" \
  --secret-key "$CASPER_PRIVATE_KEY_PATH" \
  --payment-amount "${CASPER_DEPLOY_PAYMENT_AMOUNT:-300000000000}" \
  --session-path contracts/wasm/OraclePaywall.wasm \
  --session-arg "odra_cfg_package_hash_key_name:string='OraclePaywall_package_hash'" \
  --session-arg "odra_cfg_allow_key_override:bool='true'" \
  --session-arg "odra_cfg_is_upgradable:bool='false'" \
  --session-arg "odra_cfg_is_upgrade:bool='false'" \
  --session-arg "admin:string='${CASPER_ACCOUNT_HASH}'" \
  --session-arg "treasury_account:string='${X402_TREASURY_ACCOUNT}'" \
  --session-arg "query_price_motes:u64='${ORACLE_PAYWALL_QUERY_PRICE_MOTES:-1500000000}'" \
  --session-arg "network:string='${CASPER_DEPLOY_CHAIN_NAME:-$CASPER_NETWORK_NAME}'"
```

`ComplianceRegistry` and `ReputationRegistry` use the same shape as `CreditRegistry` with their own Wasm path and package hash key name.

## Record Deploy Hashes

After each successful submission, record:

```env
CREDIT_REGISTRY_DEPLOY_HASH=
COMPLIANCE_REGISTRY_DEPLOY_HASH=
ORACLE_PAYWALL_DEPLOY_HASH=
REPUTATION_REGISTRY_DEPLOY_HASH=
```

Capture the deploy timestamp, deployer account, network, and deploy hash.

## Verify Deploys

```bash
./scripts/verify-contracts.sh
```

Also inspect each deploy hash in Casper testnet explorer or CSPR.cloud tooling and confirm success before extracting contract hashes.

Local verification before deploy:

```bash
cd contracts
export RUSTC_BOOTSTRAP=1
cargo test --workspace
cargo odra build
```

## Record Contract Hashes

After deploy confirmation, inspect the successful deploy effects in explorer, CSPR.cloud tooling, or Casper client state queries. Record the resulting contract hashes:

```env
CREDIT_REGISTRY_HASH=
COMPLIANCE_REGISTRY_HASH=
ORACLE_PAYWALL_HASH=
REPUTATION_REGISTRY_HASH=
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
- Do not share the testnet deployer key outside trusted hackathon teammates.
- Coordinate before `./scripts/deploy-contracts.sh` when using a shared deployer key.
- Testnet CSPR is required for deploy testing.
- `target/` is build output and should not be committed.
- `wasm/` artifacts are generated build output and should be reviewed before committing.
- `Cargo.lock` and `Cargo.toml` are safe to commit.
- Keep x402 and CSPR.cloud modes labeled accurately as `mock` or `live`.
