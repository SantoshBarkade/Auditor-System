import json
from typing import Dict, Any

class JSONReportGenerator:
    """Export complete audit and verification findings to standardized JSON."""

    @classmethod
    def generate_audit_json(cls, audit_data: Dict[str, Any], findings: list, blockchain_status: Dict[str, Any]) -> str:
        report = {
            "application": "NEXORA Network Security Compliance Auditor",
            "sih_metadata": {
                "problem_statement_id": "SIH26155",
                "team_name": "WeirdBits",
                "theme": "Blockchain & Cybersecurity"
            },
            "audit": audit_data,
            "findings_count": len(findings),
            "findings": findings,
            "blockchain_verification": blockchain_status
        }
        return json.dumps(report, indent=2, default=str)
