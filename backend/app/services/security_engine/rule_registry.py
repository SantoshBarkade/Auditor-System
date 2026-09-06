from typing import Dict, Any, List
from pydantic import BaseModel

class SecurityRuleDefinition(BaseModel):
    rule_id: str
    title: str
    vendor: str  # Cisco, Fortinet, Juniper, Normalized
    category: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    description: str
    impact: str
    remediation_template: str
    # Factor weights: 1-4 scale
    severity_weight: int
    exposure_weight: int
    impact_weight: int
    exploitability_weight: int
    compliance_mappings: List[Dict[str, str]]

SECURITY_RULES: Dict[str, SecurityRuleDefinition] = {
    # ------------------- CISCO RULES -------------------
    "CISCO-TELNET-001": SecurityRuleDefinition(
        rule_id="CISCO-TELNET-001",
        title="Insecure Telnet Administrative Management Access",
        vendor="Cisco",
        category="Management Access",
        severity="HIGH",
        description="Telnet protocol is permitted on VTY lines. Telnet transmits authentication credentials and management commands in cleartext over the network.",
        impact="Adversaries monitoring network traffic or positioned in-path can intercept cleartext passwords and execute unauthorized commands with administrative privileges.",
        remediation_template="Configure 'transport input ssh' under all line vty blocks to enforce SSH v2 and disable Telnet.",
        severity_weight=4,
        exposure_weight=4,
        impact_weight=4,
        exploitability_weight=4,
        compliance_mappings=[
            {"framework": "NIST CSF 2.0", "control_id": "PR.AA-01", "name": "Access Management Credentials", "status": "GAP"},
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "AC-17(2)", "name": "Remote Access | Encrypt Network Communications", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-Cisco-2.1.1", "name": "Ensure Telnet is disabled", "status": "GAP"},
            {"framework": "ISO/IEC 27001:2022", "control_id": "A.8.20", "name": "Network Security", "status": "GAP"},
            {"framework": "PCI DSS v4.0.1", "control_id": "Requirement 2.2.7", "name": "Non-console administrative access must be encrypted", "status": "GAP"},
            {"framework": "MITRE ATT&CK", "control_id": "T1040", "name": "Network Sniffing / Cleartext Credentials", "status": "GAP"}
        ]
    ),
    "CISCO-SSH-VER-001": SecurityRuleDefinition(
        rule_id="CISCO-SSH-VER-001",
        title="Insecure SSH Version 1 Configured",
        vendor="Cisco",
        category="Cryptographic Protection",
        severity="HIGH",
        description="The device is configured with SSH version 1 ('ip ssh version 1'). SSHv1 has known protocol design flaws including CRC-32 compensation attacks and weak key exchange.",
        impact="Attackers can inject malicious traffic into established sessions or decrypt sensitive management traffic.",
        remediation_template="Execute 'ip ssh version 2' to enforce SSH Protocol Version 2.",
        severity_weight=4,
        exposure_weight=3,
        impact_weight=3,
        exploitability_weight=3,
        compliance_mappings=[
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "SC-13", "name": "Cryptographic Protection", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-Cisco-2.1.2", "name": "Ensure SSH version 2 is configured", "status": "GAP"},
            {"framework": "PCI DSS v4.0.1", "control_id": "Requirement 2.2.3", "name": "Encrypt all administrative access with strong cryptography", "status": "GAP"}
        ]
    ),
    "CISCO-SSH-SECURE-001": SecurityRuleDefinition(
        rule_id="CISCO-SSH-SECURE-001",
        title="Secure SSH Configuration",
        vendor="Cisco",
        category="Management Access",
        severity="INFO",
        description="SSH v2 is correctly configured.",
        impact="None.",
        remediation_template="Maintain configuration.",
        severity_weight=0,
        exposure_weight=0,
        impact_weight=0,
        exploitability_weight=0,
        compliance_mappings=[{"framework": "NIST", "control_id": "N/A", "name": "N/A", "status": "PASS"}]
    ),
    "CISCO-MGMT-CONFLICT-001": SecurityRuleDefinition(
        rule_id="CISCO-MGMT-CONFLICT-001",
        title="Conflicting Management Protocols",
        vendor="Cisco",
        category="Management Access",
        severity="MEDIUM",
        description="Both secure (SSH) and insecure (Telnet) protocols are configured on the same VTY lines.",
        impact="The secure protocol is bypassed by the insecure one.",
        remediation_template="Remove Telnet.",
        severity_weight=3,
        exposure_weight=3,
        impact_weight=3,
        exploitability_weight=3,
        compliance_mappings=[{"framework": "NIST", "control_id": "N/A", "name": "N/A", "status": "CONFLICT"}]
    ),
    "CISCO-BGP-NA-001": SecurityRuleDefinition(
        rule_id="CISCO-BGP-NA-001",
        title="BGP Security Controls",
        vendor="Cisco",
        category="Routing",
        severity="INFO",
        description="BGP is not configured, so BGP security rules are N/A.",
        impact="None.",
        remediation_template="N/A",
        severity_weight=0,
        exposure_weight=0,
        impact_weight=0,
        exploitability_weight=0,
        compliance_mappings=[{"framework": "NIST", "control_id": "N/A", "name": "N/A", "status": "N/A"}]
    ),
    "CISCO-ACL-PERMISSIVE-001": SecurityRuleDefinition(
        rule_id="CISCO-ACL-PERMISSIVE-001",
        title="Overly Permissive Any-to-Any Access Control List",
        vendor="Cisco",
        category="Access Control",
        severity="CRITICAL",
        description="Access list contains an unrestricted 'permit ip any any' statement without protocol, port, or subnet boundaries.",
        impact="Completely eliminates network segmentation boundaries, permitting unauthenticated lateral movement and external compromise.",
        remediation_template="Replace 'permit ip any any' with specific host/subnet IP ranges and defined transport ports, followed by an explicit deny statement with logging.",
        severity_weight=4,
        exposure_weight=4,
        impact_weight=4,
        exploitability_weight=4,
        compliance_mappings=[
            {"framework": "NIST CSF 2.0", "control_id": "PR.IR-01", "name": "Network Infrastructure Protection", "status": "GAP"},
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "SC-7(5)", "name": "Boundary Protection | Deny by Default", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-Cisco-1.1.1", "name": "Ensure inbound traffic is filtered", "status": "GAP"},
            {"framework": "PCI DSS v4.0.1", "control_id": "Requirement 1.3.1", "name": "Inbound traffic is restricted to only IP addresses that are necessary", "status": "GAP"},
            {"framework": "MITRE ATT&CK", "control_id": "T1190", "name": "Exploit Public-Facing Application", "status": "GAP"}
        ]
    ),
    "CISCO-PWD-PLAINTEXT-001": SecurityRuleDefinition(
        rule_id="CISCO-PWD-PLAINTEXT-001",
        title="Reversible Plaintext Enable Password Configured",
        vendor="Cisco",
        category="Authentication & Credentials",
        severity="HIGH",
        description="The device uses 'enable password' instead of 'enable secret'. 'enable password' stores privileged credentials in cleartext or weak reversible Type 7 cipher.",
        impact="Anyone with read access to the running-config or backup archives can immediately recover the device privileged administrative password.",
        remediation_template="Remove 'enable password' and configure 'enable secret' with a strong cryptographic hash.",
        severity_weight=4,
        exposure_weight=3,
        impact_weight=4,
        exploitability_weight=4,
        compliance_mappings=[
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "IA-5(1)", "name": "Authenticator Management | Password-Based Authentication", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-Cisco-1.2.1", "name": "Ensure 'enable secret' is configured", "status": "GAP"},
            {"framework": "ISO/IEC 27001:2022", "control_id": "A.5.17", "name": "Authentication information", "status": "GAP"}
        ]
    ),
    "CISCO-AAA-MISSING-001": SecurityRuleDefinition(
        rule_id="CISCO-AAA-MISSING-001",
        title="AAA Subsystem Disabled / Missing",
        vendor="Cisco",
        category="Authentication & Credentials",
        severity="MEDIUM",
        description="The Authentication, Authorization, and Accounting (AAA) subsystem is not enabled ('no aaa new-model').",
        impact="Device cannot enforce granular role-based access control, accounting logs, or integration with centralized identity providers (RADIUS/TACACS+).",
        remediation_template="Configure 'aaa new-model' and establish local or remote authentication policies.",
        severity_weight=3,
        exposure_weight=2,
        impact_weight=3,
        exploitability_weight=2,
        compliance_mappings=[
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "AC-2", "name": "Account Management", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-Cisco-1.3.1", "name": "Ensure 'aaa new-model' is enabled", "status": "GAP"}
        ]
    ),
    "CISCO-VTY-UNRESTRICTED-001": SecurityRuleDefinition(
        rule_id="CISCO-VTY-UNRESTRICTED-001",
        title="Unrestricted Management Access on VTY Lines",
        vendor="Cisco",
        category="Management Access",
        severity="MEDIUM",
        description="VTY management lines do not have an 'access-class' configured to restrict source IP addresses.",
        impact="Any endpoint that can route packets to the management interface can attempt brute-force authentication against the device.",
        remediation_template="Create an authorized management ACL and apply it with 'access-class <ACL_ID> in' on line vty 0 15.",
        severity_weight=3,
        exposure_weight=4,
        impact_weight=3,
        exploitability_weight=3,
        compliance_mappings=[
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "AC-17(3)", "name": "Remote Access | Managed Access Control Points", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-Cisco-2.1.5", "name": "Ensure access-class is applied to VTY lines", "status": "GAP"}
        ]
    ),

    # ------------------- FORTINET RULES -------------------
    "FGT-MGMT-HTTP-001": SecurityRuleDefinition(
        rule_id="FGT-MGMT-HTTP-001",
        title="Unencrypted HTTP Management Interface Enabled",
        vendor="Fortinet",
        category="Management Access",
        severity="HIGH",
        description="Interface configuration contains 'set allowaccess http'. Unencrypted HTTP web management transmits administrative session cookies and credentials in plaintext.",
        impact="Network eavesdroppers can capture administrative session tokens and compromise the FortiGate management console.",
        remediation_template="Remove 'http' from 'set allowaccess' and enforce 'set allowaccess https ssh'.",
        severity_weight=4,
        exposure_weight=4,
        impact_weight=4,
        exploitability_weight=4,
        compliance_mappings=[
            {"framework": "NIST CSF 2.0", "control_id": "PR.AA-01", "name": "Identity and Access Management", "status": "GAP"},
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "AC-17(2)", "name": "Remote Access | Encrypt Network Communications", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-FortiOS-1.1.1", "name": "Ensure HTTP administrative access is disabled", "status": "GAP"},
            {"framework": "PCI DSS v4.0.1", "control_id": "Requirement 2.2.7", "name": "Encrypt non-console administrative access", "status": "GAP"}
        ]
    ),
    "FGT-MGMT-TELNET-001": SecurityRuleDefinition(
        rule_id="FGT-MGMT-TELNET-001",
        title="Insecure Telnet Management Interface Enabled",
        vendor="Fortinet",
        category="Management Access",
        severity="HIGH",
        description="Interface allowaccess allows 'telnet'. Telnet is an unencrypted legacy protocol that exposes passwords to network sniffing.",
        impact="Cleartext transmission of FortiOS administrative credentials over the local or transit network.",
        remediation_template="Remove 'telnet' from 'set allowaccess' and permit only 'ssh' and 'https'.",
        severity_weight=4,
        exposure_weight=4,
        impact_weight=4,
        exploitability_weight=4,
        compliance_mappings=[
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "AC-17(2)", "name": "Remote Access Encryption", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-FortiOS-1.1.2", "name": "Ensure Telnet administrative access is disabled", "status": "GAP"},
            {"framework": "MITRE ATT&CK", "control_id": "T1040", "name": "Network Sniffing", "status": "GAP"}
        ]
    ),
    "FGT-POL-ANY-ANY-001": SecurityRuleDefinition(
        rule_id="FGT-POL-ANY-ANY-001",
        title="Overly Permissive Any-to-Any Firewall Policy",
        vendor="Fortinet",
        category="Access Control",
        severity="CRITICAL",
        description="Firewall policy defines source address 'all', destination address 'all', and action 'accept' without restrictive port or UTM inspection constraints.",
        impact="Allows arbitrary traffic between network zones, nullifying firewall segmentation and exposing internal hosts to full compromise.",
        remediation_template="Define specific address objects for 'srcaddr' and 'dstaddr', restrict 'service' to required protocols, and enable UTM security profiles.",
        severity_weight=4,
        exposure_weight=4,
        impact_weight=4,
        exploitability_weight=4,
        compliance_mappings=[
            {"framework": "NIST CSF 2.0", "control_id": "PR.IR-01", "name": "Infrastructure Resilience", "status": "GAP"},
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "SC-7", "name": "Boundary Protection", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-FortiOS-2.1.1", "name": "Ensure overly permissive policies are avoided", "status": "GAP"},
            {"framework": "PCI DSS v4.0.1", "control_id": "Requirement 1.3.1", "name": "Inbound and outbound traffic is restricted to only that which is necessary", "status": "GAP"},
            {"framework": "MITRE ATT&CK", "control_id": "T1190", "name": "Exploit Public-Facing Application", "status": "GAP"}
        ]
    ),
    "FGT-LOGGING-DISABLED-001": SecurityRuleDefinition(
        rule_id="FGT-LOGGING-DISABLED-001",
        title="Firewall Policy Traffic Logging Disabled",
        vendor="Fortinet",
        category="Audit & Accountability",
        severity="MEDIUM",
        description="Security policy specifies 'set logtraffic disable'. Traffic matching this policy will not generate session or security event records.",
        impact="Security operations cannot detect malicious activity, perform forensic root-cause analysis, or satisfy regulatory audit trail requirements.",
        remediation_template="Configure 'set logtraffic all' on the firewall policy to log both session initiation and termination.",
        severity_weight=3,
        exposure_weight=2,
        impact_weight=3,
        exploitability_weight=2,
        compliance_mappings=[
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "AU-2", "name": "Event Logging", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-FortiOS-3.1.1", "name": "Ensure traffic logging is enabled on all policies", "status": "GAP"},
            {"framework": "PCI DSS v4.0.1", "control_id": "Requirement 10.2.1", "name": "Audit logs record all user access to cardholder data", "status": "GAP"}
        ]
    ),
    "FGT-BROAD-INBOUND-001": SecurityRuleDefinition(
        rule_id="FGT-BROAD-INBOUND-001",
        title="Broad Inbound Access Permitted From External WAN",
        vendor="Fortinet",
        category="Perimeter Security",
        severity="HIGH",
        description="Firewall policy permits inbound traffic from WAN interface to internal zones with source address 'all'.",
        impact="Exposes internal server infrastructure directly to Internet scanning and exploitation.",
        remediation_template="Restrict inbound policies to designated external IP addresses or deploy Virtual IPs with strict port forwarding.",
        severity_weight=4,
        exposure_weight=4,
        impact_weight=3,
        exploitability_weight=4,
        compliance_mappings=[
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "SC-7(4)", "name": "Boundary Protection | External Telecommunications Services", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-FortiOS-2.1.3", "name": "Ensure inbound traffic from external interfaces is controlled", "status": "GAP"}
        ]
    ),

    # ------------------- JUNIPER RULES -------------------
    "JUNOS-TELNET-001": SecurityRuleDefinition(
        rule_id="JUNOS-TELNET-001",
        title="Insecure Telnet System Service Enabled",
        vendor="Juniper",
        category="Management Access",
        severity="HIGH",
        description="Junos system services enable Telnet ('set system services telnet'). Cleartext protocol allows eavesdropping on administrator credentials.",
        impact="Cleartext interception of administrative passwords and unauthorized access to Junos CLI.",
        remediation_template="Run 'delete system services telnet' and verify 'set system services ssh' is enabled.",
        severity_weight=4,
        exposure_weight=4,
        impact_weight=4,
        exploitability_weight=4,
        compliance_mappings=[
            {"framework": "NIST CSF 2.0", "control_id": "PR.AA-01", "name": "Access Management", "status": "GAP"},
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "AC-17(2)", "name": "Remote Access | Encrypted Communications", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-Junos-2.1.1", "name": "Ensure Telnet service is disabled", "status": "GAP"},
            {"framework": "PCI DSS v4.0.1", "control_id": "Requirement 2.2.7", "name": "Non-console administrative access must be encrypted", "status": "GAP"},
            {"framework": "MITRE ATT&CK", "control_id": "T1040", "name": "Network Sniffing", "status": "GAP"}
        ]
    ),
    "JUNOS-HTTP-001": SecurityRuleDefinition(
        rule_id="JUNOS-HTTP-001",
        title="Insecure HTTP Web Management Enabled",
        vendor="Juniper",
        category="Management Access",
        severity="HIGH",
        description="Junos configuration activates unencrypted HTTP web management ('set system services web-management http').",
        impact="Web GUI credentials and session tokens transmitted in plaintext without TLS cryptographic wrapping.",
        remediation_template="Delete 'web-management http' and configure 'set system services web-management https'.",
        severity_weight=4,
        exposure_weight=4,
        impact_weight=4,
        exploitability_weight=4,
        compliance_mappings=[
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "SC-8", "name": "Transmission Confidentiality and Integrity", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-Junos-2.1.2", "name": "Ensure HTTP web management is disabled", "status": "GAP"},
            {"framework": "PCI DSS v4.0.1", "control_id": "Requirement 2.2.3", "name": "Encrypt all administrative access", "status": "GAP"}
        ]
    ),
    "JUNOS-POL-ANY-ANY-001": SecurityRuleDefinition(
        rule_id="JUNOS-POL-ANY-ANY-001",
        title="Overly Permissive Any-to-Any Security Policy",
        vendor="Juniper",
        category="Access Control",
        severity="CRITICAL",
        description="Security policy matches source-address 'any', destination-address 'any', application 'any', and action 'permit'.",
        impact="Removes stateful inspection boundaries between security zones, permitting uninhibited lateral movement.",
        remediation_template="Specify restricted source/destination addresses and designated application definitions in policy match terms.",
        severity_weight=4,
        exposure_weight=4,
        impact_weight=4,
        exploitability_weight=4,
        compliance_mappings=[
            {"framework": "NIST CSF 2.0", "control_id": "PR.IR-01", "name": "Network Segmentation", "status": "GAP"},
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "SC-7", "name": "Boundary Protection", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-Junos-1.1.1", "name": "Ensure zone policies are not overly permissive", "status": "GAP"},
            {"framework": "PCI DSS v4.0.1", "control_id": "Requirement 1.3.1", "name": "Inbound and outbound traffic restricted", "status": "GAP"}
        ]
    ),
    "JUNOS-POL-LOG-MISSING-001": SecurityRuleDefinition(
        rule_id="JUNOS-POL-LOG-MISSING-001",
        title="Missing Session Logging on Security Policy",
        vendor="Juniper",
        category="Audit & Accountability",
        severity="MEDIUM",
        description="Junos security policy permits traffic without a 'then log' clause.",
        impact="Sessions traverse the firewall without audit event generation, hindering incident response and intrusion detection.",
        remediation_template="Append 'then log session-init' or 'then log session-close' to the policy configuration.",
        severity_weight=3,
        exposure_weight=2,
        impact_weight=3,
        exploitability_weight=2,
        compliance_mappings=[
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "AU-2", "name": "Event Logging", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-Junos-3.1.1", "name": "Ensure policy logging is enabled", "status": "GAP"}
        ]
    ),
    "JUNOS-ROOT-AUTH-WEAK-001": SecurityRuleDefinition(
        rule_id="JUNOS-ROOT-AUTH-WEAK-001",
        title="Plain-Text Root Authentication Configured",
        vendor="Juniper",
        category="Authentication & Credentials",
        severity="HIGH",
        description="Configuration contains 'set system root-authentication plain-text-password'. Root password was supplied or stored as cleartext.",
        impact="Direct exposure of device master root administrative credentials.",
        remediation_template="Configure root-authentication using encrypted salted hash ('encrypted-password') or SSH public keys.",
        severity_weight=4,
        exposure_weight=3,
        impact_weight=4,
        exploitability_weight=4,
        compliance_mappings=[
            {"framework": "NIST SP 800-53 Rev. 5", "control_id": "IA-5(1)", "name": "Authenticator Management", "status": "GAP"},
            {"framework": "CIS Benchmarks", "control_id": "CIS-Junos-1.2.1", "name": "Ensure encrypted root authentication", "status": "GAP"}
        ]
    ),
}
