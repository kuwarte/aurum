"""
LLM Utilities for Aurum Agents.
Provides shared LLM initialization and prompt management to eliminate redundancy.
"""

import json
import logging
import os
import time
from typing import Dict, Any, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)


class AgentLLM:
    """Shared LLM instance manager for agents."""
    
    _instances: Dict[str, ChatGroq] = {}
    _last_status: str = "success"
    
    @classmethod
    def get_llm(cls, key_name: str = "GROQ_API_KEY") -> ChatGroq:
        """Get or create LLM instance for specified API key."""
        if key_name not in cls._instances:
            cls._instances[key_name] = ChatGroq(
                model="llama-3.3-70b-versatile",
                temperature=0,
                api_key=os.getenv(key_name)
            )
        return cls._instances[key_name]
    
    @staticmethod
    def parse_json_response(response) -> Optional[Dict[str, Any]]:
        """Parse LLM response, handling markdown code blocks and trailing text."""
        content = response.content.strip()

        if not content:
            logger.warning("LLM returned an empty response; using fallback path.")
            return None

        # Strip markdown code fences: ```json ... ``` or ``` ... ```
        if content.startswith("```"):
            # Remove opening fence line (may be ```json or just ```)
            lines = content.splitlines()
            # Drop first line (the opening fence)
            lines = lines[1:]
            # Drop last line if it's a closing fence
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()

        # Try direct parse first
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        # Try to extract first {...} or [...] block from the content
        for start_char, end_char in [('{', '}'), ('[', ']')]:
            start = content.find(start_char)
            end = content.rfind(end_char)
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(content[start:end + 1])
                except json.JSONDecodeError:
                    pass

        content = "<redacted>"

        print(f"JSON parsing failed — could not extract JSON from response: {content[:200]!r}")
        return None
    
    @staticmethod
    def invoke_llm(llm: ChatGroq, prompt: str, retries: int = 2) -> Optional[Dict[str, Any]]:
        """Invoke LLM and parse JSON response. Retries on transient failures."""
        last_error = None
        for attempt in range(retries + 1):
            try:
                response = llm.invoke([HumanMessage(content=prompt)])
                result = AgentLLM.parse_json_response(response)
                if result is not None:
                    return result
                # parse returned None — don't retry, fall through to None
                return None
            except Exception as e:
                last_error = e
                if attempt < retries:
                    print(f"LLM invocation attempt {attempt + 1} failed: {e} — retrying")
                else:
                    print(f"LLM invocation failed after {retries + 1} attempts: {e}")
        return None

    @classmethod
    def get_llm(cls, key_name: str = "GROQ_API_KEY") -> Optional[ChatGroq]:
        """Get or create LLM instance for specified API key."""
        api_key = os.getenv(key_name)
        if not api_key:
            cls._last_status = "unavailable"
            logger.warning("LLM key %s is not configured; using fallback path.", key_name)
            return None

        if key_name not in cls._instances:
            cls._instances[key_name] = ChatGroq(
                model="llama-3.3-70b-versatile",
                temperature=0,
                api_key=api_key,
            )
        return cls._instances[key_name]

    @classmethod
    def get_last_status(cls) -> str:
        """Return the last LLM invocation status for API metadata."""
        return cls._last_status

    @classmethod
    def status_fields(cls, state: Dict[str, Any], fallback_used: bool) -> Dict[str, Any]:
        """Merge the latest LLM status into pipeline state fields."""
        previous_status = state.get("llm_status", "success")
        latest_status = cls.get_last_status()
        fallback = bool(state.get("fallback_used")) or fallback_used

        if fallback:
            if "rate_limited" in (previous_status, latest_status):
                status = "rate_limited"
            elif "unavailable" in (previous_status, latest_status):
                status = "unavailable"
            else:
                status = "fallback"
        else:
            status = "success"

        return {"llm_status": status, "fallback_used": fallback}

    @staticmethod
    def invoke_llm(llm: Optional[ChatGroq], prompt: str, retries: int = 2) -> Optional[Dict[str, Any]]:
        """Invoke LLM and parse JSON response. Retries on transient failures."""
        if llm is None:
            AgentLLM._last_status = "unavailable"
            return None

        fast_fallback = os.getenv("LLM_FAST_FALLBACK", "false").lower() in ("1", "true", "yes")
        try:
            configured_retries = int(os.getenv("LLM_MAX_RETRIES", str(retries)))
        except ValueError:
            configured_retries = retries

        try:
            retry_delay = float(os.getenv("LLM_RETRY_DELAY_SECONDS", "1"))
        except ValueError:
            retry_delay = 1.0

        max_retries = 0 if fast_fallback else max(0, configured_retries)

        for attempt in range(max_retries + 1):
            try:
                response = llm.invoke([HumanMessage(content=prompt)])
                result = AgentLLM.parse_json_response(response)
                if result is not None:
                    AgentLLM._last_status = "success"
                    return result

                AgentLLM._last_status = "fallback"
                return None
            except Exception as exc:
                error_text = str(exc).lower()
                AgentLLM._last_status = (
                    "rate_limited"
                    if "rate" in error_text or "429" in error_text
                    else "unavailable"
                )
                if attempt < max_retries:
                    logger.warning(
                        "LLM invocation attempt %s failed with %s; retrying.",
                        attempt + 1,
                        type(exc).__name__,
                    )
                    if retry_delay > 0:
                        time.sleep(retry_delay)
                else:
                    logger.warning(
                        "LLM invocation failed after %s attempt(s) with %s; using fallback path.",
                        max_retries + 1,
                        type(exc).__name__,
                    )

        return None


