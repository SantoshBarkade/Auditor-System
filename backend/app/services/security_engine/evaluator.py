import logging
from typing import List, Dict, Any
from backend.app.schemas.normalized import NormalizedConfiguration
from backend.app.services.security_engine.rule_registry import SECURITY_RULES
from backend.app.services.risk_engine.calculator import RiskCalculator
from backend.app.services.parsers.cisco import CiscoParser
from backend.app.services.parsers.fortigate import FortiGateParser
from backend.app.services.parsers.juniper import JuniperParser

logger = logging.getLogger(__name__)

class SecurityEvaluator:
    """
    Authoritative Deterministic Security Analysis Engine.
    Evaluates configurations against rules and returns findings with exact line evidence.
    AI cannot change or override these results.
    """

    PARSERS = {
        "Cisco": CiscoParser(),
        "Fortinet": FortiGateParser(),
        "Juniper": JuniperParser()
    }

    @classmethod
    def evaluate(cls, raw_content: str, vendor: str, normalized: NormalizedConfiguration) -> List[Dict[str, Any]]:
        findings = []
        lines = raw_content.splitlines()
        parser = cls.PARSERS.get(vendor, cls.PARSERS["Cisco"])

        if vendor == "Cisco":
            findings.extend(cls._evaluate_cisco(raw_content, lines, normalized, parser, vendor))
        elif vendor == "Fortinet":
            findings.extend(cls._evaluate_fortigate(raw_content, lines, normalized, parser, vendor))
        elif vendor == "Juniper":
            findings.extend(cls._evaluate_juniper(raw_content, lines, normalized, parser, vendor))

        return findings

    @classmethod
    def _create_finding(cls, rule_id: str, evidence: str, line_numbers: List[int], parser, raw_content: str, verdict: str = "FAIL") -> Dict[str, Any]:
        rule_def = SECURITY_RULES.get(rule_id)
        if not rule_def:
            return {}

        risk_score = RiskCalculator.calculate_score(
            severity=rule_def.severity_weight,
            exposure=rule_def.exposure_weight,
            impact=rule_def.impact_weight,
            exploitability=rule_def.exploitability_weight
        )

        patch = parser.generate_remediation_patch(rule_id, raw_content, evidence)

        # Build initial deterministic AI-assisted explanation
        ai_explanation = {
            "summary": f"{rule_def.title} detected on {rule_def.vendor} device.",
            "why_it_matters": rule_def.description,
            "potential_impact": rule_def.impact,
            "security_principle": f"Enforce principle of least privilege and cryptographic confidentiality in {rule_def.category}.",
            "recommended_action": rule_def.remediation_template,
            "source": "Deterministic Security Engine",
            "confidence": "High (Rule-based Evidence)"
        }

        return {
            "rule_id": rule_def.rule_id,
            "title": rule_def.title,
            "vendor": rule_def.vendor,
            "category": rule_def.category,
            "severity": rule_def.severity,
            "verdict": verdict,
            "confidence": "HIGH",
            "status": "OPEN",
            "risk_score": risk_score,
            "severity_score": rule_def.severity_weight,
            "exposure_score": rule_def.exposure_weight,
            "impact_score": rule_def.impact_weight,
            "exploitability_score": rule_def.exploitability_weight,
            "description": rule_def.description,
            "evidence": evidence,
            "line_numbers": line_numbers,
            "impact": rule_def.impact,
            "remediation_recommendation": rule_def.remediation_template,
            "remediation_diff": patch,
            "compliance_mappings": [dict(m) for m in rule_def.compliance_mappings],
            "ai_explanation": ai_explanation
        }

    @classmethod
    def _evaluate_cisco(cls, raw_content: str, lines: List[str], normalized: NormalizedConfiguration, parser, vendor: str = "Cisco") -> List[Dict[str, Any]]:
        findings = []

        # 1. Telnet Enabled on VTY
        for mgmt in normalized.management_access:
            if mgmt.protocol == "TELNET" and mgmt.security == "INSECURE":
                findings.append(cls._create_finding(
                    rule_id="CISCO-TELNET-001",
                    evidence=mgmt.raw_statement,
                    line_numbers=[mgmt.line_number],
                    parser=parser,
                    raw_content=raw_content
                ))

        # 2. SSH Version 1
        for idx, line in enumerate(lines, start=1):
            if "ip ssh version 1" in line.lower():
                findings.append(cls._create_finding(
                    rule_id="CISCO-SSH-VER-001",
                    evidence=line.strip(),
                    line_numbers=[idx],
                    parser=parser,
                    raw_content=raw_content
                ))

        # 3. Permissive ACL (permit ip any any)
        for fw in normalized.firewall_rules:
            if fw.is_any_any and fw.action == "PERMIT":
                findings.append(cls._create_finding(
                    rule_id="CISCO-ACL-PERMISSIVE-001",
                    evidence=fw.raw_statement,
                    line_numbers=[fw.line_number],
                    parser=parser,
                    raw_content=raw_content
                ))

        # 4. Plaintext enable password
        for ctrl in normalized.security_controls:
            if ctrl.control_type == "ENABLE_PASSWORD_CLEARTEXT":
                findings.append(cls._create_finding(
                    rule_id="CISCO-PWD-PLAINTEXT-001",
                    evidence=ctrl.raw_statement,
                    line_numbers=[ctrl.line_number],
                    parser=parser,
                    raw_content=raw_content
                ))

        # 5. Missing AAA
        has_aaa = any(ctrl.control_type == "AAA" and ctrl.status == "ENABLED" for ctrl in normalized.security_controls)
        if not has_aaa:
            findings.append(cls._create_finding(
                rule_id="CISCO-AAA-MISSING-001",
                evidence="no aaa new-model (or missing)",
                line_numbers=[1],
                parser=parser,
                raw_content=raw_content
            ))

        # 6. Unrestricted VTY lines
        for mgmt in normalized.management_access:
            if "vty" in (mgmt.interface or "") and mgmt.source_restriction == "unrestricted":
                findings.append(cls._create_finding(
                    rule_id="CISCO-VTY-UNRESTRICTED-001",
                    evidence=mgmt.raw_statement,
                    line_numbers=[mgmt.line_number],
                    parser=parser,
                    raw_content=raw_content
                ))

        # 7. Check SSH Version PASS
        ssh_v2_found = any("ip ssh version 2" in line.lower() for line in lines)
        ssh_v1_found = any("ip ssh version 1" in line.lower() for line in lines)
        if ssh_v2_found and not ssh_v1_found:
            findings.append(cls._create_finding(
                rule_id="CISCO-SSH-SECURE-001",
                evidence="ip ssh version 2",
                line_numbers=[1],
                parser=parser,
                raw_content=raw_content,
                verdict="PASS"
            ))

        # 8. Check CONFLICT for Telnet/SSH
        has_telnet = any(m.protocol == "TELNET" for m in normalized.management_access)
        has_ssh = any(m.protocol == "SSH" for m in normalized.management_access)
        if has_telnet and has_ssh:
            findings.append(cls._create_finding(
                rule_id="CISCO-MGMT-CONFLICT-001",
                evidence="transport input ssh telnet",
                line_numbers=[1],
                parser=parser,
                raw_content=raw_content,
                verdict="CONFLICT"
            ))

        # 9. Check N/A for BGP
        has_bgp = any("router bgp" in line.lower() for line in lines)
        if not has_bgp:
            findings.append(cls._create_finding(
                rule_id="CISCO-BGP-NA-001",
                evidence="No BGP configuration found",
                line_numbers=[0],
                parser=parser,
                raw_content=raw_content,
                verdict="N/A"
            ))

        # Emit UNRESOLVED findings for any directives the parser could not classify
        findings.extend(cls._emit_unresolved_findings(vendor, normalized))
        return findings

    @classmethod
    def _emit_unresolved_findings(cls, vendor: str, normalized: NormalizedConfiguration) -> List[Dict[str, Any]]:
        """Generate UNRESOLVED findings for configuration directives the parser could not classify."""
        findings = []
        # Keywords that indicate a security-sensitive unparsed directive
        SENSITIVE_KEYWORDS = {
            "encrypt", "crypto", "cipher", "password", "secret", "auth",
            "permit", "deny", "access", "tunnel", "vpn", "ike", "ipsec",
            "aaa", "radius", "tacacs", "ssh", "telnet", "https", "http",
            "snmp", "ntp", "log", "syslog", "acl", "policy", "firewall",
        }
        for stmt in normalized.unparsed_statements:
            lower = stmt.raw_line.lower()
            if any(kw in lower for kw in SENSITIVE_KEYWORDS):
                logger.debug("UNRESOLVED statement at line %d: %s", stmt.line_number, stmt.raw_line)
                findings.append({
                    "rule_id": f"{vendor.upper()[:3]}-UNRESOLVED-{stmt.line_number:04d}",
                    "title": "Unresolved Security-Sensitive Directive",
                    "vendor": vendor,
                    "category": "Configuration Ambiguity",
                    "severity": "MEDIUM",
                    "verdict": "UNRESOLVED",
                    "confidence": "LOW",
                    "status": "OPEN",
                    "risk_score": 35,
                    "severity_score": 2,
                    "exposure_score": 2,
                    "impact_score": 2,
                    "exploitability_score": 1,
                    "description": (
                        f"The directive at line {stmt.line_number} contains security-sensitive keywords "
                        f"but could not be classified by the deterministic parser. "
                        f"Section context: {stmt.section or 'global'}. "
                        f"Reason: {stmt.reason}."
                    ),
                    "evidence": stmt.raw_line,
                    "line_numbers": [stmt.line_number],
                    "impact": (
                        "An unclassified security-sensitive directive may represent a misconfiguration, "
                        "deprecated syntax, or an unsupported feature that bypasses security controls."
                    ),
                    "remediation_recommendation": (
                        f"Manually review line {stmt.line_number}: '{stmt.raw_line}'. "
                        "Confirm the directive is intentional and conforms to your security baseline. "
                        "If deprecated, replace with the vendor-recommended equivalent."
                    ),
                    "remediation_diff": {},
                    "compliance_mappings": [
                        {"framework": "NIST CSF 2.0", "control_id": "ID.AM-3", "name": "Organisational communication and data flows are mapped", "status": "REVIEW"},
                        {"framework": "CIS", "control_id": "CIS-3", "name": "Data Protection", "status": "REVIEW"},
                    ],
                    "ai_explanation": {
                        "summary": "This directive was not recognised by the deterministic parser.",
                        "why_it_matters": "Unrecognised directives can hide misconfigurations or deprecated, insecure syntax.",
                        "potential_impact": "Unknown security posture for this configuration area.",
                        "recommended_action": "Manual expert review required.",
                        "source": "Deterministic Security Engine — UNRESOLVED path",
                        "confidence": "Low (Parser gap — human review required)"
                    }
                })
        return findings

    @classmethod
    def _evaluate_fortigate(cls, raw_content: str, lines: List[str], normalized: NormalizedConfiguration, parser, vendor: str = "Fortinet") -> List[Dict[str, Any]]:
        findings = []

        # 1 & 2. Insecure management on interface (HTTP & Telnet)
        for mgmt in normalized.management_access:
            if mgmt.protocol == "HTTP" and mgmt.security == "INSECURE":
                findings.append(cls._create_finding(
                    rule_id="FGT-MGMT-HTTP-001",
                    evidence=f"interface {mgmt.interface}: {mgmt.raw_statement}",
                    line_numbers=[mgmt.line_number],
                    parser=parser,
                    raw_content=raw_content
                ))
            elif mgmt.protocol == "TELNET" and mgmt.security == "INSECURE":
                findings.append(cls._create_finding(
                    rule_id="FGT-MGMT-TELNET-001",
                    evidence=f"interface {mgmt.interface}: {mgmt.raw_statement}",
                    line_numbers=[mgmt.line_number],
                    parser=parser,
                    raw_content=raw_content
                ))

        # 3. Any-Any Policy
        for fw in normalized.firewall_rules:
            if fw.is_any_any and fw.action == "PERMIT":
                findings.append(cls._create_finding(
                    rule_id="FGT-POL-ANY-ANY-001",
                    evidence=f"{fw.name}: set srcaddr 'all' / set dstaddr 'all' / set action accept",
                    line_numbers=[fw.line_number],
                    parser=parser,
                    raw_content=raw_content
                ))

        # 4. Logging Disabled
        for ctrl in normalized.security_controls:
            if ctrl.control_type == "LOGGING_DISABLED":
                findings.append(cls._create_finding(
                    rule_id="FGT-LOGGING-DISABLED-001",
                    evidence=ctrl.details,
                    line_numbers=[ctrl.line_number or 1],
                    parser=parser,
                    raw_content=raw_content
                ))

        # 5. Broad Inbound Access
        for idx, line in enumerate(lines, start=1):
            if "set srcintf \"port1\"" in line.lower() and "set action accept" in raw_content.lower():
                # Checking inbound policy
                findings.append(cls._create_finding(
                    rule_id="FGT-BROAD-INBOUND-001",
                    evidence=line.strip(),
                    line_numbers=[idx],
                    parser=parser,
                    raw_content=raw_content
                ))
                break

        # Emit UNRESOLVED findings for any directives the parser could not classify
        findings.extend(cls._emit_unresolved_findings(vendor, normalized))
        return findings

    @classmethod
    def _evaluate_juniper(cls, raw_content: str, lines: List[str], normalized: NormalizedConfiguration, parser, vendor: str = "Juniper") -> List[Dict[str, Any]]:
        findings = []

        # 1 & 2. Telnet & HTTP Services
        for mgmt in normalized.management_access:
            if mgmt.protocol == "TELNET" and mgmt.security == "INSECURE":
                findings.append(cls._create_finding(
                    rule_id="JUNOS-TELNET-001",
                    evidence=mgmt.raw_statement,
                    line_numbers=[mgmt.line_number],
                    parser=parser,
                    raw_content=raw_content
                ))
            elif mgmt.protocol == "HTTP" and mgmt.security == "INSECURE":
                findings.append(cls._create_finding(
                    rule_id="JUNOS-HTTP-001",
                    evidence=mgmt.raw_statement,
                    line_numbers=[mgmt.line_number],
                    parser=parser,
                    raw_content=raw_content
                ))

        # 3. Permissive policy
        for fw in normalized.firewall_rules:
            if fw.is_any_any and fw.action == "PERMIT":
                findings.append(cls._create_finding(
                    rule_id="JUNOS-POL-ANY-ANY-001",
                    evidence=f"{fw.name} match source-address any destination-address any then permit",
                    line_numbers=[fw.line_number],
                    parser=parser,
                    raw_content=raw_content
                ))

        # 4. Missing Policy Logging
        for ctrl in normalized.security_controls:
            if ctrl.control_type == "MISSING_POLICY_LOGGING":
                findings.append(cls._create_finding(
                    rule_id="JUNOS-POL-LOG-MISSING-001",
                    evidence=ctrl.details,
                    line_numbers=[ctrl.line_number or 1],
                    parser=parser,
                    raw_content=raw_content
                ))

        # 5. Weak root authentication
        for ctrl in normalized.security_controls:
            if ctrl.control_type == "ROOT_AUTH_WEAK":
                findings.append(cls._create_finding(
                    rule_id="JUNOS-ROOT-AUTH-WEAK-001",
                    evidence=ctrl.raw_statement,
                    line_numbers=[ctrl.line_number or 1],
                    parser=parser,
                    raw_content=raw_content
                ))

        # Emit UNRESOLVED findings for any directives the parser could not classify
        findings.extend(cls._emit_unresolved_findings(vendor, normalized))
        return findings
