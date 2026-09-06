"""add_knowledge_pgvector

Revision ID: b547b24c11f8
Revises: a436a13bcca7
Create Date: 2026-09-06 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = 'b547b24c11f8'
down_revision = 'a436a13bcca7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure pgvector extension is present on PostgreSQL
    conn = op.get_bind()
    if conn.dialect.name == 'postgresql':
        op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    op.create_table(
        'knowledge_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('vendor', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('authority_level', sa.String(length=30), nullable=False, server_default='AUTHORITATIVE'),
        sa.Column('version', sa.String(length=50), nullable=True),
        sa.Column('document_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('knowledge_documents', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_knowledge_documents_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_knowledge_documents_vendor'), ['vendor'], unique=False)
        batch_op.create_index(batch_op.f('ix_knowledge_documents_category'), ['category'], unique=False)

    op.create_table(
        'knowledge_chunks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('chunk_metadata', sa.JSON(), nullable=True),
        sa.Column('embedding', Vector(1536), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['knowledge_documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('knowledge_chunks', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_knowledge_chunks_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_knowledge_chunks_document_id'), ['document_id'], unique=False)
        batch_op.create_index('ix_knowledge_chunks_doc_idx', ['document_id', 'chunk_index'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('knowledge_chunks', schema=None) as batch_op:
        batch_op.drop_index('ix_knowledge_chunks_doc_idx')
        batch_op.drop_index(batch_op.f('ix_knowledge_chunks_document_id'))
        batch_op.drop_index(batch_op.f('ix_knowledge_chunks_id'))
    op.drop_table('knowledge_chunks')

    with op.batch_alter_table('knowledge_documents', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_knowledge_documents_category'))
        batch_op.drop_index(batch_op.f('ix_knowledge_documents_vendor'))
        batch_op.drop_index(batch_op.f('ix_knowledge_documents_id'))
    op.drop_table('knowledge_documents')
