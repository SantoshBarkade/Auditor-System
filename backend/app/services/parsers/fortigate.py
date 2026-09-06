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

class FortiGateParser(BaseVendorParser):
    """
    Parser for Fortinet FortiOS Configurations.
    Accurately extracts policies, interface access controls, and system parameters
    with 1-indexed line numbers.
    """

    def parse(self, raw_content: str) -> Dict[str, Any]:
        lines = raw_content.splitlines()
        parsed = {
            "hostname": "FortiGate-Firewall",
            "interfaces": [],
            "policies": [],
            "global_settings": {},
            "admin_settings": {},
            "raw_lines": lines,
            "consumed_lines": set()  # Track lines successfully categorised by parser
        }

        current_block = None
        current_entry = None

        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue

            # Check config block headers
            if re.match(r"^config\s+system\s+global", stripped, re.IGNORECASE):
                current_block = "global"
                parsed["consumed_lines"].add(idx)
                continue
            elif re.match(r"^config\s+system\s+interface", stripped, re.IGNORECASE):
                current_block = "interface"
                parsed["consumed_lines"].add(idx)
                continue
            elif re.match(r"^config\s+firewall\s+policy", stripped, re.IGNORECASE):
                current_block = "policy"
                parsed["consumed_lines"].add(idx)
                continue
            elif re.match(r"^config\s+system\s+admin", stripped, re.IGNORECASE):
                current_block = "admin"
                parsed["consumed_lines"].add(idx)
                continue
            elif stripped.lower() == "end":
                current_block = None
                current_entry = None
                parsed["consumed_lines"].add(idx)
                continue
            elif stripped.lower() == "next":
                if current_entry and current_block == "policy":
                    parsed["policies"].append(current_entry)
                elif current_entry and current_block == "interface":
                    parsed["interfaces"].append(current_entry)
                current_entry = None
                parsed["consumed_lines"].add(idx)
                continue

            # Inside config system global
            if current_block == "global":
                host_match = re.match(r"^set\s+hostname\s+[\"\']?([\w\.\-]+)[\"\']?", stripped, re.IGNORECASE)
                if host_match:
                    parsed["hostname"] = host_match.group(1)
                    parsed["consumed_lines"].add(idx)
                
                # Check admin lockout or strong password settings
                if "admin-lockout-threshold" in stripped.lower():
                    parsed["global_settings"]["admin_lockout"] = {"line": idx, "statement": line}
                    parsed["consumed_lines"].add(idx)

            # Inside config system interface
            elif current_block == "interface":
                edit_match = re.match(r"^edit\s+[\"\']?([\w\.\-]+)[\"\']?", stripped, re.IGNORECASE)
                if edit_match:
                    current_entry = {
                        "name": edit_match.group(1),
                        "start_line": idx,
                        "allowaccess": [],
                        "allowaccess_line": None,
                        "allowaccess_stmt": None
                    }
                    parsed["consumed_lines"].add(idx)
                    continue

                if current_entry:
                    acc_match = re.match(r"^set\s+allowaccess\s+(.*)", stripped, re.IGNORECASE)
                    if acc_match:
                        raw_acc = acc_match.group(1).replace('"', '').replace("'", "")
                        current_entry["allowaccess"] = [x.strip().lower() for x in raw_acc.split() if x.strip()]
                        current_entry["allowaccess_line"] = idx
                        current_entry["allowaccess_stmt"] = line
                        parsed["consumed_lines"].add(idx)

            # Inside config firewall policy
            elif current_block == "policy":
                edit_match = re.match(r"^edit\s+(\d+)", stripped, re.IGNORECASE)
                if edit_match:
                    current_entry = {
                        "id": edit_match.group(1),
                        "start_line": idx,
                        "srcintf": "any",
                        "dstintf": "any",
                        "srcaddr": ["all"],
                        "dstaddr": ["all"],
                        "service": ["ALL"],
                        "action": "accept",
                        "logtraffic": "disable",
                        "log_line": None,
                        "srcaddr_line": None,
                        "dstaddr_line": None,
                        "action_line": None,
                        "raw_statements": [(idx, line)]
                    }
                    parsed["consumed_lines"].add(idx)
                    continue

                if current_entry:
                    current_entry["raw_statements"].append((idx, line))
                    parsed["consumed_lines"].add(idx)

                    src_match = re.match(r"^set\s+srcaddr\s+(.*)", stripped, re.IGNORECASE)
                    if src_match:
                        raw_val = src_match.group(1).replace('"', '').replace("'", "")
                        current_entry["srcaddr"] = [x.strip() for x in raw_val.split() if x.strip()]
                        current_entry["srcaddr_line"] = idx

                    dst_match = re.match(r"^set\s+dstaddr\s+(.*)", stripped, re.IGNORECASE)
                    if dst_match:
                        raw_val = dst_match.group(1).replace('"', '').replace("'", "")
                        current_entry["dstaddr"] = [x.strip() for x in raw_val.split() if x.strip()]
                        current_entry["dstaddr_line"] = idx

                    act_match = re.match(r"^set\s+action\s+(.*)", stripped, re.IGNORECASE)
                    if act_match:
                        current_entry["action"] = act_match.group(1).strip().lower()
                        current_entry["action_line"] = idx

                    svc_match = re.match(r"^set\s+service\s+(.*)", stripped, re.IGNORECASE)
                    if svc_match:
                        raw_val = svc_match.group(1).replace('"', '').replace("'", "")
                        current_entry["service"] = [x.strip() for x in raw_val.split() if x.strip()]

                    log_match = re.match(r"^set\s+logtraffic\s+(.*)", stripped, re.IGNORECASE)
                    if log_match:
                        current_entry["logtraffic"] = log_match.group(1).strip().lower()
                        current_entry["log_line"] = idx

        return parsed

    def normalize(self, parsed_data: Dict[str, Any], raw_content: str) -> NormalizedConfiguration:
        device = NormalizedDevice(
            hostname=parsed_data.get("hostname", "FortiGate-Firewall"),
            vendor="Fortinet",
            platform="FortiOS",
            os_version="7.4"
        )

        management_access = []
        # Interfaces with allowaccess
        for intf in parsed_data.get("interfaces", []):
            allow = intf.get("allowaccess", [])
            line_no = intf.get("allowaccess_line") or intf.get("start_line")
            stmt = intf.get("allowaccess_stmt") or f"edit {intf.get('name')}"

            # Check HTTP
            if "http" in allow:
                management_access.append(NormalizedManagementAccess(
                    protocol="HTTP",
                    port=80,
                    enabled=True,
                    security="INSECURE",
                    interface=intf.get("name"),
                    source_restriction="unrestricted",
                    line_number=line_no,
                    raw_statement=stmt.strip()
                ))

            # Check Telnet
            if "telnet" in allow:
                management_access.append(NormalizedManagementAccess(
                    protocol="TELNET",
                    port=23,
                    enabled=True,
                    security="INSECURE",
                    interface=intf.get("name"),
                    source_restriction="unrestricted",
                    line_number=line_no,
                    raw_statement=stmt.strip()
                ))

            # Check SSH
            if "ssh" in allow:
                management_access.append(NormalizedManagementAccess(
                    protocol="SSH",
                    port=22,
                    enabled=True,
                    security="SECURE",
                    interface=intf.get("name"),
                    source_restriction="unrestricted",
                    line_number=line_no,
                    raw_statement=stmt.strip()
                ))

            # Check HTTPS
            if "https" in allow:
                management_access.append(NormalizedManagementAccess(
                    protocol="HTTPS",
                    port=443,
                    enabled=True,
                    security="SECURE",
                    interface=intf.get("name"),
                    source_restriction="unrestricted",
                    line_number=line_no,
                    raw_statement=stmt.strip()
                ))

        # Firewall Policies
        firewall_rules = []
        security_controls = []

        for pol in parsed_data.get("policies", []):
            srcs = pol.get("srcaddr", [])
            dsts = pol.get("dstaddr", [])
            action = pol.get("action", "accept").upper()
            is_any_any = ("all" in [s.lower() for s in srcs]) and ("all" in [d.lower() for d in dsts]) and (action == "ACCEPT")
            log_traffic = pol.get("logtraffic", "disable").lower()
            has_logging = log_traffic in ["all", "utm"]

            line_no = pol.get("srcaddr_line") or pol.get("start_line")
            raw_stmt = next((stmt[1] for stmt in pol.get("raw_statements", []) if "set srcaddr" in stmt[1].lower()), f"edit {pol.get('id')}")

            firewall_rules.append(NormalizedFirewallRule(
                rule_id=f"FGT-POLICY-{pol.get('id')}",
                name=f"Firewall Policy {pol.get('id')}",
                source_addrs=srcs,
                dest_addrs=dsts,
                services=pol.get("service", []),
                action="PERMIT" if action == "ACCEPT" else "DENY",
                is_any_any=is_any_any,
                logging_enabled=has_logging,
                line_number=line_no,
                raw_statement=raw_stmt.strip()
            ))

            # If logging is disabled on an accept policy, record as control deficiency
            if action == "ACCEPT" and not has_logging:
                security_controls.append(NormalizedSecurityControl(
                    control_type="LOGGING_DISABLED",
                    status="DISABLED",
                    details=f"Policy {pol.get('id')} has logging disabled (set logtraffic disable)",
                    line_number=pol.get("log_line") or pol.get("start_line"),
                    raw_statement=f"edit {pol.get('id')} / set logtraffic disable"
                ))

        total_objects = len(management_access) + len(firewall_rules) + len(security_controls)

        # P0.2: Collect unparsed security-sensitive directives
        unparsed = self._build_unparsed_statements(
            raw_content=raw_content,
            consumed_line_numbers=parsed_data.get("consumed_lines", set()),
            section_hint="fortigate-fortios"
        )

        return NormalizedConfiguration(
            device=device,
            management_access=management_access,
            firewall_rules=firewall_rules,
            security_controls=security_controls,
            routes=[],
            unparsed_statements=unparsed,
            total_objects=total_objects,
            vendor_fingerprint="Fortinet FortiOS Configuration Structure"
        )

    def generate_remediation_patch(self, rule_id: str, raw_content: str, evidence: str) -> Dict[str, Any]:
        """
        Produce a deterministic configuration patch for FortiGate finding.
        """
        lines = raw_content.splitlines()

        if "HTTP" in rule_id or "allowaccess" in evidence.lower() and "http" in evidence.lower():
            target_line_num = None
            for idx, line in enumerate(lines, start=1):
                if "set allowaccess" in line.lower() and "http" in line.lower():
                    target_line_num = idx
                    break

            return {
                "rule_id": rule_id,
                "target_line_num": target_line_num or 1,
                "current_statement": evidence,
                "recommended_statement": "        set allowaccess https ssh",
                "explanation": "Disable insecure HTTP management access and enforce TLS-encrypted HTTPS and SSH."
            }

        elif "TELNET" in rule_id or "allowaccess" in evidence.lower() and "telnet" in evidence.lower():
            target_line_num = None
            for idx, line in enumerate(lines, start=1):
                if "set allowaccess" in line.lower() and "telnet" in line.lower():
                    target_line_num = idx
                    break

            return {
                "rule_id": rule_id,
                "target_line_num": target_line_num or 1,
                "current_statement": evidence,
                "recommended_statement": "        set allowaccess ssh https",
                "explanation": "Disable cleartext Telnet management protocol and allow only encrypted SSH and HTTPS."
            }

        elif "POLICY" in rule_id or "all" in evidence.lower():
            return {
                "rule_id": rule_id,
                "target_line_num": 1,
                "current_statement": evidence,
                "recommended_statement": "        set srcaddr \"CORP_MGMT_NET\"\n        set dstaddr \"DMZ_SERVERS\"\n        set service \"HTTPS\" \"SSH\"\n        set logtraffic all",
                "explanation": "Replace all-to-all policy with specific corporate management subnet address group and enable full UTM logging."
            }

        elif "LOGGING" in rule_id or "logtraffic" in evidence.lower():
            return {
                "rule_id": rule_id,
                "target_line_num": 1,
                "current_statement": evidence,
                "recommended_statement": "        set logtraffic all",
                "explanation": "Enable session logging on security policy to satisfy compliance audit trail mandates."
            }

        return {
            "rule_id": rule_id,
            "target_line_num": 1,
            "current_statement": evidence,
            "recommended_statement": "        # FortiOS Hardening Applied",
            "explanation": "Apply FortiOS security hardening controls."
        }
