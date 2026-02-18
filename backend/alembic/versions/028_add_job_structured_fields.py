"""
028 - Adicionar campos estruturados de vaga

Revision ID: 028_add_job_structured_fields
Revises: 027_add_certificacao_competencias
Create Date: 2026-02-16

Adiciona campos estruturados ao modelo Job:
- nivel_senioridade (junior, pleno, senior, especialista)
- escolaridade_minima
- experiencia_minima_anos
"""
from alembic import op
import sqlalchemy as sa

revision = '028_add_job_structured_fields'
down_revision = '027_add_certificacao_competencias'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adicionar campos estruturados na tabela jobs
    op.add_column('jobs', sa.Column('nivel_senioridade', sa.String(50), nullable=True))
    op.add_column('jobs', sa.Column('escolaridade_minima', sa.String(100), nullable=True))
    op.add_column('jobs', sa.Column('experiencia_minima_anos', sa.Integer(), server_default='0', nullable=True))
    
    # Criar índice para filtros comuns
    op.create_index('ix_jobs_nivel_senioridade', 'jobs', ['nivel_senioridade'])
    op.create_index('ix_jobs_area_atuacao', 'jobs', ['area_atuacao'])


def downgrade() -> None:
    op.drop_index('ix_jobs_area_atuacao', table_name='jobs')
    op.drop_index('ix_jobs_nivel_senioridade', table_name='jobs')
    op.drop_column('jobs', 'experiencia_minima_anos')
    op.drop_column('jobs', 'escolaridade_minima')
    op.drop_column('jobs', 'nivel_senioridade')
