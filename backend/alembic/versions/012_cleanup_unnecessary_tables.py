"""Remove tabelas desnecessárias e mantém apenas as críticas

Revision ID: 012_cleanup_unnecessary_tables
Revises: 011_competency_platform_v2
Create Date: 2025-12-23 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '012_cleanup_unnecessary_tables'
down_revision = '011_competency_platform_v2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Remove tabelas desnecessárias mantendo apenas:
    - users
    - candidates
    - companies
    - jobs
    - tests
    - competencias
    - autoavaliacao_competencias
    - candidato_testes
    - vaga_requisitos
    - vaga_candidatos
    - password_resets
    """
    
    # Tabelas para remover (na ordem correta de dependências)
    # Cada drop_table tem if_exists=True para ignorar se não existir
    
    op.execute("DROP TABLE IF EXISTS job_applications CASCADE")
    op.execute("DROP TABLE IF EXISTS screening_questions CASCADE")
    op.execute("DROP TABLE IF EXISTS questions CASCADE")
    op.execute("DROP TABLE IF EXISTS adaptive_test_sessions CASCADE")
    op.execute("DROP TABLE IF EXISTS alternatives CASCADE")
    op.execute("DROP TABLE IF EXISTS experiencias_profissionais CASCADE")
    op.execute("DROP TABLE IF EXISTS formacoes_academicas CASCADE")
    op.execute("DROP TABLE IF EXISTS company_users CASCADE")
    op.execute("DROP TABLE IF EXISTS autoavaliacoes CASCADE")


def downgrade() -> None:
    """
    Não é viável fazer downgrade de drop tables.
    Use um backup do banco de dados se precisar.
    """
    pass
