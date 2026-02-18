"""
Endpoints de empresas
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from io import BytesIO
from pathlib import Path
import requests
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_company
from app.core.config import settings
from app.models.user import User, UserType
from app.models.company import Company, CompanyUser
from app.models.candidate import Candidate
from app.models.job import Job
from app.models.candidato_teste import VagaCandidato
from app.models.job_application import JobApplication, ApplicationStatus
from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse,
    CompanyPublic
)
from app.schemas.company_user import (
    CompanyUserCreate,
    CompanyUserUpdate,
    CompanyUserResponse,
    CompanyUserListResponse
)
from app.schemas.candidato_anonimo import (
    CandidatoAnonimoResponse,
    CandidatoAnonimoListResponse,
    CandidatoAnonimoDetalhesResponse
)
from app.services.company_service import CompanyService
from app.services.file_service import FileService
from app.core.security import get_password_hash
from app.utils.anonimizacao import anonimizar_candidato

router = APIRouter()


@router.post("/register", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def register_company(
    company_data: CompanyCreate,
    db: Session = Depends(get_db)
):
    """Registro de nova empresa"""
    service = CompanyService(db)
    company = await service.create_company(company_data)
    return company


@router.get("/me", response_model=CompanyResponse)
async def get_my_company(
    current_company: Company = Depends(get_current_company)
):
    """Retorna dados da empresa do usuário atual incluindo o email do usuário"""
    # Se o email da company está vazio, pegar do relacionamento user
    if not current_company.email and current_company.user:
        current_company.email = current_company.user.email
    
    return current_company


@router.put("/me", response_model=CompanyResponse)
async def update_my_company(
    company_update: CompanyUpdate,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Atualiza dados da empresa do usuário atual"""
    service = CompanyService(db)
    company = await service.update_company(current_company.id, company_update)
    return company


@router.patch("/me", response_model=CompanyResponse)
async def patch_my_company(
    company_update: CompanyUpdate,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Atualiza parcialmente dados da empresa do usuário atual (PATCH)"""
    service = CompanyService(db)
    company = await service.update_company(current_company.id, company_update)
    return company


@router.post("/me/logo", response_model=CompanyResponse)
async def upload_logo(
    file: UploadFile = File(...),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Upload de logo da empresa para Cloudflare R2
    
    - **file**: Arquivo de imagem (JPG, PNG - máx 10MB)
    - Retorna: Empresa atualizada com URL do novo logo
    """
    from app.utils.s3_service import s3_service
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Validar arquivo
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo inválido"
            )
        
        # Validar extensão
        allowed_extensions = {'.jpg', '.jpeg', '.png'}
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Extensão não permitida. Use: {', '.join(allowed_extensions)}"
            )
        
        # Validar tamanho (10MB máximo)
        content = await file.read()
        max_size = 10 * 1024 * 1024
        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Arquivo muito grande. Tamanho máximo: 10MB"
            )
        
        # Se R2 está disponível, usar storage remoto
        if s3_service.is_configured():
            from io import BytesIO

            logo_url = s3_service.upload_file(
                file=BytesIO(content),
                file_name=file.filename,
                user_id=str(current_company.id),
                folder="company-logos",
            )

            if not logo_url:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Erro ao fazer upload do logo para R2",
                )
        else:
            logger.warning("R2 não configurado, salvando logo localmente")
            file_service = FileService()
            logo_url = await file_service.upload_file(file, "logos")
        
        # Atualizar empresa
        service = CompanyService(db)
        company = await service.update_company(
            current_company.id,
            CompanyUpdate(logo_url=logo_url)
        )
        
        logger.info(f"Logo da empresa {current_company.id} atualizado com sucesso: {logo_url}")
        return company
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao fazer upload de logo: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao fazer upload do logo: {str(e)}"
        )


