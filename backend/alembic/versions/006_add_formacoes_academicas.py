"""add formacoes_academicas column to candidates

Revision ID: 006_formacoes_academicas
Revises: 005_adaptive_test
Create Date: 2025-12-17 23:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_formacoes_academicas'
down_revision = '005_adaptive_test'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adicionar coluna formacoes_academicas à tabela candidates
    op.add_column('candidates', sa.Column('formacoes_academicas', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remover coluna formacoes_academicas da tabela candidates
    op.drop_column('candidates', 'formacoes_academicas')
