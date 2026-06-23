"""
Test live deploy submission to Casper testnet.
Calls issue_credit_score on the CreditRegistry contract.

WARNING: This sends a real transaction to testnet and costs CSPR gas.
Payment = 5 CSPR (5_000_000_000 motes)
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
from wallet_env import get_test_wallet

print("=" * 65)
print("CASPER LIVE DEPLOY TEST")
print("=" * 65)

# Step 1: verify submitter loads
print("\n[1] Loading DeploySubmitter...")
from casper.deploy_submitter import load_submitter_from_env
try:
    submitter = load_submitter_from_env()
    print(f"  casper-client : {submitter.casper_client_bin}")
    print(f"  rpc_url       : {submitter.rpc_url}")
    print(f"  chain_name    : {submitter.chain_name}")
    print(f"  key_path      : {submitter.secret_key_path}")
    print(f"  key exists    : {os.path.exists(submitter.secret_key_path)}")
except Exception as e:
    print(f"  FAILED: {e}")
    sys.exit(1)

# Step 2: verify key file is readable
print("\n[2] Checking key file...")
if not os.path.exists(submitter.secret_key_path):
    print(f"  ERROR: key file not found at {submitter.secret_key_path}")
    sys.exit(1)
print(f"  OK: {submitter.secret_key_path}")

# Step 3: submit a real credit score deploy
print("\n[3] Submitting issue_credit_score to CreditRegistry (testnet)...")
# Use the actual callable contract hash, not the package hash
credit_registry = os.getenv("CREDIT_REGISTRY_CONTRACT_HASH") or os.getenv("CREDIT_REGISTRY_HASH", "")
test_wallet = get_test_wallet()
now_ts = int(time.time())
expiry_ts = now_ts + (90 * 24 * 3600)

print(f"  contract_hash : {credit_registry}")
print(f"  borrower      : {test_wallet}")
print(f"  score         : 509")
print(f"  tier          : C")

result = submitter.submit_contract_call(
    contract_hash=credit_registry,
    entrypoint="issue_credit_score",
    args={
        "borrower": test_wallet,
        "score": 509,
        "tier": "C",
        "default_probability_bps": 3790,
        "borrowing_limit_motes": 10_000_000_000_000,
        "attestation_hash": "test-attestation-hash",
        "issued_at": now_ts,
        "expiry_at": expiry_ts,
    }
)

print(f"\n  success       : {result.get('success')}")
print(f"  deploy_hash   : {result.get('deploy_hash', 'n/a')}")
if not result.get('success'):
    print(f"  error         : {result.get('error', '')[:400]}")
    print(f"  returncode    : {result.get('returncode', 'n/a')}")
    print(f"  command       : {result.get('command', '')[:200]}")
else:
    print(f"\n  Explorer URL  : https://testnet.cspr.live/deploy/{result.get('deploy_hash')}")

print("\n[4] Checking deploy status (wait 5s)...")
if result.get('success') and result.get('deploy_hash'):
    time.sleep(5)
    status = submitter.check_deploy_status(result['deploy_hash'])
    print(f"  status : {status.get('status')}")
    if status.get('details'):
        print(f"  detail : {str(status['details'])[:100]}")
