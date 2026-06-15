"""CSPR.cloud DeFi and RWA data wrapper for Aurum Protocol.

This module packages DeFi-like activity into stable normalized structures for
Dev 3's risk, fraud, and reputation analysis. Like the wallet wrapper, it
supports both mock/demo mode and a configurable live mode without hardcoding
unverified endpoint paths.

Expected environment variables:
- CSPR_CLOUD_KEY
- CSPR_CLOUD_BASE_URL
- CSPR_CLOUD_MODE

TODO:
- Confirm and pin the final CSPR.cloud routes used for pool, loan, repayment,
  and RWA activity so live mode can move beyond configurable templates.
"""

from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any, Dict, List

import httpx


@dataclass(frozen=True)
class CsprCloudDefiConfig:
    """Runtime configuration for DeFi data access."""

    api_key: str
    base_url: str
    mode: str
    timeout_seconds: float = 20.0


class DeFiDataService:
    """Fetch and normalize DeFi/RWA activity for Aurum agents."""

    def __init__(self, config: CsprCloudDefiConfig) -> None:
        self.config = config
        self._http = httpx.Client(
            timeout=config.timeout_seconds,
            headers={"Authorization": f"Bearer {config.api_key}"} if config.api_key else {},
        )

    def get_liquidity_positions(self, account_hash: str) -> Dict[str, Any]:
        if self.config.mode == "mock":
            return self._mock_dataset(account_hash)
        return self._live_dataset(account_hash, "CSPR_CLOUD_DEFI_POSITIONS_PATH")

    def get_loan_records(self, account_hash: str) -> Dict[str, Any]:
        if self.config.mode == "mock":
            dataset = self._mock_dataset(account_hash)
            return {"account_hash": account_hash, "mode": "mock", "loans": dataset["loans"]}
        payload = self._live_dataset(account_hash, "CSPR_CLOUD_LOANS_PATH")
        return {"account_hash": account_hash, "mode": "live", "loans": payload.get("data", [])}

    def get_repayment_events(self, account_hash: str) -> Dict[str, Any]:
        if self.config.mode == "mock":
            dataset = self._mock_dataset(account_hash)
            return {
                "account_hash": account_hash,
                "mode": "mock",
                "repayment_events": dataset["repayment_events"],
            }
        payload = self._live_dataset(account_hash, "CSPR_CLOUD_REPAYMENTS_PATH")
        return {
            "account_hash": account_hash,
            "mode": "live",
            "repayment_events": payload.get("data", []),
        }

    def get_yield_events(self, account_hash: str) -> Dict[str, Any]:
        if self.config.mode == "mock":
            dataset = self._mock_dataset(account_hash)
            return {"account_hash": account_hash, "mode": "mock", "yield_events": dataset["yield_events"]}
        payload = self._live_dataset(account_hash, "CSPR_CLOUD_YIELD_PATH")
        return {"account_hash": account_hash, "mode": "live", "yield_events": payload.get("data", [])}

    def get_rwa_events(self, account_hash: str) -> Dict[str, Any]:
        if self.config.mode == "mock":
            dataset = self._mock_dataset(account_hash)
            return {"account_hash": account_hash, "mode": "mock", "rwa_events": dataset["rwa_events"]}
        payload = self._live_dataset(account_hash, "CSPR_CLOUD_RWA_PATH")
        return {"account_hash": account_hash, "mode": "live", "rwa_events": payload.get("data", [])}

    def _live_dataset(self, account_hash: str, env_name: str) -> Dict[str, Any]:
        path_template = os.getenv(env_name)
        if not path_template:
            raise RuntimeError(
                f"{env_name} must be set for live CSPR.cloud DeFi mode. "
                "Use mock mode if the final route is not pinned yet."
            )
        route = path_template.format(account_hash=account_hash)
        response = self._http.get(f"{self.config.base_url.rstrip('/')}/{route.lstrip('/')}")
        response.raise_for_status()
        return response.json()

    def _mock_dataset(self, account_hash: str) -> Dict[str, Any]:
        return {
            "account_hash": account_hash,
            "mode": "mock",
            "positions": [
                {"protocol": "AurumSwap", "pool": "CSPR-USDC", "liquidity_usd": 2500.0, "status": "active"}
            ],
            "loans": [
                {"protocol": "AurumLend", "loan_id": "mock-loan-1", "principal_cspr": 150.0, "status": "repaid"}
            ],
            "repayment_events": [
                {"loan_id": "mock-loan-1", "timestamp": "2026-05-28T00:00:00Z", "amount_cspr": 155.0}
            ],
            "yield_events": [
                {"protocol": "AurumStake", "timestamp": "2026-06-03T00:00:00Z", "reward_cspr": 4.5}
            ],
            "rwa_events": [
                {"asset_id": "mock-invoice-1", "timestamp": "2026-06-07T00:00:00Z", "value_usd": 1200.0}
            ],
            "warning": "Mock/demo DeFi dataset in use; replace with live CSPR.cloud routes for production.",
        }


def load_defi_service_from_env() -> DeFiDataService:
    """Build the DeFi service from environment configuration."""

    return DeFiDataService(
        CsprCloudDefiConfig(
            api_key=os.getenv("CSPR_CLOUD_KEY", ""),
            base_url=os.getenv("CSPR_CLOUD_BASE_URL", "https://api.testnet.cspr.cloud"),
            mode=os.getenv("CSPR_CLOUD_MODE", "mock"),
            timeout_seconds=float(os.getenv("CSPR_CLOUD_TIMEOUT_SECONDS", "20")),
        )
    )
