"""
Endpoints de Autenticação
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token
)
from app.core.dependencies import get_current_user
from app.models.user import User, UserType
from app.models.candidate import Candidate, Genero, EstadoCivil
from app.models.company import Company
from app.models.password_reset import PasswordResetToken
from app.schemas.auth import Token, LoginRequest, RegisterRequest, PasswordResetRequest, PasswordReset
from app.services.email_service import EmailService
from datetime import timedelta, datetime, date
from app.core.config import settings
import re
import secrets
import logging
import traceback

# Setup de logs
logger = logging.getLogger(__name__)

router = APIRouter()


def clean_document(document: str) -> str:
    """Remove formatação de documentos (pontos, traços, barras)"""
    if not document:
        return ""
    # Garantir que é string e está em UTF-8
    if isinstance(document, bytes):
        document = document.decode('utf-8', errors='ignore')
    return re.sub(r'[^\d]', '', document)


def safe_str(value) -> str:
    """Converte valor para string de forma segura, tratando encoding"""
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode('utf-8', errors='ignore')
    return str(value)


def safe_date(value) -> date | None:
    """Converte string para date de forma segura"""
    if not value or value in ('', 'null', 'undefined', 'None'):
        return None
    if isinstance(value, date):
        return value
    try:
        # ISO format: YYYY-MM-DD
        return date.fromisoformat(str(value).strip())
    except (ValueError, TypeError):
        logger.warning(f"Data inválida ignorada: {value}")
        return None


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Registro de novo usuário"""
    # Validar tamanho da senha (bcrypt tem limite de 72 bytes)
    if len(register_data.password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Senha muito longa. Máximo 72 bytes permitido."
        )
    
    # Verificar se email já existe
    existing_user = db.query(User).filter(User.email == register_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    
    # Validar e determinar user_type baseado no role
    user_type_value = register_data.role.lower() if register_data.role else None
    if user_type_value not in ["admin", "empresa", "candidato"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de usuário inválido. Use 'admin', 'empresa' ou 'candidato'"
        )

    # Criar novo usuário
    user = User(
        email=register_data.email,
        password_hash=get_password_hash(register_data.password),
        user_type=UserType(user_type_value),
        is_active=True,
        is_verified=False
    )

    db.add(user)
    # NÃO fazer commit aqui - aguardar criação de perfil (empresa/candidato)
    try:
        db.flush()  # Apenas flush para obter o user.id
        logger.info(f"User flush OK. user_id={user.id}")
    except Exception as e:
        logger.error(f"Erro ao flush do user: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar usuário: {str(e)}"
        )

    # Criar perfil específico baseado no tipo
    try:
        if user_type_value == "admin":
            # admin não precisa de perfil adicional, apenas o User
            pass

        elif user_type_value == "empresa":
            # Validar campos obrigatórios da empresa
            logger.info(f"Registrando empresa - razaoSocial: {register_data.razaoSocial}, cnpj: {register_data.cnpj}")
            
            if not register_data.razaoSocial or not register_data.cnpj:
                logger.error("Campos obrigatórios faltando para empresa")
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Razão Social e CNPJ são obrigatórios para empresas"
                )
            
            # Limpar CNPJ (remover formatação)
            cnpj_clean = clean_document(register_data.cnpj)
            logger.info(f"CNPJ limpo: {cnpj_clean}")
            
            if len(cnpj_clean) != 14:
                logger.error(f"CNPJ inválido: {cnpj_clean} (tamanho: {len(cnpj_clean)})")
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CNPJ inválido. Deve conter 14 dígitos"
                )
            
            # Verificar se CNPJ já existe
            existing_company = db.query(Company).filter(Company.cnpj == cnpj_clean).first()
            if existing_company:
                logger.error(f"CNPJ já cadastrado: {cnpj_clean}")
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CNPJ já cadastrado"
                )
            
            # Criar empresa
            logger.info(f"Criando empresa para user_id: {user.id}, cnpj: {cnpj_clean}")
            company = Company(
                user_id=user.id,
                cnpj=cnpj_clean,
                razao_social=safe_str(register_data.razaoSocial),
                setor=safe_str(register_data.setor) if register_data.setor else None,
                cep=safe_str(register_data.cepempresa) if register_data.cepempresa else None,
                pessoa_de_contato=safe_str(register_data.pessoaDeContato) if register_data.pessoaDeContato else None,
                fone=safe_str(register_data.foneempresa) if register_data.foneempresa else None,
                is_active=True,
                is_verified=False
            )
            db.add(company)
            db.flush()
            logger.info(f"Empresa criada. Company ID: {company.id}")

        elif user_type_value == "candidato":
            # Validar campos obrigatórios do candidato
            if not register_data.nome:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Nome é obrigatório para candidatos"
                )

            if not register_data.cpf:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CPF é obrigatório para candidatos"
                )

            # Limpar CPF (remover formatação)
            cpf_clean = clean_document(register_data.cpf)

            # Validar formato do CPF
            if len(cpf_clean) != 11:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CPF inválido. Deve conter 11 dígitos"
                )

            # Verificar se CPF já existe
            existing_candidate = db.query(Candidate).filter(Candidate.cpf == cpf_clean).first()
            if existing_candidate:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CPF já cadastrado"
                )
        
            # Converter genero e estado_civil para Enum
            genero_enum = None
            if register_data.genero:
                try:
                    genero_enum = Genero(register_data.genero)
                except ValueError:
                    genero_enum = None
            
            estado_civil_enum = None
            if register_data.estadoCivil:
                try:
                    estado_civil_enum = EstadoCivil(register_data.estadoCivil)
                except ValueError:
                    estado_civil_enum = None
            
            # Criar candidato
            endereco = register_data.endereco.model_dump() if register_data.endereco else {}
            
            # Converter dataNascimento de string para date
            birth_date_parsed = safe_date(register_data.dataNascimento)
            logger.info(f"dataNascimento raw={register_data.dataNascimento!r} parsed={birth_date_parsed}")
            
            candidate = Candidate(
                user_id=user.id,
                full_name=safe_str(register_data.nome),
                phone=safe_str(register_data.telefone) if register_data.telefone else None,
                cpf=cpf_clean,
                rg=safe_str(register_data.rg) if register_data.rg else None,
                birth_date=birth_date_parsed,
                genero=genero_enum,
                estado_civil=estado_civil_enum,
                cep=safe_str(endereco.get("cep")) if endereco and endereco.get("cep") else None,
                logradouro=safe_str(endereco.get("logradouro")) if endereco and endereco.get("logradouro") else None,
                numero=safe_str(endereco.get("numero")) if endereco and endereco.get("numero") else None,
                complemento=safe_str(endereco.get("complemento")) if endereco and endereco.get("complemento") else None,
                bairro=safe_str(endereco.get("bairro")) if endereco and endereco.get("bairro") else None,
                cidade=safe_str(endereco.get("cidade")) if endereco and endereco.get("cidade") else None,
                estado=safe_str(endereco.get("estado")) if endereco and endereco.get("estado") else None,
            )

            db.add(candidate)
            db.flush()
            logger.info(f"Candidato criado. Candidate ID: {candidate.id}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar perfil ({user_type_value}): {e}\n{traceback.format_exc()}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar perfil: {str(e)}"
        )

    logger.info(f"Iniciando commit para usuário tipo: {user_type_value}")
    print(f"DEBUG: Iniciando commit para usuário tipo: {user_type_value}")
    try:
        db.commit()
        logger.info(f"Commit realizado com sucesso para usuário {user.id} ({user_type_value})")
        print(f"DEBUG: Commit realizado com sucesso para usuário {user.id} ({user_type_value})")
    except Exception as e:
        logger.error(f"Erro ao fazer commit: {str(e)}", exc_info=True)
        print(f"DEBUG: ERRO ao fazer commit: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar registro no banco de dados: {str(e)}"
        )
    
    # Criar tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "user_type": user.user_type.value}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )
    
    # Definir rota de redirecionamento baseado no tipo de usuário
    redirect_route = "/dashboard"  # Padrão
    if user_type_value == "empresa":
        redirect_route = "/dashboard/empresa"
    elif user_type_value == "candidato":
        redirect_route = "/dashboard/candidato"
    elif user_type_value == "admin":
        redirect_route = "/dashboard/admin"
    
    return {
        "id": user.id,
        "email": user.email,
        "role": user_type_value,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login de usuário"""
    # Validar tamanho da senha (bcrypt tem limite de 72 bytes)
    if len(login_data.password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Senha muito longa. Máximo 72 bytes permitido."
        )
    
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )
    
    # Criar tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "user_type": user.user_type.value}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )
    
    # Definir rota de redirecionamento baseado no tipo de usuário
    redirect_route = "/dashboard"  # Padrão
    if user.user_type == UserType.empresa:
        redirect_route = "/dashboard/empresa"
    elif user.user_type == UserType.candidato:
        redirect_route = "/dashboard/candidato"
    elif user.user_type == UserType.admin:
        redirect_route = "/dashboard/admin"
    
    return {
        "id": user.id,
        "email": user.email,
        "role": user.user_type.value,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@router.post("/login/form", response_model=Token)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login usando OAuth2 form (para documentação Swagger)"""
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )
    
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "user_type": user.user_type.value}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Retorna informações do usuário atual"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "user_type": current_user.user_type.value,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }


