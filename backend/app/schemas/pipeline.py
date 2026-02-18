"""
Schemas Pydantic para Pipeline de candidatos
"""
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime
from app.models.job_application import ApplicationStatus
from app.models.candidate import Candidate
from app.models.job import Job


class ApplicationResponse(BaseModel):
    """Schema de resposta de candidatura"""
    id: int
    job_id: int
    candidate_id: int
    status: ApplicationStatus
    cover_letter: Optional[str] = None
    screening_answers: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Dados relacionados
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    job_title: Optional[str] = None
    
    class Config:
        from_attributes = True


class PipelineUpdate(BaseModel):
    """Schema para atualização de status no pipeline"""
    status: ApplicationStatus


class PipelineStats(BaseModel):
    """Schema para estatísticas do pipeline"""
    total_applications: int
    by_status: Dict[str, int]
    job_id: Optional[int] = None

