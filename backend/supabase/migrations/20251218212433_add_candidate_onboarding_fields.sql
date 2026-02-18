/*
  # Adicionar Campos de Onboarding para Candidatos

  ## Descrição
  Adiciona campos essenciais para o processo de onboarding e perfil completo dos candidatos,
  incluindo PCD, experiência profissional, formações acadêmicas, habilidades e testes.

  ## 1. Novos Tipos (Enums)
    - tipo_pcd: Tipos de deficiência (Física, Auditiva, Visual, Intelectual, multipla, Psicossocial)

  ## 2. Modificações na Tabela candidates
    Adiciona os seguintes campos:
    
    ### PCD (Pessoa com Deficiência)
    - is_pcd: boolean - Se o candidato é PCD
    - tipo_pcd: enum - Tipo de deficiência
    - necessidades_adaptacao: text - Necessidades especiais de adaptação
    
    ### Dados Profissionais
    - experiencia_profissional: text - Histórico de experiência profissional (JSON array)
    - formacao_escolaridade: text - Nível de escolaridade
    - formacoes_academicas: text - Formações acadêmicas detalhadas (JSON array)
    - habilidades: text - Habilidades técnicas (JSON array)
    - autoavaliacao_habilidades: text - Auto-avaliação das habilidades (JSON)
    
    ### Teste de Habilidades
    - teste_habilidades_completado: boolean - Se completou teste
    - score_teste_habilidades: integer - Pontuação do teste (0-100)
    - dados_teste_habilidades: text - Dados completos do teste (JSON)
    
    ### Controle de Onboarding
    - onboarding_completo: boolean - Se completou onboarding
    - percentual_completude: integer - Percentual de completude do perfil (0-100)

  ## 3. Security
    - Todas as políticas RLS existentes continuam válidas
*/

-- Criar tipo enumerado para PCD
DO $$ BEGIN
  CREATE TYPE tipo_pcd AS ENUM ('fisica', 'auditiva', 'visual', 'intelectual', 'multipla', 'psicossocial');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Adicionar campos PCD
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'is_pcd'
  ) THEN
    ALTER TABLE candidates ADD COLUMN is_pcd boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'tipo_pcd'
  ) THEN
    ALTER TABLE candidates ADD COLUMN tipo_pcd tipo_pcd;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'necessidades_adaptacao'
  ) THEN
    ALTER TABLE candidates ADD COLUMN necessidades_adaptacao text;
  END IF;
END $$;

-- Adicionar campos profissionais
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'experiencia_profissional'
  ) THEN
    ALTER TABLE candidates ADD COLUMN experiencia_profissional text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'formacao_escolaridade'
  ) THEN
    ALTER TABLE candidates ADD COLUMN formacao_escolaridade text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'formacoes_academicas'
  ) THEN
    ALTER TABLE candidates ADD COLUMN formacoes_academicas text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'habilidades'
  ) THEN
    ALTER TABLE candidates ADD COLUMN habilidades text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'autoavaliacao_habilidades'
  ) THEN
    ALTER TABLE candidates ADD COLUMN autoavaliacao_habilidades text;
  END IF;
END $$;

-- Adicionar campos de teste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'teste_habilidades_completado'
  ) THEN
    ALTER TABLE candidates ADD COLUMN teste_habilidades_completado boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'score_teste_habilidades'
  ) THEN
    ALTER TABLE candidates ADD COLUMN score_teste_habilidades integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'dados_teste_habilidades'
  ) THEN
    ALTER TABLE candidates ADD COLUMN dados_teste_habilidades text;
  END IF;
END $$;

-- Adicionar campos de onboarding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'onboarding_completo'
  ) THEN
    ALTER TABLE candidates ADD COLUMN onboarding_completo boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'percentual_completude'
  ) THEN
    ALTER TABLE candidates ADD COLUMN percentual_completude integer DEFAULT 0;
  END IF;
END $$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_candidates_onboarding ON candidates(onboarding_completo);
CREATE INDEX IF NOT EXISTS idx_candidates_teste_completado ON candidates(teste_habilidades_completado);