from pipeline.state import PipelineState

def risk_agent(state: PipelineState) -> PipelineState:
    # stub — Phase 2: replace with real classifier
    score = state["credit_score"]
    if score >= 750:
        tier = "A"
    elif score >= 600:
        tier = "B"
    elif score >= 450:
        tier = "C"
    else:
        tier = "D"

    return {
        **state,
        "risk_tier":           tier,
        "default_prob_30d":    0.05,
        "default_prob_60d":    0.08,
        "default_prob_90d":    0.12,
        "early_warning_flags": [],
    }
