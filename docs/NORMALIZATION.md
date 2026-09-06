# NEXORA Configuration Normalization Layer

## 1. Unified Multi-Vendor Abstraction
Heterogeneous network vendors format access controls and policies differently:
- **Cisco:** `transport input telnet` under `line vty`
- **Fortinet:** `set allowaccess telnet` under `config system interface`
- **Juniper:** `set system services telnet` or hierarchical `system { services { telnet; } }`

NEXORA normalizes all three into a vendor-neutral schema:

```json
{
  "protocol": "TELNET",
  "port": 23,
  "enabled": true,
  "security": "INSECURE",
  "interface": "vty / system",
  "line_number": 43,
  "raw_statement": "transport input telnet"
}
```

---

## 2. Core Normalized Schemas
Defined in `backend/app/schemas/normalized.py`:
- `NormalizedDevice`: Hostname, vendor, platform, OS version.
- `NormalizedManagementAccess`: Protocol (SSH, TELNET, HTTP, HTTPS), port, security (SECURE vs INSECURE), interface, line number.
- `NormalizedFirewallRule`: Source/destination zones, source/destination address lists, services, action (PERMIT vs DENY), `is_any_any` boolean flag, logging status, line number.
- `NormalizedSecurityControl`: Control type (AAA, PASSWORD_ENCRYPTION, SSH_VERSION, LOGGING, ROOT_AUTH), status (ENABLED, DISABLED, WEAK, STRONG), details, line number.
- `NormalizedRoute`: Destination, next-hop, interface.
