"""
Cron Router: Scheduled Credential Monitoring.

POST /cron/monitor – re-scores all active credentials and revokes on-chain
when the monitoring agent returns action="revoke".

In live mode (AURUM_DEPLOY_MODE=live) revocation submits a real put-deploy to
CreditRegistry.revoke_credit_score via DeploySubmitter.  In mock mode the
Supabase flag is still updated but no chain call is made.

Wallets are processed sequentially to avoid overwhelming CSPR.cloud rate limits.
"""

import logging
import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from db.supabase import get_client
from pipeline.graph import pipeline
from casper.deploy_submitter import load_submitter_from_env
from validation import normalize_wallet_address

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cron", tags=["cron"])

_DEPLOY_MODE = os.getenv("AURUM_DEPLOY_MODE", "mock")


def _get_submitter():
    """Return a DeploySubmitter in live mode, None in mock mode."""
    if _DEPLOY_MODE == "live":
        try:
            return load_submitter_from_env()
        except Exception as exc:
            logger.error("Failed to load DeploySubmitter: %s", exc)
    return None


def _get_credit_registry_hash() -> str:
    """Return the callable CreditRegistry contract hash from env."""
    return (
        os.getenv("CREDIT_REGISTRY_CONTRACT_HASH")
        or os.getenv("CREDIT_REGISTRY_HASH", "")
    )


def _get_deployer_account() -> str:
    """Return the deployer account hash (caller arg for contracts)."""
    return os.getenv("CASPER_ACCOUNT_HASH", "")


@router.post("/monitor")
async def monitor_credentials(
    request: Request,
    limit: int | None = Query(default=None, ge=1, le=500),
    dry_run: bool = Query(default=False),
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
    authorization: str | None = Header(default=None),
):
    """
    Re-score all active credentials and revoke those that breach thresholds.

    Returns:
        credentials_checked  – number of wallets processed
        credentials_revoked  – number of wallets revoked
        credentials_errored  – number of wallets that hit errors
        timestamp            – UTC ISO-8601 completion time
    """
    expected_secret = os.getenv("CRON_SECRET")
    if not expected_secret:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "cron_secret_not_configured",
                "message": "CRON_SECRET must be configured before cron monitoring can run.",
            },
        )

    bearer_secret = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer_secret = authorization[7:].strip()

    supplied_secret = x_cron_secret or bearer_secret
    if supplied_secret != expected_secret:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "unauthorized",
                "message": "Invalid or missing cron secret.",
            },
        )

    if request.headers.get("content-type", "").startswith("application/json"):
        try:
            body = await request.json()
        except Exception:
            body = {}

        if isinstance(body, dict):
            if body.get("limit") is not None and limit is None:
                try:
                    limit = max(1, min(int(body["limit"]), 500))
                except (TypeError, ValueError):
                    raise HTTPException(
                        status_code=422,
                        detail={
                            "error": "invalid_limit",
                            "message": "limit must be an integer between 1 and 500.",
                        },
                    )
            if body.get("dry_run") is not None:
                dry_run = str(body["dry_run"]).lower() in ("1", "true", "yes")

    checked = 0
    revoked = 0
    errored = 0
    skipped = 0

    # 1. Fetch all active credentials from Supabase
    try:
        db = get_client()
        response = (
            db.table("assessments")
            .select("wallet_address, id")
            .eq("credential_active", True)
            .execute()
        )
        active_records = response.data or []
    except Exception as exc:
        logger.error("Supabase query failed in monitor_credentials: %s", exc)
        return JSONResponse(
            status_code=503,
            content={
                "error": str(exc),
                "detail": "Failed to fetch active credentials from Supabase",
            },
        )

    logger.info("monitor_credentials: found %d active credentials", len(active_records))

    scanned = len(active_records)
    valid_records = []
    for record in active_records:
        try:
            wallet_address = normalize_wallet_address(record.get("wallet_address"))
        except HTTPException:
            skipped += 1
            continue

        valid_records.append({**record, "wallet_address": wallet_address})
        if limit is not None and len(valid_records) >= limit:
            break

    if dry_run:
        timestamp = datetime.now(timezone.utc).isoformat()
        return {
            "status": "dry_run",
            "scanned": scanned,
            "processed": 0,
            "skipped": skipped,
            "failed": 0,
            "limit": limit,
            "deploy_mode": _DEPLOY_MODE,
            "timestamp": timestamp,
        }

    # Load submitter once — reused for all revocations
    submitter = _get_submitter()
    credit_registry_hash = _get_credit_registry_hash()
    deployer_account = _get_deployer_account()

    # 2. Re-score each wallet sequentially
    for record in valid_records:
        wallet_address = record.get("wallet_address")
        checked += 1
        try:
            result = pipeline.invoke({"wallet_address": wallet_address})
            monitoring_action = result.get("monitoring_action", "maintain")

            if monitoring_action != "revoke":
                continue

            revoked_at = int(time.time())

            # 3. Revoke on-chain (live mode)
            if submitter and credit_registry_hash:
                try:
                    chain_result = submitter.submit_contract_call(
                        contract_hash=credit_registry_hash,
                        entrypoint="revoke_credit_score",
                        args={
                            "caller": deployer_account,
                            "borrower": wallet_address,
                            "revoked_at": revoked_at,
                        },
                    )
                    if chain_result.get("success"):
                        logger.info(
                            "On-chain revocation submitted for %s: deploy_hash=%s",
                            wallet_address,
                            chain_result.get("deploy_hash"),
                        )
                    else:
                        logger.error(
                            "On-chain revocation failed for %s: %s",
                            wallet_address,
                            chain_result.get("error"),
                        )
                        errored += 1
                        continue
                except Exception as chain_exc:
                    logger.error(
                        "On-chain revocation exception for %s: %s",
                        wallet_address,
                        chain_exc,
                    )
                    errored += 1
                    continue
            else:
                # Mock mode — log but don't block Supabase update
                logger.info(
                    "mock mode: skipping on-chain revocation for %s", wallet_address
                )

            # 4. Update Supabase
            try:
                db.table("assessments").update(
                    {"credential_active": False}
                ).eq("wallet_address", wallet_address).execute()
                revoked += 1
                logger.info("Credential revoked in Supabase for wallet %s", wallet_address)
            except Exception as db_exc:
                logger.error(
                    "Supabase update failed after revocation for %s: %s",
                    wallet_address,
                    db_exc,
                )
                errored += 1

        except Exception as exc:
            logger.error("Pipeline error for wallet %s: %s", wallet_address, exc)
            errored += 1

    timestamp = datetime.now(timezone.utc).isoformat()
    return {
        "status": "ok",
        "credentials_checked": checked,
        "credentials_revoked": revoked,
        "credentials_errored": errored,
        "scanned": scanned,
        "processed": checked,
        "skipped": skipped,
        "failed": errored,
        "limit": limit,
        "deploy_mode": _DEPLOY_MODE,
        "timestamp": timestamp,
    }
