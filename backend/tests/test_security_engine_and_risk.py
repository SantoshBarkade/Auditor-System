import os
from backend.app.services.normalization.normalizer import NormalizerService
from backend.app.services.security_engine.evaluator import SecurityEvaluator
from backend.app.services.risk_engine.calculator import RiskCalculator
from backend.app.core.config import settings

def test_cisco_security_evaluation():
    path = os.path.join(settings.SAMPLE_CONFIGS_DIR, "cisco_insecure.cfg")
    with open(path, "r") as f:
        content = f.read()

    vendor, normalized, _ = NormalizerService.normalize_configuration(content, "cisco.cfg")
    findings = SecurityEvaluator.evaluate(content, vendor, normalized)

    rule_ids = [f["rule_id"] for f in findings]
    assert "CISCO-TELNET-001" in rule_ids
    assert "CISCO-ACL-PERMISSIVE-001" in rule_ids
    assert "CISCO-SSH-VER-001" in rule_ids
    assert "CISCO-PWD-PLAINTEXT-001" in rule_ids

    # Check that all findings have non-empty exact evidence and line numbers
    for f in findings:
        assert len(f["evidence"]) > 0
        assert len(f["line_numbers"]) > 0
        assert f["risk_score"] > 0
        assert len(f["compliance_mappings"]) > 0

def test_risk_calculator_determinism():
    # Same inputs must always yield exact same score
    score1 = RiskCalculator.calculate_score(severity=4, exposure=4, impact=4, exploitability=4)
    score2 = RiskCalculator.calculate_score(severity=4, exposure=4, impact=4, exploitability=4)
    assert score1 == 100
    assert score2 == 100

    # Intermediate test
    # Weighted = (3 * 0.35) + (2 * 0.25) + (3 * 0.20) + (2 * 0.20) = 1.05 + 0.50 + 0.60 + 0.40 = 2.55
    # Score = round(2.55 / 4.0 * 100) = round(63.75) = 64
    score_mid = RiskCalculator.calculate_score(severity=3, exposure=2, impact=3, exploitability=2)
    assert score_mid == 64
    assert RiskCalculator.get_risk_tier(score_mid) == "MEDIUM"
