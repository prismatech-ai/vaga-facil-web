"""
Schemas Pydantic para Autenticação
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import date


class Token(BaseModel):
    """Schema de token"""
    id: int
    email: str
    role: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 1800  # 30 minutos


class TokenData(BaseModel):
    """Schema de dados do token"""
    user_id: str
    email: str
    user_type: str


class LoginRequest(BaseModel):
    """Schema para login"""
    email: EmailStr
    password: str


class EnderecoCreate(BaseModel):
    """Schema para endereço do candidato"""
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None


class RegisterRequest(BaseModel):
    """Schema para registro"""
    email: EmailStr
    password: str = Field(..., min_length=6)
    nome: Optional[str] = None
    role: str = Field(default="candidato", description="Tipo de usuário: 'admin', 'empresa' ou 'candidato'")
    
    # Campos para empresa
    razaoSocial: Optional[str] = None
    cnpj: Optional[str] = None
    setor: Optional[str] = None
    cepempresa: Optional[str] = None
    pessoaDeContato: Optional[str] = None
    foneempresa: Optional[str] = None
    
    # Campos para candidato
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    rg: Optional[str] = None
    dataNascimento: Optional[str] = None  # Aceita string e converte depois
    genero: Optional[str] = None
    estadoCivil: Optional[str] = None
    endereco: Optional[EnderecoCreate] = None
    
    # Campos adicionais que podem vir do frontend (alias)
    temNecessidadesEspeciais: Optional[bool] = None
    tipoNecessidade: Optional[str] = None
    adaptacoes: Optional[str] = None
    
    class Config:
        """Permite campos extras no request"""
        extra = "ignore"
    
    @field_validator('dataNascimento', mode='before')
    @classmethod
    def validate_data_nascimento(cls, v):
        """Valida e converte dataNascimento"""
        if v is None or v == '' or v == 'null':
            return None
        return v


class PasswordResetRequest(BaseModel):
    """Schema para solicitação de reset de senha"""
    email: EmailStr


class PasswordReset(BaseModel):
    """Schema para reset de senha"""
    token: str
    new_password: str = Field(..., min_length=6)

