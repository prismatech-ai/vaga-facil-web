"""
Serviço de Upload de Arquivos
"""
import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

class FileService:
    """Serviço para upload e gerenciamento de arquivos"""
    
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(exist_ok=True)
    
    async def upload_file(self, file: UploadFile, subfolder: str = "") -> str:
        """Faz upload de um arquivo e retorna a URL"""
        # Validar extensão
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Extensão não permitida. Permitidas: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )
        
        # Ler conteúdo do arquivo
        content = await file.read()
        
        # Validar tamanho
        if len(content) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Arquivo muito grande. Tamanho máximo: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
            )
        
        # Gerar nome único
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_ext}"
        
        # Criar subpasta se necessário
        target_dir = self.upload_dir / subfolder
        target_dir.mkdir(exist_ok=True)
        
        # Salvar arquivo
        file_path = target_dir / filename
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Retornar URL absoluta para evitar problemas de origem
        base = settings.FILE_BASE_URL.rstrip("/")
        path = f"/{settings.UPLOAD_DIR}/{subfolder}/{filename}"
        return f"{base}{path}"
    
    def delete_file(self, file_url: str) -> bool:
        """Remove um arquivo"""
        try:
            # Remover barra inicial se houver
            if file_url.startswith("/"):
                file_url = file_url[1:]
            
            file_path = Path(file_url)
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception:
            return False

