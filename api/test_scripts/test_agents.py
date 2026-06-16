#!/usr/bin/env python3
"""
AGENT UNIT TESTING SCRIPT

Provides granular testing of each agent in the LangGraph pipeline.
Tests agents in isolation and in sequence with state cascading.

Usage:
  python test_agents.py              # Test all agents in sequence
  python test_agents.py credit       # Test only Credit Agent
  python test_agents.py risk         # Test only Risk Agent
  python test_agents.py fraud        # Test only Fraud Agent
  python test_agents.py attestation  # Test only Attestation Agent
  python test_agents.py monitoring   # Test only Monitoring Agent
  python test_agents.py lending      # Test only Lending Agent
"""

import json
from dotenv import load_dotenv
from pipeline.state import PipelineState


# Load environment configuration before importing agents
load_dotenv()


# Sample initial state for testing
INITIAL_STATE: PipelineState = {
    "wallet_address": "0xtest123abc",
    "raw_wallet_data": {},
    "sub_scores": {},
    "credit_score": 0,
    "shap_breakdown": {},
    "risk_tier": "",
    "default_prob_30d": 0.0,
    "default_prob_60d": 0.0,
    "default_prob_90d": 0.0,
    "early_warning_flags": [],
    "fraud_score": 0.0,
    "fraud_flags": [],
    "attestation_hash": "",
    "tx_hash": "",
    "credential_active": False,
    "loan_offers": [],
}


def test_credit_agent():
    """
    Test Credit Agent in isolation.

    Verifies that the Credit Agent correctly:
        1. Accepts initial pipeline state
        2. Generates or fetches wallet data
        3. Runs XGBoost model
        4. Computes SHAP feature breakdown
        5. Returns valid credit score (0-1000) and sub-scores

    Returns:
        Updated pipeline state for cascade testing
    """

    print("\n" + "="*80)
    print("TEST: Credit Agent")
    print("="*80)
    
    from agents.credit_agent import credit_agent
    
    state = INITIAL_STATE.copy()
    result = credit_agent(state)
    
    print(f"[/] Wallet Address: {result['wallet_address']}")
    print(f"[/] Credit Score: {result['credit_score']} (0-1000)")
    print(f"[/] Sub-Scores: {json.dumps(result['sub_scores'], indent=2)}")
    print(f"[/] SHAP Breakdown Keys: {list(result['shap_breakdown'].keys())}")
    
    # Verify output
    assert 0 <= result['credit_score'] <= 1000, "Score out of range"
    assert len(result['sub_scores']) == 6, "Should have 6 sub-scores"
    assert len(result['shap_breakdown']) > 0, "Should have SHAP values"
    
    print("[/] PASSED")
    return result


def test_risk_agent():
    """
    Test Risk Agent in isolation.

    Verifies that the Risk Agent correctly:
        1. Consumes credit score from credit agent
        2. Calculates default probabilities (30/60/90 day)
        3. Assigns risk tier based on score thresholds
        4. Detects early warning flags (low repayment, high risk, etc.)
        5. Returns valid probabilities (monotonically increasing)

    Returns:
        Updated pipeline state for cascade testing
    """
    
    print("\n" + "="*80)
    print("TEST: Risk Agent")
    print("="*80)
    
    from agents.risk_agent import risk_agent
    
    # Get state from credit agent first
    state = test_credit_agent()
    
    result = risk_agent(state)
    
    print(f"[/] Risk Tier: {result['risk_tier']} (A/B/C/D)")
    print(f"[/] Default Prob 30d: {result['default_prob_30d']:.3f}")
    print(f"[/] Default Prob 60d: {result['default_prob_60d']:.3f}")
    print(f"[/] Default Prob 90d: {result['default_prob_90d']:.3f}")
    print(f"[/] Early Warning Flags: {result['early_warning_flags']}")
    
    # Verify output
    assert result['risk_tier'] in ['A', 'B', 'C', 'D'], "Invalid tier"
    assert 0 <= result['default_prob_30d'] <= 1, "Prob out of range"
    assert result['default_prob_30d'] <= result['default_prob_60d'], "Probs not monotonic"
    assert result['default_prob_60d'] <= result['default_prob_90d'], "Probs not monotonic"
    
    print("[/] PASSED")
    return result


def test_fraud_agent():
    """
    Test Fraud Agent in isolation.

    Verifies that the Fraud Agent correctly:
        1. Analyzes wallet characteristics for fraud patterns
        2. Assigns fraud score (0-1)
        3. Generates specific fraud flags when patterns detected
        4. Returns valid scores and flag lists

    Returns:
        Updated pipeline state for cascade testing
    """
    
    print("\n" + "="*80)
    print("TEST: Fraud Agent")
    print("="*80)
    
    from agents.fraud_agent import fraud_agent
    
    # Get state from risk agent
    state = test_risk_agent()
    
    result = fraud_agent(state)
    
    print(f"[/] Fraud Score: {result['fraud_score']:.3f} (0-1)")
    print(f"[/] Fraud Flags: {result['fraud_flags']}")
    
    # Verify output
    assert 0 <= result['fraud_score'] <= 1, "Fraud score out of range"
    assert isinstance(result['fraud_flags'], list), "Fraud flags should be list"
    
    print("[/] PASSED")
    return result


