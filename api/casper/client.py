"""Casper client configuration for Aurum Protocol.

This module provides the reusable Dev 2 client surface for Casper testnet
interaction. It centralizes environment validation, account configuration,
network checks, and placeholder deploy submission helpers so Dev 1 and Dev 3
can call a single contract/data layer instead of reimplementing Casper setup.

Expected environment variables:
- CASPER_RPC_URL
- CASPER_NETWORK_NAME
- CASPER_PRIVATE_KEY
- CASPER_PUBLIC_KEY
- CASPER_ACCOUNT_HASH

Security assumptions:
- Private keys are injected through environment variables or secret mounts.
- The MVP defaults to Casper testnet and rejects accidental mainnet use unless
  the caller explicitly overrides the environment.
- Contract deployment helpers are intentionally conservative and never sign or
  broadcast on their own in this repository snapshot.

TODO:
- Replace the placeholder deploy payload builder with a concrete Casper Python
  SDK implementation once the team pins the final SDK package and version.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import os
from typing import Any, Dict, Optional

import httpx


class CasperConfigError(RuntimeError):
    """Raised when required Casper configuration is missing or unsafe."""


@dataclass(frozen=True)
class CasperClientConfig:
    """Runtime configuration for the Aurum Casper client."""

    rpc_url: str
    network_name: str
    private_key: str
    public_key: str
    account_hash: str
    request_timeout_seconds: float = 20.0


@dataclass(frozen=True)
class CasperAccountInfo:
    """Minimal account metadata returned to Dev 2 integrations."""

    public_key: str
    account_hash: str
    network_name: str


class CasperClient:
    """Thin HTTP client and config holder for Casper RPC access.

    The implementation avoids inventing SDK calls before the exact package is
    pinned. It still gives the team a stable API for network validation, basic
    account metadata, and mock deploy request construction.
    """

    def __init__(self, config: CasperClientConfig) -> None:
        self.config = config
        self._http = httpx.Client(timeout=config.request_timeout_seconds)
        self._assert_safe_network()

    def get_account_info(self) -> CasperAccountInfo:
        """Return the configured signer identity for diagnostics and scripts."""

        return CasperAccountInfo(
            public_key=self.config.public_key,
            account_hash=self.config.account_hash,
            network_name=self.config.network_name,
        )

    def rpc_status(self) -> Dict[str, Any]:
        """Call the standard JSON-RPC status method for connectivity checks."""

        payload = {"id": 1, "jsonrpc": "2.0", "method": "info_get_status", "params": []}
        response = self._http.post(self.config.rpc_url, json=payload)
        response.raise_for_status()
        return response.json()

    def build_contract_call(
        self,
        contract_hash: str,
        entrypoint: str,
        args: Dict[str, Any],
        payment_amount_motes: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Return a normalized call envelope for later SDK-backed submission.

        This keeps Dev 3 integration work moving even before the final signer
        and SDK details are locked down.
        """

        return {
            "network": self.config.network_name,
            "rpc_url": self.config.rpc_url,
            "signer": asdict(self.get_account_info()),
            "contract_hash": contract_hash,
            "entrypoint": entrypoint,
            "args": args,
            "payment_amount_motes": payment_amount_motes,
            "submission_mode": "todo_sdk_integration",
        }

    def get_cspr_balance(self) -> Dict[str, Any]:
        """Expose a conservative balance lookup placeholder for deploy scripts.

        TODO: Replace this with a real balance query once the final Casper SDK
        and RPC parsing path are pinned.
        """

        return {
            "account_hash": self.config.account_hash,
            "network_name": self.config.network_name,
            "rpc_url": self.config.rpc_url,
            "balance_lookup": "TODO_real_balance_query",
        }

    def close(self) -> None:
        """Close the underlying HTTP client cleanly."""

        self._http.close()

    def _assert_safe_network(self) -> None:
        """Fail fast when the config drifts away from the MVP testnet target."""

        if "test" not in self.config.network_name.lower():
            raise CasperConfigError(
                "Aurum Dev 2 defaults to Casper testnet. Refusing a non-testnet "
                "network without an explicit code change."
            )


def load_client_from_env() -> CasperClient:
    """Build a `CasperClient` from environment variables with strict checks."""

    rpc_url = _require_env("CASPER_RPC_URL")
    network_name = _require_env("CASPER_NETWORK_NAME")
    private_key = _require_env("CASPER_PRIVATE_KEY")
    public_key = _require_env("CASPER_PUBLIC_KEY")
    account_hash = _require_env("CASPER_ACCOUNT_HASH")
    timeout_seconds = float(os.getenv("CASPER_REQUEST_TIMEOUT_SECONDS", "20"))

    return CasperClient(
        CasperClientConfig(
            rpc_url=rpc_url,
            network_name=network_name,
            private_key=private_key,
            public_key=public_key,
            account_hash=account_hash,
            request_timeout_seconds=timeout_seconds,
        )
    )


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise CasperConfigError(f"Missing required environment variable: {name}")
    return value
