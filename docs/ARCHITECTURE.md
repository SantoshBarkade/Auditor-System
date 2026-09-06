# NEXORA Architectural Specification
## Problem Statement: SIH26155 | Smart India Hackathon 2026
**Team:** WeirdBits | **Theme:** Blockchain & Cybersecurity

---

## 1. System Architecture Overview

NEXORA operates as an AI-driven, multi-vendor network security compliance auditor designed around strict separation of responsibilities:

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                        NEXORA FRONTEND                          │
  │     (React 18 + Vite + Tailwind CSS + Recharts + Lucide)        │
  └───────────────────────────────┬─────────────────────────────────┘
                                  │ REST API Calls (/api/v1)
                                  ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                         FASTAPI BACKEND                         │
  │    (Async Python 3.12, Uvicorn, Pydantic v2, SQLAlchemy)        │
  ├─────────────────────────────────────────────────────────────────┤
  │ 1. Vendor Detector (Deterministic Regex & Syntax Fingerprinting)│
  │ 2. Vendor Parsers (Cisco IOS-XE, FortiOS, Junos Set & Braces)  │
  │ 3. Unified Normalization Layer (Device, FirewallRule, MgmtAccess)│
  │ 4. Deterministic Security Engine (Authoritative PASS/FAIL Rules)│
  │ 5. Mathematical Risk Engine (Weighted Multi-Factor 0-100 Score) │
  │ 6. Compliance Mapping Engine (NIST CSF 2.0, 800-53, CIS, ISO)   │
  │ 7. Assistive AI Layer (Gemini Generative AI + Offline Fallback) │
  │ 8. Remediation Simulator (Sandboxed Configuration Patching)     │
  │ 9. Verification Engine (Deterministic Re-Audit & Delta Check)   │
  │ 10. Cryptographic Blockchain (SHA-256 Tamper-Evident Ledger)    │
  │ 11. Report Generator (ReportLab Executive PDF, CSV, JSON)       │
  └───────────────────────────────┬─────────────────────────────────┘
                                  │ Persistence
                                  ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                     STORAGE LAYER (SQLite)                      │
  │  Devices, Configurations, Audits, Findings, Blocks, Reports     │
  └─────────────────────────────────────────────────────────────────┘
```

---

## 2. Invariants & Separation of Responsibilities

| Subsystem | Authoritative Responsibility | What It NEVER Does |
|---|---|---|
| **Vendor Parsers** | Extract vendor-specific AST and 1-indexed line numbers. | Never determine security compliance directly. |
| **Normalizer** | Standardize device, policy, and management access objects. | Never modify original vendor syntax. |
| **Security Engine** | Authoritative PASS/FAIL determinations and exact line-level evidence extraction. | Never uses LLMs for pass/fail decisions. |
| **Risk Engine** | Computes 0-100 score: $(S \times 0.35 + E \times 0.25 + I \times 0.20 + X \times 0.20) / 4 \times 100$. | Never allows stochastic AI score assignment. |
| **AI Layer** | Contextual explanations, summaries, and impact explanations. | Never overrides deterministic PASS/FAIL or risk. |
| **Remediation Sandbox** | Clones configuration and applies approved patch. | Never modifies live or original configuration. |
| **Blockchain** | SHA-256 cryptographic chaining of every audit and remediation event. | Does not require crypto mining or tokens. |
