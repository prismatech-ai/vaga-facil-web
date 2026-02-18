"""
Modelo de Candidatura
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class ApplicationStatus(str, enum.Enum):
    """Status da candidatura"""
    EM_ANALISE = "em_analise"
    ENTREVISTA = "entrevista"
    FINALISTA = "finalista"
    RECUSADO = "recusado"
    CONTRATADO = "contratado"


class JobApplication(Base):
    """Modelo de candidatura"""
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    
    # Status
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.EM_ANALISE, nullable=False)
    
    # Respostas das perguntas de triagem
    screening_answers = Column(Text)  # JSON string
    
    # Mensagem do candidato
    cover_letter = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    job = relationship("Job", back_populates="applications")
    candidate = relationship("Candidate", back_populates="applications")
    
    def __repr__(self):
        return f"<JobApplication(id={self.id}, job_id={self.job_id}, candidate_id={self.candidate_id}, status={self.status})>"

