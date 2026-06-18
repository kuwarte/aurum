#!/bin/bash
CASPER=/home/kuwarte/.cargo/bin/casper-client
NODE=https://node.testnet.casper.network/rpc

# Check if the CreditRegistry deploy succeeded
DEPLOY_HASH=9a53a2c87667c3d4dfed46ffcf014b31da03c775d961a5afd46ff1bca57fc74a

echo "=== Checking CreditRegistry deploy hash ==="
$CASPER get-deploy --node-address $NODE $DEPLOY_HASH 2>&1 | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    r = d.get('result', {})
    deploy = r.get('deploy', {})
    header = deploy.get('header', {})
    print('account:', header.get('account', 'n/a'))
    print('timestamp:', header.get('timestamp', 'n/a'))
    execs = r.get('execution_results', [])
    if execs:
        result = execs[0].get('result', {})
        if 'Success' in result:
            cost = result['Success'].get('cost', 'n/a')
            print('status: SUCCESS, cost:', cost)
        elif 'Failure' in result:
            print('status: FAILURE:', result['Failure'].get('error_message', ''))
    else:
        print('status: no execution results (might be pruned or pending)')
except Exception as e:
    print('parse error:', e)
    print(sys.stdin.read()[:300])
"

echo ""
echo "=== Checking account state for contract ==="
ACCOUNT_HASH=e1b7c78127d7b8b652ec00dd074a74bd47b5a9eebe1fd94cec3bb3e2ce7d8dad
$CASPER query-global-state \
  --node-address $NODE \
  --state-root-hash $($CASPER get-state-root-hash --node-address $NODE 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['state_root_hash'])") \
  --key "account-hash-$ACCOUNT_HASH" \
  2>&1 | head -30
