from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.models.models import Finding, Remediation, Approval, Audit, Configuration
from backend.app.schemas.schemas import (
    FindingResponse,
    FindingApprovalRequest,
    FindingRejectRequest,
    RemediationSimulateResponse
)
from backend.app.services.remediation.simulator import RemediationSimulator
from backend.app.services.verification.verifier import VerificationService
from backend.app.services.ai.explainer import AIExplanationService
from backend.app.services.blockchain.chain import BlockchainLedger

router = APIRouter(prefix="/findings", tags=["Findings"])

@router.get("/{finding_id}", response_model=FindingResponse)
async def get_finding(finding_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding

@router.get("/{finding_id}/evidence")
async def get_finding_evidence(finding_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    # Fetch configuration lines for context
    audit_res = await db.execute(select(Audit).where(Audit.id == finding.audit_id))
    audit = audit_res.scalar_one()
    config_res = await db.execute(select(Configuration).where(Configuration.id == audit.configuration_id))
    config = config_res.scalar_one()

    lines = config.raw_content.splitlines()
    target_lines = set(finding.line_numbers or [])
    
    # Provide snippet with line numbers
    snippet = []
    for idx, line in enumerate(lines, start=1):
        # include target lines or lines within window of 3
        is_highlighted = idx in target_lines
        snippet.append({
            "line_number": idx,
            "content": line,
            "is_highlighted": is_highlighted
        })

    return {
        "finding_id": finding.id,
        "rule_id": finding.rule_id,
        "filename": config.filename,
        "line_numbers": finding.line_numbers,
        "evidence": finding.evidence,
        "code_snippet": snippet
    }

@router.get("/{finding_id}/impact")
async def get_finding_impact(finding_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return {
        "finding_id": finding.id,
        "rule_id": finding.rule_id,
        "title": finding.title,
        "severity": finding.severity,
        "category": finding.category,
        "impact_analysis": finding.impact,
        "affected_dimension": "Confidentiality & Access Control Integrity"
    }

@router.get("/{finding_id}/risk")
async def get_finding_risk(finding_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return {
        "finding_id": finding.id,
        "rule_id": finding.rule_id,
        "risk_score": finding.risk_score,
        "breakdown": {
            "severity_score": finding.severity_score,
            "severity_weight": "35%",
            "exposure_score": finding.exposure_score,
            "exposure_weight": "25%",
            "impact_score": finding.impact_score,
            "impact_weight": "20%",
            "exploitability_score": finding.exploitability_score,
            "exploitability_weight": "20%"
        },
        "formula": "round(((Severity * 0.35 + Exposure * 0.25 + Impact * 0.20 + Exploitability * 0.20) / 4.0) * 100)"
    }

@router.get("/{finding_id}/compliance")
async def get_finding_compliance(finding_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return {
        "finding_id": finding.id,
        "rule_id": finding.rule_id,
        "mappings": finding.compliance_mappings or []
    }

@router.get("/{finding_id}/explanation")
async def get_finding_explanation(finding_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding.ai_explanation or {}

@router.post("/{finding_id}/ai-explain")
async def trigger_ai_explain(finding_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    explanation = await AIExplanationService.explain_finding(
        title=finding.title,
        vendor=finding.vendor,
        category=finding.category,
        severity=finding.severity,
        evidence=finding.evidence,
        impact=finding.impact,
        remediation=finding.remediation_recommendation
    )

    finding.ai_explanation = explanation
    await db.commit()
    await db.refresh(finding)
    return explanation

@router.get("/{finding_id}/remediation")
async def get_finding_remediation(finding_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return {
        "finding_id": finding.id,
        "rule_id": finding.rule_id,
        "vendor": finding.vendor,
        "status": finding.status,
        "remediation_recommendation": finding.remediation_recommendation,
        "remediation_diff": finding.remediation_diff
    }

@router.post("/{finding_id}/approve")
async def approve_remediation(finding_id: int, req: FindingApprovalRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    finding.status = "APPROVED"

    # Log approval to blockchain
    await BlockchainLedger.append_event(
        event_type="REMEDIATION_APPROVED",
        event_data={
            "finding_id": finding.id,
            "rule_id": finding.rule_id,
            "reviewer": req.reviewer,
            "note": req.note
        },
        actor=req.reviewer,
        audit_id=finding.audit_id
    )

    await db.commit()
    return {"message": "Remediation approved successfully by human reviewer.", "status": "APPROVED"}

@router.post("/{finding_id}/reject")
async def reject_remediation(finding_id: int, req: FindingRejectRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    finding.status = "REJECTED"

    # Log rejection to blockchain
    await BlockchainLedger.append_event(
        event_type="REMEDIATION_REJECTED",
        event_data={
            "finding_id": finding.id,
            "rule_id": finding.rule_id,
            "reviewer": req.reviewer,
            "reason": req.note
        },
        actor=req.reviewer,
        audit_id=finding.audit_id
    )

    await db.commit()
    return {"message": "Remediation rejected. No configuration changes will be simulated.", "status": "REJECTED"}

@router.post("/{finding_id}/simulate-remediation", response_model=RemediationSimulateResponse)
async def simulate_remediation(finding_id: int, reviewer: str = "Security Administrator", db: AsyncSession = Depends(get_db)):
    # 1. Apply sandboxed remediation
    sandbox_config, finding, remediation = await RemediationSimulator.apply_sandboxed_remediation(
        finding_id=finding_id,
        reviewer=reviewer,
        note="Approved for sandboxed simulation"
    )

    # 2. Run deterministic verification on sandbox copy
    verification_results = await VerificationService.verify_remediation(
        original_audit_id=finding.audit_id,
        sandboxed_config_id=sandbox_config.id,
        target_finding_id=finding.id
    )

    return verification_results
