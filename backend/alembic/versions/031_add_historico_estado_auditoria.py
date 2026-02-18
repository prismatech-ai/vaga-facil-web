"""Add historico_estado_pipeline and SELECIONADO status

Revision ID: 031_add_historico_estado_auditoria
Revises: 030_add_match_tracking_fields
Create Date: 2026-02-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '031_add_historico_estado_auditoria'
down_revision = '030_add_match_tracking_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Adicionar novo valor ao enum StatusKanbanCandidato
    op.execute("ALTER TYPE statuskanban_candidato ADD VALUE IF NOT EXISTS 'selecionado'")
    
    # 2. Criar tabela de histórico/auditoria de estados
    op.create_table(
        'historico_estado_pipeline',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vaga_candidato_id', sa.Integer(), nullable=False),
        sa.Column('estado_anterior', sa.String(100), nullable=True),
        sa.Column('estado_novo', sa.String(100), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('tipo_usuario', sa.String(50), nullable=True),
        sa.Column('motivo', sa.Text(), nullable=True),
        sa.Column('dados_adicionais', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('automatico', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['vaga_candidato_id'], ['vaga_candidatos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['users.id'], ondelete='SET NULL'),
    )
    
    # 3. Criar índices para consultas frequentes
    op.create_index('ix_historico_estado_pipeline_id', 'historico_estado_pipeline', ['id'])
    op.create_index('ix_historico_estado_pipeline_vaga_candidato_id', 'historico_estado_pipeline', ['vaga_candidato_id'])
    op.create_index('ix_historico_estado_pipeline_created_at', 'historico_estado_pipeline', ['created_at'])
    op.create_index('ix_historico_estado_pipeline_estado_novo', 'historico_estado_pipeline', ['estado_novo'])
    
    # 4. Adicionar campo de visibilidade na tabela vaga_candidatos
    op.add_column('vaga_candidatos', sa.Column('visivel_outras_vagas', sa.Boolean(), default=True))
    op.add_column('vaga_candidatos', sa.Column('data_selecao', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('notas_selecao', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remover colunas adicionadas
    op.drop_column('vaga_candidatos', 'notas_selecao')
    op.drop_column('vaga_candidatos', 'data_selecao')
    op.drop_column('vaga_candidatos', 'visivel_outras_vagas')
    
    # Remover índices
    op.drop_index('ix_historico_estado_pipeline_estado_novo', 'historico_estado_pipeline')
    op.drop_index('ix_historico_estado_pipeline_created_at', 'historico_estado_pipeline')
    op.drop_index('ix_historico_estado_pipeline_vaga_candidato_id', 'historico_estado_pipeline')
    op.drop_index('ix_historico_estado_pipeline_id', 'historico_estado_pipeline')
    
    # Remover tabela
    op.drop_table('historico_estado_pipeline')
    
    # Nota: não é possível remover valores de enum no PostgreSQL de forma simples
