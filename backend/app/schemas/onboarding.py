"""
Schemas para onboarding do candidato
"""
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class TipoPCDEnum(str, Enum):
    """Tipos de PCD"""
    fisica = "fisica"
    auditiva = "auditiva"
    visual = "visual"
    intelectual = "intelectual"
    multipla = "multipla"
    psicossocial = "psicossocial"


class DadosPessoaisUpdate(BaseModel):
    """Schema para atualizar dados pessoais"""
    phone: Optional[str] = None
    rg: Optional[str] = None
    birth_date: Optional[str] = None
    genero: Optional[str] = None
    estado_civil: Optional[str] = None
    # Endereço
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    # PCD
    is_pcd: Optional[bool] = None
    tipo_pcd: Optional[TipoPCDEnum] = None
    necessidades_adaptacao: Optional[str] = None


class HabilidadeAutoAvaliacao(BaseModel):
    """Schema para auto-avaliação de habilidade"""
    habilidade: str = Field(..., min_length=1)
    nivel: int = Field(..., ge=1, le=5, description="Nível de 1 a 5")
    anos_experiencia: Optional[int] = None


class ExperienciaProfissional(BaseModel):
    """Schema para experiência profissional"""
    cargo: str = Field(..., min_length=1, description="Cargo/Função")
    empresa: str = Field(..., min_length=1, description="Nome da empresa")
    periodo: str = Field(..., description="Período (ex: 2020-2023 ou Jan/2020 - Atual)")
    descricao: Optional[str] = Field(None, description="Descrição das atividades")


class FormacaoAcademica(BaseModel):
    """Schema para formação acadêmica"""
    instituicao: str = Field(..., min_length=1, description="Nome da instituição")
    curso: str = Field(..., min_length=1, description="Nome do curso")
    nivel: str = Field(..., description="Nível: Fundamental, Médio, Superior, Pós-Graduação, etc")
    status: str = Field(..., description="Status: Completo, Em andamento, Trancado")
    ano_conclusao: Optional[int] = Field(None, description="Ano de conclusão (se completo)")


class FormacaoAcademicaRequest(BaseModel):
    """Schema para request de formações acadêmicas"""
    formacoes_academicas: List[FormacaoAcademica] = Field(..., description="Array de formações acadêmicas")


class ExperienciaProfissionalRequest(BaseModel):
    """Schema para request de experiências profissionais"""
    experiencias_profissionais: List[ExperienciaProfissional] = Field(..., description="Array de experiências profissionais")


class DadosProfissionaisUpdate(BaseModel):
    """Schema para atualizar dados profissionais"""
    bio: Optional[str] = Field(None, description="Bio/Resumo profissional")
    linkedin_url: Optional[str] = Field(None, description="URL do LinkedIn")
    portfolio_url: Optional[str] = Field(None, description="URL do Portfólio")
    resume_url: Optional[str] = Field(None, description="URL/caminho do Currículo (PDF)")
    experiencia_profissional: Optional[str] = Field(None, description="Histórico de experiência profissional")
    formacao_escolaridade: Optional[str] = Field(None, description="Formação acadêmica resumida")
    formacoes_academicas: Optional[List[FormacaoAcademica]] = Field(None, description="Array de formações acadêmicas detalhadas")
    habilidades: Optional[List[HabilidadeAutoAvaliacao]] = Field(None, description="Habilidades técnicas")
    
    class Config:
        from_attributes = True


class DadosProfissionaisMultipart(BaseModel):
    """Schema para multipart form-data (com arquivo)"""
    bio: Optional[str] = Field(None, description="Bio/Resumo profissional")
    linkedin_url: Optional[str] = Field(None, description="URL do LinkedIn")
    portfolio_url: Optional[str] = Field(None, description="URL do Portfólio")
    resume_url: Optional[str] = Field(None, description="URL/caminho do Currículo (PDF)")
    experiencia_profissional: Optional[str] = Field(None, description="Histórico de experiência profissional")
    formacao_escolaridade: Optional[str] = Field(None, description="Formação acadêmica resumida")
    formacoes_academicas: Optional[str] = Field(None, description="JSON string de formações acadêmicas")
    habilidades: Optional[str] = Field(None, description="JSON string de habilidades")
    
    class Config:
        from_attributes = True


class ResultadoTesteHabilidade(BaseModel):
    """Schema para submeter resultado do teste de habilidades"""
    score: int = Field(..., ge=0, le=100, description="Pontuação do teste (0-100)")
    dados_teste: Optional[Dict] = None


class ProgressoOnboarding(BaseModel):
    """Schema com progresso do onboarding"""
    percentual_completude: int
    etapas_completas: Dict[str, bool]
    dados_pessoais_completo: bool
    dados_profissionais_completo: bool
    teste_habilidades_completo: bool
    onboarding_completo: bool


