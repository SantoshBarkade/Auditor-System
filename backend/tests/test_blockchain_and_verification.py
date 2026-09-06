import pytest
from backend.app.core.database import init_db
from backend.app.services.blockchain.chain import BlockchainLedger
from backend.app.services.audit_pipeline import AuditPipelineService
from backend.app.services.remediation.simulator import RemediationSimulator
from backend.app.services.verification.verifier import VerificationService
from backend.app.models.models import Configuration
from backend.app.core.database import AsyncSessionLocal
import os
from backend.app.core.config import settings

@pytest.mark.asyncio
async def test_blockchain_lifecycle_and_tampering():
    await init_db()

    # Append test events
    b1 = await BlockchainLedger.append_event("TEST_EVENT_1", {"device": "RTR-01"})
    b2 = await BlockchainLedger.append_event("TEST_EVENT_2", {"action": "AUDIT"})

    assert b2.block_index == b1.block_index + 1
    assert b2.previous_hash == b1.block_hash

    # Validate chain
    is_valid, tampered_idx, msg = await BlockchainLedger.validate_chain()
    assert is_valid is True
    assert tampered_idx is None

    # Simulate tamper demonstration
    tamper_result = await BlockchainLedger.simulate_tamper_demonstration()
    assert tamper_result["before_status"] == "CHAIN VALID"
    assert "TAMPERING DETECTED" in tamper_result["during_status"]
    assert "CHAIN RESTORED & VALID" in tamper_result["repaired_status"]

@pytest.mark.asyncio
async def test_end_to_end_cisco_remediation_and_verification():
    await init_db()

    # 1. Ingest Cisco Insecure config
    cisco_path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "cisco_insecure.cfg")
    with open(cisco_path, "r") as f:
        raw_content = f.read()

    async with AsyncSessionLocal() as session:
        config = Configuration(
            filename="cisco_test.cfg",
            vendor="Cisco",
            raw_content=raw_content,
            line_count=len(raw_content.splitlines()),
            file_size=len(raw_content.encode("utf-8")),
            is_sandbox=False
        )
        session.add(config)
        await session.commit()
        await session.refresh(config)
        config_id = config.id

    # 2. Run Audit
    audit_res = await AuditPipelineService.run_audit(config_id)
    audit = audit_res["audit"]
    findings = audit_res["findings"]

    assert audit.findings_count > 0
    assert audit.risk_score > 50

    # Find the Telnet finding
    telnet_finding = next((f for f in findings if "TELNET" in f.rule_id), None)
    assert telnet_finding is not None
    assert telnet_finding.status == "OPEN"

    # 3. Simulate Remediation on Sandboxed copy
    sandbox_config, patched_finding, rem = await RemediationSimulator.apply_sandboxed_remediation(
        finding_id=telnet_finding.id,
        reviewer="Lead Auditor",
        note="Approved fix"
    )
    assert sandbox_config.is_sandbox is True

    # 4. Verify Remediation
    verif_res = await VerificationService.verify_remediation(
        original_audit_id=audit.id,
        sandboxed_config_id=sandbox_config.id,
        target_finding_id=telnet_finding.id
    )

    assert verif_res["verification_passed"] is True
    assert any("Telnet" in f_title for f_title in verif_res["fixed_findings"])
    assert verif_res["risk_reduction_pct"] > 0

@pytest.mark.asyncio
async def test_end_to_end_fortigate_remediation():
    await init_db()
    fgt_path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "fortigate_insecure.conf")
    with open(fgt_path, "r") as f:
        raw_content = f.read()

    async with AsyncSessionLocal() as session:
        config = Configuration(
            filename="fortigate_test.conf",
            vendor="Fortinet",
            raw_content=raw_content,
            line_count=len(raw_content.splitlines()),
            file_size=len(raw_content.encode("utf-8")),
            is_sandbox=False
        )
        session.add(config)
        await session.commit()
        await session.refresh(config)
        config_id = config.id

    audit_res = await AuditPipelineService.run_audit(config_id)
    audit = audit_res["audit"]
    findings = audit_res["findings"]

    http_finding = next((f for f in findings if "HTTP" in f.rule_id), None)
    assert http_finding is not None

    sandbox_config, _, _ = await RemediationSimulator.apply_sandboxed_remediation(
        finding_id=http_finding.id,
        reviewer="SecAdmin",
        note="Approved HTTP to HTTPS fix"
    )

    verif_res = await VerificationService.verify_remediation(
        original_audit_id=audit.id,
        sandboxed_config_id=sandbox_config.id,
        target_finding_id=http_finding.id
    )
    assert verif_res["verification_passed"] is True

@pytest.mark.asyncio
async def test_end_to_end_juniper_remediation():
    await init_db()
    junos_path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "juniper_insecure.conf")
    with open(junos_path, "r") as f:
        raw_content = f.read()

    async with AsyncSessionLocal() as session:
        config = Configuration(
            filename="juniper_test.conf",
            vendor="Juniper",
            raw_content=raw_content,
            line_count=len(raw_content.splitlines()),
            file_size=len(raw_content.encode("utf-8")),
            is_sandbox=False
        )
        session.add(config)
        await session.commit()
        await session.refresh(config)
        config_id = config.id

    audit_res = await AuditPipelineService.run_audit(config_id)
    audit = audit_res["audit"]
    findings = audit_res["findings"]

    telnet_finding = next((f for f in findings if "TELNET" in f.rule_id), None)
    assert telnet_finding is not None

    sandbox_config, _, _ = await RemediationSimulator.apply_sandboxed_remediation(
        finding_id=telnet_finding.id,
        reviewer="SecAdmin",
        note="Approved Junos Telnet deletion"
    )

    verif_res = await VerificationService.verify_remediation(
        original_audit_id=audit.id,
        sandboxed_config_id=sandbox_config.id,
        target_finding_id=telnet_finding.id
    )
    assert verif_res["verification_passed"] is True

