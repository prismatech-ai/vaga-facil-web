"""add servicos adicionais

Revision ID: 029
Revises: 028
Create Date: 2024-01-20

Adiciona campos para serviços adicionais (teste soft skills, entrevista técnica)
e tabela de configuração de preços de serviços.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '029'
down_revision = '028'
branch_labels = None
depends_on = None


def upgrade():
    # Criar tabela de configuração de preços de serviços
    op.create_table(
        'config_servicos',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('codigo', sa.String(50), nullable=False, unique=True),
        sa.Column('nome', sa.String(100), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('valor', sa.Float(), nullable=False),
        sa.Column('ativo', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    
    # Inserir configurações padrão de serviços
    op.execute("""
        INSERT INTO config_servicos (codigo, nome, descricao, valor, ativo)
        VALUES 
            ('SOFT_SKILLS', 'Teste de Soft Skills', 'Avaliação comportamental e de competências interpessoais', 150.00, true),
            ('ENTREVISTA_TECNICA', 'Entrevista Técnica', 'Entrevista técnica conduzida por especialista da área', 300.00, true),
            ('TAXA_SUCESSO_JUNIOR', 'Taxa de Sucesso - Júnior', 'Taxa cobrada na contratação de profissional júnior', 1500.00, true),
            ('TAXA_SUCESSO_PLENO', 'Taxa de Sucesso - Pleno', 'Taxa cobrada na contratação de profissional pleno', 2500.00, true),
            ('TAXA_SUCESSO_SENIOR', 'Taxa de Sucesso - Sênior', 'Taxa cobrada na contratação de profissional sênior', 4000.00, true)
    """)
    
    # Adicionar campos de serviços adicionais à tabela vaga_candidatos
    op.add_column('vaga_candidatos', sa.Column('solicita_teste_soft_skills', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('solicita_entrevista_tecnica', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('valor_servicos_adicionais', sa.Float(), nullable=True))
    
    # Campos de acordo de exclusividade
    op.add_column('vaga_candidatos', sa.Column('acordo_exclusividade_aceito', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('data_acordo_exclusividade', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('texto_acordo_exclusividade', sa.Text(), nullable=True))
    
    # Campos de link de pagamento
    op.add_column('vaga_candidatos', sa.Column('link_pagamento_gerado', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('data_envio_link_pagamento', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('link_pagamento_url', sa.String(500), nullable=True))
    
    # Status dos serviços adicionais
    op.add_column('vaga_candidatos', sa.Column('soft_skills_realizado', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('soft_skills_resultado', sa.Text(), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('entrevista_tecnica_realizada', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('entrevista_tecnica_resultado', sa.Text(), nullable=True))


def downgrade():
    # Remover campos de vaga_candidatos
    op.drop_column('vaga_candidatos', 'entrevista_tecnica_resultado')
    op.drop_column('vaga_candidatos', 'entrevista_tecnica_realizada')
    op.drop_column('vaga_candidatos', 'soft_skills_resultado')
    op.drop_column('vaga_candidatos', 'soft_skills_realizado')
    op.drop_column('vaga_candidatos', 'link_pagamento_url')
    op.drop_column('vaga_candidatos', 'data_envio_link_pagamento')
    op.drop_column('vaga_candidatos', 'link_pagamento_gerado')
    op.drop_column('vaga_candidatos', 'texto_acordo_exclusividade')
    op.drop_column('vaga_candidatos', 'data_acordo_exclusividade')
    op.drop_column('vaga_candidatos', 'acordo_exclusividade_aceito')
    op.drop_column('vaga_candidatos', 'valor_servicos_adicionais')
    op.drop_column('vaga_candidatos', 'solicita_entrevista_tecnica')
    op.drop_column('vaga_candidatos', 'solicita_teste_soft_skills')
    
    # Remover tabela de configuração
    op.drop_table('config_servicos')
