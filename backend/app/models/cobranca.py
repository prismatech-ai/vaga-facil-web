"""
Modelo de Cobrança/Boleto para controle de pagamentos.
"""
from datetime import datetime, timedelta
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Enum as SQLAlchemyEnum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class StatusCobranca(str, Enum):
    """Status possíveis de uma cobrança"""
    PENDENTE = "pendente"
    PAGO = "pago"
    VENCIDO = "vencido"
    CANCELADO = "cancelado"
    REEMBOLSADO = "reembolsado"


class TipoCobranca(str, Enum):
    """Tipos de cobrança"""
    TAXA_SUCESSO = "taxa_sucesso"
    SERVICO_ADICIONAL = "servico_adicional"
    TAXA_SUCESSO_PARCIAL = "taxa_sucesso_parcial"  # Após reembolso


class MetodoPagamento(str, Enum):
    """Métodos de pagamento aceitos"""
    PIX = "pix"
    BOLETO = "boleto"
    CARTAO = "cartao"


# Percentuais de taxa de sucesso por faixa de remuneração anual
FAIXAS_TAXA_SUCESSO = [
    {"min": 0, "max": 60000, "percentual": 0.10, "descricao": "Até R$ 60.000/ano"},
    {"min": 60000, "max": 120000, "percentual": 0.12, "descricao": "R$ 60.000 a R$ 120.000/ano"},
    {"min": 120000, "max": 240000, "percentual": 0.15, "descricao": "R$ 120.000 a R$ 240.000/ano"},
    {"min": 240000, "max": float('inf'), "percentual": 0.18, "descricao": "Acima de R$ 240.000/ano"},
]

# Prazo de pagamento padrão em dias
PRAZO_PAGAMENTO_DIAS = 30


def calcular_taxa_sucesso(remuneracao_anual: float) -> tuple[float, float, str]:
    """
    Calcula a taxa de sucesso baseada na remuneração anual.
    
    Returns:
        tuple: (valor_taxa, percentual_aplicado, descricao_faixa)
    """
    for faixa in FAIXAS_TAXA_SUCESSO:
        if faixa["min"] <= remuneracao_anual < faixa["max"]:
            valor_taxa = remuneracao_anual * faixa["percentual"]
            return valor_taxa, faixa["percentual"], faixa["descricao"]
    
    # Fallback para última faixa
    ultima_faixa = FAIXAS_TAXA_SUCESSO[-1]
    return remuneracao_anual * ultima_faixa["percentual"], ultima_faixa["percentual"], ultima_faixa["descricao"]


