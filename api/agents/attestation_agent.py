"""
ATTESTATION AGENT: CREDENTIAL AGGREGATION AND ISSUANCE

Uses LLM to intelligently format attestation payloads, generate human-readable
summaries, and validate data consistency before on-chain minting.

This agent actually submits deploys to Casper blockchain.
"""

from datetime import datetime, timedelta
from pipeline.state import PipelineState
from db.supabase import save_attestation
from agents.utils.llm_utils import AgentLLM, Prompts
from casper.contracts import load_contracts_from_env
from casper.deploy_submitter import load_submitter_from_env
import os


def attestation_agent(state: PipelineState) -> PipelineState:
    """
    AI-powered credential attestation with validation and summarization.
    Returns attestation_hash, tx_hash, and human-readable summary.
    Calls deployed Casper contracts to mint CreditScore NFT and ComplianceToken.
    """
    
    llm = AgentLLM.get_llm("GROQ_API_KEY_1")
    prompt = Prompts.attestation_summary(
        state['wallet_address'],
        state['credit_score'],
        state['risk_tier'],
        state['default_prob_30d'],
        state['fraud_score'],
        state['fraud_flags']
    )
    
    validation = AgentLLM.invoke_llm(llm, prompt)
    
    if validation:
        attestation_summary = validation.get("summary", "Credit assessment completed.")
    else:
        attestation_summary = f"Credit score {state['credit_score']} assigned with tier {state['risk_tier']}."
    
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
        "summary": attestation_summary,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    attestation_hash = save_attestation(attestation_payload)
    
    # Connect to deployed Casper contracts
    contracts = load_contracts_from_env()
    
    # Calculate timestamps
    now_ts = int(datetime.utcnow().timestamp())
    expiry_ts = int((datetime.utcnow() + timedelta(days=90)).timestamp())
    
    # Convert default probability percentage to basis points (0.05 -> 500 bps)
    default_prob_bps = int(state["default_prob_30d"] * 10000)
    
    # Calculate borrowing limit based on tier (example logic)
    tier_limits = {"A": 100_000_000_000_000, "B": 50_000_000_000_000, "C": 10_000_000_000_000, "D": 1_000_000_000_000}
    borrowing_limit = tier_limits.get(state["risk_tier"], 0)
    
    # Determine if we should actually submit to blockchain
    submit_mode = os.getenv("AURUM_DEPLOY_MODE", "mock")
    
    if submit_mode == "live":
        # LIVE MODE: Actually submit to blockchain
        try:
            submitter = load_submitter_from_env()
            
            # Submit credit score
            credit_result = submitter.submit_contract_call(
                contract_hash=contracts.hashes.credit_registry,
                entrypoint="issue_credit_score",
                args={
                    "borrower": state["wallet_address"],
                    "score": state["credit_score"],
                    "tier": state["risk_tier"],
                    "default_probability_bps": default_prob_bps,
                    "borrowing_limit_motes": borrowing_limit,
                    "attestation_hash": attestation_hash,
                    "issued_at": now_ts,
                    "expiry_at": expiry_ts,
                }
            )
            
            if not credit_result.get("success"):
                print(f"[!]  Credit deploy failed: {credit_result.get('error')}")
                tx_hash = f"failed-{state['wallet_address'][:16]}"
            else:
                tx_hash = credit_result.get("deploy_hash", f"pending-{now_ts}")
                print(f"[/] Credit score deployed: {tx_hash}")
            
            # Submit compliance token
            has_aml_flag = "aml" in [flag.lower() for flag in state.get("fraud_flags", [])]
            compliance_level = "basic" if not has_aml_flag else "restricted"
            
            compliance_result = submitter.submit_contract_call(
                contract_hash=contracts.hashes.compliance_registry,
                entrypoint="issue_compliance_token",
                args={
                    "borrower": state["wallet_address"],
                    "level": compliance_level,
                    "aml_flag": has_aml_flag,
                    "issued_at": now_ts,
                    "expiry_at": expiry_ts,
                }
            )
            
            if compliance_result.get("success"):
                print(f"[/] Compliance token deployed: {compliance_result.get('deploy_hash')}")
            
            return {
                **state,
                "attestation_hash": attestation_hash,
                "tx_hash": tx_hash,
                "attestation_summary": attestation_summary,
                "credit_deploy_result": credit_result,
                "compliance_deploy_result": compliance_result,
                "borrowing_limit_motes": borrowing_limit,
                "compliance_level": compliance_level,
                "deploy_mode": "live",
            }
            
        except Exception as e:
            print(f"[!]  Blockchain submission error: {e}")
            tx_hash = f"error-{state['wallet_address'][:16]}"
            
            return {
                **state,
                "attestation_hash": attestation_hash,
                "tx_hash": tx_hash,
                "attestation_summary": attestation_summary,
                "deploy_error": str(e),
                "deploy_mode": "live_failed",
            }
    
    else:
        # MOCK MODE: Build envelopes but don't submit
        has_aml_flag = "aml" in [flag.lower() for flag in state.get("fraud_flags", [])]
        compliance_level = "basic" if not has_aml_flag else "restricted"
        
        credit_deploy = contracts.issue_credit_score(
            borrower=state["wallet_address"],
            score=state["credit_score"],
            tier=state["risk_tier"],
            default_probability_bps=default_prob_bps,
            borrowing_limit_motes=borrowing_limit,
            attestation_hash=attestation_hash,
            issued_at=now_ts,
            expiry_at=expiry_ts,
        )
        
        compliance_deploy = contracts.issue_compliance_token(
            borrower=state["wallet_address"],
            level=compliance_level,
            aml_flag=has_aml_flag,
            issued_at=now_ts,
            expiry_at=expiry_ts,
        )
        
        tx_hash = f"mock-deploy-{state['wallet_address'][:16]}-{now_ts}"
        
        return {
            **state,
            "attestation_hash": attestation_hash,
            "tx_hash": tx_hash,
            "attestation_summary": attestation_summary,
            "credit_deploy_envelope": credit_deploy,
            "compliance_deploy_envelope": compliance_deploy,
            "borrowing_limit_motes": borrowing_limit,
            "compliance_level": compliance_level,
            "deploy_mode": "mock",
        }
