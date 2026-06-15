from pipeline.state import PipelineState

def fraud_agent(state: PipelineState) -> PipelineState:
    # stub — Phase 3: replace with graph analysis
    return {
        **state,
        "fraud_score": 0.0,
        "fraud_flags": [],
    }
