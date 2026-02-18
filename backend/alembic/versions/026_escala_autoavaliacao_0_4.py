"""
026 - Atualiza escala de autoavaliação para 0-4

Revision ID: 026_escala_autoavaliacao_0_4
Revises: 025_add_pipeline_flow_states
Create Date: 2026-02-16

Escala padronizada:
- 0: Não exposto - Nunca trabalhou com essa competência
- 1: Básico - Conhecimento básico, executa tarefas simples com supervisão
- 2: Intermediário - Executa tarefas de forma autônoma, resolve problemas comuns
- 3: Avançado - Domínio avançado, resolve problemas complexos, pode mentorar
- 4: Especialista - Expert reconhecido, define padrões, lidera inovações
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '026_escala_autoavaliacao_0_4'
down_revision = '025_add_pipeline_flow_states'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Verifica se a tabela autoavaliacao_competencias existe
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'autoavaliacao_competencias' in inspector.get_table_names():
        # Alterar tipo da coluna nivel_declarado de VARCHAR para INTEGER
        # Primeiro, converter valores existentes (String '1','2','3','4' para Integer)
        op.execute("""
            UPDATE autoavaliacao_competencias 
            SET nivel_declarado = CASE nivel_declarado 
                WHEN '1' THEN '1'
                WHEN '2' THEN '2'
                WHEN '3' THEN '3'
                WHEN '4' THEN '4'
                ELSE '0'
            END
        """)
        
        # Alterar tipo de coluna para INTEGER usando cast
        op.execute("""
            ALTER TABLE autoavaliacao_competencias 
            ALTER COLUMN nivel_declarado TYPE INTEGER 
            USING nivel_declarado::INTEGER
        """)
        
        # Adicionar colunas novas se não existirem
        columns = [col['name'] for col in inspector.get_columns('autoavaliacao_competencias')]
        
        if 'descricao_experiencia' not in columns:
            op.add_column('autoavaliacao_competencias', 
                sa.Column('descricao_experiencia', sa.Text(), nullable=True))
        
        if 'anos_experiencia' not in columns:
            op.add_column('autoavaliacao_competencias',
                sa.Column('anos_experiencia', sa.Integer(), nullable=True))
    else:
        # Criar tabela se não existir
        op.create_table('autoavaliacao_competencias',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
            sa.Column('candidate_id', sa.Integer(), sa.ForeignKey('candidates.id'), nullable=False),
            sa.Column('competencia_id', sa.Integer(), sa.ForeignKey('competencias.id'), nullable=False),
            sa.Column('nivel_declarado', sa.Integer(), nullable=False, default=0),
            sa.Column('descricao_experiencia', sa.Text(), nullable=True),
            sa.Column('anos_experiencia', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
        )
        
        # Criar índices
        op.create_index('ix_autoavaliacao_competencias_candidate_id', 
                       'autoavaliacao_competencias', ['candidate_id'])
        op.create_index('ix_autoavaliacao_competencias_competencia_id', 
                       'autoavaliacao_competencias', ['competencia_id'])
        op.create_index('ix_autoavaliacao_competencias_nivel',
                       'autoavaliacao_competencias', ['nivel_declarado'])
    
    # 2. Criar tabela para histórico/auditoria de autoavaliações (opcional mas recomendado)
    if 'autoavaliacao_historico' not in inspector.get_table_names():
        op.create_table('autoavaliacao_historico',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
            sa.Column('autoavaliacao_id', sa.Integer(), nullable=False),
            sa.Column('candidate_id', sa.Integer(), nullable=False),
            sa.Column('competencia_id', sa.Integer(), nullable=False),
            sa.Column('nivel_anterior', sa.Integer(), nullable=True),
            sa.Column('nivel_novo', sa.Integer(), nullable=False),
            sa.Column('motivo_alteracao', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
        )
    
    # 3. Adicionar constraint de validação do nível (0-4)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'chk_nivel_declarado_0_4'
            ) THEN
                ALTER TABLE autoavaliacao_competencias 
                ADD CONSTRAINT chk_nivel_declarado_0_4 
                CHECK (nivel_declarado >= 0 AND nivel_declarado <= 4);
            END IF;
        END$$;
    """)


def downgrade() -> None:
    # Remover constraint
    op.execute("""
        ALTER TABLE autoavaliacao_competencias 
        DROP CONSTRAINT IF EXISTS chk_nivel_declarado_0_4
    """)
    
    # Remover tabela de histórico
    op.drop_table('autoavaliacao_historico')
    
    # Reverter tipo de coluna para VARCHAR
    op.execute("""
        ALTER TABLE autoavaliacao_competencias 
        ALTER COLUMN nivel_declarado TYPE VARCHAR(2) 
        USING nivel_declarado::VARCHAR
    """)
    
    # Remover colunas adicionadas
    op.drop_column('autoavaliacao_competencias', 'descricao_experiencia')
    op.drop_column('autoavaliacao_competencias', 'anos_experiencia')
