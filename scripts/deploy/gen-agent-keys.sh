#!/bin/bash
set -e
KEYS_DIR="/home/kuwarte/agentic-buildathon/aurum/keys"
CASPER_CLIENT="$HOME/.cargo/bin/casper-client"

for agent in risk fraud lending monitoring attestation; do
    echo "Generating keypair for: $agent"
    mkdir -p "$KEYS_DIR/$agent"
    $CASPER_CLIENT keygen "$KEYS_DIR/$agent"
    echo "  public_key: $(cat $KEYS_DIR/$agent/public_key_hex)"
done

echo ""
echo "All agent keys generated."
echo "Add these to api/.env:"
echo ""
for agent in risk fraud lending monitoring attestation; do
    pubkey=$(cat "$KEYS_DIR/$agent/public_key_hex" 2>/dev/null || echo "ERROR")
    upper=$(echo $agent | tr '[:lower:]' '[:upper:]')
    echo "${upper}_AGENT_PUBLIC_KEY=$pubkey"
    echo "${upper}_AGENT_PRIVATE_KEY_PATH=../keys/$agent/secret_key.pem"
done
