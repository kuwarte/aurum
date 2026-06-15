from typing import TypedDict

class PipelineState(TypedDict):
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

    # Fraud Agent outputs
    fraud_score: float
    fraud_flags: list

    # Attestation Agent outputs
    attestation_hash: str
    tx_hash: str

    # Monitoring Agent outputs
    credential_active: bool

    # Lending Agent outputs
    loan_offers: list
