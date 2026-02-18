"""Create tests and questions tables

Revision ID: 015_tests_and_questions_table
Revises: 014_experiencias_table
Create Date: 2025-12-29 20:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '015_tests_and_questions_table'
down_revision = '014_experiencias_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create tests, questions, and alternatives tables"""
    
    # Create tests table
    op.create_table(
        'tests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(200), nullable=False),
        sa.Column('habilidade', sa.String(200), nullable=False),
        sa.Column('nivel', sa.String(50), nullable=False),  # Changed from Enum to String
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('idx_tests_created_by', 'created_by'),
        sa.Index('idx_tests_habilidade', 'habilidade')
    )

    # Create questions table
    op.create_table(
        'questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('test_id', sa.Integer(), nullable=False),
        sa.Column('texto_questao', sa.Text(), nullable=False),
        sa.Column('ordem', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['test_id'], ['tests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('idx_questions_test_id', 'test_id')
    )

    # Create alternatives table
    op.create_table(
        'alternatives',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('ordem', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('idx_alternatives_question_id', 'question_id')
    )

    # Create adaptive_test_sessions table if not exists
    op.create_table(
        'adaptive_test_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('habilidade', sa.String(200), nullable=False),
        sa.Column('nivel_atual', sa.String(20), nullable=False, server_default='basico'),
        sa.Column('questao_atual_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('acertos_basico', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_basico', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('acertos_intermediario', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_intermediario', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('acertos_avancado', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_avancado', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('historico_respostas', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('nivel_final_atingido', sa.String(50), nullable=True),
        sa.Column('pontuacao_final', sa.Float(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('idx_adaptive_test_sessions_candidate', 'candidate_id'),
        sa.Index('idx_adaptive_test_sessions_habilidade', 'habilidade')
    )


def downgrade() -> None:
    """Drop tables in reverse order"""
    op.drop_index('idx_adaptive_test_sessions_habilidade')
    op.drop_index('idx_adaptive_test_sessions_candidate')
    op.drop_table('adaptive_test_sessions')
    
    op.drop_index('idx_alternatives_question_id')
    op.drop_table('alternatives')
    
    op.drop_index('idx_questions_test_id')
    op.drop_table('questions')
    
    op.drop_index('idx_tests_habilidade')
    op.drop_index('idx_tests_created_by')
    op.drop_table('tests')