@router.get("/me/logo/download")
async def download_company_logo(
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Download do logo da empresa
    
    Faz download direto do R2 sem presigned URL.
    Retorna o arquivo da logo da empresa logada.
    """
    import logging
    from urllib.parse import unquote
    from app.utils.s3_service import s3_service
    
    logger = logging.getLogger(__name__)
    
    try:
        if not current_company.logo_url:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa não possui logo"
            )
        
        # Extrair a chave do objeto da URL
        s3_key = s3_service.extract_object_key(current_company.logo_url) or current_company.logo_url
        
        logger.info(f"Fazendo download do logo: {s3_key}")
        
        # Baixar do R2
        file_content = s3_service.download_file_to_memory(s3_key)
        
        if not file_content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Logo não encontrado no R2"
            )
        
        file_name = Path(s3_key).name
        
        return StreamingResponse(
            iter([file_content]),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={file_name}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao fazer download do logo: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao fazer download do logo"
        )


@router.get("/me/logo/download-presigned")
async def download_company_logo_presigned(
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Gera URL pré-assinada para download direto do logo da empresa.
    
    A URL é válida por 1 hora e permite download direto do R2.
    
    Returns:
        URL assinada temporária
        
    Exemplo:
        GET /api/v1/companies/me/logo/download-presigned
        
    Response:
        {
            "download_url": "https://<public-base-url-r2>/uploads/company-logos/logo.png",
            "nome_arquivo": "logo.png",
            "expira_em": 3600,
            "mensagem": "URL válida por 1 hora"
        }
    """
    from app.utils.s3_service import R2StorageService
    
    # Verificar se a empresa tem logo
    if not current_company.logo_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não possui logo enviado"
        )
    
    # Gerar URL assinada via R2
    s3_service = R2StorageService()
    if not s3_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Serviço de storage não está configurado"
        )
    
    # Extrair a chave do objeto da URL do logo de forma robusta
    try:
        s3_key = s3_service.extract_object_key(current_company.logo_url) or current_company.logo_url
    except (IndexError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="URL do logo inválida"
        )
    
    # Gerar URL assinada (válida por 1 hora)
    presigned_url = s3_service.get_file_url(s3_key)
    
    if not presigned_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar URL de download. Verifique se o arquivo existe no R2."
        )
    
    return {
        "download_url": presigned_url,
        "nome_arquivo": current_company.logo_url.split('/')[-1] if current_company.logo_url else "logo.png",
        "expira_em": 3600,  # 1 hora
        "mensagem": "URL válida por 1 hora"
    }


