"""
Schemas para Kanban e Matching
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.candidato_teste import StatusKanbanCandidato


class CandidatoAnonimoKanban(BaseModel):
    """Representação anônima do candidato no kanban"""
    id_anonimo: str  # Hash de identificação
    status_kanban: StatusKanbanCandidato
    testes_realizados: int
    testes_totais: int
    competencias_declaradas: int


class CandidatoComDadosResponse(BaseModel):
    """Dados completos do candidato (apenas após consentimento)"""
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    cpf: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    bio: Optional[str] = None
    
    class Config:
        from_attributes = True


class CardKanban(BaseModel):
    """Card do candidato no kanban"""
    id_anonimo: str
    status: StatusKanbanCandidato
    empresa_demonstrou_interesse: bool
    consentimento_entrevista: bool
    dados_liberados: bool


class ColunaKanban(BaseModel):
    """Uma coluna do kanban"""
    status: StatusKanbanCandidato
    quantidade: int
    candidatos: List[CardKanban]


class KanbanResponse(BaseModel):
    """Resposta com o kanban completo de uma vaga"""
    vaga_id: int
    vaga_titulo: str
    total_candidatos: int
    candidatos_excluidos_por_filtros: int
    motivo_exclusao: Optional[str] = None
    colunas: List[ColunaKanban]
    
    class Config:
        from_attributes = True


class DemonstraInteresseRequest(BaseModel):
    """Request para demonstrar interesse em um candidato"""
    candidate_id_anonimo: str


class AceiteEntrevistaRequest(BaseModel):
    """Request para aceitar convite de entrevista"""
    consentimento: bool
    mensagem_aceite: Optional[str] = None


class DadosCandidatoResponse(BaseModel):
    """Resposta com dados do candidato após aceite de entrevista"""
    full_name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    consentimento_entrevista: bool
    data_consentimento: datetime
    
    class Config:
        from_attributes = True
