"""
Pydantic schemas for the NEXORA UnresolvedCase API layer.
These are the only types exposed over HTTP — ORM models are never returned directly.
"""
import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Nested detail schemas
# ---------------------------------------------------------------------------

class MissingReferenceDetail(BaseModel):
    reference_type: Optional[str] = None
    reference_name: Optional[str] = None
    depends_on: Optional[str] = None
    why_needed: Optional[str] = None


class UnknownSyntaxDetail(BaseModel):
    raw_statement: Optional[str] = None
    section_context: Optional[str] = None
    parser_reason: Optional[str] = None
    security_keywords_found: List[str] = Field(default_factory=list)


class AIAnalysis(BaseModel):
    interpretation: Optional[str] = None
    confidence: Optional[str] = None
    reasoning_summary: Optional[str] = None
    missing_information: List[str] = Field(default_factory=list)
    recommendation: Optional[str] = None
    source: Optional[str] = None
    warning: str = "AI analysis is not authoritative. It is advisory only."


# ---------------------------------------------------------------------------
# History entry
# ---------------------------------------------------------------------------

class UnresolvedCaseHistoryEntry(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    case_id: int
    previous_status: str
    new_status: str
    actor: str
    action: str
    reason: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    timestamp: datetime.datetime


# ---------------------------------------------------------------------------
# Core UnresolvedCase response
# ---------------------------------------------------------------------------

class UnresolvedCaseResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    audit_id: int
    configuration_id: int
    finding_id: Optional[int] = None
    case_type: str
    status: str
    reason: str
    vendor: str
    feature: Optional[str] = None
    rule_id: Optional[str] = None
    source_lines: List[int]
    source_text: Optional[str] = None
    normalized_facts: Optional[Dict[str, Any]] = None
    missing_reference: Optional[Dict[str, Any]] = None
    unknown_syntax: Optional[Dict[str, Any]] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    ai_analyzed_at: Optional[datetime.datetime] = None
    reviewer: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime.datetime] = None
    resolution_context: Optional[str] = None
    resolution_evidence: Optional[Dict[str, Any]] = None
    final_verdict: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class UnresolvedCaseSummary(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    audit_id: int
    case_type: str
    status: str
    reason: str
    vendor: str
    feature: Optional[str] = None
    rule_id: Optional[str] = None
    source_lines: List[int]
    final_verdict: Optional[str] = None
    created_at: datetime.datetime


# ---------------------------------------------------------------------------
# Request schemas for reviewer actions
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    """Trigger AI investigation for an unresolved case."""
    actor: str = Field(default="SYSTEM", description="Who triggered the analysis")


class ReviewRequest(BaseModel):
    """Submit a human review with context."""
    reviewer: str = Field(..., description="Reviewer identity")
    notes: str = Field(..., description="Review notes or additional context")
    additional_context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional reference/context data that may help resolution"
    )


class ResolveRequest(BaseModel):
    """Resolve an unresolved case with a final verdict."""
    reviewer: str = Field(..., description="Reviewer identity")
    final_verdict: str = Field(
        ...,
        description="Final verdict after investigation: CONFIRMED_SAFE | CONFIRMED_VIOLATION | RESOLVED_WITH_CONTEXT | CANNOT_RESOLVE"
    )
    resolution_context: str = Field(..., description="Explanation of how the case was resolved")
    resolution_evidence: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Evidence supporting the resolution"
    )


class RejectRequest(BaseModel):
    """Reject an unresolved case as invalid."""
    reviewer: str = Field(..., description="Reviewer identity")
    reason: str = Field(..., description="Why this case is being rejected")
