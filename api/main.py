"""
Aurum API - Production-ready FastAPI server
Handles credit assessment requests from frontend
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from routers.assess import router as assess_router
from routers.oracle import router as oracle_router
from routers.cron import router as cron_router
import os

load_dotenv()

app = FastAPI(
    title="Aurum Protocol API",
    description="Autonomous AI Credit Bureau on Casper Network",
    version="1.0.0"
)

# Enhanced CORS for frontend
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assess_router, tags=["Assessment"])
app.include_router(oracle_router, tags=["Oracle"])
app.include_router(cron_router, tags=["Monitoring"])


class HealthResponse(BaseModel):
    status: str
    mode: str
    contracts_connected: bool
    rpc_url: str


@app.get("/", tags=["System"])
def root():
    """Root endpoint with API info"""
    return {
        "name": "Aurum Protocol API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", response_model=HealthResponse, tags=["System"])
def health():
    """Health check endpoint for frontend monitoring"""
    
    deploy_mode = os.getenv("AURUM_DEPLOY_MODE", "mock")
    cspr_cloud_mode = os.getenv("CSPR_CLOUD_MODE", "mock")
    rpc_url = os.getenv("CASPER_RPC_URL", "unknown")
    
    # Check if contract hashes are configured
    contracts_connected = all([
        os.getenv("CREDIT_REGISTRY_HASH"),
        os.getenv("COMPLIANCE_REGISTRY_HASH"),
        os.getenv("ORACLE_PAYWALL_HASH"),
        os.getenv("REPUTATION_REGISTRY_HASH"),
    ])
    
    return {
        "status": "healthy",
        "mode": f"deploy:{deploy_mode},cspr_cloud:{cspr_cloud_mode}",
        "contracts_connected": contracts_connected,
        "rpc_url": rpc_url,
    }


@app.get("/config", tags=["System"])
def config():
    """Return public configuration for frontend"""
    return {
        "deploy_mode": os.getenv("AURUM_DEPLOY_MODE", "mock"),
        "cspr_cloud_mode": os.getenv("CSPR_CLOUD_MODE", "mock"),
        "network": os.getenv("CASPER_NETWORK_NAME", "casper-test"),
        "contracts": {
            "credit_registry": os.getenv("CREDIT_REGISTRY_HASH", ""),
            "compliance_registry": os.getenv("COMPLIANCE_REGISTRY_HASH", ""),
            "oracle_paywall": os.getenv("ORACLE_PAYWALL_HASH", ""),
            "reputation_registry": os.getenv("REPUTATION_REGISTRY_HASH", ""),
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
