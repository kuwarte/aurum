from fastapi import APIRouter
from pipeline.graph import pipeline

router = APIRouter()

@router.post("/assess")
async def assess(body: dict):
    wallet = body.get("wallet_address")
    result = pipeline.invoke({"wallet_address": wallet})
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
        # Monitoring
        "active":              result["credential_active"],
        "monitoring_action":   result.get("monitoring_action", "maintain"),
        # Lending
        "loan_offers":         result["loan_offers"],
        "lending_recommendation": result.get("lending_recommendation", ""),
        # Raw wallet data for portfolio/dimensions
        "raw_wallet_data":     result.get("raw_wallet_data", {}),
    }
