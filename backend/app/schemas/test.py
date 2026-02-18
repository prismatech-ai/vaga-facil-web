"""
Schemas para testes técnicos
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Union
from datetime import datetime
from app.models.test import TestLevel


class AlternativeBase(BaseModel):
    """Schema base para alternativa"""
    texto: str = Field(..., min_length=1, description="Texto da alternativa")
    is_correct: bool = Field(..., description="Se a alternativa é a correta")
    ordem: int = Field(..., ge=0, description="Ordem da alternativa (0=A, 1=B, 2=C, 3=D)")


class AlternativeCreate(AlternativeBase):
    """Schema para criar alternativa"""
    pass


class AlternativeResponse(AlternativeBase):
    """Schema de resposta para alternativa"""
    id: int
    question_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionBase(BaseModel):
    """Schema base para questão"""
    texto_questao: str = Field(..., min_length=1, description="Texto da questão")
    ordem: int = Field(..., ge=1, description="Ordem da questão no teste")


class QuestionCreate(QuestionBase):
    """Schema para criar questão"""
    alternatives: List[AlternativeCreate] = Field(..., min_items=2, description="Lista de alternativas")


class QuestionResponse(QuestionBase):
    """Schema de resposta para questão"""
    id: int
    test_id: int
    alternatives: List[AlternativeResponse]
    created_at: datetime

    class Config:
        from_attributes = True


class TestBase(BaseModel):
    """Schema base para teste"""
    nome: str = Field(..., min_length=1, max_length=200, description="Nome do teste")
    habilidade: str = Field(..., min_length=1, max_length=200, description="Habilidade avaliada (ex: React, Python)")
    nivel: Union[TestLevel, int] = Field(..., description="Nível de dificuldade do teste (1-5 ou enum)")
    descricao: Optional[str] = Field(None, description="Descrição do objetivo e conteúdo do teste")


class TestCreateRequest(BaseModel):
    """Schema para criar teste (recebe competencia_id e area)"""
    competencia_id: int = Field(..., description="ID da competência")
    area: str = Field(..., description="Área de atuação (ex: automacao, eletrica)")
    nivel: Union[TestLevel, int] = Field(..., description="Nível de dificuldade do teste (1-5 ou enum)")
    descricao: Optional[str] = Field(None, description="Descrição do objetivo e conteúdo do teste")
    questions: List['QuestionCreate'] = Field(default_factory=list, description="Lista de questões do teste")
    
    @field_validator('nivel', mode='before')
    @classmethod
    def convert_nivel(cls, v):
        """Converte número para enum TestLevel"""
        if isinstance(v, int):
            nivel_map = {
                1: TestLevel.iniciante,
                2: TestLevel.basico,
                3: TestLevel.intermediario,
                4: TestLevel.avancado,
                5: TestLevel.expert
            }
            if v not in nivel_map:
                raise ValueError(f"Nível deve ser entre 1 e 5, recebido: {v}")
            return nivel_map[v]
        return v


class TestCreate(TestBase):
    """Schema para criar teste"""
    questions: List[QuestionCreate] = Field(default_factory=list, description="Lista de questões do teste")


class TestUpdate(TestBase):
    """Schema para atualizar teste"""
    questions: List[QuestionCreate] = Field(default_factory=list, description="Lista de questões do teste (substitui todas as existentes)")


class TestResponse(TestBase):
    """Schema de resposta para teste"""
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]
    questions: List[QuestionResponse]

    class Config:
        from_attributes = True


class TestListResponse(TestBase):
    """Schema simplificado para listagem de testes"""
    id: int
    created_by: int
    created_at: datetime
    total_questions: int

    class Config:
        from_attributes = True


class QuestionListItem(BaseModel):
    """Schema para questão na listagem"""
    id: str
    pergunta: str
    alternativas: List[str]
    respostaCorreta: int
    nivel: int


class TestListItemResponse(BaseModel):
    """Schema customizado para listagem de testes no frontend"""
    id: str
    nome: str
    descricao: str
    nivel: int
    habilidade: str
    questoes: List[QuestionListItem]
    createdAt: datetime
    createdBy: str

    class Config:
        from_attributes = True


# ============================================================================
# SCHEMAS PARA TESTE ADAPTATIVO
# ============================================================================

class AdaptiveTestSessionStart(BaseModel):
    """Schema para iniciar sessão de teste adaptativo"""
    habilidade: str = Field(..., description="Habilidade a ser testada (ex: Python, React)")
    nivel_inicial: str = Field(
        ..., 
        description="Nível inicial: 'basico' (1), 'intermediario' (2), ou 'avancado' (3)"
    )


class QuestionWithAlternatives(BaseModel):
    """Schema de questão para teste adaptativo (sem mostrar resposta correta)"""
    id: int
    texto_questao: str
    pergunta: str  # Alias para compatibilidade
    nivel: str  # basico, intermediario, avancado
    opcoes: List[dict]  # [{"id": int, "texto": str, "ordem": int}]
    numero_questao: int  # Ex: 1ª, 2ª, 3ª questão do nível atual


class NextQuestionResponse(BaseModel):
    """Schema de resposta com próxima questão ou finalização"""
    session_id: int
    is_completed: bool
    questao: Optional[QuestionWithAlternatives] = None
    nivel_atual: Optional[str] = None
    progresso: dict  # {"basico": {"acertos": 2, "total": 3}, ...}
    mensagem: Optional[str] = None


class AnswerQuestionRequest(BaseModel):
    """Schema para responder uma questão"""
    question_id: int
    alternative_id: int


class AdaptiveTestResult(BaseModel):
    """Schema do resultado final do teste adaptativo"""
    session_id: int
    habilidade: str
    nivel_final_atingido: str  # N0, N1, N2, N3, N4
    descricao_nivel: str  # Descrição do nível atingido
    pontuacao_final: float
    detalhes_por_nivel: dict  # {"basico": {"acertos": 4, "total": 7}, ...}
    historico_respostas: List[dict]
    tempo_total_segundos: Optional[int] = None
    started_at: datetime
    completed_at: datetime

# ============================================================================
# SCHEMAS PARA AUTOAVALIAÇÃO
# ============================================================================

# Escala de proficiência padronizada 0-4
ESCALA_PROFICIENCIA_LABELS = {
    0: "Não exposto",
    1: "Básico",
    2: "Intermediário",
    3: "Avançado",
    4: "Especialista"
}


class HabilidadeAutoavaliacao(BaseModel):
    """Schema para uma habilidade autoavaliada"""
    habilidade: str = Field(..., description="Nome da habilidade (ex: Python, React, JavaScript)")
    nivel: int = Field(..., ge=0, le=4, description="Nível de proficiência (0=Não exposto, 1=Básico, 2=Intermediário, 3=Avançado, 4=Especialista)")
    descricao: Optional[str] = Field(None, description="Descrição/comentários sobre a habilidade")
    anos_experiencia: Optional[int] = Field(None, ge=0, description="Anos de experiência com essa habilidade")
    
    @property
    def nivel_nome(self) -> str:
        return ESCALA_PROFICIENCIA_LABELS.get(self.nivel, "Desconhecido")


class AutoavaliacaoCreate(BaseModel):
    """Schema para criar/atualizar autoavaliação"""
    respostas: List[HabilidadeAutoavaliacao] = Field(..., description="Lista de habilidades autoavaliadas")


class AutoavaliacaoResponse(AutoavaliacaoCreate):
    """Schema de resposta da autoavaliação"""
    id: int
    candidate_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AutoavaliacaoPublica(BaseModel):
    """Schema público da autoavaliação (para empresa/admin visualizar)"""
    candidate_id: int
    candidate_name: str
    candidate_cpf: str  # Parcialmente mascarado
    respostas: List[HabilidadeAutoavaliacao]
    media_nivel: Optional[float] = None  # Média dos níveis declarados
    total_competencias: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class EscalaProficiencia(BaseModel):
    """Schema da escala de proficiência para exibição"""
    nivel: int
    nome: str
    descricao: str