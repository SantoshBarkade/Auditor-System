import os
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.models.models import Configuration, Audit, Finding, Device
from backend.app.models.unresolved import UnresolvedCase, UnresolvedStatus
from backend.app.schemas.schemas import DashboardSummaryResponse
from backend.app.services.blockchain.chain import BlockchainLedger
from backend.app.services.audit_pipeline import AuditPipelineService
from backend.app.services.vendor_detection.detector import VendorDetector
from backend.app.core.config import settings

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    # 1. Total configs
    config_count_res = await db.execute(select(func.count(Configuration.id)))
    total_configs = config_count_res.scalar() or 0

    # 2. Total audits
    audit_count_res = await db.execute(select(func.count(Audit.id)))
    total_audits = audit_count_res.scalar() or 0

    # 3. Findings breakdown
    findings_res = await db.execute(select(Finding))
    findings = list(findings_res.scalars().all())

    crit_count = sum(1 for f in findings if f.severity == "CRITICAL" and f.status != "VERIFIED")
    high_count = sum(1 for f in findings if f.severity == "HIGH" and f.status != "VERIFIED")
    med_count = sum(1 for f in findings if f.severity == "MEDIUM" and f.status != "VERIFIED")
    low_count = sum(1 for f in findings if f.severity == "LOW" and f.status != "VERIFIED")

    open_count = sum(1 for f in findings if f.status in ["OPEN", "PENDING_APPROVAL", "REJECTED"])
    remediated_count = sum(1 for f in findings if f.status in ["VERIFIED", "RESOLVED"])

    avg_risk = round(sum(f.risk_score for f in findings) / len(findings)) if findings else 0

    # 4. Vendor distribution
    vendor_dist = {"Cisco": 0, "Fortinet": 0, "Juniper": 0}
    for f in findings:
        if f.vendor in vendor_dist:
            vendor_dist[f.vendor] += 1

    severity_dist = {
        "CRITICAL": crit_count,
        "HIGH": high_count,
        "MEDIUM": med_count,
        "LOW": low_count
    }

    # 5. Blockchain integrity
    is_valid, _, _ = await BlockchainLedger.validate_chain()
    blocks = await BlockchainLedger.get_all_blocks()

    # 6. Compliance average
    audits_res = await db.execute(select(Audit).order_by(Audit.created_at.desc()).limit(10))
    recent_audits_raw = list(audits_res.scalars().all())
    comp_pct = round(sum(a.compliance_score for a in recent_audits_raw) / len(recent_audits_raw), 1) if recent_audits_raw else 100.0

    recent_audits = [
        {
            "id": a.id,
            "vendor": a.vendor,
            "status": a.status,
            "stage": a.stage,
            "risk_score": a.risk_score,
            "findings_count": a.findings_count,
            "compliance_score": a.compliance_score,
            "is_verification": a.is_verification,
            "created_at": a.created_at
        }
        for a in recent_audits_raw
    ]

    recent_findings_raw = sorted(findings, key=lambda f: f.created_at, reverse=True)[:6]
    recent_findings = [
        {
            "id": f.id,
            "audit_id": f.audit_id,
            "rule_id": f.rule_id,
            "title": f.title,
            "vendor": f.vendor,
            "severity": f.severity,
            "status": f.status,
            "risk_score": f.risk_score,
            "created_at": f.created_at
        }
        for f in recent_findings_raw
    ]

    # Count unresolved cases
    unresolved_res = await db.execute(
        select(func.count(UnresolvedCase.id))
        .where(UnresolvedCase.status.in_([UnresolvedStatus.OPEN, UnresolvedStatus.ANALYZING, UnresolvedStatus.AWAITING_REVIEW]))
    )
    unresolved_count = unresolved_res.scalar() or 0

    pass_count = sum(1 for f in findings if f.verdict == "PASS")
    fail_count = sum(1 for f in findings if f.verdict == "FAIL")
    na_count = sum(1 for f in findings if f.verdict == "N/A")
    conflict_count = sum(1 for f in findings if f.verdict == "CONFLICT")

    return DashboardSummaryResponse(
        unresolved_count=unresolved_count,
        pass_findings=pass_count,
        fail_findings=fail_count,
        na_findings=na_count,
        conflict_findings=conflict_count,
        total_configurations=total_configs,
        total_audits=total_audits,
        critical_findings=crit_count,
        high_findings=high_count,
        medium_findings=med_count,
        low_findings=low_count,
        open_findings=open_count,
        remediated_findings=remediated_count,
        average_risk_score=avg_risk,
        overall_compliance_pct=comp_pct,
        blockchain_integrity=is_valid,
        total_blockchain_blocks=len(blocks),
        vendor_distribution=vendor_dist,
        severity_distribution=severity_dist,
        recent_audits=recent_audits,
        recent_findings=recent_findings
    )

@router.post("/demo/{vendor}")
async def run_vendor_demo(vendor: str, db: AsyncSession = Depends(get_db)):
    """
    1-Click Live Demonstration Engine:
    Loads sample insecure config for specified vendor (Cisco, Fortinet, Juniper),
    ingests configuration, and executes full 10-step audit pipeline.
    """
    vendor_lower = vendor.lower()
    if "cisco" in vendor_lower:
        sample_file = "cisco_insecure.cfg"
        v_name = "Cisco"
    elif "forti" in vendor_lower:
        sample_file = "fortigate_insecure.conf"
        v_name = "Fortinet"
    elif "juniper" in vendor_lower or "junos" in vendor_lower:
        sample_file = "juniper_insecure.conf"
        v_name = "Juniper"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported demo vendor: {vendor}")

    path = os.path.join(settings.SAMPLE_CONFIGS_DIR, sample_file)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Demo configuration {sample_file} not found")

    with open(path, "r", encoding="utf-8", errors="replace") as f:
        raw_content = f.read()

    from backend.app.services.normalization.normalizer import NormalizerService
    _, normalized, _ = NormalizerService.normalize_configuration(raw_content, sample_file, v_name)

    # Find or create device
    hostname = normalized.device.hostname or "Device-01"
    dev_res = await db.execute(select(Device).where(Device.hostname == hostname))
    device = dev_res.scalar_one_or_none()
    if not device:
        device = Device(
            hostname=hostname,
            vendor=v_name,
            model=normalized.device.platform or "Network Appliance",
            ip_address="192.168.1.1"
        )
        db.add(device)
        await db.flush()

    # Create Configuration
    config = Configuration(
        device_id=device.id,
        filename=sample_file,
        vendor=v_name,
        raw_content=raw_content,
        line_count=len(raw_content.splitlines()),
        file_size=len(raw_content.encode("utf-8")),
        is_sandbox=False
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)

    # Run audit pipeline
    audit_res = await AuditPipelineService.run_audit(config.id)
    audit = audit_res["audit"]

    return {
        "message": f"{v_name} Demonstration Audit executed successfully.",
        "audit_id": audit.id,
        "configuration_id": config.id,
        "vendor": v_name,
        "findings_count": audit.findings_count,
        "risk_score": audit.risk_score,
        "compliance_score": audit.compliance_score
    }
