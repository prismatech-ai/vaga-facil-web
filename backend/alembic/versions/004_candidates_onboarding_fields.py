"""add candidate onboarding/profile fields

Revision ID: 004_candidates_onboarding
Revises: 003_add_cascade
Create Date: 2025-12-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_candidates_onboarding'
down_revision = '003_add_cascade'
branch_labels = None
depends_on = None


def _get_existing_columns(table_name: str) -> set:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c['name'] for c in insp.get_columns(table_name)}
    return cols


def upgrade():
    table = 'candidates'
    existing = _get_existing_columns(table)
    bind = op.get_bind()

    # Ensure PostgreSQL ENUM types exist (checkfirst=True prevents errors if already present)
    genero_enum = postgresql.ENUM(
        'Masculino', 'Feminino', 'Outro', 'Prefiro não informar',
        name='genero', create_type=False
    )
    genero_enum.create(bind, checkfirst=True)

    estado_civil_enum = postgresql.ENUM(
        'Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União Estável',
        name='estado_civil', create_type=False
    )
    estado_civil_enum.create(bind, checkfirst=True)

    tipo_pcd_enum = postgresql.ENUM(
        'fisica', 'auditiva', 'visual', 'intelectual', 'multipla', 'psicossocial',
        name='tipo_pcd', create_type=False
    )
    tipo_pcd_enum.create(bind, checkfirst=True)

    def add_col(name: str, column: sa.Column):
        if name not in existing:
            op.add_column(table, column)

    # Dados pessoais (some may already exist; add if missing)
    add_col('genero', sa.Column('genero', genero_enum, nullable=True))
    add_col('estado_civil', sa.Column('estado_civil', estado_civil_enum, nullable=True))
    add_col('location', sa.Column('location', sa.String(length=255), nullable=True))

    # Endereço
    add_col('cep', sa.Column('cep', sa.String(length=10), nullable=True))
    add_col('logradouro', sa.Column('logradouro', sa.String(length=255), nullable=True))
    add_col('numero', sa.Column('numero', sa.String(length=20), nullable=True))
    add_col('complemento', sa.Column('complemento', sa.String(length=100), nullable=True))
    add_col('bairro', sa.Column('bairro', sa.String(length=100), nullable=True))
    add_col('cidade', sa.Column('cidade', sa.String(length=100), nullable=True))
    add_col('estado', sa.Column('estado', sa.String(length=2), nullable=True))

    # PCD
    add_col('is_pcd', sa.Column('is_pcd', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    add_col('tipo_pcd', sa.Column('tipo_pcd', tipo_pcd_enum, nullable=True))
    add_col('necessidades_adaptacao', sa.Column('necessidades_adaptacao', sa.Text(), nullable=True))

    # Profissional
    add_col('experiencia_profissional', sa.Column('experiencia_profissional', sa.Text(), nullable=True))
    add_col('formacao_escolaridade', sa.Column('formacao_escolaridade', sa.Text(), nullable=True))
    add_col('habilidades', sa.Column('habilidades', sa.Text(), nullable=True))
    add_col('autoavaliacao_habilidades', sa.Column('autoavaliacao_habilidades', sa.Text(), nullable=True))

    # Teste de habilidades
    add_col('teste_habilidades_completado', sa.Column('teste_habilidades_completado', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    add_col('score_teste_habilidades', sa.Column('score_teste_habilidades', sa.Integer(), nullable=True))
    add_col('dados_teste_habilidades', sa.Column('dados_teste_habilidades', sa.Text(), nullable=True))

    # Onboarding
    add_col('onboarding_completo', sa.Column('onboarding_completo', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    add_col('percentual_completude', sa.Column('percentual_completude', sa.Integer(), nullable=False, server_default='0'))

    # Links/Bio
    add_col('resume_url', sa.Column('resume_url', sa.String(length=500), nullable=True))
    add_col('linkedin_url', sa.Column('linkedin_url', sa.String(length=255), nullable=True))
    add_col('portfolio_url', sa.Column('portfolio_url', sa.String(length=255), nullable=True))
    add_col('bio', sa.Column('bio', sa.Text(), nullable=True))


def downgrade():
    table = 'candidates'
    bind = op.get_bind()
    existing = _get_existing_columns(table)

    def drop_col(name: str):
        if name in existing:
            op.drop_column(table, name)

    # Drop added columns (reverse order is safer where there are dependencies)
    for col in [
        'bio', 'portfolio_url', 'linkedin_url', 'resume_url',
        'percentual_completude', 'onboarding_completo',
        'dados_teste_habilidades', 'score_teste_habilidades', 'teste_habilidades_completado',
        'autoavaliacao_habilidades', 'habilidades', 'formacao_escolaridade', 'experiencia_profissional',
        'necessidades_adaptacao', 'tipo_pcd', 'is_pcd',
        'estado', 'cidade', 'bairro', 'complemento', 'numero', 'logradouro', 'cep',
        'location', 'estado_civil', 'genero'
    ]:
        drop_col(col)

    # Drop enums if no longer used
    for enum_name in ['tipo_pcd', 'estado_civil', 'genero']:
        try:
            enum = postgresql.ENUM(name=enum_name)
            enum.drop(bind, checkfirst=True)
        except Exception:
            # If still referenced or not present, ignore
            pass
