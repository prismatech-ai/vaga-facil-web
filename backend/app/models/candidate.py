"""
Modelo de candidato
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Date, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class Genero(str, enum.Enum):
    """Gênero do candidato"""
    MASCULINO = "Masculino"
    FEMININO = "Feminino"
    OUTRO = "Outro"
    PREFIRO_NAO_INFORMAR = "Prefiro não informar"


class EstadoCivil(str, enum.Enum):
    """Estado civil do candidato"""
    SOLTEIRO = "Solteiro"
    CASADO = "Casado"
    DIVORCIADO = "Divorciado"
    VIUVO = "Viúvo"
    UNIAO_ESTAVEL = "União Estável"


class TipoPCD(str, enum.Enum):
    """Tipos de PCD"""
    fisica = "fisica"
    auditiva = "auditiva"
    visual = "visual"
    intelectual = "intelectual"
    multipla = "multipla"
    psicossocial = "psicossocial"

class Candidate(Base):
    """Modelo de candidato"""
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    cpf = Column(String(11), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Dados pessoais
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    rg = Column(String(20))
    birth_date = Column(Date)
    genero = Column(Enum(Genero))
    estado_civil = Column(Enum(EstadoCivil))
    location = Column(String(255))
    
    # Endereço
    cep = Column(String(10))
    logradouro = Column(String(255))
    numero = Column(String(20))
    complemento = Column(String(100))
    bairro = Column(String(100))
    cidade = Column(String(100))
    estado = Column(String(2))
    
    # PCD (Pessoa com Deficiência)
    is_pcd = Column(Boolean, default=False)
    tipo_pcd = Column(Enum(TipoPCD), nullable=True)
    necessidades_adaptacao = Column(Text, nullable=True)
    
    # Dados Profissionais
    experiencia_profissional = Column(Text, nullable=True)  # Histórico de experiência
    anos_experiencia = Column(Integer, nullable=True)  # Total de anos de experiência
    formacao_escolaridade = Column(Text, nullable=True)  # Formação acadêmica
    formacoes_academicas = Column(Text, nullable=True)  # Formações detalhadas (JSON array)
    habilidades = Column(Text, nullable=True)  # Habilidades (JSON string)
    autoavaliacao_habilidades = Column(Text, nullable=True)  # Auto-avaliação das habilidades (JSON)
    
    # Teste de Habilidades
    teste_habilidades_completado = Column(Boolean, default=False)
    score_teste_habilidades = Column(Integer, nullable=True)  # Pontuação do teste (0-100)
    dados_teste_habilidades = Column(Text, nullable=True)  # Dados completos do teste (JSON)
    
    # Onboarding
    onboarding_completo = Column(Boolean, default=False)
    percentual_completude = Column(Integer, default=0)  # 0-100%
    area_atuacao = Column(String(50), nullable=True)  # NOVO: Área selecionada no onboarding
    status_onboarding = Column(String(50), default="cadastro_inicial")  # NOVO: Estado do onboarding
    
    # Profissional
    resume_url = Column(String(500))
    linkedin_url = Column(String(255))
    portfolio_url = Column(String(255))
    bio = Column(Text)
    
    # Status
    is_active = Column(Boolean, default=True)  # Perfil ativo para buscar emprego
    contratado = Column(Boolean, default=False)  # Marcado como contratado
    data_contratacao = Column(DateTime(timezone=True), nullable=True)  # Data da contratação
    garantia_finalizada = Column(Boolean, default=False)  # Garantia terminou, pode decidir voltar
    data_fim_garantia = Column(DateTime(timezone=True), nullable=True)  # Data que a garantia terminou
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    user = relationship("User", back_populates="candidate")
    applications = relationship("JobApplication", back_populates="candidate")
    autoavaliacoes = relationship("Autoavaliacao", back_populates="candidate", cascade="all, delete-orphan")
    autoavaliacoes_competencias = relationship("AutoavaliacaoCompetencia", back_populates="candidate", cascade="all, delete-orphan")  # NOVO
    candidato_testes = relationship("CandidatoTeste", back_populates="candidate", cascade="all, delete-orphan")  # NOVO
    vaga_candidatos = relationship("VagaCandidato", back_populates="candidate", cascade="all, delete-orphan")  # NOVO
    formacoes_academicas_rel = relationship("FormacaoAcademica", back_populates="candidate", cascade="all, delete-orphan")
    experiencias_profissionais_rel = relationship("ExperienciaProfissional", back_populates="candidate", cascade="all, delete-orphan")
    cobrancas = relationship("Cobranca", back_populates="candidato")  # PAGAMENTOS
    
    def __repr__(self):
        return f"<Candidate(cpf={self.cpf}, full_name={self.full_name})>"

