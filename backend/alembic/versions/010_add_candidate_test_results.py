"""Add candidate_test_results table to store test submissions

Revision ID: 010_add_candidate_test_results
Revises: 009_fix_tipo_pcd_enum
Create Date: 2025-12-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010_add_candidate_test_results'
down_revision = '009_fix_tipo_pcd_enum'
branch_labels = None
depends_on = None


def upgrade():
    # Create candidate_test_results table
    op.create_table(
        'candidate_test_results',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('test_id', sa.Integer(), nullable=False),
        sa.Column('total_questoes', sa.Integer(), nullable=False),
        sa.Column('total_acertos', sa.Integer(), nullable=False),
        sa.Column('percentual_acerto', sa.Float(), nullable=False),
        sa.Column('tempo_decorrido', sa.Integer(), nullable=True),
        sa.Column('detalhes_questoes', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ),
        sa.ForeignKeyConstraint(['test_id'], ['tests.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_candidate_test_results_candidate_id'), 'candidate_test_results', ['candidate_id'], unique=False)
    op.create_index(op.f('ix_candidate_test_results_id'), 'candidate_test_results', ['id'], unique=False)
    op.create_index(op.f('ix_candidate_test_results_test_id'), 'candidate_test_results', ['test_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_candidate_test_results_test_id'), table_name='candidate_test_results')
    op.drop_index(op.f('ix_candidate_test_results_id'), table_name='candidate_test_results')
    op.drop_index(op.f('ix_candidate_test_results_candidate_id'), table_name='candidate_test_results')
    op.drop_table('candidate_test_results')
