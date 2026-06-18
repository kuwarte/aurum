#!/usr/bin/env bash
# Aurum API Server Startup Script

set -e

echo "=========================================="
echo "Starting Aurum API Server"
echo "=========================================="

cd "$(dirname "$0")"

# Check if venv exists
if [ ! -d ".venv" ]; then
    echo "[x] Virtual environment not found at .venv"
    echo "Please create it first: python3 -m venv .venv"
    exit 1
fi

# Activate venv
echo "Activating virtual environment..."
source .venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "[!] Installing dependencies..."
    pip install -r requirements.txt
fi

# Check environment variables
echo "Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "[!]  .env file not found, using defaults"
else
    echo "[/] .env file found"
    source .env
fi

# Display configuration
echo ""
echo "Configuration:"
echo "  Deploy Mode: ${AURUM_DEPLOY_MODE:-mock}"
echo "  CSPR.cloud Mode: ${CSPR_CLOUD_MODE:-mock}"
echo "  Network: ${CASPER_NETWORK_NAME:-casper-test}"
echo "  RPC: ${CASPER_RPC_URL:-not set}"
echo ""

# Start server
echo "Starting FastAPI server on http://0.0.0.0:8000"
echo "API Docs: http://localhost:8000/docs"
echo "Health: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop"
echo "=========================================="

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
