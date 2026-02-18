"""
Schemas para Vagas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.competencia import AreaAtuacao, NivelProficiencia


class VagaRequisitoBase(BaseModel):
    competencia_id: int
    nivel_minimo: NivelProficiencia
    teste_obrigatorio: Optional[int] = 0


class VagaRequisitoCreate(VagaRequisitoBase):
    pass


class VagaRequisitoResponse(VagaRequisitoBase):
    id: int
    vaga_id: int
    
    class Config:
        from_attributes = True


class VagaBase(BaseModel):
    title: str
    description: str
    area_atuacao: AreaAtuacao
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    location: Optional[str] = None
    remote: bool = False
    job_type: Optional[str] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None


class VagaCreate(VagaBase):
    requisitos: List[VagaRequisitoCreate]  # Obrigatório: filtros técnicos


class VagaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    location: Optional[str] = None
    remote: Optional[bool] = None
    job_type: Optional[str] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None


class VagaResponse(VagaBase):
    id: int
    company_id: int
    status: str
    requisitos: List[VagaRequisitoResponse]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ListaVagas(BaseModel):
    """Resposta com lista de vagas da empresa"""
    total: int
    vagas: List[VagaResponse]
    
    class Config:
        from_attributes = True
