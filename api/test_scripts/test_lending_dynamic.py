"""Test dynamic loan offer generation across different wallet profiles."""
from dotenv import load_dotenv
load_dotenv()

from agents.lending_agent import _compute_rate, _compute_max_loan, _build_offers

profiles = [
    # (label, tier, score, default_prob, borrowing_motes)
    ("Top Tier A (score 950)",  "A", 950, 0.01,  100_000_000_000_000),
    ("Mid Tier A (score 800)",  "A", 800, 0.04,  100_000_000_000_000),
    ("Low Tier A (score 755)",  "A", 755, 0.07,  100_000_000_000_000),
    ("Top Tier B (score 745)",  "B", 745, 0.10,   50_000_000_000_000),
    ("Mid Tier B (score 680)",  "B", 680, 0.15,   50_000_000_000_000),
    ("Tier C (score 510)",      "C", 510, 0.22,   10_000_000_000_000),
    ("Real wallet (score 701)", "B", 701, 0.12,   50_000_000_000_000),
    ("Tier D (score 300)",      "D", 300, 0.50,    1_000_000_000_000),
]

print(f"{'Profile':<30} {'Rate':>7} {'Max Loan':>10}  Offers")
print("-" * 75)

for label, tier, score, prob, motes in profiles:
    rate = _compute_rate(tier, score, prob)
    max_loan = _compute_max_loan(tier, motes)
    offers = _build_offers(tier, rate, max_loan)
    if offers:
        offer_str = ", ".join(f"{o['protocol']}@{o['rate']}" for o in offers)
        print(f"{label:<30}  {rate:>6.1f}%  ${max_loan:>9,}  {offer_str}")
    else:
        print(f"{label:<30}  {'—':>7}  {'No offers':>10}")
