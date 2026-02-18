# VagaFácil

Monorepo da plataforma de recrutamento e avaliação com dois módulos principais:

- **backend**: API FastAPI (autenticação, vagas, candidaturas, pipeline e serviços)
- **frontend**: SPA React + TypeScript (painéis, formulários, fluxos de usuário e integrações)

## Arquitetura do Projeto

```text
avalia-facil/
├── backend/   # API, modelos, migrações e regras de negócio
└── frontend/  # Interface web, componentes, páginas e cliente HTTP
```

## Tecnologias

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy + Alembic
- PostgreSQL
- JWT

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

## Como Rodar o Projeto (Local)

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Crie um arquivo `.env` em `backend/`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vagafacil
SECRET_KEY=troque-esta-chave
DEBUG=True
USE_S3=False
```

Execute migrações e inicie a API:

```bash
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Ajuste no `.env` do frontend:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Endereços Locais

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger: http://localhost:8000/docs

## Fluxo de Trabalho Recomendado

1. Atualize sua branch com a `main`
2. Crie branch de feature (`feature/nome-curto`)
3. Implemente mudanças pequenas e coesas
4. Rode lint/testes locais
5. Abra PR com descrição objetiva

## Boas Práticas de Desenvolvimento

### Código
- Prefira mudanças pequenas e focadas
- Evite duplicação; extraia funções e componentes reutilizáveis
- Mantenha nomenclatura consistente entre backend e frontend
- Não misture refatoração ampla com correção de bug no mesmo PR

### API e Contratos
- Versione e documente endpoints em `/api/v1`
- Mantenha schemas de request/response explícitos
- Trate erros de forma padronizada (status code + mensagem clara)
- Evite breaking changes sem plano de migração

### Segurança
- Nunca commitar `.env`, secrets ou tokens
- Use `SECRET_KEY` forte em ambientes reais
- Restrinja CORS em produção
- Valide dados de entrada tanto no frontend quanto no backend

### Qualidade
- Frontend: rode `npm run lint`
- Backend: valide migrações antes de subir mudanças de banco
- Teste fluxos críticos (login, criação de vaga, candidatura)
- Atualize documentação ao alterar comportamento de negócio

### Banco de Dados
- Toda alteração estrutural deve ter migração Alembic
- Não edite tabelas manualmente em produção sem migração
- Garanta compatibilidade retroativa quando possível

## Documentação dos Módulos

- Backend: [backend/README.md](backend/README.md)
- Frontend: [frontend/README.md](frontend/README.md)

## Contribuição

Para mudanças maiores (arquitetura, contrato de API, modelo de dados), alinhe antes via issue/discussão para reduzir retrabalho e risco de regressão.
