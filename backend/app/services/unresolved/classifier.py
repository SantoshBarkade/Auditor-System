"""
NEXORA UnresolvedCase Classifier

Classifies a raw UNRESOLVED finding dict (produced by SecurityEvaluator)
into one of two architectural paths:

    Path A — MISSING_REFERENCE
        The configuration can be partially understood, but a required
        reference (object, policy, external context) is unavailable.

    Path B — UNKNOWN_SYNTAX
        The parser encountered syntax for which it cannot safely determine
        security meaning. Always generates an UnresolvedCase; never silently
        ignores or assumes compliant.
"""
from typing import Any, Dict, Tuple
from backend.app.models.unresolved import UnresolvedCaseType


# Keywords that signal a syntax-unknown situation
_UNKNOWN_SYNTAX_INDICATORS = {
    "unresolved security-sensitive",
    "could not be classified",
    "not recognised by the deterministic parser",
    "deterministic parser",
    "parser gap",
    "unrecognised directive",
    "unknown directive",
}

# Keywords that signal a missing reference situation
_MISSING_REFERENCE_INDICATORS = {
    "referenced object",
    "missing reference",
    "object-group",
    "policy not found",
    "referenced policy",
    "referenced acl",
    "dependent configuration",
    "context unavailable",
    "external context",
    "required baseline",
}


class UnresolvedClassifier:
    """
    Classifies UNRESOLVED findings into Path A or Path B.

    Input: a finding dict as produced by SecurityEvaluator (verdict == "UNRESOLVED").
    Output: (case_type, structured_detail_dict)
    """

    @classmethod
    def classify(
        cls,
        finding: Dict[str, Any],
        normalized_facts: Dict[str, Any] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Returns (case_type, detail_dict).

        case_type is one of UnresolvedCaseType.*.
        detail_dict contains the Path-A or Path-B structured evidence.
        """
        description = (finding.get("description") or "").lower()
        evidence = (finding.get("evidence") or "").lower()
        ai_explanation = finding.get("ai_explanation") or {}

        # --- Path B detection (most common for parser gaps) ---
        if cls._is_unknown_syntax(description, evidence, ai_explanation):
            detail = cls._build_unknown_syntax_detail(finding)
            return UnresolvedCaseType.UNKNOWN_SYNTAX, detail

        # --- Path A detection ---
        if cls._is_missing_reference(description, evidence):
            detail = cls._build_missing_reference_detail(finding)
            return UnresolvedCaseType.MISSING_REFERENCE, detail

        # --- Default: treat as Path B (safer default — unknown > assumed missing) ---
        detail = cls._build_unknown_syntax_detail(finding)
        return UnresolvedCaseType.UNKNOWN_SYNTAX, detail

    @classmethod
    def _is_unknown_syntax(
        cls,
        description: str,
        evidence: str,
        ai_explanation: Dict[str, Any],
    ) -> bool:
        combined = description + " " + evidence
        for indicator in _UNKNOWN_SYNTAX_INDICATORS:
            if indicator in combined:
                return True
        # Check AI explanation confidence field
        confidence = str(ai_explanation.get("confidence", "")).lower()
        if "parser gap" in confidence or "human review" in confidence:
            return True
        return False

    @classmethod
    def _is_missing_reference(cls, description: str, evidence: str) -> bool:
        combined = description + " " + evidence
        for indicator in _MISSING_REFERENCE_INDICATORS:
            if indicator in combined:
                return True
        return False

    @classmethod
    def _build_unknown_syntax_detail(cls, finding: Dict[str, Any]) -> Dict[str, Any]:
        """Build Path B structured detail."""
        description = finding.get("description") or ""
        # Extract security keywords found in description
        security_keywords = []
        for kw in ["password", "telnet", "http", "ssh", "snmp", "secret", "enable",
                   "auth", "encrypt", "permit", "deny", "any", "access"]:
            if kw in description.lower() or kw in (finding.get("evidence") or "").lower():
                security_keywords.append(kw)

        return {
            "raw_statement": finding.get("evidence", ""),
            "section_context": _extract_section(description),
            "parser_reason": _extract_parser_reason(description),
            "security_keywords_found": security_keywords,
        }

    @classmethod
    def _build_missing_reference_detail(cls, finding: Dict[str, Any]) -> Dict[str, Any]:
        """Build Path A structured detail."""
        description = finding.get("description") or ""
        return {
            "reference_type": _extract_reference_type(description),
            "reference_name": _extract_reference_name(finding.get("evidence") or ""),
            "depends_on": "",
            "why_needed": description[:500],
        }


def _extract_section(description: str) -> str:
    if "section context:" in description.lower():
        idx = description.lower().index("section context:") + len("section context:")
        part = description[idx:].strip()
        return part.split(".")[0].split("\n")[0].strip()
    return ""


def _extract_parser_reason(description: str) -> str:
    if "reason:" in description.lower():
        idx = description.lower().index("reason:") + len("reason:")
        return description[idx:].strip()[:300]
    return "Parser could not deterministically classify this directive."


def _extract_reference_type(description: str) -> str:
    for candidate in ["object-group", "policy", "acl", "zone", "reference"]:
        if candidate in description.lower():
            return candidate.upper()
    return "UNKNOWN"


def _extract_reference_name(evidence: str) -> str:
    # Try to extract the name from an evidence string
    parts = evidence.split()
    if len(parts) >= 2:
        return parts[-1][:100]
    return evidence[:100]
