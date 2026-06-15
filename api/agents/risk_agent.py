"""
Risk Agent: Default Probability Classification.

Classifies borrower default risk over 30/60/90 day horizons and assigns
risk tier (A/B/C/D). Detects early warning patterns.
"""

import numpy as np
from pipeline.state import PipelineState
from scoring.model import get_model


def risk_agent(state: PipelineState) -> PipelineState:
    """
    Classify default probability and assign risk tier.

    Uses the XGBoost model to compute default probabilities across time horizons,
    assigns risk tier based on credit score, and identifies early warning flags.

    Args:
        state: Pipeline state from credit_agent

    Returns:
        Updated state with:
          - risk_tier: Risk classification (A/B/C/D)
          - default_prob_30d: 30-day default probability (0-1)
          - default_prob_60d: 60-day default probability (0-1)
          - default_prob_90d: 90-day default probability (0-1)
          - early_warning_flags: List of risk indicators
    """
    credit_score = state["credit_score"]
    sub_scores = state["sub_scores"]
    
    # Get default probability from model
    model = get_model()
    wallet_features = {
        "repayment": sub_scores.get("repayment", 70),
        "wallet_activity": sub_scores.get("wallet_activity", 60),
        "defi": sub_scores.get("defi", 50),
        "dao": sub_scores.get("dao", 40),
        "rwa": sub_scores.get("rwa", 30),
        "income": sub_scores.get("income", 75),
    }
    
    # Base default probability (0-1)
    base_default_prob = model.predict_proba(wallet_features)
    
    # Scale to 30/60/90 day horizons (exponential growth)
    default_prob_30d = base_default_prob
    default_prob_60d = min(base_default_prob * 1.5, 0.99)
    default_prob_90d = min(base_default_prob * 2.0, 0.99)
    
    # Assign risk tier based on credit score
    if credit_score >= 750:
        tier = "A"
    elif credit_score >= 600:
        tier = "B"
    elif credit_score >= 450:
        tier = "C"
    else:
        tier = "D"
    
    # Early warning flags (Phase 2: enhance these)
    early_warning_flags = []
    
    # Flag 1: Low repayment score
    if sub_scores.get("repayment", 70) < 50:
        early_warning_flags.append("low_repayment_history")
    
    # Flag 2: High default probability
    if default_prob_30d > 0.15:
        early_warning_flags.append("elevated_default_risk")
    
    # Flag 3: Low income consistency
    if sub_scores.get("income", 75) < 40:
        early_warning_flags.append("inconsistent_income")
    
    # Flag 4: Low wallet activity
    if sub_scores.get("wallet_activity", 60) < 30:
        early_warning_flags.append("dormant_wallet")
    
    return {
        **state,
        "risk_tier": tier,
        "default_prob_30d": round(default_prob_30d, 3),
        "default_prob_60d": round(default_prob_60d, 3),
        "default_prob_90d": round(default_prob_90d, 3),
        "early_warning_flags": early_warning_flags,
    }
