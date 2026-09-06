import csv
import io
from typing import List, Dict, Any

class CSVReportGenerator:
    """Export findings table to CSV format."""

    @classmethod
    def generate_findings_csv(cls, findings: List[Dict[str, Any]]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)

        # Write Header
        writer.writerow([
            "Finding ID",
            "Audit ID",
            "Rule ID",
            "Title",
            "Vendor",
            "Category",
            "Severity",
            "Status",
            "Risk Score",
            "Line Numbers",
            "Evidence",
            "Impact",
            "Remediation Recommendation"
        ])

        for f in findings:
            writer.writerow([
                f.get("id"),
                f.get("audit_id"),
                f.get("rule_id"),
                f.get("title"),
                f.get("vendor"),
                f.get("category"),
                f.get("severity"),
                f.get("status"),
                f.get("risk_score"),
                ";".join(map(str, f.get("line_numbers", []))),
                f.get("evidence"),
                f.get("impact"),
                f.get("remediation_recommendation")
            ])

        return output.getvalue()
