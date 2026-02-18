"""
Modelo de interesse em trabalho temporário/paradas industriais
"""
from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class TrabalhoTemporario(Base):
    """Modelo para registrar interesse em trabalho temporário"""
    __tablename__ = "trabalho_temporario"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False, index=True)
    
    # Interesse geral
    tem_interesse = Column(Boolean, default=False)
    
    # Tipos de trabalho (armazenar como JSON para múltiplas seleções)
    tipos_trabalho = Column(JSON, nullable=True)  # Array: ["Paradas Industriais", "Manutenção de Equipamentos", ...]
    
    # Disponibilidade geográfica
    disponibilidade_geografica = Column(Text, nullable=True)  # Exemplo: "São Paulo (capital), Minas Gerais, Rio de Janeiro"
    
    # Restrições de saúde
    restricao_saude = Column(Text, nullable=True)  # Descrição de restrições (opcional)
    
    # Experiência anterior
    experiencia_anterior = Column(Text, nullable=True)  # Descrição de experiência anterior (opcional)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    candidate = relationship("Candidate", backref="trabalhos_temporarios")

