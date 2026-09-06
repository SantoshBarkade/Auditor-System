from abc import ABC, abstractmethod
from typing import Dict, Any, List
from backend.app.schemas.normalized import NormalizedConfiguration, NormalizedUnparsedStatement

# Security-sensitive keywords — lines containing any of these that weren't
# consumed by vendor-specific regex matchers are surfaced as UNRESOLVED.
_SENSITIVE_KEYWORDS = {
    "encrypt", "crypto", "cipher", "password", "secret", "auth",
    "permit", "deny", "access", "tunnel", "vpn", "ike", "ipsec",
    "aaa", "radius", "tacacs", "ssh", "telnet", "https", "http",
    "snmp", "ntp", "log", "syslog", "acl", "policy", "firewall",
}

# Comment prefixes per vendor — lines starting with these are skipped
_COMMENT_PREFIXES = ("!", "#", "//", "--")


class BaseVendorParser(ABC):
    """
    Abstract Vendor Parser Interface.
    Each vendor (Cisco, Fortinet, Juniper) implements parsing and normalization
    producing the unified NormalizedConfiguration model with line-level evidence references.
    """

    @abstractmethod
    def parse(self, raw_content: str) -> Dict[str, Any]:
        """Parse vendor raw configuration into vendor AST/intermediate representation."""
        pass

    @abstractmethod
    def normalize(self, parsed_data: Dict[str, Any], raw_content: str) -> NormalizedConfiguration:
        """Convert intermediate representation into unified NormalizedConfiguration."""
        pass

    @abstractmethod
    def generate_remediation_patch(self, rule_id: str, raw_content: str, evidence: str) -> Dict[str, Any]:
        """Generate vendor-specific patch (current lines vs proposed replacement)."""
        pass

    @staticmethod
    def _build_unparsed_statements(
        raw_content: str,
        consumed_line_numbers: set,
        section_hint: str = "global"
    ) -> List[NormalizedUnparsedStatement]:
        """
        Scan all raw configuration lines.  Any line that:
          1. Is not blank / comment-only
          2. Was NOT consumed (i.e. not in consumed_line_numbers)
          3. Contains at least one security-sensitive keyword
        is recorded as an NormalizedUnparsedStatement for UNRESOLVED evaluation.
        
        Args:
            raw_content: Full raw config text.
            consumed_line_numbers: Set of 1-indexed line numbers that were successfully
                                   categorised by the vendor-specific parser.
            section_hint: Fallback section label when section cannot be inferred.
        Returns:
            List of NormalizedUnparsedStatement objects.
        """
        unparsed: List[NormalizedUnparsedStatement] = []
        for idx, line in enumerate(raw_content.splitlines(), start=1):
            stripped = line.strip()
            # Skip empty lines and comment-only lines
            if not stripped or stripped.lower().startswith(_COMMENT_PREFIXES):
                continue
            # Skip structural/keyword-only tokens common to hierarchical configs
            if stripped.lower() in {"end", "next", "{", "}", ";", "exit"}:
                continue
            # Skip lines already consumed by the parser
            if idx in consumed_line_numbers:
                continue
            # Only surface if it contains a security-sensitive keyword
            lower = stripped.lower()
            if any(kw in lower for kw in _SENSITIVE_KEYWORDS):
                unparsed.append(NormalizedUnparsedStatement(
                    raw_line=stripped,
                    line_number=idx,
                    section=section_hint,
                    reason="Directive matched security-sensitive keyword but was not classified by vendor parser"
                ))
        return unparsed
