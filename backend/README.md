# VagaFácil · Backend

API do VagaFácil construída com **FastAPI**, responsável por autenticação, gestão de vagas, pipeline de candidatos, testes e integrações de upload.

## Visão Geral

- Arquitetura em camadas: `api` → `services` → `models` → `database`
- API REST versionada em `/api/v1`
- Autenticação com JWT (access + refresh token)
- ORM com SQLAlchemy e migrações com Alembic
- Suporte a upload local e Cloudflare R2

## Stack

- Python 3.11+
- FastAPI + Uvicorn
- SQLAlchemy + Alembic
- PostgreSQL (incluindo uso com Supabase)
- Pydantic Settings

## Estrutura Principal

```text
backend/
├── app/
│   ├── api/v1/                 # Rotas e endpoints
│   ├── core/                   # Configurações, segurança, dependências
│   ├── models/                 # Modelos SQLAlchemy
│   ├── schemas/                # Contratos de entrada/saída
│   ├── services/               # Regras de negócio
│   └── main.py                 # App FastAPI
├── alembic/                    # Migrações
├── requirements.txt
├── run_server.py
└── docker-compose.yml
```

## Pré-requisitos

- Python 3.11+
- `pip`
- PostgreSQL disponível localmente ou remoto

## Configuração Rápida (Local)

1. Entre na pasta do backend:

```bash
cd backend
```

2. Crie e ative o ambiente virtual:

```bash
python -m venv .venv
source .venv/bin/activate
```

3. Instale dependências:

```bash
pip install -r requirements.txt
```

4. Crie o arquivo `.env` na raiz de `backend/` com, no mínimo:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vagafacil
SECRET_KEY=troque-esta-chave-em-producao
DEBUG=True
USE_R2=False
```

5. Execute as migrações:

```bash
alembic upgrade head
```

6. Inicie a API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> Alternativa: `python run_server.py`

## Endpoints Úteis

- Health check: `GET /health`
- OpenAPI (Swagger): `GET /docs`
- ReDoc: `GET /redoc`
- Prefixo da API: `/api/v1`

Exemplo local:

- http://localhost:8000/health
- http://localhost:8000/docs

## Fluxo de Autenticação (Resumo)

1. `POST /api/v1/auth/login` com credenciais
2. Recebe `access_token` e `refresh_token`
3. Envia `Authorization: Bearer <access_token>` nas chamadas protegidas

## CORS

As origens permitidas são definidas em `app/core/config.py` (`CORS_ORIGINS`) e complementadas em runtime no `app/main.py` para cenários de desenvolvimento e produção.

## Docker (Opcional)

Para rodar apenas a API em container:

```bash
docker compose up --build
```

> Observação: o `docker-compose.yml` atual sobe a API. Garanta que o banco configurado em `DATABASE_URL` esteja acessível.

## Troubleshooting

- Erro de conexão com banco: valide `DATABASE_URL` e acesso de rede
- Erro de migração: execute `alembic history` e confirme versão atual
- Erro de CORS no frontend: confira origem em `CORS_ORIGINS`

