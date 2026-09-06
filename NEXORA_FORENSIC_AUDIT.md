# NEXORA FORENSIC AUDIT REPORT
**Problem ID:** SIH26155 — AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Date:** September 6, 2026  
**Auditor:** Senior Forensic Architecture & Implementation Auditor  
**Active Repository Root:** `C:\SIH\SIH PROTOTYPE4\SIH PROTOTYPE`

---

## 1. Executive Summary & Repository Overview

| Subsystem | Status | Verification Detail |
| :--- | :---: | :--- |
| **Database (Supabase PostgreSQL)** | **GREEN** | Actively connected via `postgresql+psycopg://` to Supabase IPv4 Pooler (`aws-0-ap-south-1.pooler.supabase.com:5432/postgres`). Native Alembic migrations synced. |
| **Deterministic Security Engine** | **GREEN** | 100% rule-based AST evaluation (Cisco, Fortinet, Juniper). Zero LLM contamination in Flow A. |
| **pgvector & Vector Database** | **GREEN** | PostgreSQL extension `vector` (v0.8.2) enabled. Schema contains `knowledge_documents` and `knowledge_chunks` with `Vector(1536)` embeddings. |
| **RAG Knowledge Pipeline** | **GREEN** | Implemented in `embedder.py` & `retriever.py`. Seeded with 10 authoritative chunks across Cisco, Fortinet, and Juniper. Top-K similarity tested with 0.785 score. |
| **NVIDIA AI Integration** | **GREEN** | `meta/llama-3.2-11b-vision-instruct` verified live via `https://integrate.api.nvidia.com/v1`. Structured JSON output with strict advisory boundary. |
| **Unresolved Domain (Flow B)** | **GREEN** | Full lifecycle (`OPEN` → `ANALYZING` → `AWAITING_REVIEW` → `RESOLVED`), Path A vs Path B classification, immutable history ledger. |
| **Frontend UI/UX** | **GREEN** | Vite React app with dedicated `UnresolvedCases.jsx`, 5-category metric dashboard, RAG citation inspection, and human review form. |
| **Security & Boundaries** | **GREEN** | Prompt injection protection, secrets externalized in `.env`, masked in `/settings`, AI strictly cannot override deterministic verdicts. |
| **Testing Suite** | **GREEN** | 26/26 tests passing in pytest (parsers, security engine, blockchain, unresolved lifecycle, RAG retrieval, AI boundary invariants). |

---

## 2. Actual Runtime Architecture Map

```
                     ┌────────────────────────────────────────────────────────┐
                     │            RAW NETWORK CONFIGURATION UPLOAD            │
                     │             (Cisco IOS-XE / FortiOS / Junos)           │
                     └───────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
                     ┌────────────────────────────────────────────────────────┐
                     │            VENDOR DETECTION & PARSING (AST)            │
                     │          (CiscoParser, FortiGateParser, JuniperParser) │
                     └───────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
                     ┌────────────────────────────────────────────────────────┐
                     │          VENDOR-NEUTRAL FACTS NORMALIZATION            │
                     │          (Device, Interfaces, Services, ACLs, Rules)   │
                     └───────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
                     ┌────────────────────────────────────────────────────────┐
                     │        DETERMINISTIC SECURITY EVALUATOR & RULES        │
                     │   (100% Rule-Based, Zero AI, Consumed Line Tracking)   │
                     └───────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
                     ┌────────────────────────────────────────────────────────┐
                     │                  COMPLIANCE VERDICT                    │
                     └───────┬────────────────────────────────────────┬───────┘
                             │                                        │
           ┌─────────────────┴─────────────────┐                      │
           │                                   │                      │
           ▼                                   ▼                      ▼
┌───────────────────────┐             ┌─────────────────┐    ┌─────────────────┐
│     PASS / N/A        │             │      FAIL       │    │   UNRESOLVED    │
└───────────────────────┘             └────────┬────────┘    └────────┬────────┘
                                               │                      │
                                               ▼                      ▼
                                      ┌─────────────────┐    ┌─────────────────┐
                                      │  FLOW A: NORMAL │    │ FLOW B: UNRESOLV│
                                      │ Risk (0-100)    │    │ Classifier:     │
                                      │ Remediation Diff│    │ - Path A (Ref)  │
                                      │ Simulation &    │    │ - Path B (Syntax│
                                      │ Verification    │    │                 │
                                      │ Cryptographic   │    │ UnresolvedCase  │
                                      │ Blockchain Block│    └────────┬────────┘
                                      └─────────────────┘             │
                                                                      ▼
                                                             ┌─────────────────┐
                                                             │  RAG RETRIEVAL  │
                                                             │ Supabase Vector │
                                                             │ Top-5 Evidence  │
                                                             │ Metadata Scoped │
                                                             └────────┬────────┘
                                                                      │
                                                                      ▼
                                                             ┌─────────────────┐
                                                             │   NVIDIA AI     │
                                                             │ LLaMA-3.2-11B   │
                                                             │ Advisory Only   │
                                                             └────────┬────────┘
                                                                      │
                                                                      ▼
                                                             ┌─────────────────┐
                                                             │  HUMAN REVIEW   │
                                                             │ Engineer Notes  │
                                                             │ Final Verdict:  │
                                                             │ SAFE / VIOLATION│
                                                             └────────┬────────┘
                                                                      │
                                                                      ▼
                                                             ┌─────────────────┐
                                                             │ BLOCKCHAIN LEDG │
                                                             │ Immutable SHA256│
                                                             └─────────────────┘
```

---

## 3. Database Forensic Trace (Supabase PostgreSQL)