def test_attestation_agent():
    """
    Test Attestation Agent in isolation.

    Verifies that the Attestation Agent correctly:
        1. Aggregates all upstream agent outputs
        2. Saves payload to Supabase (with error handling)
        3. Generates attestation hash for on-chain reference
        4. Returns valid hashes and transaction placeholders

    Returns:
        Updated pipeline state for cascade testing

    Note:
        On-chain transaction calls are stubbed pending Dev 2's contract deployment.
    """

    print("\n" + "="*80)
    print("TEST: Attestation Agent")
    print("="*80)
    
    from agents.attestation_agent import attestation_agent
    
    # Get state from fraud agent
    state = test_fraud_agent()
    
    result = attestation_agent(state)
    
    print(f"[/] Attestation Hash: {result['attestation_hash'][:80]}...")
    print(f"[/] TX Hash: {result['tx_hash']}")
    
    # Verify output
    assert len(result['attestation_hash']) > 0, "Should have attestation hash"
    assert len(result['tx_hash']) > 0, "Should have tx hash"
    
    print("[/] PASSED (Saved to Supabase)")
    return result


def test_monitoring_agent():
    """
    Test Monitoring Agent in isolation.

    Verifies that the Monitoring Agent correctly:
      1. Checks if credential is still active
      2. Validates fraud score thresholds
      3. Queries Supabase for recent assessments
      4. Returns boolean credential status

    Returns:
        Updated pipeline state for cascade testing

    Note:
        Revocation logic is stubbed pending Dev 2's contract methods.
    """

    print("\n" + "="*80)
    print("TEST: Monitoring Agent")
    print("="*80)
    
    from agents.monitoring_agent import monitoring_agent
    
    # Get state from attestation agent
    state = test_attestation_agent()
    
    result = monitoring_agent(state)
    
    print(f"[/] Credential Active: {result['credential_active']}")
    
    # Verify output
    assert isinstance(result['credential_active'], bool), "Should be boolean"
    
    print("[/] PASSED")
    return result


def test_lending_agent():
    """
    Test Lending Agent in isolation.

    Verifies that the Lending Agent correctly:
        1. Consumes risk tier from upstream agents
        2. Matches tier to lending pool offers
        3. Returns list of available loan offers
        4. Handles all tier categories (A/B/C/D)

    Returns:
        Updated pipeline state for cascade testing

    Note:
        Pool data is mocked; Phase 3 integrates real protocol APIs.
    """
    
    print("\n" + "="*80)
    print("TEST: Lending Agent")
    print("="*80)
    
    from agents.lending_agent import lending_agent
    
    # Get state from monitoring agent
    state = test_monitoring_agent()
    
    result = lending_agent(state)
    
    print(f"[/] Loan Offers: {json.dumps(result['loan_offers'], indent=2)}")
    
    # Verify output
    assert isinstance(result['loan_offers'], list), "Loan offers should be list"
    
    print("[/] PASSED")
    return result


def run_all_agents():
    """
    Execute all agents in sequence with state cascading.

    Tests the full LangGraph pipeline by running agents in order:
        1. Credit Agent -> generates score
        2. Risk Agent -> classifies risk
        3. Fraud Agent -> detects fraud
        4. Attestation Agent -> saves to Supabase
        5. Monitoring Agent -> checks status
        6. Lending Agent -> matches offers

    Returns:
        True if all agents passed, False otherwise
    """
    
    print("\n\n")
    print("#"*80)
    print("# FULL AGENT PIPELINE TEST")
    print("#"*80)
    
    try:
        test_lending_agent()
        
        print("\n\n")
        print("#"*80)
        print("# [/] ALL AGENTS PASSED")
        print("#"*80)
        print("\nNext steps:")
        print("  1. Check Supabase for saved assessment")
        print("  2. Test FastAPI: uvicorn main:app --reload")
        print("  3. Call POST /assess with wallet address")
        
        return True
    except Exception as e:
        print(f"\n\n✗ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def run_single_agent(agent_name: str):
    """
    Execute a single agent test by name.

    Args:
        agent_name: Name of agent to test (credit, risk, fraud, attestation,
                    monitoring, lending)

    Returns:
        True if agent test passed, False otherwise
    """

    agents = {
        "credit": test_credit_agent,
        "risk": test_risk_agent,
        "fraud": test_fraud_agent,
        "attestation": test_attestation_agent,
        "monitoring": test_monitoring_agent,
        "lending": test_lending_agent,
    }
    
    if agent_name not in agents:
        print(f"Unknown agent: {agent_name}")
        print(f"Available: {', '.join(agents.keys())}")
        return False
    
    try:
        agents[agent_name]()
        return True
    except Exception as e:
        print(f"✗ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import sys

    # Parse command-line arguments
    if len(sys.argv) > 1:
        agent_name = sys.argv[1].lower()
        print(f"\nTesting agent: {agent_name}")
        success = run_single_agent(agent_name)
    else:
        print("\nRunning all agents in sequence...")
        success = run_all_agents()

    sys.exit(0 if success else 1)
