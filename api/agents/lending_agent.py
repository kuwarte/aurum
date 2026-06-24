"""
LENDING AGENT: DYNAMIC LOAN MATCHING

Computes loan offers dynamically from the wallet's actual credit score,
default probability, and borrowing limit. Protocol names are illustrative
(no live API integration yet) but all numeric terms — rate, max_loan —
are derived from real pipeline outputs so they change per wallet.

Rate formula:
  base_rate = tier_floor + (1 - score_within_tier) * tier_spread
  risk_premium = default_prob_30d * 100 * 0.5  (capped at 5%)
  final_rate = base_rate + risk_premium, rounded to 1dp

Max loan formula:
  borrowing_limit_motes from attestation agent (tier_limits A/B/C/D)
  converted to USD-equivalent at ~0.05 USD/CSPR (testnet estimate)
  capped per tier for sensible display

LLM personalises the recommendation text. Falls back to rule-based text.
"""

from pipeline.state import PipelineState
from agents.utils.llm_utils import AgentLLM, Prompts

# ─── Tier configuration ───────────────────────────────────────────────────────

# (score_floor, score_ceil, base_rate_pct, rate_spread_pct, pool_names)
TIER_CONFIG = {
    "A": (750, 1000, 6.0,  3.0,  ["TrueFi",    "Aurum Prime Desk",  "Maple"]),
    "B": (600,  749, 9.5,  4.5,  ["Maple",     "Clearpool",         "Aurum Growth"]),
    "C": (450,  599, 14.0, 5.0,  ["Clearpool", "Aurum Bridge"]),
    "D": (0,    449, 22.0, 6.0,  ["Aurum Starter"]),
}

# Max loan USD caps per tier (upper bound for display)
TIER_MAX_LOAN_USD = {
    "A": 50_000,
    "B": 20_000,
    "C":  5_000,
    "D":    500,
}

# Motes per CSPR, USD per CSPR (testnet estimate for display only)
MOTES_PER_CSPR = 1_000_000_000
CSPR_USD_RATE  = 0.05


def _compute_rate(tier: str, score: int, default_prob: float) -> float:
    """Compute APR from tier, score position within tier, and default prob."""
    cfg = TIER_CONFIG.get(tier)
    if not cfg:
        return 0.0
    score_floor, score_ceil, base_rate, spread, _ = cfg
    tier_range = max(score_ceil - score_floor, 1)
    # Position within tier: 1.0 = bottom of tier, 0.0 = top of tier
    position = max(0.0, min(1.0, (score_ceil - score) / tier_range))
    risk_premium = min(default_prob * 100 * 0.5, 5.0)
    rate = base_rate + position * spread + risk_premium
    return round(rate, 1)


def _compute_max_loan(tier: str, borrowing_limit_motes: int) -> int:
    """
    Convert borrowing_limit_motes to a USD-equivalent display amount.
    Uses the tier ceiling as minimum to avoid unrealistically tiny numbers
    when testnet CSPR has very low USD value.
    """
    tier_min = {
        "A": 25_000,
        "B": 10_000,
        "C":  2_500,
        "D":    500,
    }
    cap = TIER_MAX_LOAN_USD.get(tier, 0)
    floor = tier_min.get(tier, 0)

    if borrowing_limit_motes and borrowing_limit_motes > 0:
        cspr_amount = borrowing_limit_motes / MOTES_PER_CSPR
        usd_amount  = int(cspr_amount * CSPR_USD_RATE)
        # Use computed value if it's meaningful, otherwise use tier floor
        computed = max(floor, min(usd_amount, cap))
        return computed

    return floor


def _build_offers(tier: str, rate: float, max_loan: int) -> list:
    """Build offer list for the tier using derived rate and amount."""
    cfg = TIER_CONFIG.get(tier)
    if not cfg or not cfg[4]:
        return []

    pool_names = cfg[4]
    offers = []

    for i, protocol in enumerate(pool_names):
        # Each additional offer is slightly worse than the best
        offer_rate  = round(rate + i * 0.8, 1)
        offer_loan  = max(500, int(max_loan * (1.0 - i * 0.25)))
        offers.append({
            "protocol":  protocol,
            "rate":      f"{offer_rate}%",
            "max_loan":  offer_loan,
        })

    return offers


# ─── Agent ────────────────────────────────────────────────────────────────────

def lending_agent(state: PipelineState) -> PipelineState:
    """
    Dynamic loan matching: all numeric offer terms are derived from the
    wallet's actual credit score, default probability, and borrowing limit.
    """
    tier             = state["risk_tier"]
    score            = state["credit_score"]
    default_prob     = state.get("default_prob_30d", 0.0)
    fraud_score      = state.get("fraud_score", 0.0)
    borrowing_motes  = state.get("borrowing_limit_motes", 0)

    # Tier D gets a restricted offer (high rate, small limit)
    # No tier is completely locked out — even thin wallets get a starter offer

    # Compute dynamic rate and amount
    rate     = _compute_rate(tier, score, default_prob)
    max_loan = _compute_max_loan(tier, borrowing_motes)
    offers   = _build_offers(tier, rate, max_loan)

    # LLM personalises recommendation text
    llm    = AgentLLM.get_llm("GROQ_API_KEY_1")
    prompt = Prompts.lending_recommendation(score, tier, default_prob, fraud_score, offers)
    result = AgentLLM.invoke_llm(llm, prompt)

    if result:
        lending_recommendation = result.get("recommendation", "")
    else:
        lending_recommendation = ""

    if not lending_recommendation:
        best = offers[0]
        if tier == "D":
            lending_recommendation = (
                f"Restricted offer available: {best['protocol']} at {best['rate']} APR "
                f"up to ${best['max_loan']:,}. "
                "Build wallet history and repayment track record to qualify for better terms."
            )
        else:
            lending_recommendation = (
                f"Best match for Tier {tier}: {best['protocol']} at {best['rate']} "
                f"APR up to ${best['max_loan']:,}. "
                f"Score {score}/1000 — "
                f"{'strong standing, consider negotiating terms.' if score >= 700 else 'build wallet history to improve terms.'}"
            )

    return {
        **state,
        "loan_offers": offers,
        "lending_recommendation": lending_recommendation,
    }
