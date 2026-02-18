"""
Schemas para Trabalho Temporário
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TrabalhoTemporarioRequest(BaseModel):
    """Schema para requisições POST/PUT de trabalho temporário"""
    tem_interesse: bool
    tipos_trabalho: Optional[List[str]] = None
    disponibilidade_geografica: Optional[str] = None
    restricao_saude: Optional[str] = None
    experiencia_anterior: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "tem_interesse": True,
                "tipos_trabalho": ["Paradas Industriais", "Manutenção de Equipamentos"],
                "disponibilidade_geografica": "São Paulo, Rio de Janeiro, Minas Gerais",
                "restricao_saude": "Não pode fazer trabalhos em altura",
                "experiencia_anterior": "5 anos em paradas industriais"
            }
        }


class TrabalhoTemporarioResponse(BaseModel):
    """Schema para respostas GET/POST de trabalho temporário"""
    id: int
    candidate_id: int
    tem_interesse: bool
    tipos_trabalho: Optional[List[str]] = None
    disponibilidade_geografica: Optional[str] = None
    restricao_saude: Optional[str] = None
    experiencia_anterior: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "candidate_id": 123,
                "tem_interesse": True,
                "tipos_trabalho": ["Paradas Industriais", "Manutenção de Equipamentos"],
                "disponibilidade_geografica": "São Paulo, Rio de Janeiro, Minas Gerais",
                "restricao_saude": "Não pode fazer trabalhos em altura",
                "experiencia_anterior": "5 anos em paradas industriais",
                "created_at": "2025-12-29T21:00:00",
                "updated_at": "2025-12-29T21:00:00"
            }
        }
