"""x402 payment-proof handling for Aurum's Casper-backed oracle.

This module isolates the MVP payment-verification boundary. In `mock` mode it
verifies deadlines, receiver, network, nonce uniqueness, and minimum payment
amount without claiming that real facilitator settlement is happening. In
`live` mode it prepares the request/response surface needed for future
facilitator integration, but still requires follow-up implementation.

Expected environment variables:
- X402_MODE
- X402_FACILITATOR_URL
- X402_TREASURY_ACCOUNT
- X402_QUERY_PRICE_CSPR
- X402_NETWORK
- CASPER_NETWORK_NAME

Security assumptions:
- Proof verification always happens server-side.
- The nonce cache is only an MVP in-memory replay barrier and must be replaced
  with durable storage before production.

TODO:
- Replace simulated verification with real facilitator settlement validation.
- Add durable nonce storage and idempotency persistence before production.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from decimal import Decimal, InvalidOperation
from enum import Enum
from typing import Any, Dict, Set
import os
import time


class X402Mode(str, Enum):
    """Supported x402 execution modes."""

    MOCK = "mock"
    LIVE = "live"


class X402VerificationError(RuntimeError):
    """Raised when a payment proof is invalid or unsafe to accept."""


@dataclass(frozen=True)
class X402PaymentProof:
    """Normalized payment proof that can later map to facilitator schemas."""

    payer_account: str
    receiver_account: str
    amount_cspr: str
    nonce: str
    deadline_epoch_seconds: int
    network: str
    signature: str
    payment_reference: str


@dataclass(frozen=True)
class X402VerifierConfig:
    """Verifier configuration loaded from the environment."""

    mode: X402Mode
    facilitator_url: str
    treasury_account: str
    query_price_cspr: Decimal
    network: str


class X402Verifier:
    """Server-side verifier for Aurum's x402 proof flow."""

    def __init__(self, config: X402VerifierConfig) -> None:
        self.config = config
        self._used_nonces: Set[str] = set()

    def build_payment_requirement(self) -> Dict[str, Any]:
        """Return the metadata a protected endpoint should expose in HTTP 402."""

        return {
            "mode": self.config.mode.value,
            "network": self.config.network,
            "asset": "CSPR",
            "amount_cspr": str(self.config.query_price_cspr),
            "receiver_account": self.config.treasury_account,
            "facilitator_url": self.config.facilitator_url,
            "warning": (
                "Mock verification is active; payment settlement is simulated."
                if self.config.mode == X402Mode.MOCK
                else "Live mode is configured but facilitator verification still requires implementation."
            ),
        }

    def build_mock_proof(self, payer_account: str, nonce: str, ttl_seconds: int = 300) -> X402PaymentProof:
        """Create a local/demo proof for manual test flows and documentation."""

        deadline = int(time.time()) + ttl_seconds
        return X402PaymentProof(
            payer_account=payer_account,
            receiver_account=self.config.treasury_account,
            amount_cspr=str(self.config.query_price_cspr),
            nonce=nonce,
            deadline_epoch_seconds=deadline,
            network=self.config.network,
            signature="mock-signature",
            payment_reference=f"mock:{nonce}",
        )

    def verify(self, proof: X402PaymentProof) -> Dict[str, Any]:
        """Verify a proof and return normalized audit metadata.

        The function is strict about replay, expiry, amount, receiver, and
        network checks in both modes. `live` mode intentionally stops short of
        claiming facilitator settlement success until the real API is wired in.
        """

        now = int(time.time())
        if proof.deadline_epoch_seconds <= now:
            raise X402VerificationError("x402 payment proof expired")
        if proof.receiver_account != self.config.treasury_account:
            raise X402VerificationError("x402 receiver mismatch")
        if proof.network != self.config.network:
            raise X402VerificationError("x402 network mismatch")
        if proof.nonce in self._used_nonces:
            raise X402VerificationError("x402 nonce already used")

        amount = _parse_decimal(proof.amount_cspr)
        if amount < self.config.query_price_cspr:
            raise X402VerificationError("x402 payment below required query price")

        self._used_nonces.add(proof.nonce)
        result = {
            "mode": self.config.mode.value,
            "verified": True,
            "payer_account": proof.payer_account,
            "receiver_account": proof.receiver_account,
            "amount_cspr": str(amount),
            "nonce": proof.nonce,
            "payment_reference": proof.payment_reference,
        }
        if self.config.mode == X402Mode.LIVE:
            result["todo"] = (
                "TODO: Replace placeholder success with real facilitator "
                "verification, replay persistence, and settlement validation."
            )
        return result

    def dump_config(self) -> Dict[str, Any]:
        """Return a JSON-safe view of the verifier configuration."""

        data = asdict(self.config)
        data["mode"] = self.config.mode.value
        data["query_price_cspr"] = str(self.config.query_price_cspr)
        return data


def load_x402_verifier_from_env() -> X402Verifier:
    """Load verifier settings from environment variables."""

    mode = X402Mode(os.getenv("X402_MODE", X402Mode.MOCK.value))
    facilitator_url = os.getenv("X402_FACILITATOR_URL", "https://todo-facilitator.example")
    treasury_account = _require_env("X402_TREASURY_ACCOUNT")
    query_price_cspr = _parse_decimal(os.getenv("X402_QUERY_PRICE_CSPR", "1.50"))
    network = os.getenv("X402_NETWORK") or _require_env("CASPER_NETWORK_NAME")
    return X402Verifier(
        X402VerifierConfig(
            mode=mode,
            facilitator_url=facilitator_url,
            treasury_account=treasury_account,
            query_price_cspr=query_price_cspr,
            network=network,
        )
    )


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise X402VerificationError(f"Missing required environment variable: {name}")
    return value


def _parse_decimal(raw_value: str) -> Decimal:
    try:
        value = Decimal(raw_value)
    except (InvalidOperation, TypeError) as exc:
        raise X402VerificationError(f"Invalid decimal value: {raw_value}") from exc
    if value <= 0:
        raise X402VerificationError("x402 payment amount must be positive")
    return value
