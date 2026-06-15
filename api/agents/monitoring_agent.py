from pipeline.state import PipelineState

def monitoring_agent(state: PipelineState) -> PipelineState:
    # stub — Phase 3: replace with CSPR.cloud polling loop
    return {
        **state,
        "credential_active": True,
    }
