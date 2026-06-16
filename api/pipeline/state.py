"""
Pipeline State: Shared State Schema.

Defines the TypedDict structure that flows through all agents.
Each agent reads from and writes to this shared state object.

State flows through the pipeline accumulating outputs from each agent:
  Input: {"wallet_address": "0x..."}
  After Credit Agent: + credit_score, sub_scores, shap_breakdown, raw_wallet_data
  After Risk Agent: + risk_tier, default_prob_*, early_warning_flags, risk_analysis
  After Fraud Agent: + fraud_score, fraud_flags, fraud_reasoning, fraud_confidence
  After Attestation: + attestation_hash, tx_hash, attestation_summary
  After Monitoring: + credential_active, monitoring_reasoning, monitoring_action
  After Lending: + loan_offers, lending_recommendation
  Final: Complete assessment state with all fields populated
"""

from typing import TypedDict


class PipelineState(TypedDict):
    """Shared state for credit assessment pipeline."""
    
    wallet_address: str

    # Credit Agent outputs
    raw_wallet_data: dict
    sub_scores: dict
    credit_score: int
    shap_breakdown: dict

    # Risk Agent outputs
    risk_tier: str
    default_prob_30d: float
    default_prob_60d: float
    default_prob_90d: float
    early_warning_flags: list
    risk_analysis: str

    # Fraud Agent outputs
    fraud_score: float
    fraud_flags: list
    fraud_reasoning: str
    fraud_confidence: float

    # Attestation Agent outputs
    attestation_hash: str
    tx_hash: str
    attestation_summary: str

    # Monitoring Agent outputs
    credential_active: bool
    monitoring_reasoning: str
    monitoring_action: str

    # Lending Agent outputs
    loan_offers: list
    lending_recommendation: str
