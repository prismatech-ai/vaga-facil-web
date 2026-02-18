"""Add pipeline flow states and payment/warranty fields

Revision ID: 025_add_pipeline_flow_states
Revises: 024_add_candidate_status
Create Date: 2026-02-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '025_add_pipeline_flow_states'
down_revision = '024_add_candidate_status'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Adicionar novos valores ao enum StatusKanbanCandidato
    # PostgreSQL: ALTER TYPE ... ADD VALUE
    op.execute("ALTER TYPE statuskanban_candidato ADD VALUE IF NOT EXISTS 'contratado'")
    op.execute("ALTER TYPE statuskanban_candidato ADD VALUE IF NOT EXISTS 'em_garantia'")
    op.execute("ALTER TYPE statuskanban_candidato ADD VALUE IF NOT EXISTS 'garantia_finalizada'")
    op.execute("ALTER TYPE statuskanban_candidato ADD VALUE IF NOT EXISTS 'reembolso_solicitado'")
    
    # Adicionar campos de pagamento à tabela vaga_candidatos
    op.add_column('vaga_candidatos', sa.Column('valor_taxa', sa.Float(), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('pagamento_pendente', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('pagamento_confirmado', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('data_pagamento', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('metodo_pagamento', sa.String(50), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('id_transacao', sa.String(100), nullable=True))
    
    # Campos de garantia
    op.add_column('vaga_candidatos', sa.Column('data_inicio_trabalho', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('garantia_iniciada', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('data_inicio_garantia', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('data_fim_garantia', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('garantia_ativa', sa.Boolean(), default=False))
    
    # Campos de reembolso
    op.add_column('vaga_candidatos', sa.Column('reembolso_solicitado', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('data_solicitacao_reembolso', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('motivo_reembolso', sa.Text(), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('valor_reembolso', sa.Float(), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('reembolso_aprovado', sa.Boolean(), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('data_aprovacao_reembolso', sa.DateTime(timezone=True), nullable=True))
    
    # Campos de desligamento
    op.add_column('vaga_candidatos', sa.Column('data_desligamento', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('motivo_desligamento', sa.Text(), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('tipo_desligamento', sa.String(50), nullable=True))  # demissao_sem_justa_causa, pedido_demissao, nao_adaptacao
    
    # Campos de notificação
    op.add_column('vaga_candidatos', sa.Column('ultima_notificacao_enviada', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('contagem_lembretes', sa.Integer(), default=0))
    
    # Criar tabela de histórico de notificações
    op.create_table(
        'notificacoes_enviadas',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('vaga_candidato_id', sa.Integer(), sa.ForeignKey('vaga_candidatos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tipo_notificacao', sa.String(100), nullable=False),
        sa.Column('canal', sa.String(50), nullable=False),  # email, push, sms
        sa.Column('destinatario', sa.String(255), nullable=False),
        sa.Column('assunto', sa.String(500), nullable=True),
        sa.Column('conteudo_resumo', sa.Text(), nullable=True),
        sa.Column('enviado_com_sucesso', sa.Boolean(), default=False),
        sa.Column('erro_envio', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Criar tabela de configuração de preços por nível
    op.create_table(
        'config_precos',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('nivel', sa.String(50), nullable=False),  # junior, pleno, senior
        sa.Column('area', sa.String(100), nullable=True),  # opcional, para preços por área
        sa.Column('valor_minimo', sa.Float(), nullable=False),
        sa.Column('valor_maximo', sa.Float(), nullable=False),
        sa.Column('valor_padrao', sa.Float(), nullable=False),
        sa.Column('ativo', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Inserir preços padrão
    op.execute("""
        INSERT INTO config_precos (nivel, valor_minimo, valor_maximo, valor_padrao, ativo) VALUES
        ('junior', 2000, 3500, 2500, true),
        ('pleno', 3500, 6000, 4500, true),
        ('senior', 6000, 10000, 7500, true)
    """)


def downgrade() -> None:
    # Remover tabelas criadas
    op.drop_table('config_precos')
    op.drop_table('notificacoes_enviadas')
    
    # Remover colunas de pagamento
    op.drop_column('vaga_candidatos', 'valor_taxa')
    op.drop_column('vaga_candidatos', 'pagamento_pendente')
    op.drop_column('vaga_candidatos', 'pagamento_confirmado')
    op.drop_column('vaga_candidatos', 'data_pagamento')
    op.drop_column('vaga_candidatos', 'metodo_pagamento')
    op.drop_column('vaga_candidatos', 'id_transacao')
    
    # Remover colunas de garantia
    op.drop_column('vaga_candidatos', 'data_inicio_trabalho')
    op.drop_column('vaga_candidatos', 'garantia_iniciada')
    op.drop_column('vaga_candidatos', 'data_inicio_garantia')
    op.drop_column('vaga_candidatos', 'data_fim_garantia')
    op.drop_column('vaga_candidatos', 'garantia_ativa')
    
    # Remover colunas de reembolso
    op.drop_column('vaga_candidatos', 'reembolso_solicitado')
    op.drop_column('vaga_candidatos', 'data_solicitacao_reembolso')
    op.drop_column('vaga_candidatos', 'motivo_reembolso')
    op.drop_column('vaga_candidatos', 'valor_reembolso')
    op.drop_column('vaga_candidatos', 'reembolso_aprovado')
    op.drop_column('vaga_candidatos', 'data_aprovacao_reembolso')
    
    # Remover colunas de desligamento
    op.drop_column('vaga_candidatos', 'data_desligamento')
    op.drop_column('vaga_candidatos', 'motivo_desligamento')
    op.drop_column('vaga_candidatos', 'tipo_desligamento')
    
    # Remover colunas de notificação
    op.drop_column('vaga_candidatos', 'ultima_notificacao_enviada')
    op.drop_column('vaga_candidatos', 'contagem_lembretes')
    
    # Nota: Não é possível remover valores de um ENUM no PostgreSQL sem recriar o tipo
