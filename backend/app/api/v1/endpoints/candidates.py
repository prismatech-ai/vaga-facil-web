"""
Endpoints para empresas acessarem informações de candidatos
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_company
from app.models.company import Company
from app.models.job import Job
from app.models.job_application import JobApplication, ApplicationStatus
from app.models.candidate import Candidate
from app.models.user import User
from app.schemas.candidato_anonimo import (
    CandidatoAnonimoResponse, 
    CandidatoAnonimoListResponse,
    CandidatoAnonimoDetalhesResponse
)
from app.utils.anonimizacao import gerar_id_anonimo, anonimizar_candidato
from app.models.candidato_teste import CandidatoTeste
from app.models.competencia import AutoavaliacaoCompetencia

router = APIRouter()


@router.get("/todos-candidatos", response_model=dict)
async def list_all_candidates(
    skip: int = Query(0, ge=0, description="Paginação - quantos registros pular"),
    limit: int = Query(100, ge=1, le=500, description="Limite de resultados (máximo: 500)"),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista TODOS os candidatos cadastrados no sistema
    
    Qualquer empresa autenticada pode acessar esta rota.
    
    Parâmetros opcionais:
    - skip: Quantidade de registros a pular (padrão: 0)
    - limit: Limite de resultados (padrão: 100, máximo: 500)
    """
    
    # Buscar todos os candidatos
    total = db.query(Candidate).count()
    candidates = db.query(Candidate).order_by(Candidate.created_at.desc()).offset(skip).limit(limit).all()
    
    # Formatar resposta
    candidates_list = []
    for candidate in candidates:
        candidate_info = {
            "id": candidate.id,
            "cpf": candidate.cpf,
            "nome_completo": candidate.full_name,
            "email": candidate.user.email if candidate.user else None,
            "telefone": candidate.phone,
            "data_nascimento": candidate.birth_date,
            "estado": candidate.estado,
            "cidade": candidate.cidade,
            "bio": candidate.bio,
            "ativo": candidate.user.is_active if candidate.user else False,
            "criado_em": candidate.created_at,
            "atualizado_em": candidate.updated_at
        }
        candidates_list.append(candidate_info)
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "candidatos": candidates_list
    }


