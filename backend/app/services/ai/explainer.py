import os
import json
import logging
from typing import Dict, Any, Optional
from openai import AsyncOpenAI
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class AIExplanationService:
    """
    Assistive AI Explanation Service for NEXORA.
    Provides contextual security explanations, impact interpretations, and remediation summaries.
    Strict Invariant: AI NEVER modifies deterministic PASS/FAIL, evidence, or risk scores.
    Operates seamlessly in two modes:
    - Mode A: High-fidelity deterministic template generator (Default / Zero-API-key fallback).
    - Mode B: NVIDIA Generative AI (active if NVIDIA_API_KEY is configured).
    """

    @classmethod
    async def explain_finding(
        cls,
        title: str,
        vendor: str,
        category: str,
        severity: str,
        evidence: str,
        impact: str,
        remediation: str,
        is_unresolved: bool = False
    ) -> Dict[str, Any]:
        api_key = settings.NVIDIA_API_KEY or os.getenv("NVIDIA_API_KEY")

        if api_key:
            try:
                nvidia_result = await cls._call_nvidia(
                    api_key=api_key,
                    title=title,
                    vendor=vendor,
                    category=category,
                    severity=severity,
                    evidence=evidence,
                    impact=impact,
                    remediation=remediation,
                    is_unresolved=is_unresolved
                )
                if nvidia_result:
                    return nvidia_result
            except Exception as e:
                logger.error(f"[AIExplanationService] NVIDIA error: {e}")
                pass

        # Fallback to deterministic explanation generator
        return cls._generate_deterministic_explanation(
            title=title,
            vendor=vendor,
            category=category,
            severity=severity,
            evidence=evidence,
            impact=impact,
            remediation=remediation,
            is_unresolved=is_unresolved
        )

    @classmethod
    def _generate_deterministic_explanation(
        cls,
        title: str,
        vendor: str,
        category: str,
        severity: str,
        evidence: str,
        impact: str,
        remediation: str,
        is_unresolved: bool
    ) -> Dict[str, Any]:
        """High-fidelity deterministic template explanation."""
        if is_unresolved:
            return {
                "summary": f"Ambiguous or incomplete configuration detected on {vendor} device: '{evidence}'.",
                "why_it_matters": "The deterministic security parser encountered syntax that requires contextual interpretation or additional configuration context.",
                "potential_impact": "Configuration cannot be conclusively validated against security baselines. May mask latent access control weaknesses.",
                "security_principle": "Deterministic Verification & Explicit Configuration Hardening.",
                "recommended_action": f"Review configuration manually. Recommended: {remediation}",
                "source": "Deterministic Security Engine (AI Fallback)",
                "confidence": "Medium (Requires Human Review)"
            }

        return {
            "summary": f"Deterministic security rule identified {severity} severity finding: {title}.",
            "why_it_matters": f"The configuration statement '{evidence}' violates baseline hardening standards in {category}. Cleartext transmission or broad access exposes the device.",
            "potential_impact": impact,
            "security_principle": f"Enforce Principle of Least Privilege and Strong Cryptography across {vendor} network boundaries.",
            "recommended_action": remediation,
            "source": "Deterministic Security Engine (AI Fallback)",
            "confidence": "High (Rule-based Evidence)"
        }

    @classmethod
    async def _call_nvidia(
        cls,
        api_key: str,
        title: str,
        vendor: str,
        category: str,
        severity: str,
        evidence: str,
        impact: str,
        remediation: str,
        is_unresolved: bool
    ) -> Optional[Dict[str, Any]]:
        """Call NVIDIA OpenAI-compatible API for contextual natural language assistance."""
        prompt = f"""You are NEXORA AI, a senior network security auditor.
Explain this security audit finding based strictly on the provided evidence.

Target Device: {vendor}
Finding: {title}
Category: {category}
Severity: {severity}
Configuration Evidence: {evidence}
Potential Technical Impact: {impact}
Proposed Remediation: {remediation}
Status: {'UNRESOLVED' if is_unresolved else 'FAIL'}

Provide a structured JSON response with these exact keys:
{{
  "summary": "Concise 1-2 sentence executive summary of what is wrong",
  "why_it_matters": "Technical explanation of why this configuration is dangerous",
  "potential_impact": "Operational and security consequences if exploited",
  "security_principle": "Underlying cybersecurity principle (e.g., Least Privilege, Defense-in-Depth)",
  "recommended_action": "Clear technical recommendation for network engineer",
  "source": "NVIDIA Generative AI",
  "confidence": "High"
}}
Respond ONLY with the JSON object. Do not include markdown code block backticks.
"""
        client = AsyncOpenAI(
            base_url=settings.NVIDIA_BASE_URL,
            api_key=api_key,
            timeout=25.0
        )
        try:
            response = await client.chat.completions.create(
                model=settings.NVIDIA_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=800
            )
            text = response.choices[0].message.content.strip()
            if text.startswith("```json"):
                text = text[7:-3].strip()
            elif text.startswith("```"):
                text = text[3:-3].strip()
            
            return json.loads(text)
        except Exception as e:
            logger.error(f"[AIExplanationService] AsyncOpenAI call failed: {e}")
            return None
