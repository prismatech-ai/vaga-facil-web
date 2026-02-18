"""Add candidate profile status fields

Revision ID: 024_add_candidate_status
Revises: 023
Create Date: 2026-01-06 23:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '024_candidate_status'
down_revision = '016'
branch_labels = None
depends_on = None


def upgrade():
    # Adicionar campos de status ao candidato
    op.add_column('candidates', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('candidates', sa.Column('contratado', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('candidates', sa.Column('data_contratacao', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    # Remover campos de status do candidato
    op.drop_column('candidates', 'data_contratacao')
    op.drop_column('candidates', 'contratado')
    op.drop_column('candidates', 'is_active')
