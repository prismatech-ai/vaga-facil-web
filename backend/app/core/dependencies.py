"""
Dependências compartilhadas
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserType
from app.models.company import Company
from app.models.candidate import Candidate
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Obtém o usuário atual autenticado"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    logger.debug(f"Token recebido: {token[:50]}...")
    
    payload = decode_token(token)
    logger.debug(f"Payload decodificado: {payload}")
    
    if payload is None:
        logger.error("Token inválido ou expirado")
        raise credentials_exception

    user_id = payload.get("sub")
    logger.debug(f"user_id extraído do token: {user_id} (tipo: {type(user_id)})")
    
    if user_id is None:
        logger.error("user_id não encontrado no token")
        raise credentials_exception

    try:
        # Converter para int se for string
        user_id = int(user_id) if isinstance(user_id, str) else user_id
        logger.debug(f"user_id após conversão: {user_id} (tipo: {type(user_id)})")
    except (ValueError, TypeError) as e:
        logger.error(f"Erro ao converter user_id: {e}")
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    logger.debug(f"Usuário encontrado no banco: {user}")
    
    if user is None:
        logger.error(f"Usuário com id {user_id} não encontrado no banco")
        raise credentials_exception
    
    logger.debug(f"Usuário autenticado: {user.email}, tipo: {user.user_type}, ativo: {user.is_active}")
    return user


async def get_current_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Company:
    """Obtém a empresa do usuário atual (apenas para usuários do tipo empresa)"""
    if current_user.user_type != UserType.empresa:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas empresas podem acessar este recurso."
        )
    
    logger.debug(f"Procurando empresa para user_id: {current_user.id}")
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    
    if company is None:
        logger.error(f"Empresa não encontrada para user_id: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="empresa não encontrada para este usuário"
        )
    
    logger.debug(f"Empresa encontrada: id={company.id}, user_id={company.user_id}")
    return company


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Obtém o usuário atual se for administrador"""
    if current_user.user_type != UserType.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem acessar este recurso."
        )
    return current_user


async def get_current_candidate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Candidate:
    """Obtém o candidato do usuário atual (apenas para usuários do tipo candidato)"""
    if current_user.user_type != UserType.candidato:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas candidatos podem acessar este recurso."
        )
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil de candidato não encontrado para este usuário"
        )
    
    return candidate