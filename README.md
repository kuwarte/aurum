# Sentinel

Sentinel is an autonomous AI credit bureau built on Casper Network. It gives every wallet, AI agent, DAO, freelancer, and business a verifiable on-chain credit profile — scored continuously by a network of specialized AI agents, queryable by any DeFi lending protocol via x402 micropayments, with zero human underwriters in the loop.

---

## What it does

Traditional credit bureaus are centralized, opaque, and geographically siloed. They are completely inaccessible to the autonomous agent economy. Sentinel replaces them with an open, autonomous, on-chain alternative built natively on Casper's x402 payment infrastructure and Odra smart contract framework.

Every subject — wallet, AI agent, DAO, or business — is evaluated across six dimensions:

- Wallet activity: transaction frequency, volume consistency, counterparty diversity
- Repayment history: historical loan repayments across Casper DeFi protocols
- DeFi behavior: liquidity pool participation, yield strategies, staking
- DAO participation: governance voting, proposal submission, treasury contributions
- RWA ownership: tokenized invoices, rental income streams, business receivables
- Income consistency: regularity and growth of incoming stablecoin and CSPR flows

From those inputs, Sentinel produces a credit score from 0 to 1000, a risk tier (A, B, C, D), a default probability over 30/60/90 days, a borrowing limit recommendation, and a ComplianceToken indicating KYC/AML status. All of this is minted as a CreditScore NFT on Casper and queryable by any protocol via a paid x402 oracle endpoint.

---

## Agent architecture

Sentinel runs six specialized autonomous agents in a coordinated LangGraph pipeline. Each agent has a distinct responsibility and scoped contract permissions so that compromise of one agent does not compromise the system.

**Credit Agent** — pulls wallet history from CSPR.cloud, runs the XGBoost scoring model, produces a composite score 0-1000 with SHAP feature breakdown.

**Risk Agent** — runs a gradient-boosted classifier for default probability over 30, 60, and 90-day horizons. Classifies the subject into Tier A, B, C, or D. Flags early warning patterns.

**Fraud Agent** — graph analysis to detect wash trading, circular transactions, and sybil clusters. Flags are additive; a single flag does not revoke a credential.

**Attestation Agent** — aggregates all agent outputs, signs with an Ed25519 keypair, calls `issue_credit_score()` on CreditRegistry, calls `issue_compliance_token()` on ComplianceRegistry, and stores the attestation payload.

**Monitoring Agent** — watches subjects with active credentials via CSPR.cloud polling. Triggers revocation on missed repayments, defaults, or fraud threshold breaches.

**Lending Agent** — matches a borrower to available lending pool offers based on their tier and current rates.

---

## Smart contracts

Four contracts deployed on Casper Testnet using the Odra Framework (Rust). All contracts are upgradeable via Casper's native contract versioning.

- `CreditRegistry` — core registry for credit credentials. Handles issue, update, revoke, and get.
- `ComplianceRegistry` — KYC/AML compliance credential management.
- `OraclePaywall` — x402-gated query interface. Any protocol pays CSPR to query a credit profile.
- `ReputationRegistry` — long-term behavioral reputation score independent of credit.

---

## Tech stack

| Layer               | Technology                            |
| ------------------- | ------------------------------------- |
| Smart contracts     | Odra Framework (Rust), Casper Testnet |
| Agent orchestration | Python 3.11 + LangGraph               |
| Credit scoring      | XGBoost + SHAP                        |
| Blockchain data     | CSPR.cloud REST API                   |
| Chain interaction   | casper-py-sdk                         |
| x402 payments       | Casper x402 Facilitator               |
| Off-chain state     | Supabase (PostgreSQL)                 |
| Backend API         | FastAPI                               |
| Frontend            | Next.js 15 App Router                 |
| Charts              | Recharts                              |

---

## Prerequisites

- Rust (stable) with `wasm32-unknown-unknown` target
- cargo-odra
- Python 3.11+
- Node.js 18+
- A Casper Testnet wallet with CSPR from the faucet at https://testnet.cspr.live/tools/faucet
- CSPR.cloud API key (free tier at https://cspr.cloud)
- Supabase

---

## Getting started

---

## Running the agent pipeline manually

---

## Seeding test data

---

## Key design decisions

**Why Supabase instead of IPFS for attestation storage** — IPFS adds setup complexity and pinning dependencies that are not necessary for a working prototype. Attestation payloads are stored in Supabase and the record URL is posted as the `attestation_hash` field on-chain. The contract stores it as a string and does not care what it points to. IPFS can be swapped in post-hackathon for full decentralization.

**Why synthetic XGBoost training data** — Testnet wallets have limited real transaction history. The scoring model is trained on synthetic wallet profiles generated with realistic distributions. The model architecture is identical to what would run on mainnet data; only the training set differs.

**Why REST polling instead of CSPR.cloud streaming in the Monitoring Agent** — the streaming API requires a persistent connection that complicates deployment. A 60-second polling loop against the REST API produces the same behavioral outcome for the purposes of the demo and is far simpler to operate.

**Why separate agent keypairs** — each agent has a distinct Ed25519 keypair with scoped contract permissions enforced at the contract level. The Attestation Agent can call `issue_*` and `update_*` but not `revoke_*`. The Monitoring Agent can call `revoke_*` but not `issue_*`. This limits the blast radius of any single key compromise.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch naming, pull request expectations, priority guidelines, and development setup details.

---
