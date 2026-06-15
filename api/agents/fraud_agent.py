"""
Fraud Agent: Fraud Detection and Risk Flagging.

Detects wash trading, circular transactions, and sybil clusters.
Phase 2: Will integrate graph analysis on CSPR.cloud transaction data.
Currently uses heuristic-based detection (wallet age, frequency, diversity).
"""

from pipeline.state import PipelineState


def fraud_agent(state: PipelineState) -> PipelineState:
    """
    Detect fraud patterns and flag suspicious activity.

    Implements heuristic-based fraud detection:
      - Fresh wallet sybil risk
      - High transaction frequency (wash trading indicator)
      - Low counterparty diversity (circular pattern indicator)

    Args:
        state: Pipeline state from risk_agent

    Returns:
        Updated state with:
          - fraud_score: Aggregated fraud risk (0-1)
          - fraud_flags: List of specific fraud indicators detected
    """
    raw_wallet_data = state["raw_wallet_data"]
    
    fraud_score = 0.0
    fraud_flags = []
    
    # Mock wallet age (in days) — in v2, fetch from CSPR.cloud
    wallet_age_days = raw_wallet_data.get("wallet_age_days", 180)
    
    # Flag 1: Very new wallet (sybil risk)
    if wallet_age_days < 7:
        fraud_flags.append("fresh_wallet_sybil_risk")
        fraud_score += 0.2
    
    # Flag 2: Sudden activity spike (wash trading indicator)
    # This would be enhanced with actual tx graph analysis
    daily_avg_tx = raw_wallet_data.get("tx_count", 150) / max(wallet_age_days, 1)
    if daily_avg_tx > 5:  # Arbitrary threshold
        fraud_flags.append("high_transaction_frequency")
        fraud_score += 0.1
    
    # Flag 3: Low counterparty diversity (circular pattern indicator)
    counterparty_diversity = raw_wallet_data.get("counterparty_diversity", 23)
    if counterparty_diversity < 3:
        fraud_flags.append("low_counterparty_diversity")
        fraud_score += 0.15
    
    # Clamp fraud score to 0-1
    fraud_score = min(fraud_score, 1.0)
    
    return {
        **state,
        "fraud_score": fraud_score,
        "fraud_flags": fraud_flags,
    }
