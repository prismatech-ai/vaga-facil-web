"""
Modelo de Contrato da Plataforma e Configurações de Negócio.

Define:
- Termos de uso aceitos pela empresa
- Regras de cobrança e confidencialidade
- Vigência dos contratos
"""
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Enum as SQLAlchemyEnum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


# ==========================================
# CONFIGURAÇÕES GLOBAIS DE REGRAS DE NEGÓCIO
# ==========================================

class RegrasNegocio:
    """
    Configurações centralizadas das regras de negócio da plataforma.
    Pode ser estendido para carregar de banco de dados ou arquivo de config.
    """
    
    # ===================
    # CONTRATO E VIGÊNCIA
    # ===================
    
    # Tipo de contrato: "unico" ou "por_vaga"
    # - "unico": Empresa assina contrato uma vez no cadastro, válido para todas as vagas
    # - "por_vaga": Empresa assina contrato específico para cada vaga
    TIPO_CONTRATO = "unico"
    
    # Vigência do contrato em anos (1-2 anos conforme decisão)
    VIGENCIA_CONTRATO_ANOS = 2
    
    # Prazo para renovação automática (dias antes do vencimento)
    PRAZO_AVISO_RENOVACAO = 30
    
    # ===================
    # MODELO DE MONETIZAÇÃO
    # ===================
    
    # Modelo principal: "fee_salario" ou "publicacao_vaga"
    # - "fee_salario": Cobrança baseada em % do salário anual do contratado
    # - "publicacao_vaga": Valor fixo para publicar cada vaga
    MODELO_MONETIZACAO = "fee_salario"
    
    # Valor base para publicação de vaga (se modelo = "publicacao_vaga")
    VALOR_PUBLICACAO_VAGA = 500.00
    
    # Faixas de taxa de sucesso (já definido em cobranca.py)
    # Mantido aqui para referência
    # FAIXAS_TAXA = [10%, 12%, 15%, 18%]
    
    # ===================
    # CONFIDENCIALIDADE
    # ===================
    
    # Candidatos não escolhidos permanecem anônimos para a empresa
    MANTER_ANONIMATO_REJEITADOS = True
    
    # Após rejeição, revogar acesso aos dados pessoais (se liberados durante processo)
    REVOGAR_DADOS_APOS_REJEICAO = True
    
    # Tempo para manter dados do candidato visíveis após rejeição (dias)
    # 0 = revoga imediatamente
    PRAZO_REVOGACAO_DADOS_DIAS = 0
    
    # ===================
    # FLUXO DE SELEÇÃO
    # ===================
    
    # Exigir pré-seleção antes de liberar identidade como regra padrão
    EXIGIR_PRE_SELECAO = True
    
    # Fluxo padrão: empresa deve demonstrar interesse antes de ver dados pessoais
    FLUXO_ANONIMATO_PADRAO = True
    
    # ===================
    # POLÍTICA CONTRATADOS
    # ===================
    
    # O que acontece com candidatos contratados:
    # - is_active = False (não aparece mais em buscas)
    # - contratado = True
    # - Move para "banco de contratados" da empresa
    PERIODO_GARANTIA_DIAS = 90
    
    # Após garantia, candidato pode escolher voltar ao mercado
    PERMITIR_RETORNO_APOS_GARANTIA = True


class TipoContrato(str, Enum):
    """Tipos de contrato disponíveis"""
    PADRAO = "padrao"  # Contrato padrão da plataforma
    ENTERPRISE = "enterprise"  # Contrato customizado para grandes empresas
    TESTE = "teste"  # Período de teste/trial


class StatusContrato(str, Enum):
    """Status do contrato"""
    RASCUNHO = "rascunho"  # Aguardando aceite
    ATIVO = "ativo"  # Contrato vigente
    VENCIDO = "vencido"  # Contrato expirou
    CANCELADO = "cancelado"  # Cancelado pela empresa ou plataforma
    SUSPENSO = "suspenso"  # Temporariamente suspenso


class ContratoPlataforma(Base):
    """
    Contrato de uso da plataforma aceito pela empresa.
    
    Pode ser:
    - Único por empresa (aceite geral dos termos)
    - Por vaga (aceite específico para cada vaga publicada)
    """
    __tablename__ = "contratos_plataforma"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Referências
    empresa_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    vaga_id = Column(Integer, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)  # Null = contrato geral
    
    # Tipo e status
    tipo = Column(SQLAlchemyEnum(TipoContrato), default=TipoContrato.PADRAO, nullable=False)
    status = Column(SQLAlchemyEnum(StatusContrato), default=StatusContrato.RASCUNHO, nullable=False)
    
    # Versão dos termos aceitos
    versao_termos = Column(String(20), default="1.0", nullable=False)
    
    # Datas
    data_criacao = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    data_aceite = Column(DateTime(timezone=True), nullable=True)
    data_vigencia_inicio = Column(DateTime(timezone=True), nullable=True)
    data_vigencia_fim = Column(DateTime(timezone=True), nullable=True)
    data_cancelamento = Column(DateTime(timezone=True), nullable=True)
    
    # Dados do aceite
    ip_aceite = Column(String(50), nullable=True)
    user_agent_aceite = Column(String(500), nullable=True)
    usuario_aceite_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Termos específicos aceitos
    aceite_termos_uso = Column(Boolean, default=False)
    aceite_politica_privacidade = Column(Boolean, default=False)
    aceite_regras_cobranca = Column(Boolean, default=False)
    aceite_confidencialidade = Column(Boolean, default=False)
    
    # Hash do documento aceito (para auditoria)
    hash_documento = Column(String(64), nullable=True)
    
    # Observações
    observacoes = Column(Text, nullable=True)
    motivo_cancelamento = Column(Text, nullable=True)
    
    # Auditoria
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    empresa = relationship("Company", back_populates="contratos")
    vaga = relationship("Job", back_populates="contratos")
    usuario_aceite = relationship("User")
    
    @property
    def esta_vigente(self) -> bool:
        """Verifica se o contrato está vigente"""
        if self.status != StatusContrato.ATIVO:
            return False
        if self.data_vigencia_fim and datetime.utcnow() > self.data_vigencia_fim:
            return False
        return True
    
    @property
    def dias_para_vencer(self) -> int:
        """Retorna quantos dias faltam para o vencimento"""
        if self.data_vigencia_fim:
            delta = self.data_vigencia_fim - datetime.utcnow()
            return max(0, delta.days)
        return 999  # Sem data de fim = "infinito"
    
    @classmethod
    def criar_contrato_padrao(
        cls,
        empresa_id: int,
        vigencia_anos: int = None,
    ) -> "ContratoPlataforma":
        """
        Cria um novo contrato padrão para a empresa.
        """
        from datetime import timedelta
        
        vigencia = vigencia_anos or RegrasNegocio.VIGENCIA_CONTRATO_ANOS
        
        return cls(
            empresa_id=empresa_id,
            tipo=TipoContrato.PADRAO,
            status=StatusContrato.RASCUNHO,
            versao_termos="1.0",
            data_vigencia_inicio=datetime.utcnow(),
            data_vigencia_fim=datetime.utcnow() + timedelta(days=365 * vigencia),
        )


