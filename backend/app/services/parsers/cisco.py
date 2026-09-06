import re
from typing import Dict, Any, List
from backend.app.services.parsers.base import BaseVendorParser
from backend.app.schemas.normalized import (
    NormalizedConfiguration,
    NormalizedDevice,
    NormalizedManagementAccess,
    NormalizedFirewallRule,
    NormalizedSecurityControl,
    NormalizedRoute,
    NormalizedUnparsedStatement
)

class CiscoParser(BaseVendorParser):
    """
    Parser for Cisco IOS / IOS-XE Configurations.
    Tracks exact 1-indexed line numbers for all configuration statements.
    """

    def parse(self, raw_content: str) -> Dict[str, Any]:
        lines = raw_content.splitlines()
        parsed = {
            "hostname": "Cisco-Device",
            "vty_blocks": [],
            "interfaces": [],
            "acls": [],
            "ssh_config": {},
            "security_controls": [],
            "routes": [],
            "raw_lines": lines,
            "consumed_lines": set()  # Track lines successfully categorised by parser
        }

        current_block = None
        current_block_type = None

        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith("!"):
                continue

            # Hostname
            host_match = re.match(r"^hostname\s+([\w\.\-]+)", stripped, re.IGNORECASE)
            if host_match:
                parsed["hostname"] = host_match.group(1)
                parsed["consumed_lines"].add(idx)

            # Block Starters: line vty
            vty_match = re.match(r"^line\s+vty\s+(\d+)\s*(\d*)", stripped, re.IGNORECASE)
            if vty_match:
                current_block = {
                    "start_line": idx,
                    "range": f"{vty_match.group(1)} {vty_match.group(2)}".strip(),
                    "transport_input": None,
                    "transport_line": None,
                    "access_class": None,
                    "access_line": None,
                    "raw_statements": [(idx, line)]
                }
                parsed["vty_blocks"].append(current_block)
                current_block_type = "vty"
                parsed["consumed_lines"].add(idx)
                continue

            # Inside VTY block
            if current_block_type == "vty" and line.startswith(" "):
                current_block["raw_statements"].append((idx, line))
                parsed["consumed_lines"].add(idx)
                trans_match = re.search(r"transport\s+input\s+(.*)", stripped, re.IGNORECASE)
                if trans_match:
                    current_block["transport_input"] = trans_match.group(1).strip()
                    current_block["transport_line"] = idx

                acc_match = re.search(r"access-class\s+([\w\-]+)", stripped, re.IGNORECASE)
                if acc_match:
                    current_block["access_class"] = acc_match.group(1).strip()
                    current_block["access_line"] = idx
                continue
            else:
                if not line.startswith(" "):
                    current_block_type = None

            # IP Access Lists (Standard & Extended numbered or named)
            # e.g., access-list 101 permit ip any any
            num_acl_match = re.match(r"^access-list\s+(\d+)\s+(permit|deny)\s+(.*)", stripped, re.IGNORECASE)
            if num_acl_match:
                acl_id = num_acl_match.group(1)
                action = num_acl_match.group(2).upper()
                rule_text = num_acl_match.group(3).strip()
                is_any_any = bool(re.search(r"\bany\s+any\b", rule_text, re.IGNORECASE))
                parsed["acls"].append({
                    "id": acl_id,
                    "action": action,
                    "rule_text": rule_text,
                    "is_any_any": is_any_any,
                    "logging": "log" in rule_text.lower(),
                    "line_number": idx,
                    "raw_statement": line
                })
                parsed["consumed_lines"].add(idx)
                continue

            # Named IP Access List entry
            named_entry_match = re.match(r"^(permit|deny)\s+(.*)", stripped, re.IGNORECASE)
            if named_entry_match and current_block_type == "acl_named":
                action = named_entry_match.group(1).upper()
                rule_text = named_entry_match.group(2).strip()
                is_any_any = bool(re.search(r"\bany\s+any\b", rule_text, re.IGNORECASE))
                parsed["acls"].append({
                    "id": current_block.get("name", "NAMED_ACL"),
                    "action": action,
                    "rule_text": rule_text,
                    "is_any_any": is_any_any,
                    "logging": "log" in rule_text.lower(),
                    "line_number": idx,
                    "raw_statement": line
                })
                parsed["consumed_lines"].add(idx)
                continue

            named_acl_header = re.match(r"^ip\s+access-list\s+(?:standard|extended)\s+([\w\-]+)", stripped, re.IGNORECASE)
            if named_acl_header:
                current_block_type = "acl_named"
                current_block = {"name": named_acl_header.group(1), "header_line": idx}
                parsed["consumed_lines"].add(idx)
                continue

            # SSH Version
            ssh_ver = re.match(r"^ip\s+ssh\s+version\s+(\d+)", stripped, re.IGNORECASE)
            if ssh_ver:
                parsed["ssh_config"]["version"] = int(ssh_ver.group(1))
                parsed["ssh_config"]["line_number"] = idx
                parsed["ssh_config"]["raw_statement"] = line
                parsed["consumed_lines"].add(idx)

            # Passwords (enable password vs enable secret)
            pwd_match = re.match(r"^enable\s+password\s+(.*)", stripped, re.IGNORECASE)
            if pwd_match:
                parsed["security_controls"].append({
                    "type": "ENABLE_PASSWORD_CLEARTEXT",
                    "status": "WEAK",
                    "details": "Plaintext enable password configured",
                    "line_number": idx,
                    "raw_statement": line
                })
                parsed["consumed_lines"].add(idx)

            sec_match = re.match(r"^enable\s+secret\s+(.*)", stripped, re.IGNORECASE)
            if sec_match:
                parsed["security_controls"].append({
                    "type": "ENABLE_SECRET",
                    "status": "STRONG",
                    "details": "Cryptographic enable secret configured",
                    "line_number": idx,
                    "raw_statement": line
                })
                parsed["consumed_lines"].add(idx)

            # AAA
            if re.match(r"^aaa\s+new-model", stripped, re.IGNORECASE):
                parsed["security_controls"].append({
                    "type": "AAA",
                    "status": "ENABLED",
                    "details": "AAA subsystem enabled",
                    "line_number": idx,
                    "raw_statement": line
                })
                parsed["consumed_lines"].add(idx)

            # Service password-encryption
            if re.match(r"^service\s+password-encryption", stripped, re.IGNORECASE):
                parsed["security_controls"].append({
                    "type": "PASSWORD_ENCRYPTION",
                    "status": "ENABLED",
                    "details": "Type 7 password encryption enabled",
                    "line_number": idx,
                    "raw_statement": line
                })
                parsed["consumed_lines"].add(idx)

            # Logging
            if re.match(r"^logging\s+(?:host|trap|\d+)", stripped, re.IGNORECASE):
                parsed["security_controls"].append({
                    "type": "LOGGING",
                    "status": "ENABLED",
                    "details": stripped,
                    "line_number": idx,
                    "raw_statement": line
                })
                parsed["consumed_lines"].add(idx)

        return parsed

    def normalize(self, parsed_data: Dict[str, Any], raw_content: str) -> NormalizedConfiguration:
        device = NormalizedDevice(
            hostname=parsed_data.get("hostname", "Cisco-Device"),
            vendor="Cisco",
            platform="IOS/IOS-XE",
            os_version="17.x"
        )

        management_access = []
        # Check VTY lines
        for vty in parsed_data.get("vty_blocks", []):
            trans = vty.get("transport_input")
            t_line = vty.get("transport_line") or vty.get("start_line")
            raw_stmt = next((stmt[1] for stmt in vty.get("raw_statements", []) if stmt[0] == t_line), f"line vty {vty.get('range')}")

            if trans:
                is_telnet = "telnet" in trans.lower() or "all" in trans.lower()
                management_access.append(NormalizedManagementAccess(
                    protocol="TELNET" if is_telnet else "SSH",
                    port=23 if is_telnet else 22,
                    enabled=True,
                    security="INSECURE" if is_telnet else "SECURE",
                    interface=f"vty {vty.get('range')}",
                    source_restriction=vty.get("access_class") or "unrestricted",
                    line_number=t_line,
                    raw_statement=raw_stmt.strip()
                ))
            else:
                # Cisco default without transport input often allows Telnet
                management_access.append(NormalizedManagementAccess(
                    protocol="TELNET",
                    port=23,
                    enabled=True,
                    security="INSECURE",
                    interface=f"vty {vty.get('range')}",
                    source_restriction=vty.get("access_class") or "unrestricted",
                    line_number=vty.get("start_line"),
                    raw_statement=f"line vty {vty.get('range')} (default allows telnet)"
                ))

        # Check SSH config
        ssh_info = parsed_data.get("ssh_config", {})
        if ssh_info:
            ver = ssh_info.get("version", 2)
            management_access.append(NormalizedManagementAccess(
                protocol="SSH",
                port=22,
                enabled=True,
                security="INSECURE" if ver == 1 else "SECURE",
                interface="global",
                source_restriction=None,
                line_number=ssh_info.get("line_number", 1),
                raw_statement=ssh_info.get("raw_statement", "ip ssh")
            ))

        # Firewall Rules (ACLs)
        firewall_rules = []
        for acl in parsed_data.get("acls", []):
            firewall_rules.append(NormalizedFirewallRule(
                rule_id=f"ACL-{acl['id']}",
                name=f"Access-List {acl['id']}",
                source_addrs=["any"] if "any" in acl["rule_text"] else ["specific"],
                dest_addrs=["any"] if acl["is_any_any"] else ["specific"],
                action="PERMIT" if acl["action"] == "PERMIT" else "DENY",
                is_any_any=acl["is_any_any"],
                logging_enabled=acl["logging"],
                line_number=acl["line_number"],
                raw_statement=acl["raw_statement"].strip()
            ))

        # Security Controls
        security_controls = []
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
            section_hint="cisco-ios"
        )

        return NormalizedConfiguration(
            device=device,
            management_access=management_access,
            firewall_rules=firewall_rules,
            security_controls=security_controls,
            routes=[],
            unparsed_statements=unparsed,
            total_objects=total_objects,
            vendor_fingerprint="Cisco IOS Command Syntax"
        )

    def generate_remediation_patch(self, rule_id: str, raw_content: str, evidence: str) -> Dict[str, Any]:
        """
        Produce a deterministic configuration patch for Cisco finding.
        """
        lines = raw_content.splitlines()

        if "TELNET" in rule_id or "transport input telnet" in evidence.lower():
            # Replace transport input telnet with transport input ssh
            original_lines = []
            patched_lines = []
            target_line_num = None

            for idx, line in enumerate(lines, start=1):
                if "transport input" in line.lower() and "telnet" in line.lower():
                    target_line_num = idx
                    original_lines.append((idx, line))
                    indent = re.match(r"^(\s*)", line).group(1)
                    patched_lines.append((idx, f"{indent}transport input ssh"))

            return {
                "rule_id": rule_id,
                "target_line_num": target_line_num,
                "current_statement": "\n".join(stmt[1] for stmt in original_lines) if original_lines else evidence,
                "recommended_statement": "\n".join(stmt[1] for stmt in patched_lines) if patched_lines else " transport input ssh",
                "explanation": "Restrict VTY administrative management access to encrypted SSH v2 only and disable plaintext Telnet."
            }

        elif "SSH" in rule_id and "version 1" in evidence.lower():
            target_line_num = None
            original_lines = []
            for idx, line in enumerate(lines, start=1):
                if "ip ssh version 1" in line.lower():
                    target_line_num = idx
                    original_lines.append((idx, line))

            return {
                "rule_id": rule_id,
                "target_line_num": target_line_num,
                "current_statement": "\n".join(stmt[1] for stmt in original_lines) if original_lines else evidence,
                "recommended_statement": "ip ssh version 2",
                "explanation": "Enforce modern cryptographic algorithms by configuring IP SSH Version 2."
            }

        elif "ACL" in rule_id or "permit ip any any" in evidence.lower():
            target_line_num = None
            original_lines = []
            for idx, line in enumerate(lines, start=1):
                if "permit ip any any" in line.lower():
                    target_line_num = idx
                    original_lines.append((idx, line))

            return {
                "rule_id": rule_id,
                "target_line_num": target_line_num,
                "current_statement": "\n".join(stmt[1] for stmt in original_lines) if original_lines else evidence,
                "recommended_statement": "! Restrict to authorized subnet\naccess-list 101 permit ip 10.0.0.0 0.0.255.255 192.168.1.0 0.0.0.255 log\naccess-list 101 deny ip any any log",
                "explanation": "Replace overly permissive any-to-any rule with specific source/destination subnets and explicit deny with logging."
            }

        elif "PASSWORD" in rule_id or "enable password" in evidence.lower():
            target_line_num = None
            original_lines = []
            for idx, line in enumerate(lines, start=1):
                if re.match(r"^\s*enable\s+password", line, re.IGNORECASE):
                    target_line_num = idx
                    original_lines.append((idx, line))

            return {
                "rule_id": rule_id,
                "target_line_num": target_line_num,
                "current_statement": "\n".join(stmt[1] for stmt in original_lines) if original_lines else evidence,
                "recommended_statement": "no enable password\nenable secret 9 $9$K50r8Vz... (strong salted hash)",
                "explanation": "Remove reversible plaintext enable password and use cryptographically salted enable secret."
            }

        elif "AAA" in rule_id:
            return {
                "rule_id": rule_id,
                "target_line_num": 1,
                "current_statement": "! AAA is missing",
                "recommended_statement": "aaa new-model\naaa authentication login default local",
                "explanation": "Enable Authentication, Authorization, and Accounting (AAA) subsystem to enforce centralized access control."
            }

        elif "LOGGING" in rule_id:
            return {
                "rule_id": rule_id,
                "target_line_num": 1,
                "current_statement": "! Centralized Syslog missing",
                "recommended_statement": "logging host 10.10.10.50\nlogging trap informational\nservice timestamps log datetime msec",
                "explanation": "Configure centralized remote syslog server with millisecond-precision timestamps."
            }

        return {
            "rule_id": rule_id,
            "target_line_num": 1,
            "current_statement": evidence,
            "recommended_statement": "! Hardened configuration recommendation",
            "explanation": "Apply vendor hardening guidelines."
        }
