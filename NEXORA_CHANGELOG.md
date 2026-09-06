# NEXORA ARCHITECTURE CHANGELOG

## ADDED
- `backend/app/models/knowledge.py`: Defines `KnowledgeDocument` and `KnowledgeChunk` SQLAlchemy models with native `Vector(1536)` embedding columns for pgvector knowledge base.
- `backend/app/services/rag/embedder.py`: Normalized 1536-dimensional semantic embedder service supporting deterministic domain term resonance and cosine similarity.
- `backend/app/services/rag/retriever.py`: Authoritative RAG retrieval engine enforcing vendor scoping, category filtering, vector similarity scoring, and Top-5 chunk retrieval.
- `backend/app/services/rag/seed_knowledge.py`: Database seeder with 10 authoritative hardening chunks across Cisco IOS-XE, Fortinet FortiOS, and Juniper Junos.
- `backend/migrations/versions/b547b24c11f8_add_knowledge_pgvector.py`: Alembic migration establishing `knowledge_documents` and `knowledge_chunks` with `vector(1536)` in Supabase PostgreSQL.
- `frontend/src/pages/UnresolvedCases.jsx`: First-class Unresolved Case management interface featuring Path A vs Path B categorization, RAG evidence citations, AI advisory investigation, and human resolution form.
- `backend/tests/test_rag_and_ai_invariants.py`: Invariant regression tests proving RAG vector retrieval, AI boundary enforcement (AI cannot override verdict), and compliance gap isolation.

## MODIFIED
- `backend/requirements.txt`:
  - **Old Behavior:** Missing `alembic`, `openai`, `pgvector`.
  - **New Behavior:** Added `alembic==1.14.0`, `openai==3.8.0`, `pgvector==0.5.0`.
- `backend/app/core/config.py`:
  - **Old Behavior:** Defaulted `NVIDIA_MODEL` to `meta/llama-3.1-405b-instruct` (404 on user tier); lacked `SYNC_DATABASE_URL` normalization; contained UTF-8 BOM.
  - **New Behavior:** Defaulted `NVIDIA_MODEL` to active `meta/llama-3.2-11b-vision-instruct`; added `normalize_sync_database_url`; clean UTF-8 encoding.
- `.env` and `.env.example`:
  - **Old Behavior:** Set `NVIDIA_MODEL="meta/llama-3.1-405b-instruct"`.
  - **New Behavior:** Set `NVIDIA_MODEL="meta/llama-3.2-11b-vision-instruct"`.
- `backend/app/api/routes/settings.py`:
  - **Old Behavior:** Referenced obsolete `settings.GEMINI_API_KEY` causing unhandled 500 error on `GET /settings`.
  - **New Behavior:** Exposes NVIDIA OpenAI-compatible configuration, masks secrets (`nvapi-...`), and updates settings securely via `POST /settings/ai`.
- `backend/app/api/routes/unresolved.py`:
  - **Old Behavior:** Lacked root `GET /` case listing and `GET /stats/summary`.
  - **New Behavior:** Added `GET /api/v1/unresolved` with vendor/status/type filters and `GET /api/v1/unresolved/stats/summary` for aggregate metrics.
- `backend/app/services/unresolved/ai_investigator.py`:
  - **Old Behavior:** Synchronous blocking `OpenAI` client without RAG context injection.
  - **New Behavior:** `AsyncOpenAI` client with 25s timeout; injects RAG evidence into `<AUTHORITATIVE_CONTEXT>` tags; strict JSON output schema.
- `backend/app/services/unresolved/case_service.py`:
  - **Old Behavior:** AI analysis ran in isolation without knowledge grounding.
  - **New Behavior:** Calls `RAGRetriever.retrieve_evidence` to fetch Top-5 authoritative chunks and passes them to `AIInvestigator`; records provenance.
- `backend/app/api/routes/dashboard.py` and `backend/app/schemas/schemas.py`:
  - **Old Behavior:** Merged unresolved findings into global failures; no verdict breakdown.
  - **New Behavior:** Computes and returns separate `unresolved_count`, `pass_findings`, `fail_findings`, `na_findings`, and `conflict_findings`.
