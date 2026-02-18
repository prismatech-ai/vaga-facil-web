"""add experiencias_profissionais table

Revision ID: 008_experiencias_profissionais
Revises: 006_formacoes_academicas
Create Date: 2025-12-18 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008_experiencias_profissionais'
down_revision = '006_formacoes_academicas'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Criar tabela experiencias_profissionais
    op.create_table(
        'experiencias_profissionais',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.String(), nullable=False),
        sa.Column('cargo', sa.String(255), nullable=False),
        sa.Column('empresa', sa.String(255), nullable=False),
        sa.Column('periodo', sa.String(100), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.cpf'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Adicionar coluna experiencia_profissional à tabela candidates se não existir
    try:
        op.add_column('candidates', sa.Column('experiencia_profissional', sa.Text(), nullable=True))
    except Exception:
        # Coluna pode já existir
        pass


def downgrade() -> None:
    # Remover coluna experiencia_profissional da tabela candidates
    try:
        op.drop_column('candidates', 'experiencia_profissional')
    except Exception:
        pass
    
    # Remover tabela experiencias_profissionais
    op.drop_table('experiencias_profissionais')
