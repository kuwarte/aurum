"""Aurum Casper data-layer package.

This package contains Dev 2-owned helpers for Casper testnet configuration,
contract interaction wrappers, and x402 payment-proof handling. The modules are
designed for server-side use only because they may read private key paths,
treasury configuration, and contract hashes from environment variables.
"""

from .client import CasperClient, CasperClientConfig, CasperConfigError, load_client_from_env
from .contracts import AurumContracts, load_contracts_from_env
from .x402 import X402Mode, X402PaymentProof, X402Verifier, load_x402_verifier_from_env

__all__ = [
    "AurumContracts",
    "CasperClient",
    "CasperClientConfig",
    "CasperConfigError",
    "X402Mode",
    "X402PaymentProof",
    "X402Verifier",
    "load_client_from_env",
    "load_contracts_from_env",
    "load_x402_verifier_from_env",
]