- `frontend/src/services/api.js`:
  - **Old Behavior:** Zero API methods for Unresolved Cases.
  - **New Behavior:** Added `getUnresolvedCases`, `getUnresolvedStats`, `getUnresolvedCase`, `getUnresolvedHistory`, `triggerAIInvestigation`, `submitCaseReview`, `resolveCase`, `rejectCase`.
- `frontend/src/components/Sidebar.jsx` and `frontend/src/App.jsx`:
  - **Old Behavior:** No Unresolved Cases navigation link.
  - **New Behavior:** Added `Unresolved Cases` navigation item with `HelpCircle` icon and route rendering `UnresolvedCases.jsx`.
- `frontend/src/pages/Dashboard.jsx`:
  - **Old Behavior:** Only showed 4 severity bars; missing Unresolved metric card.
  - **New Behavior:** Added 5-category flow metric banner (Configurations, Audits, Violations, Unresolved Cases, Blockchain Blocks) with quick-navigation.
- `frontend/src/pages/Settings.jsx`:
  - **Old Behavior:** Advertised "Google Gemini API Key" with `gemini-1.5-flash`.
  - **New Behavior:** Features NVIDIA AI configuration, verified model dropdown (`meta/llama-3.2-11b-vision-instruct`), and masked key status.
- `backend/tests/conftest.py`:
  - **Old Behavior:** Lacked `async_session` fixture.
  - **New Behavior:** Added `async_session` fixture yielding isolated session against test database.

## REMOVED
- Obsolete runtime Gemini calls: Replaced with NVIDIA OpenAI-compatible API.
- Stale `settings.GEMINI_*` attribute references: Replaced with `settings.NVIDIA_*`.

## MIGRATIONS
- **`b547b24c11f8_add_knowledge_pgvector.py`**:
  - Ensures `CREATE EXTENSION IF NOT EXISTS vector;` executes on PostgreSQL.
  - Creates table `knowledge_documents` with columns `id`, `title`, `vendor`, `category`, `source_type`, `authority_level`, `version`, `document_url`, `created_at`.
  - Creates table `knowledge_chunks` with columns `id`, `document_id`, `chunk_index`, `title`, `content`, `chunk_metadata`, `embedding` (type `Vector(1536)`), `created_at`.
  - Indices created on `vendor`, `category`, `document_id`, and `(document_id, chunk_index)`.

## UI CHANGES
- **`Dashboard.jsx`**: Added 5-category metric cards explicitly separating UNRESOLVED findings from FAIL findings. Added direct link to Flow B management.
- **`UnresolvedCases.jsx`**: Brand new comprehensive operational page for Flow B with Path A vs Path B visual pills, lifecycle state filters, RAG evidence drawer, NVIDIA advisory investigation, and authorized human resolution workflow.
- **`Settings.jsx`**: Shifted from Gemini branding to NVIDIA Generative AI Core with active model selection, endpoint inspection, and masked API token display.
- **`Sidebar.jsx`**: Added "Unresolved Cases" item with direct routing.

## AI CHANGES
- Replaced legacy Google Gemini REST API references with official NVIDIA OpenAI-compatible client (`https://integrate.api.nvidia.com/v1`).
- Verified active account access for `meta/llama-3.2-11b-vision-instruct`.
- Hardened prompt with `<DATA>` and `<AUTHORITATIVE_CONTEXT>` XML boundary delimiters to neutralize prompt injection from untrusted network configs.
- Enforced strict advisory invariant: AI output format contains `warning: "AI analysis is not authoritative. It is advisory only."`

## RAG CHANGES
- **Vector Extension:** Enabled pgvector 0.8.2 in Supabase PostgreSQL.
- **Embeddings:** 1536-dimensional semantic embedder generating normalized vectors.
- **Storage:** Persisted in Supabase PostgreSQL table `knowledge_chunks`.
- **Retrieval:** Scoped by vendor and feature metadata, ranked by cosine similarity, limited to Top-5 chunks.
- **Provenance:** Attached document title, authority level, similarity score, and excerpt directly to AI analysis payload.
