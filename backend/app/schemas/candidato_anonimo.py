"""
Schemas para Candidatos Anônimos - Dados sem informações sensíveis
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class FormacaoAcademicaAnonimaResponse(BaseModel):
    """Formação acadêmica anônima"""
    instituicao: Optional[str] = None
    curso: Optional[str] = None
    nivel: Optional[str] = None
    status: Optional[str] = None
    ano_conclusao: Optional[int] = None
    
    class Config:
        from_attributes = True


class NotaTesteAnonimaResponse(BaseModel):
    """Nota de teste anônima"""
    habilidade: Optional[str] = None
    nivel: Optional[str] = None
    pontuacao: Optional[float] = None
    tempo_decorrido: Optional[int] = None
    
    class Config:
        from_attributes = True


class AutoavaliacaoAnonimaResponse(BaseModel):
    """Autoavaliação de habilidade anônima"""
    habilidade: Optional[str] = None
    nivel: Optional[int] = None
    descricao: Optional[str] = None
    
    class Config:
        from_attributes = True


class CandidatoAnonimoResponse(BaseModel):
    """
    Resposta com dados do candidato sem informações sensíveis
    - ID fictício (hash/anonymized)
    - Sem nome completo
    - Sem email
    - Sem telefone
    - Sem CPF
    - Apenas dados públicos e profissionais
    """
    id_anonimo: str  # ID fictício baseado em hash
    
    # Dados pessoais (sem identificação)
    birth_date: Optional[str] = None
    genero: Optional[str] = None
    estado_civil: Optional[str] = None
    
    # Endereço
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    location: Optional[str] = None
    
    # PCD
    is_pcd: bool = False
    tipo_pcd: Optional[str] = None
    necessidades_adaptacao: Optional[str] = None
    
    # Profissional
    bio: Optional[str] = None
    area_atuacao: Optional[str] = None
    experiencia_profissional: Optional[str] = None
    formacao_escolaridade: Optional[str] = None
    habilidades: Optional[str] = None
    
    # Formações acadêmicas
    formacoes_academicas: List[FormacaoAcademicaAnonimaResponse] = []
    
    # Testes e avaliações
    notas_testes: List[NotaTesteAnonimaResponse] = []
    autoavaliacao_habilidades: List[AutoavaliacaoAnonimaResponse] = []
    score_teste_habilidades: Optional[float] = None
    
    # Links públicos
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    
    # Timestamps
    criado_em: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CandidatoAnonimoListResponse(BaseModel):
    """Resposta paginada de candidatos anônimos"""
    total: int
    skip: int
    limit: int
    candidatos: List[CandidatoAnonimoResponse]
    
    class Config:
        from_attributes = True


class CandidatoAnonimoDetalhesResponse(CandidatoAnonimoResponse):
    """Resposta detalhada de um candidato anônimo"""
    autoavaliacao_concluida: bool = False
    teste_habilidades_completado: bool = False
    onboarding_completo: bool = False
    percentual_completude: int = 0
    
    class Config:
        from_attributes = True
