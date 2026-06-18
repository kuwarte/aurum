"""
Real blockchain deploy submission using casper-client CLI v5+.

casper-client 5.x replaced `put-deploy` with `put-transaction`.
This module uses `put-transaction stored` to call contract entrypoints.

Key differences in v5:
  - `put-deploy`           → deprecated, use `put-transaction`
  - `--session-hash`       → `--transaction-hash` (for stored contracts)
  - `--session-entry-point`→ `--entry-point`
  - `--session-arg`        → `--arg`
  - `--payment-amount`     → `--initiator-addr` + standard payment args

Casper v5 transaction structure:
  casper-client put-transaction stored
    --node-address <RPC>
    --chain-name <CHAIN>
    --secret-key <KEY>
    --payment-amount <MOTES>
    --transaction-hash <CONTRACT_HASH>
    --entry-point <ENTRYPOINT>
    --arg <key:type='value'>
    ...
"""

import json
import subprocess
import os
import re
import time as _time
from typing import Any, Dict, Optional
from pathlib import Path


class DeploySubmitter:
    """Submit contract calls to Casper blockchain using casper-client CLI v5+."""

    def __init__(
        self,
        rpc_url: str,
        chain_name: str,
        secret_key_path: str,
        payment_amount: int = 5_000_000_000,  # 5 CSPR default
        casper_client_bin: str = "casper-client",
    ):
        self.rpc_url = rpc_url
        self.chain_name = chain_name
        self.secret_key_path = secret_key_path
        self.payment_amount = payment_amount
        self.casper_client_bin = casper_client_bin

        # Verify casper-client is accessible
        try:
            result = subprocess.run(
                [self.casper_client_bin, "--version"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode != 0:
                raise RuntimeError(f"{self.casper_client_bin} returned non-zero exit code")
            self._version = result.stdout.strip()
        except FileNotFoundError:
            raise RuntimeError(
                f"casper-client not found at '{self.casper_client_bin}'. "
                "Set CASPER_CLIENT_BIN env var to the full path, e.g. "
                "/home/kuwarte/.cargo/bin/casper-client"
            )

    def submit_contract_call(
        self,
        contract_hash: str,
        entrypoint: str,
        args: Dict[str, Any],
        payment_amount: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Submit a contract entrypoint call to Casper testnet.

        Our contracts are Odra v1 contracts (hash- prefix).
        Uses `put-deploy --session-hash` which is the correct command for v1
        stored contracts. It is deprecated in favor of put-transaction but
        put-transaction invocable-entity requires v2 entity addresses.

        Returns dict with: success, deploy_hash, error
        """
        # Strip all prefixes — --session-hash needs bare hex only
        # Contracts come in as: hash-<hex>, contract-<hex>, or bare hex
        contract_hash_hex = contract_hash.replace("hash-", "").replace("contract-", "")

        pay = payment_amount or self.payment_amount

        cmd = [
            self.casper_client_bin,
            "put-deploy",
            "--node-address", self.rpc_url,
            "--chain-name", self.chain_name,
            "--secret-key", self.secret_key_path,
            "--payment-amount", str(pay),
            "--session-hash", contract_hash_hex,
            "--session-entry-point", entrypoint,
        ]

        for key, value in args.items():
            cmd.extend(["--session-arg", self._format_arg(key, value)])

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=30
            )

            raw_out = result.stdout.strip()
            raw_err = result.stderr.strip()

            if result.returncode != 0:
                real_errors = [
                    line for line in raw_err.splitlines()
                    if "WARNING" not in line and "#" not in line
                    and "deprecated" not in line.lower() and line.strip()
                ]
                return {
                    "success": False,
                    "error": "\n".join(real_errors) or raw_err[:400] or raw_out[:400],
                    "raw_stderr": raw_err[:600],
                    "raw_stdout": raw_out[:300],
                    "command": " ".join(cmd[:10]) + " ...",
                    "returncode": result.returncode,
                }

            deploy_hash = self._parse_tx_hash(raw_out)
            return {
                "success": True,
                "deploy_hash": deploy_hash,
                "transaction_hash": deploy_hash,
                "raw_output": raw_out,
            }

        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Deploy submission timed out after 30s"}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def check_deploy_status(self, tx_hash: str) -> Dict[str, Any]:
        """Query transaction status by hash."""
        # v5 uses `get-transaction` instead of `get-deploy`
        cmd = [
            self.casper_client_bin,
            "get-transaction",
            "--node-address", self.rpc_url,
            tx_hash,
        ]
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=15
            )
            if result.returncode != 0:
                # Fall back to get-deploy for older hashes
                return self._get_deploy_fallback(tx_hash)

            try:
                data = json.loads(result.stdout)
                exec_results = (
                    data.get("result", {})
                    .get("execution_info", {})
                    .get("execution_result", {})
                )
                if exec_results:
                    if "Success" in exec_results:
                        return {"success": True, "status": "executed", "details": exec_results}
                    elif "Failure" in exec_results:
                        return {"success": False, "status": "failed", "details": exec_results}
                return {"success": True, "status": "pending", "raw": result.stdout[:200]}
            except json.JSONDecodeError:
                return {"success": True, "status": "unknown", "raw": result.stdout[:200]}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def call_getter(
        self,
        contract_hash: str,
        entrypoint: str,
        args: Dict[str, Any],
        payment_amount: Optional[int] = None,
        poll_attempts: int = 6,
        poll_interval: float = 10.0,
    ) -> Dict[str, Any]:
        """
        Submit a getter entrypoint deploy and parse the return value from the
        execution result.

        On Casper, even read-only entrypoints must be submitted as deploys.
        The return value is surfaced in the execution effects as a Write to a
        temporary URef. We poll up to poll_attempts × poll_interval seconds
        for inclusion, then extract the parsed CLValue.

        Returns dict with: success, value (parsed), deploy_hash, error
        """
        result = self.submit_contract_call(
            contract_hash=contract_hash,
            entrypoint=entrypoint,
            args=args,
            payment_amount=payment_amount or self.payment_amount,
        )
        if not result.get("success"):
            return result

        deploy_hash = result.get("deploy_hash", "")
        status: Dict[str, Any] = {"status": "pending"}
        for _ in range(poll_attempts):
            _time.sleep(poll_interval)
            status = self.check_deploy_status(deploy_hash)
            if status.get("status") in ("executed", "failed"):
                break

        if status.get("status") == "failed":
            return {
                "success": False,
                "deploy_hash": deploy_hash,
                "error": f"getter deploy failed: {status.get('details')}",
            }

        parsed_value = self._extract_return_value(deploy_hash)
        return {
            "success": True,
            "deploy_hash": deploy_hash,
            "value": parsed_value,
            "raw_status": status,
        }

    def _extract_return_value(self, deploy_hash: str) -> Any:
        """
        Parse the return CLValue from a completed getter deploy.

        Odra stores return values as Write effects on temporary URefs in the
        execution result. We fetch get-deploy and return the parsed value from
        the last non-Unit, non-balance-hold Write effect.
        """
        cmd = [
            self.casper_client_bin, "get-deploy",
            "--node-address", self.rpc_url,
            deploy_hash,
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            data = json.loads(result.stdout)
            exec_results = data.get("result", {}).get("execution_results", [])
            if not exec_results:
                return None
            success = exec_results[0].get("result", {}).get("Success", {})
            transforms = success.get("effect", {}).get("transforms", [])
            for effect in reversed(transforms):
                key = effect.get("key", "")
                # Skip balance-hold keys and account keys
                if key.startswith("balance") or key.startswith("account-hash"):
                    continue
                transform = effect.get("transform", {})
                write = transform.get("WriteCLValue", {})
                if write and write.get("cl_type") not in ("Unit", None, ""):
                    return write.get("parsed")
        except Exception:
            pass
        return None

    def verify_transfer_on_chain(
        self,
        payer_account: str,
        receiver_account: str,
        amount_motes: int,
        deadline_epoch_seconds: int,
        scan_blocks: int = 20,
    ) -> Dict[str, Any]:
        """
        Verify a CSPR transfer actually landed on-chain by scanning recent
        blocks for a matching transfer from payer to receiver.

        Used by the x402 live verifier to confirm real payment before serving
        oracle data, instead of relying solely on the proof's structure.

        Scans the last `scan_blocks` blocks (~3 minutes at testnet slot time).
        Returns dict with: verified (bool), transfer_hash, block_height, error
        """
        now = int(_time.time())
        if deadline_epoch_seconds <= now:
            return {"verified": False, "error": "payment proof already expired"}

        def _bare(account: str) -> str:
            return account.replace("account-hash-", "").lower()

        payer_bare = _bare(payer_account)
        receiver_bare = _bare(receiver_account)

        try:
            # Get current block height
            status_cmd = [
                self.casper_client_bin,
                "get-node-status",
                "--node-address", self.rpc_url,
            ]
            status_result = subprocess.run(
                status_cmd, capture_output=True, text=True, timeout=15
            )
            if status_result.returncode != 0:
                return {"verified": False, "error": "could not fetch node status"}

            status_data = json.loads(status_result.stdout)
            current_height = (
                status_data.get("result", {})
                    .get("last_added_block_info", {})
                    .get("height", 0)
            )

            # Scan backwards through recent blocks
            for height in range(current_height, max(0, current_height - scan_blocks), -1):
                transfers_cmd = [
                    self.casper_client_bin,
                    "get-block-transfers",
                    "--node-address", self.rpc_url,
                    "--block-identifier", str(height),
                ]
                t_result = subprocess.run(
                    transfers_cmd, capture_output=True, text=True, timeout=15
                )
                if t_result.returncode != 0:
                    continue

                t_data = json.loads(t_result.stdout)
                transfers = t_data.get("result", {}).get("transfers", [])
                for transfer in transfers:
                    t_from = _bare(str(transfer.get("from", "")))
                    t_to = _bare(str(transfer.get("to", "")))
                    t_amount = int(transfer.get("amount", 0))
                    if (
                        t_from == payer_bare
                        and t_to == receiver_bare
                        and t_amount >= amount_motes
                    ):
                        return {
                            "verified": True,
                            "transfer_hash": transfer.get("deploy_hash", ""),
                            "amount_motes": t_amount,
                            "block_height": height,
                        }

            return {
                "verified": False,
                "error": (
                    f"No on-chain transfer found from {payer_account} to "
                    f"{receiver_account} >= {amount_motes} motes "
                    f"in last {scan_blocks} blocks"
                ),
            }

        except Exception as exc:
            return {"verified": False, "error": str(exc)}

    def _get_deploy_fallback(self, deploy_hash: str) -> Dict[str, Any]:
        """Fallback to get-deploy for compatibility."""
        cmd = [
            self.casper_client_bin, "get-deploy",
            "--node-address", self.rpc_url,
            deploy_hash,
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if result.returncode != 0:
                return {"success": False, "error": result.stderr[:200]}
            data = json.loads(result.stdout)
            exec_results = data.get("result", {}).get("execution_results", [])
            if exec_results:
                exec_status = exec_results[0].get("result", {})
                if "Success" in exec_status:
                    return {"success": True, "status": "executed", "details": exec_status}
                elif "Failure" in exec_status:
                    return {"success": False, "status": "failed", "details": exec_status}
            return {"success": True, "status": "pending"}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def _format_arg(self, key: str, value: Any) -> str:
        """Format an argument for casper-client --session-arg flag.

        CLType rules for Aurum contracts:
          bool          -> bool
          u8            -> small ints 0-255 (flags, small enums like compliance level)
          u32           -> scores (0-1000), bps (0-10000), counts
          u64           -> Unix timestamps, mote amounts, large ints
          string        -> all strings (caller, borrower, tier, hashes, etc.)

        NOTE: All Aurum contracts use u64 for mote amounts (borrowing_limit_motes,
        query_price_motes, etc.) — NOT u512. u512 is only for Casper native payment.
        Do NOT use key CLType for account-hash-prefixed strings — contracts take String.
        """
        if isinstance(value, bool):
            return f"{key}:bool='{str(value).lower()}'"
        elif isinstance(value, int):
            if key.endswith("_bps"):
                return f"{key}:u32='{value}'"
            elif key.endswith("_at") or key.endswith("_motes") or key in {"now", "deadline", "timestamp"}:
                return f"{key}:u64='{value}'"
            elif value >= 2**32:
                return f"{key}:u64='{value}'"
            elif value >= 2**8:
                return f"{key}:u32='{value}'"
            else:
                return f"{key}:u8='{value}'"
        elif isinstance(value, str):
            return f"{key}:string='{value}'"
        else:
            return f"{key}:string='{str(value)}'"

    def _parse_tx_hash(self, output: str) -> str:
        """Extract transaction/deploy hash from casper-client JSON output."""
        try:
            data = json.loads(output)
            result = data.get("result", {})
            # v5 returns transaction_hash, v4 returns deploy_hash
            return (
                result.get("transaction_hash")
                or result.get("deploy_hash")
                or ""
            )
        except (json.JSONDecodeError, KeyError):
            # Fallback: grab first 64-char hex string
            match = re.search(r'\b[0-9a-f]{64}\b', output)
            return match.group(0) if match else ""


def load_submitter_from_env() -> "DeploySubmitter":
    """Load DeploySubmitter from environment variables.

    Uses the deployer key (CASPER_PRIVATE_KEY_PATH) for signing — the
    deployed Odra contracts only accept calls from the deployer account.
    Set CASPER_CLIENT_BIN if casper-client is not on PATH
    (e.g. /home/kuwarte/.cargo/bin/casper-client).
    """
    rpc_url = os.getenv("CASPER_RPC_URL")
    chain_name = os.getenv("CASPER_DEPLOY_CHAIN_NAME")
    # Always use deployer key — contracts are locked to the deployer account
    secret_key_path = os.getenv("CASPER_PRIVATE_KEY_PATH")

    if not all([rpc_url, chain_name, secret_key_path]):
        raise RuntimeError(
            "Missing required environment variables: "
            "CASPER_RPC_URL, CASPER_DEPLOY_CHAIN_NAME, CASPER_PRIVATE_KEY_PATH"
        )

    # Resolve relative paths like ../keys/deployer/secret_key.pem
    if not os.path.isabs(secret_key_path):
        project_root = Path(__file__).parent.parent.parent  # aurum/
        relative = secret_key_path
        while relative.startswith("../"):
            relative = relative[3:]
        secret_key_path = str(project_root / relative)

    casper_client_bin = os.getenv("CASPER_CLIENT_BIN", "casper-client")

    return DeploySubmitter(
        rpc_url=rpc_url,
        chain_name=chain_name,
        secret_key_path=secret_key_path,
        casper_client_bin=casper_client_bin,
    )
