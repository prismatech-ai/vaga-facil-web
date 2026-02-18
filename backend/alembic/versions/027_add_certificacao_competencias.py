"""
027 - Adicionar tabelas de Certificação de Competências (BD CC)

Revision ID: 027_add_certificacao_competencias
Revises: 026_escala_autoavaliacao_0_4
Create Date: 2026-02-16

Cria as tabelas:
- certificacao_sessoes: Sessões de teste de certificação
- certificacao_competencias: Resultados finais de certificação
- mapa_competencias: Mapa consolidado Auto x Certificação
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '027_add_certificacao_competencias'
down_revision = '026_escala_autoavaliacao_0_4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tabela de sessões de certificação
    op.create_table(
        'certificacao_sessoes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('competencia_nome', sa.String(255), nullable=False),
        sa.Column('competencia_id', sa.Integer(), nullable=True),
        
        # Estado atual do teste
        sa.Column('nivel_atual', sa.String(20), nullable=False, server_default='basico'),
        sa.Column('questao_atual_index', sa.Integer(), server_default='0'),
        
        # Contadores de acertos por nível
        sa.Column('acertos_basico', sa.Integer(), server_default='0'),
        sa.Column('total_basico', sa.Integer(), server_default='5'),
        sa.Column('acertos_intermediario', sa.Integer(), server_default='0'),
        sa.Column('total_intermediario', sa.Integer(), server_default='0'),
        sa.Column('acertos_avancado', sa.Integer(), server_default='0'),
        sa.Column('total_avancado', sa.Integer(), server_default='0'),
        
        # Histórico de respostas (JSON)
        sa.Column('historico_respostas', sa.JSON(), nullable=True),
        sa.Column('questoes_usadas', sa.JSON(), nullable=True),
        
        # Estado e resultado final
        sa.Column('is_completed', sa.Boolean(), server_default='false'),
        sa.Column('nivel_final_certificado', sa.Integer(), nullable=True),
        
        # Timestamps
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('tempo_total_segundos', sa.Integer(), nullable=True),
        
        # Primary key
        sa.PrimaryKeyConstraint('id')
    )
    
    # Índices para certificacao_sessoes
    op.create_index('ix_certificacao_sessoes_candidate_id', 'certificacao_sessoes', ['candidate_id'])
    op.create_index('ix_certificacao_sessoes_competencia', 'certificacao_sessoes', ['competencia_nome'])
    op.create_index('ix_certificacao_sessoes_is_completed', 'certificacao_sessoes', ['is_completed'])
    
    # Foreign keys para certificacao_sessoes
    op.create_foreign_key(
        'fk_certificacao_sessoes_candidate',
        'certificacao_sessoes', 'candidates',
        ['candidate_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_certificacao_sessoes_competencia',
        'certificacao_sessoes', 'competencias',
        ['competencia_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Tabela de resultados de certificação
    op.create_table(
        'certificacao_competencias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('competencia_id', sa.Integer(), nullable=True),
        sa.Column('competencia_nome', sa.String(255), nullable=False),
        sa.Column('sessao_id', sa.Integer(), nullable=False),
        
        # Resultado da certificação (0-4)
        sa.Column('nivel_certificado', sa.Integer(), nullable=False),
        
        # Detalhes do resultado
        sa.Column('acertos_basico', sa.Integer(), server_default='0'),
        sa.Column('acertos_intermediario', sa.Integer(), server_default='0'),
        sa.Column('acertos_avancado', sa.Integer(), server_default='0'),
        
        # Comparação com autoavaliação
        sa.Column('nivel_autoavaliacao', sa.Integer(), nullable=True),
        sa.Column('diferenca_auto_cert', sa.Integer(), nullable=True),
        
        # Validade
        sa.Column('valido_ate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_valido', sa.Boolean(), server_default='true'),
        
        # Timestamps
        sa.Column('certified_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        
        # Primary key
        sa.PrimaryKeyConstraint('id')
    )
    
    # Índices para certificacao_competencias
    op.create_index('ix_certificacao_competencias_candidate_id', 'certificacao_competencias', ['candidate_id'])
    op.create_index('ix_certificacao_competencias_competencia', 'certificacao_competencias', ['competencia_nome'])
    op.create_index('ix_certificacao_competencias_nivel', 'certificacao_competencias', ['nivel_certificado'])
    op.create_index('ix_certificacao_competencias_is_valido', 'certificacao_competencias', ['is_valido'])
    
    # Foreign keys para certificacao_competencias
    op.create_foreign_key(
        'fk_certificacao_competencias_candidate',
        'certificacao_competencias', 'candidates',
        ['candidate_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_certificacao_competencias_competencia',
        'certificacao_competencias', 'competencias',
        ['competencia_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_certificacao_competencias_sessao',
        'certificacao_competencias', 'certificacao_sessoes',
        ['sessao_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # Constraint para nivel certificado (0-4)
    op.create_check_constraint(
        'chk_nivel_certificado_0_4',
        'certificacao_competencias',
        'nivel_certificado >= 0 AND nivel_certificado <= 4'
    )
    
    # Tabela do mapa de competências (Auto x Certificação)
    op.create_table(
        'mapa_competencias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('competencia_nome', sa.String(255), nullable=False),
        sa.Column('competencia_id', sa.Integer(), nullable=True),
        
        # Níveis
        sa.Column('nivel_autoavaliacao', sa.Integer(), nullable=True),
        sa.Column('nivel_certificado', sa.Integer(), nullable=True),
        
        # Análise
        sa.Column('diferenca', sa.Integer(), nullable=True),
        sa.Column('confiabilidade', sa.String(50), nullable=True),
        
        # Timestamps
        sa.Column('atualizado_em', sa.DateTime(timezone=True), server_default=sa.func.now()),
        
        # Primary key
        sa.PrimaryKeyConstraint('id')
    )
    
    # Índices para mapa_competencias
    op.create_index('ix_mapa_competencias_candidate_id', 'mapa_competencias', ['candidate_id'])
    op.create_index('ix_mapa_competencias_competencia', 'mapa_competencias', ['competencia_nome'])
    
    # Unique constraint: um candidato só pode ter um registro por competência no mapa
    op.create_unique_constraint(
        'uq_mapa_competencias_candidate_competencia',
        'mapa_competencias',
        ['candidate_id', 'competencia_nome']
    )
    
    # Foreign keys para mapa_competencias
    op.create_foreign_key(
        'fk_mapa_competencias_candidate',
        'mapa_competencias', 'candidates',
        ['candidate_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_mapa_competencias_competencia',
        'mapa_competencias', 'competencias',
        ['competencia_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Remover tabelas na ordem inversa
    op.drop_table('mapa_competencias')
    op.drop_table('certificacao_competencias')
    op.drop_table('certificacao_sessoes')
