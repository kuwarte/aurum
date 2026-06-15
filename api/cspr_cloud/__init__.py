"""Aurum CSPR.cloud wrappers for Dev 2.

The package exposes normalized wallet and DeFi data helpers that support both
mock/demo mode and future live CSPR.cloud integration. These modules are safe
to import from the backend only because they rely on server-side API keys.
"""

from .defi import DeFiDataService, load_defi_service_from_env
from .wallet import WalletDataService, load_wallet_service_from_env

__all__ = [
    "DeFiDataService",
    "WalletDataService",
    "load_defi_service_from_env",
    "load_wallet_service_from_env",
]
