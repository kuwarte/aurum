"""
Credit Agent: Wallet Scoring.

Pulls wallet data and runs XGBoost-based credit scoring to produce a 0-1000
composite score with SHAP-based feature breakdown.

Phase 2 Integration:
  - Integrate with cspr_cloud/wallet.py for real CSPR.cloud data
  - Currently uses mock wallet data with realistic distributions
"""

from pipeline.state import PipelineState
from scoring.model import get_model
from scoring.shap_explain import explain_score


def credit_agent(state: PipelineState) -> PipelineState:
    """
    Score a wallet using XGBoost and return credit dimensions breakdown.

    Args:
        state: Pipeline state containing wallet_address

    Returns:
        Updated state with:
          - raw_wallet_data: Wallet metrics dictionary
          - credit_score: Final score 0-1000
          - sub_scores: Individual dimension scores (repayment, activity, defi, dao, rwa, income)
          - shap_breakdown: Feature importance breakdown
    """
    wallet_address = state["wallet_address"]
    
    # TODO: Replace with CSPR.cloud API call once has cspr_cloud/wallet.py ready
    # from cspr_cloud.wallet import get_wallet_history
    # wallet_history = get_wallet_history(wallet_address)
    
    # Mock wallet data (realistic distributions for hackathon)
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
    
    # Score dimensions (0-100 each)
    wallet_features = {
        "repayment": 85,        # Strong repayment history
        "wallet_activity": 78,  # Active wallet
        "defi": 65,             # Some DeFi engagement
        "dao": 55,              # Moderate governance
        "rwa": 45,              # Some RWA holdings
        "income": 80,           # Consistent income
    }
    
    # Run XGBoost model
    model = get_model()
    credit_score, sub_scores = model.predict(wallet_features)
    
    # Get SHAP breakdown
    shap_breakdown = explain_score(wallet_features)
    
    return {
        **state,
        "raw_wallet_data": raw_wallet_data,
        "credit_score": credit_score,
        "sub_scores": sub_scores,
        "shap_breakdown": shap_breakdown,
    }