class CandidatoOnboardingResponse(BaseModel):
    """Response completo do candidato com onboarding"""
    # ID e dados do usuário
    id: int
    full_name: str
    email: str
    cpf: Optional[str] = None
    
    # Dados pessoais
    phone: Optional[str] = None
    rg: Optional[str] = None
    birth_date: Optional[str] = None
    genero: Optional[str] = None
    estado_civil: Optional[str] = None
    
    # Endereço
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    location: Optional[str] = None
    
    # PCD
    is_pcd: bool = False
    tipo_pcd: Optional[str] = None
    necessidades_adaptacao: Optional[str] = None
    
    # Dados profissionais
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    resume_url: Optional[str] = None
    area_atuacao: Optional[str] = None
    experiencia_profissional: Optional[str] = None
    formacao_escolaridade: Optional[str] = None
    formacoes_academicas: Optional[List[FormacaoAcademica]] = None
    experiencias_profissionais: Optional[List[ExperienciaProfissional]] = None
    habilidades: Optional[List[HabilidadeAutoAvaliacao]] = None
    autoavaliacao_habilidades: Optional[str] = None
    
    # Teste de habilidades
    teste_habilidades_completado: bool = False
    score_teste_habilidades: Optional[int] = None
    dados_teste_habilidades: Optional[Dict] = None
    
    # Onboarding
    percentual_completude: int = 0
    onboarding_completo: bool = False
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class GeneroEnum(str, Enum):
    """Gênero"""
    MASCULINO = "Masculino"
    FEMININO = "Feminino"
    OUTRO = "Outro"
    PREFIRO_NAO_INFORMAR = "Prefiro não informar"


class EstadoCivilEnum(str, Enum):
    """Estado Civil"""
    SOLTEIRO = "Solteiro"
    CASADO = "Casado"
    DIVORCIADO = "Divorciado"
    VIUVO = "Viúvo"
    UNIAO_ESTAVEL = "União Estável"


class CandidatoPerfilUpdate(BaseModel):
    """Schema para atualizar perfil do candidato"""
    model_config = ConfigDict(extra='ignore')  # Ignorar campos extras
    
    full_name: Optional[str] = None
    phone: Optional[str] = None
    rg: Optional[str] = None
    birth_date: Optional[str] = None
    genero: Optional[GeneroEnum] = None
    estado_civil: Optional[EstadoCivilEnum] = None
    location: Optional[str] = None
    
    # Endereço
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    
    # Profissional
    resume_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    bio: Optional[str] = None
    area_atuacao: Optional[str] = None
    
    @field_validator('genero', mode='before')
    @classmethod
    def normalize_genero(cls, v):
        """Normaliza gênero - aceita valores em qualquer caso"""
        if v is None:
            return v
        if isinstance(v, str):
            # Mapear valores lowercase para os valores esperados
            genero_map = {
                'masculino': 'Masculino',
                'feminino': 'Feminino',
                'outro': 'Outro',
                'prefiro não informar': 'Prefiro não informar',
                'prefiro nao informar': 'Prefiro não informar',
            }
            return genero_map.get(v.lower(), v)
        return v
    
    @field_validator('estado_civil', mode='before')
    @classmethod
    def normalize_estado_civil(cls, v):
        """Normaliza estado civil - aceita valores em qualquer caso"""
        if v is None:
            return v
        if isinstance(v, str):
            # Mapear valores lowercase para os valores esperados
            estado_map = {
                'solteiro': 'Solteiro',
                'casado': 'Casado',
                'divorciado': 'Divorciado',
                'viúvo': 'Viúvo',
                'viuvo': 'Viúvo',
                'união estável': 'União Estável',
                'uniao estavel': 'União Estável',
                'uniao estável': 'União Estável',
            }
            return estado_map.get(v.lower(), v)
        return v


class CandidatoPerfilCreate(BaseModel):
    """Schema para criar o perfil do candidato quando ainda não existe"""
    cpf: str
    full_name: str
    phone: Optional[str] = None
    rg: Optional[str] = None
    birth_date: Optional[str] = None
    genero: Optional[GeneroEnum] = None
    estado_civil: Optional[EstadoCivilEnum] = None
    location: Optional[str] = None
    # Endereço (opcional)
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None


class CandidatoPerfilResponse(BaseModel):
    """Response completo do perfil do candidato"""
    id: int
    cpf: Optional[str] = None
    full_name: str
    email: str
    phone: Optional[str] = None
    rg: Optional[str] = None
    birth_date: Optional[str] = None
    genero: Optional[str] = None
    estado_civil: Optional[str] = None
    location: Optional[str] = None
    
    # Endereço
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    
    # PCD
    is_pcd: bool
    tipo_pcd: Optional[str] = None
    necessidades_adaptacao: Optional[str] = None
    
    # Profissional
    resume_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    bio: Optional[str] = None
    area_atuacao: Optional[str] = None
    experiencia_profissional: Optional[str] = None
    formacao_escolaridade: Optional[str] = None
    formacoes_academicas: Optional[List[FormacaoAcademica]] = None
    
    # Onboarding
    onboarding_completo: bool
    percentual_completude: int
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
