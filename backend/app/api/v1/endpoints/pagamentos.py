"""
Endpoints de Pagamentos e Cobranças
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.dependencies import get_current_company, get_current_user
from app.models.company import Company
from app.models.candidate import Candidate
from app.models.candidato_teste import VagaCandidato, StatusKanbanCandidato
from app.models.job import Job, JobStatus
from app.models.cobranca import (
    Cobranca, StatusCobranca, TipoCobranca, MetodoPagamento,
    calcular_taxa_sucesso, FAIXAS_TAXA_SUCESSO, PRAZO_PAGAMENTO_DIAS
)
from app.services.workflow_service import WorkflowService
from app.utils.email_service import EmailService

router = APIRouter(prefix="/pagamentos", tags=["Pagamentos"])


# === Schemas ===

class EmitirCobrancaRequest(BaseModel):
    """Request para emitir cobrança"""
    vaga_candidato_id: int
    remuneracao_anual: float = Field(..., description="Remuneração anual do candidato", gt=0)


class ConfirmarPagamentoRequest(BaseModel):
    """Request para confirmar pagamento"""
    cobranca_id: int
    metodo_pagamento: str = Field(..., description="pix, boleto, cartao")
    id_transacao: str = Field(..., description="ID da transação no gateway")


class CancelarCobrancaRequest(BaseModel):
    """Request para cancelar cobrança"""
    cobranca_id: int
    motivo: str


class SimularTaxaRequest(BaseModel):
    """Request para simular taxa de sucesso"""
    remuneracao_anual: float = Field(..., gt=0)


class CobrancaResponse(BaseModel):
    """Response de cobrança"""
    id: int
    vaga_candidato_id: int
    empresa_id: int
    vaga_id: Optional[int]
    candidato_id: Optional[int]
    tipo: str
    status: str
    remuneracao_anual: float
    percentual_taxa: float
    valor_taxa: float
    valor_servicos_adicionais: float
    valor_total: float
    valor_pago: Optional[float]
    descricao_faixa: Optional[str]
    data_emissao: datetime
    data_vencimento: datetime
    data_pagamento: Optional[datetime]
    dias_para_vencimento: int
    esta_vencido: bool
    metodo_pagamento: Optional[str]
    codigo_boleto: Optional[str]
    linha_digitavel: Optional[str]
    url_boleto: Optional[str]
    pix_copia_cola: Optional[str]
    candidato_nome: Optional[str] = None
    vaga_titulo: Optional[str] = None
    
    class Config:
        from_attributes = True


class FaixaTaxaResponse(BaseModel):
    """Faixa de taxa de sucesso"""
    min: float
    max: float
    percentual: float
    descricao: str


class SimulacaoTaxaResponse(BaseModel):
    """Resposta da simulação de taxa"""
    remuneracao_anual: float
    valor_taxa: float
    percentual_aplicado: float
    descricao_faixa: str
    faixas_disponiveis: List[FaixaTaxaResponse]


# === Endpoints ===

@router.get("/faixas-taxa", response_model=List[FaixaTaxaResponse])
async def listar_faixas_taxa():
    """
    Lista as faixas de taxa de sucesso disponíveis.
    
    Permite que a empresa saiba antecipadamente quanto pagará pela contratação.
    """
    faixas = []
    for faixa in FAIXAS_TAXA_SUCESSO:
        faixas.append(FaixaTaxaResponse(
            min=faixa["min"],
            max=faixa["max"] if faixa["max"] != float('inf') else 999999999,
            percentual=faixa["percentual"] * 100,  # Convertendo para porcentagem
            descricao=faixa["descricao"]
        ))
    return faixas


@router.post("/simular-taxa", response_model=SimulacaoTaxaResponse)
async def simular_taxa(request: SimularTaxaRequest):
    """
    Simula o valor da taxa de sucesso baseado na remuneração anual.
    
    Uso: Antes de confirmar a contratação, empresa pode simular quanto pagará.
    """
    valor_taxa, percentual, descricao = calcular_taxa_sucesso(request.remuneracao_anual)
    
    faixas = []
    for faixa in FAIXAS_TAXA_SUCESSO:
        faixas.append(FaixaTaxaResponse(
            min=faixa["min"],
            max=faixa["max"] if faixa["max"] != float('inf') else 999999999,
            percentual=faixa["percentual"] * 100,
            descricao=faixa["descricao"]
        ))
    
    return SimulacaoTaxaResponse(
        remuneracao_anual=request.remuneracao_anual,
        valor_taxa=valor_taxa,
        percentual_aplicado=percentual * 100,
        descricao_faixa=descricao,
        faixas_disponiveis=faixas
    )


@router.post("/emitir-cobranca", response_model=CobrancaResponse)
async def emitir_cobranca(
    request: EmitirCobrancaRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Emite cobrança de taxa de sucesso após seleção do candidato.
    
    Fluxo:
    1. Empresa informa a remuneração anual do candidato
    2. Sistema calcula a taxa de sucesso automaticamente
    3. Gera boleto/PIX com vencimento em 30 dias
    4. Envia notificação para a empresa
    
    Regras:
    - Só pode emitir para candidatos no status SELECIONADO ou CONTRATADO
    - Não pode emitir se já existe cobrança pendente
    - Empresa tem 30 dias para pagar
    """
    # Buscar vaga_candidato
    vaga_candidato = db.query(VagaCandidato).filter(
        VagaCandidato.id == request.vaga_candidato_id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaga-candidato não encontrado"
        )
    
    # Verificar se a vaga pertence à empresa
    vaga = db.query(Job).filter(Job.id == vaga_candidato.vaga_id).first()
    if not vaga or vaga.company_id != current_company.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para esta operação"
        )
    
    # Verificar status
    if vaga_candidato.status_kanban not in [
        StatusKanbanCandidato.SELECIONADO,
        StatusKanbanCandidato.CONTRATADO
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cobrança só pode ser emitida para candidatos selecionados ou contratados"
        )
    
    # Verificar se já existe cobrança pendente
    cobranca_existente = db.query(Cobranca).filter(
        and_(
            Cobranca.vaga_candidato_id == request.vaga_candidato_id,
            Cobranca.status.in_([StatusCobranca.PENDENTE, StatusCobranca.VENCIDO])
        )
    ).first()
    
    if cobranca_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma cobrança pendente para este candidato"
        )
    
    # Obter valor de serviços adicionais (se houver)
    valor_servicos = vaga_candidato.valor_servicos_adicionais or 0
    
    # Criar cobrança
    cobranca = Cobranca.criar_cobranca_taxa_sucesso(
        vaga_candidato_id=vaga_candidato.id,
        empresa_id=current_company.id,
        vaga_id=vaga.id,
        candidato_id=vaga_candidato.candidate_id,
        remuneracao_anual=request.remuneracao_anual,
        valor_servicos_adicionais=valor_servicos
    )
    
    # Gerar dados de pagamento simulados (em produção, integrar com gateway)
    cobranca.codigo_boleto = f"23793.38128 60000.000001 {cobranca.id:08d}.1 1 {int(cobranca.valor_total*100):013d}"
    cobranca.linha_digitavel = cobranca.codigo_boleto.replace(".", "").replace(" ", "")[:47]
    cobranca.pix_copia_cola = f"00020126580014br.gov.bcb.pix0136pvf-pagamentos-{cobranca.id}5204000053039865802BR5925PVF PLATAFORMA VAGA FAC6009SAO PAULO62070503***6304"
    
    db.add(cobranca)
    db.commit()
    db.refresh(cobranca)
    
    # Atualizar status do pagamento no vaga_candidato
    vaga_candidato.pagamento_pendente = True
    db.commit()
    
    # Enviar email para empresa
    await _enviar_email_cobranca_emitida(cobranca, current_company, vaga, db)
    
    # Buscar dados adicionais para resposta
    candidato = db.query(Candidate).filter(Candidate.id == vaga_candidato.candidate_id).first()
    
    response = CobrancaResponse(
        id=cobranca.id,
        vaga_candidato_id=cobranca.vaga_candidato_id,
        empresa_id=cobranca.empresa_id,
        vaga_id=cobranca.vaga_id,
        candidato_id=cobranca.candidato_id,
        tipo=cobranca.tipo.value if cobranca.tipo else "taxa_sucesso",
        status=cobranca.status.value if cobranca.status else "pendente",
        remuneracao_anual=cobranca.remuneracao_anual,
        percentual_taxa=cobranca.percentual_taxa,
        valor_taxa=cobranca.valor_taxa,
        valor_servicos_adicionais=cobranca.valor_servicos_adicionais or 0,
        valor_total=cobranca.valor_total,
        valor_pago=cobranca.valor_pago,
        descricao_faixa=cobranca.descricao_faixa,
        data_emissao=cobranca.data_emissao,
        data_vencimento=cobranca.data_vencimento,
        data_pagamento=cobranca.data_pagamento,
        dias_para_vencimento=cobranca.dias_para_vencimento,
        esta_vencido=cobranca.esta_vencido,
        metodo_pagamento=cobranca.metodo_pagamento.value if cobranca.metodo_pagamento else None,
        codigo_boleto=cobranca.codigo_boleto,
        linha_digitavel=cobranca.linha_digitavel,
        url_boleto=cobranca.url_boleto,
        pix_copia_cola=cobranca.pix_copia_cola,
        candidato_nome=candidato.full_name if candidato else None,
        vaga_titulo=vaga.title if vaga else None
    )
    
    return response


