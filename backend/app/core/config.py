"""
Configurações da aplicação
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # Aplicação
    APP_NAME: str = "VagaFacil API"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://vaga-facil-front.vercel.app",
        "https://vaga-facil-front-beta.vercel.app",
        "https://vagafacil.org",
        "https://www.vagafacil.org",
        "https://web-production-8dee9.up.railway.app"
    ]
    
    # Banco de dados
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/vagafacil"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production-use-strong-random-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Upload de arquivos
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"]
    FILE_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "https://vagafacil.org"
    
    # Email (para verificação e recuperação de senha)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@vagafacil.org"
    
    # Validação CNPJ
    CNPJ_API_URL: str = "https://www.receitaws.com.br/v1"
    
    # Cloudflare R2 (API compatível com S3)
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "vagafacil-uploads"
    R2_REGION: str = "auto"
    R2_ENDPOINT_URL: str = ""
    R2_PUBLIC_BASE_URL: str = ""
    R2_URL_EXPIRATION: int = 3600  # 1 hora em segundos
    USE_R2: bool = True  # Ativa/desativa uso do R2
    R2_UPLOAD_DIR: str = "uploads"  # Diretório dentro do bucket


# Criar settings AQUI (após load_dotenv ter sido chamado em app/__init__.py)
settings = Settings()

import os

# DEBUG: Mostrar configurações carregadas
print(f"[CONFIG] R2_REGION: {settings.R2_REGION}")
print(f"[CONFIG] R2_BUCKET_NAME: {settings.R2_BUCKET_NAME}")
print(f"[CONFIG] R2_ACCESS_KEY_ID primeiros 4: {settings.R2_ACCESS_KEY_ID[:4] if settings.R2_ACCESS_KEY_ID else 'NONE'}")
print(f"[CONFIG] R2_ENDPOINT_URL: {'SET' if settings.R2_ENDPOINT_URL else 'NONE'}")
print(f"[CONFIG] USE_R2: {settings.USE_R2}")
