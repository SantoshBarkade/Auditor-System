"""
NEXORA RAG, AI Boundary & Invariant Tests

Validates:
1. RAG metadata filtering and top-k retrieval.
2. AI recommendation NEVER overrides deterministic verdict automatically.
3. AI returning 'PASS' or 'FAIL' keeps case in AWAITING_REVIEW until human resolves.
4. UNRESOLVED verdict does not count as compliance GAP.
"""
import pytest
from unittest.mock import AsyncMock, patch
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.unresolved import UnresolvedCase, UnresolvedStatus, FinalVerdict
from backend.app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from backend.app.services.rag.embedder import EmbedderService
from backend.app.services.rag.retriever import RAGRetriever
from backend.app.services.unresolved.case_service import CaseService
from backend.app.services.compliance.mapping_engine import ComplianceEngine


@pytest.mark.asyncio
async def test_rag_retrieval_and_metadata_filter():
    """Verify RAG filters by vendor and returns top-k chunks with provenance."""
    async with AsyncSessionLocal() as async_session:
        doc_cisco = KnowledgeDocument(
            title="Cisco VTY Hardening Guide Test",
            vendor="Cisco",
            category="Management Security",
            source_type="VENDOR_DOCUMENTATION",
            authority_level="AUTHORITATIVE",
            version="17.x"
        )
        doc_juniper = KnowledgeDocument(
            title="Juniper Junos Hardening Guide Test",
            vendor="Juniper",
            category="Authentication",
            source_type="VENDOR_DOCUMENTATION",
            authority_level="AUTHORITATIVE",
            version="22.x"
        )
        async_session.add_all([doc_cisco, doc_juniper])
        await async_session.flush()

        emb1 = EmbedderService.get_embedding("transport input ssh line vty")
        emb2 = EmbedderService.get_embedding("set system login user root")

        chk_cisco = KnowledgeChunk(
            document_id=doc_cisco.id,
            chunk_index=1,
            title="Enforce SSH on Line VTY Test",
            content="Configure 'transport input ssh' under line vty 0 4 to prevent Telnet.",
            embedding=emb1
        )
        chk_juniper = KnowledgeChunk(
            document_id=doc_juniper.id,
            chunk_index=1,
            title="Root Authentication Test",
            content="Configure root password with SHA-512 encryption.",
            embedding=emb2
        )
        async_session.add_all([chk_cisco, chk_juniper])
        await async_session.commit()

        # Query for Cisco
        results = await RAGRetriever.retrieve_evidence(
            session=async_session,
            vendor="Cisco",
            feature="line vty",
            query_text="transport input telnet vs ssh",
            top_k=5
        )

        assert len(results) >= 1
        assert all(r["vendor"] in ["Cisco", "Multi-Vendor"] for r in results)
        assert results[0]["title"] == "Enforce SSH on Line VTY Test"
        assert results[0]["authority_level"] == "AUTHORITATIVE"
        assert "similarity_score" in results[0]


