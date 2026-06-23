# Integration Changelog

Date: 2026-06-23
Branch: integration

## Summary

Completed practical remaining TODO items for API validation, cron authentication, x402 replay protection, Casper getter caching, balance lookup, cached frontend assessment hydration, and the lending demo page. Production-only items that require hosting, credentials, real payment testing, contract upgrades, or protocol signing decisions remain marked manual / blocked.

## Files Changed

- `.env.example`
- `api/.env.example`
- `api/validation.py`
- `api/routers/assess.py`
- `api/routers/cron.py`
- `api/routers/oracle.py`
- `api/casper/x402.py`
- `api/casper/deploy_submitter.py`
- `api/casper/client.py`
- `api/db/supabase.py`
- `api/db/migrations/003_x402_nonces_and_getter_cache.sql`
- `api/docs/TODO`
- `api/docs/AGENT_PIPELINE`
- `api/docs/WORKFLOW`
- `web/.env.example`
- `web/lib/api-client.ts`
- `web/lib/python-gateway.ts`
- `web/lib/use-assessment.tsx`
- `web/app/dashboard/page.tsx`
- `web/app/lending-demo/page.tsx`
- `web/components/dashboard-sidebar.tsx`
- `web/components/navbar.tsx`

## Features Completed

- Added `/assess` request validation for required non-empty Casper wallet identifiers.
- Added lightweight in-memory rate limiting per IP and wallet for `/assess`.
- Added `CRON_SECRET` authentication for `POST /cron/monitor`.
- Persisted consumed x402 nonces in Supabase through `x402_used_nonces`.
- Added Supabase TTL cache for expensive Casper getter deploy reads.
- Replaced `CasperClient.get_cspr_balance()` placeholder with a structured `casper-client query-balance` implementation.
- Added cached frontend assessment hydration from `/oracle/history`.
- Added `/lending-demo` to explain protocol-paid x402 underwriting.

## Security Updates

- `/assess` now rejects missing, empty, overlong, or malformed wallet addresses with safe 422 responses.
- `/assess` unexpected pipeline failures now return a generic 500 response while logging server-side.
- `/cron/monitor` now requires `X-Cron-Secret` or `Authorization: Bearer <secret>`.
- Next.js proxy injects `CRON_SECRET` server-side for `/api/cron/monitor`, avoiding browser exposure.
- x402 nonce replay protection is durable across restarts once migration 003 is applied.
- x402 proof fields are validated before verification.

## API Changes

- `POST /assess` may now return 422 for invalid wallet input or 429 for rate limiting.
- `POST /cron/monitor` now returns 401 without the correct secret or 503 if `CRON_SECRET` is not configured.
- `GET /oracle/query` now returns a proper JSON 402 when payment proof is missing.
- `GET /oracle/history` now includes cached assessment details in each history row while preserving existing compact fields.

## Frontend Changes

- Dashboard wallet connect now checks `/oracle/history` first.
- If cached history exists, `AssessmentContext` is populated immediately with source `cache`.
- If no cached history exists, dashboard runs `/assess` automatically.
- Manual `Re-assess` still runs the full assessment pipeline.
- Added `/lending-demo` and linked it in the sidebar/top nav.

## Database / Migration Changes

Added `api/db/migrations/003_x402_nonces_and_getter_cache.sql`.

Manual Supabase SQL step required:

```sql
create table if not exists x402_used_nonces (...);
create table if not exists casper_getter_cache (...);
```

Run the full migration file in Supabase SQL editor before relying on x402 nonce persistence or getter caching.

## Environment Variables Added Or Required

- `CRON_SECRET`: required for `POST /cron/monitor` on the API and the Next.js proxy.
- `CASPER_GETTER_CACHE_TTL_SECONDS`: optional, defaults to `300`.

## Manual Steps Still Required

- Deploy API to a public host and update CORS / `PYTHON_API_BASE_URL`.
- Apply Supabase migration 003.
- Keep `X402_MODE=mock` until a real payment test passes.
- Complete x402 cryptographic signature validation after agreeing on canonical signing payload and signature encoding.
- Do not perform mainnet deployments, contract hash changes, or contract upgrades without explicit approval.

## Tests / Checks Run

- `npm.cmd run build` in `web/`: passed. Build includes `/lending-demo`.
- `npm.cmd run lint` in `web/`: failed due to pre-existing lint errors in:
  - `web/app/agents/page.tsx`
  - `web/app/history/page.tsx`
  - `web/app/oracle-demo/page.tsx`
- `python -m compileall api`: could not run. `python.exe` failed with `A specified logon session does not exist`.
- `py -3 -m compileall api`: could not run for the same logon-session failure.
- `python3 -m compileall api`: could not run for the same logon-session failure.
- Backend live/e2e tests were not run because the Python launcher is unavailable in this session and live credentials/network services are required.

## Known Limitations

- x402 signature validation is still not cryptographic.
- x402 nonce persistence and getter cache require migration 003 to be applied.
- Getter cache is cache-aside only; it does not invalidate on contract writes.
- `get_cspr_balance()` depends on a local `casper-client` binary and supported `query-balance` purse identifiers.
- `/assess` pipeline execution is still synchronous.

## What Other Developers Need To Know

- Do not commit `.env`, `.env.local`, PEM files, key folders, or local secrets.
- `CRON_SECRET` must match between API and Next.js runtime environments.
- Use `Re-assess` to force a new pipeline run when cached dashboard data is shown.
- Migration 003 is required before production-like x402 replay protection.

## Test Wallet Placeholder Cleanup

