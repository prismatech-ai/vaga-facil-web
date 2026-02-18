"""Fix tipo_pcd enum values to lowercase

Revision ID: 009_fix_tipo_pcd_enum
Revises: 008_experiencias_profissionais
Create Date: 2025-12-21

This migration updates the tipo_pcd enum type in PostgreSQL to use lowercase
values to match the Python enum definition.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '009_fix_tipo_pcd_enum'
down_revision = '008_experiencias_profissionais'
branch_labels = None
depends_on = None


def upgrade():
    # Rename old enum
    op.execute('ALTER TYPE tipo_pcd RENAME TO tipo_pcd_old')
    
    # Create new enum with lowercase values
    op.execute("""
        CREATE TYPE tipo_pcd AS ENUM (
            'fisica',
            'auditiva',
            'visual',
            'intelectual',
            'multipla',
            'psicossocial'
        )
    """)
    
    # Update the column to use the new enum type
    op.execute("""
        ALTER TABLE candidates
        ALTER COLUMN tipo_pcd TYPE tipo_pcd
        USING tipo_pcd::text::tipo_pcd
    """)
    
    # Drop the old enum
    op.execute('DROP TYPE tipo_pcd_old')


def downgrade():
    # Rename new enum
    op.execute('ALTER TYPE tipo_pcd RENAME TO tipo_pcd_new')
    
    # Create old enum with capitalized values
    op.execute("""
        CREATE TYPE tipo_pcd AS ENUM (
            'Física',
            'Auditiva',
            'Visual',
            'Intelectual',
            'Múltipla',
            'Psicossocial'
        )
    """)
    
    # Update the column back to old enum type
    op.execute("""
        ALTER TABLE candidates
        ALTER COLUMN tipo_pcd TYPE tipo_pcd
        USING tipo_pcd::text::tipo_pcd
    """)
    
    # Drop the new enum
    op.execute('DROP TYPE tipo_pcd_new')
