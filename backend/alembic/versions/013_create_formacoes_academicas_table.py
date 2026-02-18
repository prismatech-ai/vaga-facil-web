"""Create formacoes_academicas table

Revision ID: 013_formacoes_table
Revises: 012_cleanup_unnecessary_tables
Create Date: 2025-12-27 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '013_formacoes_table'
down_revision = '012_cleanup_unnecessary_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Criar tabela formacoes_academicas
    op.create_table(
        'formacoes_academicas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('instituicao', sa.String(length=255), nullable=False),
        sa.Column('curso', sa.String(length=255), nullable=False),
        sa.Column('nivel', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=100), nullable=False),
        sa.Column('ano_conclusao', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_formacoes_academicas_candidate_id'), 'formacoes_academicas', ['candidate_id'])


def downgrade() -> None:
    # Remover tabela formacoes_academicas
    op.drop_index(op.f('ix_formacoes_academicas_candidate_id'), table_name='formacoes_academicas')
    op.drop_table('formacoes_academicas')
