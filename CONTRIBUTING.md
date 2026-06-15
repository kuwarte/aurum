# Contributing

Thank you for your interest in contributing. This document covers how the project is organized, how to get your environment set up for development, and what we expect from pull requests.

---

## Team structure

The project is split across three development tracks. If you are contributing, you should know which track your change belongs to so you can coordinate with the right person.

**Dev 1 — Frontend and Gateway**
Next.js 15, UI components, data visualization, and the thin proxy API routes that forward requests to the Python backend.

**Dev 2 — Contracts and Data Layer**
Rust/Odra smart contracts, casper-py-sdk integration, CSPR.cloud API wrappers, and x402 payment handling.

**Dev 3 — AI Agents and Backend API**
FastAPI application, LangGraph agent pipeline, XGBoost scoring model, SHAP explainability, and Supabase integration.

---

## Development setup

Follow the Getting Started section in the README to get the full stack running locally before making any changes. The most important thing is to have a working `/assess` endpoint returning real data before touching anything else — almost every other piece of the system depends on it.

---

## Branch naming

Use the following format:

```
<track>/<short-description>
```

Examples:

```
dev1/wallet-connect-shell
dev2/credit-registry-deploy
dev3/credit-agent-xgboost
```

If a change touches multiple tracks, use the track where the majority of the work lives and note the cross-track dependency in the pull request description.

---

## Commit messages

Write commit messages in the imperative present tense. Describe what the commit does, not what you did.

Good:

```
Add XGBoost scoring model with synthetic training data
Wire credit agent output to risk agent input
Deploy CreditRegistry to Casper Testnet
```

Not good:

```
Fixed stuff
Updated the model
WIP
```

Keep the subject line under 72 characters. If you need to explain context, add a blank line after the subject and write a short paragraph.

---

## Pull requests

Before opening a pull request:

- Your branch must be up to date with `main`
- The full stack must start without errors locally
- If you changed a contract, include the new testnet deploy hash in the PR description
- If you changed an agent, include a sample `/assess` response showing the agent's output in the PR description
- If you changed the frontend, include a screenshot

Keep pull requests small and focused on one thing. A PR that adds the Credit Agent and also refactors the Supabase schema and also fixes a CSS bug is hard to review and hard to revert if something breaks.

If your change is large, open a draft pull request early so others can see the direction before you finish.

---

## What is in scope right now

We are building toward the June 30 submission deadline. The priorities are:

**P0 — must ship**

- CreditRegistry, ComplianceRegistry, OraclePaywall deployed on Casper Testnet
- Credit Agent and Risk Agent producing real scores
- Attestation Agent minting credentials on-chain with visible tx hashes
- Monitoring Agent demonstrating revocation on a test address
- FastAPI `/assess` route running end-to-end
- Frontend wallet connect and score dashboard

**P1 — high value, build after P0 is stable**

- Fraud Agent with basic account age and circular transaction checks
- SHAP breakdown chart in the frontend
- Loan offers page with tier-matched mock pool data
- x402 query log table

**P2 and P3 — defer unless P0 and P1 are complete**

- Score history chart
- RWA portfolio page
- Lending Agent with real protocol integration
- Bulk query endpoint
- Responsive mobile layout

Do not open pull requests for P2 or P3 work while any P0 item is unfinished. The deadline is fixed and integration is the hardest part.

---

## Workarounds that are intentional

Several simplifications are in place for the hackathon build. Do not open pull requests to replace these with production implementations unless a P0 item is at risk:

- Attestation payloads are stored in Supabase, not IPFS. The contract stores the Supabase record URL as the `attestation_hash` string.
- The Monitoring Agent polls the CSPR.cloud REST API every 60 seconds instead of using the streaming endpoint.
- The XGBoost model is trained on synthetic wallet data generated with numpy.
- The Fraud Agent returns a zero fraud score for all wallets unless an account age check or circular transaction flag fires.
- The Lending Agent returns hardcoded mock pool offers matched by tier.
- Cron jobs are triggered by Vercel's built-in cron via `vercel.json`, not Temporal.io.

These are documented in the README under Key Design Decisions.

---

## Smart contract changes

Contract changes carry the most risk because deployment to testnet is irreversible and takes time. Follow this process:

1. Make and test your change locally using `cargo odra test`
2. Get a review from Dev 2 before deploying to testnet
3. Deploy to testnet and confirm the transaction hash appears in the Casper Testnet explorer at https://testnet.cspr.live
4. Update the contract hash in `api/.env` and note the new hash in your pull request
5. Run a full end-to-end test against the new contract before merging

Do not merge a contract change without a confirmed testnet transaction hash.

---

## Agent changes

Each agent is a single function that takes and returns a `PipelineState` dict. When changing an agent:

- Do not add side effects that are not documented in the agent's docstring
- Do not read or write state keys that belong to another agent
- Include a unit test that mocks the agent's inputs and asserts its outputs
- Run `python -m pytest api/tests/` before opening a pull request

The pipeline runs agents in a fixed sequence: Credit, Risk, Fraud, Attestation, Monitoring, Lending. If your change affects the order or adds a new node to the graph, discuss it with Dev 3 first.

---

## Environment variables

Never commit secrets. The `.env` and `.env.local` files are in `.gitignore`. If you need to add a new environment variable, add it to `.env.example` and `.env.local.example` with a descriptive placeholder value and document it in the README.
