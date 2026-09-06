import hashlib
from typing import Dict, Any, List
from sqlalchemy import select
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.models import Audit, Finding, Configuration
from backend.app.services.normalization.normalizer import NormalizerService
from backend.app.services.security_engine.evaluator import SecurityEvaluator
from backend.app.services.compliance.mapping_engine import ComplianceEngine
from backend.app.services.blockchain.chain import BlockchainLedger
from backend.app.models.unresolved import UnresolvedCase
from backend.app.services.unresolved.classifier import UnresolvedClassifier
from backend.app.services.unresolved.lifecycle import UnresolvedLifecycle

class AuditPipelineService:
    """
    Orchestrates the 10-Stage SIH PPT Audit Workflow:
    1. Issue Identified
    2. Impact Evaluated
    3. Risk Prioritized
    4. Compliance Mapped
    5. Explanation Provided
    6. Remediation Recommended
    7. Approval Required
    8. Remediation Implemented
    9. Verification Performed
    10. Compliance Achieved
    """

    STAGES = [
        "Issue Identified",
        "Impact Evaluated",
        "Risk Prioritized",
        "Compliance Mapped",
        "Explanation Provided",
        "Remediation Recommended",
        "Approval Required",
        "Remediation Implemented",
        "Verification Performed",
        "Compliance Achieved"
    ]

    @classmethod
    async def run_audit(cls, configuration_id: int) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            config_res = await session.execute(select(Configuration).where(Configuration.id == configuration_id))
            config = config_res.scalar_one_or_none()
            if not config:
                raise ValueError(f"Configuration ID {configuration_id} not found.")

            # Step 1: Detect & Normalize
            vendor, normalized, parsed_ast = NormalizerService.normalize_configuration(
                raw_content=config.raw_content,
                filename=config.filename,
                vendor_override=config.vendor if config.vendor != "Unknown" else None
            )

            # Compute and persist SHA-256 integrity fingerprint (P1.1)
            sha256_hash = hashlib.sha256(config.raw_content.encode("utf-8")).hexdigest()
            if config.sha256_hash != sha256_hash:
                config.sha256_hash = sha256_hash
                session.add(config)

            # Record audit started on Blockchain
            await BlockchainLedger.append_event(
                event_type="AUDIT_STARTED",
                event_data={
                    "config_id": config.id,
                    "filename": config.filename,
                    "vendor": vendor,
                    "normalized_objects_count": normalized.total_objects
                },
                actor="SYSTEM"
            )

            # Step 2: Deterministic Security Engine Evaluation
            findings_data = SecurityEvaluator.evaluate(
                raw_content=config.raw_content,
                vendor=vendor,
                normalized=normalized
            )

            # Calculate aggregated risk & compliance
            avg_risk = round(sum(f["risk_score"] for f in findings_data) / len(findings_data)) if findings_data else 0
            posture = ComplianceEngine.evaluate_posture(findings_data)
            compliance_score = posture["overall_compliance_pct"]

            # Create Audit Record
            audit = Audit(
                configuration_id=config.id,
                vendor=vendor,
                status="COMPLETED",
                stage="Remediation Recommended" if findings_data else "Compliance Achieved",
                risk_score=avg_risk,
                findings_count=len(findings_data),
                compliance_score=compliance_score,
                is_verification=False
            )
            session.add(audit)
            await session.flush()

            # Create Finding Records
            created_findings = []
            for f in findings_data:
                finding = Finding(
                    audit_id=audit.id,
                    rule_id=f["rule_id"],
                    title=f["title"],
                    vendor=f["vendor"],
                    category=f["category"],
                    severity=f["severity"],
                    verdict=f.get("verdict", "FAIL"),
                    confidence=f.get("confidence", "HIGH"),
                    status="OPEN",
                    risk_score=f["risk_score"],
                    severity_score=f["severity_score"],
                    exposure_score=f["exposure_score"],
                    impact_score=f["impact_score"],
                    exploitability_score=f["exploitability_score"],
                    description=f["description"],
                    evidence=f["evidence"],
                    line_numbers=f["line_numbers"],
                    impact=f["impact"],
                    remediation_recommendation=f["remediation_recommendation"],
                    remediation_diff=f["remediation_diff"],
                    compliance_mappings=f["compliance_mappings"],
                    ai_explanation=f["ai_explanation"]
                )
                session.add(finding)
                created_findings.append(finding)

            await session.flush()

            # Promote UNRESOLVED findings to UnresolvedCases
            for finding, f_data in zip(created_findings, findings_data):
                if finding.verdict == "UNRESOLVED":
                    case_type, detail = UnresolvedClassifier.classify(f_data)
                    
                    case = UnresolvedCase(
                        audit_id=audit.id,
                        configuration_id=config.id,
                        finding_id=finding.id,
                        case_type=case_type,
                        reason=f_data.get("description", "Unknown reason")[:500],
                        vendor=vendor,
                        feature=f_data.get("category"),
                        rule_id=f_data.get("rule_id"),
                        source_lines=f_data.get("line_numbers", []),
                        source_text=f_data.get("evidence"),
                    )
                    
                    if case_type == "MISSING_REFERENCE":
                        case.missing_reference = detail
                    else:
                        case.unknown_syntax = detail
                        
                    session.add(case)
                    await session.flush()
                    await UnresolvedLifecycle.record_creation(session, case)

            await session.commit()
            await session.refresh(audit)

            # Record audit completion and findings on Blockchain
            await BlockchainLedger.append_event(
                event_type="AUDIT_COMPLETED",
                event_data={
                    "audit_id": audit.id,
                    "findings_count": len(findings_data),
                    "risk_score": avg_risk,
                    "compliance_score": compliance_score,
                    "rules_triggered": [f["rule_id"] for f in findings_data]
                },
                actor="SECURITY_ENGINE",
                audit_id=audit.id
            )

            return {
                "audit": audit,
                "findings": created_findings,
                "normalized": normalized,
                "compliance_posture": posture
            }

