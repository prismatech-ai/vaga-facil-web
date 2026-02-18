// Enums e tipos PCD
export const TIPOS_PCD = [
  "Física",
  "Auditiva",
  "Visual",
  "Intelectual",
  "Múltipla",
  "Psicossocial"
] as const

export type TipoPCD = typeof TIPOS_PCD[number]

export type User = {
  id: string
  email: string
  nome: string
  role: "admin" | "empresa" | "candidato"
  createdAt: Date
  telefone?: string
  localizacao?: string
  linkedin?: string
}

export type Empresa = User & {
  role: "empresa"
  nomeEmpresa?: string
  cnpj?: string
  razaoSocial?: string
  nomeFantasia?: string
  site?: string
  descricao?: string
}

export type Candidato = User & {
  role: "candidato"
  id?: number
  full_name?: string
  cpf?: string
  phone?: string
  rg?: string
  birth_date?: string
  genero?: string
  estado_civil?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  location?: string
  is_pcd?: boolean
  tipo_pcd?: "Física" | "Auditiva" | "Visual" | "Intelectual" | "Múltipla" | "Psicossocial"
  necessidades_adaptacao?: string
  bio?: string
  linkedin_url?: string
  portfolio_url?: string
  resume_url?: string
  experiencia_profissional?: string
  formacao_escolaridade?: string
  formacoes_academicas?: Educacao[]
  habilidades?: Habilidade[]
  autoavaliacao_habilidades?: string
  teste_habilidades_completado?: boolean
  score_teste_habilidades?: number
  dados_teste_habilidades?: Record<string, unknown>
  percentual_completude?: number
  onboarding_completo?: boolean
  curriculo?: string
  educacao?: Educacao[]
  experiencias?: Experiencia[]
  anosExperiencia?: number
  nivelDesejado?: string
  autoavaliacao?: {
    nivel: number
    habilidades: Record<string, number>
  }
  testesRealizados?: string[]
  created_at?: Date
  updated_at?: Date
}

export type Educacao = {
  id: string
  nivel: string
  instituicao: string
  curso: string
  status: string
  dataInicio?: Date
  dataFim?: Date
}

export type Habilidade = {
  habilidade: string
  nivel: 1 | 2 | 3 | 4
  anos_experiencia?: number
}

export type Experiencia = {
  id: string
  cargo: string
  empresa: string
  dataInicio: Date | string
  dataFim?: Date | string | null
  atual: boolean
  descricao?: string
}

export type Vaga = {
  id: string
  empresaId: string
  empresaNome: string
  titulo: string
  descricao: string
  requisitos: string
  habilidadesRequeridas?: string[]
  anosExperienciaMin?: number
  anosExperienciaMax?: number
  localizacao: string
  tipo: "CLT" | "PJ" | "Estágio" | "Temporário"
  status: "rascunho" | "aberta" | "fechada"
  salario?: string
  createdAt: Date
  salarioMin?: number
  salarioMax?: number
}

export type Candidatura = {
  id: string
  candidatoId: string
  vagaId: string
  status: "pendente" | "em_analise" | "aprovado" | "rejeitado"
  mensagem?: string
  createdAt: Date
  matchScore?: number
  candidato?: {
    id: string
    nome: string
    email: string
    habilidades: string[]
  }
  jobTitle?: string
  candidatoNome?: string
}

export type Teste = {
  id: string
  nome?: string
  descricao: string
  nivel: 1 | 2 | 3 | 4
  habilidade?: string
  area_atuacao?: string
  competencia?: string
  questoes: Questao[]
  createdAt: Date
  createdBy: string
}

export type Questao = {
  id: string
  pergunta: string
  alternativas: string[]
  respostaCorreta: number
  nivel: 1 | 2 | 3 | 4
  nivelDificuldade?: "facil" | "medio" | "dificil" | "muito-dificil" | "expert"
  habilidade?: string
}

export type Notificacao = {
  id: string
  destinatarioId: string
  tipo: "convite" | "vaga" | "candidatura" | "sistema"
  titulo: string
  mensagem: string
  lida: boolean
  createdAt: Date
  createdBy?: string
}

// Tipos para Onboarding
export type OnboardingStatus = {
  id: number
  full_name: string
  email: string
  phone?: string
  cidade?: string
  estado?: string
  is_pcd?: boolean
  tipo_pcd?: "Física" | "Auditiva" | "Visual" | "Intelectual" | "Múltipla" | "Psicossocial"
  necessidades_adaptacao?: string
  experiencia_profissional?: string
  formacao_escolaridade?: string
  habilidades?: Habilidade[]
  teste_habilidades_completado?: boolean
  score_teste_habilidades?: number
  percentual_completude: number
  onboarding_completo: boolean
  created_at: Date
  updated_at: Date
}

