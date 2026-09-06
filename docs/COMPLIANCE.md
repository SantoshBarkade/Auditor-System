# NEXORA Compliance Engine & Framework Mappings

## 1. Supported Frameworks
The prototype implements curated mappings for six major cybersecurity frameworks:
1. **NIST Cybersecurity Framework (CSF) 2.0:** Focus on Identify, Protect, and Detect functions.
2. **NIST SP 800-53 Rev. 5:** Federal security and privacy controls (AC-17, SC-7, SC-13, IA-5, AU-2).
3. **CIS Benchmarks:** Secure configuration benchmarks for network devices.
4. **ISO/IEC 27001:2022:** Information security controls (A.8.20 Network Security, A.8.24 Cryptography, A.5.17 Authentication).
5. **PCI DSS v4.0.1:** Payment card data security requirements (Req 1.3, Req 2.2, Req 10.2).
6. **MITRE ATT&CK:** Network sniffing (T1040), public exploit (T1190), and valid accounts (T1078).

---

## 2. Dynamic Posture Calculation
Each framework maintains baseline controls. Open findings flag controls as `GAP`.
When a finding is remediated and verified through sandboxed re-audit, the control status flips to `SATISFIED`, and the framework compliance percentage rises dynamically.
