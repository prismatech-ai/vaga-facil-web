"""
Endpoints de Pipeline de candidatos
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_company
from app.models.company import Company
from app.models.job import Job
from app.models.job_application import JobApplication, ApplicationStatus
from app.models.candidato_teste import VagaCandidato, StatusKanbanCandidato
from app.models.candidate import Candidate
from app.schemas.pipeline import (
    ApplicationResponse,
    PipelineUpdate,
    PipelineStats
)
from app.services.pipeline_service import PipelineService

router = APIRouter()


@router.get("/jobs/{job_id}/applications", response_model=List[ApplicationResponse])
async def get_job_applications(
    job_id: int,
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Lista candidaturas de uma vaga"""
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
    
    query = db.query(JobApplication).filter(JobApplication.job_id == job_id)
    
    if status_filter:
        query = query.filter(JobApplication.status == status_filter)
    
    applications = query.order_by(JobApplication.created_at.desc()).offset(skip).limit(limit).all()
    
    # Popular dados relacionados
    result = []
    for app in applications:
        app_dict = ApplicationResponse.model_validate(app).model_dump()
        if app.candidate:
            app_dict["candidate_name"] = app.candidate.full_name
            if app.candidate.user:
                app_dict["candidate_email"] = app.candidate.user.email
        if app.job:
            app_dict["job_title"] = app.job.title
        result.append(ApplicationResponse(**app_dict))
    
    return result


