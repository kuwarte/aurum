import logging
import os
import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request
from pipeline.graph import pipeline
from validation import normalize_wallet_address

router = APIRouter()
logger = logging.getLogger(__name__)

_RATE_LIMIT_WINDOW_SECONDS = 60
_RATE_LIMIT_MAX_REQUESTS = 5
_rate_limit_buckets: dict[str, deque[float]] = defaultdict(deque)


def _client_key(request: Request, wallet_address: str) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded_for.split(",")[0].strip()
    if not client_ip and request.client:
        client_ip = request.client.host
    return f"{client_ip or 'unknown'}:{wallet_address}"


def _enforce_rate_limit(request: Request, wallet_address: str) -> None:
    key = _client_key(request, wallet_address)
    now = time.monotonic()
    bucket = _rate_limit_buckets[key]

    while bucket and now - bucket[0] > _RATE_LIMIT_WINDOW_SECONDS:
        bucket.popleft()

    if len(bucket) >= _RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limited",
                "message": "Too many assessment requests. Please wait and try again.",
            },
        )

    bucket.append(now)

@router.post("/assess")
async def assess(body: dict, request: Request):
    if not isinstance(body, dict):
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_request",
                "message": "Request body must be a JSON object",
            },
        )

    wallet = normalize_wallet_address(body.get("wallet_address"))
    _enforce_rate_limit(request, wallet)

    try:
        result = pipeline.invoke({"wallet_address": wallet})
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Assessment pipeline failed for wallet %s", wallet)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "assessment_failed",
                "message": "Assessment failed. Please retry later.",
            },
        ) from exc

    return {
        # Credit
        "score":               result["credit_score"],
        "sub_scores":          result.get("sub_scores", {}),
        "shap":                result["shap_breakdown"],
        # Risk
        "tier":                result["risk_tier"],
        "default_prob":        result["default_prob_30d"],
        "default_prob_60d":    result.get("default_prob_60d", 0),
        "default_prob_90d":    result.get("default_prob_90d", 0),
        "early_warning_flags": result.get("early_warning_flags", []),
        "risk_analysis":       result.get("risk_analysis", ""),
        # Fraud
        "fraud_score":         result.get("fraud_score", 0),
        "fraud_flags":         result.get("fraud_flags", []),
        "fraud_reasoning":     result.get("fraud_reasoning", ""),
        "fraud_confidence":    result.get("fraud_confidence", 0),
        # Attestation
        "tx_hash":             result["tx_hash"],
        "attestation_hash":    result.get("attestation_hash", ""),
        "attestation_summary": result.get("attestation_summary", ""),
        "borrowing_limit_motes": result.get("borrowing_limit_motes", 0),
        "compliance_level":    result.get("compliance_level", ""),
        "deploy_mode":         result.get("deploy_mode", "mock"),
        "cspr_cloud_mode":     os.getenv("CSPR_CLOUD_MODE", "mock"),
        "source":              "fresh",
        "llm_status":          result.get("llm_status", "success"),
        "fallback_used":       bool(result.get("fallback_used", False)),
        # Monitoring
        "active":              result["credential_active"],
        "monitoring_action":   result.get("monitoring_action", "maintain"),
        # Lending
        "loan_offers":         result["loan_offers"],
        "lending_recommendation": result.get("lending_recommendation", ""),
        # Raw wallet data for portfolio/dimensions
        "raw_wallet_data":     result.get("raw_wallet_data", {}),
    }