@router.post("/confirmar", response_model=CobrancaResponse)
async def confirmar_pagamento(
    request: ConfirmarPagamentoRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Confirma pagamento de uma cobrança.
    
    Fluxo:
    1. Sistema valida a cobrança
    2. Marca como pago
    3. Inicia período de garantia (90 dias)
    4. Fecha a vaga
    5. Move candidato para banco de contratados
    """
    cobranca = db.query(Cobranca).filter(Cobranca.id == request.cobranca_id).first()
    
    if not cobranca:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cobrança não encontrada"
        )
    
    # Verificar permissão
    if cobranca.empresa_id != current_company.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para esta operação"
        )
    
    # Verificar status
    if cobranca.status not in [StatusCobranca.PENDENTE, StatusCobranca.VENCIDO]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cobrança não pode ser paga. Status atual: {cobranca.status.value}"
        )
    
    # Confirmar pagamento
    try:
        metodo = MetodoPagamento(request.metodo_pagamento)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Método de pagamento inválido. Use: pix, boleto ou cartao"
        )
    
    cobranca.confirmar_pagamento(
        metodo=metodo,
        id_transacao=request.id_transacao
    )
    
    # Buscar vaga_candidato
    vaga_candidato = db.query(VagaCandidato).filter(
        VagaCandidato.id == cobranca.vaga_candidato_id
    ).first()
    
    if vaga_candidato:
        # Atualizar status de pagamento
        vaga_candidato.pagamento_pendente = False
        vaga_candidato.pagamento_confirmado = True
        vaga_candidato.data_pagamento = datetime.utcnow()
        vaga_candidato.metodo_pagamento = request.metodo_pagamento
        vaga_candidato.id_transacao = request.id_transacao
        
        # Iniciar garantia
        vaga_candidato.garantia_ativa = True
        vaga_candidato.data_inicio_garantia = datetime.utcnow()
        vaga_candidato.data_fim_garantia = datetime.utcnow() + timedelta(days=90)
        
        # Transicionar para status EM_GARANTIA
        vaga_candidato.status_kanban = StatusKanbanCandidato.EM_GARANTIA
        
        # Marcar candidato como contratado e invisível
        candidato = db.query(Candidate).filter(
            Candidate.id == vaga_candidato.candidate_id
        ).first()
        if candidato:
            candidato.contratado = True
            candidato.is_active = False
            candidato.data_contratacao = datetime.utcnow()
    
    # Fechar a vaga
    vaga = db.query(Job).filter(Job.id == cobranca.vaga_id).first()
    if vaga:
        vaga.status = JobStatus.ENCERRADA
        vaga.closed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(cobranca)
    
    # Enviar email de confirmação
    await _enviar_email_pagamento_confirmado(cobranca, current_company, db)
    
    # Buscar dados para resposta
    candidato = db.query(Candidate).filter(Candidate.id == cobranca.candidato_id).first()
    
    return CobrancaResponse(
        id=cobranca.id,
        vaga_candidato_id=cobranca.vaga_candidato_id,
        empresa_id=cobranca.empresa_id,
        vaga_id=cobranca.vaga_id,
        candidato_id=cobranca.candidato_id,
        tipo=cobranca.tipo.value if cobranca.tipo else "taxa_sucesso",
        status=cobranca.status.value if cobranca.status else "pago",
        remuneracao_anual=cobranca.remuneracao_anual,
        percentual_taxa=cobranca.percentual_taxa,
        valor_taxa=cobranca.valor_taxa,
        valor_servicos_adicionais=cobranca.valor_servicos_adicionais or 0,
        valor_total=cobranca.valor_total,
        valor_pago=cobranca.valor_pago,
        descricao_faixa=cobranca.descricao_faixa,
        data_emissao=cobranca.data_emissao,
        data_vencimento=cobranca.data_vencimento,
        data_pagamento=cobranca.data_pagamento,
        dias_para_vencimento=cobranca.dias_para_vencimento,
        esta_vencido=cobranca.esta_vencido,
        metodo_pagamento=cobranca.metodo_pagamento.value if cobranca.metodo_pagamento else None,
        codigo_boleto=cobranca.codigo_boleto,
        linha_digitavel=cobranca.linha_digitavel,
        url_boleto=cobranca.url_boleto,
        pix_copia_cola=cobranca.pix_copia_cola,
        candidato_nome=candidato.full_name if candidato else None,
        vaga_titulo=vaga.title if vaga else None
    )


@router.get("/empresa/pendentes", response_model=List[CobrancaResponse])
async def listar_cobrancas_pendentes(
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista todas as cobranças pendentes da empresa.
    """
    cobrancas = db.query(Cobranca).filter(
        and_(
            Cobranca.empresa_id == current_company.id,
            Cobranca.status.in_([StatusCobranca.PENDENTE, StatusCobranca.VENCIDO])
        )
    ).order_by(Cobranca.data_vencimento).all()
    
    result = []
    for cobranca in cobrancas:
        candidato = db.query(Candidate).filter(Candidate.id == cobranca.candidato_id).first()
        vaga = db.query(Job).filter(Job.id == cobranca.vaga_id).first()
        
        result.append(CobrancaResponse(
            id=cobranca.id,
            vaga_candidato_id=cobranca.vaga_candidato_id,
            empresa_id=cobranca.empresa_id,
            vaga_id=cobranca.vaga_id,
            candidato_id=cobranca.candidato_id,
            tipo=cobranca.tipo.value if cobranca.tipo else "taxa_sucesso",
            status=cobranca.status.value if cobranca.status else "pendente",
            remuneracao_anual=cobranca.remuneracao_anual,
            percentual_taxa=cobranca.percentual_taxa,
            valor_taxa=cobranca.valor_taxa,
            valor_servicos_adicionais=cobranca.valor_servicos_adicionais or 0,
            valor_total=cobranca.valor_total,
            valor_pago=cobranca.valor_pago,
            descricao_faixa=cobranca.descricao_faixa,
            data_emissao=cobranca.data_emissao,
            data_vencimento=cobranca.data_vencimento,
            data_pagamento=cobranca.data_pagamento,
            dias_para_vencimento=cobranca.dias_para_vencimento,
            esta_vencido=cobranca.esta_vencido,
            metodo_pagamento=cobranca.metodo_pagamento.value if cobranca.metodo_pagamento else None,
            codigo_boleto=cobranca.codigo_boleto,
            linha_digitavel=cobranca.linha_digitavel,
            url_boleto=cobranca.url_boleto,
            pix_copia_cola=cobranca.pix_copia_cola,
            candidato_nome=candidato.full_name if candidato else None,
            vaga_titulo=vaga.title if vaga else None
        ))
    
    return result


@router.get("/empresa/historico", response_model=List[CobrancaResponse])
async def listar_historico_cobrancas(
    status_filtro: Optional[str] = Query(None, description="pendente, pago, vencido, cancelado"),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista histórico completo de cobranças da empresa.
    """
    query = db.query(Cobranca).filter(Cobranca.empresa_id == current_company.id)
    
    if status_filtro:
        try:
            status_enum = StatusCobranca(status_filtro)
            query = query.filter(Cobranca.status == status_enum)
        except ValueError:
            pass
    
    cobrancas = query.order_by(Cobranca.created_at.desc()).all()
    
    result = []
    for cobranca in cobrancas:
        candidato = db.query(Candidate).filter(Candidate.id == cobranca.candidato_id).first()
        vaga = db.query(Job).filter(Job.id == cobranca.vaga_id).first()
        
        result.append(CobrancaResponse(
            id=cobranca.id,
            vaga_candidato_id=cobranca.vaga_candidato_id,
            empresa_id=cobranca.empresa_id,
            vaga_id=cobranca.vaga_id,
            candidato_id=cobranca.candidato_id,
            tipo=cobranca.tipo.value if cobranca.tipo else "taxa_sucesso",
            status=cobranca.status.value if cobranca.status else "pendente",
            remuneracao_anual=cobranca.remuneracao_anual,
            percentual_taxa=cobranca.percentual_taxa,
            valor_taxa=cobranca.valor_taxa,
            valor_servicos_adicionais=cobranca.valor_servicos_adicionais or 0,
            valor_total=cobranca.valor_total,
            valor_pago=cobranca.valor_pago,
            descricao_faixa=cobranca.descricao_faixa,
            data_emissao=cobranca.data_emissao,
            data_vencimento=cobranca.data_vencimento,
            data_pagamento=cobranca.data_pagamento,
            dias_para_vencimento=cobranca.dias_para_vencimento,
            esta_vencido=cobranca.esta_vencido,
            metodo_pagamento=cobranca.metodo_pagamento.value if cobranca.metodo_pagamento else None,
            codigo_boleto=cobranca.codigo_boleto,
            linha_digitavel=cobranca.linha_digitavel,
            url_boleto=cobranca.url_boleto,
            pix_copia_cola=cobranca.pix_copia_cola,
            candidato_nome=candidato.full_name if candidato else None,
            vaga_titulo=vaga.title if vaga else None
        ))
    
    return result


@router.get("/cobranca/{cobranca_id}", response_model=CobrancaResponse)
async def obter_cobranca(
    cobranca_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Obtém detalhes de uma cobrança específica.
    """
    cobranca = db.query(Cobranca).filter(
        and_(
            Cobranca.id == cobranca_id,
            Cobranca.empresa_id == current_company.id
        )
    ).first()
    
    if not cobranca:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cobrança não encontrada"
        )
    
    candidato = db.query(Candidate).filter(Candidate.id == cobranca.candidato_id).first()
    vaga = db.query(Job).filter(Job.id == cobranca.vaga_id).first()
    
    return CobrancaResponse(
        id=cobranca.id,
        vaga_candidato_id=cobranca.vaga_candidato_id,
        empresa_id=cobranca.empresa_id,
        vaga_id=cobranca.vaga_id,
        candidato_id=cobranca.candidato_id,
        tipo=cobranca.tipo.value if cobranca.tipo else "taxa_sucesso",
        status=cobranca.status.value if cobranca.status else "pendente",
        remuneracao_anual=cobranca.remuneracao_anual,
        percentual_taxa=cobranca.percentual_taxa,
        valor_taxa=cobranca.valor_taxa,
        valor_servicos_adicionais=cobranca.valor_servicos_adicionais or 0,
        valor_total=cobranca.valor_total,
        valor_pago=cobranca.valor_pago,
        descricao_faixa=cobranca.descricao_faixa,
        data_emissao=cobranca.data_emissao,
        data_vencimento=cobranca.data_vencimento,
        data_pagamento=cobranca.data_pagamento,
        dias_para_vencimento=cobranca.dias_para_vencimento,
        esta_vencido=cobranca.esta_vencido,
        metodo_pagamento=cobranca.metodo_pagamento.value if cobranca.metodo_pagamento else None,
        codigo_boleto=cobranca.codigo_boleto,
        linha_digitavel=cobranca.linha_digitavel,
        url_boleto=cobranca.url_boleto,
        pix_copia_cola=cobranca.pix_copia_cola,
        candidato_nome=candidato.full_name if candidato else None,
        vaga_titulo=vaga.title if vaga else None
    )


@router.post("/cancelar", response_model=CobrancaResponse)
async def cancelar_cobranca(
    request: CancelarCobrancaRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Cancela uma cobrança pendente.
    
    Uso: Quando a empresa desiste da contratação antes do pagamento.
    """
    cobranca = db.query(Cobranca).filter(Cobranca.id == request.cobranca_id).first()
    
    if not cobranca:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cobrança não encontrada"
        )
    
    if cobranca.empresa_id != current_company.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para esta operação"
        )
    
    if cobranca.status == StatusCobranca.PAGO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível cancelar cobrança já paga"
        )
    
    cobranca.cancelar(request.motivo)
    
    # Atualizar vaga_candidato
    vaga_candidato = db.query(VagaCandidato).filter(
        VagaCandidato.id == cobranca.vaga_candidato_id
    ).first()
    if vaga_candidato:
        vaga_candidato.pagamento_pendente = False
    
    db.commit()
    db.refresh(cobranca)
    
    candidato = db.query(Candidate).filter(Candidate.id == cobranca.candidato_id).first()
    vaga = db.query(Job).filter(Job.id == cobranca.vaga_id).first()
    
    return CobrancaResponse(
        id=cobranca.id,
        vaga_candidato_id=cobranca.vaga_candidato_id,
        empresa_id=cobranca.empresa_id,
        vaga_id=cobranca.vaga_id,
        candidato_id=cobranca.candidato_id,
        tipo=cobranca.tipo.value if cobranca.tipo else "taxa_sucesso",
        status=cobranca.status.value if cobranca.status else "cancelado",
        remuneracao_anual=cobranca.remuneracao_anual,
        percentual_taxa=cobranca.percentual_taxa,
        valor_taxa=cobranca.valor_taxa,
        valor_servicos_adicionais=cobranca.valor_servicos_adicionais or 0,
        valor_total=cobranca.valor_total,
        valor_pago=cobranca.valor_pago,
        descricao_faixa=cobranca.descricao_faixa,
        data_emissao=cobranca.data_emissao,
        data_vencimento=cobranca.data_vencimento,
        data_pagamento=cobranca.data_pagamento,
        dias_para_vencimento=cobranca.dias_para_vencimento,
        esta_vencido=cobranca.esta_vencido,
        metodo_pagamento=cobranca.metodo_pagamento.value if cobranca.metodo_pagamento else None,
        codigo_boleto=cobranca.codigo_boleto,
        linha_digitavel=cobranca.linha_digitavel,
        url_boleto=cobranca.url_boleto,
        pix_copia_cola=cobranca.pix_copia_cola,
        candidato_nome=candidato.full_name if candidato else None,
        vaga_titulo=vaga.title if vaga else None
    )


# === Endpoints de Jobs (Controle de Vencimentos) ===

@router.post("/processar-vencimentos")
async def processar_vencimentos(
    db: Session = Depends(get_db)
):
    """
    Job para processar cobranças vencidas e enviar lembretes.
    
    Deve ser executado diariamente via cron job.
    
    Ações:
    - Marca cobranças vencidas como VENCIDO
    - Envia lembretes 7, 3 e 1 dia antes do vencimento
    - Envia notificação quando vence
    """
    resultados = {
        "vencidas_marcadas": 0,
        "lembretes_7_dias": 0,
        "lembretes_3_dias": 0,
        "lembretes_1_dia": 0,
        "lembretes_vencido": 0,
        "erros": []
    }
    
    agora = datetime.utcnow()
    
    # 1. Marcar cobranças vencidas
    cobrancas_vencidas = db.query(Cobranca).filter(
        and_(
            Cobranca.status == StatusCobranca.PENDENTE,
            Cobranca.data_vencimento < agora
        )
    ).all()
    
    for cobranca in cobrancas_vencidas:
        cobranca.marcar_vencido()
        resultados["vencidas_marcadas"] += 1
    
    # 2. Enviar lembretes
    cobrancas_pendentes = db.query(Cobranca).filter(
        Cobranca.status == StatusCobranca.PENDENTE
    ).all()
    
    for cobranca in cobrancas_pendentes:
        dias_restantes = cobranca.dias_para_vencimento
        
        try:
            # Lembrete 7 dias
            if dias_restantes <= 7 and not cobranca.lembrete_7_dias_enviado:
                await _enviar_lembrete_cobranca(cobranca, 7, db)
                cobranca.lembrete_7_dias_enviado = True
                resultados["lembretes_7_dias"] += 1
            
            # Lembrete 3 dias
            elif dias_restantes <= 3 and not cobranca.lembrete_3_dias_enviado:
                await _enviar_lembrete_cobranca(cobranca, 3, db)
                cobranca.lembrete_3_dias_enviado = True
                resultados["lembretes_3_dias"] += 1
            
            # Lembrete 1 dia
            elif dias_restantes <= 1 and not cobranca.lembrete_1_dia_enviado:
                await _enviar_lembrete_cobranca(cobranca, 1, db)
                cobranca.lembrete_1_dia_enviado = True
                resultados["lembretes_1_dia"] += 1
        except Exception as e:
            resultados["erros"].append(f"Cobrança {cobranca.id}: {str(e)}")
    
    # 3. Enviar lembretes para vencidas
    cobrancas_vencidas_nao_notificadas = db.query(Cobranca).filter(
        and_(
            Cobranca.status == StatusCobranca.VENCIDO,
            Cobranca.lembrete_vencido_enviado == False
        )
    ).all()
    
    for cobranca in cobrancas_vencidas_nao_notificadas:
        try:
            await _enviar_lembrete_vencido(cobranca, db)
            cobranca.lembrete_vencido_enviado = True
            resultados["lembretes_vencido"] += 1
        except Exception as e:
            resultados["erros"].append(f"Cobrança vencida {cobranca.id}: {str(e)}")
    
    db.commit()
    
    return {
        "status": "success",
        "processado_em": agora.isoformat(),
        "resultados": resultados
    }


@router.get("/relatorio/conciliacao")
async def relatorio_conciliacao(
    data_inicio: Optional[datetime] = None,
    data_fim: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """
    Relatório de conciliação de pagamentos.
    
    Mostra todas as cobranças e seus status para conferência financeira.
    """
    query = db.query(Cobranca)
    
    if data_inicio:
        query = query.filter(Cobranca.data_emissao >= data_inicio)
    if data_fim:
        query = query.filter(Cobranca.data_emissao <= data_fim)
    
    cobrancas = query.order_by(Cobranca.data_emissao.desc()).all()
    
    # Calcular totais
    total_emitido = sum(c.valor_total for c in cobrancas)
    total_pago = sum(c.valor_pago or 0 for c in cobrancas if c.status == StatusCobranca.PAGO)
    total_pendente = sum(c.valor_total for c in cobrancas if c.status == StatusCobranca.PENDENTE)
    total_vencido = sum(c.valor_total for c in cobrancas if c.status == StatusCobranca.VENCIDO)
    total_cancelado = sum(c.valor_total for c in cobrancas if c.status == StatusCobranca.CANCELADO)
    
    por_status = {
        "pendente": len([c for c in cobrancas if c.status == StatusCobranca.PENDENTE]),
        "pago": len([c for c in cobrancas if c.status == StatusCobranca.PAGO]),
        "vencido": len([c for c in cobrancas if c.status == StatusCobranca.VENCIDO]),
        "cancelado": len([c for c in cobrancas if c.status == StatusCobranca.CANCELADO])
    }
    
    return {
        "periodo": {
            "inicio": data_inicio.isoformat() if data_inicio else None,
            "fim": data_fim.isoformat() if data_fim else None
        },
        "totais": {
            "emitido": total_emitido,
            "pago": total_pago,
            "pendente": total_pendente,
            "vencido": total_vencido,
            "cancelado": total_cancelado
        },
        "quantidade_por_status": por_status,
        "total_cobrancas": len(cobrancas)
    }


# === Funções auxiliares de email ===

async def _enviar_email_cobranca_emitida(
    cobranca: Cobranca,
    empresa: Company,
    vaga: Job,
    db: Session
):
    """Envia email de cobrança emitida para empresa"""
    candidato = db.query(Candidate).filter(Candidate.id == cobranca.candidato_id).first()
    candidato_nome = candidato.full_name if candidato else "Candidato"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #03565C;">💰 Cobrança Emitida - Taxa de Sucesso</h2>
        
        <p>Olá {empresa.razao_social},</p>
        
        <p>A cobrança referente à contratação do candidato foi emitida com sucesso.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Detalhes da Cobrança</h3>
            <p><strong>Candidato:</strong> {candidato_nome}</p>
            <p><strong>Vaga:</strong> {vaga.title}</p>
            <p><strong>Remuneração Anual:</strong> R$ {cobranca.remuneracao_anual:,.2f}</p>
            <p><strong>Taxa ({cobranca.percentual_taxa*100:.0f}%):</strong> R$ {cobranca.valor_taxa:,.2f}</p>
            {f'<p><strong>Serviços Adicionais:</strong> R$ {cobranca.valor_servicos_adicionais:,.2f}</p>' if cobranca.valor_servicos_adicionais else ''}
            <hr style="border: 1px solid #ddd;">
            <p style="font-size: 18px;"><strong>Valor Total:</strong> R$ {cobranca.valor_total:,.2f}</p>
            <p style="color: #c00;"><strong>Vencimento:</strong> {cobranca.data_vencimento.strftime('%d/%m/%Y')}</p>
        </div>
        
        <div style="background-color: #e8f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0;">PIX Copia e Cola:</h4>
            <code style="word-break: break-all; font-size: 12px;">{cobranca.pix_copia_cola}</code>
        </div>
        
        <p style="text-align: center; margin: 30px 0;">
            <a href="/empresa/pagamentos/{cobranca.id}" 
               style="display: inline-block; padding: 12px 24px; background-color: #03565C; color: white; text-decoration: none; border-radius: 5px;">
                Realizar Pagamento
            </a>
        </p>
        
        <p style="color: #666; font-size: 12px;">
            Após o pagamento, o período de garantia de 90 dias será iniciado.
        </p>
    </div>
    """
    
    try:
        await EmailService.send_email(
            to_email=empresa.email,
            subject=f"Cobrança Emitida - Contratação de {candidato_nome}",
            body=html_content,
            is_html=True
        )
    except Exception as e:
        print(f"Erro ao enviar email de cobrança: {e}")


async def _enviar_email_pagamento_confirmado(
    cobranca: Cobranca,
    empresa: Company,
    db: Session
):
    """Envia email de pagamento confirmado"""
    candidato = db.query(Candidate).filter(Candidate.id == cobranca.candidato_id).first()
    candidato_nome = candidato.full_name if candidato else "Candidato"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ Pagamento Confirmado!</h2>
        
        <p>Olá {empresa.razao_social},</p>
        
        <p>Seu pagamento foi confirmado com sucesso!</p>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #166534;">Detalhes</h3>
            <p><strong>Candidato:</strong> {candidato_nome}</p>
            <p><strong>Valor Pago:</strong> R$ {cobranca.valor_pago:,.2f}</p>
            <p><strong>Método:</strong> {cobranca.metodo_pagamento.value.upper() if cobranca.metodo_pagamento else 'N/A'}</p>
            <p><strong>ID Transação:</strong> {cobranca.id_transacao}</p>
        </div>
        
        <div style="background-color: #03565C; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0; color: white;">🛡️ Período de Garantia Iniciado</h3>
            <p style="margin: 10px 0 0 0;">90 dias de garantia até {(datetime.utcnow() + timedelta(days=90)).strftime('%d/%m/%Y')}</p>
        </div>
        
        <p>A vaga foi fechada e o candidato já pode iniciar.</p>
        <p>Boa sorte com a nova contratação!</p>
    </div>
    """
    
    try:
        await EmailService.send_email(
            to_email=empresa.email,
            subject=f"✅ Pagamento Confirmado - {candidato_nome}",
            body=html_content,
            is_html=True
        )
    except Exception as e:
        print(f"Erro ao enviar email de confirmação: {e}")


async def _enviar_lembrete_cobranca(
    cobranca: Cobranca,
    dias: int,
    db: Session
):
    """Envia lembrete de cobrança"""
    empresa = db.query(Company).filter(Company.id == cobranca.empresa_id).first()
    if not empresa:
        return
    
    candidato = db.query(Candidate).filter(Candidate.id == cobranca.candidato_id).first()
    candidato_nome = candidato.full_name if candidato else "Candidato"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⚠️ Lembrete: Pagamento em {dias} dia(s)</h2>
        
        <p>Olá {empresa.razao_social},</p>
        
        <p>Sua cobrança referente à contratação de <strong>{candidato_nome}</strong> 
        vence em <strong>{dias} dia(s)</strong>.</p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Valor:</strong> R$ {cobranca.valor_total:,.2f}</p>
            <p><strong>Vencimento:</strong> {cobranca.data_vencimento.strftime('%d/%m/%Y')}</p>
        </div>
        
        <p style="text-align: center;">
            <a href="/empresa/pagamentos/{cobranca.id}" 
               style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 5px;">
                Pagar Agora
            </a>
        </p>
    </div>
    """
    
    try:
        await EmailService.send_email(
            to_email=empresa.email,
            subject=f"⚠️ Lembrete: Pagamento vence em {dias} dia(s)",
            body=html_content,
            is_html=True
        )
    except Exception as e:
        print(f"Erro ao enviar lembrete: {e}")


async def _enviar_lembrete_vencido(cobranca: Cobranca, db: Session):
    """Envia notificação de cobrança vencida"""
    empresa = db.query(Company).filter(Company.id == cobranca.empresa_id).first()
    if not empresa:
        return
    
    candidato = db.query(Candidate).filter(Candidate.id == cobranca.candidato_id).first()
    candidato_nome = candidato.full_name if candidato else "Candidato"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 Cobrança Vencida</h2>
        
        <p>Olá {empresa.razao_social},</p>
        
        <p>A cobrança referente à contratação de <strong>{candidato_nome}</strong> 
        <strong style="color: #dc2626;">está vencida</strong>.</p>
        
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Valor:</strong> R$ {cobranca.valor_total:,.2f}</p>
            <p><strong>Venceu em:</strong> {cobranca.data_vencimento.strftime('%d/%m/%Y')}</p>
        </div>
        
        <p>Por favor, regularize o pagamento o mais breve possível para evitar
        o cancelamento da contratação.</p>
        
        <p style="text-align: center;">
            <a href="/empresa/pagamentos/{cobranca.id}" 
               style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px;">
                Regularizar Agora
            </a>
        </p>
    </div>
    """
    
    try:
        await EmailService.send_email(
            to_email=empresa.email,
            subject=f"🚨 URGENTE: Cobrança Vencida - {candidato_nome}",
            body=html_content,
            is_html=True
        )
    except Exception as e:
        print(f"Erro ao enviar lembrete de vencido: {e}")
