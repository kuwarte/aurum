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
import re
from typing import Any, Dict, Optional
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

    @classmethod
    def from_dict(cls, raw: Dict[str, Any]) -> "X402PaymentProof":
        """Build a proof from untrusted JSON with clean validation errors."""
        if not isinstance(raw, dict):
            raise X402VerificationError("x402 proof must be a JSON object")

        required_fields = (
            "payer_account",
            "receiver_account",
            "amount_cspr",
            "nonce",
            "deadline_epoch_seconds",
            "network",
            "signature",
        )
        missing = [field for field in required_fields if field not in raw]
        if missing:
            raise X402VerificationError(
                f"x402 proof missing required field(s): {', '.join(missing)}"
            )

        payer_account = _require_non_empty_string(raw["payer_account"], "payer_account")
        receiver_account = _require_non_empty_string(
            raw["receiver_account"], "receiver_account"
        )
        nonce = _require_non_empty_string(raw["nonce"], "nonce")
        network = _require_non_empty_string(raw["network"], "network")
        signature = _require_non_empty_string(raw["signature"], "signature")
        payment_reference = str(raw.get("payment_reference", "")).strip()

        if len(nonce) > 128:
            raise X402VerificationError("x402 nonce is too long")
        if len(signature) > 512:
            raise X402VerificationError("x402 signature is too long")
        if not _is_account_identifier(payer_account):
            raise X402VerificationError("x402 payer_account is not a Casper account identifier")
        if not _is_account_identifier(receiver_account):
            raise X402VerificationError("x402 receiver_account is not a Casper account identifier")

        try:
            deadline = int(raw["deadline_epoch_seconds"])
        except (TypeError, ValueError) as exc:
            raise X402VerificationError(
                "x402 deadline_epoch_seconds must be an integer"
            ) from exc

        return cls(
            payer_account=payer_account,
            receiver_account=receiver_account,
            amount_cspr=str(raw["amount_cspr"]),
            nonce=nonce,
            deadline_epoch_seconds=deadline,
            network=network,
            signature=signature,
            payment_reference=payment_reference,
        )


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
        if not proof.signature:
            raise X402VerificationError("x402 proof signature is required")

        amount = _parse_decimal(proof.amount_cspr)
        if amount < self.config.query_price_cspr:
            raise X402VerificationError("x402 payment below required query price")

        # TODO: verify that `signature` is an Ed25519/Secp256k1 signature over a
        # canonical proof payload. The missing requirement is an agreed canonical
        # signing message and curve encoding from the wallet/facilitator flow.

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

        verification = {
            "mode": self.config.mode.value,
            "verified": True,
            "payer_account": proof.payer_account,
            "receiver_account": proof.receiver_account,
            "amount_cspr": str(amount),
            "nonce": proof.nonce,
            "payment_reference": proof.payment_reference,
        }
        self._consume_nonce(proof, verification)
        return verification

    def dump_config(self) -> Dict[str, Any]:
        """Return a JSON-safe view of the verifier configuration."""
        data = asdict(self.config)
        data["mode"] = self.config.mode.value
        data["query_price_cspr"] = str(self.config.query_price_cspr)
        return data

    def _consume_nonce(
        self,
        proof: X402PaymentProof,
        verification: Dict[str, Any],
    ) -> None:
        try:
            from db.supabase import consume_x402_nonce

            consume_x402_nonce(
                nonce=proof.nonce,
                proof_metadata={
                    **verification,
                    "network": proof.network,
                },
                expires_at=proof.deadline_epoch_seconds,
            )
        except Exception as exc:
            raise X402VerificationError(
                "x402 nonce could not be persisted or was already used"
            ) from exc


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


_ACCOUNT_HASH_RE = re.compile(r"^(account-hash-)?[0-9a-fA-F]{64}$")
_PUBLIC_KEY_RE = re.compile(r"^0[12][0-9a-fA-F]{64,66}$")


def _is_account_identifier(value: str) -> bool:
    return bool(_ACCOUNT_HASH_RE.fullmatch(value) or _PUBLIC_KEY_RE.fullmatch(value))


def _require_non_empty_string(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise X402VerificationError(f"x402 {field_name} must be a non-empty string")
    return value.strip()
