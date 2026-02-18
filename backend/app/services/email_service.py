"""
Serviço de emails usando Resend com suporte a retries e timeout customizado
Documentação: https://resend.com/docs/send-email
"""
import resend
import os
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime
import time
import requests
import uuid
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Setup de logs
logger = logging.getLogger(__name__)

# Configurar a API key do Resend
resend.api_key = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@vagafacil.org")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "contato@assessman.com.br")
REPLY_TO_EMAIL = os.getenv("REPLY_TO_EMAIL", SUPPORT_EMAIL)

# Configurações de retry e timeout
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "60"))  # 60 segundos
EMAIL_MAX_RETRIES = int(os.getenv("EMAIL_MAX_RETRIES", "3"))
EMAIL_RETRY_DELAY = int(os.getenv("EMAIL_RETRY_DELAY", "2"))  # segundos entre retries

logger.info(f"EmailService inicializado com EMAIL_FROM: {EMAIL_FROM}")
logger.info(f"RESEND_API_KEY configurada: {bool(resend.api_key)}")
logger.info(f"EMAIL_TIMEOUT: {EMAIL_TIMEOUT}s, MAX_RETRIES: {EMAIL_MAX_RETRIES}")

# Validar API Key
if not resend.api_key:
    logger.warning("RESEND_API_KEY não está configurada! Emails não serão enviados.")

# Configurar o timeout global do requests para o Resend
def _configure_resend_timeout():
    """Configura timeout e retry strategy para o Resend HTTP client"""
    try:
        # O Resend SDK usa requests internamente
        # Vamos tentar configurar a sessão HTTP do Resend
        if hasattr(resend, 'default_http_client'):
            http_client = resend.default_http_client
            if hasattr(http_client, 'session'):
                session = http_client.session
                
                # Configurar retry strategy com timeout
                retry_strategy = Retry(
                    total=EMAIL_MAX_RETRIES,
                    backoff_factor=EMAIL_RETRY_DELAY,
                    status_forcelist=[429, 500, 502, 503, 504],
                    method_whitelist=["HEAD", "GET", "OPTIONS", "POST"]
                )
                
                adapter = HTTPAdapter(max_retries=retry_strategy)
                session.mount("http://", adapter)
                session.mount("https://", adapter)
                
                logger.info("Configuração de timeout e retry do Resend concluída")
    except Exception as e:
        logger.warning(f"Não foi possível configurar timeout do Resend: {e}")

# Chamar configuração na inicialização do módulo
_configure_resend_timeout()


