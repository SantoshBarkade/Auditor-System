import os
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.models.models import Audit, Finding
from backend.app.services.reporting.pdf_report import PDFReportGenerator
from backend.app.services.reporting.csv_export import CSVReportGenerator
from backend.app.services.reporting.json_export import JSONReportGenerator
from backend.app.services.blockchain.chain import BlockchainLedger

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/{audit_id}/pdf")
async def download_pdf_report(audit_id: int, db: AsyncSession = Depends(get_db)):
    audit_res = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_res.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    findings_res = await db.execute(select(Finding).where(Finding.audit_id == audit_id))
    findings = [
        {
            "id": f.id,
            "rule_id": f.rule_id,
            "title": f.title,
            "severity": f.severity,
            "status": f.status,
            "line_numbers": f.line_numbers or [],
            "evidence": f.evidence,
            "impact": f.impact
        }
        for f in findings_res.scalars().all()
    ]

    is_valid, _, msg = await BlockchainLedger.validate_chain()
    blocks = await BlockchainLedger.get_all_blocks()

    audit_dict = {
        "id": audit.id,
        "vendor": audit.vendor,
        "risk_score": audit.risk_score,
        "compliance_score": audit.compliance_score
    }

    blockchain_status = {
        "is_valid": is_valid,
        "total_blocks": len(blocks),
        "message": msg
    }

    pdf_path = await PDFReportGenerator.generate_report_async(audit_dict, findings, blockchain_status)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=os.path.basename(pdf_path)
    )

@router.get("/{audit_id}/csv")
async def download_csv_report(audit_id: int, db: AsyncSession = Depends(get_db)):
    audit_res = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_res.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    findings_res = await db.execute(select(Finding).where(Finding.audit_id == audit_id))
    findings = [
        {
            "id": f.id,
            "audit_id": f.audit_id,
            "rule_id": f.rule_id,
            "title": f.title,
            "vendor": f.vendor,
            "category": f.category,
            "severity": f.severity,
            "status": f.status,
            "risk_score": f.risk_score,
            "line_numbers": f.line_numbers or [],
            "evidence": f.evidence,
            "impact": f.impact,
            "remediation_recommendation": f.remediation_recommendation
        }
        for f in findings_res.scalars().all()
    ]

    csv_content = CSVReportGenerator.generate_findings_csv(findings)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=NEXORA_Findings_Audit_{audit_id}.csv"}
    )

@router.get("/{audit_id}/json")
async def download_json_report(audit_id: int, db: AsyncSession = Depends(get_db)):
    audit_res = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_res.scalar_one_or_none()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    findings_res = await db.execute(select(Finding).where(Finding.audit_id == audit_id))
    findings = [
        {
            "id": f.id,
            "rule_id": f.rule_id,
            "title": f.title,
            "severity": f.severity,
            "status": f.status,
            "risk_score": f.risk_score,
            "line_numbers": f.line_numbers or [],
            "evidence": f.evidence,
            "impact": f.impact,
            "remediation": f.remediation_recommendation,
            "compliance": f.compliance_mappings or []
        }
        for f in findings_res.scalars().all()
    ]

    is_valid, _, msg = await BlockchainLedger.validate_chain()
    blocks = await BlockchainLedger.get_all_blocks()

    audit_dict = {
        "id": audit.id,
        "vendor": audit.vendor,
        "status": audit.status,
        "stage": audit.stage,
        "risk_score": audit.risk_score,
        "compliance_score": audit.compliance_score,
        "created_at": audit.created_at
    }

    json_str = JSONReportGenerator.generate_audit_json(
        audit_dict,
        findings,
        {"is_valid": is_valid, "total_blocks": len(blocks), "message": msg}
    )

    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=NEXORA_Audit_{audit_id}.json"}
    )
