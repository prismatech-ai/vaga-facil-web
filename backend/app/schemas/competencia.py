"""
Schemas para Competências e Autoavaliação

Escala de Proficiência (0-4):
- 0: Não exposto - Nunca trabalhou com essa competência
- 1: Básico - Conhecimento básico, executa tarefas simples com supervisão
- 2: Intermediário - Executa tarefas de forma autônoma, resolve problemas comuns
- 3: Avançado - Domínio avançado, resolve problemas complexos, pode mentorar
- 4: Especialista - Expert reconhecido, define padrões, lidera inovações
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
from app.models.competencia import AreaAtuacao, NivelProficiencia


# Constantes para escala de proficiência
ESCALA_PROFICIENCIA = {
    0: {"nome": "Não exposto", "descricao": "Nunca trabalhou com essa competência"},
    1: {"nome": "Básico", "descricao": "Conhecimento básico, executa tarefas simples com supervisão"},
    2: {"nome": "Intermediário", "descricao": "Executa tarefas de forma autônoma, resolve problemas comuns"},
    3: {"nome": "Avançado", "descricao": "Domínio avançado, resolve problemas complexos, pode mentorar"},
    4: {"nome": "Especialista", "descricao": "Expert reconhecido, define padrões, lidera inovações"}
}


class EscalaProficienciaResponse(BaseModel):
    """Schema para retornar os níveis da escala de proficiência"""
    nivel: int
    nome: str
    descricao: str


class CompetenciaBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    area: AreaAtuacao


class CompetenciaCreate(CompetenciaBase):
    pass


class CompetenciaResponse(CompetenciaBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class CompetenciaSelectResponse(BaseModel):
    """Schema para retornar competências em um select/dropdown"""
    id: int
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    area: AreaAtuacao
    
    class Config:
        from_attributes = True


class AutoavaliacaoCompetenciaBase(BaseModel):
    competencia_id: int
    nivel_declarado: int = Field(ge=0, le=4, description="Nível de proficiência (0-4)")
    descricao_experiencia: Optional[str] = Field(None, max_length=1000, description="Descrição da experiência")
    anos_experiencia: Optional[int] = Field(None, ge=0, le=50, description="Anos de experiência")
    
    @field_validator('nivel_declarado')
    @classmethod
    def validar_nivel(cls, v):
        if v < 0 or v > 4:
            raise ValueError('Nível deve estar entre 0 e 4')
        return v


class AutoavaliacaoCompetenciaCreate(AutoavaliacaoCompetenciaBase):
    pass


class AutoavaliacaoCompetenciaResponse(AutoavaliacaoCompetenciaBase):
    id: int
    candidate_id: int
    nivel_nome: Optional[str] = None
    nivel_descricao_completa: Optional[str] = None
    competencia_nome: Optional[str] = None
    competencia_categoria: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AutoavaliacaoCompetenciaComDetalhes(BaseModel):
    """Schema com detalhes completos da competência e nível"""
    id: int
    candidate_id: int
    competencia_id: int
    competencia_nome: str
    competencia_categoria: Optional[str] = None
    competencia_area: Optional[str] = None
    nivel_declarado: int
    nivel_nome: str
    nivel_descricao: str
    descricao_experiencia: Optional[str] = None
    anos_experiencia: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ListaAutoavaliacao(BaseModel):
    """Resposta com lista de autoavaliações"""
    total: int
    competencias: List[AutoavaliacaoCompetenciaResponse]
    
    class Config:
        from_attributes = True


class AutoavaliacaoBulkCreate(BaseModel):
    """Schema para criar múltiplas autoavaliações de uma vez"""
    competencias: List[AutoavaliacaoCompetenciaCreate]


class AutoavaliacaoResumo(BaseModel):
    """Resumo da autoavaliação do candidato"""
    candidate_id: int
    total_competencias: int
    media_nivel: float
    distribuicao_niveis: dict  # {0: count, 1: count, ...}
    competencias_por_categoria: dict  # {categoria: [{competencia, nivel}]}
    updated_at: Optional[datetime] = None
