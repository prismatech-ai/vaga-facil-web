"""
Endpoints de Vagas
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_company, get_current_candidate
from app.models.company import Company
from app.models.job import Job, JobStatus
from app.models.job_application import JobApplication, ApplicationStatus
from app.models.candidate import Candidate
from app.models.user import User, UserType
from app.schemas.job import (
    JobCreate,
    JobUpdate,
    JobResponse,
    JobPublic,
    JobMetrics,
    CandidaturaComDetalheVaga,
    RecomendacaoVaga
)
from app.services.job_service import JobService
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
# ============================================================================

@router.get("/disponibles", response_model=List[JobPublic])
async def list_available_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Lista todas as vagas disponíveis para candidatos
    
    Retorna apenas vagas com status ABERTA (disponível para candidaturas)
    Não requer autenticação
    """
    jobs = db.query(Job).filter(
        Job.status == JobStatus.ABERTA
    ).order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    
    return jobs


@router.get("/publico/{job_id}", response_model=JobPublic)
async def get_available_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """
    Retorna detalhes de uma vaga disponível
    
    Não requer autenticação. A vaga deve estar com status ABERTA
    """
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.status == JobStatus.ABERTA
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaga não encontrada ou não está disponível"
        )
    
    return job


# ============================================================================
# ROTAS ESPECÍFICAS DE CANDIDATOS (COM AUTENTICAÇÃO)
# Devem vir ANTES de rotas parameterizadas como /{job_id}
# ============================================================================

@router.get("/minhas-candidaturas", response_model=List[CandidaturaComDetalheVaga])
async def obter_minhas_candidaturas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Retorna todas as candidaturas do candidato autenticado
    
    **Acesso**: Apenas candidatos autenticados
    
    Parâmetros:
    - skip: Quantos registros pular (padrão: 0)
    - limit: Limite de resultados (padrão: 100)
    - status: Filtrar por status (em_analise, entrevista, finalista, recusado, contratado)
    
    Exemplo:
    GET /api/v1/jobs/minhas-candidaturas?status=em_analise&limit=20
    """
    try:
        # Buscar candidaturas do candidato
        query = db.query(JobApplication).filter(
            JobApplication.candidate_id == candidate.id
        )
        
        # Filtro opcional por status
        if status_filter:
            query = query.filter(JobApplication.status == status_filter)
        
        # Contar total antes da paginação
        total = query.count()
        
        # Aplicar paginação
        applications = query.order_by(JobApplication.created_at.desc()).offset(skip).limit(limit).all()
        
        # Formatar resposta com detalhes da vaga
        candidaturas = []
        for app in applications:
            from app.models.company import Company as CompanyModel
            
            job = app.job
            company = db.query(CompanyModel).filter(CompanyModel.id == job.company_id).first()
            
            candidatura = CandidaturaComDetalheVaga(
                id=app.id,
                status=app.status,
                cover_letter=app.cover_letter,
                created_at=app.created_at,
                updated_at=app.updated_at,
                # Detalhes da vaga
                job_id=job.id,
                job_title=job.title,
                job_description=job.description,
                job_location=job.location,
                job_remote=job.remote,
                job_type=job.job_type,
                salary_min=job.salary_min,
                salary_max=job.salary_max,
                # Detalhes da empresa
                company_id=company.id if company else None,
                company_name=company.name if company else "Desconhecida",
                company_logo=company.logo_url if company else None
            )
            candidaturas.append(candidatura)
        
        return candidaturas
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar candidaturas: {str(e)}"
        )


@router.get("/recomendacoes/para-mim", response_model=List[dict])
async def obter_recomendacoes_vagas(
    limit: int = Query(10, ge=1, le=50),
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Retorna vagas recomendadas com base no perfil do candidato
    
    **Acesso**: Apenas candidatos autenticados
    
    Análise:
    - Compara habilidades autoavaliadas do candidato com requisitos da vaga
    - Analisa compatibilidade de localização (remoto vs presencial)
    - Considera experiência profissional do candidato
    - Calcula score de compatibilidade (0-100)
    
    **Score**:
    - 50% peso em habilidades técnicas
    - 30% peso em localização
    - 20% peso em experiência
    
    Exemplo:
    GET /api/v1/jobs/recomendacoes/para-mim?limit=15
    """
    try:
        service = RecommendationService(db)
        recomendacoes = service.recomendar_vagas(candidate.id, limit=limit)
        
        return recomendacoes
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar recomendações: {str(e)}"
        )


