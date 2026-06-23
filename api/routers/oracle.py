"""
Oracle Router: x402-Gated Query Interface.

Requires a valid x402 payment proof in the X-402-Payment-Proof header.
Returns HTTP 402 with payment requirements if missing or invalid.
"""

import json
import logging
from fastapi import APIRouter, Query, HTTPException, Request
from fastapi.responses import JSONResponse
from db.supabase import get_assessment, get_assessment_history
from validation import normalize_wallet_address
from casper.x402 import (
    X402Verifier,
    X402PaymentProof,
    X402VerificationError,
    load_x402_verifier_from_env,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/oracle", tags=["oracle"])

# Singleton verifier — loaded once at import time
try:
    _verifier: X402Verifier = load_x402_verifier_from_env()
    logger.info("x402 verifier loaded (mode=%s)", _verifier.config.mode.value)
except Exception as exc:
    logger.error("Failed to load x402 verifier: %s", exc)
    raise SystemExit(1) from exc


@router.get("/query")
async def query_credit_profile(
    request: Request,
    wallet: str = Query(..., description="Wallet address to query"),
):
    """
    Query a wallet's credit profile (x402-gated).

    Requires X-402-Payment-Proof header with a JSON payment proof.
    Returns HTTP 402 with payment requirements if missing or invalid.
    """
    payment_requirement = _verifier.build_payment_requirement()
    proof_header = request.headers.get("X-402-Payment-Proof")

    wallet = normalize_wallet_address(wallet)

    # --- No proof header ---
    if not proof_header:
        return JSONResponse(
            status_code=402,
            content={"error": "payment_required", "payment_requirement": payment_requirement},
        )

    # --- Parse proof ---
    try:
        proof_dict = json.loads(proof_header)
        proof = X402PaymentProof.from_dict(proof_dict)
    except (json.JSONDecodeError, TypeError, X402VerificationError) as exc:
        return JSONResponse(
            status_code=402,
            content={
                "error": "invalid_proof_format",
                "detail": str(exc),
                "payment_requirement": payment_requirement,
            },
        )

    # --- Verify proof ---
    try:
        _verifier.verify(proof)
    except X402VerificationError as exc:
        return JSONResponse(
            status_code=402,
            content={"error": str(exc), "payment_requirement": payment_requirement},
        )

    # --- Query Supabase ---
    assessment = get_assessment(wallet)
    if not assessment:
        raise HTTPException(
            status_code=404,
            detail=f"No assessment found for wallet {wallet}. Call POST /assess first.",
        )

    return {
        "wallet_address": assessment.get("wallet_address"),
        "score": assessment.get("credit_score"),
        "tier": assessment.get("risk_tier"),
        "shap_values": assessment.get("shap_breakdown", {}),
        "loan_offers": assessment.get("loan_offers", []),
        "assessed_at": assessment.get("created_at"),
    }


@router.get("/history")
async def query_credit_history(
    wallet: str = Query(..., description="Wallet address"),
    limit: int = Query(20, description="Max history entries to return"),
):
    """Query full credit score history for a wallet (no payment gate)."""
    wallet = normalize_wallet_address(wallet)
    history = get_assessment_history(wallet, limit=limit)
    return {
        "wallet_address": wallet,
        "history": [
            {
                "score": row.get("credit_score"),
                "tier": row.get("risk_tier"),
                "timestamp": row.get("created_at"),
                "tx_hash": row.get("tx_hash", ""),
                "fraud_score": row.get("fraud_score", 0),
                "sub_scores": row.get("sub_scores", {}),
                "shap": row.get("shap_breakdown", {}),
                "default_prob": row.get("default_prob_30d", 0),
                "fraud_flags": row.get("fraud_flags", []),
                "attestation_hash": row.get("attestation_hash", ""),
                "loan_offers": row.get("loan_offers", []),
                "active": row.get("credential_active", True),
            }
            for row in history
        ],
    }


@router.get("/payment-info")
async def payment_info():
    """Return x402 payment requirements without making a request."""
    return _verifier.build_payment_requirement()
