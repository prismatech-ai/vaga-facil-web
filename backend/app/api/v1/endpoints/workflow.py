"""
Endpoints do Workflow/Fluxo do Pipeline
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.dependencies import get_current_company, get_current_candidate
from app.models.company import Company
from app.models.candidate import Candidate
from app.models.candidato_teste import VagaCandidato, StatusKanbanCandidato
from app.models.job import Job
from app.services.workflow_service import WorkflowService

router = APIRouter(tags=["Workflow"])


# === Schemas ===

class DemonstrarInteresseRequest(BaseModel):
    vaga_candidato_id: int
    solicita_teste_soft_skills: bool = False
    solicita_entrevista_tecnica: bool = False
    aceita_acordo_exclusividade: bool = False


class AceitarEntrevistaRequest(BaseModel):
    vaga_candidato_id: int
    data_entrevista: Optional[datetime] = None


class RecusarEntrevistaRequest(BaseModel):
    vaga_candidato_id: int
    motivo: Optional[str] = None


class ConfirmarContratacaoRequest(BaseModel):
    vaga_candidato_id: int
    remuneracao_anual: Optional[float] = Field(None, description="Remuneração anual para cálculo da taxa de sucesso")


class ConfirmarPagamentoRequest(BaseModel):
    vaga_candidato_id: int
    metodo_pagamento: str = Field(..., description="pix, boleto, cartao")
    id_transacao: str


class SolicitarReembolsoRequest(BaseModel):
    vaga_candidato_id: int
    motivo: str
    tipo_desligamento: str = Field(..., description="demissao_sem_justa_causa, pedido_demissao, nao_adaptacao")
    data_desligamento: datetime


class VagaCandidatoResponse(BaseModel):
    id: int
    vaga_id: int
    candidate_id: int
    status_kanban: str
    empresa_demonstrou_interesse: bool
    data_interesse: Optional[datetime]
    consentimento_entrevista: bool
    dados_pessoais_liberados: bool
    data_entrevista: Optional[datetime]
    foi_contratado: Optional[bool]
    valor_taxa: Optional[float]
    pagamento_confirmado: bool
    garantia_ativa: Optional[bool]
    data_fim_garantia: Optional[datetime]
    valor_reembolso: Optional[float]
    # Campos de serviços adicionais
    solicita_teste_soft_skills: Optional[bool] = False
    solicita_entrevista_tecnica: Optional[bool] = False
    valor_servicos_adicionais: Optional[float] = None
    acordo_exclusividade_aceito: Optional[bool] = False
    link_pagamento_gerado: Optional[bool] = False
    link_pagamento_url: Optional[str] = None
    soft_skills_realizado: Optional[bool] = False
    entrevista_tecnica_realizada: Optional[bool] = False
    # Campos de pré-seleção e match
    pre_selecionado: Optional[bool] = False
    data_pre_selecao: Optional[datetime] = None
    candidato_demonstrou_interesse: Optional[bool] = None
    numero_match: Optional[int] = None
    data_match: Optional[datetime] = None
    # Campos de seleção e visibilidade
    visivel_outras_vagas: Optional[bool] = True
    data_selecao: Optional[datetime] = None
    notas_selecao: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# === Endpoints da Empresa ===

@router.post("/empresa/demonstrar-interesse", response_model=VagaCandidatoResponse)
async def demonstrar_interesse(
    request: DemonstrarInteresseRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Empresa demonstra interesse em um candidato.
    
    - Permite solicitar serviços adicionais (soft skills, entrevista técnica)
    - Envia notificação ao candidato
    - Candidato tem 48h para responder
    - Dados pessoais ainda não são liberados
    - Gera link de pagamento se houver serviços adicionais
    """
    service = WorkflowService(db)
    
    vaga_candidato = await service.empresa_demonstra_interesse(
        vaga_candidato_id=request.vaga_candidato_id,
        empresa_id=current_company.id,
        solicita_teste_soft_skills=request.solicita_teste_soft_skills,
        solicita_entrevista_tecnica=request.solicita_entrevista_tecnica,
        aceita_acordo_exclusividade=request.aceita_acordo_exclusividade
    )
    
    return VagaCandidatoResponse.model_validate(vaga_candidato)