- Removed the invalid `0xtest123abc` placeholder from API test scripts.
- API test/demo scripts now load `CASPER_PUBLIC_KEY` first, then fall back to `CASPER_ACCOUNT_HASH`.
- If neither wallet env var is configured, scripts raise a clear setup error instead of using an invalid hardcoded wallet.
- No secrets, private keys, PEM contents, API keys, or real wallet values were committed.

## Demo Reliability Updates

### Summary

- Added configurable fast LLM fallback behavior for local demos.
- Added `/assess` response metadata for source, LLM status, fallback use, deploy mode, and CSPR.cloud mode.
- Added safe `GET /config/status` runtime flags for frontend diagnostics.
- Improved `POST /cron/monitor` with `limit`, `dry_run`, wallet validation skips, and summary counts.
- Improved dashboard and lending demo states for cached results, fallback scoring, mock deploys, rate limits, invalid wallets, API downtime, and empty loan offers.

### Files Changed

- `.env.example`
- `api/.env.example`
- `api/agents/utils/llm_utils.py`
- `api/agents/attestation_agent.py`
- `api/agents/fraud_agent.py`
- `api/agents/lending_agent.py`
- `api/agents/monitoring_agent.py`
- `api/agents/risk_agent.py`
- `api/main.py`
- `api/routers/assess.py`
- `api/routers/cron.py`
- `api/docs/INTEGRATION_CHANGELOG.md`
- `web/app/api/config/status/route.ts`
- `web/app/agents/page.tsx`
- `web/app/dashboard/page.tsx`
- `web/app/globals.css`
- `web/app/history/page.tsx`
- `web/app/lending-demo/page.tsx`
- `web/app/oracle-demo/page.tsx`
- `web/lib/api-client.ts`
- `web/lib/use-assessment.tsx`

### Security Updates

- LLM retry logs now avoid printing exception payloads or API key values.
- `GET /config/status` returns only safe booleans and runtime mode names, not secrets or configured secret values.
- Cron monitor now validates stored wallet addresses before running the pipeline or touching CSPR.cloud-dependent code.
- No `.env`, PEM, private key, API key, or local secret values were committed.

### API Changes

- `POST /assess` now includes `source`, `llm_status`, `fallback_used`, and `cspr_cloud_mode`.
- `GET /config/status` returns `deploy_mode`, `cspr_cloud_mode`, `x402_mode`, `cron_secret_configured`, and `contracts_configured`.
- `POST /cron/monitor` accepts `limit` and `dry_run` through query params or JSON body.
- `POST /cron/monitor` response now includes `scanned`, `processed`, `skipped`, `failed`, and `limit` while preserving existing count fields.

### Frontend Changes

- Dashboard maps invalid wallet 422, assessment 429, and backend 503 failures to explicit demo-safe copy.
- Dashboard shows cached history, fallback scoring, mock deploy, empty loan offer, and safe system status states.
- Lending demo now distinguishes no-wallet, loading, cached, fresh/demo, no-offers, fallback, and mock deploy states.
- Added frontend proxy route for `/api/config/status`.

### Database / Migration Changes

- No new migration was added in this update.

### Environment Variables Added Or Required

- `LLM_FAST_FALLBACK`: optional, default `false`; set `true` locally for immediate fallback after any LLM failure.
- `LLM_MAX_RETRIES`: optional, default `2`; recommended local demo override is `0`.
- `LLM_RETRY_DELAY_SECONDS`: optional, default `1`; recommended local demo override is `0`.

Recommended local demo overrides:

```env
LLM_FAST_FALLBACK=true
LLM_MAX_RETRIES=0
LLM_RETRY_DELAY_SECONDS=0
```

### Manual Steps Still Required

- Configure real Groq keys for LLM-backed explanations, or use the fast fallback env values above for demos.
- Keep `AURUM_DEPLOY_MODE=mock` unless a live Casper deploy is explicitly intended and approved.
- Keep `X402_MODE=mock` until real payment proof verification is completed and tested.

### Tests / Checks Run

- `npm.cmd run lint` in `web/`: passed.
- `npm.cmd run build` in `web/`: passed. Build includes `/api/config/status` and `/lending-demo`.
- `curl.exe --max-time 5 http://127.0.0.1:8000/health`: passed against the locally running API.
- `curl.exe --max-time 5 http://127.0.0.1:8000/config/status`: passed and returned safe runtime flags only.
- `POST /assess` with `wallet_address=0xtest123abc`: returned HTTP 422 as expected.
- `POST /cron/monitor?dry_run=true` without cron auth: returned HTTP 401 as expected.
- `python --version`, `py -3 --version`, and `python3 --version`: could not run because each launcher failed with `A specified logon session does not exist`.
- `api/.venv/bin/python -m compileall`, `api/.venv/bin/python test_scripts/test_agents.py`, and `api/.venv/bin/python test_scripts/test_pipeline.py`: could not run because Windows reported `Access is denied` for the Unix-style venv executable.
- Secret checks: `.env`, `api/.env`, `web/.env.local`, and `keys/` files are ignored and unchanged. No PEM/private key content was printed.

### Known Limitations

- Fast fallback makes demos responsive but uses rule-based text/recommendations when LLM calls are unavailable.
- `GET /config/status` reports safe runtime flags only; it does not prove every downstream provider credential is valid.

### What Other Developers Need To Know

- The new frontend status card is diagnostic only and must not be expanded to expose configured secret values.
- `fallback_used=true` means at least one LLM-backed agent used rule-based fallback in the current assessment.
