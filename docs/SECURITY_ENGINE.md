# NEXORA Deterministic Security Rules Engine

## 1. Design Philosophy
The security rules engine in NEXORA is strictly deterministic. Network compliance cannot depend on non-deterministic LLM probability. Authoritative verdicts (`PASS`, `FAIL`, `UNRESOLVED`) and exact line evidence are evaluated via rule logic running directly against parsed ASTs and normalized security objects.

---

## 2. Implemented Rules Catalog

### Cisco IOS / IOS-XE
- **`CISCO-TELNET-001`**: Insecure Telnet Administrative Management Access (`transport input telnet`). Severity: `HIGH`.
- **`CISCO-SSH-VER-001`**: Insecure SSH Version 1 Configured (`ip ssh version 1`). Severity: `HIGH`.
- **`CISCO-ACL-PERMISSIVE-001`**: Overly Permissive Any-to-Any ACL (`permit ip any any`). Severity: `CRITICAL`.
- **`CISCO-PWD-PLAINTEXT-001`**: Reversible Plaintext Enable Password (`enable password ...`). Severity: `HIGH`.
- **`CISCO-AAA-MISSING-001`**: AAA Subsystem Disabled / Missing (`no aaa new-model`). Severity: `MEDIUM`.
- **`CISCO-VTY-UNRESTRICTED-001`**: Unrestricted Management Access on VTY Lines (missing `access-class`). Severity: `MEDIUM`.

### Fortinet FortiOS
- **`FGT-MGMT-HTTP-001`**: Unencrypted HTTP Management Interface Enabled (`set allowaccess http`). Severity: `HIGH`.
- **`FGT-MGMT-TELNET-001`**: Insecure Telnet Management Interface Enabled (`set allowaccess telnet`). Severity: `HIGH`.
- **`FGT-POL-ANY-ANY-001`**: Overly Permissive Any-to-Any Firewall Policy (`set srcaddr "all"`, `set dstaddr "all"`). Severity: `CRITICAL`.
- **`FGT-LOGGING-DISABLED-001`**: Firewall Policy Traffic Logging Disabled (`set logtraffic disable`). Severity: `MEDIUM`.
- **`FGT-BROAD-INBOUND-001`**: Broad Inbound Access Permitted From External WAN. Severity: `HIGH`.

### Juniper Junos
- **`JUNOS-TELNET-001`**: Insecure Telnet System Service Enabled (`set system services telnet` or `services { telnet; }`). Severity: `HIGH`.
- **`JUNOS-HTTP-001`**: Insecure HTTP Web Management Enabled (`web-management http`). Severity: `HIGH`.
- **`JUNOS-POL-ANY-ANY-001`**: Overly Permissive Any-to-Any Security Policy (`source-address any`, `destination-address any`, `then permit`). Severity: `CRITICAL`.
- **`JUNOS-POL-LOG-MISSING-001`**: Missing Session Logging on Security Policy (missing `then log`). Severity: `MEDIUM`.
- **`JUNOS-ROOT-AUTH-WEAK-001`**: Plain-Text Root Authentication Configured (`root-authentication plain-text-password`). Severity: `HIGH`.

---

## 3. Evidence Mapping
Every finding created records:
- Exact file name
- 1-indexed line numbers
- Full offending configuration statement
- Concrete impact statement
- Vendor-specific remediation patch
