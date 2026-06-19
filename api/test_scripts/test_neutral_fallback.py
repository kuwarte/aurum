"""Test that neutral fallback works correctly for unavailable DeFi dimensions."""
from dotenv import load_dotenv
load_dotenv()

from agents.credit_agent import _compute_defi, _compute_rwa, _compute_dao, NEUTRAL_SCORE

print("=== Live mode — empty lists (no CSPR.cloud DeFi endpoints) ===")
print(f"defi (0 positions, live=True):  {_compute_defi([], True)}  (expected {NEUTRAL_SCORE})")
print(f"rwa  (0 events,    live=True):  {_compute_rwa([], True)}   (expected {NEUTRAL_SCORE})")
print(f"dao  (0 events,    live=True):  {_compute_dao([], True)}   (expected {NEUTRAL_SCORE})")

print()
print("=== Mock mode — empty lists (wallet genuinely has no DeFi activity) ===")
print(f"defi (0 positions, live=False): {_compute_defi([], False)}  (expected 0)")
print(f"rwa  (0 events,    live=False): {_compute_rwa([], False)}   (expected 0)")
print(f"dao  (0 events,    live=False): {_compute_dao([], False)}   (expected 0)")

print()
print("=== Mock mode — with real data ===")
print(f"defi (3 positions): {_compute_defi([1,2,3], False)}   (expected 60)")
print(f"rwa  (2 events):    {_compute_rwa([1,2], False)}    (expected 50)")
print(f"dao  (4 events):    {_compute_dao([1,2,3,4], False)} (expected 60)")

print()
print(f"NEUTRAL_SCORE = {NEUTRAL_SCORE}")
print()

# Simulate expected score improvement
from scoring.model import get_model
model = get_model()

old_features = {"wallet_activity": 1, "repayment": 50, "defi": 0, "income": 100, "rwa": 0, "dao": 0}
new_features = {"wallet_activity": 1, "repayment": 50, "defi": 50, "income": 100, "rwa": 50, "dao": 50}

old_score, _ = model.predict(old_features)
new_score, _ = model.predict(new_features)

print(f"Score WITHOUT neutral fallback (old): {old_score}")
print(f"Score WITH neutral fallback (new):    {new_score}")
print(f"Score improvement: +{new_score - old_score}")
