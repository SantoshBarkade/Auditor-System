# NEXORA Remediation & Verification Sandbox

## 1. Safety Sandbox Invariant
NEXORA **never modifies live network devices** or the original uploaded configuration.
All remediation is performed inside an in-memory / sandboxed configuration copy (`is_sandbox = True`).

---

## 2. Human-in-the-Loop Approval Workflow
```
Finding Identified
        │
        ▼
Vendor Patch Generated (Current vs Recommended)
        │
        ▼
Human Administrator Review ───[ REJECT ]───► Status: REJECTED (Logged to Blockchain)
        │
    [ APPROVE ]
        │
        ▼
Status: APPROVED (Logged to Blockchain)
        │
        ▼
Cloned Sandbox Configuration Created
        │
        ▼
Targeted Patch Applied
        │
        ▼
Deterministic Re-Audit (Re-Parse, Re-Normalize, Re-Score)
        │
        ▼
Verification Comparison (Before vs After Delta)
        │
        ▼
Status: VERIFIED & COMPLIANCE ACHIEVED (Logged to Blockchain)
```
