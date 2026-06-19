"""Quick test to verify CSPR.cloud live mode is working."""
import os
from dotenv import load_dotenv
load_dotenv()

from cspr_cloud.wallet import load_wallet_service_from_env

svc = load_wallet_service_from_env()
print(f"mode: {svc.config.mode}")
print(f"base_url: {svc.config.base_url}")
print(f"key set: {bool(svc.config.api_key)}")
print(f"key preview: {svc.config.api_key[:8]}..." if svc.config.api_key else "NO KEY")

account = os.getenv("CASPER_ACCOUNT_HASH", "")
print(f"account: {account}")

try:
    result = svc.get_wallet_transaction_history(account)
    print(f"mode in result: {result.get('mode')}")
    txs = result.get("transactions", [])
    print(f"tx count: {len(txs)}")
    if txs:
        print(f"first tx: {txs[0]}")
    else:
        print("No transactions returned")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")

# Also test volume summary
try:
    summary = svc.get_wallet_volume_summary(account)
    print(f"\nvolume summary: {summary}")
except Exception as e:
    print(f"volume summary ERROR: {e}")
