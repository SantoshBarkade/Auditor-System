"""
REST API endpoints for UnresolvedCase management.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.unresolved import UnresolvedCase, UnresolvedStatus
from backend.app.schemas.unresolved import (
    UnresolvedCaseResponse,
    UnresolvedCaseSummary,
    UnresolvedCaseHistoryEntry,
    AnalyzeRequest,
    ReviewRequest,
    ResolveRequest,
    RejectRequest
)
from backend.app.services.unresolved.case_service import CaseService

router = APIRouter(prefix="/unresolved", tags=["Unresolved Cases"])


@router.get("", response_model=List[UnresolvedCaseResponse])
async def list_unresolved_cases(
    vendor: Optional[str] = Query(None, description="Filter by vendor (Cisco, Fortinet, Juniper)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by lifecycle status"),
    case_type: Optional[str] = Query(None, description="Filter by Path A or Path B"),
    audit_id: Optional[int] = Query(None, description="Filter by audit ID"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """List all unresolved cases with optional filtering."""
    stmt = select(UnresolvedCase).order_by(UnresolvedCase.created_at.desc())

    if vendor:
        stmt = stmt.where(UnresolvedCase.vendor == vendor)
    if status_filter:
        stmt = stmt.where(UnresolvedCase.status == status_filter)
    if case_type:
        stmt = stmt.where(UnresolvedCase.case_type == case_type)
    if audit_id:
        stmt = stmt.where(UnresolvedCase.audit_id == audit_id)

    stmt = stmt.limit(limit)
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/stats/summary")
async def get_unresolved_stats(db: AsyncSession = Depends(get_db)):
    """Aggregate statistics for unresolved cases lifecycle."""
    res = await db.execute(select(UnresolvedCase))
    cases = list(res.scalars().all())

    return {
        "total_cases": len(cases),
        "open_cases": sum(1 for c in cases if c.status == UnresolvedStatus.OPEN),
        "analyzing_cases": sum(1 for c in cases if c.status == UnresolvedStatus.ANALYZING),
        "awaiting_review_cases": sum(1 for c in cases if c.status == UnresolvedStatus.AWAITING_REVIEW),
        "resolved_cases": sum(1 for c in cases if c.status == UnresolvedStatus.RESOLVED),
        "cannot_resolve_cases": sum(1 for c in cases if c.status == UnresolvedStatus.CANNOT_RESOLVE),
        "rejected_cases": sum(1 for c in cases if c.status == UnresolvedStatus.REJECTED),
        "path_a_missing_reference": sum(1 for c in cases if c.case_type == "MISSING_REFERENCE"),
        "path_b_unknown_syntax": sum(1 for c in cases if c.case_type == "UNKNOWN_SYNTAX"),
        "by_vendor": {
            "Cisco": sum(1 for c in cases if c.vendor == "Cisco"),
            "Fortinet": sum(1 for c in cases if c.vendor == "Fortinet"),
            "Juniper": sum(1 for c in cases if c.vendor == "Juniper"),
        }
    }


@router.get("/audit/{audit_id}", response_model=List[UnresolvedCaseSummary])
async def get_cases_for_audit(audit_id: int, db: AsyncSession = Depends(get_db)):
    """List all unresolved cases associated with a specific audit."""
    cases = await CaseService.get_cases_for_audit(db, audit_id)
    return cases


@router.get("/{case_id}", response_model=UnresolvedCaseResponse)
async def get_case(case_id: int, db: AsyncSession = Depends(get_db)):
    """Get full details of a specific unresolved case."""
    case = await CaseService.get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Unresolved case not found")
    return case


@router.get("/{case_id}/history", response_model=List[UnresolvedCaseHistoryEntry])
async def get_case_history(case_id: int, db: AsyncSession = Depends(get_db)):
    """Get the audit trail of status transitions for a case."""
    case = await CaseService.get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Unresolved case not found")
    return case.history


@router.post("/{case_id}/analyze", response_model=UnresolvedCaseResponse)
async def trigger_analysis(case_id: int, req: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    """Trigger AI investigation on an unresolved case with authoritative RAG grounding."""
    case = await CaseService.get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Unresolved case not found")
    
    try:
        updated_case = await CaseService.trigger_ai_analysis(db, case, req.actor)
        return updated_case
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{case_id}/review", response_model=UnresolvedCaseResponse)
async def submit_review(case_id: int, req: ReviewRequest, db: AsyncSession = Depends(get_db)):
    """Submit a human review for an unresolved case."""
    case = await CaseService.get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Unresolved case not found")
    
    try:
        updated_case = await CaseService.submit_review(
            db, case, req.reviewer, req.notes, req.additional_context
        )
        return updated_case
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{case_id}/resolve", response_model=UnresolvedCaseResponse)
async def resolve_case(case_id: int, req: ResolveRequest, db: AsyncSession = Depends(get_db)):
    """Provide a final verdict for a case."""
    case = await CaseService.get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Unresolved case not found")
    
    try:
        updated_case = await CaseService.resolve_case(
            db, case, req.reviewer, req.final_verdict, req.resolution_context, req.resolution_evidence
        )
        return updated_case
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{case_id}/reject", response_model=UnresolvedCaseResponse)
async def reject_case(case_id: int, req: RejectRequest, db: AsyncSession = Depends(get_db)):
    """Reject a case as invalid."""
    case = await CaseService.get_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Unresolved case not found")
    
    try:
        updated_case = await CaseService.reject_case(db, case, req.reviewer, req.reason)
        return updated_case
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
