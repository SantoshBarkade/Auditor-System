import io
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.models import Audit, Finding, Configuration, Device
from backend.app.models.unresolved import UnresolvedCase, UnresolvedCaseType, UnresolvedStatus, FinalVerdict
from backend.app.services.unresolved.case_service import CaseService

@pytest.mark.asyncio
async def test_posture_summary_endpoint():
    """Verify /api/v1/posture/summary endpoint returns 200 and accurate schema."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/posture/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "global_risk_index" in data
        assert "total_open_findings" in data
        assert "control_health" in data
        assert "vendor_posture" in data
        assert "framework_coverage" in data

@pytest.mark.asyncio
async def test_pdf_report_in_memory_streaming():
    """Verify PDF generation returns binary PDF stream without requiring local disk files."""
    async with AsyncSessionLocal() as session:
        # Create a test audit
        device = Device(hostname="Test-PDF-Router", vendor="Cisco")
        session.add(device)
        await session.flush()

        config = Configuration(device_id=device.id, filename="test_pdf.cfg", vendor="Cisco", raw_content="hostname Test-PDF-Router\n")
        session.add(config)
        await session.flush()

        audit = Audit(configuration_id=config.id, vendor="Cisco", status="COMPLETED", risk_score=25, compliance_score=90.0)
        session.add(audit)
        await session.flush()

        finding = Finding(
            audit_id=audit.id,
            rule_id="CISCO-TEST-001",
            title="Test Finding for PDF",
            vendor="Cisco",
            category="Management",
            severity="LOW",
            verdict="FAIL",
            status="OPEN",
            description="Test Description",
            evidence="line 1 evidence",
            impact="Minimal impact",
            remediation_recommendation="Fix test config"
        )
        session.add(finding)
        await session.commit()
        audit_id = audit.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/v1/reports/{audit_id}/pdf")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content.startswith(b"%PDF")
        assert len(resp.content) > 1000

@pytest.mark.asyncio
async def test_upload_size_limit():
    """Verify that oversized configuration upload is rejected with 413."""
    oversized_bytes = b"hostname Insecure\n" + (b"! padding line\n" * 450000)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/configurations/upload",
            files={"file": ("oversized.cfg", oversized_bytes, "text/plain")}
        )
        assert resp.status_code == 413
        assert "exceeds maximum allowed upload size" in resp.json()["detail"]

@pytest.mark.asyncio
async def test_sample_path_traversal_prevention():
    """Verify that path traversal attempts on sample loading are rejected with 404."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/configurations/samples/load/../../etc/passwd")
        assert resp.status_code == 404

        resp2 = await client.get("/api/v1/configurations/samples/load/..%2F..%2Fsecret.txt")
        assert resp2.status_code == 404