class Cobranca(Base):
    """
    Modelo de cobrança para controle de pagamentos da plataforma.
    
    Fluxo:
    1. Empresa confirma contratação
    2. Empresa informa remuneração anual do candidato
    3. Sistema calcula taxa de sucesso e emite cobrança
    4. Empresa tem 30 dias para pagar
    5. Sistema monitora vencimentos e envia lembretes
    6. Pagamento confirmado inicia garantia
    """
    __tablename__ = "cobrancas"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Referências
    vaga_candidato_id = Column(Integer, ForeignKey("vaga_candidatos.id", ondelete="CASCADE"), nullable=False)
    empresa_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    vaga_id = Column(Integer, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    candidato_id = Column(Integer, ForeignKey("candidates.id", ondelete="SET NULL"), nullable=True)
    
    # Tipo e status
    tipo = Column(SQLAlchemyEnum(TipoCobranca), default=TipoCobranca.TAXA_SUCESSO, nullable=False)
    status = Column(SQLAlchemyEnum(StatusCobranca), default=StatusCobranca.PENDENTE, nullable=False)
    
    # Valores
    remuneracao_anual = Column(Float, nullable=False)  # Remuneração informada pela empresa
    percentual_taxa = Column(Float, nullable=False)     # Percentual aplicado (0.10, 0.12, etc)
    valor_taxa = Column(Float, nullable=False)          # Valor calculado da taxa
    valor_servicos_adicionais = Column(Float, default=0)  # Soft skills, entrevista técnica, etc
    valor_total = Column(Float, nullable=False)         # Taxa + serviços adicionais
    valor_pago = Column(Float, nullable=True)           # Valor efetivamente pago
    
    # Descrição da faixa usada no cálculo
    descricao_faixa = Column(String(100), nullable=True)
    
    # Datas
    data_emissao = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    data_vencimento = Column(DateTime(timezone=True), nullable=False)
    data_pagamento = Column(DateTime(timezone=True), nullable=True)
    data_cancelamento = Column(DateTime(timezone=True), nullable=True)
    
    # Dados do pagamento
    metodo_pagamento = Column(SQLAlchemyEnum(MetodoPagamento), nullable=True)
    id_transacao = Column(String(100), nullable=True)  # ID do gateway de pagamento
    
    # Dados do boleto (se aplicável)
    codigo_boleto = Column(String(50), nullable=True)
    linha_digitavel = Column(String(60), nullable=True)
    url_boleto = Column(String(500), nullable=True)
    
    # Dados do PIX (se aplicável)
    pix_copia_cola = Column(Text, nullable=True)
    pix_qr_code = Column(Text, nullable=True)  # Base64 do QR Code
    
    # Controle de lembretes
    lembrete_7_dias_enviado = Column(Boolean, default=False)
    lembrete_3_dias_enviado = Column(Boolean, default=False)
    lembrete_1_dia_enviado = Column(Boolean, default=False)
    lembrete_vencido_enviado = Column(Boolean, default=False)
    
    # Observações
    observacoes = Column(Text, nullable=True)
    motivo_cancelamento = Column(Text, nullable=True)
    
    # Auditoria
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    vaga_candidato = relationship("VagaCandidato", back_populates="cobrancas")
    empresa = relationship("Company", back_populates="cobrancas")
    vaga = relationship("Job", back_populates="cobrancas")
    candidato = relationship("Candidate", back_populates="cobrancas")
    
    @property
    def dias_para_vencimento(self) -> int:
        """Retorna quantos dias faltam para o vencimento"""
        if self.data_vencimento:
            delta = self.data_vencimento - datetime.utcnow()
            return max(0, delta.days)
        return 0
    
    @property
    def esta_vencido(self) -> bool:
        """Verifica se a cobrança está vencida"""
        if self.status == StatusCobranca.PAGO:
            return False
        if self.data_vencimento:
            return datetime.utcnow() > self.data_vencimento
        return False
    
    @classmethod
    def criar_cobranca_taxa_sucesso(
        cls,
        vaga_candidato_id: int,
        empresa_id: int,
        vaga_id: int,
        candidato_id: int,
        remuneracao_anual: float,
        valor_servicos_adicionais: float = 0
    ) -> "Cobranca":
        """
        Cria uma nova cobrança de taxa de sucesso.
        
        Args:
            vaga_candidato_id: ID do relacionamento vaga-candidato
            empresa_id: ID da empresa contratante
            vaga_id: ID da vaga
            candidato_id: ID do candidato
            remuneracao_anual: Salário anual do candidato informado pela empresa
            valor_servicos_adicionais: Valor de serviços extras (soft skills, etc)
        
        Returns:
            Cobranca: Nova instância de cobrança
        """
        valor_taxa, percentual, descricao = calcular_taxa_sucesso(remuneracao_anual)
        valor_total = valor_taxa + valor_servicos_adicionais
        
        return cls(
            vaga_candidato_id=vaga_candidato_id,
            empresa_id=empresa_id,
            vaga_id=vaga_id,
            candidato_id=candidato_id,
            tipo=TipoCobranca.TAXA_SUCESSO,
            status=StatusCobranca.PENDENTE,
            remuneracao_anual=remuneracao_anual,
            percentual_taxa=percentual,
            valor_taxa=valor_taxa,
            valor_servicos_adicionais=valor_servicos_adicionais,
            valor_total=valor_total,
            descricao_faixa=descricao,
            data_emissao=datetime.utcnow(),
            data_vencimento=datetime.utcnow() + timedelta(days=PRAZO_PAGAMENTO_DIAS)
        )
    
    def confirmar_pagamento(
        self,
        metodo: MetodoPagamento,
        id_transacao: str,
        valor_pago: float = None
    ) -> None:
        """
        Confirma o pagamento da cobrança.
        
        Args:
            metodo: Método de pagamento utilizado
            id_transacao: ID da transação no gateway
            valor_pago: Valor efetivamente pago (default: valor_total)
        """
        self.status = StatusCobranca.PAGO
        self.metodo_pagamento = metodo
        self.id_transacao = id_transacao
        self.valor_pago = valor_pago or self.valor_total
        self.data_pagamento = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def marcar_vencido(self) -> None:
        """Marca a cobrança como vencida"""
        if self.status == StatusCobranca.PENDENTE:
            self.status = StatusCobranca.VENCIDO
            self.updated_at = datetime.utcnow()
    
    def cancelar(self, motivo: str) -> None:
        """Cancela a cobrança"""
        self.status = StatusCobranca.CANCELADO
        self.motivo_cancelamento = motivo
        self.data_cancelamento = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def to_dict(self) -> dict:
        """Converte para dicionário"""
        return {
            "id": self.id,
            "vaga_candidato_id": self.vaga_candidato_id,
            "empresa_id": self.empresa_id,
            "vaga_id": self.vaga_id,
            "candidato_id": self.candidato_id,
            "tipo": self.tipo.value if self.tipo else None,
            "status": self.status.value if self.status else None,
            "remuneracao_anual": self.remuneracao_anual,
            "percentual_taxa": self.percentual_taxa,
            "valor_taxa": self.valor_taxa,
            "valor_servicos_adicionais": self.valor_servicos_adicionais,
            "valor_total": self.valor_total,
            "valor_pago": self.valor_pago,
            "descricao_faixa": self.descricao_faixa,
            "data_emissao": self.data_emissao.isoformat() if self.data_emissao else None,
            "data_vencimento": self.data_vencimento.isoformat() if self.data_vencimento else None,
            "data_pagamento": self.data_pagamento.isoformat() if self.data_pagamento else None,
            "dias_para_vencimento": self.dias_para_vencimento,
            "esta_vencido": self.esta_vencido,
            "metodo_pagamento": self.metodo_pagamento.value if self.metodo_pagamento else None,
            "codigo_boleto": self.codigo_boleto,
            "linha_digitavel": self.linha_digitavel,
            "url_boleto": self.url_boleto,
            "pix_copia_cola": self.pix_copia_cola,
        }
