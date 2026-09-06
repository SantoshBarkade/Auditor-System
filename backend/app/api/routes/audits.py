from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.models.models import Audit, Finding, Configuration
from backend.app.schemas.schemas import AuditResponse, FindingResponse
from backend.app.services.audit_pipeline import AuditPipelineService
from backend.app.services.compliance.mapping_engine import ComplianceEngine

router = APIRouter(prefix="/audits", tags=["Audits"])

@router.post("/run")
async def run_audit(data: Dict[str, int]):
    configuration_id = data.get("configuration_id")
    if not configuration_id:
        raise HTTPException(status_code=400, detail="configuration_id is required")

    try:
        result = await AuditPipelineService.run_audit(configuration_id)
        audit = result["audit"]
        return {
            "audit_id": audit.id,
            "configuration_id": audit.configuration_id,
            "vendor": audit.vendor,
            "status": audit.status,
            "stage": audit.stage,
            "risk_score": audit.risk_score,
            "findings_count": audit.findings_count,
            "compliance_score": audit.compliance_score,
            "is_verification": audit.is_verification,
            "created_at": audit.created_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[AuditResponse])
async def list_audits(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Audit).order_by(Audit.created_at.desc()))
    return list(res.scalars().all())

@router.get("/{audit_id}", response_model=AuditResponse)
async def get_audit(audit_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = res.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit

@router.get("/{audit_id}/findings", response_model=List[FindingResponse])
async def get_audit_findings(audit_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.audit_id == audit_id).order_by(Finding.risk_score.desc()))
    return list(res.scalars().all())

@router.get("/{audit_id}/compliance-posture")
async def get_audit_compliance_posture(audit_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Finding).where(Finding.audit_id == audit_id))
    findings = list(res.scalars().all())
    findings_dicts = [
        {
            "id": f.id,
            "rule_id": f.rule_id,
            "title": f.title,
            "severity": f.severity,
            "status": f.status,
            "compliance_mappings": f.compliance_mappings or []
        }
        for f in findings
    ]
    return ComplianceEngine.evaluate_posture(findings_dicts)
