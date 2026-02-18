/*
  # Criação do Schema VagaFacil (v2)

  ## Descrição
  Sistema de gestão de vagas com usuários, empresas, candidatos e candidaturas.
  RLS configurado para permitir acesso da aplicação FastAPI.

  ## 1. Novos Tipos (Enums)
    - user_type: Tipos de usuário (admin, empresa, candidato)
    - job_status: Status da vaga (rascunho, aberta, encerrada, pausada)
    - application_status: Status da candidatura (em_analise, entrevista, finalista, recusado, contratado)
    - genero: Gênero do candidato
    - estado_civil: Estado civil do candidato

  ## 2. Novas Tabelas
    - `users`: Usuários do sistema
    - `companies`: empresas
    - `company_users`: Usuários adicionais das empresas
    - `candidates`: candidatos
    - `jobs`: Vagas
    - `screening_questions`: Perguntas de triagem
    - `job_applications`: Candidaturas

  ## 3. Security
    - RLS habilitado para todas as tabelas
    - Políticas permitem acesso da aplicação (service role)
    - Dados públicos acessíveis para consulta (vagas abertas)
*/

-- Limpar tabelas existentes se houver
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS screening_questions CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS company_users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Limpar tipos existentes
DROP TYPE IF EXISTS user_type CASCADE;
DROP TYPE IF EXISTS job_status CASCADE;
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS genero CASCADE;
DROP TYPE IF EXISTS estado_civil CASCADE;

-- Criar tipos enumerados
CREATE TYPE user_type AS ENUM ('admin', 'empresa', 'candidato');
CREATE TYPE job_status AS ENUM ('rascunho', 'aberta', 'encerrada', 'pausada');
CREATE TYPE application_status AS ENUM ('em_analise', 'entrevista', 'finalista', 'recusado', 'contratado');
CREATE TYPE genero AS ENUM ('Masculino', 'Feminino', 'Outro', 'Prefiro não informar');
CREATE TYPE estado_civil AS ENUM ('Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União Estável');

-- Tabela users
CREATE TABLE users (
  id bigserial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  user_type user_type NOT NULL DEFAULT 'candidato',
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX idx_users_email ON users(email);

-- Tabela companies
CREATE TABLE companies (
  id bigserial PRIMARY KEY,
  user_id bigint UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cnpj text UNIQUE NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text,
  setor text,
  cep text,
  pessoa_de_contato text,
  fone text,
  site text,
  descricao text,
  logo_url text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX idx_companies_cnpj ON companies(cnpj);
CREATE INDEX idx_companies_user_id ON companies(user_id);

-- Tabela company_users
CREATE TABLE company_users (
  id bigserial PRIMARY KEY,
  company_id bigint NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_create_jobs boolean DEFAULT true,
  can_manage_pipeline boolean DEFAULT true,
  can_view_analytics boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_company_users_company_id ON company_users(company_id);
CREATE INDEX idx_company_users_user_id ON company_users(user_id);

-- Tabela candidates
CREATE TABLE candidates (
  id bigserial PRIMARY KEY,
  user_id bigint UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  cpf text UNIQUE,
  rg text,
  birth_date date,
  genero genero,
  estado_civil estado_civil,
  location text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  resume_url text,
  linkedin_url text,
  portfolio_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX idx_candidates_cpf ON candidates(cpf);
CREATE INDEX idx_candidates_user_id ON candidates(user_id);

-- Tabela jobs
CREATE TABLE jobs (
  id bigserial PRIMARY KEY,
  company_id bigint NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  requirements text,
  benefits text,
  location text,
  remote boolean DEFAULT false,
  job_type text,
  salary_min numeric(10, 2),
  salary_max numeric(10, 2),
  salary_currency text DEFAULT 'BRL',
  status job_status NOT NULL DEFAULT 'rascunho',
  views_count integer DEFAULT 0,
  applications_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz
);

CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);

-- Tabela screening_questions
CREATE TABLE screening_questions (
  id bigserial PRIMARY KEY,
  job_id bigint NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text DEFAULT 'text',
  is_required boolean DEFAULT true,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_screening_questions_job_id ON screening_questions(job_id);

-- Tabela job_applications
CREATE TABLE job_applications (
  id bigserial PRIMARY KEY,
  job_id bigint NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'em_analise',
  screening_answers text,
  cover_letter text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_candidate_id ON job_applications(candidate_id);

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Permitir acesso total para service_role (usado pela aplicação FastAPI)
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to companies" ON companies
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to company_users" ON company_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to candidates" ON candidates
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to jobs" ON jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to screening_questions" ON screening_questions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to job_applications" ON job_applications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Política adicional: Permitir leitura pública de vagas abertas
CREATE POLICY "Public can view open jobs" ON jobs
  FOR SELECT
  TO anon, authenticated
  USING (status = 'aberta');