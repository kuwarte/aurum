import os
from supabase import create_client, Client

def get_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_KEY must be set in .env. "
            "Use the service_role key from Settings > API, not the anon key."
        )

    return create_client(url, key)

def save_attestation(payload: dict) -> str:
    """
    Saves the attestation payload to Supabase as a NEW row every time.
    This preserves history — each assessment call appends a row.
    Returns a URL string used as the attestation_hash on-chain.
    """
    client = get_client()
    response = client.table("assessments").insert({
        "wallet_address":   payload["wallet"],
        "credit_score":     payload["score"],
        "risk_tier":        payload["tier"],
        "default_prob_30d": payload["default_prob_30d"],
        "sub_scores":       payload.get("sub_scores", {}),
        "shap_breakdown":   payload.get("shap", {}),
        "fraud_score":      payload.get("fraud_score", 0),
        "fraud_flags":      payload.get("fraud_flags", []),
        "loan_offers":      payload.get("loan_offers", []),
        "tx_hash":          payload.get("tx_hash", ""),
        "attestation_hash": "",   # will be updated below
        "credential_active": True,
    }).execute()

    record_id = response.data[0]["id"]
    supabase_url = os.getenv("SUPABASE_URL")
    attestation_url = f"{supabase_url}/rest/v1/assessments?id=eq.{record_id}"

    # Back-fill the attestation_hash with the record URL
    client.table("assessments").update(
        {"attestation_hash": attestation_url}
    ).eq("id", record_id).execute()

    return attestation_url

def get_assessment(wallet_address: str) -> dict | None:
    """Return the most recent assessment for a wallet."""
    client = get_client()
    response = (
        client.table("assessments")
        .select("*")
        .eq("wallet_address", wallet_address)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if response.data:
        return response.data[0]
    return None

def get_assessment_history(wallet_address: str, limit: int = 20) -> list:
    """Return all assessments for a wallet ordered newest first."""
    client = get_client()
    response = (
        client.table("assessments")
        .select("credit_score, risk_tier, created_at, tx_hash, fraud_score")
        .eq("wallet_address", wallet_address)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []
