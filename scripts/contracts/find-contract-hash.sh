#!/bin/bash
CASPER=/home/kuwarte/.cargo/bin/casper-client
NODE=https://node.testnet.casper.network/rpc

STATE=$($CASPER get-state-root-hash --node-address $NODE | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['state_root_hash'])")

query_pkg() {
    local name=$1
    local pkg=$2
    echo "=== $name ==="
    $CASPER query-global-state --node-address $NODE --state-root-hash "$STATE" --key "$pkg" | \
    python3 -c "
import sys,json
d=json.load(sys.stdin)
sv=d.get('result',{}).get('stored_value',{})
pkg=sv.get('ContractPackage') or sv.get('Package') or {}
versions=pkg.get('versions',[])
for v in versions:
    print('  v' + str(v.get('contract_version')) + ' contract_hash:', v.get('contract_hash','n/a'))
if not versions:
    print('  no versions found')
"
}

query_pkg "CreditRegistry" "hash-804fe9e4c8cb9a8800bb6f60a1904bf121d2d8e35cb0ef8b747bd6b2b4d726b6"
query_pkg "ComplianceRegistry" "hash-587d0cc2ddfbfdb0aa51d6b557458288b93cdcbf5efbfb3fcd4de85882039468"
query_pkg "OraclePaywall" "hash-a70e084663c8f50968dba0f192a9d5e2236e01c2d4c6b24d39366dd1f264350a"
query_pkg "ReputationRegistry" "hash-1676906bd1dbbd59d1949737a1ea9776be73b967dc4973cd114ea29dc67b7bec"
