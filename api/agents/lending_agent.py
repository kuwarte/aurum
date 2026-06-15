from pipeline.state import PipelineState

MOCK_POOLS = {
    "A": [{"protocol": "TrueFi",    "rate": "8%",  "max_loan": 50000}],
    "B": [{"protocol": "Maple",     "rate": "12%", "max_loan": 20000}],
    "C": [{"protocol": "Clearpool", "rate": "18%", "max_loan": 5000}],
    "D": [],
}

def lending_agent(state: PipelineState) -> PipelineState:
    # workaround — mock pool data, no real protocol integration needed
    offers = MOCK_POOLS.get(state["risk_tier"], [])
    return {**state, "loan_offers": offers}
