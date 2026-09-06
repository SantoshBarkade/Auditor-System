import re
from typing import Dict, Any, Tuple
from sqlalchemy import select
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.models import Configuration, Finding, Remediation, Approval, Audit
from backend.app.services.blockchain.chain import BlockchainLedger

class RemediationSimulator:
    """
    Sandboxed Configuration Remediation Simulator.
    Strict Invariant: Never modifies original configuration.
    Clones configuration into an in-memory / database sandbox copy and applies approved patch.
    """

    @classmethod
    async def apply_sandboxed_remediation(cls, finding_id: int, reviewer: str = "Security Administrator", note: str = "") -> Tuple[Configuration, Finding, Remediation]:
        async with AsyncSessionLocal() as session:
            # Fetch finding with audit and configuration
            finding_res = await session.execute(select(Finding).where(Finding.id == finding_id))
            finding = finding_res.scalar_one_or_none()
            if not finding:
                raise ValueError(f"Finding ID {finding_id} not found.")

            audit_res = await session.execute(select(Audit).where(Audit.id == finding.audit_id))
            audit = audit_res.scalar_one()

            config_res = await session.execute(select(Configuration).where(Configuration.id == audit.configuration_id))
            original_config = config_res.scalar_one()

            # Record or fetch remediation
            rem_res = await session.execute(select(Remediation).where(Remediation.finding_id == finding_id))
            remediation = rem_res.scalar_one_or_none()

            patch_diff = finding.remediation_diff or {}
            recommended = patch_diff.get("recommended_statement", finding.remediation_recommendation)
            current_stmt = patch_diff.get("current_statement", finding.evidence)

            if not remediation:
                remediation = Remediation(
                    finding_id=finding_id,
                    vendor=finding.vendor,
                    current_config=current_stmt,
                    recommended_config=recommended,
                    explanation=patch_diff.get("explanation", "Approved security patch"),
                    status="APPROVED"
                )
                session.add(remediation)
                await session.flush()
            else:
                remediation.status = "APPROVED"

            # Guard: only create Approval if none already exists for this remediation.
            # Prevents duplicate Approval rows on re-simulation of already-approved findings.
            existing_approval_res = await session.execute(
                select(Approval).where(
                    Approval.remediation_id == remediation.id,
                    Approval.decision == "APPROVED"
                )
            )
            if not existing_approval_res.scalar_one_or_none():
                approval = Approval(
                    remediation_id=remediation.id,
                    reviewer=reviewer,
                    decision="APPROVED",
                    note=note or "Approved for sandboxed simulation"
                )
                session.add(approval)

            finding.status = "APPROVED"

            # Create Sandboxed Configuration copy
            raw_lines = original_config.raw_content.splitlines()
            patched_content = cls._patch_content(
                raw_lines=raw_lines,
                vendor=finding.vendor,
                rule_id=finding.rule_id,
                evidence=finding.evidence,
                recommended=recommended
            )

            sandboxed_config = Configuration(
                device_id=original_config.device_id,
                filename=f"SANDBOX_{original_config.filename}",
                vendor=original_config.vendor,
                raw_content=patched_content,
                line_count=len(patched_content.splitlines()),
                file_size=len(patched_content.encode("utf-8")),
                is_sandbox=True,
                parent_config_id=original_config.id
            )
            session.add(sandboxed_config)
            await session.commit()
            await session.refresh(sandboxed_config)
            await session.refresh(finding)
            await session.refresh(remediation)

            # Record on Blockchain
            await BlockchainLedger.append_event(
                event_type="REMEDIATION_APPROVED_AND_SIMULATED",
                event_data={
                    "finding_id": finding.id,
                    "rule_id": finding.rule_id,
                    "reviewer": reviewer,
                    "sandboxed_config_id": sandboxed_config.id,
                    "original_config_id": original_config.id
                },
                actor=reviewer,
                audit_id=audit.id
            )

            return sandboxed_config, finding, remediation

    @classmethod
    def _patch_content(cls, raw_lines: list, vendor: str, rule_id: str, evidence: str, recommended: str) -> str:
        """Apply targeted replacement on configuration lines."""
        patched = []
        replaced = False

        for line in raw_lines:
            # Check if this line is part of evidence
            if not replaced and any(part.strip() in line for part in evidence.splitlines() if len(part.strip()) > 5):
                # Replace with recommendation
                indent = re.match(r"^(\s*)", line).group(1) if re.match(r"^(\s*)", line) else ""
                # Format recommended lines with appropriate indent
                rec_lines = [f"{indent}{r.strip()}" for r in recommended.splitlines()]
                patched.extend(rec_lines)
                replaced = True
            else:
                # Specific vendor keywords
                if "TELNET" in rule_id and "transport input" in line.lower() and ("telnet" in line.lower() or "all" in line.lower()):
                    indent = re.match(r"^(\s*)", line).group(1) if re.match(r"^(\s*)", line) else " "
                    patched.append(f"{indent}transport input ssh")
                    replaced = True
                elif "TELNET" in rule_id and "allowaccess" in line.lower() and "telnet" in line.lower():
                    new_line = re.sub(r"\btelnet\b", "ssh", line, flags=re.IGNORECASE)
                    patched.append(new_line)
                    replaced = True
                elif "HTTP" in rule_id and "allowaccess" in line.lower() and "http" in line.lower():
                    new_line = re.sub(r"\bhttp\b", "https", line, flags=re.IGNORECASE)
                    patched.append(new_line)
                    replaced = True
                elif not replaced and "TELNET" in rule_id and "services telnet" in line.lower():
                    patched.append("# telnet service removed")
                    patched.append("set system services ssh")
                    replaced = True
                else:
                    patched.append(line)

        return "\n".join(patched)
