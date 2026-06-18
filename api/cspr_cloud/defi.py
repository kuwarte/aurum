"""CSPR.cloud DeFi and RWA data wrapper for Aurum Protocol.

In live mode, DeFi-specific routes are not available on CSPR.cloud's public
testnet API (no loan/repayment/yield/RWA endpoints confirmed). Live mode
returns empty lists for these — scoring dimensions will be 0 or neutral until
real endpoints are available.

Auth: raw API key in `authorization` header (no Bearer prefix).

Environment variables:
- CSPR_CLOUD_KEY
- CSPR_CLOUD_BASE_URL
- CSPR_CLOUD_MODE
- CSPR_CLOUD_TIMEOUT_SECONDS
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

        headers: Dict[str, str] = {}
        if config.api_key and config.api_key.strip():
            headers["authorization"] = config.api_key.strip()

        self._http = httpx.Client(
            timeout=config.timeout_seconds,
            headers=headers,
        )

    def _validate_live_key(self) -> None:
        if self.config.mode == "live" and not (self.config.api_key and self.config.api_key.strip()):
            raise RuntimeError(
                "CSPR_CLOUD_KEY must be set and non-empty for CSPR_CLOUD_MODE=live"
            )

    def get_liquidity_positions(self, account_hash: str) -> Dict[str, Any]:
        if self.config.mode != "live":
            return self._mock_positions(account_hash)
        # No confirmed CSPR.cloud endpoint for DeFi positions
        return {"account_hash": account_hash, "mode": "live", "positions": []}

    def get_loan_records(self, account_hash: str) -> Dict[str, Any]:
        if self.config.mode != "live":
            return {
                "account_hash": account_hash,
                "mode": "mock",
                "loans": self._mock_dataset(account_hash)["loans"],
            }
        return {"account_hash": account_hash, "mode": "live", "loans": []}

    def get_repayment_events(self, account_hash: str) -> Dict[str, Any]:
        if self.config.mode != "live":
            return {
                "account_hash": account_hash,
                "mode": "mock",
                "repayment_events": self._mock_dataset(account_hash)["repayment_events"],
            }
        return {"account_hash": account_hash, "mode": "live", "repayment_events": []}

    def get_yield_events(self, account_hash: str) -> Dict[str, Any]:
        if self.config.mode != "live":
            return {
                "account_hash": account_hash,
                "mode": "mock",
                "yield_events": self._mock_dataset(account_hash)["yield_events"],
            }
        return {"account_hash": account_hash, "mode": "live", "yield_events": []}

    def get_rwa_events(self, account_hash: str) -> Dict[str, Any]:
        if self.config.mode != "live":
            return {
                "account_hash": account_hash,
                "mode": "mock",
                "rwa_events": self._mock_dataset(account_hash)["rwa_events"],
            }
        return {"account_hash": account_hash, "mode": "live", "rwa_events": []}

    def _mock_positions(self, account_hash: str) -> Dict[str, Any]:
        return {
            "account_hash": account_hash,
            "mode": "mock",
            "positions": [
                {
                    "protocol": "AurumSwap",
                    "pool": "CSPR-USDC",
                    "liquidity_usd": 2500.0,
                    "status": "active",
                }
            ],
        }

    def _mock_dataset(self, account_hash: str) -> Dict[str, Any]:
        return {
            "loans": [
                {
                    "protocol": "AurumLend",
                    "loan_id": "mock-loan-1",
                    "principal_cspr": 150.0,
                    "status": "repaid",
                }
            ],
            "repayment_events": [
                {
                    "loan_id": "mock-loan-1",
                    "timestamp": "2026-05-28T00:00:00Z",
                    "amount_cspr": 155.0,
                }
            ],
            "yield_events": [
                {
                    "protocol": "AurumStake",
                    "timestamp": "2026-06-03T00:00:00Z",
                    "reward_cspr": 4.5,
                }
            ],
            "rwa_events": [
                {
                    "asset_id": "mock-invoice-1",
                    "timestamp": "2026-06-07T00:00:00Z",
                    "value_usd": 1200.0,
                }
            ],
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