@router.get("/me/logo/download-direto")
async def download_company_logo_direct(
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    ⚠️ ALTERNATIVA: Download via backend (mais lento, use presigned URL se possível)
    
    Baixa o logo do R2 e entrega ao cliente de forma streaming.
    Use apenas quando presigned URL não funcionar.
    
    Returns:
        Arquivo de imagem em streaming
    """
    import logging
    from urllib.parse import unquote
    from app.utils.s3_service import s3_service
    
    logger = logging.getLogger(__name__)
    
    try:
        if not current_company.logo_url:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa não possui logo"
            )
        
        # 🔥 ESSENCIAL: Decodificar URL (remove %20, %C3%A7, etc)
        logo_url = unquote(current_company.logo_url)
        
        # Extrair a chave do objeto da URL
        s3_key = s3_service.extract_object_key(logo_url) or logo_url
        
        logger.info(f"Baixando logo do R2: {s3_key}")
        
        # Baixar do R2 para memória
        file_content = s3_service.download_file_to_memory(s3_key)
        
        if not file_content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Logo não encontrado no R2"
            )
        
        file_name = Path(s3_key).name
        
        # Detectar MIME type da imagem
        file_ext = Path(file_name).suffix.lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        media_type = mime_types.get(file_ext, 'application/octet-stream')
        
        return StreamingResponse(
            BytesIO(file_content),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{file_name}"',
                "Access-Control-Allow-Origin": "*"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao fazer download do logo: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao fazer download do logo"
        )


@router.get("/{company_id}/", response_model=CompanyResponse)
async def get_company(
    company_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Retorna dados da empresa pelo ID (apenas a empresa dona pode acessar)"""
    if current_company.id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar os dados dessa empresa"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    return company


@router.put("/{company_id}/", response_model=CompanyResponse)
async def update_company(
    company_id: int,
    razao_social: Optional[str] = None,
    nome_fantasia: Optional[str] = None,
    email: Optional[str] = None,
    fone: Optional[str] = None,
    site: Optional[str] = None,
    descricao: Optional[str] = None,
    cidade: Optional[str] = None,
    estado: Optional[str] = None,
    logo: Optional[UploadFile] = File(None),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Atualiza dados da empresa com suporte a upload de logo (FormData)"""
    # Verificar se é a empresa dona
    if current_company.id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para atualizar os dados dessa empresa"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    # Upload de logo se fornecido
    logo_url = company.logo_url
    if logo:
        try:
            file_service = FileService()
            logo_url = await file_service.upload_file(logo, "logos")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao fazer upload da logo: {str(e)}"
            )
    
    # Atualizar campos fornecidos
    if razao_social:
        company.razao_social = razao_social
    if nome_fantasia:
        company.nome_fantasia = nome_fantasia
    if email:
        company.email = email
    if fone:
        company.fone = fone
    if site:
        company.site = site
    if descricao:
        company.descricao = descricao
    if cidade:
        company.cidade = cidade
    if estado:
        company.estado = estado
    if logo_url:
        company.logo_url = logo_url
    
    db.commit()
    db.refresh(company)
    
    return company


@router.get("/{company_id}/public", response_model=CompanyPublic)
async def get_company_public(
    company_id: int,
    db: Session = Depends(get_db)
):
    """Retorna dados públicos da empresa (para visualização)"""
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.is_active == True
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="empresa não encontrada"
        )
    
    return company


@router.get("/{company_id}/logo/download")
async def download_company_logo_public(
    company_id: int,
    db: Session = Depends(get_db)
):
    """
    Download público do logo da empresa (sem autenticação).
    
    Permite que candidatos e usuários anônimos baixem a logo da empresa.
    Ideal para visualização em interfaces públicas.
    
    Args:
        company_id: ID da empresa
        
    Returns:
        Arquivo de imagem (PNG, JPG, etc)
        
    Exemplo:
        GET /api/v1/companies/5/logo/download
    """
    import logging
    from urllib.parse import unquote
    from app.utils.s3_service import s3_service
    
    logger = logging.getLogger(__name__)
    
    try:
        # Buscar empresa ativa
        company = db.query(Company).filter(
            Company.id == company_id,
            Company.is_active == True
        ).first()
        
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa não encontrada"
            )
        
        if not company.logo_url:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa não possui logo"
            )
        
        # 🔥 ESSENCIAL: Decodificar URL (remove %20, %C3%A7, etc)
        logo_url = unquote(company.logo_url)
        
        # Extrair a chave do objeto da URL
        s3_key = s3_service.extract_object_key(logo_url) or logo_url
        
        logger.info(f"Fazendo download público do logo: {s3_key}")
        
        # Baixar do R2 para memória
        file_content = s3_service.download_file_to_memory(s3_key)
        
        if not file_content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Logo não encontrado no R2"
            )
        
        file_name = Path(s3_key).name
        
        # Detectar MIME type da imagem
        file_ext = Path(file_name).suffix.lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        media_type = mime_types.get(file_ext, 'application/octet-stream')
        
        return StreamingResponse(
            BytesIO(file_content),
            media_type=media_type,
            headers={
                "Content-Disposition": f'inline; filename="{file_name}"',
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=31536000"  # Cache por 1 ano
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao fazer download público do logo: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao fazer download do logo"
        )


@router.get("/", response_model=List[CompanyResponse])
async def list_companies(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista empresas (apenas para admin)"""
    if current_user.user_type != UserType.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem listar empresas."
        )
    
    companies = db.query(Company).offset(skip).limit(limit).all()
    return companies


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove empresa (apenas para admin)"""
    if current_user.user_type != UserType.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem remover empresas."
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="empresa não encontrada"
        )
    
    db.delete(company)
    db.commit()
    return None


# ===== ROTAS DE GESTÃO DE USUÁRIOS DA EMPRESA =====

@router.post("/usuarios", response_model=CompanyUserListResponse, status_code=status.HTTP_201_CREATED)
async def create_company_user(
    user_data: CompanyUserCreate,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Cria um novo usuário com acesso ao dashboard da empresa
    
    O usuário criado poderá fazer login e acessar o mesmo dashboard da empresa.
    """
    
    print(f"DEBUG: Recebido user_data = {user_data}")
    
    # Verificar se email já existe
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado no sistema"
        )
    
    try:
        # Criar novo usuário
        new_user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.senha),
            full_name=user_data.nome,
            user_type=UserType.empresa,
            is_active=True
        )
        db.add(new_user)
        db.flush()
        print(f"DEBUG: User criado com ID = {new_user.id}")
        
        # Associar usuário à empresa
        company_user = CompanyUser(
            company_id=current_company.id,
            user_id=new_user.id,
            can_create_jobs=user_data.can_create_jobs,
            can_manage_pipeline=user_data.can_manage_pipeline,
            can_view_analytics=user_data.can_view_analytics
        )
        db.add(company_user)
        db.commit()
        db.refresh(company_user)
        print(f"DEBUG: CompanyUser criado com ID = {company_user.id}")
        
        # Retornar response com dados do usuário
        return {
            "id": company_user.id,
            "user_id": new_user.id,
            "email": new_user.email,
            "nome": new_user.full_name,
            "can_create_jobs": company_user.can_create_jobs,
            "can_manage_pipeline": company_user.can_manage_pipeline,
            "can_view_analytics": company_user.can_view_analytics,
            "created_at": company_user.created_at
        }
    except Exception as e:
        db.rollback()
        print(f"DEBUG: Erro ao criar usuário: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar usuário: {str(e)}"
        )


