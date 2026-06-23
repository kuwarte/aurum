"""Test wallet loading helpers.

Test scripts should not hardcode wallet identifiers. They use CASPER_PUBLIC_KEY
first so they match the browser wallet flow, then fall back to CASPER_ACCOUNT_HASH.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

API_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = API_DIR.parent

if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

load_dotenv(API_DIR / ".env", override=False)
load_dotenv(REPO_ROOT / ".env", override=False)

_ACCOUNT_HASH_RE = re.compile(r"^(account-hash-)?[0-9a-fA-F]{64}$")
_PUBLIC_KEY_RE = re.compile(r"^0[12][0-9a-fA-F]{64,66}$")


def get_test_wallet() -> str:
    """Return a configured Casper wallet identifier for tests."""
    public_key = os.getenv("CASPER_PUBLIC_KEY", "").strip()
    account_hash = os.getenv("CASPER_ACCOUNT_HASH", "").strip()

    if public_key:
        if not _PUBLIC_KEY_RE.fullmatch(public_key):
            raise RuntimeError(
                "CASPER_PUBLIC_KEY is configured but is not a valid Casper "
                "01/02-prefixed public key. Update your local api/.env or .env."
            )
        return public_key

    if account_hash:
        if not _ACCOUNT_HASH_RE.fullmatch(account_hash):
            raise RuntimeError(
                "CASPER_ACCOUNT_HASH is configured but is not a valid Casper "
                "account hash. Update your local api/.env or .env."
            )
        return account_hash

    raise RuntimeError(
        "Missing test wallet. Configure CASPER_PUBLIC_KEY or CASPER_ACCOUNT_HASH "
        "in your local api/.env or repo root .env before running API test scripts."
    )
