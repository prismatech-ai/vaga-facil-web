"""
Modelo de empresa
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Company(Base):
    """Modelo de empresa"""
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    cnpj = Column(String(14), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Dados da empresa
    razao_social = Column(String(255), nullable=False)
    nome_fantasia = Column(String(255))
    setor = Column(String(100))
    cep = Column(String(10))
    pessoa_de_contato = Column(String(255))
    email = Column(String(255))
    fone = Column(String(20))
    site = Column(String(255))
    descricao = Column(Text)
    logo_url = Column(String(500))
    cidade = Column(String(100))
    estado = Column(String(2))
    
    # Status
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Contrato da plataforma
    contrato_ativo = Column(Boolean, default=False)
    data_aceite_termos = Column(DateTime(timezone=True), nullable=True)
    versao_termos_aceitos = Column(String(20), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    user = relationship("User", back_populates="company")
    jobs = relationship("Job", back_populates="company", cascade="all, delete-orphan")
    company_users = relationship("CompanyUser", back_populates="company", cascade="all, delete-orphan")
    cobrancas = relationship("Cobranca", back_populates="empresa", cascade="all, delete-orphan")
    contratos = relationship("ContratoPlataforma", back_populates="empresa", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Company(cnpj={self.cnpj}, razao_social={self.razao_social})>"


class CompanyUser(Base):
    """Usuários adicionais da empresa"""
    __tablename__ = "company_users"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Permissões
    can_create_jobs = Column(Boolean, default=True)
    can_manage_pipeline = Column(Boolean, default=True)
    can_view_analytics = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamentos
    company = relationship("Company", back_populates="company_users")
    user = relationship("User")
    
    def __repr__(self):
        return f"<CompanyUser(id={self.id}, company_id={self.company_id}, user_id={self.user_id})>"

