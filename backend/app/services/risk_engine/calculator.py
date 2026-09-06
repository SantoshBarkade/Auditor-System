class RiskCalculator:
    """
    Deterministic Risk Scoring Engine for NEXORA.
    Calculates transparent risk scores (0-100) based on four normalized security dimensions:
    - Severity (35% weight)
    - Exposure (25% weight)
    - Impact (20% weight)
    - Exploitability (20% weight)
    
    Each factor is bounded between 1 (minimal) and 4 (critical).
    Formula:
      Weighted Score = (Severity * 0.35) + (Exposure * 0.25) + (Impact * 0.20) + (Exploitability * 0.20)
      Risk Score = round((Weighted Score / 4.0) * 100)
    """

    SEVERITY_WEIGHT = 0.35
    EXPOSURE_WEIGHT = 0.25
    IMPACT_WEIGHT = 0.20
    EXPLOITABILITY_WEIGHT = 0.20

    @classmethod
    def calculate_score(cls, severity: int, exposure: int, impact: int, exploitability: int) -> int:
        # Clamp inputs to [1, 4]
        s = max(1, min(4, severity))
        e = max(1, min(4, exposure))
        i = max(1, min(4, impact))
        x = max(1, min(4, exploitability))

        weighted = (
            (s * cls.SEVERITY_WEIGHT) +
            (e * cls.EXPOSURE_WEIGHT) +
            (i * cls.IMPACT_WEIGHT) +
            (x * cls.EXPLOITABILITY_WEIGHT)
        )

        score = round((weighted / 4.0) * 100)
        return max(0, min(100, score))

    @classmethod
    def get_risk_tier(cls, score: int) -> str:
        if score >= 85:
            return "CRITICAL"
        elif score >= 70:
            return "HIGH"
        elif score >= 45:
            return "MEDIUM"
        elif score >= 20:
            return "LOW"
        else:
            return "INFORMATIONAL"