- **Configuration:** Loaded via `backend/app/core/config.py` from `.env`.
- **Async Driver:** `postgresql+psycopg://postgres.hcxhavkcrchtrzwrsqqg:[SECRET]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`.
- **Sync Driver (Alembic):** Normalized to `postgresql://...` for migrations.
- **Engine Created:** `create_async_engine(settings.DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)` in `backend/app/core/database.py`.
- **Active Supabase Tables Verified:**
  1. `devices`
  2. `configurations`
  3. `audits`
  4. `findings`
  5. `remediations`
  6. `approvals`
  7. `blockchain_blocks`
  8. `reports`
  9. `unresolved_cases`
  10. `unresolved_case_history`
  11. `knowledge_documents` (NEW)
  12. `knowledge_chunks` (NEW with native `vector(1536)`)
- **Alembic History:** Stamped and upgraded through `a436a13bcca7` to `b547b24c11f8_add_knowledge_pgvector`.
- **Verdict on Database:** **ACTUALLY USED** (All CRUD operations write to live Supabase PostgreSQL).

---

## 4. NVIDIA AI Forensic Trace

- **Base URL:** `https://integrate.api.nvidia.com/v1`
- **Active Account Model:** `meta/llama-3.2-11b-vision-instruct` (tested live, 200 OK).
- **Client Instantiation:** `AsyncOpenAI(base_url=settings.NVIDIA_BASE_URL, api_key=settings.NVIDIA_API_KEY, timeout=25.0)`.
- **Consumers:**
  - `AIInvestigator.analyze`: Strictly called on Unresolved Cases (Flow B) when triggered by human or audit review.
  - `AIExplanationService.explain_finding`: Generates contextual natural language explanations for findings without altering risk scores or verdicts.
- **Strict Invariants Tested:**
  - AI returning "CONFIRMED_SAFE" does NOT mark finding as PASS; case remains `AWAITING_REVIEW` until human resolution.
  - AI returning "CONFIRMED_VIOLATION" does NOT create a compliance gap until human resolution.
  - Fallback engine produces deterministic rule explanations if NVIDIA API key is missing or offline.

---

## 5. RAG & pgvector Forensic Trace

- **Vector Extension:** `vector` v0.8.2 enabled in PostgreSQL catalog.
- **Table Schema:** `knowledge_chunks.embedding` is native `USER-DEFINED (vector)`.
- **Metadata Filtering:** Enforces `KnowledgeDocument.vendor.in_([vendor, "Multi-Vendor"])` and category scoping before/during ranking.
- **Embedder:** `EmbedderService` creates normalized 1536-dimensional float vectors.
- **Retriever:** `RAGRetriever.retrieve_evidence` calculates cosine similarity against knowledge chunks, boosts authoritative sources, and selects Top-5 chunks.
- **Live Seeder:** Seeded 10 authoritative chunks across Cisco IOS XE Security Guide, Fortinet FortiOS Hardening Guide, and Juniper Junos Security Baseline.
- **Integration:** Chunks passed inside `<AUTHORITATIVE_CONTEXT>` XML tags into NVIDIA prompt; provenance citations preserved in `ai_analysis["retrieved_evidence"]`.

---

## 6. Normal Flow vs. Unresolved Flow Isolation

| Aspect | Flow A (Normal Deterministic Flow) | Flow B (Unresolved Flow) |
| :--- | :--- | :--- |
| **Trigger Condition** | Evaluator matches known security rules. | Directive contains missing dependencies or unknown syntax. |
| **Authoritative Decision** | Deterministic Security Engine (`evaluator.py`). | Authorized Human Engineer (`case_service.py`). |
| **AI Role** | Read-only explanatory assist (`explainer.py`). | RAG-grounded advisory investigation (`ai_investigator.py`). |
| **Compliance Posture** | PASS increases score; FAIL creates a GAP. | UNRESOLVED is isolated; **does NOT decrease compliance score**. |
| **Risk Scoring** | Deterministic risk score (0–100). | Excluded from global failure risk until resolved. |
| **Remediation** | Deterministic syntax diff proposed. | Guidance conditional on resolved context. |
| **Audit Ledger** | Emits `AUDIT_STARTED`, `AUDIT_COMPLETED`. | Emits `UNRESOLVED_CASE_RESOLVED` upon human verdict. |

---

## 7. Frontend Forensic Audit

- **Framework:** React 18, Vite 8, Tailwind CSS.
- **Production Build:** Passes cleanly with `vite build` (0 errors).
- **Dashboard:** Features dedicated 5-category flow banner (Configurations, Audits, Violations, Unresolved Cases, Blockchain Blocks).
- **Unresolved Management:** Added `UnresolvedCases.jsx` featuring:
  - Path A (Missing Reference) vs Path B (Unknown Syntax) categorization.
  - Lifecycle state badges (`OPEN`, `ANALYZING`, `AWAITING_REVIEW`, `RESOLVED`, `REJECTED`).
  - Interactive drawer with extracted config snippet, RAG evidence citations, AI advisory investigation, and human resolution form.
- **Settings:** Updated to configure NVIDIA OpenAI API (`meta/llama-3.2-11b-vision-instruct`) with masked secrets.

---

## 8. Test Execution Verification

The entire pytest test suite (26 tests) executes with 100% success:
- `test_blockchain_and_verification.py`: 4 passed
- `test_e2e_full_workflow.py`: 2 passed
- `test_parsers_and_normalization.py`: 4 passed
- `test_rag_and_ai_invariants.py`: 4 passed (NEW)
- `test_security_engine_and_risk.py`: 2 passed
- `test_unresolved_and_edge_cases.py`: 5 passed
- `test_unresolved_lifecycle.py`: 2 passed
- `test_vendor_detection.py`: 3 passed
- **Total:** **26 passed, 0 failed in 4.07s**.
