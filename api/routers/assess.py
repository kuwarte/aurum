from fastapi import APIRouter
from pipeline.graph import pipeline

router = APIRouter()

@router.post("/assess")
async def assess(body: dict):
    wallet = body.get("wallet_address")
    result = pipeline.invoke({"wallet_address": wallet})
    return {
        "score":        result["credit_score"],
        "tier":         result["risk_tier"],
        "default_prob": result["default_prob_30d"],
        "shap":         result["shap_breakdown"],
        "tx_hash":      result["tx_hash"],
        "loan_offers":  result["loan_offers"],
        "active":       result["credential_active"],
    }
