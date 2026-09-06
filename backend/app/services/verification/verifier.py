from typing import Dict, Any, List
from sqlalchemy import select
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.models import Audit, Finding, Configuration
from backend.app.services.normalization.normalizer import NormalizerService
from backend.app.services.security_engine.evaluator import SecurityEvaluator
from backend.app.services.compliance.mapping_engine import ComplianceEngine
from backend.app.services.blockchain.chain import BlockchainLedger

class VerificationService:
    """
    Deterministic Verification Engine for NEXORA.
    Re-analyzes the sandboxed configuration after remediation patch is applied.
    Strict Invariant: AI never declares verification success.
    Success is mathematically and deterministically calculated from finding delta.
    """

    @classmethod
    async def verify_remediation(cls, original_audit_id: int, sandboxed_config_id: int, target_finding_id: int) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            # 1. Fetch original audit and target finding
            orig_audit_res = await session.execute(select(Audit).where(Audit.id == original_audit_id))
            orig_audit = orig_audit_res.scalar_one()

            orig_findings_res = await session.execute(select(Finding).where(Finding.audit_id == original_audit_id))
            orig_findings = list(orig_findings_res.scalars().all())

            target_finding_res = await session.execute(select(Finding).where(Finding.id == target_finding_id))
            target_finding = target_finding_res.scalar_one()

            # 2. Fetch sandboxed configuration
            sandbox_res = await session.execute(select(Configuration).where(Configuration.id == sandboxed_config_id))
            sandbox_config = sandbox_res.scalar_one()

            # 3. Re-run complete pipeline on sandbox configuration
            vendor, normalized, _ = NormalizerService.normalize_configuration(
                raw_content=sandbox_config.raw_content,
                filename=sandbox_config.filename,
                vendor_override=orig_audit.vendor
            )

            new_findings_raw = SecurityEvaluator.evaluate(
                raw_content=sandbox_config.raw_content,
                vendor=vendor,
                normalized=normalized
            )

            # 4. Create Verification Audit record
            new_risk = round(sum(f["risk_score"] for f in new_findings_raw) / len(new_findings_raw)) if new_findings_raw else 0
            posture = ComplianceEngine.evaluate_posture(new_findings_raw)
            new_compliance_score = posture["overall_compliance_pct"]

            verif_audit = Audit(
                configuration_id=sandbox_config.id,
                vendor=vendor,
                status="COMPLETED",
                stage="Verification Performed",
                risk_score=new_risk,
                findings_count=len(new_findings_raw),
                compliance_score=new_compliance_score,
                is_verification=True,
                parent_audit_id=orig_audit.id
            )
            session.add(verif_audit)
            await session.flush()

            # 5. Save new findings for verification audit
            for f in new_findings_raw:
                nf = Finding(
                    audit_id=verif_audit.id,
                    rule_id=f["rule_id"],
                    title=f["title"],
                    vendor=f["vendor"],
                    category=f["category"],
                    severity=f["severity"],
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
                session.add(nf)

            # 6. Compare findings before vs after
            orig_rules = {f.rule_id: f.title for f in orig_findings}
            new_rules = {f["rule_id"]: f["title"] for f in new_findings_raw}

            fixed_rules = [title for r_id, title in orig_rules.items() if r_id not in new_rules]
            remaining_rules = [title for r_id, title in new_rules.items()]

            # Check if target finding was resolved
            is_target_fixed = target_finding.rule_id not in new_rules
            if is_target_fixed:
                target_finding.status = "VERIFIED"
            else:
                target_finding.status = "OPEN"

            # Calculate risk delta
            orig_risk = orig_audit.risk_score or 1
            risk_reduction_pct = round(((orig_risk - new_risk) / orig_risk) * 100, 1) if orig_risk > 0 else 0.0
            if risk_reduction_pct < 0:
                risk_reduction_pct = 0.0

            # Update original audit stage
            orig_audit.stage = "Compliance Achieved" if is_target_fixed else "Verification Failed"

            await session.commit()

            # 7. Record Verification Event on Blockchain
            if not is_target_fixed:
                # Record failure explicitly so the audit trail is complete
                await BlockchainLedger.append_event(
                    event_type="VERIFICATION_FAILED",
                    event_data={
                        "original_audit_id": orig_audit.id,
                        "verification_audit_id": verif_audit.id,
                        "target_rule": target_finding.rule_id,
                        "reason": "Target vulnerability persists in sandboxed configuration after patch application.",
                        "risk_before": orig_risk,
                        "risk_after": new_risk,
                    },
                    actor="VERIFICATION_ENGINE",
                    audit_id=verif_audit.id
                )

            await BlockchainLedger.append_event(
                event_type="VERIFICATION_COMPLETED",
                event_data={
                    "original_audit_id": orig_audit.id,
                    "verification_audit_id": verif_audit.id,
                    "target_rule": target_finding.rule_id,
                    "verification_passed": is_target_fixed,
                    "fixed_findings_count": len(fixed_rules),
                    "remaining_findings_count": len(remaining_rules),
                    "risk_before": orig_risk,
                    "risk_after": new_risk,
                    "risk_reduction_pct": risk_reduction_pct,
                    "compliance_before": orig_audit.compliance_score,
                    "compliance_after": new_compliance_score
                },
                actor="VERIFICATION_ENGINE",
                audit_id=verif_audit.id
            )

            return {
                "original_audit_id": orig_audit.id,
                "verification_audit_id": verif_audit.id,
                "fixed_findings": fixed_rules,
                "remaining_findings": remaining_rules,
                "risk_score_before": orig_risk,
                "risk_score_after": new_risk,
                "risk_reduction_pct": risk_reduction_pct,
                "compliance_score_before": orig_audit.compliance_score,
                "compliance_score_after": new_compliance_score,
                "verification_passed": is_target_fixed,
                "simulated_config_id": sandbox_config.id
            }
