"""
NEXORA RAG Retriever Engine

Performs metadata-filtered, vector-similarity retrieval against authoritative
network security knowledge documents and chunks.
Grounds UnresolvedCase investigations in verifiable engineering sources.
"""
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from backend.app.services.rag.embedder import EmbedderService

logger = logging.getLogger(__name__)


class RAGRetriever:
    """
    Authoritative Knowledge Retriever.
    Enforces:
    1. Metadata filtering BEFORE or DURING similarity scoring
    2. Strict vendor-scoping
    3. Authoritative document prioritization
    4. Top-K limiting (default 5)
    5. Complete provenance recording
    """

    @classmethod
    async def retrieve_evidence(
        cls,
        session: AsyncSession,
        vendor: str,
        feature: Optional[str] = None,
        query_text: str = "",
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top-k authoritative knowledge chunks relevant to the case.
        """
        query_vec = EmbedderService.get_embedding(f"{vendor} {feature or ''} {query_text}")

        # Metadata filter: Scope to the specific vendor or cross-vendor standards
        allowed_vendors = [vendor, "Multi-Vendor"]

        stmt = (
            select(KnowledgeChunk, KnowledgeDocument)
            .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
            .where(KnowledgeDocument.vendor.in_(allowed_vendors))
        )

        res = await session.execute(stmt)
        rows = res.all()

        if not rows:
            return []

        # Score each chunk by vector similarity
        scored_chunks = []
        for chunk, doc in rows:
            if chunk.embedding is not None:
                # Convert embedding to list of floats if needed
                emb_list = list(chunk.embedding) if hasattr(chunk.embedding, '__iter__') else chunk.embedding
                sim = EmbedderService.cosine_similarity(query_vec, emb_list)
            else:
                # Fallback text similarity if embedding was not set
                sim = EmbedderService.cosine_similarity(
                    query_vec,
                    EmbedderService.get_embedding(f"{chunk.title} {chunk.content}")
                )

            # Boost authoritative documents and matching category
            if doc.authority_level == "AUTHORITATIVE":
                sim = min(1.0, sim * 1.15)
            if feature and doc.category.lower() in feature.lower():
                sim = min(1.0, sim * 1.1)

            scored_chunks.append({
                "chunk_id": chunk.id,
                "document_id": doc.id,
                "document_title": doc.title,
                "authority_level": doc.authority_level,
                "source_type": doc.source_type,
                "vendor": doc.vendor,
                "category": doc.category,
                "version": doc.version or "General",
                "title": chunk.title,
                "content": chunk.content,
                "similarity_score": round(sim, 4),
                "metadata": chunk.chunk_metadata or {}
            })

        # Sort descending by similarity
        scored_chunks.sort(key=lambda x: x["similarity_score"], reverse=True)

        return scored_chunks[:top_k]
