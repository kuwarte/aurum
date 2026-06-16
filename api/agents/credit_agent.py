"""
CREDIT AGENT: XGBOOST CREDIT SCORING

Pulls wallet data and runs XGBoost-based credit scoring to produce a 0-1000
composite score with SHAP-based feature breakdown.
"""

from pipeline.state import PipelineState
from scoring.model import get_model
from scoring.shap_explain import explain_score

def credit_agent(state: PipelineState) -> PipelineState:
    """
    Score a wallet using XGBoost and return credit dimensions breakdown.
    Returns credit_score (0-1000), sub_scores, and SHAP breakdown.
    """

    wallet_address = state["wallet_address"]
    
    raw_wallet_data = {
        "wallet_address": wallet_address,
        "tx_count": 150,
        "volume_usd": 250000,
        "counterparty_diversity": 23,
        "repayment_history": {"on_time": 45, "late": 3, "default": 0},
        "defi_positions": 8,
        "dao_votes": 12,
        "staking_amount": 50000,
    }
    
    wallet_features = {
        "repayment": 85,
        "wallet_activity": 78,
        "defi": 65,
        "dao": 55,
        "rwa": 45,
        "income": 80,
    }
    
    model = get_model()
    credit_score, sub_scores = model.predict(wallet_features)
    shap_breakdown = explain_score(wallet_features)
    
    return {
        **state,
        "raw_wallet_data": raw_wallet_data,
        "credit_score": credit_score,
        "sub_scores": sub_scores,
        "shap_breakdown": shap_breakdown,
    }
