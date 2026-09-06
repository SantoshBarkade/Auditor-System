# NEXORA — Smart India Hackathon 2026 Requirements Traceability Matrix
## Problem Statement SIH26155: AI-Driven Multi-Vendor Network Security Compliance Auditor
**Team Name:** WeirdBits  
**Theme:** Blockchain & Cybersecurity  
**Category:** Software  
**Document Version:** 1.0 (Authoritative Product Specification Mapping)

---

## Executive Summary
This document provides a 1-to-1 traceability matrix mapping every requirement, architectural specification, security capability, and workflow step from the **SIH 2026 FINAL PPT** to the prototype implementation of **NEXORA**.

NEXORA bridges multi-vendor network security by ingesting heterogeneous device configurations (Cisco, Fortinet, Juniper), normalizing them into an abstracted object model, executing deterministic security analysis and risk calculation, mapping findings to major compliance frameworks (NIST CSF 2.0, NIST SP 800-53, CIS Benchmarks, ISO 27001, PCI DSS, MITRE ATT&CK), generating grounded AI explanations & remediation proposals, requiring human review/approval, simulating configuration fixes, verifying resolution deterministically, and immutably recording every event into a SHA-256 cryptographic audit blockchain.

---

## 1. Complete PPT Requirements Traceability Matrix

