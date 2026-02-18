"""
Schemas Pydantic para Vaga
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.job import JobStatus
from app.models.job_application import ApplicationStatus


class ScreeningQuestionBase(BaseModel):
    """Schema base para pergunta de triagem"""
    question: str
    question_type: str = "text"
    is_required: bool = True
    order: int = 0


class ScreeningQuestionCreate(ScreeningQuestionBase):
    """Schema para criação de pergunta de triagem"""
    pass


class ScreeningQuestionResponse(ScreeningQuestionBase):
    """Schema de resposta de pergunta de triagem"""
    id: int
    job_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class JobBase(BaseModel):
    """Schema base para vaga"""
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    area_atuacao: Optional[str] = None
    
    # Requisitos estruturados
    nivel_senioridade: Optional[str] = None  # junior, pleno, senior, especialista
    escolaridade_minima: Optional[str] = None  # Ensino Médio, Graduação, etc.
    experiencia_minima_anos: Optional[int] = 0
    
    location: Optional[str] = None
    remote: bool = False
    job_type: Optional[str] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    salary_currency: str = "BRL"


class JobCreate(JobBase):
    """Schema para criação de vaga"""
    pass


class JobUpdate(BaseModel):
    """Schema para atualização de vaga"""
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    area_atuacao: Optional[str] = None
    nivel_senioridade: Optional[str] = None
    escolaridade_minima: Optional[str] = None
    experiencia_minima_anos: Optional[int] = None
    location: Optional[str] = None
    remote: Optional[bool] = None
    job_type: Optional[str] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    salary_currency: Optional[str] = None
    status: Optional[JobStatus] = None


class JobResponse(JobBase):
    """Schema de resposta da vaga"""
    id: int
    company_id: int
    status: JobStatus
    views_count: int
    applications_count: int
    convites_enviados: int = 0
    convites_aceitos: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class JobPublic(JobBase):
    """Schema público da vaga (para candidatos)"""
    id: int
    company_id: int
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    status: JobStatus
    views_count: int
    applications_count: int
    created_at: datetime
    published_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class JobMetrics(BaseModel):
    """Schema para métricas da vaga"""
    job_id: int
    views_count: int
    applications_count: int
    applications_by_status: dict
    top_candidates: List[dict] = []


# ============================================================================
# SCHEMAS DE CANDIDATURA (JobApplication)
# ============================================================================

class JobApplicationBase(BaseModel):
    """Schema base para candidatura"""
    status: ApplicationStatus = ApplicationStatus.EM_ANALISE
    cover_letter: Optional[str] = None


class JobApplicationResponse(JobApplicationBase):
    """Schema de resposta de candidatura"""
    id: int
    job_id: int
    candidate_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CandidaturaComDetalheVaga(BaseModel):
    """Schema de candidatura com detalhes da vaga"""
    id: int
    status: ApplicationStatus
    cover_letter: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Detalhes da vaga
    job_id: int
    job_title: str
    job_description: str
    job_location: Optional[str] = None
    job_remote: bool = False
    job_type: Optional[str] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    
    # Empresa
    company_id: int
    company_name: str
    company_logo: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# SCHEMAS PARA RECOMENDAÇÃO DE VAGAS
# ============================================================================

class MotivosCompatibilidade(BaseModel):
    """Schema com motivos de compatibilidade"""
    localizacao: dict
    habilidades: dict
    experiencia: dict


class RecomendacaoVaga(BaseModel):
    """Schema de vaga recomendada para candidato"""
    job_id: int
    job_title: str
    company_id: int
    location: Optional[str] = None
    remote: bool
    job_type: Optional[str] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    description: Optional[str] = None  # Primeiros 200 caracteres
    
    # Score de compatibilidade
    compatibilidade_score: float  # 0-100
    motivos: MotivosCompatibilidade
    
    class Config:
        from_attributes = True
