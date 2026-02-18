"""add adaptive test session table

Revision ID: 005_adaptive_test
Revises: 004_candidates_onboarding
Create Date: 2025-12-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_adaptive_test'
down_revision = '004_candidates_onboarding'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Criar tabela adaptive_test_sessions
    op.create_table(
        'adaptive_test_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('habilidade', sa.String(length=200), nullable=False),
        sa.Column('nivel_atual', sa.String(length=20), nullable=False, server_default='basico'),
        sa.Column('questao_atual_index', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('acertos_basico', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_basico', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('acertos_intermediario', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_intermediario', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('acertos_avancado', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_avancado', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('historico_respostas', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('nivel_final_atingido', sa.String(length=50), nullable=True),
        sa.Column('pontuacao_final', sa.Float(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_adaptive_test_sessions_id'), 'adaptive_test_sessions', ['id'], unique=False)
    op.create_index('ix_adaptive_test_sessions_candidate', 'adaptive_test_sessions', ['candidate_id'], unique=False)
    op.create_index('ix_adaptive_test_sessions_habilidade', 'adaptive_test_sessions', ['habilidade'], unique=False)


def downgrade() -> None:
    # Remover índices
    op.drop_index('ix_adaptive_test_sessions_habilidade', table_name='adaptive_test_sessions')
    op.drop_index('ix_adaptive_test_sessions_candidate', table_name='adaptive_test_sessions')
    op.drop_index(op.f('ix_adaptive_test_sessions_id'), table_name='adaptive_test_sessions')
    
    # Remover tabela
    op.drop_table('adaptive_test_sessions')
