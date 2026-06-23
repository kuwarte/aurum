"""
MONITORING AGENT: CREDENTIAL SURVEILLANCE AND REVOCATION

Uses LLM reasoning to assess whether credentials should remain active.
Analyzes recent behavior patterns and makes intelligent revocation decisions.
"""

from pipeline.state import PipelineState
from db.supabase import get_assessment
from agents.utils.llm_utils import AgentLLM, Prompts


def monitoring_agent(state: PipelineState) -> PipelineState:
    """
    AI-powered credential monitoring with intelligent revocation decisions.
    Returns credential_active status, reasoning, and recommended action.
    """
    wallet_address = state["wallet_address"]
    recent_assessment = get_assessment(wallet_address)
    
    llm = AgentLLM.get_llm("GROQ_API_KEY")
    prompt = Prompts.credential_monitoring(
        wallet_address,
        state.get("credit_score", 0),
        state.get("risk_tier", "D"),
        state.get("fraud_score", 0),
        state.get("default_prob_30d", 0)
    )
    
    decision = AgentLLM.invoke_llm(llm, prompt)
    
    if decision:
        credential_active = decision.get("credential_active", True)
        monitoring_reasoning = decision.get("reasoning", "Standard monitoring.")
        monitoring_action = decision.get("action", "maintain")
        llm_fields = AgentLLM.status_fields(state, fallback_used=False)
    else:
        credential_active = True
        monitoring_reasoning = "Rule-based monitoring"
        monitoring_action = "maintain"
        llm_fields = AgentLLM.status_fields(state, fallback_used=True)
        
        if state.get("fraud_score", 0) > 0.5:
            credential_active = False
            monitoring_reasoning = "Fraud score exceeds threshold (0.5)"
            monitoring_action = "revoke"
    
    return {
        **state,
        **llm_fields,
        "credential_active": credential_active,
        "monitoring_reasoning": monitoring_reasoning,
        "monitoring_action": monitoring_action,
    }