class Prompts:
    """Centralized prompt templates for all agents."""
    
    @staticmethod
    def fraud_detection(wallet_address: str, wallet_data: dict, credit_score: int) -> str:
        """Fraud detection analysis prompt."""
        
        wallet_age_days = wallet_data.get("wallet_age_days", 180)
        daily_avg_tx = wallet_data.get("tx_count", 150) / max(wallet_age_days, 1)
        
        return f"""
                        You are a DeFi fraud detection specialist analyzing wallet behavior.

                        Wallet Profile:
                        - Address: {wallet_address}
                        - Age: {wallet_age_days} days
                        - Total Transactions: {wallet_data.get('tx_count', 0)}
                        - Daily Average: {daily_avg_tx:.2f} transactions
                        - Trading Volume: ${wallet_data.get('volume_usd', 0):,.2f}
                        - Unique Counterparties: {wallet_data.get('counterparty_diversity', 0)}
                        - Credit Score: {credit_score}

                        Analyze this wallet for:
                        1. Sybil attack patterns (new wallet, low diversity)
                        2. Wash trading (high frequency with same counterparties)
                        3. Circular transaction patterns
                        4. Artificial volume inflation

                        Provide your assessment in JSON format:
                        {{
                        "fraud_score": 0.0-1.0,
                        "fraud_flags": ["flag1", "flag2"],
                        "reasoning": "detailed explanation",
                        "confidence": 0.0-1.0
                        }}

                        Be conservative - false positives hurt legitimate users.
                """
    
    @staticmethod
    def risk_analysis(credit_score: int, tier: str, default_prob: float, sub_scores: dict) -> str:
        """Risk analysis and early warning prompt."""
        
        return f"""
                        You are a DeFi credit risk analyst.

                        Wallet Assessment:
                        - Credit Score: {credit_score}/1000
                        - Risk Tier: {tier}
                        - Default Probability (30d): {default_prob*100:.1f}%

                        Sub-Scores:
                        {json.dumps(sub_scores, indent=2)}

                        Analyze this profile and identify early warning signs that could indicate:
                        1. Repayment stress
                        2. Income instability
                        3. Declining activity
                        4. Increased default risk

                        Respond in JSON:
                        {{
                        "early_warnings": ["warning1", "warning2"],
                        "risk_analysis": "brief explanation",
                        "recommendation": "monitor/alert/restrict"
                        }}
                """
    
    @staticmethod
    def attestation_summary(wallet_address: str, credit_score: int, tier: str, 
                           default_prob: float, fraud_score: float, fraud_flags: list) -> str:
        """Attestation summary generation prompt."""
        
        return f"""
                        You are a credit bureau attestation validator.

                        Wallet: {wallet_address}
                        Credit Score: {credit_score}/1000
                        Risk Tier: {tier}
                        Default Probability (30d): {default_prob*100:.1f}%
                        Fraud Score: {fraud_score}
                        Fraud Flags: {fraud_flags}

                        Generate a 2-3 sentence professional summary of this wallet's creditworthiness.

                        Respond in JSON:
                        {{
                        "summary": "professional summary text"
                        }}
                """
    
    @staticmethod
    def credential_monitoring(wallet_address: str, credit_score: int, tier: str,
                             fraud_score: float, default_prob: float) -> str:
        """Credential monitoring and revocation decision prompt."""
        
        return f"""
                        You are a credential monitoring specialist for a DeFi credit bureau.

                        Current Assessment:
                        - Wallet: {wallet_address}
                        - Credit Score: {credit_score}/1000
                        - Risk Tier: {tier}
                        - Fraud Score: {fraud_score}
                        - Default Probability (30d): {default_prob*100:.1f}%

                        Decide if this credential should remain ACTIVE or be REVOKED.

                        Revocation criteria:
                        - Fraud score > 0.5
                        - Credit score < 300
                        - Multiple early warning flags
                        - Tier D with elevated default risk

                        Respond in JSON:
                        {{
                        "credential_active": true/false,
                        "reasoning": "explanation for decision",
                        "action": "maintain/monitor/revoke"
                        }}
                """
    
    @staticmethod
    def lending_recommendation(credit_score: int, tier: str, default_prob: float,
                              fraud_score: float, offers: list) -> str:
        """Lending recommendation prompt."""
        
        return f"""
                        You are a DeFi lending advisor.

                        Borrower Profile:
                        - Credit Score: {credit_score}/1000
                        - Risk Tier: {tier}
                        - Default Probability (30d): {default_prob*100:.1f}%
                        - Fraud Score: {fraud_score}

                        Available Loan Offers:
                        {json.dumps(offers, indent=2)}

                        Provide a brief lending recommendation (2-3 sentences) explaining:
                        1. Which offer is best for this borrower
                        2. Recommended loan amount
                        3. Any precautions

                        Respond in JSON:
                        {{
                        "recommendation": "your recommendation text"
                        }}
                """
