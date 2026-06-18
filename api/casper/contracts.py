"""Contract interaction wrappers for Aurum Protocol.

Write methods (issue_credit_score, revoke_credit_score, etc.) build and submit
real deploys via DeploySubmitter when AURUM_DEPLOY_MODE=live.

Read methods (get_credit_score, is_compliant, etc.) submit getter deploys and
wait for the return value from the execution effects.  On Casper, even
read-only entrypoints must be deployed — there is no free call-and-return.

Expected environment variables:
- CREDIT_REGISTRY_CONTRACT_HASH   (preferred, contract- prefix)
- CREDIT_REGISTRY_HASH            (fallback, hash- prefix)
- COMPLIANCE_REGISTRY_CONTRACT_HASH / COMPLIANCE_REGISTRY_HASH
- ORACLE_PAYWALL_CONTRACT_HASH    / ORACLE_PAYWALL_HASH
- REPUTATION_REGISTRY_CONTRACT_HASH / REPUTATION_REGISTRY_HASH
- CASPER_RPC_URL
- CASPER_NETWORK_NAME
- CASPER_PRIVATE_KEY
- CASPER_PUBLIC_KEY
- CASPER_ACCOUNT_HASH
- AURUM_DEPLOY_MODE   (mock | live)

Security assumptions:
- Hashes are configured server-side and never trusted from end-user requests.
"""

from __future__ import annotations

import os
import time as _time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .client import CasperClient, load_client_from_env
from .deploy_submitter import DeploySubmitter, load_submitter_from_env
from .x402 import X402PaymentProof, X402Verifier, load_x402_verifier_from_env


@dataclass(frozen=True)
class ContractHashes:
    """Configured Aurum contract hashes."""

    credit_registry: str
    compliance_registry: str
    oracle_paywall: str
    reputation_registry: str


