"""
Modelos de Notificações e Configuração de Preços
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class NotificacaoEnviada(Base):
    """Histórico de notificações enviadas"""
    __tablename__ = "notificacoes_enviadas"

    id = Column(Integer, primary_key=True, index=True)
    vaga_candidato_id = Column(Integer, ForeignKey("vaga_candidatos.id", ondelete="CASCADE"), nullable=False)
    
    tipo_notificacao = Column(String(100), nullable=False)
    canal = Column(String(50), nullable=False)  # email, push, sms
    destinatario = Column(String(255), nullable=False)
    assunto = Column(String(500), nullable=True)
    conteudo_resumo = Column(Text, nullable=True)
    
    enviado_com_sucesso = Column(Boolean, default=False)
    erro_envio = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamento
    vaga_candidato = relationship("VagaCandidato", backref="notificacoes")
    
    def __repr__(self):
        return f"<NotificacaoEnviada(id={self.id}, tipo={self.tipo_notificacao}, canal={self.canal})>"


class ConfigPreco(Base):
    """Configuração de preços por nível e área"""
    __tablename__ = "config_precos"

    id = Column(Integer, primary_key=True, index=True)
    nivel = Column(String(50), nullable=False)  # junior, pleno, senior
    area = Column(String(100), nullable=True)  # opcional, para preços por área
    
    valor_minimo = Column(Float, nullable=False)
    valor_maximo = Column(Float, nullable=False)
    valor_padrao = Column(Float, nullable=False)
    
    ativo = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<ConfigPreco(nivel={self.nivel}, area={self.area}, valor_padrao={self.valor_padrao})>"


class ConfigServico(Base):
    """Configuração de serviços adicionais e seus preços"""
    __tablename__ = "config_servicos"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), nullable=False, unique=True)  # SOFT_SKILLS, ENTREVISTA_TECNICA, etc
    nome = Column(String(100), nullable=False)
    descricao = Column(Text, nullable=True)
    valor = Column(Float, nullable=False)
    ativo = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<ConfigServico(codigo={self.codigo}, nome={self.nome}, valor={self.valor})>"