@router.get("/usuarios", response_model=List[CompanyUserListResponse])
async def list_company_users(
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista todos os usuários da empresa
    
    Retorna lista com informações de todos os usuários que têm acesso ao dashboard da empresa.
    """
    
    company_users = db.query(CompanyUser).filter(
        CompanyUser.company_id == current_company.id
    ).all()
    
    result = []
    for cu in company_users:
        user = cu.user
        result.append({
            "id": cu.id,
            "user_id": cu.user_id,
            "email": user.email,
            "nome": user.full_name,
            "can_create_jobs": cu.can_create_jobs,
            "can_manage_pipeline": cu.can_manage_pipeline,
            "can_view_analytics": cu.can_view_analytics,
            "created_at": cu.created_at
        })
    
    return result


@router.get("/usuarios/{user_id}", response_model=CompanyUserListResponse)
async def get_company_user(
    user_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Retorna informações de um usuário específico da empresa
    """
    
    company_user = db.query(CompanyUser).filter(
        CompanyUser.company_id == current_company.id,
        CompanyUser.user_id == user_id
    ).first()
    
    if not company_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado na empresa"
        )
    
    user = company_user.user
    return {
        "id": company_user.id,
        "user_id": user.id,
        "email": user.email,
        "nome": user.full_name,
        "can_create_jobs": company_user.can_create_jobs,
        "can_manage_pipeline": company_user.can_manage_pipeline,
        "can_view_analytics": company_user.can_view_analytics,
        "created_at": company_user.created_at
    }


@router.put("/usuarios/{user_id}", response_model=CompanyUserListResponse)
async def update_company_user(
    user_id: int,
    permissions: CompanyUserUpdate,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Atualiza as permissões de um usuário da empresa
    
    Você pode alterar as permissões de criar vagas, gerenciar pipeline e visualizar analytics.
    """
    
    company_user = db.query(CompanyUser).filter(
        CompanyUser.company_id == current_company.id,
        CompanyUser.user_id == user_id
    ).first()
    
    if not company_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado na empresa"
        )
    
    # Atualizar permissões se fornecidas
    if permissions.can_create_jobs is not None:
        company_user.can_create_jobs = permissions.can_create_jobs
    if permissions.can_manage_pipeline is not None:
        company_user.can_manage_pipeline = permissions.can_manage_pipeline
    if permissions.can_view_analytics is not None:
        company_user.can_view_analytics = permissions.can_view_analytics
    
    db.commit()
    db.refresh(company_user)
    
    user = company_user.user
    return {
        "id": company_user.id,
        "user_id": user.id,
        "email": user.email,
        "nome": user.full_name,
        "can_create_jobs": company_user.can_create_jobs,
        "can_manage_pipeline": company_user.can_manage_pipeline,
        "can_view_analytics": company_user.can_view_analytics,
        "created_at": company_user.created_at
    }


@router.delete("/usuarios/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company_user(
    user_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Remove um usuário do acesso ao dashboard da empresa
    
    O usuário não será deletado do sistema, apenas será removida sua associação com a empresa.
    """
    
    company_user = db.query(CompanyUser).filter(
        CompanyUser.company_id == current_company.id,
        CompanyUser.user_id == user_id
    ).first()
    
    if not company_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado na empresa"
        )
    
    db.delete(company_user)
    db.commit()
    return None


