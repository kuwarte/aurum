#!/usr/bin/env python3
"""
END TO END PIPELINE TEST

Comprehensive test of the full LangGraph assessment pipeline including:
  - Module imports
  - XGBoost model initialization and prediction
  - SHAP explainer functionality
  - Full agent pipeline execution with Supabase persistence

Run from api/ directory: python test_pipeline.py
"""

import sys
import os
import json
from pathlib import Path

# Add parent directory to path so imports work
api_dir = Path(__file__).parent.parent
sys.path.insert(0, str(api_dir))

from wallet_env import get_test_wallet

def test_pipeline():
    """Test the full assessment pipeline."""
    print("=" * 80)
    print("Testing Aurum Protocol Assessment Pipeline")
    print("=" * 80)
    print()
    
    # Test 1: Import all modules
    print("[/] Test 1: Importing modules...")
    try:
        from pipeline.graph import pipeline
        from pipeline.state import PipelineState
        print("  [/] Pipeline imports OK")
    except Exception as e:
        print(f"  [x] Import failed: {e}")
        return False
    
    # Test 2: Import agents
    print("[/] Test 2: Importing agents...")
    try:
        from agents.credit_agent import credit_agent
        from agents.risk_agent import risk_agent
        from agents.fraud_agent import fraud_agent
        from agents.attestation_agent import attestation_agent
        from agents.monitoring_agent import monitoring_agent
        from agents.lending_agent import lending_agent
        print("  [/] All agents imported OK")
    except Exception as e:
        print(f"  [x] Agent imports failed: {e}")
        return False
    
    # Test 3: Import scoring
    print("[/] Test 3: Importing scoring modules...")
    try:
        from scoring.model import get_model
        from scoring.shap_explain import get_explainer
        print("  [/] Scoring modules imported OK")
    except Exception as e:
        print(f"  [x] Scoring imports failed: {e}")
        return False
    
    # Test 4: Test model initialization
    print("[/] Test 4: Initializing XGBoost model...")
    try:
        model = get_model()
        print(f"  [/] Model trained with features: {model.feature_names}")
    except Exception as e:
        print(f"  [x] Model initialization failed: {e}")
        return False
    
    # Test 5: Test model prediction
    print("[/] Test 5: Testing model prediction...")
    try:
        wallet_features = {
            "repayment": 85,
            "wallet_activity": 78,
            "defi": 65,
            "dao": 55,
            "rwa": 45,
            "income": 80,
        }
        score, sub_scores = model.predict(wallet_features)
        print(f"  [/] Model prediction: score={score}, sub_scores={sub_scores}")
        assert 0 <= score <= 1000, f"Score out of range: {score}"
    except Exception as e:
        print(f"  [x] Model prediction failed: {e}")
        return False
    
    # Test 6: Test SHAP explainer
    print("[/] Test 6: Testing SHAP explainer...")
    try:
        explainer = get_explainer()
        shap_values = explainer.explain(wallet_features)
        print(f"  [/] SHAP breakdown: {shap_values}")
    except Exception as e:
        print(f"  [x] SHAP explainer failed: {e}")
        return False
    
    # Test 7: Run full pipeline
    print("[/] Test 7: Running full LangGraph pipeline...")
    try:
        result = pipeline.invoke({"wallet_address": get_test_wallet()})
        
        # Verify all required fields in output
        required_fields = [
            "wallet_address",
            "credit_score",
            "risk_tier",
            "default_prob_30d",
            "fraud_score",
            "loan_offers",
        ]
        
        for field in required_fields:
            if field not in result:
                raise ValueError(f"Missing field: {field}")
        
        print("  [/] Pipeline execution successful!")
        print()
        print("Pipeline Output:")
        print("-" * 80)
        print(json.dumps({
            "wallet": result["wallet_address"],
            "credit_score": result["credit_score"],
            "risk_tier": result["risk_tier"],
            "default_prob_30d": result["default_prob_30d"],
            "default_prob_60d": result["default_prob_60d"],
            "default_prob_90d": result["default_prob_90d"],
            "fraud_score": result["fraud_score"],
            "fraud_flags": result["fraud_flags"],
            "early_warning_flags": result["early_warning_flags"],
            "loan_offers": result["loan_offers"],
            "credential_active": result["credential_active"],
        }, indent=2))
        print("-" * 80)
        
    except Exception as e:
        print(f"  ✗ Pipeline execution failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print()
    print("=" * 80)
    print("[/] All tests passed!")
    print("=" * 80)
    print()
    print("Next steps:")
    print("  1. Run FastAPI server: uvicorn main:app --reload")
    print("  2. Test POST /assess endpoint with wallet address")
    print("  3. Integrate with Dev 2 contracts once deployed")
    print()
    
    return True


if __name__ == "__main__":
    success = test_pipeline()
    sys.exit(0 if success else 1)
