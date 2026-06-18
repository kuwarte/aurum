"""Quick smoke test for the wired credit agent."""
import os
os.environ.setdefault("CSPR_CLOUD_MODE", "mock")

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.credit_agent import credit_agent

result = credit_agent({"wallet_address": "test-wallet-abc123"})

print("credit_score:", result["credit_score"])
print("sub_scores:", result["sub_scores"])
mode = result["raw_wallet_data"].get("volume_summary", {}).get("mode", "n/a")
print("data_mode:", mode)
print("all 6 dimensions present:", sorted(result["sub_scores"].keys()))
