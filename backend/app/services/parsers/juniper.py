import re
from typing import Dict, Any, List
from backend.app.services.parsers.base import BaseVendorParser
from backend.app.schemas.normalized import (
    NormalizedConfiguration,
    NormalizedDevice,
    NormalizedManagementAccess,
    NormalizedFirewallRule,
    NormalizedSecurityControl,
    NormalizedUnparsedStatement
)

class JuniperParser(BaseVendorParser):
    """
    Parser for Juniper Junos Configurations.
    Supports both Set-style ('set system services telnet') and Hierarchical block syntax ('system { services { telnet; } }').
    Tracks 1-indexed line numbers for all parsed elements.
    """

    def parse(self, raw_content: str) -> Dict[str, Any]:
        lines = raw_content.splitlines()
        parsed = {
            "hostname": "Juniper-SRX",
            "services": [],
            "policies": [],
            "security_controls": [],
            "raw_lines": lines,
            "consumed_lines": set()  # Track lines successfully categorised by parser
        }

        # Check if configuration is primarily "set" style or hierarchical
        is_set_style = any(line.strip().startswith("set ") for line in lines)

        if is_set_style:
            self._parse_set_style(lines, parsed)
        else:
            self._parse_hierarchical_style(lines, parsed)

        return parsed

    def _parse_set_style(self, lines: List[str], parsed: Dict[str, Any]):
        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue

            # Hostname
            host_match = re.match(r"^set\s+system\s+host-name\s+([\w\.\-]+)", stripped, re.IGNORECASE)
            if host_match:
                parsed["hostname"] = host_match.group(1)

            # System Services (Telnet, HTTP, SSH)
            if re.search(r"^set\s+system\s+services\s+telnet", stripped, re.IGNORECASE):
                parsed["services"].append({
                    "protocol": "TELNET",
                    "port": 23,
                    "security": "INSECURE",
                    "line_number": idx,
                    "raw_statement": line
                })
                parsed["consumed_lines"].add(idx)

            if re.search(r"^set\s+system\s+services\s+web-management\s+http\b", stripped, re.IGNORECASE):
                parsed["services"].append({
                    "protocol": "HTTP",
                    "port": 80,
                    "security": "INSECURE",
                    "line_number": idx,
                    "raw_statement": line
                })
                parsed["consumed_lines"].add(idx)

            if re.search(r"^set\s+system\s+services\s+ssh\b", stripped, re.IGNORECASE):
                parsed["services"].append({
                    "protocol": "SSH",
                    "port": 22,
                    "security": "SECURE",
                    "line_number": idx,
                    "raw_statement": line
                })
                parsed["consumed_lines"].add(idx)

            # Root authentication check
            if re.search(r"^set\s+system\s+root-authentication\s+plain-text-password", stripped, re.IGNORECASE):
                parsed["security_controls"].append({
                    "type": "ROOT_AUTH_WEAK",
                    "status": "WEAK",
                    "details": "Plain-text root authentication configured",
                    "line_number": idx,
                    "raw_statement": line
                })
                parsed["consumed_lines"].add(idx)

            # Security Policies
            # e.g., set security policies from-zone trust to-zone untrust policy allow-all match source-address any destination-address any application any
            # e.g., set security policies from-zone trust to-zone untrust policy allow-all then permit
            pol_match = re.search(r"set\s+security\s+policies\s+from-zone\s+(\S+)\s+to-zone\s+(\S+)\s+policy\s+(\S+)\s+(.*)", stripped, re.IGNORECASE)
            if pol_match:
                from_z = pol_match.group(1)
                to_z = pol_match.group(2)
                pol_name = pol_match.group(3)
                remainder = pol_match.group(4)

                existing = next((p for p in parsed["policies"] if p["name"] == pol_name), None)
                if not existing:
                    existing = {
                        "name": pol_name,
                        "from_zone": from_z,
                        "to_zone": to_z,
                        "source_addrs": [],
                        "dest_addrs": [],
                        "services": [],
                        "action": "DENY",
                        "has_log": False,
                        "line_number": idx,
                        "raw_statements": []
                    }
                    parsed["policies"].append(existing)

                existing["raw_statements"].append((idx, line))
                parsed["consumed_lines"].add(idx)

                if "source-address any" in remainder.lower():
                    existing["source_addrs"].append("any")
                elif "source-address" in remainder.lower():
                    existing["source_addrs"].append(remainder.split()[-1])

                if "destination-address any" in remainder.lower():
                    existing["dest_addrs"].append("any")
                elif "destination-address" in remainder.lower():
                    existing["dest_addrs"].append(remainder.split()[-1])

                if "then permit" in remainder.lower():
                    existing["action"] = "PERMIT"

                if "then log" in remainder.lower():
                    existing["has_log"] = True

    def _parse_hierarchical_style(self, lines: List[str], parsed: Dict[str, Any]):
        context_stack = []
        current_policy = None

        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith("/*") or stripped.startswith("#"):
                continue

            # Check open brace
            if "{" in stripped:
                token = stripped.split("{")[0].strip()
                context_stack.append(token)
                
                # Check if entering a policy
                if len(context_stack) >= 2 and "policy " in token:
                    pname = token.replace("policy", "").strip()
                    current_policy = {
                        "name": pname,
                        "from_zone": "trust",
                        "to_zone": "untrust",
                        "source_addrs": [],
                        "dest_addrs": [],
                        "services": [],
                        "action": "DENY",
                        "has_log": False,
                        "line_number": idx,
                        "raw_statements": [(idx, line)]
                    }
                    parsed["policies"].append(current_policy)

            # Check statements
            path_str = " > ".join(context_stack).lower()

            if "host-name" in stripped.lower():
                h_match = re.search(r"host-name\s+([\w\.\-]+);", stripped, re.IGNORECASE)
                if h_match:
                    parsed["hostname"] = h_match.group(1)

            if "services" in path_str and "telnet;" in stripped.lower():
                parsed["services"].append({
                    "protocol": "TELNET",
                    "port": 23,
                    "security": "INSECURE",
                    "line_number": idx,
                    "raw_statement": line
                })

            if "services" in path_str and "http;" in stripped.lower():
                parsed["services"].append({
                    "protocol": "HTTP",
                    "port": 80,
                    "security": "INSECURE",
                    "line_number": idx,
                    "raw_statement": line
                })

            if "services" in path_str and "ssh;" in stripped.lower():
                parsed["services"].append({
                    "protocol": "SSH",
                    "port": 22,
                    "security": "SECURE",
                    "line_number": idx,
                    "raw_statement": line
                })

            # Inside policy
            if current_policy:
                current_policy["raw_statements"].append((idx, line))
                if "source-address any;" in stripped.lower():
                    current_policy["source_addrs"].append("any")
                if "destination-address any;" in stripped.lower():
                    current_policy["dest_addrs"].append("any")
                if "permit;" in stripped.lower():
                    current_policy["action"] = "PERMIT"
                if "log" in stripped.lower():
                    current_policy["has_log"] = True

            # Check close brace
            if "}" in stripped:
                if context_stack:
                    closing_token = context_stack.pop()
                    if "policy " in closing_token:
                        current_policy = None

    def normalize(self, parsed_data: Dict[str, Any], raw_content: str) -> NormalizedConfiguration:
        device = NormalizedDevice(
            hostname=parsed_data.get("hostname", "Juniper-SRX"),
            vendor="Juniper",
            platform="Junos",
            os_version="22.4"
        )

        management_access = []
        for svc in parsed_data.get("services", []):
            management_access.append(NormalizedManagementAccess(
                protocol=svc["protocol"],
                port=svc["port"],
                enabled=True,
                security=svc["security"],
                interface="system services",
                source_restriction="unrestricted",
                line_number=svc["line_number"],
                raw_statement=svc["raw_statement"].strip()
            ))

        firewall_rules = []
        security_controls = []

        for pol in parsed_data.get("policies", []):
            srcs = pol.get("source_addrs", [])
            dsts = pol.get("dest_addrs", [])
            action = pol.get("action", "DENY")
            is_any_any = ("any" in [s.lower() for s in srcs]) and ("any" in [d.lower() for d in dsts]) and (action == "PERMIT")

            firewall_rules.append(NormalizedFirewallRule(
                rule_id=f"JUNOS-POL-{pol.get('name')}",
                name=f"Security Policy {pol.get('name')}",
                source_zones=[pol.get("from_zone", "trust")],
                dest_zones=[pol.get("to_zone", "untrust")],
                source_addrs=srcs if srcs else ["any"],
                dest_addrs=dsts if dsts else ["any"],
                services=["any"],
                action=action,
                is_any_any=is_any_any,
                logging_enabled=pol.get("has_log", False),
                line_number=pol.get("line_number", 1),
                raw_statement=pol["raw_statements"][0][1].strip() if pol.get("raw_statements") else f"policy {pol.get('name')}"
            ))

            if action == "PERMIT" and not pol.get("has_log", False):
                security_controls.append(NormalizedSecurityControl(
                    control_type="MISSING_POLICY_LOGGING",
                    status="DISABLED",
                    details=f"Junos security policy '{pol.get('name')}' allows traffic without session logging",
                    line_number=pol.get("line_number", 1),
                    raw_statement=f"policy {pol.get('name')} missing 'then log'"
                ))

        for ctrl in parsed_data.get("security_controls", []):
            security_controls.append(NormalizedSecurityControl(
                control_type=ctrl["type"],
                status=ctrl["status"],
                details=ctrl["details"],
                line_number=ctrl["line_number"],
                raw_statement=ctrl["raw_statement"].strip()
            ))

        total_objects = len(management_access) + len(firewall_rules) + len(security_controls)

        # P0.2: Collect unparsed security-sensitive directives
        unparsed = self._build_unparsed_statements(
            raw_content=raw_content,
            consumed_line_numbers=parsed_data.get("consumed_lines", set()),
            section_hint="juniper-junos"
        )

        return NormalizedConfiguration(
            device=device,
            management_access=management_access,
            firewall_rules=firewall_rules,
            security_controls=security_controls,
            routes=[],
            unparsed_statements=unparsed,
            total_objects=total_objects,
            vendor_fingerprint="Juniper Junos Syntax"
        )

    def generate_remediation_patch(self, rule_id: str, raw_content: str, evidence: str) -> Dict[str, Any]:
        """
        Produce a deterministic configuration patch for Juniper finding.
        """
        lines = raw_content.splitlines()

        if "TELNET" in rule_id or "telnet" in evidence.lower():
            target_line_num = None
            is_set = False
            for idx, line in enumerate(lines, start=1):
                if "telnet" in line.lower():
                    target_line_num = idx
                    is_set = line.strip().startswith("set ")
                    break

            if is_set:
                recommended = "delete system services telnet\nset system services ssh"
            else:
                recommended = "/* Remove telnet; from system services */\nssh;"

            return {
                "rule_id": rule_id,
                "target_line_num": target_line_num or 1,
                "current_statement": evidence,
                "recommended_statement": recommended,
                "explanation": "Decommission unencrypted Telnet service on Junos system services and activate SSH."
            }

        elif "HTTP" in rule_id or "http" in evidence.lower():
            return {
                "rule_id": rule_id,
                "target_line_num": 1,
                "current_statement": evidence,
                "recommended_statement": "delete system services web-management http\nset system services web-management https",
                "explanation": "Disable insecure HTTP web management and enforce TLS-secured HTTPS management."
            }

        elif "POLICY" in rule_id or "permissive" in rule_id.lower() or "any" in evidence.lower():
            return {
                "rule_id": rule_id,
                "target_line_num": 1,
                "current_statement": evidence,
                "recommended_statement": "set security policies from-zone trust to-zone untrust policy restricted-policy match source-address CORP_INTERNAL destination-address DMZ_APP application junos-https\nset security policies from-zone trust to-zone untrust policy restricted-policy then permit\nset security policies from-zone trust to-zone untrust policy restricted-policy then log session-init",
                "explanation": "Restrict source and destination addresses to designated address books and enforce session-init logging."
            }

        elif "LOG" in rule_id:
            return {
                "rule_id": rule_id,
                "target_line_num": 1,
                "current_statement": evidence,
                "recommended_statement": "set security policies from-zone trust to-zone untrust policy allow-web then log session-close",
                "explanation": "Enable session-close logging on policy for SIEM audit trail."
            }

        return {
            "rule_id": rule_id,
            "target_line_num": 1,
            "current_statement": evidence,
            "recommended_statement": "# Apply Junos hardening baseline",
            "explanation": "Enforce Junos security best practices."
        }