export type OnboardingProgresso = {
  percentual_completude: number
  onboarding_completo: boolean
  dados_pessoais_completo: boolean
  dados_profissionais_completo: boolean
  teste_habilidades_completo: boolean
  etapas_completas: {
    perfil_basico: boolean
    dados_pessoais: boolean
    dados_profissionais: boolean
    teste_habilidades: boolean
  }
}

export type DadosPessoais = {
  phone?: string
  cidade?: string
  estado?: string
  cep?: string
  logradouro?: string
  numero?: string
  bairro?: string
  is_pcd?: boolean
  tipo_pcd?: "Física" | "Auditiva" | "Visual" | "Intelectual" | "Múltipla" | "Psicossocial"
  necessidades_adaptacao?: string
}

export type DadosProfissionais = {
  experiencia_profissional?: string
  formacao_escolaridade?: string
  habilidades?: Habilidade[]
}

export type TesteHabilidades = {
  score: number
  dados_teste?: {
    tempo_resposta?: string
    total_perguntas?: number
    acertos?: number
    perguntas_respondidas?: Array<{
      id: number
      resposta: string
      correta: boolean
    }>
  }
}

export type RespostaTicket = {
  id: string
  ticketId: string
  usuarioId: string
  mensagem: string
  createdAt: Date
}

export type TicketSuporte = {
  id: string
  usuarioId: string
  assunto: string
  mensagem: string
  status: "aberto" | "em_andamento" | "fechado"
  prioridade: "baixa" | "media" | "alta"
  respostas: RespostaTicket[]
  createdAt: Date
  updatedAt: Date
}
// Tipos para Dashboard de Candidato
export type Interesse = {
  id: string
  dataInteresse: string
  status: "novo" | "aceito" | "rejeitado"
  descricao: string
}

export type TesteTecnico = {
  id: string
  nome: string
  data: string
  status: "concluido" | "pendente" | "expirado"
  duracao?: string
}

export type Convite = {
  id: string
  candidatoId: string
  empresaNome: string
  vagaTitulo: string
  dataConvite: string
  competenciasRequeridas: string[]
  status: "pendente" | "aceito" | "rejeitado"
}

// Status do Pipeline Kanban
export type StatusKanbanCandidato = 
  | "avaliacao_competencias"
  | "testes_realizados"
  | "testes_nao_realizados"
  | "interesse_empresa"
  | "entrevista_aceita"
  | "selecionado"
  | "contratado"
  | "em_garantia"
  | "garantia_finalizada"
  | "reembolso_solicitado"
  | "rejeitado"

// VagaCandidato - Relacionamento entre vaga e candidato no pipeline
export type VagaCandidato = {
  id: number
  vaga_id: number
  candidate_id: number
  status_kanban: StatusKanbanCandidato
  empresa_demonstrou_interesse: boolean
  data_interesse?: string
  consentimento_entrevista: boolean
  dados_pessoais_liberados: boolean
  data_entrevista?: string
  foi_contratado?: boolean
  valor_taxa?: number
  pagamento_confirmado: boolean
  pagamento_pendente: boolean
  garantia_ativa?: boolean
  data_inicio_garantia?: string
  data_fim_garantia?: string
  valor_reembolso?: number
  // Campos de seleção e visibilidade
  visivel_outras_vagas?: boolean
  data_selecao?: string
  notas_selecao?: string
  // Campos de pré-seleção e match
  pre_selecionado?: boolean
  data_pre_selecao?: string
  candidato_demonstrou_interesse?: boolean
  numero_match?: number
  data_match?: string
  created_at: string
  updated_at?: string
}

// Histórico de estado do pipeline (auditoria)
export type HistoricoEstadoPipeline = {
  id: number
  vaga_candidato_id: number
  estado_anterior?: string
  estado_novo: string
  usuario_id?: number
  tipo_usuario?: string
  motivo?: string
  automatico: boolean
  created_at: string
}

// Regras de visibilidade por estado
export type VisibilidadeEstado = {
  empresa_vê_dados_pessoais: boolean
  empresa_vê_curriculo: boolean
  empresa_vê_competencias: boolean
  empresa_vê_resultados_testes: boolean
  candidato_vê_empresa: boolean
  candidato_visivel_outras_vagas: boolean
}

// Interesse pendente para candidato
export type InteressePendente = {
  id: number
  vaga_id: number
  vaga_titulo?: string
  vaga_descricao?: string
  empresa_nome?: string
  empresa_setor?: string
  data_interesse?: string
  horas_restantes?: number
}

// Garantia ativa para empresa
export type GarantiaAtiva = {
  id: number
  candidato_nome?: string
  vaga_titulo?: string
  data_inicio_garantia?: string
  data_fim_garantia?: string
  dias_restantes: number
  valor_taxa_pago?: number
}