"""Add missing columns to vaga_candidatos table

Revision ID: 016_add_missing_vaga_candidato_columns
Revises: 015_tests_and_questions_table
Create Date: 2026-01-05 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '016_add_missing_vaga_candidato_columns'
down_revision = '015_tests_and_questions_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to vaga_candidatos table
    # Note: excluido_por_filtros and motivo_exclusao already exist
    op.add_column('vaga_candidatos', 
                  sa.Column('data_entrevista', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', 
                  sa.Column('entrevista_agendada', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('vaga_candidatos', 
                  sa.Column('foi_contratado', sa.Boolean(), nullable=True))
    op.add_column('vaga_candidatos', 
                  sa.Column('data_resultado', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove added columns
    op.drop_column('vaga_candidatos', 'data_resultado')
    op.drop_column('vaga_candidatos', 'foi_contratado')
    op.drop_column('vaga_candidatos', 'entrevista_agendada')
    op.drop_column('vaga_candidatos', 'data_entrevista')
