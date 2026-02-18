"""
Utilitários de segurança e autenticação
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings
import logging
import hashlib

logger = logging.getLogger(__name__)

# Usar hash simples SHA256 como fallback quando bcrypt/argon2 não estão disponíveis
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    USE_PASSLIB = True
except Exception:
    pwd_context = None
    USE_PASSLIB = False


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha está correta"""
    if not hashed_password:
        return False
    
    # Tentar com passlib se disponível
    if USE_PASSLIB:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            pass
    
    # Fallback: comparar hash SHA256 simples (para desenvolvimento)
    # Esperado formato: "sha256:hash_aqui"
    if hashed_password.startswith("sha256:"):
        sha_hash = hashlib.sha256(plain_password.encode()).hexdigest()
        return hashed_password == f"sha256:{sha_hash}"
    
    # Se não conseguir verificar, apenas falha
    return False


def get_password_hash(password: str) -> str:
    """Gera hash da senha"""
    if USE_PASSLIB:
        try:
            return pwd_context.hash(password)
        except Exception:
            pass
    
    # Fallback: usar SHA256 simples para desenvolvimento
    sha_hash = hashlib.sha256(password.encode()).hexdigest()
    return f"sha256:{sha_hash}"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Cria token JWT de acesso"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    logger.debug(f"Token criado para user_id: {data.get('sub')}")
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Cria token JWT de refresh"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decodifica token JWT"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        logger.debug(f"Token decodificado com sucesso. Payload: {payload}")
        return payload
    except JWTError as e:
        logger.error(f"Erro ao decodificar token: {type(e).__name__}: {str(e)}")
        return None


