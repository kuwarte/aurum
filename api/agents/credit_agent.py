"""
CREDIT AGENT: XGBOOST CREDIT SCORING

Pulls wallet data from CSPR.cloud (or mock) and runs XGBoost-based credit
scoring to produce a 0-1000 composite score with SHAP-based feature breakdown.
"""

import logging
import math
from pipeline.state import PipelineState
from scoring.model import get_model
from scoring.shap_explain import explain_score
from cspr_cloud.wallet import load_wallet_service_from_env
from cspr_cloud.defi import load_defi_service_from_env

logger = logging.getLogger(__name__)


def _compute_wallet_activity(volume_summary: dict) -> int:
    """
    wallet_activity = floor(tx_count / 2) + min(50, counterparty_diversity)
    clamped to [0, 100]
    """
    tx_count = volume_summary.get("transaction_count", 0) or 0
    diversity = volume_summary.get("counterparty_diversity", 0) or 0
    score = math.floor(tx_count / 2) + min(50, diversity)
    return max(0, min(100, score))


def _compute_repayment(loans: list, repayments: list) -> int:
    """
    repayment = floor((repayment_count / max(loan_count, 1)) * 100)
    If no loans, neutral 50.
    """
    loan_count = len(loans)
    if loan_count == 0:
        return 50
    repayment_count = len(repayments)
    return max(0, min(100, math.floor((repayment_count / loan_count) * 100)))


def _compute_defi(positions: list) -> int:
    """defi = min(100, position_count * 20)"""
    return max(0, min(100, len(positions) * 20))


def _compute_income(flow_summary: dict) -> int:
    """
    income = floor((inbound / max(inbound + outbound, 1)) * 100)
    clamped to [0, 100]
    """
    breakdown = flow_summary.get("asset_breakdown", {}).get("CSPR", {})
    inbound = breakdown.get("inbound", 0) or 0
    outbound = breakdown.get("outbound", 0) or 0
    total = max(inbound + outbound, 1)
    return max(0, min(100, math.floor((inbound / total) * 100)))


def _compute_rwa(rwa_events: list) -> int:
    """rwa = min(100, rwa_event_count * 25)"""
    return max(0, min(100, len(rwa_events) * 25))


def _compute_dao(yield_events: list) -> int:
    """dao = min(100, yield_event_count * 15) — proxy until DAO data source is available"""
    return max(0, min(100, len(yield_events) * 15))


def credit_agent(state: PipelineState) -> PipelineState:
    """
    Score a wallet using real CSPR.cloud data + XGBoost.
    Falls back to neutral 50s for all dimensions on any service error.
    """
    wallet_address = state["wallet_address"]

    # Load services from env (mock or live based on CSPR_CLOUD_MODE)
    wallet_svc = load_wallet_service_from_env()
    defi_svc = load_defi_service_from_env()

    # Neutral fallback values
    neutral = {
        "repayment": 50,
        "wallet_activity": 50,
        "defi": 50,
        "dao": 50,
        "rwa": 50,
        "income": 50,
    }

    raw_wallet_data = {"wallet_address": wallet_address}

    try:
        # Fetch wallet data
        volume_summary = wallet_svc.get_wallet_volume_summary(wallet_address)
        flow_summary = wallet_svc.get_flow_summary(wallet_address)
        raw_wallet_data["volume_summary"] = volume_summary
        raw_wallet_data["flow_summary"] = flow_summary
    except Exception as exc:
        logger.warning(
            "WalletDataService.get_wallet_volume_summary/get_flow_summary failed for %s: %s",
            wallet_address, exc
        )
        model = get_model()
        credit_score, sub_scores = model.predict(neutral)
        shap_breakdown = explain_score(neutral)
        return {
            **state,
            "raw_wallet_data": raw_wallet_data,
            "credit_score": credit_score,
            "sub_scores": sub_scores,
            "shap_breakdown": shap_breakdown,
        }

    try:
        # Fetch liquidity positions (on wallet service)
        positions_data = wallet_svc.get_liquidity_positions(wallet_address) \
            if hasattr(wallet_svc, "get_liquidity_positions") else {"positions": []}
        raw_wallet_data["positions"] = positions_data
    except Exception as exc:
        logger.warning("WalletDataService.get_liquidity_positions failed for %s: %s", wallet_address, exc)
        positions_data = {"positions": []}

    try:
        # Fetch DeFi data
        loans_data = defi_svc.get_loan_records(wallet_address)
        repayments_data = defi_svc.get_repayment_events(wallet_address)
        yield_data = defi_svc.get_yield_events(wallet_address)
        rwa_data = defi_svc.get_rwa_events(wallet_address)
        raw_wallet_data["loans"] = loans_data
        raw_wallet_data["repayments"] = repayments_data
        raw_wallet_data["yield"] = yield_data
        raw_wallet_data["rwa"] = rwa_data
    except Exception as exc:
        logger.warning("DeFiDataService call failed for %s: %s", wallet_address, exc)
        loans_data = {"loans": []}
        repayments_data = {"repayment_events": []}
        yield_data = {"yield_events": []}
        rwa_data = {"rwa_events": []}

    # Extract lists for scoring
    positions = positions_data.get("positions", []) if isinstance(positions_data, dict) else []
    loans = loans_data.get("loans", []) if isinstance(loans_data, dict) else []
    repayments = repayments_data.get("repayment_events", []) if isinstance(repayments_data, dict) else []
    yield_events = yield_data.get("yield_events", []) if isinstance(yield_data, dict) else []
    rwa_events = rwa_data.get("rwa_events", []) if isinstance(rwa_data, dict) else []

    # Compute the 6 scoring dimensions
    wallet_features = {
        "wallet_activity": _compute_wallet_activity(volume_summary),
        "repayment": _compute_repayment(loans, repayments),
        "defi": _compute_defi(positions),
        "income": _compute_income(flow_summary),
        "rwa": _compute_rwa(rwa_events),
        "dao": _compute_dao(yield_events),
    }

    model = get_model()
    credit_score, sub_scores = model.predict(wallet_features)
    shap_breakdown = explain_score(wallet_features)

    return {
        **state,
        "raw_wallet_data": raw_wallet_data,
        "credit_score": credit_score,
        "sub_scores": sub_scores,
        "shap_breakdown": shap_breakdown,
    }