@router.get("/recomendacoes/por-habilidade", response_model=List[dict])
async def obter_recomendacoes_por_habilidade(
    habilidade: Optional[str] = Query(None, description="Habilidade específica (ex: Python, React)"),
    limit: int = Query(10, ge=1, le=50),
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Retorna vagas recomendadas para uma habilidade específica
    
    **Acesso**: Apenas candidatos autenticados
    
    Se `habilidade` não for especificada, usa a melhor habilidade do candidato
    
    Exemplo:
    GET /api/v1/jobs/recomendacoes/por-habilidade?habilidade=Python&limit=10
    """
    try:
        service = RecommendationService(db)
        recomendacoes = service.recomendar_vagas_por_habilidade(
            candidate.id,
            habilidade=habilidade,
            limit=limit
        )
        
        return recomendacoes
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar recomendações: {str(e)}"
        )


# ============================================================================
# ROTAS DE EMPRESA (CRUD DE VAGAS)
# ============================================================================

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Cria nova vaga"""
    service = JobService(db)
    job = await service.create_job(current_company.id, job_data)
    return job


@router.get("/debug/todas", response_model=List[JobResponse])
async def debug_all_jobs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """[DEBUG] Lista TODAS as vagas do banco (sem filtro de autenticação)"""
    logger.info("Endpoint DEBUG: Listando TODAS as vagas")
    all_jobs = db.query(Job).order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    logger.info(f"Total de vagas no banco: {len(all_jobs)}")
    for job in all_jobs:
        logger.info(f"  Job: id={job.id}, company_id={job.company_id}, title={job.title}, status={job.status}")
    return all_jobs


@router.get("/debug/minha-empresa", response_model=dict)
async def debug_my_company(
    current_company: Company = Depends(get_current_company)
):
    """[DEBUG] Mostra qual é a empresa autenticada"""
    logger.info(f"DEBUG - Empresa autenticada: id={current_company.id}, user_id={current_company.user_id}")
    return {
        "company_id": current_company.id,
        "user_id": current_company.user_id,
        "razao_social": current_company.razao_social,
        "nome_fantasia": current_company.nome_fantasia,
        "cnpj": current_company.cnpj
    }


@router.get("/", response_model=List[JobResponse])
async def list_company_jobs(
    status_filter: Optional[JobStatus] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Lista vagas da empresa do usuário autenticado"""
    logger.info(f"Listando vagas para company_id: {current_company.id}")
    
    query = db.query(Job).filter(Job.company_id == current_company.id)
    
    if status_filter:
        query = query.filter(Job.status == status_filter)
    
    jobs = query.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    logger.info(f"Vagas encontradas: {len(jobs)}")
    return jobs


@router.get("/publicadas", response_model=List[JobResponse])
async def list_published_jobs(
    skip: int = 0,
    limit: int = 100,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Lista apenas vagas PUBLICADAS (status=aberta) da empresa autenticada"""
    logger.info(f"Listando vagas PUBLICADAS para company_id: {current_company.id}")
    
    jobs = db.query(Job).filter(
        Job.company_id == current_company.id,
        Job.status == JobStatus.ABERTA
    ).order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    
    logger.info(f"Vagas publicadas encontradas: {len(jobs)}")
    return jobs


# ============================================================================
# ROTAS PARAMETERIZADAS (DEVEM VIR SEMPRE POR ÚLTIMO)
# ============================================================================

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Retorna detalhes da vaga"""
    from app.models.candidato_teste import VagaCandidato
    from sqlalchemy import func
    
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_company.id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaga não encontrada"
        )
    
    # Contar convites enviados
    convites_enviados = db.query(func.count(VagaCandidato.id)).filter(
        VagaCandidato.vaga_id == job_id,
        VagaCandidato.empresa_demonstrou_interesse == True
    ).scalar() or 0
    
    # Contar convites aceitos
    convites_aceitos = db.query(func.count(VagaCandidato.id)).filter(
        VagaCandidato.vaga_id == job_id,
        VagaCandidato.empresa_demonstrou_interesse == True,
        VagaCandidato.consentimento_entrevista == True
    ).scalar() or 0
    
    # Adicionar os campos ao job
    job_dict = JobResponse.model_validate(job)
    job_dict.convites_enviados = convites_enviados
    job_dict.convites_aceitos = convites_aceitos
    
    return job_dict


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_update: JobUpdate,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Atualiza vaga"""
    service = JobService(db)
    job = await service.update_job(job_id, current_company.id, job_update)
    return job


@router.post("/{job_id}/publish", response_model=JobResponse)
async def publish_job(
    job_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Publica uma vaga"""
    service = JobService(db)
    job = await service.publish_job(job_id, current_company.id)
    return job


@router.post("/{job_id}/close", response_model=JobResponse)
async def close_job(
    job_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Encerra uma vaga"""
    service = JobService(db)
    job = await service.close_job(job_id, current_company.id)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Remove vaga"""
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.company_id == current_company.id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vaga não encontrada"
        )
    
    db.delete(job)
    db.commit()
    return None


@router.get("/{job_id}/metrics", response_model=JobMetrics)
async def get_job_metrics(
    job_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Retorna métricas da vaga"""
    service = JobService(db)
    metrics = await service.get_job_metrics(job_id, current_company.id)
    return metrics


@router.post("/{job_id}/candidatar", response_model=dict, status_code=status.HTTP_201_CREATED)
async def candidatar_para_vaga(
    job_id: int,
    cover_letter: Optional[str] = None,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Candidatar para uma vaga
    
    **Acesso**: Apenas candidatos autenticados
    
    **Parâmetros**:
    - job_id: ID da vaga
    - cover_letter (opcional): Carta de apresentação/motivação
    
    **Exemplo**:
    ```
    POST /api/v1/jobs/5/candidatar
    Authorization: Bearer <token_candidato>
    Content-Type: application/json
    
    {
      "cover_letter": "Sou muito interessado nessa posição porque..."
    }
    ```
    
    **Retorno**:
    - 201 Created: Candidatura realizada com sucesso
    - 400 Bad Request: Já candidatou para essa vaga
    - 404 Not Found: Vaga não encontrada
    """
    try:
        # Buscar vaga
        vaga = db.query(Job).filter(Job.id == job_id).first()
        
        if not vaga:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vaga não encontrada"
            )
        
        # Verificar se vaga está aberta
        if vaga.status != JobStatus.ABERTA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta vaga não está aberta para candidaturas"
            )
        
        # Verificar se já candidatou
        ja_candidatou = db.query(JobApplication).filter(
            JobApplication.job_id == job_id,
            JobApplication.candidate_id == candidate.id
        ).first()
        
        if ja_candidatou:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você já se candidatou para esta vaga"
            )
        
        # Criar candidatura
        candidatura = JobApplication(
            job_id=job_id,
            candidate_id=candidate.id,
            cover_letter=cover_letter,
            status=ApplicationStatus.EM_ANALISE
        )
        
        db.add(candidatura)
        
        # Incrementar contador de candidaturas da vaga
        vaga.applications_count = (vaga.applications_count or 0) + 1
        
        db.commit()
        db.refresh(candidatura)
        
        logger.info(f"Candidato {candidate.id} se candidatou para vaga {job_id}")
        
        return {
            "message": "Candidatura realizada com sucesso!",
            "application_id": candidatura.id,
            "job_id": vaga.id,
            "job_title": vaga.title,
            "status": candidatura.status.value,
            "created_at": candidatura.created_at.isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar candidatura: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao candidatar para a vaga"
        )


