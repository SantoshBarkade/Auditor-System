"""
NEXORA Authoritative Knowledge Base & Vector Models

Persists authoritative vendor guidelines, security baselines, and configuration
syntax manuals for RAG-grounded investigation of UnresolvedCases.
"""
import datetime
from datetime import timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from backend.app.core.database import Base


class KnowledgeDocument(Base):
    """
    Authoritative security guidance documentation (e.g. Cisco Hardening Guide,
    Fortinet Hardening Guide, Junos Security Baseline, CIS Benchmarks, NIST).
    """
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    vendor = Column(String(50), nullable=False, index=True)  # Cisco, Fortinet, Juniper, Multi-Vendor
    category = Column(String(100), nullable=False, index=True)  # Management, Authentication, Access Control, etc.
    source_type = Column(String(50), nullable=False)  # VENDOR_DOCUMENTATION, CIS_BENCHMARK, NIST_GUIDE
    authority_level = Column(String(30), nullable=False, default="AUTHORITATIVE")  # AUTHORITATIVE, STANDARD
    version = Column(String(50), nullable=True)
    document_url = Column(String(500), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(timezone.utc),
        nullable=False,
    )

    chunks = relationship(
        "KnowledgeChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="KnowledgeChunk.chunk_index"
    )


class KnowledgeChunk(Base):
    """
    Chunked excerpts from authoritative documents, vectorized for pgvector similarity retrieval.
    """
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("knowledge_documents.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    chunk_metadata = Column(JSON, nullable=True, default=dict)
    # {
    #   "vendor": str,
    #   "feature": str,
    #   "rule_ids": list[str],
    #   "syntax_patterns": list[str],
    #   "tags": list[str]
    # }
    embedding = Column(Vector(1536), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(timezone.utc),
        nullable=False,
    )

    document = relationship("KnowledgeDocument", back_populates="chunks")

    __table_args__ = (
        Index("ix_knowledge_chunks_doc_idx", "document_id", "chunk_index"),
    )
