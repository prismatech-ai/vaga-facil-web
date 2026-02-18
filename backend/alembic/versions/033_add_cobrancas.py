"""Add cobrancas table for payment control

Revision ID: 033_add_cobrancas
Revises: 032_add_garantia_candidato_fields
Create Date: 2026-02-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '033_add_cobrancas'
down_revision = '032_add_garantia_candidato_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Criar enum para status da cobrança
    status_cobranca = sa.Enum('pendente', 'pago', 'vencido', 'cancelado', 'reembolsado', name='statuscobranca')
    status_cobranca.create(op.get_bind(), checkfirst=True)
    
    # Criar enum para tipo de cobrança
    tipo_cobranca = sa.Enum('taxa_sucesso', 'servico_adicional', 'taxa_sucesso_parcial', name='tipocobranca')
    tipo_cobranca.create(op.get_bind(), checkfirst=True)
    
    # Criar enum para método de pagamento
    metodo_pagamento = sa.Enum('pix', 'boleto', 'cartao', name='metodopagamento')
    metodo_pagamento.create(op.get_bind(), checkfirst=True)
    
    # Criar tabela de cobranças
    op.create_table(
        'cobrancas',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        
        # Referências
        sa.Column('vaga_candidato_id', sa.Integer(), sa.ForeignKey('vaga_candidatos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('empresa_id', sa.Integer(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('vaga_id', sa.Integer(), sa.ForeignKey('jobs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('candidato_id', sa.Integer(), sa.ForeignKey('candidates.id', ondelete='SET NULL'), nullable=True),
        
        # Tipo e status
        sa.Column('tipo', tipo_cobranca, default='taxa_sucesso', nullable=False),
        sa.Column('status', status_cobranca, default='pendente', nullable=False),
        
        # Valores
        sa.Column('remuneracao_anual', sa.Float(), nullable=False),
        sa.Column('percentual_taxa', sa.Float(), nullable=False),
        sa.Column('valor_taxa', sa.Float(), nullable=False),
        sa.Column('valor_servicos_adicionais', sa.Float(), default=0),
        sa.Column('valor_total', sa.Float(), nullable=False),
        sa.Column('valor_pago', sa.Float(), nullable=True),
        
        # Descrição da faixa
        sa.Column('descricao_faixa', sa.String(100), nullable=True),
        
        # Datas
        sa.Column('data_emissao', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('data_vencimento', sa.DateTime(timezone=True), nullable=False),
        sa.Column('data_pagamento', sa.DateTime(timezone=True), nullable=True),
        sa.Column('data_cancelamento', sa.DateTime(timezone=True), nullable=True),
        
        # Dados do pagamento
        sa.Column('metodo_pagamento', metodo_pagamento, nullable=True),
        sa.Column('id_transacao', sa.String(100), nullable=True),
        
        # Dados do boleto
        sa.Column('codigo_boleto', sa.String(50), nullable=True),
        sa.Column('linha_digitavel', sa.String(60), nullable=True),
        sa.Column('url_boleto', sa.String(500), nullable=True),
        
        # Dados do PIX
        sa.Column('pix_copia_cola', sa.Text(), nullable=True),
        sa.Column('pix_qr_code', sa.Text(), nullable=True),
        
        # Controle de lembretes
        sa.Column('lembrete_7_dias_enviado', sa.Boolean(), default=False),
        sa.Column('lembrete_3_dias_enviado', sa.Boolean(), default=False),
        sa.Column('lembrete_1_dia_enviado', sa.Boolean(), default=False),
        sa.Column('lembrete_vencido_enviado', sa.Boolean(), default=False),
        
        # Observações
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('motivo_cancelamento', sa.Text(), nullable=True),
        
        # Auditoria
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Criar índices
    op.create_index('ix_cobrancas_empresa_id', 'cobrancas', ['empresa_id'])
    op.create_index('ix_cobrancas_vaga_candidato_id', 'cobrancas', ['vaga_candidato_id'])
    op.create_index('ix_cobrancas_status', 'cobrancas', ['status'])
    op.create_index('ix_cobrancas_data_vencimento', 'cobrancas', ['data_vencimento'])


def downgrade() -> None:
    # Remover índices
    op.drop_index('ix_cobrancas_data_vencimento', table_name='cobrancas')
    op.drop_index('ix_cobrancas_status', table_name='cobrancas')
    op.drop_index('ix_cobrancas_vaga_candidato_id', table_name='cobrancas')
    op.drop_index('ix_cobrancas_empresa_id', table_name='cobrancas')
    
    # Remover tabela
    op.drop_table('cobrancas')
    
    # Remover enums
    sa.Enum(name='metodopagamento').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='tipocobranca').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='statuscobranca').drop(op.get_bind(), checkfirst=True)
