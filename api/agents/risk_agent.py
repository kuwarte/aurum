"""
RISK AGENT: DEFAULT RISK ASSESSMENT

Uses LLM reasoning to classify default probability and assign risk tiers.
Provides detailed early warning analysis beyond simple thresholds.
"""

from pipeline.state import PipelineState
from scoring.model import get_model
from agents.utils.llm_utils import AgentLLM, Prompts


def risk_agent(state: PipelineState) -> PipelineState:
    """
    Classify default probability and assign risk tier using AI analysis.
    Returns risk_tier (A/B/C/D), default probabilities, and early warnings.
    """
    credit_score = state["credit_score"]
    sub_scores = state["sub_scores"]
    
    model = get_model()
    wallet_features = {
        "repayment": sub_scores.get("repayment", 70),
        "wallet_activity": sub_scores.get("wallet_activity", 60),
        "defi": sub_scores.get("defi", 50),
        "dao": sub_scores.get("dao", 40),
        "rwa": sub_scores.get("rwa", 30),
        "income": sub_scores.get("income", 75),
    }
    
    base_default_prob = model.predict_proba(wallet_features)
    default_prob_30d = base_default_prob
    default_prob_60d = min(base_default_prob * 1.5, 0.99)
    default_prob_90d = min(base_default_prob * 2.0, 0.99)
    
    if credit_score >= 750:
        tier = "A"
    elif credit_score >= 600:
        tier = "B"
    elif credit_score >= 450:
        tier = "C"
    else:
        tier = "D"
    
    early_warning_flags = []
    
    if sub_scores.get("repayment", 70) < 50:
        early_warning_flags.append("low_repayment_history")
    
    if default_prob_30d > 0.15:
        early_warning_flags.append("elevated_default_risk")
    
    if sub_scores.get("income", 75) < 40:
        early_warning_flags.append("inconsistent_income")
    
    if sub_scores.get("wallet_activity", 60) < 30:
        early_warning_flags.append("dormant_wallet")
    
    llm = AgentLLM.get_llm("GROQ_API_KEY")
    prompt = Prompts.risk_analysis(credit_score, tier, default_prob_30d, sub_scores)
    
    analysis = AgentLLM.invoke_llm(llm, prompt)
    
    if analysis:
        ai_warnings = analysis.get("early_warnings", [])
        risk_analysis = analysis.get("risk_analysis", "")
        all_warnings = list(set(early_warning_flags + ai_warnings))
    else:
        all_warnings = early_warning_flags
        risk_analysis = "Rule-based analysis only"
    
    return {
        **state,
        "risk_tier": tier,
        "default_prob_30d": round(default_prob_30d, 3),
        "default_prob_60d": round(default_prob_60d, 3),
        "default_prob_90d": round(default_prob_90d, 3),
        "early_warning_flags": all_warnings,
        "risk_analysis": risk_analysis,
    }