@router.get("/verify-token")
async def verify_token(
    current_user: User = Depends(get_current_user)
):
    """Verifica se o token é válido"""
    return {
        "valid": True,
        "user_id": str(current_user.id),
        "email": current_user.email,
        "user_type": current_user.user_type.value
    }


@router.post("/forgot-password")
async def forgot_password(
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Solicita recuperação de senha - envia link para o email de forma assíncrona"""
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        logger.warning(f"Tentativa de reset de senha para email inexistente: {request.email}")
        return {
            "message": "Se o email existir no sistema, um link de recuperação será enviado."
        }

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)

    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
        is_used=False
    )

    db.add(reset_token)
    db.commit()

    # Criar link de reset
    frontend_base_url = (settings.FRONTEND_URL or "https://vagafacil.org").rstrip("/")
    reset_link = f"{frontend_base_url}/redefinir-senha?token={token}"
    
    # Enviar email com link de reset de forma assíncrona em background
    logger.info(f"Agendando envio de email de reset para: {user.email}")
    background_tasks.add_task(
        EmailService.enviar_reset_senha,
        email=user.email,
        nome=user.email.split("@")[0],
        link_reset=reset_link,
        tipo_usuario="empresa" if user.user_type.value == "empresa" else "candidato"
    )

    return {
        "message": "Se o email existir no sistema, um link de recuperação será enviado."
    }


@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """Reseta a senha usando o token recebido por email"""
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == reset_data.token,
        PasswordResetToken.is_used == False
    ).first()

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou já utilizado"
        )

    if reset_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token expirado. Solicite uma nova recuperação de senha."
        )

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    user.password_hash = get_password_hash(reset_data.new_password)
    reset_token.is_used = True

    db.commit()
    
    # Enviar email de confirmação de senha alterada
    EmailService.enviar_email_notificacao(
        email=user.email,
        nome=user.email.split("@")[0],
        assunto="Senha Alterada com Sucesso",
        mensagem="Sua senha foi alterada com sucesso! Se você não fez esta alteração, entre em contato conosco imediatamente.",
        tipo="sucesso"
    )

    return {
        "message": "Senha alterada com sucesso. Você já pode fazer login com a nova senha."
    }


@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user)
):
    """Refresh token - gera um novo access_token"""
    access_token = create_access_token(
        data={"sub": str(current_user.id), "email": current_user.email, "user_type": current_user.user_type.value}
    )
    refresh_token_new = create_refresh_token(
        data={"sub": str(current_user.id)}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token_new,
        "token_type": "bearer"
    }

