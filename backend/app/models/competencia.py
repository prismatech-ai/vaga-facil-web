"""
Modelo de Competência e Autoavaliação
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum as SQLEnum, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class AreaAtuacao(str, enum.Enum):
    """Áreas de atuação disponíveis"""
    ELETRICA = "eletrica"
    MANUTENCAO = "manutencao"
    AUTOMACAO = "automacao"
    MECANICA = "mecanica"
    CIVIL = "civil"
    PNEUMATICA = "pneumatica"
    HIDRAULICA = "hidraulica"
    ELETRONICA = "eletronica"
    PROGRAMACAO = "programacao"
    REDES = "redes"


class NivelProficiencia(int, enum.Enum):
    """
    Níveis de proficiência em uma competência
    Escala padronizada 0-4 para autoavaliação de competências
    """
    NAO_EXPOSTO = 0      # Nunca trabalhou com essa competência
    BASICO = 1           # Conhecimento básico, consegue executar tarefas simples com supervisão
    INTERMEDIARIO = 2    # Executa tarefas de forma autônoma, resolve problemas comuns
    AVANCADO = 3         # Domínio avançado, resolve problemas complexos, mentora outros
    ESPECIALISTA = 4     # Expert reconhecido, define padrões, lidera inovações na área
    
    @classmethod
    def get_descricao(cls, nivel: int) -> str:
        """Retorna descrição do nível"""
        descricoes = {
            0: "Não exposto - Nunca trabalhou com essa competência",
            1: "Básico - Conhecimento básico, executa tarefas simples com supervisão",
            2: "Intermediário - Executa tarefas de forma autônoma, resolve problemas comuns",
            3: "Avançado - Domínio avançado, resolve problemas complexos, pode mentorar",
            4: "Especialista - Expert reconhecido, define padrões, lidera inovações"
        }
        return descricoes.get(nivel, "Nível desconhecido")
    
    @classmethod
    def get_nome(cls, nivel: int) -> str:
        """Retorna nome curto do nível"""
        nomes = {
            0: "Não exposto",
            1: "Básico",
            2: "Intermediário",
            3: "Avançado",
            4: "Especialista"
        }
        return nomes.get(nivel, "Desconhecido")


class Competencia(Base):
    """Competências disponíveis por área de atuação"""
    __tablename__ = "competencias"

    id = Column(Integer, primary_key=True, index=True)
    area = Column(String(50), nullable=False, index=True)  # Usar String para flexibilidade
    nome = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    categoria = Column(String(100), nullable=True)  # Agrupamento: técnica, soft skills, etc.
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    autoavaliacoes = relationship("AutoavaliacaoCompetencia", back_populates="competencia", cascade="all, delete-orphan")
    vaga_requisitos = relationship("VagaRequisito", back_populates="competencia", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Competencia(id={self.id}, area={self.area}, nome={self.nome})>"


class AutoavaliacaoCompetencia(Base):
    """Autoavaliação do candidato em cada competência"""
    __tablename__ = "autoavaliacao_competencias"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    competencia_id = Column(Integer, ForeignKey("competencias.id"), nullable=False)
    
    # Nível declarado (0-4) - escala padronizada
    # 0=Não exposto, 1=Básico, 2=Intermediário, 3=Avançado, 4=Especialista
    nivel_declarado = Column(Integer, nullable=False, default=0)
    
    # Descrição opcional do candidato sobre sua experiência
    descricao_experiencia = Column(Text, nullable=True)
    
    # Anos de experiência declarados (opcional)
    anos_experiencia = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    candidate = relationship("Candidate", back_populates="autoavaliacoes_competencias")
    competencia = relationship("Competencia", back_populates="autoavaliacoes")
    
    @property
    def nivel_nome(self) -> str:
        """Retorna o nome do nível de proficiência"""
        return NivelProficiencia.get_nome(self.nivel_declarado)
    
    @property
    def nivel_descricao(self) -> str:
        """Retorna a descrição completa do nível"""
        return NivelProficiencia.get_descricao(self.nivel_declarado)
    
    def __repr__(self):
        return f"<AutoavaliacaoCompetencia(candidate_id={self.candidate_id}, competencia_id={self.competencia_id}, nivel={self.nivel_declarado})>"


class NivelCertificado(int, enum.Enum):
    """
    Níveis de certificação de competência (resultado do teste)
    Escala padronizada 0-4
    """
    N0_NAO_CERTIFICADO = 0   # Não passou no teste básico
    N1_BASICO = 1            # Certificado nível básico
    N2_INTERMEDIARIO = 2     # Certificado nível intermediário
    N3_AVANCADO = 3          # Certificado nível avançado
    N4_ESPECIALISTA = 4      # Certificado nível especialista
    
    @classmethod
    def get_descricao(cls, nivel: int) -> str:
        """Retorna descrição do nível certificado"""
        descricoes = {
            0: "Não certificado - Não atingiu o nível mínimo",
            1: "Certificado Básico - Conhecimentos fundamentais validados",
            2: "Certificado Intermediário - Competência prática validada",
            3: "Certificado Avançado - Domínio avançado validado",
            4: "Certificado Especialista - Expertise reconhecida"
        }
        return descricoes.get(nivel, "Nível desconhecido")
    
    @classmethod
    def get_nome(cls, nivel: int) -> str:
        """Retorna nome curto do nível"""
        nomes = {
            0: "N0 - Não certificado",
            1: "N1 - Básico",
            2: "N2 - Intermediário",
            3: "N3 - Avançado",
            4: "N4 - Especialista"
        }
        return nomes.get(nivel, "Desconhecido")


class CertificacaoSessao(Base):
    """
    Sessão de teste de certificação de competência (BD CC)
    Implementa a lógica de progressão: Básico → Intermediário → Avançado
    """
    __tablename__ = "certificacao_sessoes"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    competencia_nome = Column(String(255), nullable=False)  # Nome da competência testada
    competencia_id = Column(Integer, ForeignKey("competencias.id"), nullable=True)  # Referência opcional
    
    # Estado atual do teste
    nivel_atual = Column(String(20), nullable=False, default="basico")  # basico, intermediario, avancado
    questao_atual_index = Column(Integer, default=0)  # Índice da questão atual no nível
    
    # Contadores de acertos por nível (5 questões cada)
    acertos_basico = Column(Integer, default=0)
    total_basico = Column(Integer, default=5)  # Sempre 5 questões por nível
    acertos_intermediario = Column(Integer, default=0)
    total_intermediario = Column(Integer, default=0)  # 0 se não chegou neste nível
    acertos_avancado = Column(Integer, default=0)
    total_avancado = Column(Integer, default=0)  # 0 se não chegou neste nível
    
    # Histórico detalhado de respostas (JSON)
    # [{question_id, alternative_id, is_correct, nivel, timestamp}]
    historico_respostas = Column(JSON, nullable=True)
    
    # IDs das questões usadas nesta sessão (para evitar repetição)
    questoes_usadas = Column(JSON, nullable=True)  # [question_id, ...]
    
    # Estado e resultado final
    is_completed = Column(Boolean, default=False)
    nivel_final_certificado = Column(Integer, nullable=True)  # 0, 1, 2, 3 ou 4
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    tempo_total_segundos = Column(Integer, nullable=True)  # Tempo total do teste
    
    # Relacionamentos
    candidate = relationship("Candidate", backref="certificacao_sessoes")
    
    @property
    def nivel_nome(self) -> str:
        """Retorna o nome do nível certificado"""
        if self.nivel_final_certificado is not None:
            return NivelCertificado.get_nome(self.nivel_final_certificado)
        return "Em andamento"
    
    def __repr__(self):
        return f"<CertificacaoSessao(id={self.id}, competencia={self.competencia_nome}, nivel_final={self.nivel_final_certificado})>"


class CertificacaoCompetencia(Base):
    """
    Resultado final de certificação de competência (BD CC)
    Armazena o resultado definitivo após completar o teste
    """
    __tablename__ = "certificacao_competencias"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    competencia_id = Column(Integer, ForeignKey("competencias.id"), nullable=True)
    competencia_nome = Column(String(255), nullable=False)
    sessao_id = Column(Integer, ForeignKey("certificacao_sessoes.id"), nullable=False)
    
    # Resultado da certificação (0-4)
    nivel_certificado = Column(Integer, nullable=False)
    
    # Detalhes do resultado
    acertos_basico = Column(Integer, default=0)
    acertos_intermediario = Column(Integer, default=0)
    acertos_avancado = Column(Integer, default=0)
    
    # Comparação com autoavaliação
    nivel_autoavaliacao = Column(Integer, nullable=True)  # Nível declarado na autoavaliação
    diferenca_auto_cert = Column(Integer, nullable=True)  # Diferença entre auto e cert (pode ser negativo)
    
    # Validade da certificação
    valido_ate = Column(DateTime(timezone=True), nullable=True)  # Certificações podem expirar
    is_valido = Column(Boolean, default=True)
    
    # Timestamps
    certified_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamentos
    candidate = relationship("Candidate", backref="certificacoes_competencias")
    sessao = relationship("CertificacaoSessao", backref="certificacao_resultado")
    competencia = relationship("Competencia", backref="certificacoes")
    
    @property
    def nivel_nome(self) -> str:
        """Retorna o nome do nível certificado"""
        return NivelCertificado.get_nome(self.nivel_certificado)
    
    @property
    def status_comparacao(self) -> str:
        """Compara autoavaliação com certificação"""
        if self.diferenca_auto_cert is None:
            return "Sem autoavaliação"
        if self.diferenca_auto_cert == 0:
            return "Confirmado"
        elif self.diferenca_auto_cert > 0:
            return f"Superestimou em {self.diferenca_auto_cert} nível(is)"
        else:
            return f"Subestimou em {abs(self.diferenca_auto_cert)} nível(is)"
    
    def __repr__(self):
        return f"<CertificacaoCompetencia(candidate_id={self.candidate_id}, competencia={self.competencia_nome}, nivel={self.nivel_certificado})>"


class MapaCompetencias(Base):
    """
    Mapa consolidado de competências: Auto x Certificação
    Visão unificada para empresas consultarem
    """
    __tablename__ = "mapa_competencias"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    competencia_nome = Column(String(255), nullable=False)
    competencia_id = Column(Integer, ForeignKey("competencias.id"), nullable=True)
    
    # Níveis
    nivel_autoavaliacao = Column(Integer, nullable=True)  # 0-4 ou NULL se não declarou
    nivel_certificado = Column(Integer, nullable=True)    # 0-4 ou NULL se não testou
    
    # Análise
    diferenca = Column(Integer, nullable=True)  # autoavaliacao - certificado
    confiabilidade = Column(String(50), nullable=True)  # "alta", "media", "baixa"
    
    # Timestamps
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relacionamentos
    candidate = relationship("Candidate", backref="mapa_competencias")
    
    @property
    def status(self) -> str:
        """Status da competência no mapa"""
        if self.nivel_autoavaliacao is not None and self.nivel_certificado is not None:
            return "Completo"
        elif self.nivel_autoavaliacao is not None:
            return "Apenas autoavaliação"
        elif self.nivel_certificado is not None:
            return "Apenas certificação"
        return "Não avaliado"
    
    def __repr__(self):
        return f"<MapaCompetencias(candidate_id={self.candidate_id}, competencia={self.competencia_nome}, auto={self.nivel_autoavaliacao}, cert={self.nivel_certificado})>"
