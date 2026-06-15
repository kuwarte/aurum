#!/usr/bin/env bash
set -euo pipefail

# Aurum Dev 2 verification helper.
# This script performs the checks that are available in-repo today: Rust tests
# and Python bytecode compilation for the Dev 2 data layer.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v cargo >/dev/null 2>&1; then
  echo "[aurum-dev2] cargo is required to run contract tests" >&2
  exit 1
fi

if ! command -v python >/dev/null 2>&1; then
  echo "[aurum-dev2] python is required to verify the data-layer modules" >&2
  exit 1
fi

echo "[aurum-dev2] Running Rust unit tests"
(cd "${ROOT_DIR}/contracts" && cargo test --workspace)

echo "[aurum-dev2] Compiling Dev 2 Python modules"
(cd "${ROOT_DIR}" && python -m compileall api/casper api/cspr_cloud)

echo "[aurum-dev2] Verification complete"
