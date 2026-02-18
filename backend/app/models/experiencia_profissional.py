"""
Modelo para Experiências Profissionais dos Candidatos
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ExperienciaProfissional(Base):
    """Modelo para experiências profissionais dos candidatos"""
    __tablename__ = "experiencias_profissionais"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    cargo = Column(String(255), nullable=False)
    empresa = Column(String(255), nullable=False)
    periodo = Column(String(100), nullable=False)  # Ex: 2020-2023 ou Jan/2020 - Atual
    descricao = Column(Text, nullable=True)  # Descrição das atividades
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now(), onupdate=func.now())

    # Relacionamentos
    candidate = relationship("Candidate", back_populates="experiencias_profissionais_rel")

    def __repr__(self):
        return f"<ExperienciaProfissional(id={self.id}, candidate_id={self.candidate_id}, cargo={self.cargo})>"
