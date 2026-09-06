import os
import json
import httpx
from typing import Dict, Any, Optional
from backend.app.core.config import settings

class AIExplanationService:
    """
    Assistive AI Explanation Service for NEXORA.
    Provides contextual security explanations, impact interpretations, and remediation summaries.
    Strict Invariant: AI NEVER modifies deterministic PASS/FAIL, evidence, or risk scores.
    Operates seamlessly in two modes:
    - Mode A: High-fidelity deterministic template generator (Default / Zero-API-key fallback).
    - Mode B: Gemini Generative AI (active if GEMINI_API_KEY is configured).
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
        api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")

        if api_key:
            try:
                gemini_result = await cls._call_gemini(
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
                if gemini_result:
                    return gemini_result
            except Exception as e:
                print(f"[AIExplanationService] Gemini error: {e}")
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
    async def _call_gemini(
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
        """Call Gemini REST API for contextual natural language assistance."""
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
  "source": "Gemini Generative AI",
  "confidence": "High"
}}
Respond ONLY with the JSON object. Do not include markdown code block backticks.
"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 800}
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    return None
                parts = candidates[0].get("content", {}).get("parts", [])
                full_text = ""
                for p in parts:
                    if "text" in p and not p.get("thought", False):
                        full_text += p["text"]
                if not full_text and parts:
                    full_text = parts[-1].get("text", "")

                start = full_text.find("{")
                end = full_text.rfind("}")
                if start != -1 and end != -1:
                    json_str = full_text[start:end+1]
                    return json.loads(json_str)
            else:
                print(f"[AIExplanationService] Gemini API returned HTTP {resp.status_code}: {resp.text}")
        return None
