"""
Security Posture Summary Endpoint â€” NEXORA SIH 2026
Provides a single computed payload covering everything the Security Posture
page needs. All values are derived from real database state. No fallback
hardcoding. Empty/zero states are returned honestly when no data exists.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.models.models import Audit, Finding, BlockchainBlock
from backend.app.services.compliance.mapping_engine import ComplianceEngine

router = APIRouter(prefix="/posture", tags=["Security Posture"])

# Maps finding category â†’ display label used in Control Health bars
CATEGORY_LABEL_MAP = {
    "Authentication":    "Authentication",
    "Network":           "Network Security",
    "Access Control":    "Access Control",
    "Logging":           "Logging",
    "Encryption":        "Encryption",
    "Management":        "Management",
}

# Severity â†’ maximum penalty score applied when computing control health
SEVERITY_PENALTY = {
    "CRITICAL": 35,
    "HIGH":     20,
    "MEDIUM":   10,
    "LOW":       4,
    "INFO":      1,
}

# Blockchain event types that are meaningful for the activity feed
ACTIVITY_EVENT_TYPES = {
    "AUDIT_STARTED",
    "AUDIT_COMPLETED",
    "REMEDIATION_APPROVED",
    "REMEDIATION_REJECTED",
    "REMEDIATION_APPROVED_AND_SIMULATED",
    "VERIFICATION_COMPLETED",
    "VERIFICATION_FAILED",
    "CONFIG_UPLOADED",
}

# Human-readable descriptions for blockchain events
def _describe_event(event_type: str, payload: dict) -> str:
    if event_type == "AUDIT_COMPLETED":
        vendor = payload.get("vendor", "Unknown")
        count  = payload.get("findings_count", 0)
        risk   = payload.get("risk_score", 0)
        return f"{vendor} audit completed Â· {count} findings Â· Risk {risk}"
    if event_type == "AUDIT_STARTED":
        return "Configuration audit initialised"
    if event_type == "REMEDIATION_APPROVED":
        rule = payload.get("rule_id", "")
        reviewer = payload.get("reviewer", "Reviewer")
        return f"Patch approved by {reviewer} Â· {rule}"
    if event_type == "REMEDIATION_REJECTED":
        rule = payload.get("rule_id", "")
        reviewer = payload.get("reviewer", "Reviewer")
        return f"Patch rejected by {reviewer} Â· {rule}"
    if event_type == "REMEDIATION_APPROVED_AND_SIMULATED":
        return f"Sandbox simulation started Â· {payload.get('rule_id', '')}"
    if event_type == "VERIFICATION_COMPLETED":
        passed = payload.get("verification_passed", False)
        before = payload.get("risk_before", 0)
        after  = payload.get("risk_after", 0)
        state  = "Passed" if passed else "Completed"
        return f"Verification {state} Â· Risk {before} â†’ {after}"
    if event_type == "VERIFICATION_FAILED":
        rule = payload.get("target_rule", "")
        return f"Verification failed Â· {rule} persists after patch"
    if event_type == "CONFIG_UPLOADED":
        return f"Configuration uploaded Â· {payload.get('vendor', 'Unknown')}"
    return event_type.replace("_", " ").title()


def _compute_control_health(findings: list) -> dict:
    """
    Computes a 0â€“100 health score per security category.
    Starts at 100 and deducts a penalty for each open finding in that category.
    Score is clamped to 0. Higher = healthier.
    """
    categories = list(CATEGORY_LABEL_MAP.keys())
    health = {cat: 100 for cat in categories}

    open_statuses = {"OPEN", "REJECTED"}
    for f in findings:
        if f.status not in open_statuses:
            continue
        cat = f.category or "Management"
        if cat not in health:
            cat = "Management"
        penalty = SEVERITY_PENALTY.get(f.severity or "INFO", 1)
        health[cat] = max(0, health[cat] - penalty)

    # Remap to display labels
    return {CATEGORY_LABEL_MAP[cat]: health[cat] for cat in categories}


def _compute_exposure_matrix(findings: list) -> dict:
    """
    category Ã— severity count grid.
    Only counts OPEN or REJECTED findings.
    """
    matrix: dict = {}
    open_statuses = {"OPEN", "REJECTED"}
    for f in findings:
        if f.status not in open_statuses:
            continue
        cat = CATEGORY_LABEL_MAP.get(f.category or "Management", "Management")
        sev = f.severity or "INFO"
        if cat not in matrix:
            matrix[cat] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        if sev in matrix[cat]:
            matrix[cat][sev] += 1
    return matrix


def _compute_top_contributors(findings: list, total_risk: float, n: int = 5) -> list:
    """Top N open findings sorted by risk_score, with % contribution."""
    open_findings = [f for f in findings if f.status in {"OPEN", "REJECTED"}]
    sorted_f = sorted(open_findings, key=lambda x: x.risk_score or 0, reverse=True)
    result = []
    for f in sorted_f[:n]:
        contribution = round((f.risk_score / total_risk * 100), 1) if total_risk > 0 else 0.0
        result.append({
            "finding_id": f.id,
            "rule_id": f.rule_id,
            "title": f.title,
            "vendor": f.vendor,
            "severity": f.severity,
            "risk_score": f.risk_score,
            "risk_contribution_pct": contribution,
        })
    return result


@router.get("/summary")
async def get_posture_summary(db: AsyncSession = Depends(get_db)):
    """
    Returns a complete, real-data Security Posture payload for the Posture dashboard.
    Every field is derived from DB state. Returns empty/zero honestly when no data.
    """

    # â”€â”€ 1. Load all non-verification audits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    audits_res = await db.execute(
        select(Audit).where(Audit.is_verification == False).order_by(Audit.created_at.asc())
    )
    audits = list(audits_res.scalars().all())

    # â”€â”€ 2. Load all findings across all non-verification audits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    all_findings = []
    if audits:
        audit_ids = [a.id for a in audits]
        findings_res = await db.execute(
            select(Finding).where(Finding.audit_id.in_(audit_ids))
        )
        all_findings = list(findings_res.scalars().all())

    open_findings = [f for f in all_findings if f.status in {"OPEN", "REJECTED"} and f.verdict != "UNRESOLVED"]
    unresolved_count = sum(1 for f in all_findings if f.verdict == "UNRESOLVED")

    # â”€â”€ 3. KPI Aggregates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    total_open     = len(open_findings)
    critical_count = sum(1 for f in open_findings if f.severity == "CRITICAL")
    high_count     = sum(1 for f in open_findings if f.severity == "HIGH")
    medium_count   = sum(1 for f in open_findings if f.severity == "MEDIUM")
    low_count      = sum(1 for f in open_findings if f.severity == "LOW")

    # Global risk index = average risk_score across open findings (0 if none)
    total_risk_sum = sum(f.risk_score or 0 for f in open_findings)
    global_risk_index = round(total_risk_sum / total_open) if total_open > 0 else 0

    # â”€â”€ 4. Control Health (per-category 0â€“100) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    control_health = _compute_control_health(all_findings)

    # â”€â”€ 5. Vendor Posture (per-vendor: risk, findings count, compliance %) â”€â”€
    vendor_posture: dict = {}
    for audit in audits:
        v = audit.vendor or "Unknown"
        if v not in vendor_posture:
            vendor_posture[v] = {
                "risk_scores": [],
                "findings_count": 0,
                "compliance_pcts": [],
            }
        vendor_posture[v]["risk_scores"].append(audit.risk_score or 0)
        vendor_posture[v]["compliance_pcts"].append(audit.compliance_score or 0.0)

    # Open findings aggregated below per vendor

    # Count open findings per vendor
    vendor_finding_counts: dict = {}
    for f in open_findings:
        v = f.vendor or "Unknown"
        vendor_finding_counts[v] = vendor_finding_counts.get(v, 0) + 1

    vendor_summary = {}
    for v, data in vendor_posture.items():
        avg_risk       = round(sum(data["risk_scores"]) / len(data["risk_scores"])) if data["risk_scores"] else 0
        avg_compliance = round(sum(data["compliance_pcts"]) / len(data["compliance_pcts"]), 1) if data["compliance_pcts"] else 0.0
        vendor_summary[v] = {
            "avg_risk_score":    avg_risk,
            "open_findings":     vendor_finding_counts.get(v, 0),
            "avg_compliance_pct": avg_compliance,
        }

    # â”€â”€ 6. Framework Coverage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    findings_dicts = [
        {
            "id":               f.id,
            "rule_id":          f.rule_id,
            "title":            f.title,
            "severity":         f.severity,
            "status":           f.status,
            "compliance_mappings": f.compliance_mappings or [],
        }
        for f in all_findings
    ]
    posture_data = ComplianceEngine.evaluate_posture(findings_dicts)
    framework_coverage = {
        fw: round(fw_data["compliance_pct"], 1)
        for fw, fw_data in posture_data["frameworks"].items()
    }
    overall_compliance_pct = posture_data["overall_compliance_pct"]

    # â”€â”€ 7. Exposure Matrix â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    exposure_matrix = _compute_exposure_matrix(all_findings)

    # â”€â”€ 8. Audit Trend (real per-audit data only â€” never fabricated) â”€â”€â”€â”€â”€â”€â”€â”€
    audit_trend = [
        {
            "audit_id":        a.id,
            "vendor":          a.vendor,
            "risk_score":      a.risk_score or 0,
            "compliance_score": a.compliance_score or 0.0,
            "findings_count":  a.findings_count or 0,
            "stage":           a.stage,
            "created_at":      a.created_at.isoformat() if a.created_at else None,
        }
        for a in audits
    ]

    # â”€â”€ 9. Top Risk Contributors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    top_contributors = _compute_top_contributors(all_findings, total_risk_sum, n=5)

    # â”€â”€ 10. Posture Activity Feed (from blockchain) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    blocks_res = await db.execute(
        select(BlockchainBlock).order_by(BlockchainBlock.block_index.desc()).limit(30)
    )
    blocks = list(blocks_res.scalars().all())

    activity_feed = []
    for block in blocks:
        payload = block.event_data or {}
        event_type = block.event_type or ""
        if event_type not in ACTIVITY_EVENT_TYPES:
            continue
        activity_feed.append({
            "event_type":  event_type,
            "timestamp":   block.timestamp.isoformat() if block.timestamp else None,
            "actor":       block.actor or "NEXORA Engine",
            "audit_id":    block.audit_id,
            "description": _describe_event(event_type, payload),
            "block_index": block.block_index,
        })
        if len(activity_feed) >= 12:
            break

    # â”€â”€ Return complete posture payload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return {
        # KPIs
        "global_risk_index":      global_risk_index,
        "overall_compliance_pct": overall_compliance_pct,
        "total_open_findings":    total_open,
        "unresolved_count":       unresolved_count,
        "critical_count":         critical_count,
        "high_count":             high_count,
        "medium_count":           medium_count,
        "low_count":              low_count,
        "total_audits_analyzed":  len(audits),

        # Detail panels
        "control_health":    control_health,
        "vendor_posture":    vendor_summary,
        "framework_coverage": framework_coverage,
        "exposure_matrix":   exposure_matrix,
        "audit_trend":       audit_trend,
        "top_contributors":  top_contributors,
        "posture_activity":  activity_feed,
    }