@router.get("/applications/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Retorna detalhes de uma candidatura"""
    application = db.query(JobApplication).join(Job).filter(
        JobApplication.id == application_id,
        Job.company_id == current_company.id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidatura não encontrada"
        )
    
    # Popular dados relacionados
    app_dict = ApplicationResponse.model_validate(application).model_dump()
    if application.candidate:
        app_dict["candidate_name"] = application.candidate.full_name
        if application.candidate.user:
            app_dict["candidate_email"] = application.candidate.user.email
    if application.job:
        app_dict["job_title"] = application.job.title
    
    return ApplicationResponse(**app_dict)


@router.patch("/applications/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: int,
    status_update: PipelineUpdate,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Atualiza status de uma candidatura no pipeline"""
    service = PipelineService(db)
    application = await service.update_application_status(
        application_id,
        current_company.id,
        status_update.status
    )
    return application


@router.get("/stats", response_model=PipelineStats)
async def get_pipeline_stats(
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Retorna estatísticas do pipeline da empresa"""
    service = PipelineService(db)
    stats = await service.get_company_pipeline_stats(current_company.id)
    return stats


@router.get("/jobs/{job_id}/stats", response_model=PipelineStats)
async def get_job_pipeline_stats(
    job_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Retorna estatísticas do pipeline de uma vaga específica"""
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
    
    service = PipelineService(db)
    stats = await service.get_job_pipeline_stats(job_id)
    return stats


@router.get("/jobs/{job_id}/candidaturas-detalhadas")
async def get_job_applications_detailed(
    job_id: int,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Retorna candidaturas de uma vaga com dados completos dos candidatos
    
    Retorna:
    - Quantidade total de candidaturas
    - Candidaturas agrupadas por status
    - Dados completos de cada candidato
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
    
    # Buscar todas as candidaturas da vaga
    applications = db.query(JobApplication).filter(
        JobApplication.job_id == job_id
    ).order_by(JobApplication.created_at.desc()).all()
    
    # Agrupar por status e formatar dados
    candidaturas_por_status = {}
    total_candidaturas = len(applications)
    
    for status_enum in ApplicationStatus:
        candidaturas_por_status[status_enum.value] = []
    
    for app in applications:
        candidato_info = {
            "candidatura_id": app.id,
            "status": app.status.value,
            "data_candidatura": app.created_at,
            "data_atualizacao": app.updated_at,
            "carta_apresentacao": app.cover_letter,
            "respostas_triagem": app.screening_answers,
            "candidato": {
                "id": app.candidate.id if app.candidate else None,
                "nome": app.candidate.full_name if app.candidate else None,
                "email": app.candidate.user.email if app.candidate and app.candidate.user else None,
                "telefone": app.candidate.phone if app.candidate else None,
                "cpf": app.candidate.cpf if app.candidate else None,
                "data_nascimento": app.candidate.birth_date if app.candidate else None,
                "genero": app.candidate.genero.value if app.candidate and app.candidate.genero else None,
                "estado_civil": app.candidate.estado_civil.value if app.candidate and app.candidate.estado_civil else None,
                "localizacao": {
                    "cidade": app.candidate.cidade if app.candidate else None,
                    "estado": app.candidate.estado if app.candidate else None,
                    "cep": app.candidate.cep if app.candidate else None
                } if app.candidate else None,
                "profissional": {
                    "resume_url": app.candidate.resume_url if app.candidate else None,
                    "linkedin_url": app.candidate.linkedin_url if app.candidate else None,
                    "portfolio_url": app.candidate.portfolio_url if app.candidate else None,
                    "bio": app.candidate.bio if app.candidate else None
                } if app.candidate else None
            }
        }
        
        candidaturas_por_status[app.status.value].append(candidato_info)
    
    # Calcular estatísticas por status
    estatisticas_status = {}
    for status_enum in ApplicationStatus:
        estatisticas_status[status_enum.value] = len(candidaturas_por_status[status_enum.value])
    
    return {
        "vaga_id": job_id,
        "vaga_titulo": job.title,
        "total_candidaturas": total_candidaturas,
        "estatisticas_por_status": estatisticas_status,
        "candidaturas_por_status": candidaturas_por_status,
        "candidaturas": [
            candidato_info
            for status_list in candidaturas_por_status.values()
            for candidato_info in status_list
        ]
    }


# ============================================================================
# ROTAS DE INTERESSE E AGENDAMENTO
# ============================================================================

@router.post("/candidato/{candidate_id}/indicar-interesse")
async def empresa_indicar_interesse(
    candidate_id: int,
    job_id: int = Query(..., description="ID da vaga"),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Empresa indica interesse em um candidato
    
    **Acesso**: Apenas empresas autenticadas
    
    Parâmetros:
    - candidate_id: ID do candidato
    - job_id: ID da vaga que a empresa está ofertando
    
    Exemplo:
    POST /api/v1/pipeline/candidato/42/indicar-interesse?job_id=10
    """
    from datetime import datetime
    
    try:
        # Verificar se a vaga pertence à empresa
        job = db.query(Job).filter(
            Job.id == job_id,
            Job.company_id == current_company.id
        ).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vaga não encontrada ou não pertence a sua empresa"
            )
        
        # Verificar se o candidato existe
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidato não encontrado"
            )
        
        # Verificar se já existe relacionamento
        vaga_candidato = db.query(VagaCandidato).filter(
            VagaCandidato.vaga_id == job_id,
            VagaCandidato.candidate_id == candidate_id
        ).first()
        
        if not vaga_candidato:
            vaga_candidato = VagaCandidato(
                vaga_id=job_id,
                candidate_id=candidate_id,
                status_kanban=StatusKanbanCandidato.INTERESSE_EMPRESA
            )
            db.add(vaga_candidato)
        
        # Marcar interesse
        vaga_candidato.empresa_demonstrou_interesse = True
        vaga_candidato.data_interesse = datetime.utcnow()
        vaga_candidato.status_kanban = StatusKanbanCandidato.INTERESSE_EMPRESA
        
        db.commit()
        db.refresh(vaga_candidato)
        
        return {
            "mensagem": "Interesse demonstrado com sucesso",
            "vaga_id": job_id,
            "candidate_id": candidate_id,
            "data_interesse": vaga_candidato.data_interesse
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao indicar interesse: {str(e)}"
        )


@router.post("/candidato-anonimo/{id_anonimo}/indicar-interesse")
async def empresa_indicar_interesse_anonimo(
    id_anonimo: str,
    job_id: int = Query(..., description="ID da vaga"),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Empresa indica interesse em um candidato anônimo
    
    **Acesso**: Apenas empresas autenticadas
    
    Parâmetros:
    - id_anonimo: ID anônimo do candidato (ex: CAND-1DDE1C25)
    - job_id: ID da vaga que a empresa está ofertando
    
    Exemplo:
    POST /api/v1/pipeline/candidato-anonimo/CAND-1DDE1C25/indicar-interesse?job_id=10
    """
    from app.utils.anonimizacao import anonimizar_candidato
    from datetime import datetime
    
    try:
        # Verificar se a vaga pertence à empresa
        job = db.query(Job).filter(
            Job.id == job_id,
            Job.company_id == current_company.id
        ).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vaga não encontrada ou não pertence a sua empresa"
            )
        
        # Buscar candidato pelo ID anônimo (comparando hashes)
        all_candidates = db.query(Candidate).all()
        candidate = None
        
        for c in all_candidates:
            if anonimizar_candidato(c).get("id_anonimo") == id_anonimo:
                candidate = c
                break
        
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidato anônimo '{id_anonimo}' não encontrado"
            )
        
        # Verificar se já existe relacionamento
        vaga_candidato = db.query(VagaCandidato).filter(
            VagaCandidato.vaga_id == job_id,
            VagaCandidato.candidate_id == candidate.id
        ).first()
        
        if not vaga_candidato:
            vaga_candidato = VagaCandidato(
                vaga_id=job_id,
                candidate_id=candidate.id,
                status_kanban=StatusKanbanCandidato.INTERESSE_EMPRESA
            )
            db.add(vaga_candidato)
        
        # Marcar interesse
        vaga_candidato.empresa_demonstrou_interesse = True
        vaga_candidato.data_interesse = datetime.utcnow()
        vaga_candidato.status_kanban = StatusKanbanCandidato.INTERESSE_EMPRESA
        
        db.commit()
        db.refresh(vaga_candidato)
        
        return {
            "mensagem": "Interesse demonstrado com sucesso",
            "id_anonimo": id_anonimo,
            "vaga_id": job_id,
            "candidate_id": candidate.id,
            "data_interesse": vaga_candidato.data_interesse
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao indicar interesse: {str(e)}"
        )


@router.post("/candidato/{candidate_id}/agendar-entrevista")
async def empresa_agendar_entrevista(
    candidate_id: int,
    job_id: int = Query(..., description="ID da vaga"),
    data_entrevista: str = Query(..., description="Data e hora da entrevista (ISO 8601, ex: 2026-01-15T14:30:00)"),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Empresa agenda data e horário da entrevista
    
    **Acesso**: Apenas empresas autenticadas
    
    Parâmetros:
    - candidate_id: ID do candidato
    - job_id: ID da vaga
    - data_entrevista: Data e hora no formato ISO 8601 (ex: 2026-01-15T14:30:00)
    
    Exemplo:
    POST /api/v1/pipeline/candidato/42/agendar-entrevista?job_id=10&data_entrevista=2026-01-15T14:30:00
    """
    from datetime import datetime
    
    try:
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
        
        # Buscar VagaCandidato
        vaga_candidato = db.query(VagaCandidato).filter(
            VagaCandidato.vaga_id == job_id,
            VagaCandidato.candidate_id == candidate_id
        ).first()
        
        if not vaga_candidato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Relacionamento candidato-vaga não encontrado"
            )
        
        # Parsear data
        try:
            data_entrevista_dt = datetime.fromisoformat(data_entrevista.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data inválida. Use formato ISO 8601 (ex: 2026-01-15T14:30:00)"
            )
        
        # Agendar entrevista
        vaga_candidato.data_entrevista = data_entrevista_dt
        vaga_candidato.entrevista_agendada = True
        
        db.commit()
        db.refresh(vaga_candidato)
        
        return {
            "mensagem": "Entrevista agendada com sucesso",
            "candidate_id": candidate_id,
            "job_id": job_id,
            "data_entrevista": vaga_candidato.data_entrevista
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao agendar entrevista: {str(e)}"
        )


@router.post("/candidato/{candidate_id}/marcar-contratacao")
async def empresa_marcar_contratacao(
    candidate_id: int,
    job_id: int = Query(..., description="ID da vaga"),
    foi_contratado: bool = Query(..., description="True se foi contratado, False se não foi"),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Empresa marca se o candidato foi contratado ou não
    
    **Acesso**: Apenas empresas autenticadas
    
    Parâmetros:
    - candidate_id: ID do candidato
    - job_id: ID da vaga
    - foi_contratado: true/false
    
    Exemplo:
    POST /api/v1/pipeline/candidato/42/marcar-contratacao?job_id=10&foi_contratado=true
    """
    from datetime import datetime
    
    try:
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
        
        # Buscar VagaCandidato
        vaga_candidato = db.query(VagaCandidato).filter(
            VagaCandidato.vaga_id == job_id,
            VagaCandidato.candidate_id == candidate_id
        ).first()
        
        if not vaga_candidato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Relacionamento candidato-vaga não encontrado"
            )
        
        # Buscar candidato
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidato não encontrado"
            )
        
        # Marcar resultado - SINCRONIZAR 3 TABELAS
        vaga_candidato.foi_contratado = foi_contratado
        vaga_candidato.data_resultado = datetime.utcnow()
        
        # Sincronizar candidates.contratado
        candidate.contratado = foi_contratado
        if foi_contratado:
            candidate.data_contratacao = datetime.utcnow()
            candidate.is_active = False  # Desativar perfil ao contratar
        
        # Sincronizar job_applications.status
        job_application = db.query(JobApplication).filter(
            JobApplication.candidate_id == candidate_id,
            JobApplication.job_id == job_id
        ).first()
        
        if job_application:
            if foi_contratado:
                job_application.status = ApplicationStatus.CONTRATADO
            else:
                job_application.status = ApplicationStatus.RECUSADO
            job_application.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(vaga_candidato)
        db.refresh(candidate)
        if job_application:
            db.refresh(job_application)
        
        resultado = "contratado" if foi_contratado else "não contratado"
        return {
            "mensagem": f"Candidato marcado como {resultado}",
            "candidate_id": candidate_id,
            "job_id": job_id,
            "foi_contratado": vaga_candidato.foi_contratado,
            "data_resultado": vaga_candidato.data_resultado,
            "candidate_is_active": candidate.is_active,
            "candidate_contratado": candidate.contratado,
            "job_application_status": job_application.status.value if job_application else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao marcar contratação: {str(e)}"
        )


@router.get("/meus-candidatos")
async def get_meus_candidatos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, description="Filtro por status: todos, pendente, em_progresso, finalizado"),
    job_id: Optional[int] = Query(None, description="Filtro por ID da vaga"),
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Retorna todos os candidatos da empresa com status de cada candidatura
    
    Agrupa por vaga e mostra o status de cada candidato
    """
    
    # Buscar todas as vagas da empresa
    vagas = db.query(Job).filter(Job.company_id == current_company.id).all()
    vaga_ids = [v.id for v in vagas]
    
    if not vaga_ids:
        return {
            "total": 0,
            "vagas": [],
            "candidatos_totais": 0
        }
    
    # Buscar relacionamento vaga-candidato com filtros
    query = db.query(VagaCandidato).filter(VagaCandidato.vaga_id.in_(vaga_ids))
    
    if job_id:
        query = query.filter(VagaCandidato.vaga_id == job_id)
    
    if status_filter and status_filter != "todos":
        # Mapear status
        status_map = {
            "pendente": False,
            "em_progresso": True,
            "finalizado": None
        }
        if status_filter in status_map:
            if status_filter == "finalizado":
                query = query.filter(VagaCandidato.foi_contratado != None)
            elif status_filter == "em_progresso":
                query = query.filter(VagaCandidato.empresa_demonstrou_interesse == True)
            else:
                query = query.filter(VagaCandidato.empresa_demonstrou_interesse == False)
    
    # Contar total e paginar
    total = query.count()
    vaga_candidatos = query.order_by(
        VagaCandidato.data_interesse.desc() if VagaCandidato.data_interesse else VagaCandidato.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    # Estruturar resposta agrupada por vaga
    vagas_dict = {}
    candidatos_list = []
    
    for vc in vaga_candidatos:
        vaga = vc.vaga if hasattr(vc, 'vaga') else None
        candidato = vc.candidate if hasattr(vc, 'candidate') else None
        
        if not vaga or not candidato:
            continue
        
        # Determinar status
        if vc.foi_contratado is True:
            status_candidatura = "contratado"
        elif vc.foi_contratado is False:
            status_candidatura = "rejeitado"
        elif vc.empresa_demonstrou_interesse:
            status_candidatura = "em_progresso"
        else:
            status_candidatura = "pendente"
        
        # Dados do candidato
        candidato_info = {
            "vaga_candidato_id": vc.id,
            "candidate_id": candidato.id,
            "vaga_id": vaga.id,
            "vaga_titulo": vaga.title,
            "candidate_nome": candidato.full_name,
            "status": status_candidatura,
            "empresa_demonstrou_interesse": vc.empresa_demonstrou_interesse,
            "data_interesse": vc.data_interesse,
            "entrevista_agendada": vc.entrevista_agendada,
            "data_entrevista": vc.data_entrevista,
            "foi_contratado": vc.foi_contratado,
            "data_resultado": vc.data_resultado,
            "created_at": vc.created_at
        }
        
        candidatos_list.append(candidato_info)
        
        # Agrupar por vaga
        if vaga.id not in vagas_dict:
            vagas_dict[vaga.id] = {
                "vaga_id": vaga.id,
                "vaga_titulo": vaga.title,
                "candidatos": []
            }
        
        vagas_dict[vaga.id]["candidatos"].append(candidato_info)
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "candidatos_totais": len(candidatos_list),
        "por_vaga": list(vagas_dict.values()),
        "candidatos": candidatos_list
    }
