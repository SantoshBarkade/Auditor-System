from typing import List, Dict, Any

class ComplianceEngine:
    """
    Curated Compliance Mapping & Posture Evaluation Engine for NEXORA.
    Evaluates configurations against:
    - NIST CSF 2.0
    - NIST SP 800-53 Rev. 5
    - CIS Benchmarks
    - ISO/IEC 27001:2022
    - PCI DSS v4.0.1
    - MITRE ATT&CK
    """

    FRAMEWORKS = [
        "NIST CSF 2.0",
        "NIST SP 800-53 Rev. 5",
        "CIS Benchmarks",
        "ISO/IEC 27001:2022",
        "PCI DSS v4.0.1",
        "MITRE ATT&CK"
    ]

    FRAMEWORK_BASELINE_CONTROLS = {
        "NIST CSF 2.0": [
            {"control_id": "PR.AA-01", "name": "Identities and credentials are authenticated and asserted"},
            {"control_id": "PR.IR-01", "name": "Networks and environments are protected from unauthorized traffic"},
            {"control_id": "PR.PS-01", "name": "Configuration management practices are established and applied"},
            {"control_id": "DE.CM-01", "name": "Networks and network services are monitored for unauthorized activity"},
        ],
        "NIST SP 800-53 Rev. 5": [
            {"control_id": "AC-17(2)", "name": "Remote Access | Encrypt Network Communications"},
            {"control_id": "SC-7", "name": "Boundary Protection"},
            {"control_id": "SC-13", "name": "Cryptographic Protection"},
            {"control_id": "IA-5(1)", "name": "Authenticator Management | Passwords"},
            {"control_id": "AU-2", "name": "Event Logging"},
        ],
        "CIS Benchmarks": [
            {"control_id": "CIS-1.1", "name": "Ensure perimeter traffic filtering is restricted"},
            {"control_id": "CIS-2.1.1", "name": "Ensure Telnet is disabled across all interfaces"},
            {"control_id": "CIS-2.1.2", "name": "Ensure modern encrypted protocols (SSHv2 / HTTPS) are enforced"},
            {"control_id": "CIS-3.1.1", "name": "Ensure audit logging is enabled on all access rules"},
        ],
        "ISO/IEC 27001:2022": [
            {"control_id": "A.8.20", "name": "Network Security"},
            {"control_id": "A.8.24", "name": "Use of Cryptography"},
            {"control_id": "A.5.17", "name": "Authentication Information"},
        ],
        "PCI DSS v4.0.1": [
            {"control_id": "Requirement 1.3.1", "name": "Inbound and outbound traffic restricted"},
            {"control_id": "Requirement 2.2.3", "name": "Encrypt all administrative access with strong cryptography"},
            {"control_id": "Requirement 2.2.7", "name": "Non-console administrative access must be encrypted"},
            {"control_id": "Requirement 10.2.1", "name": "Audit logs record all access to network components"},
        ],
        "MITRE ATT&CK": [
            {"control_id": "T1040", "name": "Network Sniffing"},
            {"control_id": "T1190", "name": "Exploit Public-Facing Application"},
            {"control_id": "T1078", "name": "Valid Accounts"},
        ]
    }

    @classmethod
    def evaluate_posture(cls, findings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Compute compliance status across all frameworks from current active findings.
        If a control is violated by an open finding, status is GAP.
        Once remediated, control status flips to SATISFIED.
        """
        open_findings = [f for f in findings if f.get("status") in ["OPEN", "PENDING_APPROVAL", "REJECTED"]]
        
        # Collect all violated control IDs
        gaps_by_framework: Dict[str, List[Dict[str, Any]]] = {fw: [] for fw in cls.FRAMEWORKS}
        
        for finding in open_findings:
            mappings = finding.get("compliance_mappings", [])
            for m in mappings:
                fw = m.get("framework")
                if fw in gaps_by_framework:
                    gaps_by_framework[fw].append({
                        "control_id": m.get("control_id"),
                        "name": m.get("name"),
                        "finding_title": finding.get("title"),
                        "finding_id": finding.get("id"),
                        "rule_id": finding.get("rule_id"),
                        "severity": finding.get("severity"),
                        "status": "GAP"
                    })

        posture = {}
        total_baseline = 0
        total_gaps = 0

        for fw, controls in cls.FRAMEWORK_BASELINE_CONTROLS.items():
            baseline_count = len(controls)
            # Cap gap_count at baseline_count: multiple findings can violate the
            # same control, but we can never have more gaps than baseline controls.
            gap_count = min(len(gaps_by_framework[fw]), baseline_count)
            satisfied_count = baseline_count - gap_count
            pct = round((satisfied_count / baseline_count) * 100, 1)

            total_baseline += baseline_count
            total_gaps += gap_count

            posture[fw] = {
                "compliance_pct": pct,
                "total_controls": baseline_count,
                "gap_count": gap_count,
                "satisfied_count": satisfied_count,
                "gaps": gaps_by_framework[fw]
            }

        overall_pct = round((max(0, total_baseline - total_gaps) / total_baseline) * 100, 1) if total_baseline > 0 else 100.0

        return {
            "overall_compliance_pct": overall_pct,
            "frameworks": posture
        }
