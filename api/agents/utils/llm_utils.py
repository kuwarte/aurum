"""
LLM Utilities for Aurum Agents.
Provides shared LLM initialization and prompt management to eliminate redundancy.
"""

import os
import json
from typing import Dict, Any, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage


class AgentLLM:
    """Shared LLM instance manager for agents."""
    
    _instances: Dict[str, ChatGroq] = {}
    
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
            print("LLM returned empty response")
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