@router.get("/candidatos", response_model=dict)
async def list_job_candidates(
    job_id: Optional[int] = Query(None, description="ID da vaga para filtrar candidatos"),
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status", description="Filtrar por status da candidatura"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista todos os candidatos que se aplicaram para vagas da empresa
    
    Parâmetros opcionais:
    - job_id: Filtrar por vaga específica
    - status: Filtrar por status da candidatura (pendente, aceito, rejeitado, etc)
    - skip: Paginação (padrão: 0)
    - limit: Limite de resultados (padrão: 100, máximo: 500)
    """
    
    # Construir query para buscar candidatos
    # Primeiro, buscar todas as vagas da empresa
    company_jobs = db.query(Job).filter(Job.company_id == current_company.id).all()
    job_ids = [job.id for job in company_jobs]
    
    if not job_ids:
        return []
    
    # Buscar candidaturas
    query = db.query(JobApplication).filter(JobApplication.job_id.in_(job_ids))
    
    # Filtrar por vaga específica se informado
    if job_id:
        job = db.query(Job).filter(
            Job.id == job_id,
            Job.company_id == current_company.id
        ).first()
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vaga não encontrada"
            )
        query = query.filter(JobApplication.job_id == job_id)
    
    # Filtrar por status se informado
    if status_filter:
        query = query.filter(JobApplication.status == status_filter)
    
    # Aplicar paginação e ordenação
    applications = query.order_by(JobApplication.created_at.desc()).offset(skip).limit(limit).all()
    
    # Formatar resposta
    candidates_list = []
    for app in applications:
        candidate = app.candidate
        if not candidate:
            continue
        
        candidate_info = {
            "candidatura_id": app.id,
            "status_candidatura": app.status.value,
            "data_candidatura": app.created_at,
            "vaga_id": app.job.id,
            "vaga_titulo": app.job.title,
            "candidato": {
                "id": candidate.id,
                "cpf": candidate.cpf,
                "nome_completo": candidate.full_name,
                "email": candidate.user.email if candidate.user else None,
                "telefone": candidate.phone,
                "data_nascimento": candidate.birth_date,
                "estado": candidate.estado,
                "cidade": candidate.cidade,
                "bio": candidate.bio,
                "criado_em": candidate.created_at
            }
        }
        candidates_list.append(candidate_info)
    
    return {
        "total": len(candidates_list),
        "skip": skip,
        "limit": limit,
        "candidatos": candidates_list
    }


@router.get("/candidatos/{candidate_id}", response_model=dict)
async def get_candidate_details(
    candidate_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Retorna detalhes completos de um candidato que se aplicou para vagas da empresa
    
    A empresa só pode ver candidatos que se aplicaram para suas vagas.
    """
    
    # Buscar o candidato
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato não encontrado"
        )
    
    # Verificar se o candidato se aplicou para alguma vaga da empresa
    company_jobs = db.query(Job).filter(Job.company_id == current_company.id).all()
    job_ids = [job.id for job in company_jobs]
    
    application = db.query(JobApplication).filter(
        JobApplication.candidate_id == candidate_id,
        JobApplication.job_id.in_(job_ids)
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para visualizar este candidato"
        )
    
    # Buscar todas as candidaturas do candidato para vagas da empresa
    all_applications = db.query(JobApplication).filter(
        JobApplication.candidate_id == candidate_id,
        JobApplication.job_id.in_(job_ids)
    ).all()
    
    # Formatar resposta
    return {
        "id": candidate.id,
        "cpf": candidate.cpf,
        "nome_completo": candidate.full_name,
        "email": candidate.user.email if candidate.user else None,
        "telefone": candidate.phone,
        "data_nascimento": candidate.birth_date,
        "estado": candidate.estado,
        "cidade": candidate.cidade,
        "bio": candidate.bio,
        "criado_em": candidate.created_at,
        "atualizado_em": candidate.updated_at,
        "candidaturas": [
            {
                "id": app.id,
                "vaga_id": app.job.id,
                "vaga_titulo": app.job.title,
                "status": app.status.value,
                "data_candidatura": app.created_at,
                "atualizado_em": app.updated_at
            }
            for app in all_applications
        ]
    }