@router.post("/empresa/confirmar-contratacao", response_model=VagaCandidatoResponse)
async def confirmar_contratacao(
    request: ConfirmarContratacaoRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Empresa confirma contratação do candidato.
    
    Fluxo:
    1. Se remuneração_anual informada: cria cobrança automaticamente
    2. Gera taxa de sucesso pendente
    3. Envia notificação ao candidato
    4. Candidato fica invisível para outras vagas
    
    Após pagamento: garantia inicia e vaga fecha.
    """
    from app.models.cobranca import Cobranca
    
    service = WorkflowService(db)
    
    vaga_candidato = await service.empresa_confirma_contratacao(
        vaga_candidato_id=request.vaga_candidato_id,
        empresa_id=current_company.id
    )
    
    # Se remuneração informada, criar cobrança automaticamente
    if request.remuneracao_anual and request.remuneracao_anual > 0:
        # Verificar se já existe cobrança
        from sqlalchemy import and_
        from app.models.cobranca import StatusCobranca
        
        cobranca_existente = db.query(Cobranca).filter(
            and_(
                Cobranca.vaga_candidato_id == vaga_candidato.id,
                Cobranca.status.in_([StatusCobranca.PENDENTE, StatusCobranca.VENCIDO])
            )
        ).first()
        
        if not cobranca_existente:
            valor_servicos = vaga_candidato.valor_servicos_adicionais or 0
            
            cobranca = Cobranca.criar_cobranca_taxa_sucesso(
                vaga_candidato_id=vaga_candidato.id,
                empresa_id=current_company.id,
                vaga_id=vaga_candidato.vaga_id,
                candidato_id=vaga_candidato.candidate_id,
                remuneracao_anual=request.remuneracao_anual,
                valor_servicos_adicionais=valor_servicos
            )
            
            # Gerar dados de pagamento simulados
            cobranca.codigo_boleto = f"23793.38128 60000.000001 {cobranca.id if cobranca.id else 0:08d}.1 1 {int(cobranca.valor_total*100):013d}"
            cobranca.pix_copia_cola = f"00020126580014br.gov.bcb.pix0136pvf-pagamentos5204000053039865802BR5925PVF PLATAFORMA VAGA FAC6009SAO PAULO"
            
            db.add(cobranca)
            vaga_candidato.pagamento_pendente = True
            db.commit()
            db.refresh(vaga_candidato)
    
    return VagaCandidatoResponse.model_validate(vaga_candidato)


@router.post("/empresa/confirmar-pagamento", response_model=VagaCandidatoResponse)
async def confirmar_pagamento(
    request: ConfirmarPagamentoRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Confirma pagamento da taxa de sucesso.
    
    - Inicia período de garantia (90 dias)
    - Libera candidato para início de trabalho
    """
    service = WorkflowService(db)
    
    vaga_candidato = await service.confirmar_pagamento(
        vaga_candidato_id=request.vaga_candidato_id,
        empresa_id=current_company.id,
        metodo_pagamento=request.metodo_pagamento,
        id_transacao=request.id_transacao
    )
    
    return VagaCandidatoResponse.model_validate(vaga_candidato)


@router.post("/empresa/solicitar-reembolso", response_model=VagaCandidatoResponse)
async def solicitar_reembolso(
    request: SolicitarReembolsoRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Solicita reembolso durante período de garantia.
    
    - Calcula valor proporcional baseado em dias trabalhados
    - Registra motivo e tipo de desligamento
    """
    service = WorkflowService(db)
    
    vaga_candidato = await service.solicitar_reembolso(
        vaga_candidato_id=request.vaga_candidato_id,
        empresa_id=current_company.id,
        motivo=request.motivo,
        tipo_desligamento=request.tipo_desligamento,
        data_desligamento=request.data_desligamento
    )
    
    return VagaCandidatoResponse.model_validate(vaga_candidato)


@router.get("/empresa/pipeline/{job_id}", response_model=List[VagaCandidatoResponse])
async def get_pipeline_vaga(
    job_id: int,
    status_filter: Optional[str] = None,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista todos os candidatos no pipeline de uma vaga.
    
    - Filtra por status se especificado
    - Retorna dados anonimizados para candidatos sem consentimento
    """
    # Verificar se vaga pertence à empresa
    vaga = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_company.id
    ).first()
    
    if not vaga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaga não encontrada"
        )
    
    query = db.query(VagaCandidato).filter(VagaCandidato.vaga_id == job_id)
    
    if status_filter:
        try:
            status_enum = StatusKanbanCandidato(status_filter)
            query = query.filter(VagaCandidato.status_kanban == status_enum)
        except ValueError:
            pass  # Ignora filtro inválido
    
    candidatos = query.order_by(VagaCandidato.created_at.desc()).all()
    
    return [VagaCandidatoResponse.model_validate(c) for c in candidatos]


