"""
Attestation Agent: Credential Aggregation and Issuance.

Aggregates all agent outputs into a single attestation payload, signs with
Ed25519 keypair, and saves to Supabase. Phase 2 will call CreditRegistry
smart contract to mint on-chain CreditScore NFT.

Blocked on: Dev 2's casper/contracts.py for smart contract integration.
"""

import os
import json
from datetime import datetime
from pipeline.state import PipelineState
from db.supabase import save_attestation


def attestation_agent(state: PipelineState) -> PipelineState:
    """
    Aggregate assessment and issue credential.

    Collects all agent outputs into a single attestation payload and persists
    to Supabase. Ready for on-chain minting once Dev 2 provides contracts.

    Args:
        state: Complete pipeline state from fraud_agent

    Returns:
        Updated state with:
          - attestation_hash: Supabase URL or on-chain hash
          - tx_hash: Transaction hash (stub until contracts ready)
    """
    
    # Aggregate attestation payload
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
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    # Save to Supabase (returns URL for on-chain attestation_hash)
    attestation_hash = save_attestation(attestation_payload)
    
    # TODO: Once deploys CreditRegistry, call:
    # from casper.contracts import issue_credit_score
    # tx_hash = issue_credit_score(
    #     wallet=state["wallet_address"],
    #     credit_score=state["credit_score"],
    #     risk_tier=state["risk_tier"],
    #     attestation_hash=attestation_hash,
    # )
    
    # For now, use stub tx hash
    tx_hash = f"stub-tx-{state['wallet_address'][:8]}"
    
    return {
        **state,
        "attestation_hash": attestation_hash,
        "tx_hash": tx_hash,
    }
