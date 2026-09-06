from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class NormalizedDevice(BaseModel):
    hostname: str = "Unknown"
    vendor: str = "Unknown"
    platform: Optional[str] = None
    os_version: Optional[str] = None

class NormalizedManagementAccess(BaseModel):
    protocol: str  # SSH, TELNET, HTTP, HTTPS
    port: Optional[int] = None
    enabled: bool = True
    security: str = "SECURE"  # SECURE, INSECURE
    interface: Optional[str] = None
    source_restriction: Optional[str] = None  # e.g., "any", "10.0.0.0/24"
    line_number: int
    raw_statement: str

class NormalizedFirewallRule(BaseModel):
    rule_id: str
    name: Optional[str] = None
    source_zones: List[str] = Field(default_factory=list)
    dest_zones: List[str] = Field(default_factory=list)
    source_addrs: List[str] = Field(default_factory=list)
    dest_addrs: List[str] = Field(default_factory=list)
    services: List[str] = Field(default_factory=list)
    action: str = "PERMIT"  # PERMIT, DENY, REJECT
    is_any_any: bool = False
    logging_enabled: bool = False
    line_number: int
    raw_statement: str

class NormalizedSecurityControl(BaseModel):
    control_type: str  # AAA, PASSWORD_ENCRYPTION, SSH_VERSION, LOGGING, ROOT_AUTH, BANNER
    status: str  # ENABLED, DISABLED, WEAK, STRONG
    details: str
    line_number: Optional[int] = None
    raw_statement: Optional[str] = None

class NormalizedRoute(BaseModel):
    destination: str
    next_hop: Optional[str] = None
    interface: Optional[str] = None
    line_number: Optional[int] = None

class NormalizedUnparsedStatement(BaseModel):
    """Represents a configuration directive that could not be categorised by the parser."""
    raw_line: str
    line_number: int
    section: Optional[str] = None  # e.g. "vty", "interface", "firewall"
    reason: str = "Unrecognised directive"  # Short human-readable reason

class NormalizedConfiguration(BaseModel):
    device: NormalizedDevice
    management_access: List[NormalizedManagementAccess] = Field(default_factory=list)
    firewall_rules: List[NormalizedFirewallRule] = Field(default_factory=list)
    security_controls: List[NormalizedSecurityControl] = Field(default_factory=list)
    routes: List[NormalizedRoute] = Field(default_factory=list)
    unparsed_statements: List[NormalizedUnparsedStatement] = Field(default_factory=list)
    total_objects: int = 0
    vendor_fingerprint: str = ""
