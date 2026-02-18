"""Add campos garantia_finalizada to candidates

Revision ID: 032_add_garantia_candidato_fields
Revises: 031_add_historico_estado_auditoria
Create Date: 2026-02-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '032_add_garantia_candidato_fields'
down_revision = '031_add_historico_estado_auditoria'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adicionar campos de garantia ao candidato
    op.add_column('candidates', sa.Column('garantia_finalizada', sa.Boolean(), default=False))
    op.add_column('candidates', sa.Column('data_fim_garantia', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('candidates', 'data_fim_garantia')
    op.drop_column('candidates', 'garantia_finalizada')