class TermosConfidencialidade(Base):
    """
    Registro de aceite de termos de confidencialidade por vaga.
    
    Garante que a empresa concorda em manter sigilo sobre:
    - Candidatos não selecionados
    - Dados pessoais visualizados
    - Processo seletivo
    """
    __tablename__ = "termos_confidencialidade"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Referências
    empresa_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    vaga_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    
    # Dados do aceite
    data_aceite = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    ip_aceite = Column(String(50), nullable=True)
    usuario_aceite_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # O que foi aceito
    aceite_nao_divulgar_candidatos = Column(Boolean, default=False)  # Não divulgar dados dos candidatos
    aceite_nao_contatar_diretamente = Column(Boolean, default=False)  # Não contatar candidatos fora da plataforma
    aceite_destruir_dados_rejeicao = Column(Boolean, default=False)  # Apagar dados após rejeição
    
    # Auditoria
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relacionamentos
    empresa = relationship("Company")
    vaga = relationship("Job")
    usuario_aceite = relationship("User")


# ==========================================
# FUNÇÕES AUXILIARES
# ==========================================

def validar_contrato_empresa(empresa_id: int, db) -> dict:
    """
    Valida se a empresa tem contrato ativo e válido.
    
    Returns:
        dict com status e detalhes do contrato
    """
    contrato = db.query(ContratoPlataforma).filter(
        ContratoPlataforma.empresa_id == empresa_id,
        ContratoPlataforma.status == StatusContrato.ATIVO,
        ContratoPlataforma.vaga_id.is_(None)  # Contrato geral
    ).first()
    
    if not contrato:
        return {
            "valido": False,
            "motivo": "Empresa não possui contrato ativo",
            "acao_necessaria": "aceitar_termos"
        }
    
    if not contrato.esta_vigente:
        return {
            "valido": False,
            "motivo": "Contrato expirado",
            "acao_necessaria": "renovar_contrato",
            "data_vencimento": contrato.data_vigencia_fim
        }
    
    if contrato.dias_para_vencer <= RegrasNegocio.PRAZO_AVISO_RENOVACAO:
        return {
            "valido": True,
            "aviso": f"Contrato vence em {contrato.dias_para_vencer} dias",
            "acao_recomendada": "renovar_contrato",
            "contrato_id": contrato.id
        }
    
    return {
        "valido": True,
        "contrato_id": contrato.id,
        "vigente_ate": contrato.data_vigencia_fim
    }


def obter_regras_negocio() -> dict:
    """
    Retorna todas as regras de negócio como dicionário.
    Útil para expor via API ou configuração.
    """
    return {
        "contrato": {
            "tipo": RegrasNegocio.TIPO_CONTRATO,
            "vigencia_anos": RegrasNegocio.VIGENCIA_CONTRATO_ANOS,
            "prazo_aviso_renovacao": RegrasNegocio.PRAZO_AVISO_RENOVACAO,
        },
        "monetizacao": {
            "modelo": RegrasNegocio.MODELO_MONETIZACAO,
            "valor_publicacao_vaga": RegrasNegocio.VALOR_PUBLICACAO_VAGA,
        },
        "confidencialidade": {
            "manter_anonimato_rejeitados": RegrasNegocio.MANTER_ANONIMATO_REJEITADOS,
            "revogar_dados_apos_rejeicao": RegrasNegocio.REVOGAR_DADOS_APOS_REJEICAO,
            "prazo_revogacao_dados_dias": RegrasNegocio.PRAZO_REVOGACAO_DADOS_DIAS,
        },
        "fluxo_selecao": {
            "exigir_pre_selecao": RegrasNegocio.EXIGIR_PRE_SELECAO,
            "fluxo_anonimato_padrao": RegrasNegocio.FLUXO_ANONIMATO_PADRAO,
        },
        "contratados": {
            "periodo_garantia_dias": RegrasNegocio.PERIODO_GARANTIA_DIAS,
            "permitir_retorno_apos_garantia": RegrasNegocio.PERMITIR_RETORNO_APOS_GARANTIA,
        }
    }
