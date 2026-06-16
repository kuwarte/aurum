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
            "fraud_score": result.get("fraud_score", 0.0),
            "fraud_flags": result.get("fraud_flags", []),
            "fraud_reasoning": result.get("reasoning", ""),
            "fraud_confidence": result.get("confidence", 0.0),
        }
    
    print("Using fallback fraud detection rules.")
    daily_avg_tx = raw_wallet_data.get("tx_count", 150) / max(wallet_age_days, 1)
    fraud_score = 0.0
    fraud_flags = []
    
    if wallet_age_days < 7:
        fraud_flags.append("fresh_wallet_sybil_risk")
        fraud_score += 0.2
    
    if daily_avg_tx > 5:
        fraud_flags.append("high_transaction_frequency")
        fraud_score += 0.1
    
    if raw_wallet_data.get("counterparty_diversity", 23) < 3:
        fraud_flags.append("low_counterparty_diversity")
        fraud_score += 0.15
    
    return {
        **state,
        "fraud_score": min(fraud_score, 1.0),
        "fraud_flags": fraud_flags,
        "fraud_reasoning": "Fallback rule-based analysis",
        "fraud_confidence": 0.7,
    }
