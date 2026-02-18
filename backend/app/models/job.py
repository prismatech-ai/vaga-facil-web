"""
Modelo de Vaga
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, Enum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class JobStatus(str, enum.Enum):
    """Status da vaga"""
    RASCUNHO = "rascunho"
    ABERTA = "aberta"
    ENCERRADA = "encerrada"
    PAUSADA = "pausada"


class Job(Base):
    """Modelo de vaga"""
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Informações da vaga
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text)
    benefits = Column(Text)
    area_atuacao = Column(String(50), nullable=True)  # Área da vaga
    
    # Requisitos estruturados
    nivel_senioridade = Column(String(50), nullable=True)  # junior, pleno, senior, especialista
    escolaridade_minima = Column(String(100), nullable=True)  # Ensino Médio, Graduação, etc.
    experiencia_minima_anos = Column(Integer, default=0)  # Anos de experiência mínima
    
    # Localização e tipo
    location = Column(String(255))
    remote = Column(Boolean, default=False)
    job_type = Column(String(50))  # CLT, PJ, Estágio, etc.
    
    # Remuneração
    salary_min = Column(Numeric(10, 2))
    salary_max = Column(Numeric(10, 2))
    salary_currency = Column(String(10), default="BRL")
    
    # Status
    status = Column(Enum(JobStatus), default=JobStatus.RASCUNHO, nullable=False)
    
    # Métricas
    views_count = Column(Integer, default=0)
    applications_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    
    # Relacionamentos
    company = relationship("Company", back_populates="jobs")
    applications = relationship("JobApplication", back_populates="job", cascade="all, delete-orphan")
    requisitos = relationship("VagaRequisito", back_populates="vaga", cascade="all, delete-orphan")  # NOVO
    vaga_candidatos = relationship("VagaCandidato", back_populates="vaga", cascade="all, delete-orphan")  # NOVO
    cobrancas = relationship("Cobranca", back_populates="vaga")  # PAGAMENTOS
    contratos = relationship("ContratoPlataforma", back_populates="vaga")  # CONTRATOS
    
    def __repr__(self):
        return f"<Job(id={self.id}, title={self.title}, status={self.status})>"


