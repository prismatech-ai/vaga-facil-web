"""add cascade to alternatives foreign key

Revision ID: 003_add_cascade
Revises: 
Create Date: 2025-12-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_add_cascade'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Remover a constraint antiga
    op.drop_constraint('alternatives_question_id_fkey', 'alternatives', type_='foreignkey')
    
    # Adicionar a constraint com ON DELETE CASCADE
    op.create_foreign_key(
        'alternatives_question_id_fkey',
        'alternatives', 'questions',
        ['question_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    # Remover a constraint com cascade
    op.drop_constraint('alternatives_question_id_fkey', 'alternatives', type_='foreignkey')
    
    # Recriar a constraint sem cascade
    op.create_foreign_key(
        'alternatives_question_id_fkey',
        'alternatives', 'questions',
        ['question_id'], ['id']
    )
