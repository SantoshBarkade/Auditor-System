"""
NEXORA UnresolvedCase Lifecycle State Machine

Enforces valid status transitions.
Every transition is recorded in UnresolvedCaseHistory.
No code may bypass this service to mutate case status directly.

Valid state graph:
    OPEN ──────────────────────────────→ ANALYZING
    OPEN ──────────────────────────────→ AWAITING_REVIEW
    OPEN ──────────────────────────────→ REJECTED
    ANALYZING ─────────────────────────→ AWAITING_REVIEW
    ANALYZING ─────────────────────────→ RESOLVED
    ANALYZING ─────────────────────────→ CANNOT_RESOLVE
    AWAITING_REVIEW ───────────────────→ ANALYZING
    AWAITING_REVIEW ───────────────────→ RESOLVED
    AWAITING_REVIEW ───────────────────→ CANNOT_RESOLVE
    RESOLVED (terminal)
    CANNOT_RESOLVE (terminal)
    REJECTED (terminal)
"""
import datetime
from datetime import timezone
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.unresolved import (
    UnresolvedCase,
    UnresolvedCaseHistory,
    UnresolvedStatus,
)


class InvalidStateTransition(ValueError):
    """Raised when a requested state transition is not permitted."""
    pass


class UnresolvedLifecycle:
    """
    Service for safely transitioning UnresolvedCase status.
    Always creates a history record for every transition.
    """

    @classmethod
    async def transition(
        cls,
        session: AsyncSession,
        case: UnresolvedCase,
        new_status: str,
        actor: str,
        action: str,
        reason: Optional[str] = None,
        evidence: Optional[Dict[str, Any]] = None,
    ) -> UnresolvedCaseHistory:
        """
        Apply a status transition to an UnresolvedCase.

        Raises InvalidStateTransition if the move is not permitted.
        Returns the newly created history record.
        """
        current = case.status

        if new_status not in UnresolvedStatus.ALL:
            raise InvalidStateTransition(
                f"Unknown status '{new_status}'. Valid values: {UnresolvedStatus.ALL}"
            )

        allowed = UnresolvedStatus.TRANSITIONS.get(current, set())
        if new_status not in allowed:
            if current in UnresolvedStatus.TERMINAL:
                raise InvalidStateTransition(
                    f"Case {case.id} is in terminal state '{current}' and cannot transition."
                )
            raise InvalidStateTransition(
                f"Cannot transition from '{current}' to '{new_status}'. "
                f"Allowed: {allowed}"
            )

        # Record history BEFORE changing case status
        history = UnresolvedCaseHistory(
            case_id=case.id,
            previous_status=current,
            new_status=new_status,
            actor=actor,
            action=action,
            reason=reason,
            evidence=evidence,
            timestamp=datetime.datetime.now(timezone.utc),
        )
        session.add(history)

        # Update case status
        case.status = new_status
        case.updated_at = datetime.datetime.now(timezone.utc)
        session.add(case)

        return history

    @classmethod
    async def record_creation(
        cls,
        session: AsyncSession,
        case: UnresolvedCase,
        actor: str = "SYSTEM",
    ) -> UnresolvedCaseHistory:
        """Record the initial creation event in history."""
        history = UnresolvedCaseHistory(
            case_id=case.id,
            previous_status="",
            new_status=UnresolvedStatus.OPEN,
            actor=actor,
            action="CASE_CREATED",
            reason="Deterministic engine could not establish security meaning.",
            timestamp=datetime.datetime.now(timezone.utc),
        )
        session.add(history)
        return history
