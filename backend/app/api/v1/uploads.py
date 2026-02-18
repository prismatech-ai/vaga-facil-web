"""
Rotas para upload de arquivos e imagens em S3
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from urllib.parse import unquote
import os
import logging
import requests
from io import BytesIO

from app.core.dependencies import get_db, get_current_user
from app.models import User
from app.core.config import settings

logger = logging.getLogger(__name__)

# Tentar importar S3 service, mas permitir que funcione sem
try:
    from app.utils.s3_service import s3_service
    S3_AVAILABLE = True
except ImportError:
    logger.warning("boto3 não está instalado. S3 uploads desabilitados.")
    s3_service = None
    S3_AVAILABLE = False

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Extensões permitidas
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
ALLOWED_DOCUMENT_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx'}
ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv'}

# Tamanho máximo por tipo (em bytes)
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_DOCUMENT_SIZE = 50 * 1024 * 1024  # 50MB
MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500MB


def validate_file(file: UploadFile, allowed_extensions: set, max_size: int) -> tuple[bool, str]:
    """Valida arquivo"""
    # Verificar extensão
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        return False, f"Tipo de arquivo não permitido. Extensões aceitas: {', '.join(allowed_extensions)}"
    
    # A validação de tamanho acontece durante o upload
    return True, ""


@router.post("/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload de foto de perfil do usuário para S3
    
    - **file**: Arquivo de imagem (JPG, PNG, GIF, WebP - máx 10MB)
    - Retorna: URL da imagem no S3
    """
    if not S3_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Serviço de upload S3 não está disponível. Instale boto3."
        )
    
    try:
        # Validar arquivo
        is_valid, error_msg = validate_file(file, ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_SIZE)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Fazer upload para S3
        url = s3_service.upload_file(
            file=file.file,
            file_name=file.filename,
            user_id=str(current_user.id),
            folder="profile-images"
        )
        
        if not url:
            raise HTTPException(status_code=500, detail="Erro ao fazer upload da imagem")
        
        return {
            "message": "Imagem enviada com sucesso",
            "url": url,
            "file_name": file.filename,
            "size": file.size
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar upload: {str(e)}")


@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload de logo da empresa para S3
    
    - **file**: Arquivo de imagem (JPG, PNG - máx 10MB)
    - Retorna: URL do logo no S3
    """
    if not S3_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Serviço de upload S3 não está disponível. Instale boto3."
        )
    
    try:
        # Validar arquivo
        is_valid, error_msg = validate_file(file, ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_SIZE)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Fazer upload para S3
        url = s3_service.upload_file(
            file=file.file,
            file_name=file.filename,
            user_id=str(current_user.id),
            folder="company-logos"
        )
        
        if not url:
            raise HTTPException(status_code=500, detail="Erro ao fazer upload do logo")
        
        return {
            "message": "Logo enviado com sucesso",
            "url": url,
            "file_name": file.filename,
            "size": file.size
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar upload: {str(e)}")


@router.post("/resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload de currículo em PDF para S3
    
    - **file**: Arquivo PDF (máx 50MB)
    - Retorna: URL do currículo no S3
    """
    if not S3_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Serviço de upload S3 não está disponível. Instale boto3."
        )
    
    try:
        # Validar arquivo
        is_valid, error_msg = validate_file(file, {'.pdf'}, MAX_DOCUMENT_SIZE)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Fazer upload para S3
        url = s3_service.upload_file(
            file=file.file,
            file_name=file.filename,
            user_id=str(current_user.id),
            folder="resumes"
        )
        
        if not url:
            raise HTTPException(status_code=500, detail="Erro ao fazer upload do currículo")
        
        return {
            "message": "Currículo enviado com sucesso",
            "url": url,
            "file_name": file.filename,
            "size": file.size
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar upload: {str(e)}")


@router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Query(..., description="Tipo de documento: certifications, portfolio, etc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload de documentos diversos para S3
    
    - **file**: Arquivo (PDF, DOC, DOCX, XLS, XLSX - máx 50MB)
    - **document_type**: Tipo de documento (certifications, portfolio, etc)
    - Retorna: URL do documento no S3
    """
    if not S3_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Serviço de upload S3 não está disponível. Instale boto3."
        )
    
    try:
        # Validar arquivo
        is_valid, error_msg = validate_file(file, ALLOWED_DOCUMENT_EXTENSIONS, MAX_DOCUMENT_SIZE)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Fazer upload para S3
        url = s3_service.upload_file(
            file=file.file,
            file_name=file.filename,
            user_id=str(current_user.id),
            folder=f"documents/{document_type}"
        )
        
        if not url:
            raise HTTPException(status_code=500, detail="Erro ao fazer upload do documento")
        
        return {
            "message": "Documento enviado com sucesso",
            "url": url,
            "file_name": file.filename,
            "size": file.size,
            "document_type": document_type
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar upload: {str(e)}")


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    folder: Optional[str] = Query("general", description="Pasta para armazenar a imagem"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload genérico de imagem para S3
    
    - **file**: Arquivo de imagem (JPG, PNG, GIF, WebP - máx 10MB)
    - **folder**: Pasta dentro de 'uploads' (padrão: general)
    - Retorna: URL da imagem no S3
    """
    if not S3_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Serviço de upload S3 não está disponível. Instale boto3."
        )
    
    try:
        # Validar arquivo
        is_valid, error_msg = validate_file(file, ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_SIZE)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Fazer upload para S3
        url = s3_service.upload_file(
            file=file.file,
            file_name=file.filename,
            user_id=str(current_user.id),
            folder=folder
        )
        
        if not url:
            raise HTTPException(status_code=500, detail="Erro ao fazer upload da imagem")
        
        return {
            "message": "Imagem enviada com sucesso",
            "url": url,
            "file_name": file.filename,
            "size": file.size,
            "folder": folder
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar upload: {str(e)}")


@router.delete("/file")
async def delete_file(
    file_url: str = Query(..., description="URL completa do arquivo no S3"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deleta um arquivo do S3
    
    - **file_url**: URL completa do arquivo
    - Retorna: Confirmação de deleção
    """
    if not S3_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Serviço de upload S3 não está disponível. Instale boto3."
        )
    
    try:
        success = s3_service.delete_file_by_url(file_url)
        
        if not success:
            raise HTTPException(status_code=500, detail="Erro ao deletar arquivo")
        
        return {
            "message": "Arquivo deletado com sucesso",
            "file_url": file_url
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar deleção: {str(e)}")


@router.get("/download")
async def download_file(
    key: str = Query(..., description="Chave do arquivo no S3 (ex: uploads/curriculos/87/file.pdf)"),
    current_user: User = Depends(get_current_user)
):
    """
    Faz download do arquivo direto do S3 (sem presigned URL)
    
    ✅ Evita problemas de região com presigned URLs
    
    Args:
        key: Chave/caminho do arquivo no S3 (ex: uploads/curriculos/87/file.pdf)
        
    Returns:
        Arquivo em stream
        
    Exemplo:
        GET /api/v1/uploads/download?key=uploads/curriculos/87/file.pdf
    """
    try:
        if not S3_AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Serviço de storage S3 não está disponível"
            )
        
        # 🔥 ESSENCIAL: Decodificar URL (remove %20, %C3%A7, etc)
        file_key = unquote(key)
        
        logger.info(f"Fazendo download de: {file_key}")
        
        # Validar que a key não tenta acessar fora do bucket
        if file_key.startswith("/") or ".." in file_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Caminho inválido"
            )
        
        # Baixar o arquivo do S3 para memória
        file_content = s3_service.download_file_to_memory(file_key)
        
        if not file_content:
            logger.error(f"Falha ao baixar arquivo: {file_key}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Arquivo não encontrado no S3"
            )
        
        logger.info(f"Arquivo baixado com sucesso: {file_key} ({len(file_content)} bytes)")
        
        # Retornar o arquivo como stream
        from io import BytesIO
        file_name = os.path.basename(file_key)
        
        return StreamingResponse(
            iter([file_content]),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={file_name}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao fazer download: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar download"
        )


@router.get("/download-presigned")
async def download_file_presigned(
    key: str = Query(..., description="Chave do arquivo no S3 (ex: uploads/curriculos/87/file.pdf)"),
    current_user: User = Depends(get_current_user)
):
    """
    Gera URL pré-assinada para download direto do S3 (alternativa)
    
    ⚠️ Nota: Presigned URLs podem ter problemas de região. Use /download para melhor compatibilidade.
    
    Args:
        key: Chave/caminho do arquivo no S3 (ex: uploads/curriculos/87/file.pdf)
        
    Returns:
        URL pré-assinada válida por 5 minutos
        
    Exemplo:
        GET /api/v1/uploads/download-presigned?key=uploads/curriculos/87/file.pdf
        
    Response:
        {
            "url": "https://<public-base-url-r2>/uploads/curriculos/arquivo.pdf",
            "expira_em_segundos": 300
        }
    """
    try:
        if not S3_AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Serviço de storage S3 não está disponível"
            )
        
        # 🔥 ESSENCIAL: Decodificar URL (remove %20, %C3%A7, etc)
        file_key = unquote(key)
        
        logger.info(f"Gerando presigned URL para: {file_key}")
        
        # Validar que a key não tenta acessar fora do bucket
        if file_key.startswith("/") or ".." in file_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Caminho inválido"
            )
        
        # Gerar URL pré-assinada usando boto3 (o jeito certo)
        presigned_url = s3_service.get_file_url(file_key, expires_in=300)
        
        if not presigned_url:
            logger.error(f"Falha ao gerar presigned URL para: {file_key}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao gerar URL de download"
            )
        
        logger.info(f"Presigned URL gerada com sucesso para: {file_key}")
        
        return {
            "url": presigned_url,
            "expira_em_segundos": 300,
            "arquivo": os.path.basename(file_key)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerar presigned URL: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar download"
        )


@router.get("/download-direto")
async def download_file_direct(
    key: str = Query(..., description="Chave do arquivo no S3 (ex: uploads/curriculos/87/file.pdf)"),
    current_user: User = Depends(get_current_user)
):
    """
    ⚠️ ALTERNATIVA: Download via backend (mais lento, use presigned URL se possível)
    
    Baixa o arquivo do S3 e entrega ao cliente.
    Use apenas quando presigned URL não funcionar.
    
    Args:
        key: Chave/caminho do arquivo no S3
        
    Returns:
        Arquivo em streaming
    """
    try:
        if not S3_AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Serviço de storage S3 não está disponível"
            )
        
        # 🔥 ESSENCIAL: Decodificar URL
        file_key = unquote(key)
        
        logger.info(f"Baixando arquivo do S3: {file_key}")
        
        # Validação de segurança
        if file_key.startswith("/") or ".." in file_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Caminho inválido"
            )
        
        # Baixar do S3 para memória (não salva em disco)
        try:
            # Usar S3Service para baixar
            file_content = s3_service.download_file_to_memory(file_key)
            
            if not file_content:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Arquivo não encontrado no S3"
                )
            
            file_name = os.path.basename(file_key)
            
            logger.info(f"Arquivo baixado com sucesso: {file_key} ({len(file_content)} bytes)")
            
            return StreamingResponse(
                BytesIO(file_content),
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": f'attachment; filename="{file_name}"'
                }
            )
            
        except Exception as s3_error:
            logger.error(f"Erro ao baixar do S3: {str(s3_error)}")
            if "NoSuchKey" in str(s3_error):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Arquivo não encontrado no S3"
                )
            elif "AccessDenied" in str(s3_error):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Acesso negado ao arquivo"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Erro ao baixar arquivo do S3"
                )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao processar download: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar download"
        )


