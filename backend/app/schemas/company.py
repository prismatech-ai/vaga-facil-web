"""
Schemas Pydantic para empresa
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime


class CompanyBase(BaseModel):
    """Schema base para empresa"""
    cnpj: str = Field(..., min_length=14, max_length=14, description="CNPJ da empresa (apenas números)")
    razao_social: str = Field(..., min_length=3, max_length=255)
    nome_fantasia: Optional[str] = Field(None, max_length=255)
    setor: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    fone: Optional[str] = Field(None, max_length=20)
    site: Optional[str] = Field(None, max_length=255)
    descricao: Optional[str] = None
    cidade: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = Field(None, max_length=2)
    
    @validator("cnpj", pre=True, always=True)
    def validate_cnpj(cls, v):
        """Valida formato do CNPJ (apenas números)"""
        if v is None:
            return v
        if not v.isdigit():
            raise ValueError("CNPJ deve conter apenas números")
        if len(v) != 14:
            raise ValueError("CNPJ deve ter 14 dígitos")
        return v


class CompanyCreate(CompanyBase):
    """Schema para criação de empresa"""
    email: EmailStr
    password: str = Field(..., min_length=6)


class CompanyUpdate(BaseModel):
    """Schema para atualização de empresa"""
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    setor: Optional[str] = None
    email: Optional[str] = None
    fone: Optional[str] = None
    site: Optional[str] = None
    descricao: Optional[str] = None
    logo_url: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None


class CompanyResponse(BaseModel):
    """Schema de resposta da empresa"""
    id: int
    user_id: int
    cnpj: Optional[str] = None
    razao_social: str
    nome_fantasia: Optional[str] = None
    setor: Optional[str] = None
    email: Optional[str] = None
    fone: Optional[str] = None
    site: Optional[str] = None
    descricao: Optional[str] = None
    logo_url: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    is_verified: Optional[bool] = False
    is_active: Optional[bool] = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    @validator("is_verified", pre=True, always=True)
    def default_is_verified(cls, v):
        """Default is_verified to False if None"""
        return v if v is not None else False
    
    @validator("is_active", pre=True, always=True)
    def default_is_active(cls, v):
        """Default is_active to True if None"""
        return v if v is not None else True
    
    class Config:
        from_attributes = True


class CompanyPublic(BaseModel):
    """Schema público da empresa (para visualização)"""
    id: int
    razao_social: str
    nome_fantasia: Optional[str] = None
    setor: Optional[str] = None
    email: Optional[str] = None
    fone: Optional[str] = None
    site: Optional[str] = None
    descricao: Optional[str] = None
    logo_url: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    
    class Config:
        from_attributes = True


class CompanyDashboard(BaseModel):
    """Schema para dashboard da empresa"""
    company: CompanyResponse
    total_jobs: int
    open_jobs: int
    total_candidates: int
    convites_enviados: int
    convites_aceitos: int
    total_views: int
    pipeline_candidates: dict  # {status: count}

