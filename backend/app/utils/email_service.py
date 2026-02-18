"""
Serviço de Email
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

class EmailService:
    """Serviço para envio de emails"""
    
    @staticmethod
    async def send_email(
        to_email: str,
        subject: str,
        body: str,
        is_html: bool = False
    ) -> bool:
        """Envia email"""
        try:
            if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
                # Em desenvolvimento, apenas logar
                print(f"[EMAIL] Para: {to_email}, Assunto: {subject}")
                return True
            
            msg = MIMEMultipart()
            msg["From"] = settings.EMAIL_FROM
            msg["To"] = to_email
            msg["Subject"] = subject
            
            if is_html:
                msg.attach(MIMEText(body, "html"))
            else:
                msg.attach(MIMEText(body, "plain"))
            
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"Erro ao enviar email: {e}")
            return False
    
    @staticmethod
    async def send_verification_email(to_email: str, verification_token: str) -> bool:
        """Envia email de verificação"""
        verification_url = f"https://vagafacil.com/verify?token={verification_token}"
        body = f"""
        Olá,
        
        Clique no link abaixo para verificar seu email:
        {verification_url}
        
        Se você não solicitou este email, ignore esta mensagem.
        """
        return await EmailService.send_email(
            to_email,
            "Verifique seu email - VagaFácil",
            body
        )
    
    @staticmethod
    async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
        """Envia email de recuperação de senha"""
        reset_url = f"https://vagafacil.com/reset-password?token={reset_token}"
        body = f"""
        Olá,
        
        Você solicitou a recuperação de senha. Clique no link abaixo:
        {reset_url}
        
        Este link expira em 1 hora.
        
        Se você não solicitou esta recuperação, ignore esta mensagem.
        """
        return await EmailService.send_email(
            to_email,
            "Recuperação de senha - VagaFácil",
            body
        )

