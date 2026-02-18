"""Create experiencias_profissionais table

Revision ID: 014_experiencias_table
Revises: 013_formacoes_table
Create Date: 2025-12-27 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '014_experiencias_table'
down_revision = '013_formacoes_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Criar tabela experiencias_profissionais
    op.create_table(
        'experiencias_profissionais',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('cargo', sa.String(length=255), nullable=False),
        sa.Column('empresa', sa.String(length=255), nullable=False),
        sa.Column('periodo', sa.String(length=100), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_experiencias_profissionais_candidate_id'), 'experiencias_profissionais', ['candidate_id'])


def downgrade() -> None:
    # Remover tabela experiencias_profissionais
    op.drop_index(op.f('ix_experiencias_profissionais_candidate_id'), table_name='experiencias_profissionais')
    op.drop_table('experiencias_profissionais')
