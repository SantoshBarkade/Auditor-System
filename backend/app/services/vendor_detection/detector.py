import re
from typing import List, Tuple
from backend.app.schemas.schemas import VendorDetectionResponse

class VendorDetector:
    """
    Deterministic Vendor Detection Engine for Cisco, Fortinet, and Juniper network devices.
    Uses regex syntax fingerprinting, command patterns, and structural tokens.
    """

    CISCO_FINGERPRINTS = [
        (r"^\s*interface\s+(?:GigabitEthernet|FastEthernet|TenGigabitEthernet|Ethernet|Vlan|Loopback)", "Cisco Interface definition"),
        (r"^\s*(?:ip\s+)?access-list\s+(?:standard|extended|\d+)", "Cisco Access Control List"),
        (r"^\s*line\s+vty\s+\d+", "Cisco VTY line configuration"),
        (r"^\s*aaa\s+new-model", "Cisco AAA subsystem"),
        (r"^\s*ip\s+ssh\s+version", "Cisco SSH Version configuration"),
        (r"^\s*enable\s+(?:secret|password)", "Cisco Enable password/secret"),
        (r"^\s*service\s+password-encryption", "Cisco Password encryption service"),
        (r"^\s*transport\s+input\s+(?:ssh|telnet|all|none)", "Cisco Line transport protocol"),
        (r"^\s*router\s+(?:ospf|bgp|eigrp)", "Cisco Routing protocol"),
    ]

    FORTINET_FINGERPRINTS = [
        (r"^\s*config\s+system\s+global", "FortiOS System Global block"),
        (r"^\s*config\s+system\s+interface", "FortiOS System Interface block"),
        (r"^\s*config\s+firewall\s+policy", "FortiOS Firewall Policy block"),
        (r"^\s*config\s+system\s+admin", "FortiOS System Admin block"),
        (r"^\s*set\s+srcaddr\s+", "FortiOS Source Address definition"),
        (r"^\s*set\s+dstaddr\s+", "FortiOS Destination Address definition"),
        (r"^\s*set\s+allowaccess\s+", "FortiOS Interface Access definition"),
        (r"^\s*set\s+action\s+(?:accept|deny)", "FortiOS Policy Action"),
        (r"^\s*edit\s+\d+", "FortiOS Policy Edit Entry"),
    ]

    JUNIPER_FINGERPRINTS = [
        (r"^\s*set\s+system\s+(?:services|login|host-name|root-authentication)", "Junos Set System definition"),
        (r"^\s*set\s+interfaces\s+", "Junos Set Interfaces definition"),
        (r"^\s*set\s+security\s+policies\s+", "Junos Set Security Policies definition"),
        (r"^\s*set\s+firewall\s+family\s+", "Junos Set Firewall definition"),
        (r"^\s*system\s*\{[^}]*services", "Junos Hierarchical System Services block"),
        (r"^\s*security\s*\{[^}]*policies", "Junos Hierarchical Security Policies block"),
        (r"^\s*source-address\s+(?:any|[\w\-]+);", "Junos Hierarchical Policy Source"),
        (r"^\s*destination-address\s+(?:any|[\w\-]+);", "Junos Hierarchical Policy Destination"),
    ]

    @classmethod
    def detect(cls, raw_content: str, filename: str = "") -> VendorDetectionResponse:
        cisco_matches = []
        fortinet_matches = []
        juniper_matches = []

        lines = raw_content.splitlines()

        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith("!") or stripped.startswith("#"):
                continue

            # Check Cisco
            for pattern, desc in cls.CISCO_FINGERPRINTS:
                if re.search(pattern, stripped, re.IGNORECASE):
                    if desc not in cisco_matches:
                        cisco_matches.append(desc)

            # Check Fortinet
            for pattern, desc in cls.FORTINET_FINGERPRINTS:
                if re.search(pattern, stripped, re.IGNORECASE):
                    if desc not in fortinet_matches:
                        fortinet_matches.append(desc)

            # Check Juniper
            for pattern, desc in cls.JUNIPER_FINGERPRINTS:
                if re.search(pattern, stripped, re.IGNORECASE):
                    if desc not in juniper_matches:
                        juniper_matches.append(desc)

        # Also check multiline block for Junos
        if re.search(r"system\s*\{", raw_content) and re.search(r"services\s*\{", raw_content):
            if "Junos Hierarchical Block Structure" not in juniper_matches:
                juniper_matches.append("Junos Hierarchical Block Structure")

        # Score calculations
        scores = {
            "Cisco": len(cisco_matches),
            "Fortinet": len(fortinet_matches),
            "Juniper": len(juniper_matches)
        }

        # Fallback from filename extension / hints
        if filename.lower().endswith(".cfg") and scores["Cisco"] == 0 and scores["Fortinet"] == 0 and scores["Juniper"] == 0:
            scores["Cisco"] += 1
            cisco_matches.append("File extension .cfg hint")

        best_vendor, max_score = max(scores.items(), key=lambda item: item[1])

        if max_score == 0:
            return VendorDetectionResponse(
                vendor="Unknown",
                confidence=0.0,
                fingerprints=[],
                detected_syntax="Unrecognized configuration syntax"
            )

        total_matches = sum(scores.values())
        confidence = round(max_score / total_matches, 2) if total_matches > 0 else 0.0

        fingerprints_map = {
            "Cisco": cisco_matches,
            "Fortinet": fortinet_matches,
            "Juniper": juniper_matches
        }

        syntax_map = {
            "Cisco": "Cisco IOS / IOS-XE Command Syntax",
            "Fortinet": "Fortinet FortiOS Configuration Structure",
            "Juniper": "Juniper Junos (Set / Hierarchical Syntax)"
        }

        return VendorDetectionResponse(
            vendor=best_vendor,
            confidence=confidence,
            fingerprints=fingerprints_map[best_vendor],
            detected_syntax=syntax_map[best_vendor]
        )