@router.get("/candidatos-anonimos", response_model=CandidatoAnonimoListResponse)
async def listar_candidatos_anonimos(
    skip: int = Query(0, ge=0, description="Quantidade de registros a pular"),
    limit: int = Query(100, ge=1, le=500, description="Limite de resultados (máximo: 500)"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    cidade: Optional[str] = Query(None, description="Filtrar por cidade"),
    is_pcd: Optional[bool] = Query(None, description="Filtrar por PCD"),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista todos os candidatos com dados anônimos (SEM DADOS SENSÍVEIS)
    
    ⚠️ IMPORTANTE - DADOS PROTEGIDOS:
    - ❌ Sem nome completo
    - ❌ Sem email
    - ❌ Sem telefone
    - ❌ Sem CPF
    - ❌ Sem data de nascimento
    - ✅ ID fictício (hash)
    - ✅ Localização (estado/cidade)
    - ✅ Dados profissionais (habilidades, formação, etc)
    - ✅ Links públicos (LinkedIn, portfolio)
    - ✅ Informação de PCD
    
    Parâmetros opcionais:
    - estado: Filtrar por estado (ex: "SP", "RJ")
    - cidade: Filtrar por cidade
    - is_pcd: Filtrar por pessoa com deficiência (true/false)
    - skip: Paginação
    - limit: Limite de resultados
    """
    
    # Construir query
    query = db.query(Candidate)
    
    # Filtros opcionais
    if estado:
        query = query.filter(Candidate.estado.ilike(f"%{estado}%"))
    
    if cidade:
        query = query.filter(Candidate.cidade.ilike(f"%{cidade}%"))
    
    if is_pcd is not None:
        query = query.filter(Candidate.is_pcd == is_pcd)
    
    # Contar total
    total = query.count()
    
    # Aplicar paginação
    candidates = query.order_by(Candidate.created_at.desc()).offset(skip).limit(limit).all()
    
    # Converter para resposta anônima
    candidatos_anonimos = []
    for candidate in candidates:
        dados_anonimos = anonimizar_candidato(candidate)
        candidatos_anonimos.append(CandidatoAnonimoResponse(**dados_anonimos))
    
    return CandidatoAnonimoListResponse(
        total=total,
        skip=skip,
        limit=limit,
        candidatos=candidatos_anonimos
    )


@router.get("/candidatos-anonimos/detalhes/{id_anonimo}", response_model=CandidatoAnonimoDetalhesResponse)
async def obter_detalhes_candidato_anonimo(
    id_anonimo: str,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Obtém detalhes completos de um candidato anônimo específico
    
    O id_anonimo é um hash que identifica o candidato sem expor dados sensíveis
    """
    
    # Buscar todos os candidatos e encontrar o que corresponde ao ID anônimo
    candidates = db.query(Candidate).all()
    
    candidate_encontrado = None
    for c in candidates:
        id_anonimo_gerado = anonimizar_candidato(c).get("id_anonimo")
        if id_anonimo_gerado == id_anonimo:
            candidate_encontrado = c
            break
    
    if not candidate_encontrado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato não encontrado"
        )
    
    dados_anonimos = anonimizar_candidato(candidate_encontrado)
    return CandidatoAnonimoDetalhesResponse(**dados_anonimos)


@router.get("/candidatos-ideais/{job_id}")
async def get_ideal_candidates_for_job(
    job_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    min_compatibility: float = Query(0.5, ge=0, le=1, description="Score mínimo de compatibilidade (0-1)"),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Retorna candidatos anônimos ideais para uma vaga em dois grupos:
    
    1. **CERTIFICADOS** (Recomendados): Candidatos com testes realizados
    2. **AUTOAVALIAÇÃO**: Candidatos apenas com autoavaliação
    
    Cada candidato recebe um score de compatibilidade (0-1) baseado em:
    - Quantas competências obrigatórias ele atende
    - Se o nível declarado atende ao nível mínimo exigido
    
    Query params:
    - min_compatibility: Score mínimo (0-1) para incluir o candidato
    - skip: Para paginação
    - limit: Máx 50 candidatos por página
    """
    from sqlalchemy import and_
    from app.models.job import Job
    from app.models.vaga_requisito import VagaRequisito
    from app.models.competencia import AutoavaliacaoCompetencia
    from app.models.candidato_teste import CandidatoTeste, StatusTesteCandidato
    
    # Verificar se a vaga pertence à empresa
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_company.id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaga não encontrada"
        )
    
    # Buscar requisitos da vaga
    requisitos = db.query(VagaRequisito).filter(
        VagaRequisito.vaga_id == job_id
    ).all()
    
    # Buscar IDs de candidatos com testes concluídos
    candidatos_com_testes = set()
    testes_concluidos = db.query(CandidatoTeste.candidate_id).filter(
        CandidatoTeste.status == StatusTesteCandidato.CONCLUIDO
    ).distinct().all()
    
    for teste in testes_concluidos:
        candidatos_com_testes.add(teste[0])
    
    if not requisitos:
        # Se vaga não tem requisitos definidos, retornar todos os candidatos
        candidates = db.query(Candidate).all()
        candidatos_certificados = []
        candidatos_autoavaliacao = []
        
        for c in candidates:
            dado = {**anonimizar_candidato(c), "compatibilidade": 1.0}
            if c.id in candidatos_com_testes:
                candidatos_certificados.append(dado)
            else:
                candidatos_autoavaliacao.append(dado)
    else:
        # Carregar TODAS as competências de TODOS os candidatos em uma única query
        todas_competencias = db.query(AutoavaliacaoCompetencia).all()
        
        # Organizar competências por candidate_id para acesso rápido
        competencias_por_candidato = {}
        for comp in todas_competencias:
            if comp.candidate_id not in competencias_por_candidato:
                competencias_por_candidato[comp.candidate_id] = {}
            competencias_por_candidato[comp.candidate_id][comp.competencia_id] = int(comp.nivel_declarado)
        
        # Buscar todos os candidatos
        all_candidates = db.query(Candidate).all()
        candidatos_certificados = []
        candidatos_autoavaliacao = []
        
        requisitos_totais = len(requisitos)
        
        for candidate in all_candidates:
            # Pegar competências do candidato do mapa (sem fazer query)
            competencias_map = competencias_por_candidato.get(candidate.id, {})
            
            # Contar quantos requisitos o candidato atende
            requisitos_atendidos = 0
            
            for requisito in requisitos:
                nivel_candidato = competencias_map.get(requisito.competencia_id, 0)
                nivel_minimo = int(requisito.nivel_minimo)
                
                if nivel_candidato >= nivel_minimo:
                    requisitos_atendidos += 1
            
            # Calcular score (0-1)
            score_compatibilidade = requisitos_atendidos / requisitos_totais if requisitos_totais > 0 else 0
            
            # Incluir candidato se passou no threshold
            if score_compatibilidade >= min_compatibility:
                dados = anonimizar_candidato(candidate)
                dados["compatibilidade"] = round(score_compatibilidade, 2)
                
                # Separar por tipo
                if candidate.id in candidatos_com_testes:
                    candidatos_certificados.append(dados)
                else:
                    candidatos_autoavaliacao.append(dados)
        
        # Ordenar ambos os grupos por score (maior compatibilidade primeiro)
        candidatos_certificados.sort(key=lambda x: x["compatibilidade"], reverse=True)
        candidatos_autoavaliacao.sort(key=lambda x: x["compatibilidade"], reverse=True)
    
    # Preparar resposta com dois grupos
    return {
        "total_certificados": len(candidatos_certificados),
        "total_autoavaliacao": len(candidatos_autoavaliacao),
        "total_geral": len(candidatos_certificados) + len(candidatos_autoavaliacao),
        "compatibilidade_minima": min_compatibility,
        "grupos": {
            "certificados": {
                "titulo": "Candidatos Certificados (RECOMENDADOS)",
                "descricao": "Candidatos que realizaram e completaram os testes de certificação",
                "recomendado": True,
                "total": len(candidatos_certificados),
                "candidatos": candidatos_certificados[skip : skip + limit]
            },
            "autoavaliacao": {
                "titulo": "Candidatos com Autoavaliação",
                "descricao": "Candidatos que completaram apenas a autoavaliação de competências",
                "recomendado": False,
                "total": len(candidatos_autoavaliacao),
                "candidatos": candidatos_autoavaliacao[skip : skip + limit]
            }
        }
    }


@router.get("/candidato/{candidate_id}/curriculo-download")
async def download_candidate_resume(
    candidate_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Gera URL assinada para download do currículo do candidato.
    
    A empresa só pode baixar currículo de candidatos que já interagiram com suas vagas.
    
    Args:
        candidate_id: ID do candidato
        current_company: Empresa autenticada
        db: Sessão do banco de dados
        
    Returns:
        URL assinada temporária (válida por 1 hora)
        
    Exemplo:
        GET /api/v1/companies/candidato/42/curriculo-download
        
    Response:
        {
            "download_url": "https://<public-base-url-r2>/uploads/resumes/curriculo.pdf",
            "nome_arquivo": "curriculo_joao_silva.pdf",
            "expira_em": 3600,
            "mensagem": "URL válida por 1 hora"
        }
    """
    from app.utils.s3_service import R2StorageService
    
    # Verificar se o candidato existe
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato não encontrado"
        )
    
    # Verificar se a empresa tem acesso a este candidato
    # (candidato deve estar associado a uma vaga da empresa)
    
    vaga_candidato = db.query(VagaCandidato).join(
        Job, VagaCandidato.vaga_id == Job.id
    ).filter(
        VagaCandidato.candidate_id == candidate_id,
        Job.company_id == current_company.id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem acesso ao currículo deste candidato. O candidato precisa ter se candidatado a uma de suas vagas."
        )
    
    # Verificar se o candidato tem currículo
    if not candidate.resume_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este candidato não possui currículo enviado"
        )
    
    # Gerar URL assinada via R2
    s3_service = R2StorageService()
    if not s3_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Serviço de storage não está configurado"
        )
    
    # Extrair a chave do objeto da URL do currículo de forma robusta
    try:
        s3_key = s3_service.extract_object_key(candidate.resume_url) or candidate.resume_url
    except (IndexError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="URL do currículo inválida"
        )
    
    # Gerar URL assinada (válida por 1 hora)
    presigned_url = s3_service.get_file_url(s3_key)
    
    if not presigned_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar URL de download. Verifique se o arquivo existe no R2."
        )
    
    return {
        "download_url": presigned_url,
        "nome_arquivo": candidate.resume_url.split('/')[-1] if candidate.resume_url else "curriculo.pdf",
        "expira_em": 3600,  # 1 hora
        "mensagem": "URL válida por 1 hora"
    }