class EmailService:
    """
    Serviço para envio de emails com Resend com suporte a retry automático.
    
    Segue a documentação oficial: https://resend.com/docs/send-email
    """

    @staticmethod
    def _build_email_params(
        to: str | List[str],
        subject: str,
        html: str,
        from_email: Optional[str] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        tags: Optional[List[Dict[str, str]]] = None,
        headers: Optional[Dict[str, str]] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Constrói os parâmetros do email conforme API do Resend.
        
        Args:
            to: Recipient email (string ou lista de strings, máx 50)
            subject: Email subject
            html: HTML version da mensagem
            from_email: Sender email address (padrão: EMAIL_FROM)
            reply_to: Reply-to email address (padrão: REPLY_TO_EMAIL)
            cc: Cc recipient email address (lista)
            bcc: Bcc recipient email address (lista)
            tags: Custom tags (array of {name, value})
            headers: Custom headers
            idempotency_key: Chave para evitar emails duplicados
            
        Returns:
            Dict com parâmetros para envio via Resend
        """
        email_params = {
            "from": from_email or EMAIL_FROM,
            "to": to if isinstance(to, list) else [to],
            "subject": subject,
            "html": html,
            "reply_to": reply_to or REPLY_TO_EMAIL,
        }
        
        # Adicionar parâmetros opcionais se fornecidos
        if cc:
            email_params["cc"] = cc if isinstance(cc, list) else [cc]
        
        if bcc:
            email_params["bcc"] = bcc if isinstance(bcc, list) else [bcc]
        
        if tags:
            email_params["tags"] = tags
        
        if headers:
            email_params["headers"] = headers
        
        # Gerar idempotency key se não fornecida (previne duplicatas em 24 horas)
        if idempotency_key:
            email_params["idempotency_key"] = idempotency_key
        else:
            email_params["idempotency_key"] = str(uuid.uuid4())
        
        return email_params

    @staticmethod
    def _send_with_retry(email_data: Dict[str, Any]) -> bool:
        """
        Envia email com retry automático e tratamento de timeout.
        Segue a documentação oficial do Resend.
        
        Args:
            email_data: Dicionário com dados do email conforme API Resend
            
        Returns:
            bool: True se enviado com sucesso, False caso contrário
        """
        if not resend.api_key:
            logger.error("RESEND_API_KEY não configurada! Não é possível enviar emails.")
            return False
        
        last_exception = None
        recipient = email_data.get("to", "unknown")
        if isinstance(recipient, list):
            recipient = ", ".join(recipient)
        
        for attempt in range(1, EMAIL_MAX_RETRIES + 1):
            try:
                logger.info(f"Tentativa {attempt}/{EMAIL_MAX_RETRIES} de envio para {recipient}")
                
                # Enviar email via Resend API com timeout configurado
                # Wrapper para adicionar timeout à chamada
                import signal
                
                class TimeoutException(Exception):
                    pass
                
                def timeout_handler(signum, frame):
                    raise TimeoutException("Email send operation timed out")
                
                # Usar timeout com fallback para try-except se signal não funcionar em Windows
                try:
                    # Tentar usar signal (Linux/Mac)
                    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
                    signal.alarm(EMAIL_TIMEOUT)
                    
                    response = resend.Emails.send(email_data)
                    
                    signal.alarm(0)  # Cancelar o alarme
                    signal.signal(signal.SIGALRM, old_handler)
                except (AttributeError, ValueError):
                    # signal.alarm não disponível no Windows, usar try direto
                    response = resend.Emails.send(email_data)
                
                if response and response.get("id"):
                    email_id = response.get("id")
                    idempotency_key = email_data.get("idempotency_key", "")
                    logger.info(
                        f"Email enviado com sucesso para {recipient} | "
                        f"ID: {email_id} | Idempotency: {idempotency_key}"
                    )
                    return True
                else:
                    logger.warning(f"Resposta inválida do Resend para {recipient}: {response}")
                    last_exception = Exception(f"Resposta inválida: {response}")
                    # Retry em resposta inválida
                    if attempt < EMAIL_MAX_RETRIES:
                        wait_time = EMAIL_RETRY_DELAY * attempt
                        logger.info(f"Aguardando {wait_time}s antes de retry...")
                        time.sleep(wait_time)
                    
            except (TimeoutError, requests.exceptions.Timeout, requests.exceptions.ConnectionError, requests.exceptions.ReadTimeout) as e:
                last_exception = e
                error_type = type(e).__name__
                logger.warning(
                    f"Tentativa {attempt} falhou para {recipient}: {error_type}: {str(e)}"
                )
                
                # Fazer retry se não for a última tentativa
                if attempt < EMAIL_MAX_RETRIES:
                    wait_time = EMAIL_RETRY_DELAY * attempt  # Backoff exponencial
                    logger.info(f"Aguardando {wait_time}s antes de retry...")
                    time.sleep(wait_time)
                else:
                    break
                    
            except Exception as e:
                last_exception = e
                error_type = type(e).__name__
                logger.error(
                    f"Erro ao enviar email para {recipient}: {error_type}: {str(e)}",
                    exc_info=True
                )
                
                # Fazer retry em timeouts mesmo que não seja classificado especificamente
                if "timeout" in str(e).lower() or "timed out" in str(e).lower():
                    if attempt < EMAIL_MAX_RETRIES:
                        wait_time = EMAIL_RETRY_DELAY * attempt
                        logger.info(f"Erro de timeout detectado. Aguardando {wait_time}s antes de retry...")
                        time.sleep(wait_time)
                        continue
                
                # Não fazer retry em outros erros
                break
        
        # Se todas as tentativas falharem, logar e retornar False
        logger.error(
            f"Falha ao enviar email para {recipient} após {EMAIL_MAX_RETRIES} tentativas. "
            f"Último erro: {last_exception}"
        )
        return False

    @staticmethod
    def enviar_convite_entrevista(
        candidato_email: str,
        candidato_nome: str,
        empresa_nome: str,
        vaga_titulo: str,
        data_entrevista: Optional[str] = None,
        link_resposta: Optional[str] = None
    ) -> bool:
        """Envia email de convite de entrevista para o candidato"""
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Convite de Entrevista</h2>
            
            <p>Olá <strong>{candidato_nome}</strong>,</p>
            
            <p>Que ótima notícia! A empresa <strong>{empresa_nome}</strong> está interessada em você para a posição de <strong>{vaga_titulo}</strong>.</p>
            
            <p>Eles gostariam de agendar uma entrevista com você.</p>
            
            {f'<p><strong>Data sugerida:</strong> {data_entrevista}</p>' if data_entrevista else ''}
            
            <p>
                <a href="{link_resposta}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">
                    Responder Convite
                </a>
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 12px;">
                Se você não conseguir clicar no link acima, copie e cole este endereço no seu navegador:<br>
                <span style="word-break: break-all;">{link_resposta}</span>
            </p>
            
            <p style="color: #999; font-size: 12px;">
                VagaFácil - Plataforma de Recrutamento<br>
                {SUPPORT_EMAIL}
            </p>
        </div>
        """
        
        email_params = EmailService._build_email_params(
            to=candidato_email,
            subject=f"Convite de Entrevista - {empresa_nome} - {vaga_titulo}",
            html=html_content,
            tags=[
                {"name": "type", "value": "interview_invite"},
                {"name": "company", "value": empresa_nome},
                {"name": "position", "value": vaga_titulo}
            ]
        )
        
        return EmailService._send_with_retry(email_params)

    @staticmethod
    def enviar_resposta_candidato(
        empresa_email: str,
        empresa_nome: str,
        candidato_nome: str,
        vaga_titulo: str,
        resposta: str,  # "aceito" ou "recusado"
        motivo: Optional[str] = None
    ) -> bool:
        """Notifica a empresa sobre a resposta do candidato ao convite"""
        resposta_texto = "ACEITOU" if resposta == "aceito" else "RECUSOU"
        resposta_cor = "#28a745" if resposta == "aceito" else "#dc3545"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Resposta do Candidato</h2>
            
            <p>Olá <strong>{empresa_nome}</strong>,</p>
            
            <p>O candidato <strong>{candidato_nome}</strong> respondeu ao convite para a posição <strong>{vaga_titulo}</strong>:</p>
            
            <p style="background-color: {resposta_cor}; color: white; padding: 15px; border-radius: 5px; text-align: center; font-size: 18px; font-weight: bold;">
                {resposta_texto}
            </p>
            
            {f'<p><strong>Motivo:</strong> {motivo}</p>' if motivo else ''}
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #999; font-size: 12px;">
                VagaFácil - Plataforma de Recrutamento<br>
                {SUPPORT_EMAIL}
            </p>
        </div>
        """
        
        email_params = EmailService._build_email_params(
            to=empresa_email,
            subject=f"Resposta do Candidato - {candidato_nome} - {resposta_texto}",
            html=html_content,
            tags=[
                {"name": "type", "value": "candidate_response"},
                {"name": "candidate", "value": candidato_nome},
                {"name": "response", "value": resposta}
            ]
        )
        
        return EmailService._send_with_retry(email_params)

    @staticmethod
    def enviar_confirmacao_agendamento(
        candidato_email: str,
        candidato_nome: str,
        empresa_nome: str,
        vaga_titulo: str,
        data_hora_entrevista: str,
        local_ou_link: str,
        instruacoes: Optional[str] = None
    ) -> bool:
        """Envia confirmação de agendamento de entrevista para o candidato"""
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Entrevista Agendada</h2>
            
            <p>Olá <strong>{candidato_nome}</strong>,</p>
            
            <p>Sua entrevista foi confirmada! Aqui estão os detalhes:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Empresa:</strong> {empresa_nome}</p>
                <p><strong>Posição:</strong> {vaga_titulo}</p>
                <p><strong>Data e Hora:</strong> {data_hora_entrevista}</p>
                <p><strong>Local/Link:</strong> {local_ou_link}</p>
            </div>
            
            {f'<p><strong>Instruções:</strong><br>{instruacoes}</p>' if instruacoes else ''}
            
            <p style="color: #666;">
                Se tiver dúvidas ou precisar remarcar, entre em contato conosco em {SUPPORT_EMAIL}.
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #999; font-size: 12px;">
                Boa sorte na entrevista!<br>
                VagaFácil - Plataforma de Recrutamento
            </p>
        </div>
        """
        
        email_params = EmailService._build_email_params(
            to=candidato_email,
            subject=f"Entrevista Confirmada - {empresa_nome}",
            html=html_content,
            tags=[
                {"name": "type", "value": "interview_confirmation"},
                {"name": "company", "value": empresa_nome},
                {"name": "position", "value": vaga_titulo}
            ]
        )
        
        return EmailService._send_with_retry(email_params)

    @staticmethod
    def enviar_reset_senha(
        email: str,
        nome: str,
        link_reset: str,
        tipo_usuario: str = "candidato"  # "candidato" ou "empresa"
    ) -> bool:
        """Envia email de recuperação de senha com retry automático"""
        if not resend.api_key:
            logger.error("RESEND_API_KEY não configurada! Não é possível enviar email de reset.")
            return False
        
        tipo_label = "Candidato" if tipo_usuario == "candidato" else "Empresa"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Recuperação de Senha</h2>
            
            <p>Olá <strong>{nome}</strong>,</p>
            
            <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="{link_reset}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                    Redefinir Senha
                </a>
            </p>
            
            <p style="color: #666;">
                Este link expira em 1 hora. Se você não solicitou a recuperação de senha, ignore este email.
            </p>
            
            <p style="color: #666; font-size: 12px;">
                Se você não conseguir clicar no link acima, copie e cole este endereço no seu navegador:<br>
                <span style="word-break: break-all;">{link_reset}</span>
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #999; font-size: 12px;">
                VagaFácil - Plataforma de Recrutamento<br>
                {SUPPORT_EMAIL}<br>
                {tipo_label}
            </p>
        </div>
        """
        
        logger.info(f"Enviando email de reset de senha para: {email}")
        
        email_params = EmailService._build_email_params(
            to=email,
            subject="Recuperação de Senha - VagaFácil",
            html=html_content,
            tags=[
                {"name": "type", "value": "password_reset"},
                {"name": "user_type", "value": tipo_usuario}
            ]
        )
        
        success = EmailService._send_with_retry(email_params)
        
        if success:
            logger.info(f"✅ Email de reset enviado com sucesso para {email}")
        else:
            logger.error(f"❌ Falha ao enviar email de reset para {email}")
        
        return success

    @staticmethod
    def enviar_email_notificacao(
        email: str,
        nome: str,
        assunto: str,
        mensagem: str,
        tipo: str = "info"  # "info", "aviso", "sucesso", "erro"
    ) -> bool:
        """Envia email genérico de notificação com retry automático"""
        cores = {
            "info": "#17a2b8",
            "aviso": "#ffc107",
            "sucesso": "#28a745",
            "erro": "#dc3545"
        }
        cor = cores.get(tipo, "#17a2b8")
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: {cor};">{assunto}</h2>
            
            <p>Olá <strong>{nome}</strong>,</p>
            
            <p>{mensagem}</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #999; font-size: 12px;">
                VagaFácil - Plataforma de Recrutamento<br>
                {SUPPORT_EMAIL}
            </p>
        </div>
        """
        
        email_params = EmailService._build_email_params(
            to=email,
            subject=assunto,
            html=html_content,
            tags=[
                {"name": "type", "value": "notification"},
                {"name": "notification_type", "value": tipo}
            ]
        )
        
        return EmailService._send_with_retry(email_params)
