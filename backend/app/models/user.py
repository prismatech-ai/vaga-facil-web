"""
Modelo de Usuário
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class UserType(str, enum.Enum):
    """Tipos de usuário"""
    admin = "admin"
    empresa = "empresa"
    candidato = "candidato"


class User(Base):
    """Modelo de usuário"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    user_type = Column(Enum(UserType), nullable=False, default=UserType.candidato)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    company = relationship("Company", back_populates="user", uselist=False)
    candidate = relationship("Candidate", back_populates="user", uselist=False)
    tests_created = relationship("Test", back_populates="creator")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, type={self.user_type})>"

