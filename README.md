# NEXORA — AI-Driven Multi-Vendor Network Security Compliance Auditor
### Smart India Hackathon 2026 | Internal College Round Prototype
**Problem Statement ID:** `SIH26155`  
**Team Name:** `WeirdBits`  
**Theme:** `Blockchain & Cybersecurity`  
**Category:** `Software`

---

## Executive Summary
NEXORA is a multi-vendor network security compliance auditing platform that bridges heterogeneous device configurations across **Cisco**, **Fortinet**, and **Juniper**. By ingesting raw configurations, normalizing them into a unified security model, executing deterministic security analysis and mathematical risk prioritization, mapping violations to international compliance frameworks (NIST CSF 2.0, NIST SP 800-53, CIS Benchmarks, ISO/IEC 27001, PCI DSS, MITRE ATT&CK), generating assistive AI explanations, enforcing human-in-the-loop review, safely simulating remediation in an isolated sandbox, re-verifying compliance, and immutably recording every event into a cryptographic SHA-256 blockchain, NEXORA provides end-to-end visibility and continuous hardening.

---

## 1. Authoritative 10-Stage Workflow (SIH PPT Slide 2)

```
Configuration Ingestion (Cisco, Fortinet, Juniper)
      ↓
Deterministic Vendor Detection & AST Parsing
      ↓
Unified Configuration Normalization Layer
      ↓
Deterministic Rule-Based Security Engine
      ↓
[1] Issue Identified (Exact line-level evidence)
      ↓
[2] Impact Evaluated (Blast radius & zone exposure)
      ↓
[3] Risk Prioritized (Deterministic 0-100 mathematical score)
      ↓
[4] Compliance Mapped (NIST, CIS, ISO 27001, PCI DSS, MITRE)
      ↓
[5] Explanation Provided (Assistive AI context / offline fallback)
      ↓
[6] Remediation Recommended (Vendor-specific syntactical patch)
      ↓
[7] Approval Required (Human-in-the-Loop review: Approve/Reject)
      ↓
[8] Remediation Implemented (Sandboxed configuration copy patched)
      ↓
[9] Verification Performed (Deterministic re-audit & delta check)
      ↓
[10] Compliance Achieved (Risk reduced, posture updated)
      ↓
Tamper-Evident SHA-256 Cryptographic Blockchain Audit Trail
```

---

## 2. Non-Negotiable Invariants

1. **Deterministic Security Engine is Authoritative:**
   - PASS/FAIL verdicts are computed strictly by deterministic rule logic.
   - Generative AI is assistive and explanatory; it can **never** change or override a security verdict.
2. **Deterministic Mathematical Risk Formula:**
   $$\text{Risk Score} = \text{round}\left(\frac{\text{Severity} \times 0.35 + \text{Exposure} \times 0.25 + \text{Impact} \times 0.20 + \text{Exploitability} \times 0.20}{4.0} \times 100\right)$$
   AI does not assign or estimate the final score.
3. **Safety Sandboxing:**
   - NEXORA never modifies live production networks or the original uploaded configuration.
   - All patches are simulated on sandboxed configuration clones.
4. **Real Cryptographic Blockchain:**
   - Every event (Upload, Audit, Finding, Approval, Simulation, Verification) generates a SHA-256 block linked to the previous block hash.
   - Includes a live **Tamper Demonstration Engine** that proves detection of historical data tampering in real-time.
5. **Zero-Crash AI Fallback:**
   - The system functions 100% offline with a high-fidelity deterministic template explainer if a NVIDIA API key is absent.

---

## 3. Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Recharts.
- **Backend:** Python 3.12, FastAPI, Pydantic v2, Uvicorn, SQLAlchemy, aiosqlite.
- **Database:** SQLite (zero-config local persistence).
- **Reports:** ReportLab (Executive PDF Reports), CSV, JSON.
- **Testing:** PyTest (13 passing unit and integration tests).

---

## 4. Quickstart Guide (Running Locally)

### Prerequisites
- Python 3.12+ (or managed with `uv`)
- Node.js 20+

### Step 1: Start the FastAPI Backend
```powershell
# In project root:
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API is now running at `http://localhost:8000`.  
Swagger interactive documentation: `http://localhost:8000/docs`.

### Step 2: Start the React Frontend
```powershell
cd frontend
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 5. Live Hackathon Demonstration Flow

1. Open `http://localhost:5173`.
2. On the **Dashboard**, click any of the 1-Click Demo buttons:
   - **`[Cisco Insecure Demo]`**
   - **`[Fortinet Insecure Demo]`**
   - **`[Juniper Insecure Demo]`**
3. Observe the visual **10-Stage Pipeline Stepper** execute in real time.
4. Inspect finding details to see **exact line-level configuration evidence**, mathematical risk score, compliance mappings, and AI explanation.
5. Review the side-by-side patch diff, click **`[Approve Remediation]`**, then click **`[Simulate Remediation & Re-Verify]`**.
6. Observe **`Verification Result: PASSED`**, with risk reduced and compliance score improved.
7. Open the **Blockchain Ledger** tab and click **`[Simulate Tampering (Live Demo)]`** to demonstrate active cryptographic integrity detection to the judges.
8. Download the formal **Executive PDF Audit Report**.

---

## 6. Running Automated Tests

Run the full automated PyTest test suite:
```powershell
.\.venv\Scripts\pytest.exe backend/tests -v
```
All 13 test cases validate vendor detection, parsers, normalization parity, security rules, risk calculation, blockchain tampering detection, and multi-vendor remediation simulation.

---

## 7. Project Structure

```
SIH PROTOTYPE/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI Application Entrypoint
│   │   ├── core/                    # Config & SQLite Database Engine
│   │   ├── models/                  # SQLAlchemy Relational Models
│   │   ├── schemas/                 # Pydantic Schemas & Normalized Model
│   │   ├── services/
│   │   │   ├── vendor_detection/    # Deterministic Syntax Fingerprinting
│   │   │   ├── parsers/             # Cisco, Fortinet, and Juniper AST Parsers
│   │   │   ├── normalization/       # Central Normalizer Service
│   │   │   ├── security_engine/     # Rule Registry & Deterministic Evaluator
│   │   │   ├── risk_engine/         # Mathematical Risk Calculator
│   │   │   ├── compliance/          # Framework Mapping & Posture Engine
│   │   │   ├── ai/                  # AI Explainer + Zero-Key Fallback
│   │   │   ├── remediation/         # Patch Generator & Sandbox Simulator
│   │   │   ├── verification/        # Deterministic Re-Audit Verifier
│   │   │   ├── blockchain/          # SHA-256 Tamper-Evident Audit Ledger
│   │   │   └── reporting/           # ReportLab PDF, CSV, and JSON Exporters
│   │   └── api/routes/              # Clean Modular REST API Endpoints
│   └── tests/                       # Automated PyTest Test Suite
├── frontend/                        # React 18 + Vite + Tailwind Cybersecurity UI
├── sample_configs/                  # 9 Realistic Sample Configs (Cisco, Fortinet, Juniper)
├── docs/                            # Traceability Matrix, Architecture & Demo Docs
├── .env.example                     # Environment Configuration Template
├── .gitignore                       # Git Exclusion Rules
└── README.md                        # Project Documentation
```
