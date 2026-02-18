"""
Modelo de Resultado de Teste e Interessamento
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum as SQLEnum, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class StatusTesteCandidato(str, enum.Enum):
    """Status de um teste para um candidato"""
    PENDENTE = "pendente"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"


class CandidatoTeste(Base):
    """Registro de teste realizado por um candidato"""
    __tablename__ = "candidato_testes"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    
    # Status e resultado
    status = Column(SQLEnum(StatusTesteCandidato), default=StatusTesteCandidato.PENDENTE, nullable=False)
    pontuacao = Column(Float, nullable=True)  # Percentual de acerto (0-100)
    tempo_decorrido = Column(Integer, nullable=True)  # Segundos
    
    # Timestamps
    iniciado_em = Column(DateTime(timezone=True), nullable=True)
    concluido_em = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamentos
    candidate = relationship("Candidate", back_populates="candidato_testes")
    test = relationship("Test", back_populates="candidato_testes")
    
    def __repr__(self):
        return f"<CandidatoTeste(candidate_id={self.candidate_id}, test_id={self.test_id}, status={self.status})>"


class StatusOnboarding(str, enum.Enum):
    """Status do onboarding do candidato"""
    CADASTRO_INICIAL = "cadastro_inicial"
    AREA_SELECIONADA = "area_selecionada"
    AUTOAVALIACAO_PENDENTE = "autoavaliacao_pendente"
    AUTOAVALIACAO_CONCLUIDA = "autoavaliacao_concluida"
    TESTES_PENDENTES = "testes_pendentes"
    TESTES_CONCLUIDOS = "testes_concluidos"
    ONBOARDING_CONCLUIDO = "onboarding_concluido"


class StatusKanbanCandidato(str, enum.Enum):
    """Estados possíveis de um candidato no kanban da vaga"""
    # Estados iniciais
    AVALIACAO_COMPETENCIAS = "avaliacao_competencias"
    TESTES_REALIZADOS = "testes_realizados"
    TESTES_NAO_REALIZADOS = "testes_nao_realizados"
    
    # Estados de seleção
    INTERESSE_EMPRESA = "interesse_empresa"  # Pré-selecionado pela empresa
    ENTREVISTA_ACEITA = "entrevista_aceita"  # Sigilo liberado - candidato aceitou
    SELECIONADO = "selecionado"  # Empresa selecionou para contratação
    REJEITADO = "rejeitado"
    
    # Estados de contratação
    CONTRATADO = "contratado"
    EM_GARANTIA = "em_garantia"
    GARANTIA_FINALIZADA = "garantia_finalizada"
    REEMBOLSO_SOLICITADO = "reembolso_solicitado"


class VagaCandidato(Base):
    """Relacionamento entre vaga e candidato com rastreamento de estado"""
    __tablename__ = "vaga_candidatos"

    id = Column(Integer, primary_key=True, index=True)
    vaga_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    
    # Estados no fluxo
    status_kanban = Column(SQLEnum(StatusKanbanCandidato), default=StatusKanbanCandidato.AVALIACAO_COMPETENCIAS, nullable=False)
    
    # Interessamento
    empresa_demonstrou_interesse = Column(Boolean, default=False)
    data_interesse = Column(DateTime(timezone=True), nullable=True)
    
    # Interesse do candidato (antes de liberar identidade)
    candidato_demonstrou_interesse = Column(Boolean, default=False)
    data_interesse_candidato = Column(DateTime(timezone=True), nullable=True)
    motivo_rejeicao_candidato = Column(Text, nullable=True)
    
    # Pré-seleção (PSE)
    pre_selecionado = Column(Boolean, default=False)
    data_pre_selecao = Column(DateTime(timezone=True), nullable=True)
    notas_pre_selecao = Column(Text, nullable=True)
    
    # Rastreamento de Match
    numero_match = Column(Integer, nullable=True)  # 1º match, 2º match, etc.
    data_match = Column(DateTime(timezone=True), nullable=True)
    notificacao_match_enviada = Column(Boolean, default=False)
    data_notificacao_cliente = Column(DateTime(timezone=True), nullable=True)
    
    # Consentimento e privacidade
    consentimento_entrevista = Column(Boolean, default=False)
    data_consentimento = Column(DateTime(timezone=True), nullable=True)
    dados_pessoais_liberados = Column(Boolean, default=False)  # Automático quando consentimento = True
    
    # Agendamento de entrevista
    data_entrevista = Column(DateTime(timezone=True), nullable=True)
    entrevista_agendada = Column(Boolean, default=False)
    
    # Resultado final
    foi_contratado = Column(Boolean, nullable=True)  # True=contratado, False=não contratado, None=ainda não avaliado
    data_resultado = Column(DateTime(timezone=True), nullable=True)
    
    # Flags de exclusão
    excluido_por_filtros = Column(Boolean, default=False)
    motivo_exclusao = Column(Text, nullable=True)
    
    # ---------- NOVOS CAMPOS: Pagamento ----------
    valor_taxa = Column(Float, nullable=True)
    pagamento_pendente = Column(Boolean, default=False)
    pagamento_confirmado = Column(Boolean, default=False)
    data_pagamento = Column(DateTime(timezone=True), nullable=True)
    metodo_pagamento = Column(String(50), nullable=True)  # pix, boleto, cartao
    id_transacao = Column(String(100), nullable=True)
    
    # ---------- NOVOS CAMPOS: Garantia ----------
    data_inicio_trabalho = Column(DateTime(timezone=True), nullable=True)
    garantia_iniciada = Column(Boolean, default=False)
    data_inicio_garantia = Column(DateTime(timezone=True), nullable=True)
    data_fim_garantia = Column(DateTime(timezone=True), nullable=True)
    garantia_ativa = Column(Boolean, default=False)
    
    # ---------- NOVOS CAMPOS: Reembolso ----------
    reembolso_solicitado = Column(Boolean, default=False)
    data_solicitacao_reembolso = Column(DateTime(timezone=True), nullable=True)
    motivo_reembolso = Column(Text, nullable=True)
    valor_reembolso = Column(Float, nullable=True)
    reembolso_aprovado = Column(Boolean, nullable=True)
    data_aprovacao_reembolso = Column(DateTime(timezone=True), nullable=True)
    
    # ---------- NOVOS CAMPOS: Desligamento ----------
    data_desligamento = Column(DateTime(timezone=True), nullable=True)
    motivo_desligamento = Column(Text, nullable=True)
    tipo_desligamento = Column(String(50), nullable=True)  # demissao_sem_justa_causa, pedido_demissao, nao_adaptacao
    
    # ---------- NOVOS CAMPOS: Notificações ----------
    ultima_notificacao_enviada = Column(DateTime(timezone=True), nullable=True)
    contagem_lembretes = Column(Integer, default=0)
    
    # ---------- NOVOS CAMPOS: Serviços Adicionais ----------
    solicita_teste_soft_skills = Column(Boolean, default=False)
    solicita_entrevista_tecnica = Column(Boolean, default=False)
    valor_servicos_adicionais = Column(Float, nullable=True)
    
    # Acordo de exclusividade
    acordo_exclusividade_aceito = Column(Boolean, default=False)
    data_acordo_exclusividade = Column(DateTime(timezone=True), nullable=True)
    texto_acordo_exclusividade = Column(Text, nullable=True)
    
    # Link de pagamento
    link_pagamento_gerado = Column(Boolean, default=False)
    data_envio_link_pagamento = Column(DateTime(timezone=True), nullable=True)
    link_pagamento_url = Column(String(500), nullable=True)
    
    # Status dos serviços
    soft_skills_realizado = Column(Boolean, default=False)
    soft_skills_resultado = Column(Text, nullable=True)
    entrevista_tecnica_realizada = Column(Boolean, default=False)
    entrevista_tecnica_resultado = Column(Text, nullable=True)
    
    # ---------- NOVOS CAMPOS: Seleção e Visibilidade ----------
    visivel_outras_vagas = Column(Boolean, default=True)  # Se candidato aparece em outras vagas
    data_selecao = Column(DateTime(timezone=True), nullable=True)  # Quando empresa selecionou
    notas_selecao = Column(Text, nullable=True)  # Notas da empresa sobre seleção
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    vaga = relationship("Job", back_populates="vaga_candidatos")
    candidate = relationship("Candidate", back_populates="vaga_candidatos")
    historico_estados = relationship("HistoricoEstadoPipeline", back_populates="vaga_candidato", order_by="HistoricoEstadoPipeline.created_at")
    cobrancas = relationship("Cobranca", back_populates="vaga_candidato")  # PAGAMENTOS
    
    def __repr__(self):
        return f"<VagaCandidato(vaga_id={self.vaga_id}, candidate_id={self.candidate_id}, status={self.status_kanban})>"