| Slide # | PPT Requirement / Component | Prototype Feature | Implementation Location | API Endpoint | UI Screen / Component | Test Case ID |
|---|---|---|---|---|---|---|
| **Slide 1** | **Problem Statement SIH26155**<br>AI-Driven Multi-Vendor Network Security Compliance Auditor | NEXORA Brand Identity & Application Core | `backend/app/main.py`<br>`frontend/src/` | `GET /api/v1/health`<br>`GET /api/v1/system/info` | Header, Sidebar, Dashboard Title | `TC-SYS-001` |
| **Slide 1** | **Theme: Blockchain & Cybersecurity** | Tamper-Evident SHA-256 Blockchain Audit Trail & Security Rules Engine | `backend/app/services/blockchain/`<br>`backend/app/services/security_engine/` | `GET /api/v1/blockchain`<br>`POST /api/v1/blockchain/verify`<br>`POST /api/v1/blockchain/tamper-test` | Blockchain Audit Trail View, Integrity Banner | `TC-BLOCKCHAIN-001`<br>`TC-BLOCKCHAIN-002` |
| **Slide 2** | **Multi-Vendor Support** (Cisco, Fortinet, Juniper, Palo Alto) | Multi-Vendor Ingestion & Parser Plugin Engine (Cisco IOS/IOS-XE, Fortinet FortiOS, Juniper Junos) | `backend/app/services/parsers/cisco.py`<br>`backend/app/services/parsers/fortigate.py`<br>`backend/app/services/parsers/juniper.py`<br>`backend/app/services/vendor_detection/` | `POST /api/v1/configurations/upload`<br>`POST /api/v1/configurations/detect-vendor` | Configuration Upload, Vendor Badges | `TC-CISCO-001`<br>`TC-FGT-001`<br>`TC-JUNOS-001` |
| **Slide 2** | **Configuration Normalization** | Abstracted Unified Security Object Model (Device, FirewallRule, ManagementAccess, SecurityControl, Route) | `backend/app/schemas/normalized.py`<br>`backend/app/services/normalization/normalizer.py` | `GET /api/v1/configurations/{id}/normalized` | Normalized Object Viewer, Object Count Badges | `TC-NORM-001`<br>`TC-NORM-002` |
| **Slide 2** | **Automated Threat Detection** | Deterministic Security Rule Registry (18+ security categories: SSH, Telnet, Broad ACL, Logging, Auth, Weak Ciphers) | `backend/app/services/security_engine/rule_registry.py`<br>`backend/app/services/security_engine/rules/` | `GET /api/v1/audits/{id}/findings`<br>`GET /api/v1/security-rules` | Findings Table, Rule Catalog, Severity Badges | `TC-SEC-001`<br>`TC-SEC-002` |
| **Slide 2** | **AI-Driven Auditing** | Assistive LLM/RAG contextual finding explanation, impact analysis & natural language queries (with deterministic fallback) | `backend/app/services/ai/explainer.py`<br>`backend/app/services/ai/rag_engine.py` | `POST /api/v1/findings/{id}/ai-explain`<br>`POST /api/v1/ai/query` | AI Explanation Panel, "Explain with AI" Drawer | `TC-AI-001`<br>`TC-AI-002` |
| **Slide 2** | **Vendor-Agnostic Architecture** | Standardized `VendorAdapter` interface and normalized rule evaluation | `backend/app/services/parsers/base.py`<br>`backend/app/services/security_engine/evaluator.py` | `GET /api/v1/vendors` | Multi-Vendor Comparison Matrix | `TC-ADAPTER-001` |
| **Slide 2** | **Unified Security Pipeline** | 10-Step Workflow orchestration from upload to compliance verification | `backend/app/services/audit_pipeline.py` | `POST /api/v1/audits/run` | Audit Progress Pipeline Stepper (Visual) | `TC-PIPELINE-001` |
| **Slide 2** | **Workflow Step 1: Issue Identified** | Detection of security vulnerabilities with exact configuration line evidence | `backend/app/services/security_engine/evaluator.py` | `GET /api/v1/findings/{id}`<br>`GET /api/v1/findings/{id}/evidence` | Finding Detail Page, Exact Evidence Viewer | `TC-FINDING-001` |
| **Slide 2** | **Workflow Step 2: Impact Evaluated** | Security blast radius & service impact evaluation | `backend/app/services/risk_engine/impact_evaluator.py` | `GET /api/v1/findings/{id}/impact` | Impact Analysis Card | `TC-IMPACT-001` |
| **Slide 2** | **Workflow Step 3: Risk Prioritized** | Transparent, deterministic scoring formula (Severity + Exposure + Impact + Exploitability) | `backend/app/services/risk_engine/calculator.py` | `GET /api/v1/findings/{id}/risk` | Risk Score Badge (0-100), Score Breakdown Breakdown | `TC-RISK-001` |
| **Slide 2** | **Workflow Step 4: Compliance Mapped** | Curated compliance mapping (NIST CSF 2.0, NIST SP 800-53, CIS, ISO 27001, PCI DSS, MITRE ATT&CK) | `backend/app/services/compliance/mapping_engine.py`<br>`backend/app/knowledge_base/compliance/` | `GET /api/v1/findings/{id}/compliance`<br>`GET /api/v1/compliance/frameworks` | Compliance Mapping Badges, Compliance Tab | `TC-COMP-001`<br>`TC-COMP-002` |
| **Slide 2** | **Workflow Step 5: Explanation Provided** | Structured AI explanation with strict schema (summary, why dangerous, what could happen, principle) | `backend/app/services/ai/explainer.py` | `GET /api/v1/findings/{id}/explanation` | AI Explanation Section with Disclaimer | `TC-AI-003` |
| **Slide 2** | **Workflow Step 6: Remediation Recommended** | Vendor-specific syntactically correct remediation patch generation | `backend/app/services/remediation/generator.py` | `GET /api/v1/findings/{id}/remediation` | Remediation Diff Panel (Current vs Recommended) | `TC-REM-001` |
| **Slide 2** | **Workflow Step 7: Approval Required** | Human-in-the-Loop review: Approve/Reject controls with reviewer audit metadata | `backend/app/services/remediation/approval.py` | `POST /api/v1/findings/{id}/approve`<br>`POST /api/v1/findings/{id}/reject` | Approve/Reject Action Modal, Reviewer Sign-off | `TC-APPR-001` |
| **Slide 2** | **Workflow Step 8: Remediation Implemented** | Safe sandboxed configuration patch simulation (no modification of production devices) | `backend/app/services/remediation/simulator.py` | `POST /api/v1/findings/{id}/simulate-remediation` | Remediation Simulation Sandbox View | `TC-SIM-001` |
| **Slide 2** | **Workflow Step 9: Verification Performed** | Deterministic re-parse, re-normalize, and re-audit of simulated config | `backend/app/services/verification/verifier.py` | `POST /api/v1/audits/{id}/verify` | Verification Comparison Card (Before vs After) | `TC-VERIF-001` |
| **Slide 2** | **Workflow Step 10: Compliance Achieved** | Audit status update, compliance posture recalculated, risk reduced | `backend/app/services/compliance/calculator.py` | `GET /api/v1/audits/{id}/compliance-posture` | Compliance Gauge, Posture Delta | `TC-POSTURE-001` |
| **Slide 3** | **Frontend: React.js, Tailwind CSS, Recharts, Chart.js** | Cybersecurity Dashboard SPA with dark/light mode, charts, and data tables | `frontend/src/` | Integrated frontend client | Dashboard, Audit, Findings, Blockchain, Compliance | `TC-UI-001` |
| **Slide 3** | **Backend: Python, FastAPI, Pydantic, Uvicorn, REST APIs** | Modular REST backend with Pydantic validation and async request handling | `backend/app/` | `http://localhost:8000/api/v1` | Backend API Layer | `TC-API-001` |
| **Slide 3** | **Database: PostgreSQL & JSON/YAML & Vector Store** | Relational data persistence with SQLAlchemy, alembic migrations, and local vector retrieval | `backend/app/models/`<br>`backend/app/core/database.py` | Database Session Layer | Storage Engine | `TC-DB-001` |
| **Slide 3** | **Security & Compliance Standards** | NIST CSF 2.0, NIST SP 800-53 Rev 5, CIS Benchmarks, ISO 27001, PCI DSS, MITRE ATT&CK | `backend/app/knowledge_base/` | `GET /api/v1/compliance/standards` | Framework Explorer UI | `TC-STD-001` |
| **Slide 3** | **Testing & Validation: PyTest, Postman** | Automated PyTest test suite + Postman Collection | `backend/tests/`<br>`docs/postman/NEXORA.postman_collection.json` | Automated Test CLI | Test Execution Reports | `TC-ALL-001` |
| **Slide 3** | **Deployment: Docker, Linux, CI/CD** | Containerized deployment with Dockerfile, docker-compose.yml | `Dockerfile`<br>`docker-compose.yml` | Container Services | Docker Orchestration | `TC-OPS-001` |
| **Slide 4** | **Human-in-the-Loop Practicality** | Non-autonomous remediation enforcement: human review mandatory before any config simulation | `backend/app/services/remediation/approval.py` | `POST /api/v1/findings/{id}/approve` | Human Sign-off UI | `TC-APPR-002` |
| **Slide 5** | **Executive Reporting (PDF, CSV, JSON)** | Full executive & technical compliance report generation | `backend/app/services/reporting/` | `GET /api/v1/reports/{id}/pdf`<br>`GET /api/v1/reports/{id}/csv`<br>`GET /api/v1/reports/{id}/json` | Report Download Center | `TC-REP-001` |
| **Slide 6** | **Authoritative Citations & Guidelines** | Grounded references to NIST, CIS, ISO, PCI DSS, Cisco, and Fortinet docs | `backend/app/knowledge_base/` | Included in finding detail & AI output | References Drawer | `TC-REF-001` |

