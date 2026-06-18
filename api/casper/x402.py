"""x402 payment-proof handling for Aurum's Casper-backed oracle.

Mock mode: validates proof structure (deadline, receiver, network, nonce,
  amount) without requiring a real on-chain transfer.  Suitable for demos
  and development.

Live mode: performs all structural checks AND calls
  DeploySubmitter.verify_transfer_on_chain() to confirm the CSPR transfer
  actually landed in the treasury before accepting the proof.

Expected environment variables:
- X402_MODE                      (mock | live)
- X402_TREASURY_ACCOUNT          (account-hash-...)
- X402_QUERY_PRICE_CSPR          (e.g. "1.50")
- X402_NETWORK                   (e.g. "casper-test")
- ORACLE_PAYWALL_QUERY_PRICE_MOTES (motes equivalent of query price)
- CASPER_NETWORK_NAME            (fallback for X402_NETWORK)

Security assumptions:
- Proof verification always happens server-side.
- The nonce cache is an MVP in-memory replay barrier.  Replace with
  durable storage (Supabase) before production.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from decimal import Decimal, InvalidOperation
from enum import Enum
from typing import Any, Dict, Optional, Set
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
    treasury_account: str
    query_price_cspr: Decimal
    query_price_motes: int
    network: str


class X402Verifier:
    """Server-side verifier for Aurum's x402 proof flow."""

    def __init__(self, config: X402VerifierConfig) -> None:
        self.config = config
        self._used_nonces: Set[str] = set()
        self._submitter = None  # lazy-loaded in live mode

    def _get_submitter(self):
        """Lazy-load DeploySubmitter for on-chain transfer checks."""
        if self._submitter is None:
            try:
                from .deploy_submitter import load_submitter_from_env
                self._submitter = load_submitter_from_env()
            except Exception:
                pass
        return self._submitter

    def build_payment_requirement(self) -> Dict[str, Any]:
        """Return the metadata a protected endpoint should expose in HTTP 402."""
        return {
            "mode": self.config.mode.value,
            "network": self.config.network,
            "asset": "CSPR",
            "amount_cspr": str(self.config.query_price_cspr),
            "amount_motes": self.config.query_price_motes,
            "receiver_account": self.config.treasury_account,
        }

    def build_mock_proof(
        self,
        payer_account: str,
        nonce: str,
        ttl_seconds: int = 300,
    ) -> X402PaymentProof:
        """Create a local/demo proof for manual test flows."""
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
        """
        Verify a proof and return normalized audit metadata.

        Structural checks run in both modes:
          - proof not expired
          - receiver matches treasury
          - network matches
          - nonce not replayed
          - amount >= query price

        In live mode an additional on-chain transfer scan confirms the CSPR
        actually reached the treasury before the nonce is consumed.
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

        # Live mode: verify the transfer actually landed on-chain
        if self.config.mode == X402Mode.LIVE:
            submitter = self._get_submitter()
            if submitter is None:
                raise X402VerificationError(
                    "x402 live mode requires CASPER_RPC_URL, "
                    "CASPER_DEPLOY_CHAIN_NAME, CASPER_PRIVATE_KEY_PATH to be set"
                )
            chain_check = submitter.verify_transfer_on_chain(
                payer_account=proof.payer_account,
                receiver_account=proof.receiver_account,
                amount_motes=self.config.query_price_motes,
                deadline_epoch_seconds=proof.deadline_epoch_seconds,
            )
            if not chain_check.get("verified"):
                raise X402VerificationError(
                    f"x402 on-chain transfer not found: {chain_check.get('error')}"
                )

        self._used_nonces.add(proof.nonce)
        return {
            "mode": self.config.mode.value,
            "verified": True,
            "payer_account": proof.payer_account,
            "receiver_account": proof.receiver_account,
            "amount_cspr": str(amount),
            "nonce": proof.nonce,
            "payment_reference": proof.payment_reference,
        }

    def dump_config(self) -> Dict[str, Any]:
        """Return a JSON-safe view of the verifier configuration."""
        data = asdict(self.config)
        data["mode"] = self.config.mode.value
        data["query_price_cspr"] = str(self.config.query_price_cspr)
        return data


def load_x402_verifier_from_env() -> X402Verifier:
    """Load verifier settings from environment variables."""
    mode = X402Mode(os.getenv("X402_MODE", X402Mode.MOCK.value))
    treasury_account = _require_env("X402_TREASURY_ACCOUNT")
    query_price_cspr = _parse_decimal(os.getenv("X402_QUERY_PRICE_CSPR", "1.50"))
    query_price_motes = int(
        os.getenv("ORACLE_PAYWALL_QUERY_PRICE_MOTES", "1500000000")
    )
    network = os.getenv("X402_NETWORK") or _require_env("CASPER_NETWORK_NAME")
    return X402Verifier(
        X402VerifierConfig(
            mode=mode,
            treasury_account=treasury_account,
            query_price_cspr=query_price_cspr,
            query_price_motes=query_price_motes,
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
        value = Decimal(str(raw_value))
    except (InvalidOperation, TypeError) as exc:
        raise X402VerificationError(f"Invalid decimal value: {raw_value}") from exc
    if value <= 0:
        raise X402VerificationError("x402 payment amount must be positive")
    return value
