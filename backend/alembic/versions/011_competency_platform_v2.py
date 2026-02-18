"""Add competency-based matching platform tables - Version 2

Revision ID: 011_competency_platform_v2
Revises: 010_add_candidate_test_results
Create Date: 2025-12-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '011_competency_platform_v2'
down_revision = '010_add_candidate_test_results'
branch_labels = None
depends_on = None


def upgrade():
    # Criar tabela competencias PRIMEIRO (sem dependências)
    op.create_table(
        'competencias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('area', sa.String(50), nullable=False),  # String ao invés de ENUM para mais flexibilidade
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('categoria', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_competencias_area', 'competencias', ['area'])
    
    # Adicionar coluna area_atuacao na tabela jobs (nullable inicialmente)
    op.add_column('jobs', sa.Column('area_atuacao', sa.String(50), nullable=True))
    
    # Adicionar colunas na tabela candidates
    op.add_column('candidates', sa.Column('area_atuacao', sa.String(50), nullable=True))
    op.add_column('candidates', sa.Column('status_onboarding', sa.String(50), server_default='cadastro_inicial'))
    
    # Criar tabela autoavaliacao_competencias
    op.create_table(
        'autoavaliacao_competencias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('competencia_id', sa.Integer(), nullable=False),
        sa.Column('nivel_declarado', sa.String(2), nullable=False),  # '1', '2', '3', '4'
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['competencia_id'], ['competencias.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('candidate_id', 'competencia_id', name='uq_autoavaliacao_candidate_competencia')
    )
    op.create_index('ix_autoavaliacao_competencias_candidate_id', 'autoavaliacao_competencias', ['candidate_id'])
    
    # Criar tabela candidato_testes
    op.create_table(
        'candidato_testes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('test_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pendente'),
        sa.Column('pontuacao', sa.Float(), nullable=True),
        sa.Column('tempo_decorrido', sa.Integer(), nullable=True),
        sa.Column('iniciado_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('concluido_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['test_id'], ['tests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_candidato_testes_candidate_id', 'candidato_testes', ['candidate_id'])
    op.create_index('ix_candidato_testes_test_id', 'candidato_testes', ['test_id'])
    
    # Criar tabela vaga_requisitos
    op.create_table(
        'vaga_requisitos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vaga_id', sa.Integer(), nullable=False),
        sa.Column('competencia_id', sa.Integer(), nullable=False),
        sa.Column('nivel_minimo', sa.String(2), nullable=False),  # '1', '2', '3', '4'
        sa.Column('teste_obrigatorio', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['vaga_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['competencia_id'], ['competencias.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_vaga_requisitos_vaga_id', 'vaga_requisitos', ['vaga_id'])
    op.create_index('ix_vaga_requisitos_competencia_id', 'vaga_requisitos', ['competencia_id'])
    
    # Criar tabela vaga_candidatos
    op.create_table(
        'vaga_candidatos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vaga_id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('status_kanban', sa.String(50), server_default='avaliacao_competencias', nullable=False),
        sa.Column('empresa_demonstrou_interesse', sa.Boolean(), server_default='false'),
        sa.Column('data_interesse', sa.DateTime(timezone=True), nullable=True),
        sa.Column('consentimento_entrevista', sa.Boolean(), server_default='false'),
        sa.Column('data_consentimento', sa.DateTime(timezone=True), nullable=True),
        sa.Column('dados_pessoais_liberados', sa.Boolean(), server_default='false'),
        sa.Column('excluido_por_filtros', sa.Boolean(), server_default='false'),
        sa.Column('motivo_exclusao', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['vaga_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('vaga_id', 'candidate_id', name='uq_vaga_candidato')
    )
    op.create_index('ix_vaga_candidatos_vaga_id', 'vaga_candidatos', ['vaga_id'])
    op.create_index('ix_vaga_candidatos_candidate_id', 'vaga_candidatos', ['candidate_id'])


def downgrade():
    op.drop_index('ix_vaga_candidatos_candidate_id', table_name='vaga_candidatos')
    op.drop_index('ix_vaga_candidatos_vaga_id', table_name='vaga_candidatos')
    op.drop_table('vaga_candidatos')
    
    op.drop_index('ix_vaga_requisitos_competencia_id', table_name='vaga_requisitos')
    op.drop_index('ix_vaga_requisitos_vaga_id', table_name='vaga_requisitos')
    op.drop_table('vaga_requisitos')
    
    op.drop_index('ix_candidato_testes_test_id', table_name='candidato_testes')
    op.drop_index('ix_candidato_testes_candidate_id', table_name='candidato_testes')
    op.drop_table('candidato_testes')
    
    op.drop_index('ix_autoavaliacao_competencias_candidate_id', table_name='autoavaliacao_competencias')
    op.drop_table('autoavaliacao_competencias')
    
    op.drop_index('ix_competencias_area', table_name='competencias')
    op.drop_table('competencias')
    
    op.drop_column('candidates', 'status_onboarding')
    op.drop_column('candidates', 'area_atuacao')
    op.drop_column('jobs', 'area_atuacao')
