"""
Schemas para Testes do Candidato
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.candidato_teste import StatusTesteCandidato


class CandidatoTesteBase(BaseModel):
    test_id: int


class CandidatoTesteCreate(CandidatoTesteBase):
    pass


class CandidatoTesteResponse(CandidatoTesteBase):
    id: int
    candidate_id: int
    status: StatusTesteCandidato
    pontuacao: Optional[float] = None
    tempo_decorrido: Optional[int] = None
    iniciado_em: Optional[datetime] = None
    concluido_em: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class CandidatoTesteUpdate(BaseModel):
    status: StatusTesteCandidato
    pontuacao: Optional[float] = None
    tempo_decorrido: Optional[int] = None


class ListaTestes(BaseModel):
    """Resposta com lista de testes do candidato"""
    pendentes: int
    concluidos: int
    em_andamento: int
    testes: List[CandidatoTesteResponse]
    
    class Config:
        from_attributes = True


class StatusOnboardingResponse(BaseModel):
    """Resposta com status do onboarding"""
    status_onboarding: str
    percentual_completude: int
    area_atuacao: Optional[str] = None
    autoavaliacao_concluida: bool
    testes_concluidos: bool
    onboarding_completo: bool
    # Dados de contratação
    is_active: Optional[bool] = None
    contratado: Optional[bool] = None
    data_contratacao: Optional[datetime] = None
    vaga_titulo: Optional[str] = None
    empresa_nome: Optional[str] = None
    empresa_logo: Optional[str] = None