@router.get("/candidato/{candidate_id}/curriculo")
async def download_candidate_resume_direct(
    candidate_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Download direto do currículo do candidato (alternativa ao endpoint de URL assinada).
    
    A empresa só pode baixar currículo de candidatos que já interagiram com suas vagas.
    
    Args:
        candidate_id: ID do candidato
        current_company: Empresa autenticada
        db: Sessão do banco de dados
        
    Returns:
        Arquivo PDF com o currículo
    """
    import requests
    from fastapi.responses import StreamingResponse
    from io import BytesIO
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Verificar se o candidato existe
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato não encontrado"
        )
    
    # Verificar se a empresa tem acesso a este candidato
    vaga_candidato = db.query(VagaCandidato).join(
        Job, VagaCandidato.vaga_id == Job.id
    ).filter(
        VagaCandidato.candidate_id == candidate_id,
        Job.company_id == current_company.id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem acesso ao currículo deste candidato"
        )
    
    # Verificar se o candidato tem currículo
    if not candidate.resume_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este candidato não possui currículo enviado"
        )
    
    try:
        # Fazer download do arquivo de R2
        logger.info(f"Fazendo download do currículo: {candidate.resume_url}")
        
        response = requests.get(
            candidate.resume_url,
            timeout=30,
            allow_redirects=True,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        response.raise_for_status()
        
        file_name = candidate.resume_url.split('/')[-1].split("?")[0] or f"curriculo_{candidate.id}.pdf"
        
        return StreamingResponse(
            BytesIO(response.content),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{file_name}"',
                "Access-Control-Allow-Origin": "*"
            }
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"Erro ao baixar currículo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao fazer download do currículo. Tente novamente mais tarde."
        )


@router.put("/candidato/{candidate_id}/marcar-contratado")
async def mark_candidate_as_hired(
    candidate_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Marca um candidato como contratado e desativa seu perfil
    
    Isso desativa o perfil do candidato automaticamente.
    O candidato pode reativar seu perfil depois se quiser voltar a buscar emprego.
    
    Args:
        candidate_id: ID do candidato
        
    Returns:
        Confirmação com status do candidato
    """
    from datetime import datetime
    
    # Verificar se o candidato existe
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato não encontrado"
        )
    
    # Verificar se a empresa tem acesso a este candidato
    # (candidato deve estar associado a uma vaga da empresa)
    vaga_candidato = db.query(VagaCandidato).join(
        Job, VagaCandidato.vaga_id == Job.id
    ).filter(
        VagaCandidato.candidate_id == candidate_id,
        Job.company_id == current_company.id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para marcar este candidato como contratado"
        )
    
    # Marcar como contratado e desativar perfil
    candidate.contratado = True
    candidate.is_active = False
    candidate.data_contratacao = datetime.now()
    
    # Sincronizar vaga_candidatos.foi_contratado
    vaga_candidato.foi_contratado = True
    vaga_candidato.data_resultado = datetime.now()
    
    # Sincronizar job_applications.status para CONTRATADO
    job_applications = db.query(JobApplication).filter(
        JobApplication.candidate_id == candidate_id,
        JobApplication.job_id == vaga_candidato.vaga_id
    ).all()
    
    for ja in job_applications:
        ja.status = ApplicationStatus.CONTRATADO
        ja.updated_at = datetime.now()
    
    db.commit()
    db.refresh(candidate)
    db.refresh(vaga_candidato)
    
    return {
        "candidato_id": candidate.id,
        "full_name": candidate.full_name,
        "contratado": candidate.contratado,
        "is_active": candidate.is_active,
        "data_contratacao": candidate.data_contratacao,
        "foi_contratado_vaga_candidato": vaga_candidato.foi_contratado,
        "mensagem": f"✅ {candidate.full_name} foi marcado(a) como contratado(a)! Seu perfil foi desativado.",
        "informacao": "O candidato pode reativar seu perfil quando quiser voltar a buscar emprego."
    }


