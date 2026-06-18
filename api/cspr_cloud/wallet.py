"""CSPR.cloud wallet data wrapper for Aurum Protocol.

Supports `mock` mode for demos and `live` mode that calls CSPR.cloud using the
confirmed endpoint: GET /accounts/{account_identifier}/transfers

Auth: raw API key in `authorization` header (no Bearer prefix).

Environment variables:
- CSPR_CLOUD_KEY          — API key (required in live mode)
- CSPR_CLOUD_BASE_URL     — defaults to https://api.testnet.cspr.cloud
- CSPR_CLOUD_MODE         — "mock" (default) or "live"
- CSPR_CLOUD_TIMEOUT_SECONDS — defaults to 20
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

        # Build auth headers: raw key, no Bearer prefix
        headers: Dict[str, str] = {}
        if config.api_key and config.api_key.strip():
            headers["authorization"] = config.api_key.strip()

        self._http = httpx.Client(
            timeout=config.timeout_seconds,
            headers=headers,
        )

    def _validate_live_key(self) -> None:
        """Raise RuntimeError if live mode but key is missing."""
        if self.config.mode == "live" and not (self.config.api_key and self.config.api_key.strip()):
            raise RuntimeError(
                "CSPR_CLOUD_KEY must be set and non-empty for CSPR_CLOUD_MODE=live"
            )

    def get_wallet_transaction_history(self, account_hash: str) -> Dict[str, Any]:
        """Return normalized transaction history for the given wallet."""
        if self.config.mode != "live":
            return self._mock_history(account_hash)
        self._validate_live_key()
        return self._live_history(account_hash)

    def get_wallet_volume_summary(self, account_hash: str) -> Dict[str, Any]:
        """Summarize inbound/outbound flow and counterparty diversity."""
        history = self.get_wallet_transaction_history(account_hash)
        transfers = history.get("transactions", [])
        inbound = sum(tx["amount_cspr"] for tx in transfers if tx["direction"] == "in")
        outbound = sum(tx["amount_cspr"] for tx in transfers if tx["direction"] == "out")
        counterparties = {tx["counterparty"] for tx in transfers if tx.get("counterparty")}
        return {
            "account_hash": account_hash,
            "mode": history.get("mode", self.config.mode),
            "transaction_count": len(transfers),
            "inbound_cspr": inbound,
            "outbound_cspr": outbound,
            "counterparty_diversity": len(counterparties),
        }

    def get_counterparty_diversity(self, account_hash: str) -> Dict[str, Any]:
        summary = self.get_wallet_volume_summary(account_hash)
        return {
            "account_hash": account_hash,
            "mode": summary["mode"],
            "counterparty_diversity": summary["counterparty_diversity"],
        }

    def get_flow_summary(self, account_hash: str) -> Dict[str, Any]:
        """Return wallet flow in the shape expected by the credit agent."""
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

    def get_liquidity_positions(self, account_hash: str) -> Dict[str, Any]:
        """
        Liquidity positions — CSPR.cloud doesn't have a dedicated endpoint for
        this yet, so we return an empty list in live mode (no guessing paths).
        Mock mode returns demo data.
        """
        if self.config.mode != "live":
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
        # Live: no confirmed endpoint — return empty, defi score will be 0
        return {"account_hash": account_hash, "mode": "live", "positions": []}

    def _live_history(self, account_hash: str) -> Dict[str, Any]:
        """Fetch real transfer history from CSPR.cloud.

        CSPR.cloud accepts both public key (01abc...) and bare account hash
        (e1b7...) in the URL. Transfer records always use bare account hashes
        in to_account_hash / initiator_account_hash fields. We normalize the
        query identifier to bare hash form for direction comparison.
        """
        # Strip account-hash- prefix for URL and comparison
        bare_hash = account_hash.lower().replace("account-hash-", "").strip()
        url = f"{self.config.base_url.rstrip('/')}/accounts/{bare_hash}/transfers"
        response = self._http.get(url)
        response.raise_for_status()
        payload = response.json()

        raw_items = payload.get("data", []) or []
        # Pass bare_hash for direction comparison since API returns bare hashes
        transactions = [self._normalize_transaction(item, bare_hash) for item in raw_items]

        return {
            "account_hash": account_hash,
            "bare_hash": bare_hash,
            "mode": "live",
            "transactions": transactions,
        }

    def _mock_history(self, account_hash: str) -> Dict[str, Any]:
        """Deterministic demo wallet data."""
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
            {
                "tx_hash": "mock-tx-4",
                "timestamp": "2026-06-09T00:00:00Z",
                "amount_cspr": 15.0,
                "direction": "out",
                "counterparty": "account-hash-dex-2",
            },
            {
                "tx_hash": "mock-tx-5",
                "timestamp": "2026-06-10T00:00:00Z",
                "amount_cspr": 200.0,
                "direction": "in",
                "counterparty": "account-hash-client-2",
            },
        ]
        return {
            "account_hash": account_hash,
            "mode": "mock",
            "transactions": transactions,
        }

    def _normalize_transaction(self, item: Dict[str, Any], account_hash: str) -> Dict[str, Any]:
        """
        Normalize a raw CSPR.cloud transfer record.
        - amount: motes -> CSPR (÷ 1_000_000_000)
        - direction: derived from to_account_hash / initiator_account_hash

        account_hash should be the BARE hash (no account-hash- prefix, lowercase)
        because CSPR.cloud returns bare hashes in transfer records.
        """
        # Amount: motes to CSPR
        raw_amount = item.get("amount")
        try:
            amount_cspr = float(raw_amount) / 1_000_000_000 if raw_amount is not None else 0.0
        except (TypeError, ValueError):
            amount_cspr = 0.0

        def _bare(h: str) -> str:
            return h.lower().replace("account-hash-", "").strip() if h else ""

        to_bare = _bare(item.get("to_account_hash") or "")
        from_bare = _bare(item.get("initiator_account_hash") or "")
        query_bare = _bare(account_hash)

        is_to = bool(to_bare) and to_bare == query_bare
        is_from = bool(from_bare) and from_bare == query_bare

        if is_to and is_from:
            direction = "self"
        elif is_to:
            direction = "in"
        elif is_from:
            direction = "out"
        else:
            direction = "unknown"

        counterparty = to_bare if direction == "out" else from_bare

        return {
            "tx_hash": item.get("deploy_hash") or item.get("hash") or "unknown",
            "timestamp": item.get("timestamp") or item.get("block_time") or "unknown",
            "amount_cspr": amount_cspr,
            "direction": direction,
            "counterparty": counterparty or "unknown",
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