---

## 2. Vendor Coverage & Representative Configurations

| Vendor | Supported File Types | Detection Fingerprint | Sample Configurations Provided | Representative Security Checks |
|---|---|---|---|---|
| **Cisco (IOS / IOS-XE)** | `.cfg`, `.conf`, `.txt` | `hostname`, `interface GigabitEthernet`, `line vty`, `ip access-list`, `aaa new-model` | • `cisco_secure.cfg`<br>• `cisco_insecure.cfg`<br>• `cisco_mixed.cfg` | • Insecure Telnet on VTY lines<br>• SSH v1 vs SSH v2<br>• Permissive ACL (`permit ip any any`)<br>• Plaintext passwords (`enable password`)<br>• Unrestricted management access |
| **Fortinet (FortiOS)** | `.conf`, `.cfg`, `.txt` | `config system global`, `config firewall policy`, `set srcaddr`, `set dstaddr` | • `fortigate_secure.conf`<br>• `fortigate_insecure.conf`<br>• `fortigate_mixed.conf` | • Policy allows `all` to `all` on sensitive port<br>• Management interface allows HTTP/Telnet<br>• Logging disabled on firewall rule<br>• Weak administrative password policy<br>• Overly broad source addresses |
| **Juniper (Junos)** | `.conf`, `.txt` | `set system`, `set interfaces`, `set security policies`, Junos hierarchical blocks | • `juniper_secure.conf`<br>• `juniper_insecure.conf`<br>• `juniper_mixed.conf` | • Insecure management services (Telnet/HTTP)<br>• Permissive security zone policy (`source-address any`)<br>• Missing firewall rule logging (`then log`)<br>• Unrestricted SSH source addresses<br>• Weak authentication/insecure root authentication |

---

## 3. Separation of Responsibilities & Non-Negotiable Architectural Invariants

1. **Deterministic Security Engine is Authoritative:**
   - Authoritative PASS/FAIL is computed solely by deterministic code in `backend/app/services/security_engine/`.
   - The AI / LLM layer is strictly assistive (context, explanation, human-readable summaries).
   - AI can never alter a finding status from FAIL to PASS or vice versa.
2. **Deterministic Risk Prioritization:**
   - The final risk score is computed mathematically via the formula in `docs/RISK_MODEL.md`.
   - LLMs do not assign final risk scores.
3. **Safety & Sandboxing:**
   - NEXORA never modifies live production network devices.
   - All remediation is simulated on in-memory or sandboxed configuration copies.
4. **Tamper-Evident Traceability:**
   - Every significant action (upload, audit, finding, approval, simulation, verification) generates a SHA-256 block linked to the previous block hash.
   - Blockchain integrity is verifiable at any time by the user.
5. **Deterministic AI Fallback:**
   - If an external LLM API key (e.g., Gemini API) is not configured, NEXORA seamlessly falls back to a deterministic, template-based RAG explanation generator. The application will never crash due to a missing API key.
