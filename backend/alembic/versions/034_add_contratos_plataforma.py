"""Add contratos_plataforma and termos_confidencialidade tables

Revision ID: 034
Revises: 033
Create Date: 2024-02-16

Adiciona tabelas para:
- Contratos da plataforma (aceite de termos de uso)
- Termos de confidencialidade por vaga
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '034_add_contratos_plataforma'
down_revision = '033_add_cobrancas'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Criar enum tipos
    tipo_contrato_enum = sa.Enum('padrao', 'enterprise', 'teste', name='tipocontrato', create_type=False)
    status_contrato_enum = sa.Enum('rascunho', 'ativo', 'vencido', 'cancelado', 'suspenso', name='statuscontrato', create_type=False)
    
    # Criar tipos enum se não existirem
    op.execute("CREATE TYPE IF NOT EXISTS tipocontrato AS ENUM ('padrao', 'enterprise', 'teste')")
    op.execute("CREATE TYPE IF NOT EXISTS statuscontrato AS ENUM ('rascunho', 'ativo', 'vencido', 'cancelado', 'suspenso')")
    
    # Tabela de contratos da plataforma
    op.create_table(
        'contratos_plataforma',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('empresa_id', sa.Integer(), nullable=False),
        sa.Column('vaga_id', sa.Integer(), nullable=True),
        sa.Column('tipo', tipo_contrato_enum, server_default='padrao', nullable=False),
        sa.Column('status', status_contrato_enum, server_default='rascunho', nullable=False),
        sa.Column('versao_termos', sa.String(20), server_default='1.0', nullable=False),
        sa.Column('data_criacao', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('data_aceite', sa.DateTime(timezone=True), nullable=True),
        sa.Column('data_vigencia_inicio', sa.DateTime(timezone=True), nullable=True),
        sa.Column('data_vigencia_fim', sa.DateTime(timezone=True), nullable=True),
        sa.Column('data_cancelamento', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_aceite', sa.String(50), nullable=True),
        sa.Column('user_agent_aceite', sa.String(500), nullable=True),
        sa.Column('usuario_aceite_id', sa.Integer(), nullable=True),
        sa.Column('aceite_termos_uso', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('aceite_politica_privacidade', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('aceite_regras_cobranca', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('aceite_confidencialidade', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('hash_documento', sa.String(64), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('motivo_cancelamento', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['empresa_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['vaga_id'], ['jobs.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['usuario_aceite_id'], ['users.id'], ondelete='SET NULL'),
    )
    
    # Índices para a tabela de contratos
    op.create_index('ix_contratos_plataforma_empresa_id', 'contratos_plataforma', ['empresa_id'])
    op.create_index('ix_contratos_plataforma_status', 'contratos_plataforma', ['status'])
    op.create_index('ix_contratos_plataforma_data_vigencia_fim', 'contratos_plataforma', ['data_vigencia_fim'])
    
    # Tabela de termos de confidencialidade
    op.create_table(
        'termos_confidencialidade',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('empresa_id', sa.Integer(), nullable=False),
        sa.Column('vaga_id', sa.Integer(), nullable=False),
        sa.Column('data_aceite', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('ip_aceite', sa.String(50), nullable=True),
        sa.Column('usuario_aceite_id', sa.Integer(), nullable=True),
        sa.Column('aceite_nao_divulgar_candidatos', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('aceite_nao_contatar_diretamente', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('aceite_destruir_dados_rejeicao', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['empresa_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['vaga_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_aceite_id'], ['users.id'], ondelete='SET NULL'),
    )
    
    # Índices para a tabela de termos
    op.create_index('ix_termos_confidencialidade_empresa_id', 'termos_confidencialidade', ['empresa_id'])
    op.create_index('ix_termos_confidencialidade_vaga_id', 'termos_confidencialidade', ['vaga_id'])
    
    # Adicionar campos na tabela companies para controle de aceite
    op.add_column('companies', sa.Column('contrato_ativo', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('companies', sa.Column('data_aceite_termos', sa.DateTime(timezone=True), nullable=True))
    op.add_column('companies', sa.Column('versao_termos_aceitos', sa.String(20), nullable=True))


def downgrade() -> None:
    # Remover colunas da tabela companies
    op.drop_column('companies', 'versao_termos_aceitos')
    op.drop_column('companies', 'data_aceite_termos')
    op.drop_column('companies', 'contrato_ativo')
    
    # Remover índices
    op.drop_index('ix_termos_confidencialidade_vaga_id', table_name='termos_confidencialidade')
    op.drop_index('ix_termos_confidencialidade_empresa_id', table_name='termos_confidencialidade')
    op.drop_index('ix_contratos_plataforma_data_vigencia_fim', table_name='contratos_plataforma')
    op.drop_index('ix_contratos_plataforma_status', table_name='contratos_plataforma')
    op.drop_index('ix_contratos_plataforma_empresa_id', table_name='contratos_plataforma')
    
    # Remover tabelas
    op.drop_table('termos_confidencialidade')
    op.drop_table('contratos_plataforma')
    
    # Remover enums
    op.execute("DROP TYPE IF EXISTS statuscontrato")
    op.execute("DROP TYPE IF EXISTS tipocontrato")
