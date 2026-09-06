import pytest
from unittest.mock import patch, MagicMock
import httpx
from backend.app.services.risk_engine.calculator import RiskCalculator
from backend.app.services.ai.explainer import AIExplanationService
from backend.app.services.parsers.cisco import CiscoParser
from backend.app.services.parsers.fortigate import FortiGateParser
from backend.app.services.parsers.juniper import JuniperParser
from backend.app.services.security_engine.evaluator import SecurityEvaluator

def test_risk_calculator_boundary_clamping():
    # Min boundary
    assert RiskCalculator.calculate_score(-1, -5, 0, -10) >= 0
    # Even if inputs are 0, clamp max(1, input) is applied.
    # Severity=1, Exposure=1, Impact=1, Exploitability=1
    # 0.35 + 0.25 + 0.20 + 0.20 = 1.0 -> 1/4 * 100 = 25
    assert RiskCalculator.calculate_score(0, 0, 0, 0) == 25

    # Max boundary
    assert RiskCalculator.calculate_score(5, 10, 100, 50) <= 100
    # Inputs >= 4 clamp to 4.
    # 4 * 0.35 + 4 * 0.25 + 4 * 0.20 + 4 * 0.20 = 4.0 -> 4/4 * 100 = 100
    assert RiskCalculator.calculate_score(5, 5, 5, 5) == 100

@pytest.mark.asyncio
async def test_gemini_fallback_on_503():
    with patch("httpx.AsyncClient.post") as mock_post:
        # Simulate a 503 Service Unavailable response
        mock_resp = MagicMock()
        mock_resp.status_code = 503
        mock_resp.text = "Service Unavailable"
        mock_post.return_value = mock_resp
        
        # Test with a mock API key to trigger the _call_gemini branch
        with patch("backend.app.core.config.settings.GEMINI_API_KEY", "fake_key"):
            result = await AIExplanationService.explain_finding(
                title="Test Finding",
                vendor="Cisco",
                category="Authentication",
                severity="HIGH",
                evidence="transport input telnet",
                impact="Cleartext intercept",
                remediation="transport input ssh"
            )
            
            # Since the API failed, we expect the deterministic fallback
            assert result is not None
            assert "source" in result
            assert "Deterministic Security Engine (AI Fallback)" in result["source"]
            assert result["summary"].startswith("Deterministic security rule identified")

def test_cisco_unresolved_verdict():
    raw_config = "hostname Switch\npassword cleartext fake\n"
    parser = CiscoParser()
    parsed = parser.parse(raw_config)
    normalized = parser.normalize(parsed, raw_config)
    assert len(normalized.unparsed_statements) > 0

    findings = SecurityEvaluator.evaluate(raw_config, "Cisco", normalized)
    
    unresolved_findings = [f for f in findings if f["verdict"] == "UNRESOLVED"]
    assert len(unresolved_findings) > 0
    assert unresolved_findings[0]["title"] == "Unresolved Security-Sensitive Directive"

def test_fortinet_unresolved_verdict():
    raw_config = "config system global\n  set password mypassword\nend\n"
    parser = FortiGateParser()
    parsed = parser.parse(raw_config)
    normalized = parser.normalize(parsed, raw_config)
    assert len(normalized.unparsed_statements) > 0

    findings = SecurityEvaluator.evaluate(raw_config, "Fortinet", normalized)
    
    unresolved_findings = [f for f in findings if f["verdict"] == "UNRESOLVED"]
    assert len(unresolved_findings) > 0

def test_juniper_unresolved_verdict():
    raw_config = "set system host-name Router\nset system fake-auth plain-text-password\n"
    parser = JuniperParser()
    parsed = parser.parse(raw_config)
    normalized = parser.normalize(parsed, raw_config)
    assert len(normalized.unparsed_statements) > 0

    findings = SecurityEvaluator.evaluate(raw_config, "Juniper", normalized)
    
    unresolved_findings = [f for f in findings if f["verdict"] == "UNRESOLVED"]
    assert len(unresolved_findings) > 0
