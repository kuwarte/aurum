"""
FRAUD AGENT: FRAUD DETECTION

Uses LLM reasoning to detect wash trading, circular transactions, and sybil clusters.
Analyzes transaction patterns and provides detailed fraud assessments.
"""

from pipeline.state import PipelineState
from agents.utils.llm_utils import AgentLLM, Prompts


def fraud_agent(state: PipelineState) -> PipelineState:
    """
    AI-powered fraud detection using LLM reasoning.
    Returns fraud_score (0-1), fraud_flags, reasoning, and confidence.
    """
    raw_wallet_data = state["raw_wallet_data"]
    wallet_age_days = raw_wallet_data.get("wallet_age_days", 180)
    
    llm = AgentLLM.get_llm("GROQ_API_KEY")
    prompt = Prompts.fraud_detection(
        state['wallet_address'],
        raw_wallet_data,
        state.get('credit_score', 0)
    )
    
    result = AgentLLM.invoke_llm(llm, prompt)
    
    if result:
        return {
            **state,
            **AgentLLM.status_fields(state, fallback_used=False),
            "fraud_score": result.get("fraud_score", 0.0),
            "fraud_flags": result.get("fraud_flags", []),
            "fraud_reasoning": result.get("reasoning", ""),
            "fraud_confidence": result.get("confidence", 0.0),
        }
    
    print("Using fallback fraud detection rules.")
    # Use actual volume summary data if available
    volume_summary = raw_wallet_data.get("volume_summary", {})
    actual_diversity = volume_summary.get("counterparty_diversity",
                       raw_wallet_data.get("counterparty_diversity", 5))
    tx_count = volume_summary.get("transaction_count",
               raw_wallet_data.get("tx_count", 10))
    daily_avg_tx = tx_count / max(wallet_age_days, 1)

    fraud_score = 0.0
    fraud_flags = []

    if wallet_age_days < 7:
        fraud_flags.append("fresh_wallet_sybil_risk")
        fraud_score += 0.2

    # Only flag high frequency if genuinely suspicious (>20 tx/day)
    if daily_avg_tx > 20:
        fraud_flags.append("high_transaction_frequency")
        fraud_score += 0.1

    # Only flag low diversity if wallet has been active for a while
    # A new wallet naturally has few counterparties — not suspicious
    if actual_diversity < 3 and tx_count > 10:
        fraud_flags.append("low_counterparty_diversity")
        fraud_score += 0.15
    
    return {
        **state,
        **AgentLLM.status_fields(state, fallback_used=True),
        "fraud_score": min(fraud_score, 1.0),
        "fraud_flags": fraud_flags,
        "fraud_reasoning": "Fallback rule-based analysis",
        "fraud_confidence": 0.7,
    }
