"""
NEXORA UnresolvedCase Service

Handles CRUD, AI investigation triggers with RAG retrieval, human review submissions,
and final resolution of cases.
"""
import datetime
from datetime import timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.unresolved import UnresolvedCase, UnresolvedStatus, FinalVerdict
from backend.app.models.models import Audit, Finding
from backend.app.services.compliance.mapping_engine import ComplianceEngine
from backend.app.services.unresolved.lifecycle import UnresolvedLifecycle
from backend.app.services.unresolved.ai_investigator import AIInvestigator
from backend.app.services.rag.retriever import RAGRetriever
from backend.app.services.blockchain.chain import BlockchainLedger


class CaseService:

    @classmethod
    async def get_case(cls, session: AsyncSession, case_id: int) -> Optional[UnresolvedCase]:
        res = await session.execute(
            select(UnresolvedCase)
            .where(UnresolvedCase.id == case_id)
        )
        return res.scalar_one_or_none()

    @classmethod
    async def get_all_cases(cls, session: AsyncSession) -> List[UnresolvedCase]:
        res = await session.execute(
            select(UnresolvedCase)
            .order_by(UnresolvedCase.created_at.desc())
        )
        return list(res.scalars().all())

    @classmethod
    async def get_cases_for_audit(cls, session: AsyncSession, audit_id: int) -> List[UnresolvedCase]:
        res = await session.execute(
            select(UnresolvedCase)
            .where(UnresolvedCase.audit_id == audit_id)
            .order_by(UnresolvedCase.created_at.desc())
        )
        return list(res.scalars().all())

    @classmethod
    async def trigger_ai_analysis(
        cls, session: AsyncSession, case: UnresolvedCase, actor: str
    ) -> UnresolvedCase:
        """
        Trigger AI investigation:
        1. Transition state to ANALYZING.
        2. Retrieve authoritative RAG documentation chunks.
        3. Invoke NVIDIA AI with grounded context.
        4. Attach provenance and transition state to AWAITING_REVIEW.
        """
        # 1. State transition to ANALYZING
        await UnresolvedLifecycle.transition(
            session=session,
            case=case,
            new_status=UnresolvedStatus.ANALYZING,
            actor=actor,
            action="TRIGGER_AI_ANALYSIS",
        )
        await session.commit()
        await session.refresh(case)

        # 2. Retrieve authoritative RAG evidence
        rag_chunks = await RAGRetriever.retrieve_evidence(
            session=session,
            vendor=case.vendor,
            feature=case.feature,
            query_text=f"{case.reason} {case.source_text or ''}",
            top_k=5
        )

        # 3. Run AI analysis grounded in retrieved RAG context
        analysis_result = await AIInvestigator.analyze(
            case_type=case.case_type,
            reason=case.reason,
            vendor=case.vendor,
            source_text=case.source_text or "",
            missing_ref_detail=case.missing_reference,
            unknown_syntax_detail=case.unknown_syntax,
            rag_evidence=rag_chunks,
        )

        # Attach RAG evidence to AI analysis record for auditable provenance
        analysis_result["retrieved_evidence"] = rag_chunks
        case.ai_analysis = analysis_result
        case.ai_analyzed_at = datetime.datetime.now(timezone.utc)

        # 4. State transition to AWAITING_REVIEW
        await UnresolvedLifecycle.transition(
            session=session,
            case=case,
            new_status=UnresolvedStatus.AWAITING_REVIEW,
            actor="AI_INVESTIGATOR",
            action="AI_ANALYSIS_COMPLETE",
            evidence=analysis_result
        )
        await session.commit()
        await session.refresh(case)
        return case

    @classmethod
    async def submit_review(
        cls, session: AsyncSession, case: UnresolvedCase, reviewer: str, notes: str, context: dict = None
    ) -> UnresolvedCase:
        """Submit notes on a case without resolving it."""
        case.reviewer = reviewer
        case.review_notes = notes
        case.reviewed_at = datetime.datetime.now(timezone.utc)
        
        if case.status == UnresolvedStatus.OPEN:
            await UnresolvedLifecycle.transition(
                session=session,
                case=case,
                new_status=UnresolvedStatus.AWAITING_REVIEW,
                actor=reviewer,
                action="HUMAN_REVIEW_SUBMITTED",
                reason=notes,
                evidence=context
            )
        else:
            from backend.app.models.unresolved import UnresolvedCaseHistory
            history = UnresolvedCaseHistory(
                case_id=case.id,
                previous_status=case.status,
                new_status=case.status,
                actor=reviewer,
                action="HUMAN_REVIEW_UPDATED",
                reason=notes,
                evidence=context,
                timestamp=datetime.datetime.now(timezone.utc)
            )
            session.add(history)

        await session.commit()
        await session.refresh(case)
        return case

    @classmethod
    async def resolve_case(
        cls, session: AsyncSession, case: UnresolvedCase, reviewer: str, 
        verdict: str, resolution_context: str, resolution_evidence: dict = None
    ) -> UnresolvedCase:
        """Provide a final human verdict for an unresolved case."""
        
        if verdict not in FinalVerdict.ALL:
            raise ValueError(f"Invalid final verdict: {verdict}")

        target_status = UnresolvedStatus.RESOLVED
        if verdict == FinalVerdict.CANNOT_RESOLVE:
            target_status = UnresolvedStatus.CANNOT_RESOLVE

        case.reviewer = reviewer
        case.resolution_context = resolution_context
        case.resolution_evidence = resolution_evidence
        case.final_verdict = verdict

        await UnresolvedLifecycle.transition(
            session=session,
            case=case,
            new_status=target_status,
            actor=reviewer,
            action="CASE_RESOLVED",
            reason=f"Verdict: {verdict} - {resolution_context}",
            evidence=resolution_evidence
        )
        
        # Synchronize associated Finding authoritative state
        if case.finding_id:
            finding_res = await session.execute(
                select(Finding).where(Finding.id == case.finding_id)
            )
            finding = finding_res.scalar_one_or_none()
            if finding:
                if verdict in {FinalVerdict.CONFIRMED_SAFE, FinalVerdict.RESOLVED_WITH_CONTEXT}:
                    finding.verdict = "PASS"
                    finding.status = "VERIFIED"
                elif verdict == FinalVerdict.CONFIRMED_VIOLATION:
                    finding.verdict = "FAIL"
                    finding.status = "OPEN"
                elif verdict == FinalVerdict.CANNOT_RESOLVE:
                    finding.verdict = "UNRESOLVED"
                    finding.status = "OPEN"

        # Recalculate parent Audit compliance score using deterministic compliance engine
        recalculated_score = None
        if case.audit_id:
            audit_res = await session.execute(
                select(Audit).where(Audit.id == case.audit_id)
            )
            audit = audit_res.scalar_one_or_none()
            if audit:
                all_findings_res = await session.execute(
                    select(Finding).where(Finding.audit_id == case.audit_id)
                )
                findings_records = all_findings_res.scalars().all()
                findings_dicts = [
                    {
                        "id": f.id,
                        "rule_id": f.rule_id,
                        "title": f.title,
                        "severity": f.severity,
                        "status": f.status,
                        "verdict": f.verdict,
                        "compliance_mappings": f.compliance_mappings or []
                    }
                    for f in findings_records
                ]
                posture = ComplianceEngine.evaluate_posture(findings_dicts)
                audit.compliance_score = posture["overall_compliance_pct"]
                recalculated_score = audit.compliance_score

        # Log resolution to blockchain
        await BlockchainLedger.append_event(
            event_type="UNRESOLVED_CASE_RESOLVED",
            event_data={
                "case_id": case.id,
                "audit_id": case.audit_id,
                "finding_id": case.finding_id,
                "verdict": verdict,
                "new_compliance_score": recalculated_score,
                "reviewer": reviewer,
                "resolution_context": resolution_context
            },
            actor=reviewer,
            audit_id=case.audit_id,
            session=session
        )

        await session.commit()
        await session.refresh(case)
        return case

    @classmethod
    async def reject_case(
        cls, session: AsyncSession, case: UnresolvedCase, reviewer: str, reason: str
    ) -> UnresolvedCase:
        """Reject a case as invalid or not requiring resolution."""
        await UnresolvedLifecycle.transition(
            session=session,
            case=case,
            new_status=UnresolvedStatus.REJECTED,
            actor=reviewer,
            action="CASE_REJECTED",
            reason=reason
        )
        await session.commit()
        await session.refresh(case)
        return case
