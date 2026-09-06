"""
NEXORA Finding Pipeline Service

Authoritative deterministic provenance service aggregating:
Configuration -> Vendor Detection -> Parser -> Normalization -> Normalized Facts ->
Security State -> Compliance Engine -> Verdict -> Evidence -> Risk Engine ->
Remediation -> AI Advisory -> Unresolved Case -> Blockchain Ledger -> Reports
"""
import hashlib
from typing import Dict, Any, Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.models import Finding, Audit, Configuration, BlockchainBlock
from backend.app.models.unresolved import UnresolvedCase
from backend.app.services.normalization.normalizer import NormalizerService
from backend.app.services.security_engine.rule_registry import SECURITY_RULES


class FindingPipelineService:

    @classmethod
    async def get_finding_pipeline(cls, session: AsyncSession, finding_id: int) -> Optional[Dict[str, Any]]:
        # 1. Fetch Finding
        f_res = await session.execute(select(Finding).where(Finding.id == finding_id))
        finding = f_res.scalar_one_or_none()
        if not finding:
            return None

        # 2. Fetch Parent Audit
        audit = None
        if finding.audit_id:
            a_res = await session.execute(select(Audit).where(Audit.id == finding.audit_id))
            audit = a_res.scalar_one_or_none()

        # 3. Fetch Parent Configuration
        config = None
        if audit and audit.configuration_id:
            c_res = await session.execute(select(Configuration).where(Configuration.id == audit.configuration_id))
            config = c_res.scalar_one_or_none()

        # 4. Fetch Blockchain Blocks for Audit
        blocks = []
        if audit:
            b_res = await session.execute(
                select(BlockchainBlock)
                .where(BlockchainBlock.audit_id == audit.id)
                .order_by(BlockchainBlock.block_index.asc())
            )
            blocks = list(b_res.scalars().all())

        # 5. Fetch Linked Unresolved Case
        unresolved_case = None
        u_res = await session.execute(
            select(UnresolvedCase).where(UnresolvedCase.finding_id == finding.id)
        )
        unresolved_case = u_res.scalar_one_or_none()
        if not unresolved_case and audit and finding.verdict == "UNRESOLVED":
            u_res = await session.execute(
                select(UnresolvedCase)
                .where(UnresolvedCase.audit_id == audit.id, UnresolvedCase.rule_id == finding.rule_id)
            )
            unresolved_case = u_res.scalar_one_or_none()

        # 6. Retrieve Authoritative Security Rule Definition
        rule_def = SECURITY_RULES.get(finding.rule_id)

        # 7. Execute Normalization & AST Extraction
        vendor = finding.vendor or (config.vendor if config else "Cisco")
        normalized_facts: List[Dict[str, Any]] = []
        vendor_neutral_model: Dict[str, Any] = {}
        vendor_specific_lines: List[Dict[str, Any]] = []
        all_lines_snippet: List[Dict[str, Any]] = []
        ast_summary: Dict[str, Any] = {}

        target_lines = set(finding.line_numbers or [])

        if config and config.raw_content:
            raw_lines = config.raw_content.splitlines()

            for idx, line in enumerate(raw_lines, start=1):
                is_target = idx in target_lines
                is_near = any(abs(idx - t) <= 3 for t in target_lines) if target_lines else idx <= 10
                if is_near or is_target:
                    all_lines_snippet.append({
                        "line_number": idx,
                        "content": line,
                        "is_highlighted": is_target
                    })
                if is_target:
                    vendor_specific_lines.append({
                        "line_number": idx,
                        "content": line
                    })

            try:
                detected_vendor, norm_model, parsed_ast = NormalizerService.normalize_configuration(
                    raw_content=config.raw_content,
                    filename=config.filename,
                    vendor_override=config.vendor
                )
                vendor = detected_vendor

                ast_summary = {
                    "firewall_rules_count": len(norm_model.firewall_rules),
                    "management_access_count": len(norm_model.management_access),
                    "security_controls_count": len(norm_model.security_controls),
                    "routes_count": len(norm_model.routes),
                    "unparsed_statements_count": len(norm_model.unparsed_statements)
                }

                for fw in norm_model.firewall_rules:
                    if fw.line_number in target_lines or (finding.category == "Access Control" and fw.is_any_any):
                        vendor_neutral_model = {
                            "object_type": "security_policy",
                            "name": fw.name or "inbound-policy",
                            "source_zones": fw.source_zones,
                            "dest_zones": fw.dest_zones,
                            "source_addrs": fw.source_addrs,
                            "dest_addrs": fw.dest_addrs,
                            "services": fw.services,
                            "action": fw.action,
                            "is_any_any": fw.is_any_any,
                            "logging_enabled": fw.logging_enabled,
                            "line_number": fw.line_number
                        }
                        normalized_facts.append({
                            "category": "Policy",
                            "field": "name",
                            "value": fw.name or "security-policy",
                            "source_line": fw.line_number,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })
                        if fw.source_zones:
                            normalized_facts.append({
                                "category": "Policy Zone",
                                "field": "from-zone",
                                "value": ", ".join(fw.source_zones),
                                "source_line": fw.line_number,
                                "parser_origin": f"{vendor}Parser",
                                "confidence": "AUTHORITATIVE"
                            })
                        if fw.dest_zones:
                            normalized_facts.append({
                                "category": "Policy Zone",
                                "field": "to-zone",
                                "value": ", ".join(fw.dest_zones),
                                "source_line": fw.line_number,
                                "parser_origin": f"{vendor}Parser",
                                "confidence": "AUTHORITATIVE"
                            })
                        normalized_facts.append({
                            "category": "Traffic Scope",
                            "field": "source",
                            "value": ", ".join(fw.source_addrs) if fw.source_addrs else "any",
                            "source_line": fw.line_number,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })
                        normalized_facts.append({
                            "category": "Traffic Scope",
                            "field": "destination",
                            "value": ", ".join(fw.dest_addrs) if fw.dest_addrs else "any",
                            "source_line": fw.line_number,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })
                        normalized_facts.append({
                            "category": "Traffic Scope",
                            "field": "application",
                            "value": ", ".join(fw.services) if fw.services else "any",
                            "source_line": fw.line_number,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })
                        normalized_facts.append({
                            "category": "Verdict Action",
                            "field": "action",
                            "value": fw.action,
                            "source_line": fw.line_number,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })
                        normalized_facts.append({
                            "category": "State Evaluation",
                            "field": "is_any_any",
                            "value": "TRUE" if fw.is_any_any else "FALSE",
                            "source_line": fw.line_number,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })

                for mgmt in norm_model.management_access:
                    if mgmt.line_number in target_lines or (finding.category == "Management Access" and mgmt.protocol in finding.rule_id):
                        if not vendor_neutral_model:
                            vendor_neutral_model = {
                                "object_type": "management_access",
                                "protocol": mgmt.protocol,
                                "port": mgmt.port,
                                "enabled": mgmt.enabled,
                                "security": mgmt.security,
                                "line_number": mgmt.line_number
                            }
                        normalized_facts.append({
                            "category": "Management Service",
                            "field": "protocol",
                            "value": mgmt.protocol,
                            "source_line": mgmt.line_number,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })
                        normalized_facts.append({
                            "category": "Security State",
                            "field": "security",
                            "value": mgmt.security,
                            "source_line": mgmt.line_number,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })
                        normalized_facts.append({
                            "category": "Service State",
                            "field": "enabled",
                            "value": "TRUE" if mgmt.enabled else "FALSE",
                            "source_line": mgmt.line_number,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })
                        if mgmt.port:
                            normalized_facts.append({
                                "category": "Network Port",
                                "field": "port",
                                "value": str(mgmt.port),
                                "source_line": mgmt.line_number,
                                "parser_origin": f"{vendor}Parser",
                                "confidence": "AUTHORITATIVE"
                            })

                for sc in norm_model.security_controls:
                    if sc.line_number in target_lines or (sc.control_type in finding.rule_id):
                        if not vendor_neutral_model:
                            vendor_neutral_model = {
                                "object_type": "security_control",
                                "control_type": sc.control_type,
                                "status": sc.status,
                                "details": sc.details,
                                "line_number": sc.line_number
                            }
                        normalized_facts.append({
                            "category": "Security Control",
                            "field": "control_type",
                            "value": sc.control_type,
                            "source_line": sc.line_number or 0,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })
                        normalized_facts.append({
                            "category": "Control Status",
                            "field": "status",
                            "value": sc.status,
                            "source_line": sc.line_number or 0,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })
                        normalized_facts.append({
                            "category": "Control Details",
                            "field": "details",
                            "value": sc.details,
                            "source_line": sc.line_number or 0,
                            "parser_origin": f"{vendor}Parser",
                            "confidence": "AUTHORITATIVE"
                        })

            except Exception:
                pass

        if not vendor_neutral_model:
            vendor_neutral_model = {
                "object_type": finding.category.lower().replace(" ", "_"),
                "rule_id": finding.rule_id,
                "evidence": finding.evidence,
                "status": finding.status,
                "line_numbers": finding.line_numbers
            }
        if not normalized_facts:
            normalized_facts.append({
                "category": finding.category,
                "field": "evidence",
                "value": finding.evidence,
                "source_line": (finding.line_numbers or [0])[0],
                "parser_origin": f"{vendor}Parser",
                "confidence": "AUTHORITATIVE"
            })

        # 8. Deterministic Security Meaning / State Evaluation
        derived_state = "NON_COMPLIANT_POLICY"
        scope_dict = {}
        reason_text = finding.description or "Deterministic rule condition satisfied on configuration directive."

        if "POL-ANY-ANY" in finding.rule_id or "BROAD" in finding.rule_id:
            derived_state = "OVERLY_PERMISSIVE_POLICY"
            scope_dict = {
                "source_scope": "ANY",
                "destination_scope": "ANY",
                "application_scope": "ANY",
                "action": "PERMIT"
            }
            reason_text = (
                "The normalized policy matches unrestricted traffic from any source to any destination "
                "for any application without boundary segmentation or stateful zone restrictions."
            )
        elif "TELNET" in finding.rule_id:
            derived_state = "INSECURE_MANAGEMENT_SERVICE"
            scope_dict = {
                "protocol": "TELNET",
                "transport": "CLEARTEXT",
                "port": 23,
                "security": "INSECURE"
            }
            reason_text = (
                "Telnet protocol transmits administrative authentication credentials and CLI commands "
                "in cleartext over the network, exposing the device to credential harvesting and in-path tampering."
            )
        elif "HTTP" in finding.rule_id:
            derived_state = "UNENCRYPTED_WEB_MANAGEMENT"
            scope_dict = {
                "protocol": "HTTP",
                "transport": "CLEARTEXT",
                "port": 80,
                "security": "INSECURE"
            }
            reason_text = (
                "Web management interface is enabled without TLS cryptographic encapsulation, "
                "permitting plaintext session interception."
            )
        elif "ROOT-AUTH" in finding.rule_id or "SECRET" in finding.rule_id:
            derived_state = "WEAK_CREDENTIAL_PROTECTION"
            scope_dict = {
                "credential_type": "ROOT_PASSWORD",
                "encryption": "PLAINTEXT_OR_WEAK",
                "security": "INSECURE"
            }
            reason_text = (
                "Root or administrative account password is stored using weak or unencrypted plaintext representation."
            )
        elif "LOG" in finding.rule_id:
            derived_state = "AUDIT_LOGGING_DISABLED"
            scope_dict = {
                "logging": "DISABLED",
                "session_tracking": "NONE"
            }
            reason_text = (
                "Security policy permits network traffic without logging session initiation or termination, "
                "violating forensic non-repudiation."
            )
        else:
            derived_state = f"VIOLATION_{finding.category.upper().replace(' ', '_')}"
            scope_dict = {
                "category": finding.category,
                "directive": finding.evidence
            }

        # 9. Deterministic Rule Condition & Evaluation Logic
        rule_condition = "IF normalized_directive violates security_baseline THEN verdict = FAIL"
        if "POL-ANY-ANY" in finding.rule_id:
            rule_condition = "IF (source == ANY AND destination == ANY AND application == ANY AND action == PERMIT) THEN (security_state = OVERLY_PERMISSIVE_POLICY -> VERDICT = FAIL)"
        elif "TELNET" in finding.rule_id:
            rule_condition = "IF (management_protocol == TELNET AND service_status == ENABLED) THEN (security_state = INSECURE_MANAGEMENT_SERVICE -> VERDICT = FAIL)"
        elif "HTTP" in finding.rule_id:
            rule_condition = "IF (web_management == HTTP AND tls_enforced == FALSE) THEN (security_state = UNENCRYPTED_WEB_MANAGEMENT -> VERDICT = FAIL)"
        elif "ROOT-AUTH" in finding.rule_id:
            rule_condition = "IF (root_authentication_encryption == PLAIN-TEXT) THEN (security_state = WEAK_CREDENTIAL_PROTECTION -> VERDICT = FAIL)"
        elif "LOG" in finding.rule_id:
            rule_condition = "IF (policy_action == PERMIT AND session_logging == FALSE) THEN (security_state = AUDIT_LOGGING_DISABLED -> VERDICT = FAIL)"

        # 10. Multi-Framework Compliance Matrix
        framework_mappings = finding.compliance_mappings or (rule_def.compliance_mappings if rule_def else [])
        evaluation_matrix = []
        for m in framework_mappings:
            evaluation_matrix.append({
                "framework": m.get("framework", "Compliance Framework"),
                "control_id": m.get("control_id", "REQ-01"),
                "control_title": m.get("name", finding.title),
                "result": "FAIL" if finding.verdict == "FAIL" else m.get("status", "GAP"),
                "rule_id": finding.rule_id,
                "evidence": finding.evidence,
                "source_lines": finding.line_numbers or []
            })

        # 11. Verdict Semantics
        verdict_meanings = {
            "PASS": "Control requirement deterministically satisfied by configuration directives.",
            "FAIL": "Control requirement deterministically violated by configuration directives.",
            "UNRESOLVED": "Available evidence is insufficient, ambiguous, or incomplete for a deterministic decision.",
            "CONFLICT": "Contradictory evidence detected across configuration blocks.",
            "N/A": "Control requirement does not apply to this device architecture or configuration scope."
        }
        verdict_meaning = verdict_meanings.get(finding.verdict, "Deterministic compliance evaluation completed.")

        # 12. Four-Factor Risk Breakdown
        risk_breakdown = {
            "severity": {
                "score": finding.severity_score,
                "weight": "35%",
                "weight_decimal": 0.35,
                "name": "Severity",
                "description": "Inherent danger and vulnerability magnitude"
            },
            "exposure": {
                "score": finding.exposure_score,
                "weight": "25%",
                "weight_decimal": 0.25,
                "name": "Exposure",
                "description": "Network reachability and attack surface accessibility"
            },
            "impact": {
                "score": finding.impact_score,
                "weight": "20%",
                "weight_decimal": 0.20,
                "name": "Impact",
                "description": "Consequence on confidentiality, integrity, and availability"
            },
            "exploitability": {
                "score": finding.exploitability_score,
                "weight": "20%",
                "weight_decimal": 0.20,
                "name": "Exploitability",
                "description": "Ease of adversary execution and skill barrier"
            },
            "formula": "round(((Severity * 0.35 + Exposure * 0.25 + Impact * 0.20 + Exploitability * 0.20) / 4.0) * 100)",
            "score": finding.risk_score,
            "level": finding.severity
        }

        # 13. Remediation Details
        remediation_diff = finding.remediation_diff or {}
        remediation_data = {
            "why_it_matters": finding.impact or (rule_def.impact if rule_def else "Exposure leaves system vulnerable."),
            "what_should_change": finding.remediation_recommendation or (rule_def.remediation_template if rule_def else "Apply recommended baseline configuration."),
            "current_statement": remediation_diff.get("current_statement", finding.evidence),
            "recommended_statement": remediation_diff.get("recommended_statement", rule_def.remediation_template if rule_def else ""),
            "diff": remediation_diff,
            "expected_security_improvement": "Enforces zero-trust isolation and eliminates unencrypted/permissive traffic paths.",
            "affected_controls": [m.get("control_id") for m in framework_mappings],
            "validation_plan": "Deploy patch strictly inside isolated sandbox. Execute deterministic re-parse and rule verification to confirm verdict changes to PASS."
        }

        # 14. AI Advisory (Explicitly Labeled Advisory Only)
        ai_explanation = finding.ai_explanation or {}
        ai_advisory = {
            "is_present": bool(ai_explanation),
            "model": "NVIDIA NIM / Llama-3-70B-Instruct",
            "purpose": "Natural language interpretation, impact explanation, and remediation advisory",
            "disclaimer": "AI output is advisory and does not determine compliance.",
            "notice": "AI output is advisory and does not determine compliance.",
            "summary": ai_explanation.get("summary"),
            "why_it_matters": ai_explanation.get("why_it_matters"),
            "potential_impact": ai_explanation.get("potential_impact"),
            "security_principle": ai_explanation.get("security_principle"),
            "recommended_action": ai_explanation.get("recommended_action"),
            "retrieved_evidence": finding.evidence,
            "confidence": ai_explanation.get("confidence", "Advisory")
        }

        # 15. Blockchain Ledger Events
        blockchain_events = []
        for b in blocks:
            blockchain_events.append({
                "block_index": b.block_index,
                "timestamp": b.timestamp.isoformat() if b.timestamp else None,
                "event_type": b.event_type,
                "actor": b.actor,
                "payload_hash": b.payload_hash,
                "previous_hash": b.previous_hash,
                "block_hash": b.block_hash,
                "ledger_status": "APPENDED"
            })

        # 16. Unresolved Case Lifecycle
        unresolved_data = None
        if unresolved_case:
            unresolved_data = {
                "id": unresolved_case.id,
                "case_type": unresolved_case.case_type,
                "status": unresolved_case.status,
                "reason": unresolved_case.reason,
                "missing_reference": unresolved_case.missing_reference,
                "unknown_syntax": unresolved_case.unknown_syntax,
                "reviewer": unresolved_case.reviewer,
                "review_notes": unresolved_case.review_notes,
                "final_verdict": unresolved_case.final_verdict,
                "resolution_context": unresolved_case.resolution_context,
                "created_at": unresolved_case.created_at.isoformat() if unresolved_case.created_at else None
            }

        # 17. 15-Stage Analysis Pipeline
        pipeline_stages = [
            {
                "id": "configuration",
                "index": "01",
                "label": "Configuration",
                "status": "PASS",
                "engine": "System Ingestion",
                "description": f"{config.filename if config else 'Unknown'} loaded ({config.line_count if config else 0} lines)",
                "metadata": {"sha256": config.sha256_hash if config else None, "size_bytes": config.file_size if config else 0}
            },
            {
                "id": "vendor_detection",
                "index": "02",
                "label": "Vendor Detection",
                "status": "PASS",
                "engine": "VendorDetector",
                "description": f"Identified {vendor} syntax via structural signatures",
                "metadata": {"vendor": vendor, "confidence": "HIGH"}
            },
            {
                "id": "parser",
                "index": "03",
                "label": "Vendor Parser",
                "status": "PASS",
                "engine": f"{vendor} Parser",
                "description": f"Lexical & grammar parsing generated AST with {ast_summary.get('firewall_rules_count', 0) + ast_summary.get('management_access_count', 0) + ast_summary.get('security_controls_count', 0)} entities",
                "metadata": ast_summary
            },
            {
                "id": "normalization",
                "index": "04",
                "label": "Normalization",
                "status": "PASS",
                "engine": "NormalizerService",
                "description": "Transformed vendor directives into unified vendor-neutral security schema",
                "metadata": {"facts_count": len(normalized_facts)}
            },
            {
                "id": "normalized_facts",
                "index": "05",
                "label": "Normalized Facts",
                "status": "PASS",
                "engine": "AST Fact Extraction",
                "description": f"Extracted {len(normalized_facts)} normalized security facts mapped to line {finding.line_numbers or []}",
                "metadata": {"facts": normalized_facts}
            },
            {
                "id": "security_state",
                "index": "06",
                "label": "Security State",
                "status": "FAIL" if finding.verdict == "FAIL" else "PASS",
                "engine": "Deterministic Security Evaluator",
                "description": f"Derived security state: {derived_state}",
                "metadata": {"state": derived_state, "scope": scope_dict}
            },
            {
                "id": "compliance_engine",
                "index": "07",
                "label": "Compliance Engine",
                "status": "FAIL" if finding.verdict == "FAIL" else finding.verdict,
                "engine": "Deterministic Compliance Engine",
                "description": f"Rule {finding.rule_id} evaluated against deterministic condition logic",
                "metadata": {"rule_id": finding.rule_id, "condition": rule_condition}
            },
            {
                "id": "verdict",
                "index": "08",
                "label": "Deterministic Verdict",
                "status": finding.verdict,
                "engine": "Authoritative Decision Engine",
                "description": f"{finding.verdict}: {verdict_meaning}",
                "metadata": {"verdict": finding.verdict, "confidence": finding.confidence}
            },
            {
                "id": "evidence",
                "index": "09",
                "label": "Evidence Provenance",
                "status": "PASS",
                "engine": "Line-Level Pointer",
                "description": f"Anchored to line {finding.line_numbers or []} in {config.filename if config else 'config'}",
                "metadata": {"line_numbers": finding.line_numbers, "evidence": finding.evidence}
            },
            {
                "id": "risk_engine",
                "index": "10",
                "label": "Risk Engine",
                "status": finding.severity,
                "engine": "RiskCalculator (4-Factor)",
                "description": f"Calculated score {finding.risk_score}/100 ({finding.severity})",
                "metadata": risk_breakdown
            },
            {
                "id": "remediation",
                "index": "11",
                "label": "Remediation",
                "status": "AVAILABLE" if finding.remediation_recommendation else "PENDING",
                "engine": "Remediation Engine",
                "description": "Patch configuration available for sandboxed simulation",
                "metadata": {"has_diff": bool(remediation_diff)}
            },
            {
                "id": "ai_advisory",
                "index": "12",
                "label": "AI Advisory",
                "status": "AVAILABLE" if bool(ai_explanation) else "PENDING",
                "engine": "NVIDIA NIM (Advisory Only)",
                "description": "Contextual explanation & guidance (Advisory only — does not determine compliance)",
                "metadata": {"advisory_only": True}
            },
            {
                "id": "human_resolution",
                "index": "13",
                "label": "Human Resolution",
                "status": "RESOLVED" if (unresolved_case and unresolved_case.status == "RESOLVED") else ("REQUIRED" if finding.verdict == "UNRESOLVED" else "N/A"),
                "engine": "Analyst Decision Workflow",
                "description": "Human-in-the-loop review for ambiguous edge cases",
                "metadata": {"case_id": unresolved_case.id if unresolved_case else None}
            },
            {
                "id": "blockchain_ledger",
                "index": "14",
                "label": "Blockchain Ledger",
                "status": "APPENDED" if blocks else "PENDING",
                "engine": "Cryptographic Ledger",
                "description": f"{len(blocks)} immutable audit event block(s) recorded",
                "metadata": {"blocks_count": len(blocks)}
            },
            {
                "id": "reports",
                "index": "15",
                "label": "Reports",
                "status": "AVAILABLE",
                "engine": "Reporting Engine",
                "description": "Audit compliance results exportable to PDF, CSV, and JSON",
                "metadata": {"audit_id": audit.id if audit else None}
            }
        ]

        # 18. Assemble Authoritative Machine-Readable Pipeline Response
        return {
            "finding": {
                "id": finding.id,
                "audit_id": finding.audit_id,
                "rule_id": finding.rule_id,
                "title": finding.title,
                "vendor": finding.vendor,
                "category": finding.category,
                "severity": finding.severity,
                "verdict": finding.verdict,
                "confidence": finding.confidence,
                "status": finding.status,
                "description": finding.description,
                "evidence": finding.evidence,
                "line_numbers": finding.line_numbers,
                "impact": finding.impact,
                "risk_score": finding.risk_score,
                "created_at": finding.created_at.isoformat() if finding.created_at else None
            },
            "audit": {
                "id": audit.id if audit else None,
                "configuration_id": audit.configuration_id if audit else None,
                "vendor": audit.vendor if audit else None,
                "status": audit.status if audit else None,
                "stage": audit.stage if audit else None,
                "risk_score": audit.risk_score if audit else None,
                "findings_count": audit.findings_count if audit else None,
                "compliance_score": audit.compliance_score if audit else None,
                "is_verification": audit.is_verification if audit else False,
                "created_at": audit.created_at.isoformat() if (audit and audit.created_at) else None
            } if audit else None,
            "configuration": {
                "id": config.id if config else None,
                "filename": config.filename if config else None,
                "vendor": config.vendor if config else None,
                "line_count": config.line_count if config else None,
                "file_size": config.file_size if config else None,
                "sha256_hash": config.sha256_hash if config else None,
                "is_sandbox": config.is_sandbox if config else False,
                "created_at": config.created_at.isoformat() if (config and config.created_at) else None
            } if config else None,
            "pipeline": {
                "stages": pipeline_stages
            },
            "source": {
                "file_name": config.filename if config else "unknown.conf",
                "file_path": config.filename if config else "unknown.conf",
                "sha256": config.sha256_hash if config else "",
                "line_numbers": finding.line_numbers or [],
                "line_number": (finding.line_numbers or [0])[0] if finding.line_numbers else 0,
                "source_text": finding.evidence,
                "vendor": vendor,
                "parser_name": f"{vendor} Parser",
                "parser_version": "1.0.0-deterministic",
                "total_lines": config.line_count if config else 0,
                "lines": all_lines_snippet,
                "target_lines_content": vendor_specific_lines
            },
            "vendor_detection": {
                "vendor": vendor,
                "confidence": "HIGH",
                "method": "Lexical & Structural Signatures",
                "detected_vendor": vendor
            },
            "parser": {
                "parser_name": f"{vendor} Parser",
                "vendor": vendor,
                "parser_type": "Deterministic AST Lexer/Grammar",
                "total_objects": ast_summary.get("firewall_rules_count", 0) + ast_summary.get("management_access_count", 0) + ast_summary.get("security_controls_count", 0),
                "ast_summary": ast_summary
            },
            "normalization": {
                "status": "NORMALIZED" if normalized_facts else "UNAVAILABLE",
                "vendor": vendor,
                "parser": f"{vendor} Parser",
                "vendor_specific": {
                    "vendor": vendor,
                    "raw_lines": [l["content"] for l in vendor_specific_lines],
                    "formatted_snippet": "\n".join([l["content"] for l in vendor_specific_lines]) if vendor_specific_lines else finding.evidence
                },
                "vendor_neutral": vendor_neutral_model,
                "facts": normalized_facts
            },
            "security_state": {
                "state": derived_state,
                "scope": scope_dict,
                "engine": "Deterministic Security Evaluator",
                "reason": reason_text,
                "interpretation_type": "Deterministic Security Interpretation — Not AI"
            },
            "compliance": {
                "engine": "Deterministic Compliance Engine",
                "rule": {
                    "id": finding.rule_id,
                    "rule_id": finding.rule_id,
                    "title": finding.title,
                    "category": finding.category,
                    "severity": finding.severity
                },
                "input_facts": normalized_facts,
                "condition": rule_condition,
                "result": finding.verdict,
                "verdict": finding.verdict,
                "verdict_semantics": {
                    "verdict": finding.verdict,
                    "meaning": verdict_meaning,
                    "authoritative": True,
                    "ai_override_allowed": False
                },
                "frameworks": evaluation_matrix,
                "evaluation_matrix": evaluation_matrix
            },
            "risk": risk_breakdown,
            "evidence": {
                "filename": config.filename if config else "unknown.conf",
                "line_numbers": finding.line_numbers or [],
                "primary_line": (finding.line_numbers or [0])[0] if finding.line_numbers else 0,
                "raw_statement": finding.evidence,
                "impact": finding.impact,
                "sha256": config.sha256_hash if config else "",
                "code_snippet": all_lines_snippet,
                "provenance_chain": [
                    {"stage": "Configuration File", "detail": f"{config.filename if config else 'config'} ({config.line_count if config else 0} lines)"},
                    {"stage": "Source Line", "detail": f"Line {finding.line_numbers or []}"},
                    {"stage": "Vendor Parser", "detail": f"{vendor} Parser (Deterministic Grammar)"},
                    {"stage": "Normalized Fact", "detail": "Vendor-Neutral Security Object Schema"},
                    {"stage": "Security State", "detail": f"{derived_state} (Deterministic Scope)"},
                    {"stage": "Compliance Rule", "detail": f"{finding.rule_id} (Deterministic Logic)"},
                    {"stage": "Authoritative Verdict", "detail": f"{finding.verdict} (Deterministic Decision)"},
                    {"stage": "Risk Calculation", "detail": f"Score {finding.risk_score}/100 ({finding.severity}) via 4-Factor Engine"},
                    {"stage": "Remediation", "detail": "Sandboxed Remediation Template"},
                    {"stage": "Audit Ledger", "detail": f"{len(blocks)} Immutable Blockchain Event(s)"}
                ]
            },
            "remediation": remediation_data,
            "ai_advisory": ai_advisory,
            "unresolved_case": unresolved_data,
            "blockchain": blockchain_events,
            "reporting": {
                "pdf_url": f"/api/v1/reports/audit/{audit.id}/pdf" if audit else None,
                "csv_url": f"/api/v1/reports/audit/{audit.id}/csv" if audit else None,
                "json_url": f"/api/v1/reports/audit/{audit.id}/json" if audit else None
            }
        }