@pytest.mark.asyncio
async def test_ai_pass_does_not_override_deterministic_unresolved():
    """
    CRITICAL INVARIANT TEST:
    Even when AI returns 'CONFIRMED_SAFE' (PASS), the case MUST remain
    in AWAITING_REVIEW with final_verdict = None.
    AI opinion NEVER automatically resolves a case.
    """
    async with AsyncSessionLocal() as async_session:
        case = UnresolvedCase(
            audit_id=1,
            configuration_id=1,
            case_type="UNKNOWN_SYNTAX",
            reason="Ambiguous directive",
            vendor="Cisco",
            feature="line vty",
            source_lines=[10],
            source_text="some ambiguous line"
        )
        async_session.add(case)
        await async_session.commit()
        await async_session.refresh(case)

        mock_ai_pass = {
            "interpretation": "Directive appears benign.",
            "confidence": "HIGH",
            "reasoning_summary": "No security risks detected.",
            "missing_information": [],
            "recommendation": "CONFIRMED_SAFE",
            "source": "NVIDIA AI Provider",
            "warning": "AI analysis is not authoritative. It is advisory only."
        }

        with patch("backend.app.services.unresolved.ai_investigator.AIInvestigator.analyze", new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = mock_ai_pass
            with patch("backend.app.services.rag.retriever.RAGRetriever.retrieve_evidence", new_callable=AsyncMock) as mock_rag:
                mock_rag.return_value = []

                updated = await CaseService.trigger_ai_analysis(async_session, case, actor="TestAuditor")

        assert updated.status == UnresolvedStatus.AWAITING_REVIEW
        assert updated.final_verdict is None
        assert updated.ai_analysis["recommendation"] == "CONFIRMED_SAFE"

        # Verify that only human explicit resolution sets final_verdict
        resolved = await CaseService.resolve_case(
            session=async_session,
            case=updated,
            reviewer="Security Engineer Alice",
            verdict=FinalVerdict.CONFIRMED_SAFE,
            resolution_context="Verified manually against physical topology."
        )
        assert resolved.status == UnresolvedStatus.RESOLVED
        assert resolved.final_verdict == FinalVerdict.CONFIRMED_SAFE
        assert resolved.reviewer == "Security Engineer Alice"


@pytest.mark.asyncio
async def test_ai_fail_does_not_override_deterministic_unresolved():
    """
    CRITICAL INVARIANT TEST:
    Even when AI returns 'CONFIRMED_VIOLATION' (FAIL), the case MUST remain
    in AWAITING_REVIEW with final_verdict = None until human resolution.
    """
    async with AsyncSessionLocal() as async_session:
        case = UnresolvedCase(
            audit_id=2,
            configuration_id=2,
            case_type="MISSING_REFERENCE",
            reason="Referenced ACL missing",
            vendor="Fortinet",
            feature="firewall policy",
            source_lines=[45],
            source_text="set service-group GRP_EXTERNAL"
        )
        async_session.add(case)
        await async_session.commit()
        await async_session.refresh(case)

        mock_ai_fail = {
            "interpretation": "Missing object might permit unintended traffic.",
            "confidence": "HIGH",
            "reasoning_summary": "Policy cannot be enforced without object definition.",
            "missing_information": ["Object group definition"],
            "recommendation": "CONFIRMED_VIOLATION",
            "source": "NVIDIA AI Provider",
            "warning": "AI analysis is not authoritative. It is advisory only."
        }

        with patch("backend.app.services.unresolved.ai_investigator.AIInvestigator.analyze", new_callable=AsyncMock) as mock_ai:
            mock_ai.return_value = mock_ai_fail
            with patch("backend.app.services.rag.retriever.RAGRetriever.retrieve_evidence", new_callable=AsyncMock) as mock_rag:
                mock_rag.return_value = []

                updated = await CaseService.trigger_ai_analysis(async_session, case, actor="TestAuditor")

        assert updated.status == UnresolvedStatus.AWAITING_REVIEW
        assert updated.final_verdict is None


def test_unresolved_verdict_not_counted_as_compliance_gap():
    """UNRESOLVED findings must NOT inflate failed controls or count as GAP."""
    sample_findings = [
        {
            "id": 1,
            "rule_id": "CISCO-SSH-01",
            "title": "Telnet Enabled",
            "verdict": "FAIL",
            "status": "OPEN",
            "compliance_mappings": [{"framework": "CIS Benchmarks", "control_id": "CIS-2.1.1", "name": "Disable Telnet"}]
        },
        {
            "id": 2,
            "rule_id": "CISCO-AMBIG-01",
            "title": "Ambiguous Directive",
            "verdict": "UNRESOLVED",
            "status": "OPEN",
            "compliance_mappings": [{"framework": "CIS Benchmarks", "control_id": "CIS-1.1", "name": "Perimeter Filtering"}]
        }
    ]

    posture = ComplianceEngine.evaluate_posture(sample_findings)
    assert posture["unresolved_count"] == 1
    # Only the FAIL finding should be counted in gaps, NOT the UNRESOLVED finding
    cis_gaps = posture["frameworks"]["CIS Benchmarks"]["gaps"]
    assert len(cis_gaps) == 1
    assert cis_gaps[0]["finding_id"] == 1
