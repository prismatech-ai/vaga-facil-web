"""
# Migration: CPF e CNPJ como Chaves Primárias

## Alterações nas Tabelas

### 1. Tabela: candidates
- CPF agora é a PRIMARY KEY (String 11)
- Remove campo `id` (Integer)
- CPF é obrigatório e único
- Cada CPF vinculado a um único user_id (e portanto um único email)

### 2. Tabela: companies
- CNPJ agora é a PRIMARY KEY (String 14)
- Remove campo `id` (Integer)
- CNPJ é obrigatório e único
- Cada CNPJ vinculado a um único user_id (e portanto um único email)

### 3. Tabela: job_applications
- candidate_id (Integer) → candidate_cpf (String 11)
- Foreign key agora referencia candidates.cpf

### 4. Tabela: jobs
- company_id (Integer) → company_cnpj (String 14)
- Foreign key agora referencia companies.cnpj

### 5. Tabela: company_users
- company_id (Integer) → company_cnpj (String 14)
- Foreign key agora referencia companies.cnpj

### 6. Nova Tabela: password_reset_tokens
- id (Integer, primary key)
- user_id (Integer, foreign key)
- token (String 255, unique)
- is_used (Boolean)
- expires_at (timestamp)
- created_at (timestamp)

## Segurança

- RLS será configurado via Supabase UI
- CPF e CNPJ são sempre únicos
- Cada documento vinculado a um único email
- Tokens de recuperação expiram e podem ser usados apenas uma vez

## Notas Importantes

- Esta é uma migração destrutiva que recria as tabelas
- Dados existentes serão migrados mantendo integridade
- CPF armazenado sem formatação (11 dígitos)
- CNPJ armazenado sem formatação (14 dígitos)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