@router.get("/candidato/{candidate_id}/status")
async def get_candidate_status_for_company(
    candidate_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Retorna o status de contratação de um candidato
    
    A empresa pode consultar se o candidato foi contratado e a data.
    
    Args:
        candidate_id: ID do candidato
        
    Returns:
        - candidato_id: ID do candidato
        - full_name: Nome completo
        - is_active: Se o perfil está ativo
        - contratado: Se foi contratado
        - data_contratacao: Data do aceite de contratação
    """
    # Verificar se o candidato existe
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato não encontrado"
        )
    
    # Verificar se a empresa tem acesso (candidato deve estar associado a vaga da empresa)
    vaga_candidato = db.query(VagaCandidato).join(
        Job, VagaCandidato.vaga_id == Job.id
    ).filter(
        VagaCandidato.candidate_id == candidate_id,
        Job.company_id == current_company.id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para consultar o status deste candidato"
        )
    
    # Retornar status
    return {
        "candidato_id": candidate.id,
        "full_name": candidate.full_name,
        "is_active": candidate.is_active,
        "contratado": candidate.contratado,
        "data_contratacao": candidate.data_contratacao,
        "status_leitura": "ativo" if candidate.is_active else "inativo",
        "status_contratacao": "contratado" if candidate.contratado else "não contratado"
    }