@router.get("/candidatos/vaga/{job_id}", response_model=dict)
async def list_candidates_by_job(
    job_id: int,
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista candidatos de uma vaga específica da empresa
    
    Parâmetros opcionais:
    - status: Filtrar por status da candidatura
    - skip: Paginação
    - limit: Limite de resultados
    """
    
    # Verificar se a vaga pertence à empresa
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_company.id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaga não encontrada"
        )
    
    # Buscar candidaturas
    query = db.query(JobApplication).filter(JobApplication.job_id == job_id)
    
    if status_filter:
        query = query.filter(JobApplication.status == status_filter)
    
    applications = query.order_by(JobApplication.created_at.desc()).offset(skip).limit(limit).all()
    
    # Formatar resposta
    candidates_list = []
    for app in applications:
        candidate = app.candidate
        if not candidate:
            continue
        
        candidate_info = {
            "candidatura_id": app.id,
            "status": app.status.value,
            "data_candidatura": app.created_at,
            "candidato": {
                "id": candidate.id,
                "cpf": candidate.cpf,
                "nome_completo": candidate.full_name,
                "email": candidate.user.email if candidate.user else None,
                "telefone": candidate.phone,
                "data_nascimento": candidate.birth_date,
                "estado": candidate.estado,
                "cidade": candidate.cidade,
                "bio": candidate.bio
            }
        }
        candidates_list.append(candidate_info)
    
    return {
        "total": len(candidates_list),
        "skip": skip,
        "limit": limit,
        "candidatos": candidates_list
    }


# ============================================================================
# ROTAS PARA CANDIDATOS ANÔNIMOS (SEM DADOS SENSÍVEIS)
# ============================================================================

@router.get("/candidatos-anonimos", response_model=CandidatoAnonimoListResponse)
async def listar_candidatos_anonimos(
    skip: int = Query(0, ge=0, description="Quantidade de registros a pular"),
    limit: int = Query(100, ge=1, le=500, description="Limite de resultados (máximo: 500)"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    cidade: Optional[str] = Query(None, description="Filtrar por cidade"),
    is_pcd: Optional[bool] = Query(None, description="Filtrar por PCD"),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista todos os candidatos com dados anônimos (SEM DADOS SENSÍVEIS)
    
    ⚠️ IMPORTANTE - DADOS PROTEGIDOS:
    - ❌ Sem nome completo
    - ❌ Sem email
    - ❌ Sem telefone
    - ❌ Sem CPF
    - ❌ Sem data de nascimento
    - ✅ ID fictício (hash)
    - ✅ Localização (estado/cidade)
    - ✅ Dados profissionais (habilidades, formação, etc)
    - ✅ Links públicos (LinkedIn, portfolio)
    - ✅ Informação de PCD
    
    Parâmetros opcionais:
    - estado: Filtrar por estado (ex: "SP", "RJ")
    - cidade: Filtrar por cidade
    - is_pcd: Filtrar por pessoa com deficiência (true/false)
    - skip: Paginação
    - limit: Limite de resultados
    """
    
    # Construir query
    query = db.query(Candidate)
    
    # Filtros opcionais
    if estado:
        query = query.filter(Candidate.estado.ilike(f"%{estado}%"))
    
    if cidade:
        query = query.filter(Candidate.cidade.ilike(f"%{cidade}%"))
    
    if is_pcd is not None:
        query = query.filter(Candidate.is_pcd == is_pcd)
    
    # Contar total
    total = query.count()
    
    # Aplicar paginação
    candidates = query.order_by(Candidate.created_at.desc()).offset(skip).limit(limit).all()
    
    # Converter para resposta anônima
    candidatos_anonimos = []
    for candidate in candidates:
        dados_anonimos = anonimizar_candidato(candidate)
        candidatos_anonimos.append(CandidatoAnonimoResponse(**dados_anonimos))
    
    return CandidatoAnonimoListResponse(
        total=total,
        skip=skip,
        limit=limit,
        candidatos=candidatos_anonimos
    )


@router.get("/candidatos-anonimos/detalhes/{id_anonimo}", response_model=CandidatoAnonimoDetalhesResponse)
async def obter_detalhes_candidato_anonimo(
    id_anonimo: str,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Retorna detalhes completos de um candidato específico de forma anônima
    
    O id_anonimo é um identificador fictício que não revela a identidade real do candidato.
    
    ⚠️ IMPORTANTE - DADOS PROTEGIDOS:
    - ❌ Sem nome completo
    - ❌ Sem email
    - ❌ Sem telefone
    - ❌ Sem CPF
    - ❌ Sem data de nascimento
    - ✅ ID fictício (hash)
    - ✅ Localização completa
    - ✅ Dados profissionais detalhados
    - ✅ Status de onboarding
    - ✅ Habilidades e formação
    - ✅ Informações de PCD
    - ✅ Histórico de testes
    """
    
    # Buscar todos os candidatos para encontrar aquele com o ID anônimo correspondente
    # (O ID anônimo é um hash do ID real + CPF)
    candidates = db.query(Candidate).all()
    
    candidate_found = None
    for candidate in candidates:
        if gerar_id_anonimo(candidate.id, candidate.cpf) == id_anonimo:
            candidate_found = candidate
            break
    
    if not candidate_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato não encontrado"
        )
    
    # Verificar status de autoavaliação
    autoavaliacao_concluida = db.query(AutoavaliacaoCompetencia).filter(
        AutoavaliacaoCompetencia.candidate_id == candidate_found.id
    ).count() > 0
    
    # Montar resposta detalhada
    dados_anonimos = anonimizar_candidato(candidate_found)
    dados_anonimos["autoavaliacao_concluida"] = autoavaliacao_concluida
    dados_anonimos["teste_habilidades_completado"] = candidate_found.teste_habilidades_completado
    dados_anonimos["onboarding_completo"] = candidate_found.onboarding_completo
    dados_anonimos["percentual_completude"] = candidate_found.percentual_completude
    
    return CandidatoAnonimoDetalhesResponse(**dados_anonimos)
