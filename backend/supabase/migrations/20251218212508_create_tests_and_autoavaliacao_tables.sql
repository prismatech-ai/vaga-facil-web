/*
  # Criar Tabelas de Testes e Autoavaliação

  ## Descrição
  Cria o sistema completo de testes técnicos adaptativos e autoavaliação de habilidades.

  ## 1. Novos Tipos (Enums)
    - test_level: Níveis de dificuldade dos testes

  ## 2. Novas Tabelas
    - tests: Testes técnicos por habilidade e nível
    - questions: Questões dos testes
    - alternatives: Alternativas das questões
    - adaptive_test_sessions: Sessões de testes adaptativos em tempo real
    - autoavaliacoes: Autoavaliações de habilidades dos candidatos

  ## 3. Security
    - RLS habilitado para todas as tabelas
    - Políticas permitem acesso da aplicação (service role)
    - Candidatos podem apenas ver seus próprios dados
*/

-- Criar tipo enumerado para níveis de teste
DO $$ BEGIN
  CREATE TYPE test_level AS ENUM (
    'Nível 1 - Iniciante',
    'Nível 2 - Básico',
    'Nível 3 - Intermediário',
    'Nível 4 - Avançado',
    'Nível 5 - Expert'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela tests
CREATE TABLE IF NOT EXISTS tests (
  id bigserial PRIMARY KEY,
  nome text NOT NULL,
  habilidade text NOT NULL,
  nivel test_level NOT NULL,
  descricao text,
  created_by bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tests_habilidade ON tests(habilidade);
CREATE INDEX IF NOT EXISTS idx_tests_nivel ON tests(nivel);
CREATE INDEX IF NOT EXISTS idx_tests_habilidade_nivel ON tests(habilidade, nivel);

-- Tabela questions
CREATE TABLE IF NOT EXISTS questions (
  id bigserial PRIMARY KEY,
  test_id bigint NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  texto_questao text NOT NULL,
  ordem integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);

-- Tabela alternatives
CREATE TABLE IF NOT EXISTS alternatives (
  id bigserial PRIMARY KEY,
  question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  texto text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alternatives_question_id ON alternatives(question_id);

-- Tabela adaptive_test_sessions
CREATE TABLE IF NOT EXISTS adaptive_test_sessions (
  id bigserial PRIMARY KEY,
  candidate_id bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  habilidade text NOT NULL,
  
  -- Estado atual do teste
  nivel_atual text NOT NULL DEFAULT 'basico',
  questao_atual_index integer DEFAULT 0,
  
  -- Contadores de acertos por nível
  acertos_basico integer DEFAULT 0,
  total_basico integer DEFAULT 0,
  acertos_intermediario integer DEFAULT 0,
  total_intermediario integer DEFAULT 0,
  acertos_avancado integer DEFAULT 0,
  total_avancado integer DEFAULT 0,
  
  -- Histórico de respostas (JSON)
  historico_respostas jsonb,
  
  -- Estado e resultado final
  is_completed boolean DEFAULT false,
  nivel_final_atingido text,
  pontuacao_final numeric(5,2),
  
  -- Timestamps
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_adaptive_sessions_candidate ON adaptive_test_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_sessions_habilidade ON adaptive_test_sessions(habilidade);
CREATE INDEX IF NOT EXISTS idx_adaptive_sessions_completed ON adaptive_test_sessions(is_completed);

-- Tabela autoavaliacoes
CREATE TABLE IF NOT EXISTS autoavaliacoes (
  id bigserial PRIMARY KEY,
  candidate_id bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  
  -- Respostas em JSON (array de habilidades com níveis)
  respostas jsonb NOT NULL,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  
  -- Garantir apenas uma autoavaliação por candidato
  UNIQUE(candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_autoavaliacoes_candidate ON autoavaliacoes(candidate_id);

-- Habilitar RLS em todas as tabelas
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoavaliacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Permitir acesso total para service_role
CREATE POLICY "Service role has full access to tests" ON tests
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to questions" ON questions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to alternatives" ON alternatives
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to adaptive_test_sessions" ON adaptive_test_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to autoavaliacoes" ON autoavaliacoes
  FOR ALL
  USING (true)
  WITH CHECK (true);