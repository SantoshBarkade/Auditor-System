"""
NEXORA UnresolvedCase Domain Model

An UnresolvedCase is created when the deterministic security engine cannot safely
establish the security/compliance meaning of a configuration element.

INVARIANTS:
  - UNRESOLVED != FAIL
  - UNRESOLVED != compliance GAP
  - AI analysis is stored separately from authoritative status
  - Every status transition creates a history record
  - The deterministic engine is re-run on resolution (never manual verdict set)
"""
import datetime
from datetime import timezone
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, JSON, Index
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


# ---------------------------------------------------------------------------
# Status / Case-type constants (single source of truth)
# ---------------------------------------------------------------------------

class UnresolvedStatus:
    """Lifecycle states for an UnresolvedCase."""
    OPEN = "OPEN"
    ANALYZING = "ANALYZING"
    AWAITING_REVIEW = "AWAITING_REVIEW"
    RESOLVED = "RESOLVED"
    CANNOT_RESOLVE = "CANNOT_RESOLVE"
    REJECTED = "REJECTED"

    ALL = {OPEN, ANALYZING, AWAITING_REVIEW, RESOLVED, CANNOT_RESOLVE, REJECTED}
    TERMINAL = {RESOLVED, CANNOT_RESOLVE, REJECTED}

    # Valid transitions: {from_status: {allowed_to_status, ...}}
    TRANSITIONS = {
        OPEN: {ANALYZING, AWAITING_REVIEW, REJECTED},
        ANALYZING: {AWAITING_REVIEW, RESOLVED, CANNOT_RESOLVE},
        AWAITING_REVIEW: {RESOLVED, CANNOT_RESOLVE, ANALYZING},
        RESOLVED: set(),       # terminal
        CANNOT_RESOLVE: set(), # terminal
        REJECTED: set(),       # terminal
    }


class UnresolvedCaseType:
    """Two architectural paths for unresolved cases."""
    MISSING_REFERENCE = "MISSING_REFERENCE"   # Path A
    UNKNOWN_SYNTAX = "UNKNOWN_SYNTAX"         # Path B
    ALL = {MISSING_REFERENCE, UNKNOWN_SYNTAX}


class FinalVerdict:
    """Terminal verdicts set only after deterministic re-evaluation."""
    CONFIRMED_SAFE = "CONFIRMED_SAFE"
    CONFIRMED_VIOLATION = "CONFIRMED_VIOLATION"
    RESOLVED_WITH_CONTEXT = "RESOLVED_WITH_CONTEXT"
    CANNOT_RESOLVE = "CANNOT_RESOLVE"
    ALL = {CONFIRMED_SAFE, CONFIRMED_VIOLATION, RESOLVED_WITH_CONTEXT, CANNOT_RESOLVE}


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------

class UnresolvedCase(Base):
    """
    First-class domain entity for configuration findings that the deterministic
    security engine could not conclusively evaluate.

    Linked to the originating Audit, Configuration, and Finding.
    """
    __tablename__ = "unresolved_cases"

    id = Column(Integer, primary_key=True, index=True)

    # --- Relationships ---
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False, index=True)
    configuration_id = Column(Integer, ForeignKey("configurations.id"), nullable=False, index=True)
    finding_id = Column(Integer, ForeignKey("findings.id"), nullable=True, index=True)

    # --- Classification ---
    case_type = Column(String(30), nullable=False)          # UnresolvedCaseType
    status = Column(String(30), nullable=False, default=UnresolvedStatus.OPEN, index=True)
    reason = Column(Text, nullable=False)                   # Why UNRESOLVED was emitted

    # --- Vendor / Feature Context ---
    vendor = Column(String(50), nullable=False)
    feature = Column(String(100), nullable=True)            # Parser section (e.g. "line vty")
    rule_id = Column(String(100), nullable=True)            # Originating rule id

    # --- Evidence (immutable once written) ---
    source_lines = Column(JSON, nullable=False, default=list)   # Line numbers
    source_text = Column(Text, nullable=True)                   # Raw configuration snippet
    normalized_facts = Column(JSON, nullable=True, default=dict)

    # --- Path A: Missing Reference ---
    missing_reference = Column(JSON, nullable=True, default=dict)
    # {
    #   "reference_type": str,     # e.g. "POLICY_OBJECT", "ACL", "ZONE"
    #   "reference_name": str,
    #   "depends_on": str,
    #   "why_needed": str
    # }

    # --- Path B: Unknown Syntax ---
    unknown_syntax = Column(JSON, nullable=True, default=dict)
    # {
    #   "raw_statement": str,
    #   "section_context": str,
    #   "parser_reason": str,
    #   "security_keywords_found": list
    # }

    # --- AI Analysis (never authoritative) ---
    ai_analysis = Column(JSON, nullable=True)
    # {
    #   "interpretation": str,
    #   "confidence": str,       # "HIGH" | "MEDIUM" | "LOW"
    #   "reasoning_summary": str,
    #   "missing_information": list[str],
    #   "recommendation": str,
    #   "source": str,           # "NVIDIA AI Provider" | "Deterministic Fallback Engine"
    #   "warning": str           # Always includes: "AI analysis is not authoritative"
    # }
    ai_analyzed_at = Column(DateTime(timezone=True), nullable=True)

    # --- Human Review ---
    reviewer = Column(String(100), nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # --- Resolution ---
    resolution_context = Column(Text, nullable=True)
    resolution_evidence = Column(JSON, nullable=True, default=dict)

    # --- Final Verdict (set only after deterministic re-evaluation) ---
    final_verdict = Column(String(30), nullable=True)  # FinalVerdict.*

    # --- Timestamps ---
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(timezone.utc),
        onupdate=lambda: datetime.datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Relationships ---
    history = relationship(
        "UnresolvedCaseHistory",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="UnresolvedCaseHistory.timestamp",
    )

    __table_args__ = (
        Index("ix_unresolved_cases_audit_status", "audit_id", "status"),
        Index("ix_unresolved_cases_type", "case_type"),
    )


class UnresolvedCaseHistory(Base):
    """
    Immutable audit trail for every status transition on an UnresolvedCase.
    Records who did what, when, and why.
    """
    __tablename__ = "unresolved_case_history"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("unresolved_cases.id"), nullable=False, index=True)

    previous_status = Column(String(30), nullable=False)
    new_status = Column(String(30), nullable=False)
    actor = Column(String(100), nullable=False, default="SYSTEM")
    action = Column(String(100), nullable=False)
    reason = Column(Text, nullable=True)
    evidence = Column(JSON, nullable=True)

    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(timezone.utc),
        nullable=False,
    )

    case = relationship("UnresolvedCase", back_populates="history")
