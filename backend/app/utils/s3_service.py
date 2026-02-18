"""
Serviço para gerenciamento de uploads em Cloudflare R2 (compatível com API S3)
"""
import boto3
import mimetypes
from datetime import datetime
from typing import Optional, BinaryIO
from urllib.parse import urlparse
from botocore.exceptions import ClientError
from botocore.config import Config
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class R2StorageService:
    """Serviço para gerenciar uploads em Cloudflare R2"""

    def __init__(self):
        """Inicializa o cliente R2 (API S3-compatible)"""
        self.region = settings.R2_REGION or "auto"
        self.bucket_name = settings.R2_BUCKET_NAME
        self.endpoint_url = (settings.R2_ENDPOINT_URL or "").strip().rstrip("/")
        self.public_base_url = (settings.R2_PUBLIC_BASE_URL or "").strip().rstrip("/")

        if settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY and self.bucket_name and self.endpoint_url:
            config = Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
                retries={"max_attempts": 3, "mode": "standard"}
            )

            self.s3_client = boto3.client(
                "s3",
                region_name=self.region,
                endpoint_url=self.endpoint_url,
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                config=config,
            )
            logger.info(f"✅ R2 configurado com sucesso (Region: {self.region}, Bucket: {self.bucket_name})")
        else:
            logger.warning("Credenciais/configuração do R2 não definidas. Storage remoto não será utilizado.")
            self.s3_client = None

    def is_configured(self) -> bool:
        """Verifica se o R2 está configurado corretamente"""
        return self.s3_client is not None and settings.USE_R2

    def _build_file_url(self, object_key: str) -> str:
        """Monta URL pública do arquivo no R2."""
        if self.public_base_url:
            return f"{self.public_base_url}/{object_key}"
        return f"{self.endpoint_url}/{self.bucket_name}/{object_key}"

    def extract_object_key(self, file_url_or_key: str) -> Optional[str]:
        """Extrai a chave do objeto a partir de URL completa ou já da própria chave."""
        if not file_url_or_key:
            return None

        value = file_url_or_key.strip()

        if "://" not in value:
            return value.lstrip("/")

        parsed = urlparse(value)
        key = parsed.path.lstrip("/")

        # Path-style: /<bucket>/<key>
        bucket_prefix = f"{self.bucket_name}/" if self.bucket_name else ""
        if bucket_prefix and key.startswith(bucket_prefix):
            key = key[len(bucket_prefix):]

        return key or None

    def upload_file(
        self,
        file: BinaryIO,
        file_name: str,
        user_id: Optional[str] = None,
        folder: str = "general"
    ) -> Optional[str]:
        """
        Faz upload de um arquivo para o R2

        Args:
            file: Arquivo a ser enviado
            file_name: Nome do arquivo
            user_id: ID do usuário (opcional, para organizar por usuário)
            folder: Pasta dentro do bucket

        Returns:
            URL do arquivo ou None em caso de erro
        """
        if not self.is_configured():
            logger.warning("R2 não está configurado. Operação abortada.")
            return None

        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            if user_id:
                object_key = f"{settings.R2_UPLOAD_DIR}/{folder}/{user_id}/{timestamp}_{file_name}"
            else:
                object_key = f"{settings.R2_UPLOAD_DIR}/{folder}/{timestamp}_{file_name}"

            content_type, _ = mimetypes.guess_type(file_name)
            if content_type is None:
                content_type = "application/octet-stream"

            self.s3_client.upload_fileobj(
                file,
                self.bucket_name,
                object_key,
                ExtraArgs={
                    "ContentType": content_type,
                    "Metadata": {
                        "uploaded_by": user_id or "anonymous",
                        "uploaded_at": datetime.now().isoformat()
                    }
                }
            )

            logger.info(f"Arquivo enviado com sucesso: {object_key}")
            return self._build_file_url(object_key)

        except ClientError as e:
            logger.error(f"Erro ao fazer upload para R2: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Erro inesperado durante upload no R2: {str(e)}")
            return None

    def delete_file(self, object_key: str) -> bool:
        """
        Deleta um arquivo do R2

        Args:
            object_key: Chave do arquivo no bucket (caminho completo)

        Returns:
            True se sucesso, False caso contrário
        """
        if not self.is_configured():
            logger.warning("R2 não está configurado. Operação abortada.")
            return False

        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            logger.info(f"Arquivo deletado com sucesso: {object_key}")
            return True
        except ClientError as e:
            logger.error(f"Erro ao deletar arquivo do R2: {str(e)}")
            return False

    def delete_file_by_url(self, file_url: str) -> bool:
        """
        Deleta um arquivo do R2 usando sua URL

        Args:
            file_url: URL completa do arquivo

        Returns:
            True se sucesso, False caso contrário
        """
        try:
            object_key = self.extract_object_key(file_url)
            if not object_key:
                logger.error(f"Não foi possível extrair a chave do objeto da URL: {file_url}")
                return False

            return self.delete_file(object_key)
        except Exception as e:
            logger.error(f"Erro ao processar URL do arquivo: {str(e)}")
            return False

    def get_file_url(self, object_key: str, expires_in: int = None) -> Optional[str]:
        """
        Gera uma URL assinada temporária para acessar um arquivo

        Args:
            object_key: Chave do arquivo no bucket
            expires_in: Tempo de expiração em segundos

        Returns:
            URL assinada ou None em caso de erro
        """
        if not self.is_configured():
            return None

        try:
            expiration = expires_in or settings.R2_URL_EXPIRATION
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": object_key},
                ExpiresIn=expiration,
            )
            logger.info(f"✅ Presigned URL gerada para {object_key}")
            return url
        except ClientError as e:
            logger.error(f"Erro ao gerar URL pré-assinada: {str(e)}")
            return None

    def download_file_to_memory(self, object_key: str) -> Optional[bytes]:
        """
        Baixa um arquivo do R2 para memória (sem salvar em disco)

        Args:
            object_key: Chave do arquivo no bucket

        Returns:
            Bytes do arquivo ou None em caso de erro
        """
        if not self.is_configured():
            return None

        try:
            from io import BytesIO
            file_obj = BytesIO()

            self.s3_client.download_fileobj(
                self.bucket_name,
                object_key,
                file_obj
            )

            file_obj.seek(0)
            return file_obj.getvalue()

        except ClientError as e:
            logger.error(f"Erro ao baixar arquivo do R2: {str(e)}")
            raise e
        except Exception as e:
            logger.error(f"Erro inesperado ao baixar arquivo: {str(e)}")
            raise e

    def list_files(self, prefix: str = "") -> Optional[list]:
        """
        Lista arquivos no bucket R2

        Args:
            prefix: Prefixo para filtrar arquivos

        Returns:
            Lista de arquivos ou None em caso de erro
        """
        if not self.is_configured():
            return None

        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )

            if "Contents" not in response:
                return []

            return [obj["Key"] for obj in response["Contents"]]
        except ClientError as e:
            logger.error(f"Erro ao listar arquivos R2: {str(e)}")
            return None

    def file_exists(self, object_key: str) -> bool:
        """
        Verifica se um arquivo existe no R2

        Args:
            object_key: Chave do arquivo no bucket

        Returns:
            True se existe, False caso contrário
        """
        if not self.is_configured():
            return False

        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=object_key)
            return True
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") == "404":
                return False
            logger.error(f"Erro ao verificar arquivo R2: {str(e)}")
            return False


# Instância global do serviço R2
r2_service = R2StorageService()

# Alias de compatibilidade com imports existentes
S3Service = R2StorageService
s3_service = r2_service
