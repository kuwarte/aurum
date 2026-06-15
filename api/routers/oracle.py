"""
Oracle Router: x402-Gated Query Interface.

Provides authenticated access to credit profiles via x402 micropayment protocol.
Any protocol pays CSPR to query wallet credit scores and risk assessments.

Phase 2: Integrate with  2's casper/x402.py for payment verification.
"""

from fastapi import APIRouter, Query, HTTPException
from db.supabase import get_assessment

router = APIRouter(prefix="/oracle", tags=["oracle"])


@router.get("/query")
async def query_credit_profile(wallet: str = Query(..., description="Wallet address to query")):
    """
    Query a wallet's credit profile (x402-gated endpoint).

    Returns the most recent credit assessment for the given wallet.
    Phase 2: Will verify x402 payment proof before returning data.

    Args:
        wallet: Wallet address to query (required)

    Returns:
        Dictionary with:
          - wallet_address: The queried address
          - credit_score: Final score 0-1000
          - risk_tier: Risk classification A/B/C/D
          - default_prob_30d/60d/90d: Default probabilities
          - fraud_flags: List of detected fraud indicators
          - credential_active: Whether credential is still valid
          - created_at: Timestamp of assessment

    Raises:
        HTTPException 404: No assessment found for wallet
    """
    
    # TODO: Verify x402 payment signature (Dev 2 integrates)
    # from casper.x402 import verify_payment
    # payment_verified = verify_payment(wallet, request.headers.get("X-402-Payment-Proof"))
    # if not payment_verified:
    #     raise HTTPException(status_code=402, detail="Payment Required")
    
    # Query Supabase for most recent assessment
    assessment = get_assessment(wallet)
    
    if not assessment:
        raise HTTPException(
            status_code=404,
            detail=f"No assessment found for wallet {wallet}. Call POST /assess first."
        )
    
    return {
        "wallet_address": assessment.get("wallet_address"),
        "credit_score": assessment.get("credit_score"),
        "risk_tier": assessment.get("risk_tier"),
        "default_prob_30d": assessment.get("default_prob_30d"),
        "default_prob_60d": assessment.get("default_prob_60d"),
        "default_prob_90d": assessment.get("default_prob_90d"),
        "fraud_flags": assessment.get("fraud_flags", []),
        "credential_active": assessment.get("credential_active", True),
        "created_at": assessment.get("created_at"),
    }


@router.get("/history")
async def query_credit_history(wallet: str = Query(..., description="Wallet address")):
    """
    Query credit score history for a wallet.

    Returns recent assessment records. Phase 2: Will support time-range queries
    and paging for full historical lookups.

    Args:
        wallet: Wallet address to query

    Returns:
        Dictionary with wallet address and list of recent assessments
    """
    
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