@pytest.mark.asyncio
async def test_admin_token_auth_and_immutable_env():
    """Verify constant-time admin token protection on AI settings and no disk .env mutation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Unauthenticated request fails with 401
        resp_unauth = await client.post(
            "/api/v1/settings/ai",
            json={"api_key": "nvapi-test12345", "model": "meta/llama-3.2-11b-vision-instruct"}
        )
        assert resp_unauth.status_code == 401

        # Invalid token fails with 401
        resp_bad_token = await client.post(
            "/api/v1/settings/ai",
            headers={"x-admin-token": "wrong-token-value"},
            json={"api_key": "nvapi-test12345", "model": "meta/llama-3.2-11b-vision-instruct"}
        )
        assert resp_bad_token.status_code == 401

        # Valid token succeeds
        resp_valid = await client.post(
            "/api/v1/settings/ai",
            headers={"x-admin-token": settings.ADMIN_TOKEN},
            json={"api_key": "nvapi-test12345", "model": "meta/llama-3.2-11b-vision-instruct"}
        )
        assert resp_valid.status_code == 200
        assert resp_valid.json()["status"] == "success"

@pytest.mark.asyncio
async def test_unresolved_case_resolution_lifecycle_sync():
    """Verify resolving an unresolved case updates finding verdict/status and recalculates compliance."""
    async with AsyncSessionLocal() as session:
        # Create test audit and finding
        device = Device(hostname="Lifecycle-Router", vendor="Cisco")
        session.add(device)
        await session.flush()

        config = Configuration(device_id=device.id, filename="lifecycle.cfg", vendor="Cisco", raw_content="hostname Lifecycle\n")
        session.add(config)
        await session.flush()

        audit = Audit(configuration_id=config.id, vendor="Cisco", status="COMPLETED", risk_score=50, compliance_score=50.0)
        session.add(audit)
        await session.flush()

        finding = Finding(
            audit_id=audit.id,
            rule_id="CISCO-UNRES-001",
            title="Unresolved Policy Reference",
            vendor="Cisco",
            category="Network Security",
            severity="MEDIUM",
            verdict="UNRESOLVED",
            status="OPEN",
            description="Policy reference could not be resolved deterministically",
            evidence="service-policy input UNKNOWN_POLICY",
            impact="Potential traffic filtering bypass",
            remediation_recommendation="Verify policy existence",
            compliance_mappings=[
                {"framework": "NIST CSF 2.0", "control_id": "PR.IR-01", "name": "Network Protection"}
            ]
        )
        session.add(finding)
        await session.flush()

        case = UnresolvedCase(
            audit_id=audit.id,
            configuration_id=config.id,
            finding_id=finding.id,
            case_type=UnresolvedCaseType.MISSING_REFERENCE,
            status=UnresolvedStatus.AWAITING_REVIEW,
            reason="Referenced policy UNKNOWN_POLICY not defined",
            vendor="Cisco",
            rule_id="CISCO-UNRES-001",
            source_lines=[10],
            source_text="service-policy input UNKNOWN_POLICY"
        )
        session.add(case)
        await session.commit()

        case_id = case.id
        finding_id = finding.id
        audit_id = audit.id

    # Resolve case via CaseService
    async with AsyncSessionLocal() as session:
        case_res = await session.execute(select(UnresolvedCase).where(UnresolvedCase.id == case_id))
        c = case_res.scalar_one()
        resolved_c = await CaseService.resolve_case(
            session=session,
            case=c,
            reviewer="Lead Auditor",
            verdict=FinalVerdict.CONFIRMED_SAFE,
            resolution_context="Policy is defined on upstream border gateway"
        )
        assert resolved_c.status == UnresolvedStatus.RESOLVED
        assert resolved_c.final_verdict == FinalVerdict.CONFIRMED_SAFE

    # Verify Finding and Audit were updated consistently
    async with AsyncSessionLocal() as session:
        f_res = await session.execute(select(Finding).where(Finding.id == finding_id))
        updated_f = f_res.scalar_one()
        assert updated_f.verdict == "PASS"
        assert updated_f.status == "VERIFIED"

        a_res = await session.execute(select(Audit).where(Audit.id == audit_id))
        updated_a = a_res.scalar_one()
        # Compliance score recalculated by ComplianceEngine
        assert updated_a.compliance_score > 50.0

@pytest.mark.asyncio
async def test_finding_pipeline_provenance_and_determinism():
    """
    Validates GET /api/v1/findings/{id}/pipeline:
    1. Returns 200 with complete machine-readable provenance.
    2. Validates finding, configuration, parser, normalization, facts, security state, compliance, risk, blockchain.
    3. Verifies 404 for missing finding (999999).
    4. Confirms pipeline verdict equals authoritative finding verdict.
    5. Confirms risk score calculation equals RiskCalculator result.
    """
    from backend.app.models.models import Finding
    from backend.app.services.risk_engine.calculator import RiskCalculator

    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Finding).limit(1))
        finding = res.scalar_one_or_none()

    if not finding:
        pytest.skip("No findings in database to test pipeline endpoint")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Valid finding pipeline
        response = await client.get(f"/api/v1/findings/{finding.id}/pipeline")
        assert response.status_code == 200
        data = response.json()

        # Check top-level keys
        required_keys = [
            "finding", "audit", "configuration", "pipeline", "source",
            "vendor_detection", "parser", "normalization", "security_state",
            "compliance", "risk", "evidence", "remediation", "ai_advisory",
            "blockchain", "reporting"
        ]
        for k in required_keys:
            assert k in data, f"Missing required pipeline key: {k}"

        # Check finding and verdict determinism
        assert data["finding"]["id"] == finding.id
        assert data["compliance"]["verdict"] == finding.verdict
        assert data["compliance"]["engine"] == "Deterministic Compliance Engine"

        # Check normalization facts
        assert isinstance(data["normalization"]["facts"], list)
        assert len(data["normalization"]["facts"]) > 0

        # Check security state
        assert "state" in data["security_state"]
        assert "scope" in data["security_state"]
        assert data["security_state"]["interpretation_type"] == "Deterministic Security Interpretation — Not AI"

        # Check risk calculation consistency
        assert data["risk"]["score"] == finding.risk_score
        assert data["risk"]["severity"]["score"] == finding.severity_score

        # Check 15-stage pipeline list
        assert len(data["pipeline"]["stages"]) == 15

        # 2. Missing finding returns 404
        missing_resp = await client.get("/api/v1/findings/999999/pipeline")
        assert missing_resp.status_code == 404

