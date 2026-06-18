"""
Test script to verify Casper contract integration with agents.
This validates that the attestation agent can build contract call envelopes
using the deployed contract hashes.
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from casper.contracts import load_contracts_from_env
from casper.client import load_client_from_env
from datetime import datetime, timedelta


def test_contract_connection():
    """Test connection to Casper RPC and contract configuration."""
    print("=" * 60)
    print("AURUM CONTRACT INTEGRATION TEST")
    print("=" * 60)
    
    try:
        # Test 1: Load Casper client
        print("\n[TEST 1] Loading Casper client...")
        client = load_client_from_env()
        account_info = client.get_account_info()
        print(f"[/] Client loaded successfully")
        print(f"  Network: {account_info.network_name}")
        print(f"  Account: {account_info.account_hash}")
        print(f"  Public Key: {account_info.public_key}")
        
        # Test 2: Check RPC connectivity
        print("\n[TEST 2] Testing RPC connection...")
        status = client.rpc_status()
        print(f"[/] RPC connection successful")
        print(f"  Endpoint: {client.config.rpc_url}")
        
        # Test 3: Load contract wrappers
        print("\n[TEST 3] Loading contract configuration...")
        contracts = load_contracts_from_env()
        print(f"[/] Contracts loaded successfully")
        print(f"  CreditRegistry: {contracts.hashes.credit_registry}")
        print(f"  ComplianceRegistry: {contracts.hashes.compliance_registry}")
        print(f"  OraclePaywall: {contracts.hashes.oracle_paywall}")
        print(f"  ReputationRegistry: {contracts.hashes.reputation_registry}")
        
        # Test 4: Build sample credit score deploy envelope
        print("\n[TEST 4] Building credit score deploy envelope...")
        now_ts = int(datetime.utcnow().timestamp())
        expiry_ts = int((datetime.utcnow() + timedelta(days=90)).timestamp())
        
        test_wallet = "account-hash-0000000000000000000000000000000000000000000000000000000000000001"
        
        credit_deploy = contracts.issue_credit_score(
            borrower=test_wallet,
            score=750,
            tier="B",
            default_probability_bps=500,  # 5%
            borrowing_limit_motes=50_000_000_000_000,
            attestation_hash="https://supabase.co/attestation/test-123",
            issued_at=now_ts,
            expiry_at=expiry_ts,
        )
        
        print(f"[/] Credit score deploy envelope created")
        print(f"  Contract: {credit_deploy['contract_hash']}")
        print(f"  Entrypoint: {credit_deploy['entrypoint']}")
        print(f"  Borrower: {credit_deploy['args']['borrower']}")
        print(f"  Score: {credit_deploy['args']['score']}")
        print(f"  Tier: {credit_deploy['args']['tier']}")
        
        # Test 5: Build compliance token deploy envelope
        print("\n[TEST 5] Building compliance token deploy envelope...")
        compliance_deploy = contracts.issue_compliance_token(
            borrower=test_wallet,
            level="basic",
            aml_flag=False,
            issued_at=now_ts,
            expiry_at=expiry_ts,
        )
        
        print(f"[/] Compliance token deploy envelope created")
        print(f"  Contract: {compliance_deploy['contract_hash']}")
        print(f"  Entrypoint: {compliance_deploy['entrypoint']}")
        print(f"  Level: {compliance_deploy['args']['level']}")
        print(f"  AML Flag: {compliance_deploy['args']['aml_flag']}")
        
        print("\n" + "=" * 60)
        print("[/] ALL TESTS PASSED")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Run the full agent pipeline: python api/test_scripts/test_pipeline.py")
        print("2. Start the API server: uvicorn main:app --reload")
        print("3. Test POST /assess endpoint with a wallet address")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"\n[x] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_contract_connection()
    sys.exit(0 if success else 1)
