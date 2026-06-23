"""Shared API validation helpers."""

from __future__ import annotations

import re

from fastapi import HTTPException

_ACCOUNT_HASH_RE = re.compile(r"^(account-hash-)?[0-9a-fA-F]{64}$")
_PUBLIC_KEY_RE = re.compile(r"^0[12][0-9a-fA-F]{64,66}$")


def normalize_wallet_address(value: object) -> str:
    """Validate and normalize supported Casper wallet identifiers."""
    if not isinstance(value, str):
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_wallet_address",
                "message": "wallet_address must be a non-empty string",
            },
        )

    wallet = value.strip()
    if not wallet:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_wallet_address",
                "message": "wallet_address is required",
            },
        )

    if len(wallet) > 128:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_wallet_address",
                "message": "wallet_address is too long",
            },
        )

    if _ACCOUNT_HASH_RE.fullmatch(wallet) or _PUBLIC_KEY_RE.fullmatch(wallet):
        return wallet

    raise HTTPException(
        status_code=422,
        detail={
            "error": "invalid_wallet_address",
            "message": (
                "wallet_address must be a Casper account-hash, bare "
                "account hash, or 01/02-prefixed Casper public key"
            ),
        },
    )
