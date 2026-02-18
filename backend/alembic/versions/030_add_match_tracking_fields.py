"""add match tracking fields

Revision ID: 030
Revises: 029
Create Date: 2024-01-20

Adiciona campos para rastreamento de ordem de match e notificações ao cliente.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '030'
down_revision = '029'
branch_labels = None
depends_on = None


def upgrade():
    # Adicionar campos de rastreamento de match
    op.add_column('vaga_candidatos', sa.Column('numero_match', sa.Integer(), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('data_match', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('notificacao_match_enviada', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('data_notificacao_cliente', sa.DateTime(timezone=True), nullable=True))
    
    # Campos para controle de LI (Liberação de Identidade)
    op.add_column('vaga_candidatos', sa.Column('candidato_demonstrou_interesse', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('data_interesse_candidato', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('motivo_rejeicao_candidato', sa.Text(), nullable=True))
    
    # Campos para pré-seleção
    op.add_column('vaga_candidatos', sa.Column('pre_selecionado', sa.Boolean(), default=False))
    op.add_column('vaga_candidatos', sa.Column('data_pre_selecao', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vaga_candidatos', sa.Column('notas_pre_selecao', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('vaga_candidatos', 'notas_pre_selecao')
    op.drop_column('vaga_candidatos', 'data_pre_selecao')
    op.drop_column('vaga_candidatos', 'pre_selecionado')
    op.drop_column('vaga_candidatos', 'motivo_rejeicao_candidato')
    op.drop_column('vaga_candidatos', 'data_interesse_candidato')
    op.drop_column('vaga_candidatos', 'candidato_demonstrou_interesse')
    op.drop_column('vaga_candidatos', 'data_notificacao_cliente')
    op.drop_column('vaga_candidatos', 'notificacao_match_enviada')
    op.drop_column('vaga_candidatos', 'data_match')
    op.drop_column('vaga_candidatos', 'numero_match')
