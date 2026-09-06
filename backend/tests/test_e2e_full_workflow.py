import pytest
from pathlib import Path

SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample_configs"
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_full_cisco_insecure_demo():
    # 1. Health
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    # 2. Upload cisco insecure
    with open(SAMPLE_DIR / "cisco_insecure.cfg", "r", encoding="utf-8") as f:
        content = f.read()

    res = client.post("/api/v1/configurations/upload", json={
        "name": "cisco_insecure.cfg",
        "raw_text": content,
        "vendor": "cisco"
    })
    assert res.status_code == 200
    config_data = res.json()
    config_id = config_data["id"]
    assert config_data["vendor"] == "Cisco"
    assert config_data["line_count"] > 0

    # 3. Normalized object check
    res = client.get(f"/api/v1/configurations/{config_id}/normalized")
    assert res.status_code == 200
    norm_res = res.json()
    norm = norm_res["normalized"]
    assert norm["device"]["hostname"].upper() == "CORE-RTR-01"
    assert any(m["protocol"] == "TELNET" and m["enabled"] for m in norm["management_access"])

    # 4. Run Audit
    res = client.post("/api/v1/audits/run", json={"configuration_id": config_id})
    assert res.status_code == 200
    audit = res.json()
    audit_id = audit["audit_id"]
    assert audit["risk_score"] > 50
    assert audit["findings_count"] >= 5

    # 5. Get findings
    res = client.get(f"/api/v1/audits/{audit_id}/findings")
    assert res.status_code == 200
    findings = res.json()
    assert len(findings) >= 5

    telnet_finding = next(f for f in findings if "TELNET" in f["rule_id"])
    finding_id = telnet_finding["id"]

    # 6. Check evidence
    res = client.get(f"/api/v1/findings/{finding_id}/evidence")
    assert res.status_code == 200
    ev = res.json()
    assert "transport input telnet" in ev["evidence"]
    assert 38 in ev["line_numbers"]

    # 7. Check explanation
    res = client.get(f"/api/v1/findings/{finding_id}/explanation")
    assert res.status_code == 200
    exp = res.json()
    assert "summary" in exp
    assert "why_it_matters" in exp
    assert "source" in exp

    # 8. Approve finding
    res = client.post(f"/api/v1/findings/{finding_id}/approve", json={
        "reviewer": "Security Lead",
        "note": "Approved for sandbox simulation"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "APPROVED"

    # 9. Simulate remediation & verify
    res = client.post(f"/api/v1/findings/{finding_id}/simulate-remediation")
    assert res.status_code == 200
    sim = res.json()
    assert sim["verification_passed"] is True
    assert sim["risk_score_after"] < sim["risk_score_before"]
    assert sim["compliance_score_after"] >= sim["compliance_score_before"]

    # 10. Check blockchain
    res = client.get("/api/v1/blockchain")
    assert res.status_code == 200
    blocks = res.json()
    assert len(blocks) >= 5

    res = client.post("/api/v1/blockchain/verify")
    assert res.status_code == 200
    assert res.json()["is_valid"] is True

    # 11. Tamper test
    from backend.app.core.config import settings
    original_debug = settings.DEBUG
    settings.DEBUG = True
    try:
        res = client.post("/api/v1/blockchain/tamper-test")
        assert res.status_code == 200
        t_res = res.json()
        assert t_res["before_status"] == "CHAIN VALID"
        assert "TAMPERING DETECTED" in t_res["during_status"]
        assert t_res["repaired_status"] == "CHAIN RESTORED & VALID"
    finally:
        settings.DEBUG = original_debug

    # 12. Reports
    res = client.get(f"/api/v1/reports/{audit_id}/json")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("application/json")

    res = client.get(f"/api/v1/reports/{audit_id}/csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]

    res = client.get(f"/api/v1/reports/{audit_id}/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000

def test_fortinet_and_juniper_insecure_demo():
    # Fortinet
    with open(SAMPLE_DIR / "fortigate_insecure.conf", "r", encoding="utf-8") as f:
        fg_content = f.read()

    res = client.post("/api/v1/configurations/upload", json={
        "name": "fortigate_insecure.conf",
        "raw_text": fg_content,
        "vendor": "fortinet"
    })
    assert res.status_code == 200
    fg_config_id = res.json()["id"]

    res = client.post("/api/v1/audits/run", json={"configuration_id": fg_config_id})
    assert res.status_code == 200
    fg_audit = res.json()
    fg_audit_id = fg_audit["audit_id"]

    res = client.get(f"/api/v1/audits/{fg_audit_id}/findings")
    assert res.status_code == 200
    fg_findings = res.json()
    assert any("FGT-" in f["rule_id"] for f in fg_findings)

    # Juniper
    with open(SAMPLE_DIR / "juniper_insecure.conf", "r", encoding="utf-8") as f:
        jn_content = f.read()

    res = client.post("/api/v1/configurations/upload", json={
        "name": "juniper_insecure.conf",
        "raw_text": jn_content,
        "vendor": "juniper"
    })
    assert res.status_code == 200
    jn_config_id = res.json()["id"]

    res = client.post("/api/v1/audits/run", json={"configuration_id": jn_config_id})
    assert res.status_code == 200
    jn_audit = res.json()
    jn_audit_id = jn_audit["audit_id"]

    res = client.get(f"/api/v1/audits/{jn_audit_id}/findings")
    assert res.status_code == 200
    jn_findings = res.json()
    assert any("JUNOS-" in f["rule_id"] for f in jn_findings)


