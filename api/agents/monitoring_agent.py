"""
Monitoring Agent: Credential Surveillance and Revocation.

Watches subjects with active credentials for missed repayments, defaults,
and fraud threshold breaches. Triggers credential revocation when thresholds
are exceeded. Integrated into Vercel cron job (runs every 15 minutes).

Blocked on: Contract Revocation Methods.
"""

from pipeline.state import PipelineState
from db.supabase import get_assessment


def monitoring_agent(state: PipelineState) -> PipelineState:
    """
    Check if credential remains active based on recent assessment.

    Validates credential status by checking Supabase for fraud score exceeding
    threshold. Phase 2 will add CSPR.cloud polling for missed repayments and
    contract revocation calls.

    Args:
        state: Complete pipeline state from attestation_agent

    Returns:
        Updated state with:
          - credential_active: Boolean indicating if credential is valid
    """
    wallet_address = state["wallet_address"]
    
    # Check if there's a recent assessment in Supabase
    recent_assessment = get_assessment(wallet_address)
    
    credential_active = True
    
    if recent_assessment:
        # Check fraud threshold
        fraud_score = recent_assessment.get("fraud_score", 0)
        if fraud_score > 0.5:
            credential_active = False
        
        # TODO: Check for missed repayments via CSPR.cloud polling
        # missed_repayments = cspr_cloud.check_repayment_status(wallet_address)
        # if missed_repayments > 0:
        #     credential_active = False
        
        # TODO: Once deploy contracts finished, call revoke if needed:
        # if not credential_active:
        #     from casper.contracts import revoke_credit_score
        #     revoke_credit_score(wallet_address)
    
    return {
        **state,
        "credential_active": credential_active,
    }
