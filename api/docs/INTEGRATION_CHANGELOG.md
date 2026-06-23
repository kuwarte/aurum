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
