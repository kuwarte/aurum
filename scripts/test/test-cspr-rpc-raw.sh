#!/bin/bash
# Test put-deploy with the actual callable contract hash (contract- prefix, bare hex for --session-hash)

CASPER=/home/kuwarte/.cargo/bin/casper-client
KEY=/home/kuwarte/agentic-buildathon/aurum/keys/deployer/secret_key.pem
# Strip 'contract-' prefix — --session-hash needs bare hex
CONTRACT=393bd1b851b298126fd91a3887397f7aa6fd97d193bff602d88b8b12663e7b70
BORROWER="account-hash-e1b7c78127d7b8b652ec00dd074a74bd47b5a9eebe1fd94cec3bb3e2ce7d8dad"

echo "=== Calling issue_credit_score on CreditRegistry ==="
echo "    contract: $CONTRACT"
echo "    borrower: $BORROWER"
echo ""

$CASPER put-deploy \
  --node-address https://node.testnet.casper.network/rpc \
  --chain-name casper-test \
  --secret-key "$KEY" \
  --payment-amount 5000000000 \
  --session-hash "$CONTRACT" \
  --session-entry-point issue_credit_score \
  --session-arg "borrower:key='$BORROWER'" \
  --session-arg "score:u32='509'" \
  --session-arg "tier:string='C'" \
  --session-arg "default_probability_bps:u64='3790'" \
  --session-arg "borrowing_limit_motes:u512='10000000000000'" \
  --session-arg "attestation_hash:string='test-hash-001'" \
  --session-arg "issued_at:u64='1781723977'" \
  --session-arg "expiry_at:u64='1789499977'" \
  2>&1

echo ""
echo "Exit code: $?"
