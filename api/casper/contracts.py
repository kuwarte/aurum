"""Contract interaction wrappers for Aurum Protocol.

The functions in this module provide a stable Python interface for Dev 3 and
deployment scripts to call Aurum's Dev 2-owned Casper contracts. The module
returns normalized payloads even before final contract hashes and SDK-backed
submission are available, which keeps the integration boundary explicit.

Expected environment variables:
- CREDIT_REGISTRY_HASH
- COMPLIANCE_REGISTRY_HASH
- ORACLE_PAYWALL_HASH
- REPUTATION_REGISTRY_HASH
- CASPER_RPC_URL
- CASPER_NETWORK_NAME
- CASPER_PRIVATE_KEY
- CASPER_PUBLIC_KEY
- CASPER_ACCOUNT_HASH

Security assumptions:
- Hashes are configured server-side and never trusted from end-user requests.
- Write methods only build submission envelopes; real signing integration
  remains a TODO until the final Casper Python SDK package is pinned.
"""

from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any, Dict, List, Optional

from .client import CasperClient, load_client_from_env
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
    ) -> None:
        self.client = client
        self.hashes = hashes
        self.verifier = verifier

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
        return self.client.build_contract_call(
            self.hashes.credit_registry,
            "issue_credit_score",
            {
                "borrower": borrower,
                "score": score,
                "tier": tier,
                "default_probability_bps": default_probability_bps,
                "borrowing_limit_motes": borrowing_limit_motes,
                "attestation_hash": attestation_hash,
                "issued_at": issued_at,
                "expiry_at": expiry_at,
            },
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
        return self.client.build_contract_call(
            self.hashes.credit_registry,
            "update_score",
            {
                "borrower": borrower,
                "score": score,
                "tier": tier,
                "default_probability_bps": default_probability_bps,
                "borrowing_limit_motes": borrowing_limit_motes,
                "attestation_hash": attestation_hash,
                "issued_at": issued_at,
                "expiry_at": expiry_at,
            },
        )

    def revoke_credit_score(self, borrower: str, revoked_at: int) -> Dict[str, Any]:
        return self.client.build_contract_call(
            self.hashes.credit_registry,
            "revoke_credit_score",
            {"borrower": borrower, "revoked_at": revoked_at},
        )

    def get_credit_score(self, borrower: str) -> Dict[str, Any]:
        return {
            "contract_hash": self.hashes.credit_registry,
            "entrypoint": "get_credit_score",
            "borrower": borrower,
            "todo": "TODO: Replace envelope with SDK-backed query once deployed hash is available.",
        }

    def issue_compliance_token(
        self,
        borrower: str,
        level: str,
        aml_flag: bool,
        issued_at: int,
        expiry_at: int,
    ) -> Dict[str, Any]:
        return self.client.build_contract_call(
            self.hashes.compliance_registry,
            "issue_compliance_token",
            {
                "borrower": borrower,
                "level": level,
                "aml_flag": aml_flag,
                "issued_at": issued_at,
                "expiry_at": expiry_at,
            },
        )

    def is_compliant(self, borrower: str, now: int) -> Dict[str, Any]:
        return {
            "contract_hash": self.hashes.compliance_registry,
            "entrypoint": "is_compliant",
            "borrower": borrower,
            "now": now,
            "todo": "TODO: Replace envelope with SDK-backed read call after deployment.",
        }

    def query_credit_profile(
        self,
        borrower: str,
        payment_proof: X402PaymentProof,
    ) -> Dict[str, Any]:
        verification = self._verify_payment(payment_proof)
        return {
            "contract_hash": self.hashes.oracle_paywall,
            "entrypoint": "query_credit_profile",
            "borrower": borrower,
            "payment_verification": verification,
            "todo": "TODO: Replace envelope with live query after OraclePaywall deployment.",
        }

    def bulk_query(
        self,
        borrowers: List[str],
        payment_proofs: List[X402PaymentProof],
    ) -> Dict[str, Any]:
        verification_results = [self._verify_payment(proof) for proof in payment_proofs]
        return {
            "contract_hash": self.hashes.oracle_paywall,
            "entrypoint": "bulk_query",
            "borrowers": borrowers,
            "payment_verification": verification_results,
            "todo": "TODO: Replace envelope with live bulk query after OraclePaywall deployment.",
        }

    def get_reputation(self, borrower: str) -> Dict[str, Any]:
        return {
            "contract_hash": self.hashes.reputation_registry,
            "entrypoint": "get_reputation",
            "borrower": borrower,
            "todo": "TODO: Replace envelope with SDK-backed read after reputation deployment.",
        }

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
        return self.client.build_contract_call(
            self.hashes.reputation_registry,
            "attest_reputation",
            {
                "borrower": borrower,
                "reputation_score": reputation_score,
                "dao_participation_count": dao_participation_count,
                "loans_fulfilled_count": loans_fulfilled_count,
                "disputes_count": disputes_count,
                "peer_attestations_count": peer_attestations_count,
                "evidence_hash": evidence_hash,
                "last_updated_at": last_updated_at,
            },
        )

    def _verify_payment(self, payment_proof: X402PaymentProof) -> Dict[str, Any]:
        if not self.verifier:
            return {
                "verified": False,
                "warning": "No x402 verifier configured; query should not be treated as paid.",
            }
        return self.verifier.verify(payment_proof)


def load_contracts_from_env() -> AurumContracts:
    """Load the full Aurum contract helper from environment configuration."""

    client = load_client_from_env()
    hashes = ContractHashes(
        credit_registry=os.getenv("CREDIT_REGISTRY_HASH", "hash-todo-credit-registry"),
        compliance_registry=os.getenv("COMPLIANCE_REGISTRY_HASH", "hash-todo-compliance-registry"),
        oracle_paywall=os.getenv("ORACLE_PAYWALL_HASH", "hash-todo-oracle-paywall"),
        reputation_registry=os.getenv("REPUTATION_REGISTRY_HASH", "hash-todo-reputation-registry"),
    )
    return AurumContracts(client=client, hashes=hashes, verifier=load_x402_verifier_from_env())
