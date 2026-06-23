"""
LENDING AGENT: LOAN MATCHING

Uses LLM reasoning to match borrowers with optimal lending pools and provide
personalized loan recommendations based on risk profile and market conditions.
"""

from pipeline.state import PipelineState
from agents.utils.llm_utils import AgentLLM, Prompts


def lending_agent(state: PipelineState) -> PipelineState:
    """
    AI-powered loan matching based on risk profile and market conditions.
    Returns available loan_offers and personalized lending_recommendation.
    """
    
    all_pools = {
        "A": [{"protocol": "TrueFi", "rate": "8%", "max_loan": 50000}],
        "B": [{"protocol": "Maple", "rate": "12%", "max_loan": 20000}],
        "C": [{"protocol": "Clearpool", "rate": "18%", "max_loan": 5000}],
        "D": [],
    }
    
    tier = state["risk_tier"]
    offers = all_pools.get(tier, [])
    
    if not offers:
        return {
            **state,
            "loan_offers": [],
            "lending_recommendation": "No offers available for tier D."
        }
    
    llm = AgentLLM.get_llm("GROQ_API_KEY_1")
    prompt = Prompts.lending_recommendation(
        state['credit_score'],
        tier,
        state['default_prob_30d'],
        state['fraud_score'],
        offers
    )
    
    result = AgentLLM.invoke_llm(llm, prompt)
    
    if result:
        lending_recommendation = result.get("recommendation", "Standard loan offers available.")
        llm_fields = AgentLLM.status_fields(state, fallback_used=False)
    else:
        lending_recommendation = f"Tier {tier} offers available at market rates."
        llm_fields = AgentLLM.status_fields(state, fallback_used=True)
    
    return {
        **state,
        **llm_fields,
        "loan_offers": offers,
        "lending_recommendation": lending_recommendation
    }
