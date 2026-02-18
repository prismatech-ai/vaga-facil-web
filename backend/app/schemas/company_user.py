"""
Schemas para gestão de usuários da empresa
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CompanyUserBase(BaseModel):
    """Base para usuário da empresa"""
    can_create_jobs: bool = True
    can_manage_pipeline: bool = True
    can_view_analytics: bool = True


class CompanyUserCreate(BaseModel):
    """Schema para criar novo usuário da empresa"""
    email: str
    senha: str
    nome: str
    can_create_jobs: bool = True
    can_manage_pipeline: bool = True
    can_view_analytics: bool = True


class CompanyUserUpdate(BaseModel):
    """Schema para atualizar permissões do usuário da empresa"""
    can_create_jobs: Optional[bool] = None
    can_manage_pipeline: Optional[bool] = None
    can_view_analytics: Optional[bool] = None


class CompanyUserResponse(BaseModel):
    """Response com dados do usuário da empresa"""
    id: int
    company_id: int
    user_id: int
    can_create_jobs: bool
    can_manage_pipeline: bool
    can_view_analytics: bool
    created_at: datetime
    
    # Dados do usuário associado
    usuario: dict = None
    
    class Config:
        from_attributes = True


class CompanyUserListResponse(BaseModel):
    """Response para listagem de usuários"""
    id: int
    user_id: int
    email: str
    nome: str
    can_create_jobs: bool
    can_manage_pipeline: bool
    can_view_analytics: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