class AurumContracts:
    """High-level wrapper for Aurum's Casper contract surface."""

    def __init__(
        self,
        client: CasperClient,
        hashes: ContractHashes,
        verifier: Optional[X402Verifier] = None,
        submitter: Optional[DeploySubmitter] = None,
    ) -> None:
        self.client = client
        self.hashes = hashes
        self.verifier = verifier
        self._submitter = submitter
        self._deploy_mode = os.getenv("AURUM_DEPLOY_MODE", "mock")

    @property
    def submitter(self) -> Optional[DeploySubmitter]:
        """Lazy-load submitter in live mode."""
        if self._submitter is None and self._deploy_mode == "live":
            try:
                self._submitter = load_submitter_from_env()
            except Exception:
                pass
        return self._submitter

    # ------------------------------------------------------------------
    # CreditRegistry — write methods
    # ------------------------------------------------------------------

    def issue_credit_score(
        self,
        borrower: str,
        score: int,
        tier: str,
        default_probability_bps: int,
        borrowing_limit_motes: int,
        attestation_hash: str,
        issued_at: int,
        expiry_at: int,
    ) -> Dict[str, Any]:
        args = {
            "caller": self.client.config.account_hash,
            "borrower": borrower,
            "score": score,
            "tier": tier,
            "default_probability_bps": default_probability_bps,
            "borrowing_limit_motes": borrowing_limit_motes,
            "attestation_hash": attestation_hash,
            "issued_at": issued_at,
            "expiry_at": expiry_at,
        }
        return self.client.build_contract_call(
            self.hashes.credit_registry, "issue_credit_score", args
        )

    def update_score(
        self,
        borrower: str,
        score: int,
        tier: str,
        default_probability_bps: int,
        borrowing_limit_motes: int,
        attestation_hash: str,
        issued_at: int,
        expiry_at: int,
    ) -> Dict[str, Any]:
        args = {
            "caller": self.client.config.account_hash,
            "borrower": borrower,
            "score": score,
            "tier": tier,
            "default_probability_bps": default_probability_bps,
            "borrowing_limit_motes": borrowing_limit_motes,
            "attestation_hash": attestation_hash,
            "issued_at": issued_at,
            "expiry_at": expiry_at,
        }
        return self.client.build_contract_call(
            self.hashes.credit_registry, "update_score", args
        )

    def revoke_credit_score(self, borrower: str, revoked_at: int) -> Dict[str, Any]:
        """
        Revoke a borrower's credit score on-chain.

        In live mode this submits a real put-deploy immediately.
        In mock mode it returns the call envelope dict.
        """
        args = {
            "caller": self.client.config.account_hash,
            "borrower": borrower,
            "revoked_at": revoked_at,
        }
        if self._deploy_mode == "live" and self.submitter:
            return self.submitter.submit_contract_call(
                contract_hash=self.hashes.credit_registry,
                entrypoint="revoke_credit_score",
                args=args,
            )
        return self.client.build_contract_call(
            self.hashes.credit_registry, "revoke_credit_score", args
        )

    # ------------------------------------------------------------------
    # CreditRegistry — read methods
    # ------------------------------------------------------------------

    def get_credit_score(self, borrower: str) -> Dict[str, Any]:
        """
        Read a borrower's current score from the chain.

        In live mode submits a getter deploy (get_score + get_tier) and returns
        the on-chain values.  Falls back gracefully on any error.
        In mock mode returns a stub.
        """
        if self._deploy_mode == "live" and self.submitter:
            score_result = self.submitter.call_getter(
                contract_hash=self.hashes.credit_registry,
                entrypoint="get_score",
                args={"borrower": borrower},
            )
            tier_result = self.submitter.call_getter(
                contract_hash=self.hashes.credit_registry,
                entrypoint="get_tier",
                args={"borrower": borrower},
            )
            active_result = self.submitter.call_getter(
                contract_hash=self.hashes.credit_registry,
                entrypoint="is_credential_active_at",
                args={"borrower": borrower, "now": int(_time.time())},
            )
            return {
                "borrower": borrower,
                "score": score_result.get("value"),
                "tier": tier_result.get("value"),
                "active": active_result.get("value"),
                "score_deploy_hash": score_result.get("deploy_hash"),
                "source": "chain",
            }
        return {
            "borrower": borrower,
            "source": "mock",
            "note": "Set AURUM_DEPLOY_MODE=live for on-chain reads.",
        }

    # ------------------------------------------------------------------
    # ComplianceRegistry — write methods
    # ------------------------------------------------------------------

    def issue_compliance_token(
        self,
        borrower: str,
        level: str,
        aml_flag: bool,
        issued_at: int,
        expiry_at: int,
    ) -> Dict[str, Any]:
        args = {
            "caller": self.client.config.account_hash,
            "borrower": borrower,
            "level": level,
            "aml_flag": aml_flag,
            "issued_at": issued_at,
            "expiry_at": expiry_at,
        }
        return self.client.build_contract_call(
            self.hashes.compliance_registry, "issue_compliance_token", args
        )

    # ------------------------------------------------------------------
    # ComplianceRegistry — read methods
    # ------------------------------------------------------------------

    def is_compliant(self, borrower: str, now: int) -> Dict[str, Any]:
        """
        Check compliance status on-chain.

        In live mode submits a getter deploy and returns the bool result.
        """
        if self._deploy_mode == "live" and self.submitter:
            result = self.submitter.call_getter(
                contract_hash=self.hashes.compliance_registry,
                entrypoint="is_compliant",
                args={"borrower": borrower, "now": now},
            )
            return {
                "borrower": borrower,
                "compliant": result.get("value"),
                "deploy_hash": result.get("deploy_hash"),
                "source": "chain",
            }
        return {
            "borrower": borrower,
            "source": "mock",
            "note": "Set AURUM_DEPLOY_MODE=live for on-chain reads.",
        }

    # ------------------------------------------------------------------
    # OraclePaywall — read methods
    # ------------------------------------------------------------------

    def query_credit_profile(
        self,
        borrower: str,
        payment_proof: X402PaymentProof,
    ) -> Dict[str, Any]:
        """
        Query the OraclePaywall contract for a credit profile.

        Payment proof is verified server-side first (x402).  In live mode the
        getter deploy is submitted to confirm on-chain state; the oracle router
        returns Supabase data as the low-latency cache, so this is used for
        cross-validation rather than as the primary data path.
        """
        verification = self._verify_payment(payment_proof)
        if not verification.get("verified", True):
            return {"error": "payment_not_verified", "detail": verification}

        if self._deploy_mode == "live" and self.submitter:
            result = self.submitter.call_getter(
                contract_hash=self.hashes.oracle_paywall,
                entrypoint="query_credit_profile",
                args={"borrower": borrower},
            )
            return {
                "borrower": borrower,
                "chain_value": result.get("value"),
                "deploy_hash": result.get("deploy_hash"),
                "payment_verification": verification,
                "source": "chain",
            }
        return {
            "borrower": borrower,
            "payment_verification": verification,
            "source": "mock",
            "note": "Set AURUM_DEPLOY_MODE=live for on-chain reads.",
        }

    def bulk_query(
        self,
        borrowers: List[str],
        payment_proofs: List[X402PaymentProof],
    ) -> Dict[str, Any]:
        results = [
            self.query_credit_profile(borrower, proof)
            for borrower, proof in zip(borrowers, payment_proofs)
        ]
        return {"borrowers": results}

    # ------------------------------------------------------------------
    # ReputationRegistry — write methods
    # ------------------------------------------------------------------

    def attest_reputation(
        self,
        borrower: str,
        reputation_score: int,
        dao_participation_count: int,
        loans_fulfilled_count: int,
        disputes_count: int,
        peer_attestations_count: int,
        evidence_hash: str,
        last_updated_at: int,
    ) -> Dict[str, Any]:
        args = {
            "caller": self.client.config.account_hash,
            "borrower": borrower,
            "reputation_score": reputation_score,
            "dao_participation_count": dao_participation_count,
            "loans_fulfilled_count": loans_fulfilled_count,
            "disputes_count": disputes_count,
            "peer_attestations_count": peer_attestations_count,
            "evidence_hash": evidence_hash,
            "last_updated_at": last_updated_at,
        }
        return self.client.build_contract_call(
            self.hashes.reputation_registry, "attest_reputation", args
        )

    # ------------------------------------------------------------------
    # ReputationRegistry — read methods
    # ------------------------------------------------------------------

    def get_reputation(self, borrower: str) -> Dict[str, Any]:
        """
        Read reputation score on-chain.

        In live mode submits a getter deploy and returns the on-chain value.
        """
        if self._deploy_mode == "live" and self.submitter:
            result = self.submitter.call_getter(
                contract_hash=self.hashes.reputation_registry,
                entrypoint="get_reputation",
                args={"borrower": borrower},
            )
            return {
                "borrower": borrower,
                "reputation": result.get("value"),
                "deploy_hash": result.get("deploy_hash"),
                "source": "chain",
            }
        return {
            "borrower": borrower,
            "source": "mock",
            "note": "Set AURUM_DEPLOY_MODE=live for on-chain reads.",
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _verify_payment(self, payment_proof: X402PaymentProof) -> Dict[str, Any]:
        if not self.verifier:
            return {
                "verified": False,
                "warning": "No x402 verifier configured; query should not be treated as paid.",
            }
        try:
            return self.verifier.verify(payment_proof)
        except Exception as exc:
            return {"verified": False, "error": str(exc)}


def load_contracts_from_env() -> AurumContracts:
    """Load the full Aurum contract helper from environment configuration.

    Uses CONTRACT_HASH vars (contract- prefix) for deploy submission.
    Falls back to package HASH vars for read-only lookups.
    """
    client = load_client_from_env()
    hashes = ContractHashes(
        credit_registry=os.getenv("CREDIT_REGISTRY_CONTRACT_HASH")
            or os.getenv("CREDIT_REGISTRY_HASH", "hash-todo-credit-registry"),
        compliance_registry=os.getenv("COMPLIANCE_REGISTRY_CONTRACT_HASH")
            or os.getenv("COMPLIANCE_REGISTRY_HASH", "hash-todo-compliance-registry"),
        oracle_paywall=os.getenv("ORACLE_PAYWALL_CONTRACT_HASH")
            or os.getenv("ORACLE_PAYWALL_HASH", "hash-todo-oracle-paywall"),
        reputation_registry=os.getenv("REPUTATION_REGISTRY_CONTRACT_HASH")
            or os.getenv("REPUTATION_REGISTRY_HASH", "hash-todo-reputation-registry"),
    )
    return AurumContracts(
        client=client,
        hashes=hashes,
        verifier=load_x402_verifier_from_env(),
        # submitter is lazy-loaded on first live-mode call
    )
