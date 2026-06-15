"""CSPR.cloud wallet data wrapper for Aurum Protocol.

This module normalizes wallet-level activity for the Credit Agent and related
Dev 3 scoring flows. It supports `mock` mode for hackathon demos and a guarded
`live` mode that calls CSPR.cloud only when server-side configuration is
present. The output shape is intentionally stable so the scoring pipeline can
depend on it regardless of mode.

Expected environment variables:
- CSPR_CLOUD_KEY
- CSPR_CLOUD_BASE_URL
- CSPR_CLOUD_MODE

Security assumptions:
- API keys remain server-side.
- Mock output is labeled clearly so downstream consumers do not mistake it for
  production-grade indexed data.

TODO:
- Replace the placeholder REST path with the final endpoint confirmed from
  project-specific CSPR.cloud integration tests.
"""

from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any, Dict, List

import httpx


@dataclass(frozen=True)
class CsprCloudConfig:
    """Runtime configuration for wallet data access."""

    api_key: str
    base_url: str
    mode: str
    timeout_seconds: float = 20.0


class WalletDataService:
    """Fetch and normalize wallet activity metrics for Aurum."""

    def __init__(self, config: CsprCloudConfig) -> None:
        self.config = config
        self._http = httpx.Client(
            timeout=config.timeout_seconds,
            headers={"Authorization": f"Bearer {config.api_key}"} if config.api_key else {},
        )

    def get_wallet_transaction_history(self, account_hash: str) -> Dict[str, Any]:
        """Return normalized transaction history for the given wallet."""

        if self.config.mode == "mock":
            return self._mock_history(account_hash)
        return self._live_history(account_hash)

    def get_wallet_volume_summary(self, account_hash: str) -> Dict[str, Any]:
        """Summarize inbound and outbound transfer flow for scoring."""

        history = self.get_wallet_transaction_history(account_hash)
        transfers = history["transactions"]
        inbound = sum(tx["amount_cspr"] for tx in transfers if tx["direction"] == "in")
        outbound = sum(tx["amount_cspr"] for tx in transfers if tx["direction"] == "out")
        counterparties = {tx["counterparty"] for tx in transfers}
        return {
            "account_hash": account_hash,
            "mode": history["mode"],
            "transaction_count": len(transfers),
            "inbound_cspr": inbound,
            "outbound_cspr": outbound,
            "counterparty_diversity": len(counterparties),
        }

    def get_counterparty_diversity(self, account_hash: str) -> Dict[str, Any]:
        """Return a dedicated diversity metric for fraud and reputation checks."""

        summary = self.get_wallet_volume_summary(account_hash)
        return {
            "account_hash": account_hash,
            "mode": summary["mode"],
            "counterparty_diversity": summary["counterparty_diversity"],
        }

    def get_flow_summary(self, account_hash: str) -> Dict[str, Any]:
        """Return wallet flow data in the format expected by Dev 3 agents."""

        summary = self.get_wallet_volume_summary(account_hash)
        return {
            "account_hash": account_hash,
            "mode": summary["mode"],
            "asset_breakdown": {
                "CSPR": {
                    "inbound": summary["inbound_cspr"],
                    "outbound": summary["outbound_cspr"],
                }
            },
            "counterparty_diversity": summary["counterparty_diversity"],
        }

    def _live_history(self, account_hash: str) -> Dict[str, Any]:
        """Fetch live wallet activity from a configurable CSPR.cloud route.

        The route is left configurable because the repo does not yet pin a
        single endpoint shape. This avoids encoding guessed paths as if they
        were authoritative.
        """

        path_template = os.getenv("CSPR_CLOUD_WALLET_ACTIVITY_PATH")
        if not path_template:
            raise RuntimeError(
                "CSPR_CLOUD_WALLET_ACTIVITY_PATH must be set for live wallet mode. "
                "Use mock mode if the final CSPR.cloud route is not pinned yet."
            )
        route = path_template.format(account_hash=account_hash)
        response = self._http.get(f"{self.config.base_url.rstrip('/')}/{route.lstrip('/')}")
        response.raise_for_status()
        payload = response.json()
        transactions = payload.get("data", [])
        return {
            "account_hash": account_hash,
            "mode": "live",
            "transactions": [self._normalize_transaction(item) for item in transactions],
            "warning": "Live CSPR.cloud mode depends on the configured route template.",
        }

    def _mock_history(self, account_hash: str) -> Dict[str, Any]:
        """Return demo-safe wallet data when live CSPR.cloud is unavailable."""

        transactions: List[Dict[str, Any]] = [
            {
                "tx_hash": "mock-tx-1",
                "timestamp": "2026-06-01T00:00:00Z",
                "amount_cspr": 125.0,
                "direction": "in",
                "counterparty": "account-hash-vendor-1",
            },
            {
                "tx_hash": "mock-tx-2",
                "timestamp": "2026-06-05T00:00:00Z",
                "amount_cspr": 32.5,
                "direction": "out",
                "counterparty": "account-hash-dex-1",
            },
            {
                "tx_hash": "mock-tx-3",
                "timestamp": "2026-06-08T00:00:00Z",
                "amount_cspr": 40.0,
                "direction": "in",
                "counterparty": "account-hash-client-1",
            },
        ]
        return {
            "account_hash": account_hash,
            "mode": "mock",
            "transactions": transactions,
            "warning": "Mock/demo wallet history in use; replace with live CSPR.cloud data for production.",
        }

    def _normalize_transaction(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "tx_hash": item.get("hash") or item.get("deploy_hash") or "unknown",
            "timestamp": item.get("timestamp") or item.get("block_time") or "unknown",
            "amount_cspr": float(item.get("amount") or item.get("amount_cspr") or 0),
            "direction": item.get("direction") or "unknown",
            "counterparty": item.get("counterparty") or item.get("from") or item.get("to") or "unknown",
        }


def load_wallet_service_from_env() -> WalletDataService:
    """Build the wallet service from environment configuration."""

    return WalletDataService(
        CsprCloudConfig(
            api_key=os.getenv("CSPR_CLOUD_KEY", ""),
            base_url=os.getenv("CSPR_CLOUD_BASE_URL", "https://api.testnet.cspr.cloud"),
            mode=os.getenv("CSPR_CLOUD_MODE", "mock"),
            timeout_seconds=float(os.getenv("CSPR_CLOUD_TIMEOUT_SECONDS", "20")),
        )
    )
