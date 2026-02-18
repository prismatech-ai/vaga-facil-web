"""
Modelo de Histórico/Auditoria de Estados do Pipeline
Rastreia todas as mudanças de estado dos candidatos nas vagas
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class HistoricoEstadoPipeline(Base):
    """
    Registro de auditoria para mudanças de estado no pipeline.
    Cada transição de status de um candidato é registrada aqui.
    """
    __tablename__ = "historico_estado_pipeline"

    id = Column(Integer, primary_key=True, index=True)
    
    # Referência ao relacionamento vaga-candidato
    vaga_candidato_id = Column(Integer, ForeignKey("vaga_candidatos.id"), nullable=False, index=True)
    
    # Estados da transição
    estado_anterior = Column(String(100), nullable=True)  # Null para estado inicial
    estado_novo = Column(String(100), nullable=False)
    
    # Quem realizou a ação
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Pode ser automático (sistema)
    tipo_usuario = Column(String(50), nullable=True)  # empresa, candidato, sistema
    
    # Detalhes da transição
    motivo = Column(Text, nullable=True)  # Motivo/justificativa da mudança
    dados_adicionais = Column(Text, nullable=True)  # JSON com dados extra (data entrevista, etc)
    
    # Contexto da ação
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Automático ou manual
    automatico = Column(Boolean, default=False)  # True se foi transição automática do sistema
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relacionamentos
    vaga_candidato = relationship("VagaCandidato", back_populates="historico_estados")
    usuario = relationship("User", foreign_keys=[usuario_id])
    
    def __repr__(self):
        return f"<HistoricoEstado(vaga_candidato_id={self.vaga_candidato_id}, {self.estado_anterior} -> {self.estado_novo})>"


# Regras de visibilidade por estado
VISIBILIDADE_POR_ESTADO = {
    "avaliacao_competencias": {
        "empresa_vê_dados_pessoais": False,
        "empresa_vê_curriculo": False,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": False,
        "candidato_vê_empresa": False,
        "candidato_visivel_outras_vagas": True,
    },
    "testes_realizados": {
        "empresa_vê_dados_pessoais": False,
        "empresa_vê_curriculo": False,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": True,
        "candidato_vê_empresa": False,
        "candidato_visivel_outras_vagas": True,
    },
    "testes_nao_realizados": {
        "empresa_vê_dados_pessoais": False,
        "empresa_vê_curriculo": False,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": False,
        "candidato_vê_empresa": False,
        "candidato_visivel_outras_vagas": True,
    },
    "interesse_empresa": {
        "empresa_vê_dados_pessoais": False,
        "empresa_vê_curriculo": False,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": True,
        "candidato_vê_empresa": True,  # Candidato vê dados da empresa para decidir
        "candidato_visivel_outras_vagas": True,
    },
    "entrevista_aceita": {
        "empresa_vê_dados_pessoais": True,  # Sigilo liberado
        "empresa_vê_curriculo": True,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": True,
        "candidato_vê_empresa": True,
        "candidato_visivel_outras_vagas": True,  # Ainda disponível
    },
    "selecionado": {
        "empresa_vê_dados_pessoais": True,
        "empresa_vê_curriculo": True,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": True,
        "candidato_vê_empresa": True,
        "candidato_visivel_outras_vagas": False,  # Reservado para esta vaga
    },
    "contratado": {
        "empresa_vê_dados_pessoais": True,
        "empresa_vê_curriculo": True,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": True,
        "candidato_vê_empresa": True,
        "candidato_visivel_outras_vagas": False,  # Removido do mercado
    },
    "em_garantia": {
        "empresa_vê_dados_pessoais": True,
        "empresa_vê_curriculo": True,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": True,
        "candidato_vê_empresa": True,
        "candidato_visivel_outras_vagas": False,  # Invisível durante garantia
    },
    "garantia_finalizada": {
        "empresa_vê_dados_pessoais": True,
        "empresa_vê_curriculo": True,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": True,
        "candidato_vê_empresa": True,
        "candidato_visivel_outras_vagas": False,  # Permanece contratado
    },
    "reembolso_solicitado": {
        "empresa_vê_dados_pessoais": True,
        "empresa_vê_curriculo": True,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": True,
        "candidato_vê_empresa": True,
        "candidato_visivel_outras_vagas": False,  # Até resolver reembolso
    },
    "rejeitado": {
        "empresa_vê_dados_pessoais": False,  # Volta à anonimidade
        "empresa_vê_curriculo": False,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": True,
        "candidato_vê_empresa": False,
        "candidato_visivel_outras_vagas": True,  # Disponível para outras vagas
    },
}


def get_visibilidade_estado(estado: str) -> dict:
    """Retorna as regras de visibilidade para um estado específico"""
    return VISIBILIDADE_POR_ESTADO.get(estado, {
        "empresa_vê_dados_pessoais": False,
        "empresa_vê_curriculo": False,
        "empresa_vê_competencias": True,
        "empresa_vê_resultados_testes": False,
        "candidato_vê_empresa": False,
        "candidato_visivel_outras_vagas": True,
    })


def candidato_visivel_para_outras_vagas(estado: str) -> bool:
    """Verifica se candidato pode aparecer em outras vagas neste estado"""
    visibilidade = get_visibilidade_estado(estado)
    return visibilidade.get("candidato_visivel_outras_vagas", True)


def empresa_pode_ver_dados_pessoais(estado: str) -> bool:
    """Verifica se empresa pode ver dados pessoais neste estado"""
    visibilidade = get_visibilidade_estado(estado)
    return visibilidade.get("empresa_vê_dados_pessoais", False)