@router.get("/empresa/garantias-ativas")
async def get_garantias_ativas(
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista todas as garantias ativas da empresa.
    """
    garantias = db.query(VagaCandidato).join(Job).filter(
        Job.company_id == current_company.id,
        VagaCandidato.status_kanban == StatusKanbanCandidato.EM_GARANTIA,
        VagaCandidato.garantia_ativa == True
    ).all()
    
    resultado = []
    for g in garantias:
        candidato = g.candidate
        vaga = g.vaga
        dias_restantes = (g.data_fim_garantia - datetime.now()).days if g.data_fim_garantia else 0
        
        resultado.append({
            "id": g.id,
            "candidato_nome": candidato.full_name if candidato else None,
            "vaga_titulo": vaga.title if vaga else None,
            "data_inicio_garantia": g.data_inicio_garantia,
            "data_fim_garantia": g.data_fim_garantia,
            "dias_restantes": max(0, dias_restantes),
            "valor_taxa_pago": g.valor_taxa
        })
    
    return resultado


# === Endpoints do Candidato ===

@router.post("/candidato/aceitar-entrevista", response_model=VagaCandidatoResponse)
async def aceitar_entrevista(
    request: AceitarEntrevistaRequest,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Candidato aceita convite de entrevista.
    
    - Libera dados pessoais para a empresa
    - Notifica a empresa
    """
    service = WorkflowService(db)
    
    vaga_candidato = await service.candidato_aceita_entrevista(
        vaga_candidato_id=request.vaga_candidato_id,
        candidate_id=current_candidate.id,
        data_entrevista=request.data_entrevista
    )
    
    return VagaCandidatoResponse.model_validate(vaga_candidato)


@router.post("/candidato/recusar-entrevista", response_model=VagaCandidatoResponse)
async def recusar_entrevista(
    request: RecusarEntrevistaRequest,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Candidato recusa convite de entrevista.
    
    - Candidato volta para pool de candidatos
    - Notifica a empresa
    """
    service = WorkflowService(db)
    
    vaga_candidato = await service.candidato_recusa_entrevista(
        vaga_candidato_id=request.vaga_candidato_id,
        candidate_id=current_candidate.id,
        motivo=request.motivo
    )
    
    return VagaCandidatoResponse.model_validate(vaga_candidato)


@router.get("/candidato/interesses-pendentes")
async def get_interesses_pendentes(
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Lista empresas que demonstraram interesse no candidato.
    """
    interesses = db.query(VagaCandidato).filter(
        VagaCandidato.candidate_id == current_candidate.id,
        VagaCandidato.status_kanban == StatusKanbanCandidato.INTERESSE_EMPRESA
    ).all()
    
    resultado = []
    for i in interesses:
        vaga = i.vaga
        empresa = vaga.company if vaga else None
        
        # Calcular tempo restante para responder (48h)
        tempo_restante = None
        if i.data_interesse:
            prazo = i.data_interesse.replace(tzinfo=None) + timedelta(hours=48)
            tempo_restante = max(0, (prazo - datetime.now()).total_seconds() / 3600)
        
        resultado.append({
            "id": i.id,
            "vaga_id": i.vaga_id,
            "vaga_titulo": vaga.title if vaga else None,
            "vaga_descricao": vaga.description if vaga else None,
            "empresa_nome": empresa.nome_fantasia or empresa.razao_social if empresa else None,
            "empresa_setor": empresa.setor if empresa else None,
            "data_interesse": i.data_interesse,
            "horas_restantes": round(tempo_restante, 1) if tempo_restante else None
        })
    
    return resultado


@router.get("/candidato/minhas-candidaturas")
async def get_minhas_candidaturas(
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Lista todas as vagas em que o candidato está no pipeline.
    """
    candidaturas = db.query(VagaCandidato).filter(
        VagaCandidato.candidate_id == current_candidate.id
    ).order_by(VagaCandidato.updated_at.desc()).all()
    
    resultado = []
    for c in candidaturas:
        vaga = c.vaga
        empresa = vaga.company if vaga else None
        
        resultado.append({
            "id": c.id,
            "vaga_id": c.vaga_id,
            "vaga_titulo": vaga.title if vaga else None,
            "empresa_nome": empresa.nome_fantasia or empresa.razao_social if empresa else None,
            "status": c.status_kanban.value,
            "empresa_demonstrou_interesse": c.empresa_demonstrou_interesse,
            "entrevista_aceita": c.consentimento_entrevista,
            "data_entrevista": c.data_entrevista,
            "foi_contratado": c.foi_contratado,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        })
    
    return resultado


# === Endpoint público para aceite de entrevista via link ===

@router.get("/aceite-entrevista/{vaga_candidato_id}")
async def get_detalhes_aceite(
    vaga_candidato_id: int,
    db: Session = Depends(get_db)
):
    """
    Retorna detalhes da oportunidade para página de aceite (link enviado por email).
    
    Não requer autenticação mas não expõe dados sensíveis.
    """
    vaga_candidato = db.query(VagaCandidato).filter(
        VagaCandidato.id == vaga_candidato_id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oportunidade não encontrada"
        )
    
    if vaga_candidato.status_kanban != StatusKanbanCandidato.INTERESSE_EMPRESA:
        return {
            "valido": False,
            "motivo": "Esta oportunidade já foi respondida ou expirou"
        }
    
    # Verificar timeout de 48h
    if vaga_candidato.data_interesse:
        prazo = vaga_candidato.data_interesse.replace(tzinfo=None) + timedelta(hours=48)
        if datetime.now() > prazo:
            return {
                "valido": False,
                "motivo": "O prazo para resposta expirou"
            }
    
    vaga = vaga_candidato.vaga
    empresa = vaga.company if vaga else None
    candidato = vaga_candidato.candidate
    
    return {
        "valido": True,
        "vaga_candidato_id": vaga_candidato_id,
        "candidato_nome": candidato.full_name if candidato else None,
        "vaga": {
            "titulo": vaga.title if vaga else None,
            "descricao": vaga.description if vaga else None,
            "local": vaga.location if vaga else None,
            "modelo": vaga.work_model if vaga else None,
        },
        "empresa": {
            "nome": empresa.nome_fantasia or empresa.razao_social if empresa else None,
            "setor": empresa.setor if empresa else None,
        },
        "data_interesse": vaga_candidato.data_interesse,
        "prazo_resposta": vaga_candidato.data_interesse.replace(tzinfo=None) + timedelta(hours=48) if vaga_candidato.data_interesse else None
    }


@router.post("/aceite-entrevista/{vaga_candidato_id}/responder")
async def responder_aceite(
    vaga_candidato_id: int,
    aceitar: bool,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Responde ao interesse da empresa (aceitar ou recusar).
    """
    service = WorkflowService(db)
    
    if aceitar:
        vaga_candidato = await service.candidato_aceita_entrevista(
            vaga_candidato_id=vaga_candidato_id,
            candidate_id=current_candidate.id
        )
    else:
        vaga_candidato = await service.candidato_recusa_entrevista(
            vaga_candidato_id=vaga_candidato_id,
            candidate_id=current_candidate.id
        )
    
    return {
        "sucesso": True,
        "status": vaga_candidato.status_kanban.value,
        "mensagem": "Entrevista aceita! A empresa receberá seus dados." if aceitar else "Você recusou a entrevista."
    }


# === Endpoints de Pré-seleção (PSE) ===

class PreSelecaoRequest(BaseModel):
    vaga_candidato_id: int
    notas: Optional[str] = None


@router.post("/empresa/pre-selecionar", response_model=VagaCandidatoResponse)
async def pre_selecionar_candidato(
    request: PreSelecaoRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Empresa pré-seleciona um candidato (PSE).
    
    Primeiro passo do fluxo: marca candidato como pré-selecionado
    antes de consultar seu interesse.
    """
    service = WorkflowService(db)
    
    vaga_candidato = await service.pre_selecionar_candidato(
        vaga_candidato_id=request.vaga_candidato_id,
        empresa_id=current_company.id,
        notas=request.notas
    )
    
    return VagaCandidatoResponse.model_validate(vaga_candidato)


class ConsultarInteresseRequest(BaseModel):
    vaga_candidato_id: int


@router.post("/empresa/consultar-interesse")
async def consultar_interesse_candidato(
    request: ConsultarInteresseRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Empresa consulta se candidato tem interesse na vaga.
    
    Etapa intermediária antes de liberar identidade (LI).
    Envia e-mail ao candidato perguntando se tem interesse.
    """
    service = WorkflowService(db)
    
    vaga_candidato = await service.consultar_interesse_candidato(
        vaga_candidato_id=request.vaga_candidato_id,
        empresa_id=current_company.id
    )
    
    return {
        "sucesso": True,
        "mensagem": "Consulta enviada ao candidato. Aguarde a resposta.",
        "vaga_candidato_id": vaga_candidato.id
    }


# === Endpoints de Resposta do Candidato (antes de LI) ===

@router.get("/candidato/interesse/{vaga_candidato_id}")
async def get_detalhes_interesse(
    vaga_candidato_id: int,
    db: Session = Depends(get_db)
):
    """
    Retorna detalhes da vaga para candidato decidir se tem interesse.
    Página acessível via link do e-mail (antes da liberação de identidade).
    """
    vaga_candidato = db.query(VagaCandidato).filter(
        VagaCandidato.id == vaga_candidato_id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oportunidade não encontrada"
        )
    
    vaga = vaga_candidato.vaga
    
    # Não expõe dados detalhados da empresa ainda
    return {
        "vaga_candidato_id": vaga_candidato_id,
        "pre_selecionado": vaga_candidato.pre_selecionado,
        "ja_respondeu": vaga_candidato.candidato_demonstrou_interesse is not None,
        "vaga": {
            "titulo": vaga.title,
            "descricao": vaga.description[:500] + "..." if len(vaga.description) > 500 else vaga.description,
            "area": vaga.area,
            "local": f"{vaga.city}, {vaga.state}" if vaga.city else None,
            "modelo_trabalho": vaga.work_model,
            "nivel_senioridade": vaga.nivel_senioridade,
        }
    }


class ResponderInteresseRequest(BaseModel):
    aceita: bool
    motivo_rejeicao: Optional[str] = None


@router.post("/candidato/interesse/{vaga_candidato_id}/responder")
async def candidato_responder_interesse(
    vaga_candidato_id: int,
    request: ResponderInteresseRequest,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Candidato responde se tem interesse na vaga (antes de LI).
    
    Se aceita: empresa pode prosseguir com demonstrar interesse formal.
    Se rejeita: empresa é notificada e candidato não avança no processo.
    """
    service = WorkflowService(db)
    
    vaga_candidato = await service.candidato_responde_interesse(
        vaga_candidato_id=vaga_candidato_id,
        candidate_id=current_candidate.id,
        aceita=request.aceita,
        motivo_rejeicao=request.motivo_rejeicao
    )
    
    if request.aceita:
        return {
            "sucesso": True,
            "mensagem": "Obrigado pelo interesse! A empresa será notificada e poderá prosseguir com o processo.",
            "proximo_passo": "Aguarde contato da empresa para liberar seus dados completos."
        }
    else:
        return {
            "sucesso": True,
            "mensagem": "Obrigado por responder. A empresa foi notificada sobre sua decisão.",
            "proximo_passo": "Você pode continuar explorando outras oportunidades."
        }


# === Endpoint de Matches da Empresa ===

@router.get("/empresa/matches/{vaga_id}")
async def listar_matches_vaga(
    vaga_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista todos os matches (candidatos que aceitaram) de uma vaga.
    Retorna na ordem: 1º match, 2º match, etc.
    """
    # Verificar se a vaga pertence à empresa
    vaga = db.query(Job).filter(
        Job.id == vaga_id,
        Job.company_id == current_company.id
    ).first()
    
    if not vaga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaga não encontrada"
        )
    
    matches = db.query(VagaCandidato).filter(
        VagaCandidato.vaga_id == vaga_id,
        VagaCandidato.numero_match.isnot(None)
    ).order_by(VagaCandidato.numero_match.asc()).all()
    
    return {
        "vaga_id": vaga_id,
        "titulo_vaga": vaga.title,
        "total_matches": len(matches),
        "matches": [
            {
                "ordem": m.numero_match,
                "vaga_candidato_id": m.id,
                "candidate_id": m.candidate_id,
                "data_match": m.data_match,
                "status": m.status_kanban.value,
                "dados_liberados": m.dados_pessoais_liberados,
                "contratado": m.foi_contratado
            }
            for m in matches
        ]
    }


# === Endpoints de Histórico/Auditoria ===

class HistoricoEstadoResponse(BaseModel):
    id: int
    vaga_candidato_id: int
    estado_anterior: Optional[str]
    estado_novo: str
    usuario_id: Optional[int]
    tipo_usuario: Optional[str]
    motivo: Optional[str]
    automatico: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("/empresa/historico/{vaga_candidato_id}", response_model=List[HistoricoEstadoResponse])
async def obter_historico_candidato_empresa(
    vaga_candidato_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Obtém o histórico de mudanças de estado de um candidato em uma vaga (visão empresa).
    """
    from app.models.historico_estado import HistoricoEstadoPipeline
    
    # Verificar se a vaga pertence à empresa
    vaga_candidato = db.query(VagaCandidato).filter(
        VagaCandidato.id == vaga_candidato_id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro não encontrado"
        )
    
    vaga = db.query(Job).filter(
        Job.id == vaga_candidato.vaga_id,
        Job.company_id == current_company.id
    ).first()
    
    if not vaga:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado"
        )
    
    historico = db.query(HistoricoEstadoPipeline).filter(
        HistoricoEstadoPipeline.vaga_candidato_id == vaga_candidato_id
    ).order_by(HistoricoEstadoPipeline.created_at.asc()).all()
    
    return historico


@router.get("/candidato/historico/{vaga_candidato_id}", response_model=List[HistoricoEstadoResponse])
async def obter_historico_candidato_proprio(
    vaga_candidato_id: int,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Obtém o histórico de mudanças de estado do próprio candidato em uma vaga.
    """
    from app.models.historico_estado import HistoricoEstadoPipeline
    
    # Verificar se o registro pertence ao candidato
    vaga_candidato = db.query(VagaCandidato).filter(
        VagaCandidato.id == vaga_candidato_id,
        VagaCandidato.candidate_id == current_candidate.id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro não encontrado"
        )
    
    historico = db.query(HistoricoEstadoPipeline).filter(
        HistoricoEstadoPipeline.vaga_candidato_id == vaga_candidato_id
    ).order_by(HistoricoEstadoPipeline.created_at.asc()).all()
    
    return historico


@router.get("/empresa/auditoria/vaga/{vaga_id}")
async def obter_auditoria_vaga(
    vaga_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Obtém o histórico completo de todos os candidatos de uma vaga (para auditoria).
    """
    from app.models.historico_estado import HistoricoEstadoPipeline
    
    # Verificar se a vaga pertence à empresa
    vaga = db.query(Job).filter(
        Job.id == vaga_id,
        Job.company_id == current_company.id
    ).first()
    
    if not vaga:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaga não encontrada"
        )
    
    # Buscar todos os vaga_candidatos desta vaga
    vaga_candidatos = db.query(VagaCandidato).filter(
        VagaCandidato.vaga_id == vaga_id
    ).all()
    
    vaga_candidato_ids = [vc.id for vc in vaga_candidatos]
    
    # Buscar todo o histórico
    historico = db.query(HistoricoEstadoPipeline).filter(
        HistoricoEstadoPipeline.vaga_candidato_id.in_(vaga_candidato_ids)
    ).order_by(HistoricoEstadoPipeline.created_at.asc()).all()
    
    return {
        "vaga_id": vaga_id,
        "titulo_vaga": vaga.title,
        "total_candidatos": len(vaga_candidatos),
        "total_transicoes": len(historico),
        "transicoes": [
            {
                "id": h.id,
                "vaga_candidato_id": h.vaga_candidato_id,
                "estado_anterior": h.estado_anterior,
                "estado_novo": h.estado_novo,
                "tipo_usuario": h.tipo_usuario,
                "motivo": h.motivo,
                "automatico": h.automatico,
                "created_at": h.created_at
            }
            for h in historico
        ]
    }


# === Endpoint de Seleção ===

class SelecionarCandidatoRequest(BaseModel):
    vaga_candidato_id: int
    notas_selecao: Optional[str] = None


@router.post("/empresa/selecionar-candidato", response_model=VagaCandidatoResponse)
async def selecionar_candidato(
    request: SelecionarCandidatoRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Empresa seleciona um candidato para contratação (estado anterior a "contratado").
    O candidato fica reservado e não aparece mais em outras vagas.
    """
    # Verificar se o registro existe e pertence a uma vaga da empresa
    vaga_candidato = db.query(VagaCandidato).filter(
        VagaCandidato.id == request.vaga_candidato_id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro não encontrado"
        )
    
    vaga = db.query(Job).filter(
        Job.id == vaga_candidato.vaga_id,
        Job.company_id == current_company.id
    ).first()
    
    if not vaga:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vaga não pertence à empresa"
        )
    
    # Verificar se está no estado correto para seleção
    if vaga_candidato.status_kanban != StatusKanbanCandidato.ENTREVISTA_ACEITA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidato deve estar no estado 'entrevista_aceita' para ser selecionado. Estado atual: {vaga_candidato.status_kanban.value}"
        )
    
    workflow = WorkflowService(db)
    vaga_candidato = await workflow.transicionar_status(
        vaga_candidato_id=request.vaga_candidato_id,
        novo_status=StatusKanbanCandidato.SELECIONADO,
        dados_adicionais={"notas_selecao": request.notas_selecao},
        tipo_usuario="empresa",
        motivo="Empresa selecionou candidato para contratação"
    )
    
    return vaga_candidato


# === Regras de Visibilidade ===

@router.get("/visibilidade/{estado}")
async def obter_regras_visibilidade(estado: str):
    """
    Retorna as regras de visibilidade para um estado específico do pipeline.
    """
    from app.models.historico_estado import get_visibilidade_estado
    
    visibilidade = get_visibilidade_estado(estado)
    
    return {
        "estado": estado,
        "regras": visibilidade,
        "descricao": {
            "empresa_vê_dados_pessoais": "Se a empresa pode ver nome, email, telefone, endereço",
            "empresa_vê_curriculo": "Se a empresa pode ver/baixar o currículo",
            "empresa_vê_competencias": "Se a empresa pode ver competências e scores",
            "empresa_vê_resultados_testes": "Se a empresa pode ver resultados dos testes",
            "candidato_vê_empresa": "Se o candidato pode ver dados da empresa",
            "candidato_visivel_outras_vagas": "Se o candidato aparece em outras vagas"
        }
    }


@router.get("/estados-permitidos")
async def listar_estados_e_transicoes():
    """
    Lista todos os estados do pipeline e suas transições permitidas.
    """
    from app.services.workflow_service import TRANSICOES_PERMITIDAS
    
    estados = {
        estado.value: {
            "nome": estado.value,
            "transicoes_permitidas": [t.value for t in transicoes]
        }
        for estado, transicoes in TRANSICOES_PERMITIDAS.items()
    }
    
    return {
        "estados": estados,
        "total_estados": len(estados)
    }


# === Endpoints de Contratação e Garantia ===

class IniciarGarantiaRequest(BaseModel):
    vaga_candidato_id: int
    data_inicio_trabalho: Optional[datetime] = None


@router.post("/empresa/confirmar-contratacao", response_model=VagaCandidatoResponse)
async def confirmar_contratacao(
    request: ConfirmarContratacaoRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Empresa confirma a contratação do candidato.
    Move o candidato para o estado CONTRATADO.
    """
    vaga_candidato = db.query(VagaCandidato).filter(
        VagaCandidato.id == request.vaga_candidato_id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro não encontrado"
        )
    
    # Verificar se a vaga pertence à empresa
    vaga = db.query(Job).filter(
        Job.id == vaga_candidato.vaga_id,
        Job.company_id == current_company.id
    ).first()
    
    if not vaga:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado"
        )
    
    # Verificar estado válido para contratação (SELECIONADO)
    if vaga_candidato.status_kanban != StatusKanbanCandidato.SELECIONADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidato deve estar no estado 'selecionado' para ser contratado. Estado atual: {vaga_candidato.status_kanban.value}"
        )
    
    workflow = WorkflowService(db)
    vaga_candidato = await workflow.transicionar_status(
        vaga_candidato_id=request.vaga_candidato_id,
        novo_status=StatusKanbanCandidato.CONTRATADO,
        tipo_usuario="empresa",
        motivo="Empresa confirmou contratação"
    )
    
    return vaga_candidato


@router.post("/empresa/iniciar-garantia", response_model=VagaCandidatoResponse)
async def iniciar_garantia(
    request: IniciarGarantiaRequest,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Empresa inicia o período de garantia após confirmação de pagamento.
    Move o candidato para o estado EM_GARANTIA com prazo de 90 dias.
    """
    vaga_candidato = db.query(VagaCandidato).filter(
        VagaCandidato.id == request.vaga_candidato_id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro não encontrado"
        )
    
    # Verificar se a vaga pertence à empresa
    vaga = db.query(Job).filter(
        Job.id == vaga_candidato.vaga_id,
        Job.company_id == current_company.id
    ).first()
    
    if not vaga:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado"
        )
    
    # Verificar estado válido para iniciar garantia (CONTRATADO)
    if vaga_candidato.status_kanban != StatusKanbanCandidato.CONTRATADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidato deve estar no estado 'contratado' para iniciar garantia. Estado atual: {vaga_candidato.status_kanban.value}"
        )
    
    # Verificar se pagamento foi confirmado
    if not vaga_candidato.pagamento_confirmado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pagamento deve ser confirmado antes de iniciar a garantia"
        )
    
    workflow = WorkflowService(db)
    vaga_candidato = await workflow.transicionar_status(
        vaga_candidato_id=request.vaga_candidato_id,
        novo_status=StatusKanbanCandidato.EM_GARANTIA,
        dados_adicionais={"data_inicio_trabalho": request.data_inicio_trabalho},
        tipo_usuario="empresa",
        motivo="Empresa iniciou período de garantia"
    )
    
    return vaga_candidato


@router.post("/admin/processar-garantias-expiradas")
async def processar_garantias_expiradas(
    db: Session = Depends(get_db)
):
    """
    [JOB] Processa garantias que expiraram e finaliza automaticamente.
    Este endpoint deve ser chamado por um scheduler de tempo em tempo (ex: diário).
    
    - Busca todos os candidatos em EM_GARANTIA com data_fim_garantia <= agora
    - Move para GARANTIA_FINALIZADA
    - Notifica empresa e candidato
    """
    workflow = WorkflowService(db)
    total_processados = await workflow.finalizar_garantias_expiradas()
    
    return {
        "sucesso": True,
        "garantias_processadas": total_processados,
        "timestamp": datetime.now(),
        "mensagem": f"{total_processados} garantia(s) finalizada(s) automaticamente"
    }


@router.get("/empresa/garantias-ativas")
async def listar_garantias_ativas(
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista todas as garantias ativas da empresa.
    """
    garantias = db.query(VagaCandidato).join(Job).filter(
        Job.company_id == current_company.id,
        VagaCandidato.status_kanban == StatusKanbanCandidato.EM_GARANTIA,
        VagaCandidato.garantia_ativa == True
    ).all()
    
    result = []
    for g in garantias:
        candidato = db.query(Candidate).filter(Candidate.id == g.candidate_id).first()
        vaga = db.query(Job).filter(Job.id == g.vaga_id).first()
        
        dias_restantes = None
        if g.data_fim_garantia:
            dias_restantes = (g.data_fim_garantia - datetime.now()).days
            if dias_restantes < 0:
                dias_restantes = 0
        
        result.append({
            "vaga_candidato_id": g.id,
            "candidato_nome": candidato.full_name if candidato and g.dados_pessoais_liberados else "Anônimo",
            "vaga_titulo": vaga.title if vaga else "N/A",
            "data_inicio_garantia": g.data_inicio_garantia,
            "data_fim_garantia": g.data_fim_garantia,
            "dias_restantes": dias_restantes,
            "valor_taxa_pago": g.valor_taxa
        })
    
    return {
        "total_garantias_ativas": len(result),
        "garantias": result
    }
