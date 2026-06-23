"""
Full end-to-end pipeline test.
Runs POST /assess equivalent directly against the pipeline,
then checks every stage output.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from wallet_env import get_test_wallet

TEST_WALLET = get_test_wallet()

print("=" * 65)
print("AURUM END-TO-END PIPELINE TEST")
print(f"Wallet  : {TEST_WALLET}")
print(f"CSPR mode   : {os.getenv('CSPR_CLOUD_MODE')}")
print(f"Deploy mode : {os.getenv('AURUM_DEPLOY_MODE')}")
print(f"X402 mode   : {os.getenv('X402_MODE')}")
print("=" * 65)

from pipeline.graph import pipeline

try:
    result = pipeline.invoke({"wallet_address": TEST_WALLET})
    print()
    print("[ CREDIT AGENT ]")
    print(f"  credit_score      : {result.get('credit_score')}")
    print(f"  sub_scores        : {result.get('sub_scores')}")
    print(f"  raw_wallet_data keys: {list(result.get('raw_wallet_data', {}).keys())}")

    print()
    print("[ RISK AGENT ]")
    print(f"  risk_tier         : {result.get('risk_tier')}")
    print(f"  default_prob_30d  : {result.get('default_prob_30d')}")
    print(f"  default_prob_60d  : {result.get('default_prob_60d')}")
    print(f"  early_warnings    : {result.get('early_warning_flags')}")
    print(f"  risk_analysis     : {str(result.get('risk_analysis',''))[:80]}...")

    print()
    print("[ FRAUD AGENT ]")
    print(f"  fraud_score       : {result.get('fraud_score')}")
    print(f"  fraud_flags       : {result.get('fraud_flags')}")
    print(f"  fraud_confidence  : {result.get('fraud_confidence')}")

    print()
    print("[ ATTESTATION AGENT ]")
    print(f"  attestation_hash  : {str(result.get('attestation_hash',''))[:60]}...")
    credit_result = result.get("credit_deploy_result", {})
    compliance_result = result.get("compliance_deploy_result", {})

    print(f"  tx_hash           : {result.get('tx_hash')}")
    print(f"  credit_hash       : {credit_result.get('deploy_hash')}")
    print(f"  compliance_hash   : {compliance_result.get('deploy_hash')}")
    print(f"  compliance_skipped: {compliance_result.get('skipped', False)}")
    print(f"  deploy_mode       : {result.get('deploy_mode')}")
    print(f"  summary           : {str(result.get('attestation_summary',''))[:80]}...")

    print()
    print("[ MONITORING AGENT ]")
    print(f"  credential_active : {result.get('credential_active')}")
    print(f"  monitoring_action : {result.get('monitoring_action')}")
    print(f"  reasoning         : {str(result.get('monitoring_reasoning',''))[:80]}...")

    print()
    print("[ LENDING AGENT ]")
    print(f"  loan_offers       : {result.get('loan_offers')}")
    print(f"  recommendation    : {str(result.get('lending_recommendation',''))[:80]}...")

    print()
    print("=" * 65)
    print("PIPELINE STATUS: OK" if result.get('credit_score') else "PIPELINE STATUS: MISSING SCORE")
    print("=" * 65)

except Exception as e:
    import traceback
    print(f"\nPIPELINE FAILED: {e}")
    traceback.print_exc()
