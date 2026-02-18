"""
Endpoints para gerenciar status do perfil do candidato
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.dependencies import get_current_candidate
from app.models.candidate import Candidate
from app.models.user import User

router = APIRouter(tags=["Candidato Status"])


@router.get("/status")
async def get_candidate_status(
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Retorna o status do perfil do candidato
    
    Response:
        - is_active: Se o perfil está ativo (buscando emprego)
        - contratado: Se o candidato foi contratado
        - data_contratacao: Data quando foi contratado
    """
    return {
        "candidato_id": current_candidate.id,
        "full_name": current_candidate.full_name,
        "is_active": current_candidate.is_active,
        "contratado": current_candidate.contratado,
        "data_contratacao": current_candidate.data_contratacao,
        "mensagem": "Perfil desativado - em busca de novo emprego" if not current_candidate.is_active else "Perfil ativo - buscando emprego"
    }


@router.put("/reativar-perfil")
async def reactivate_profile(
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Reativa o perfil do candidato para buscar emprego novamente
    
    Só funciona se o candidato estiver com o perfil desativado
    """
    if current_candidate.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Perfil já está ativo"
        )
    
    # Reativar perfil
    current_candidate.is_active = True
    current_candidate.contratado = False
    current_candidate.data_contratacao = None
    current_candidate.updated_at = datetime.now()
    
    db.commit()
    db.refresh(current_candidate)
    
    return {
        "candidato_id": current_candidate.id,
        "full_name": current_candidate.full_name,
        "is_active": current_candidate.is_active,
        "mensagem": "✅ Perfil reativado com sucesso! Você está visível para empresas novamente.",
        "timestamp": datetime.now()
    }


@router.put("/desativar-perfil")
async def deactivate_profile(
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Desativa o perfil do candidato temporariamente
    
    Isso remove o candidato da busca de vagas, mas mantém seus dados
    """
    if not current_candidate.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Perfil já está desativado"
        )
    
    # Desativar perfil (manualmente, não por contratação)
    current_candidate.is_active = False
    current_candidate.updated_at = datetime.now()
    
    db.commit()
    db.refresh(current_candidate)
    
    return {
        "candidato_id": current_candidate.id,
        "full_name": current_candidate.full_name,
        "is_active": current_candidate.is_active,
        "mensagem": "✅ Perfil desativado! Você não aparecerá mais nas buscas de vagas.",
        "timestamp": datetime.now()
    }


@router.get("/status-garantia")
async def get_warranty_status(
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Retorna o status da garantia do candidato
    
    Response:
        - contratado: Se o candidato foi contratado
        - garantia_finalizada: Se o período de garantia já terminou
        - pode_voltar_mercado: Se pode escolher voltar a receber ofertas
    """
    from app.models.candidato_teste import VagaCandidato, StatusKanbanCandidato
    
    # Buscar a última contratação do candidato
    ultima_contratacao = db.query(VagaCandidato).filter(
        VagaCandidato.candidate_id == current_candidate.id,
        VagaCandidato.foi_contratado == True
    ).order_by(VagaCandidato.data_resultado.desc()).first()
    
    garantia_info = None
    if ultima_contratacao:
        dias_restantes = None
        if ultima_contratacao.data_fim_garantia:
            dias_restantes = (ultima_contratacao.data_fim_garantia - datetime.now()).days
            if dias_restantes < 0:
                dias_restantes = 0
        
        garantia_info = {
            "vaga_candidato_id": ultima_contratacao.id,
            "status_kanban": ultima_contratacao.status_kanban.value,
            "garantia_ativa": ultima_contratacao.garantia_ativa,
            "data_inicio_garantia": ultima_contratacao.data_inicio_garantia,
            "data_fim_garantia": ultima_contratacao.data_fim_garantia,
            "dias_restantes": dias_restantes
        }
    
    pode_voltar = (
        current_candidate.contratado and 
        current_candidate.garantia_finalizada and 
        not current_candidate.is_active
    )
    
    return {
        "candidato_id": current_candidate.id,
        "full_name": current_candidate.full_name,
        "is_active": current_candidate.is_active,
        "contratado": current_candidate.contratado,
        "data_contratacao": current_candidate.data_contratacao,
        "garantia_finalizada": current_candidate.garantia_finalizada,
        "data_fim_garantia": current_candidate.data_fim_garantia,
        "pode_voltar_mercado": pode_voltar,
        "ultima_contratacao": garantia_info,
        "mensagem": _get_status_message(current_candidate, pode_voltar)
    }


def _get_status_message(candidato: Candidate, pode_voltar: bool) -> str:
    """Retorna mensagem de status personalizada"""
    if candidato.is_active:
        return "Perfil ativo - você está visível para empresas"
    elif pode_voltar:
        return "Período de garantia finalizado! Você pode escolher voltar ao mercado de trabalho."
    elif candidato.contratado and not candidato.garantia_finalizada:
        return "Você está contratado e em período de garantia (90 dias)"
    elif candidato.contratado:
        return "Você está contratado - perfil desativado"
    else:
        return "Perfil desativado manualmente"


@router.post("/decidir-voltar-mercado")
async def decide_return_to_market(
    voltar: bool,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Candidato decide se quer voltar ao mercado após período de garantia.
    
    Args:
        voltar: True para voltar a receber ofertas, False para permanecer inativo
    
    Só funciona se o candidato tiver a garantia finalizada.
    """
    if not current_candidate.garantia_finalizada:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você só pode tomar essa decisão após o período de garantia"
        )
    
    if current_candidate.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seu perfil já está ativo"
        )
    
    if voltar:
        # Reativar perfil
        current_candidate.is_active = True
        current_candidate.contratado = False
        current_candidate.data_contratacao = None
        current_candidate.updated_at = datetime.now()
        
        mensagem = "✅ Bem-vindo de volta! Seu perfil está ativo e você receberá novas ofertas."
    else:
        # Permanecer inativo
        mensagem = "✅ Entendido! Seu perfil permanece inativo. Você pode mudar de ideia a qualquer momento."
    
    db.commit()
    db.refresh(current_candidate)
    
    return {
        "candidato_id": current_candidate.id,
        "full_name": current_candidate.full_name,
        "is_active": current_candidate.is_active,
        "decisao": "voltar_mercado" if voltar else "permanecer_inativo",
        "mensagem": mensagem,
        "timestamp": datetime.now()
    }
