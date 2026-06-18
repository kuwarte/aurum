"""
Oracle Router: x402-Gated Query Interface.

Requires a valid x402 payment proof in the X-402-Payment-Proof header.
Returns HTTP 402 with payment requirements if missing or invalid.
"""

import json
import logging
from fastapi import APIRouter, Query, HTTPException, Request
from db.supabase import get_assessment
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

    # --- No proof header ---
    if not proof_header:
        return HTTPException(status_code=402, detail=payment_requirement)

    # --- Parse proof ---
    try:
        proof_dict = json.loads(proof_header)
        proof = X402PaymentProof(
            payer_account=proof_dict["payer_account"],
            receiver_account=proof_dict["receiver_account"],
            amount_cspr=str(proof_dict["amount_cspr"]),
            nonce=proof_dict["nonce"],
            deadline_epoch_seconds=int(proof_dict["deadline_epoch_seconds"]),
            network=proof_dict["network"],
            signature=proof_dict["signature"],
            payment_reference=proof_dict.get("payment_reference", ""),
        )
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=402,
            content={"error": "invalid_proof_format", "payment_requirement": payment_requirement},
        )

    # --- Verify proof ---
    try:
        _verifier.verify(proof)
    except X402VerificationError as exc:
        from fastapi.responses import JSONResponse
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
async def query_credit_history(wallet: str = Query(..., description="Wallet address")):
    """Query credit score history for a wallet (no payment gate for history)."""
    assessment = get_assessment(wallet)
    if not assessment:
        return {"wallet_address": wallet, "history": []}
    return {
        "wallet_address": wallet,
        "history": [
            {
                "score": assessment.get("credit_score"),
                "tier": assessment.get("risk_tier"),
                "timestamp": assessment.get("created_at"),
            }
        ],
    }


@router.get("/payment-info")
async def payment_info():
    """Return x402 payment requirements without making a request."""
    return _verifier.build_payment_requirement()
