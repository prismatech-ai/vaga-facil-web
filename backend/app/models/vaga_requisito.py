"""
Modelo de Requisitos de Vaga
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class VagaRequisito(Base):
    """Requisitos técnicos de uma vaga (competências e níveis mínimos)"""
    __tablename__ = "vaga_requisitos"

    id = Column(Integer, primary_key=True, index=True)
    vaga_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    competencia_id = Column(Integer, ForeignKey("competencias.id"), nullable=False)
    
    # Nível mínimo exigido ('1', '2', '3', '4')
    nivel_minimo = Column(String(2), nullable=False)
    
    # Flag para indicar se teste é obrigatório
    teste_obrigatorio = Column(Integer, default=0)  # ID do teste obrigatório ou 0
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    vaga = relationship("Job", back_populates="requisitos")
    competencia = relationship("Competencia", back_populates="vaga_requisitos")
    
    def __repr__(self):
        return f"<VagaRequisito(vaga_id={self.vaga_id}, competencia_id={self.competencia_id}, nivel_minimo={self.nivel_minimo})>"
