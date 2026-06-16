"""
LangGraph Pipeline: Agent Orchestration.

Defines the execution graph for Aurum's 6-agent credit assessment pipeline.
Each agent processes the shared state sequentially in a linear flow.
"""

from langgraph.graph import StateGraph, END
from pipeline.state import PipelineState
from agents.credit_agent import credit_agent
from agents.risk_agent import risk_agent
from agents.fraud_agent import fraud_agent
from agents.attestation_agent import attestation_agent
from agents.monitoring_agent import monitoring_agent
from agents.lending_agent import lending_agent


def build_pipeline():
    """
    Build LangGraph execution pipeline for credit assessment.
    
    Flow: Credit -> Risk -> Fraud -> Attestation -> Monitoring -> Lending
    
    Each agent receives the complete state dict and returns an updated state.
    State accumulates all outputs as it flows through the pipeline.
    """
    graph = StateGraph(PipelineState)

    graph.add_node("credit",      credit_agent)
    graph.add_node("risk",        risk_agent)
    graph.add_node("fraud",       fraud_agent)
    graph.add_node("attestation", attestation_agent)
    graph.add_node("monitoring",  monitoring_agent)
    graph.add_node("lending",     lending_agent)

    graph.set_entry_point("credit")
    graph.add_edge("credit",      "risk")
    graph.add_edge("risk",        "fraud")
    graph.add_edge("fraud",       "attestation")
    graph.add_edge("attestation", "monitoring")
    graph.add_edge("monitoring",  "lending")
    graph.add_edge("lending",     END)

    return graph.compile()


pipeline = build_pipeline()
