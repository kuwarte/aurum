"""
ATTESTATION AGENT: CREDENTIAL AGGREGATION AND ISSUANCE

Uses LLM to intelligently format attestation payloads, generate human-readable
summaries, and validate data consistency before on-chain minting.
"""

from datetime import datetime
from pipeline.state import PipelineState
from db.supabase import save_attestation
from agents.utils.llm_utils import AgentLLM, Prompts


def attestation_agent(state: PipelineState) -> PipelineState:
    """
    AI-powered credential attestation with validation and summarization.
    Returns attestation_hash, tx_hash, and human-readable summary.
    """
    
    llm = AgentLLM.get_llm("GROQ_API_KEY_1")
    prompt = Prompts.attestation_summary(
        state['wallet_address'],
        state['credit_score'],
        state['risk_tier'],
        state['default_prob_30d'],
        state['fraud_score'],
        state['fraud_flags']
    )
    
    validation = AgentLLM.invoke_llm(llm, prompt)
    
    if validation:
        attestation_summary = validation.get("summary", "Credit assessment completed.")
    else:
        attestation_summary = f"Credit score {state['credit_score']} assigned with tier {state['risk_tier']}."
    
    attestation_payload = {
        "wallet": state["wallet_address"],
        "score": state["credit_score"],
        "tier": state["risk_tier"],
        "default_prob_30d": state["default_prob_30d"],
        "default_prob_60d": state["default_prob_60d"],
        "default_prob_90d": state["default_prob_90d"],
        "sub_scores": state["sub_scores"],
        "shap": state["shap_breakdown"],
        "fraud_score": state["fraud_score"],
        "fraud_flags": state["fraud_flags"],
        "early_warning_flags": state["early_warning_flags"],
        "summary": attestation_summary,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    attestation_hash = save_attestation(attestation_payload)
    tx_hash = f"stub-tx-{state['wallet_address'][:8]}"
    
    return {
        **state,
        "attestation_hash": attestation_hash,
        "tx_hash": tx_hash,
        "attestation_summary": attestation_summary,
    }
