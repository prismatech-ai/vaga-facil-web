"""
Modelo para Formações Acadêmicas dos Candidatos
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class FormacaoAcademica(Base):
    """Modelo para formações acadêmicas dos candidatos"""
    __tablename__ = "formacoes_academicas"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    instituicao = Column(String(255), nullable=False)
    curso = Column(String(255), nullable=False)
    nivel = Column(String(50), nullable=False)  # Ex: Graduação, Pós-Graduação, Mestrado, Doutorado
    status = Column(String(50), nullable=False, default="Completa")  # Ex: Completa, Em andamento, Trancada
    ano_conclusao = Column(Integer, nullable=True)  # Opcional se em andamento
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now(), onupdate=func.now())

    # Relacionamentos
    candidate = relationship("Candidate", back_populates="formacoes_academicas_rel")

    def __repr__(self):
        return f"<FormacaoAcademica(id={self.id}, candidate_id={self.candidate_id}, curso={self.curso})>"
