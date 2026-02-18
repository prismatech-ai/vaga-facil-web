"""
Rotas para endpoints do candidato (onboarding, autoavaliação, testes)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.dependencies import get_db, get_current_user
from app.models import User, Candidate, AutoavaliacaoCompetencia, Competencia, CandidatoTeste, VagaCandidato, Company, Job, JobApplication
from app.models.job_application import ApplicationStatus
from app.schemas.competencia import AutoavaliacaoCompetenciaCreate, AutoavaliacaoCompetenciaResponse
from app.schemas.candidato_teste import StatusOnboardingResponse
from app.services.candidato_service import CandidatoService
from app.services.email_service import EmailService
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["candidato"])


class DefinirAreaRequest(BaseModel):
    """Request para definir área de atuação"""
    area: str


class AutoavaliacaoRequest(BaseModel):
    """Request para salvar autoavaliação"""
    competencias: List[dict]  # [{competencia_id, nivel_declarado}, ...]


class AceiteEntrevistaRequest(BaseModel):
    """Request para aceitar entrevista"""
    vaga_id: int


class ContrataçãoResponse(BaseModel):
    """Response com informações da contratação"""
    foi_contratado: bool
    vaga_id: Optional[int] = None
    vaga_titulo: Optional[str] = None
    vaga_descricao: Optional[str] = None
    empresa_id: Optional[int] = None
    empresa_nome: Optional[str] = None
    empresa_logo: Optional[str] = None
    data_contratacao: Optional[datetime] = None
    
    class Config:
        from_attributes = True


@router.get("/status", response_model=StatusOnboardingResponse)
async def obter_status_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém o status atual do onboarding e informações de contratação"""
    if current_user.user_type.value != "candidato":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para candidatos")
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    # Verificar status de autoavaliação
    autoavaliacao_concluida = db.query(AutoavaliacaoCompetencia).filter(
        AutoavaliacaoCompetencia.candidate_id == candidate.id
    ).count() > 0
    
    # Verificar status de testes
    testes_concluidos = db.query(CandidatoTeste).filter(
        CandidatoTeste.candidate_id == candidate.id,
        CandidatoTeste.status == "concluido"
    ).count() > 0
    
    # Buscar informações de contratação
    vaga_titulo = None
    empresa_nome = None
    empresa_logo = None
    data_contratacao = None
    
    if candidate.contratado:
        # Buscar candidatura com status CONTRATADO
        job_application = db.query(JobApplication).filter(
            JobApplication.candidate_id == candidate.id,
            JobApplication.status == ApplicationStatus.CONTRATADO
        ).first()
        
        if job_application:
            job = db.query(Job).filter(Job.id == job_application.job_id).first()
            company = db.query(Company).filter(Company.id == job.company_id).first()
            
            if job:
                vaga_titulo = job.title
            if company:
                empresa_nome = company.nome_fantasia or company.razao_social
                empresa_logo = company.logo_url
            
            data_contratacao = job_application.updated_at
    
    return StatusOnboardingResponse(
        status_onboarding=candidate.status_onboarding or "cadastro_inicial",
        percentual_completude=candidate.percentual_completude or 0,
        area_atuacao=candidate.area_atuacao if candidate.area_atuacao else None,
        autoavaliacao_concluida=autoavaliacao_concluida,
        testes_concluidos=testes_concluidos,
        onboarding_completo=candidate.onboarding_completo or False,
        is_active=candidate.is_active,
        contratado=candidate.contratado,
        data_contratacao=data_contratacao,
        vaga_titulo=vaga_titulo,
        empresa_nome=empresa_nome,
        empresa_logo=empresa_logo
    )


@router.post("/area-atuacao")
async def definir_area_atuacao(
    request: DefinirAreaRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Define a área de atuação do candidato"""
    if current_user.user_type.value != "candidato":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para candidatos")
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    try:
        CandidatoService.definir_area_atuacao(db, candidate.id, request.area)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {"mensagem": "Área de atuação definida com sucesso"}


@router.get("/competencias")
async def obter_competencias(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém as competências para a área selecionada"""
    if current_user.user_type.value != "candidato":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para candidatos")
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    if not candidate.area_atuacao:
        raise HTTPException(status_code=400, detail="Candidato deve definir área de atuação primeiro")
    
    try:
        competencias = CandidatoService.obter_competencias_por_area(db, candidate.area_atuacao)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {
        "total": len(competencias),
        "competencias": [
            {
                "id": c.id,
                "nome": c.nome,
                "descricao": c.descricao,
                "categoria": c.categoria,
                "area": c.area if isinstance(c.area, str) else c.area.value
            }
            for c in competencias
        ]
    }


@router.post("/autoavaliacao")
async def salvar_autoavaliacao(
    request: AutoavaliacaoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Salva a autoavaliação de competências"""
    if current_user.user_type.value != "candidato":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para candidatos")
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    try:
        CandidatoService.salvar_autoavaliacao(db, candidate.id, request.competencias)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Liberar testes
    CandidatoService.liberar_testes(db, candidate.id)
    
    return {"mensagem": "Autoavaliação salva com sucesso"}


@router.get("/vagas-disponiveis")
async def obter_vagas_disponiveis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retorna apenas a quantidade de vagas disponíveis para a área"""
    if current_user.user_type.value != "candidato":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para candidatos")
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    if not candidate.area_atuacao:
        return {"quantidade_vagas": 0, "mensagem": "Sem área de atuação selecionada"}
    
    quantidade = CandidatoService.contar_vagas_disponibles(db, candidate.id)
    
    return {
        "quantidade_vagas": quantidade,
        "area": candidate.area_atuacao.value,
        "mensagem": f"Existem {quantidade} vagas ativas na sua área"
    }


@router.post("/finalizar-onboarding")
async def finalizar_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Finaliza o onboarding do candidato"""
    if current_user.user_type.value != "candidato":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para candidatos")
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    if not CandidatoService.verificar_onboarding_completo(db, candidate.id):
        raise HTTPException(
            status_code=400, 
            detail="Onboarding incompleto. Complete autoavaliação e testes"
        )
    
    CandidatoService.finalizar_onboarding(db, candidate.id)
    
    return {"mensagem": "Onboarding finalizado com sucesso"}


@router.get("/perfil")
async def obter_perfil(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém o perfil completo do candidato (exceto dados protegidos)"""
    if current_user.user_type.value != "candidato":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para candidatos")
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    # Buscar autoavaliações
    autoavaliacoes = db.query(AutoavaliacaoCompetencia).filter(
        AutoavaliacaoCompetencia.candidate_id == candidate.id
    ).all()
    
    return {
        "id": candidate.id,
        "email": current_user.email,
        "full_name": candidate.full_name,
        "area_atuacao": candidate.area_atuacao.value if candidate.area_atuacao else None,
        "status_onboarding": candidate.status_onboarding or "cadastro_inicial",
        "onboarding_completo": candidate.onboarding_completo,
        "autoavaliacoes": [
            {
                "competencia_id": a.competencia_id,
                "nivel_declarado": a.nivel_declarado.value
            }
            for a in autoavaliacoes
        ]
    }


@router.post("/aceitar-entrevista/{vaga_id}")
async def aceitar_entrevista(
    vaga_id: int,
    request: AceiteEntrevistaRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Candidato aceita entrevista e libera dados pessoais"""
    if current_user.user_type.value != "candidato":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para candidatos")
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    # Buscar a vaga e a empresa
    vaga = db.query(Job).filter(Job.id == vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    empresa = db.query(Company).filter(Company.id == vaga.company_id).first()
    
    try:
        CandidatoService.aceitar_entrevista(db, candidate.id, vaga_id)
        
        # Enviar email para a empresa notificando aceitação
        if empresa:
            empresa_user = db.query(User).filter(User.id == empresa.user_id).first()
            if empresa_user:
                EmailService.enviar_resposta_candidato(
                    empresa_email=empresa_user.email,
                    empresa_nome=empresa.nome_fantasia or empresa.razao_social,
                    candidato_nome=candidate.full_name,
                    vaga_titulo=vaga.title,
                    resposta="aceito",
                    motivo=None
                )
        
        # Enviar email de confirmação para o candidato
        EmailService.enviar_email_notificacao(
            email=candidate.email,
            nome=candidate.full_name,
            assunto="Entrevista Aceita",
            mensagem="Sua aceitação foi registrada e a empresa foi notificada. Você receberá mais informações sobre a entrevista em breve.",
            tipo="sucesso"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {
        "mensagem": "Entrevista aceita com sucesso",
        "consentimento_registrado": True,
        "dados_pessoais_liberados": True
    }


@router.post("/recusar-entrevista/{vaga_id}")
async def recusar_entrevista(
    vaga_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Candidato recusa entrevista"""
    if current_user.user_type.value != "candidato":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para candidatos")
    
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    # Buscar vaga e empresa
    vaga = db.query(Job).filter(Job.id == vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    empresa = db.query(Company).filter(Company.id == vaga.company_id).first()
    
    # Buscar registro VagaCandidato
    vaga_candidato = db.query(VagaCandidato).filter(
        VagaCandidato.vaga_id == vaga_id,
        VagaCandidato.candidate_id == candidate.id
    ).first()
    
    if not vaga_candidato:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    
    # Marcar como excluído por filtros (ou criar campo recusado)
    vaga_candidato.excluido_por_filtros = True
    db.commit()
    
    # Enviar email para a empresa notificando recusa
    if empresa:
        empresa_user = db.query(User).filter(User.id == empresa.user_id).first()
        if empresa_user:
            EmailService.enviar_resposta_candidato(
                empresa_email=empresa_user.email,
                empresa_nome=empresa.nome_fantasia or empresa.razao_social,
                candidato_nome=candidate.full_name,
                vaga_titulo=vaga.title,
                resposta="recusado",
                motivo="Candidato recusou o convite"
            )
    
    # Enviar email de confirmação para o candidato
    EmailService.enviar_email_notificacao(
        email=candidate.email,
        nome=candidate.full_name,
        assunto="Convite Recusado",
        mensagem="Sua recusa foi registrada. A empresa foi notificada. Você pode continuar explorando outras oportunidades.",
        tipo="info"
    )
    
    return {
        "mensagem": "Entrevista recusada com sucesso",
        "status": "recusado"
    }

# ============================================================================
# ROTAS DE INTERESSAMENTO DA EMPRESA
# ============================================================================

@router.get("/vagas-sugeridas")
async def obter_vagas_sugeridas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Candidato visualiza as vagas que empresas demonstraram interesse
    
    **Acesso**: Apenas candidatos autenticados
    
    Retorna as vagas com as seguintes informações:
    - Dados da vaga
    - Empresa interessada
    - Data do interesse
    - Se entrevista foi agendada
    - Data da entrevista (se agendada)
    - Resultado final (se disponível)
    """
    if current_user.user_type.value != "candidato":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para candidatos"
        )
    
    try:
        candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidato não encontrado")
        
        # Buscar todas as vagas onde a empresa demonstrou interesse
        from app.models.job import Job
        from app.models.company import Company
        
        vagas_sugeridas = db.query(VagaCandidato).filter(
            VagaCandidato.candidate_id == candidate.id,
            VagaCandidato.empresa_demonstrou_interesse == True
        ).all()
        
        resultado = []
        for vaga_candidato in vagas_sugeridas:
            vaga = vaga_candidato.vaga
            empresa = vaga.company
            
            # Determinar o status do resultado
            if vaga_candidato.foi_contratado is True:
                status_resultado = "✅ Contratado"
            elif vaga_candidato.foi_contratado is False:
                status_resultado = "❌ Não foi selecionado"
            elif vaga_candidato.entrevista_agendada is True and vaga_candidato.foi_contratado is None:
                status_resultado = "⏳ Aguardando resultado"
            else:
                status_resultado = "⊝ Ainda não há resultado"
            
            resultado.append({
                "vaga_id": vaga.id,
                "titulo_vaga": vaga.title,
                "descricao": vaga.description,
                "area_atuacao": vaga.area_atuacao,
                "localizacao": vaga.location,
                "remoto": vaga.remote,
                "tipo_contratacao": vaga.job_type,
                "salario_minimo": float(vaga.salary_min) if vaga.salary_min else None,
                "salario_maximo": float(vaga.salary_max) if vaga.salary_max else None,
                "moeda": vaga.salary_currency,
                "empresa": {
                    "id": empresa.id,
                    "nome": empresa.nome_fantasia or empresa.razao_social,
                    "logo_url": empresa.logo_url
                },
                "interesse": {
                    "data_interesse": vaga_candidato.data_interesse,
                    "status": vaga_candidato.status_kanban.value if vaga_candidato.status_kanban else None
                },
                "entrevista": {
                    "agendada": vaga_candidato.entrevista_agendada,
                    "data": vaga_candidato.data_entrevista if vaga_candidato.entrevista_agendada else None
                },
                "resultado_final": {
                    "foi_contratado": vaga_candidato.foi_contratado,
                    "data_resultado": vaga_candidato.data_resultado if vaga_candidato.foi_contratado is not None else None,
                    "status": status_resultado
                }
            })
        
        return {
            "total": len(resultado),
            "vagas_sugeridas": resultado
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar vagas sugeridas: {str(e)}"
        )


@router.post("/aceitar-interesse")
async def candidato_aceitar_interesse(
    vaga_id: int = None,
    job_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Candidato aceita o interesse da empresa
    
    **Acesso**: Apenas candidatos autenticados
    
    Parâmetros:
    - vaga_id OU job_id: ID da vaga que o candidato quer aceitar
    
    Exemplo:
    POST /api/v1/candidato/aceitar-interesse?vaga_id=10
    """
    if current_user.user_type.value != "candidato":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para candidatos"
        )
    
    # Aceita tanto vaga_id quanto job_id como sinônimos
    vaga_id_final = vaga_id or job_id
    if not vaga_id_final:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parâmetro 'vaga_id' ou 'job_id' é obrigatório"
        )
    
    try:
        candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidato não encontrado")
        
        # Buscar VagaCandidato
        vaga_candidato = db.query(VagaCandidato).filter(
            VagaCandidato.vaga_id == vaga_id_final,
            VagaCandidato.candidate_id == candidate.id
        ).first()
        
        if not vaga_candidato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vaga sugerida não encontrada"
            )
        
        if not vaga_candidato.empresa_demonstrou_interesse:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empresa ainda não demonstrou interesse nesta vaga"
            )
        
        # Registrar aceite
        vaga_candidato.consentimento_entrevista = True
        vaga_candidato.data_consentimento = datetime.utcnow()
        vaga_candidato.dados_pessoais_liberados = True
        
        from app.models.candidato_teste import StatusKanbanCandidato
        vaga_candidato.status_kanban = StatusKanbanCandidato.ENTREVISTA_ACEITA
        
        db.commit()
        db.refresh(vaga_candidato)
        
        return {
            "mensagem": "Interesse aceito com sucesso",
            "vaga_id": vaga_id_final,
            "data_aceite": vaga_candidato.data_consentimento,
            "dados_liberados": True
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao aceitar interesse: {str(e)}"
        )


@router.post("/rejeitar-interesse")
async def candidato_rejeitar_interesse(
    vaga_id: int = None,
    job_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Candidato rejeita o interesse da empresa
    
    **Acesso**: Apenas candidatos autenticados
    
    Parâmetros:
    - vaga_id OU job_id: ID da vaga que o candidato quer rejeitar
    
    Exemplo:
    POST /api/v1/candidato/rejeitar-interesse?vaga_id=10
    """
    if current_user.user_type.value != "candidato":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para candidatos"
        )
    
    vaga_id_final = vaga_id or job_id
    if not vaga_id_final:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parâmetro 'vaga_id' ou 'job_id' é obrigatório"
        )
    
    try:
        candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidato não encontrado")
        
        # Buscar VagaCandidato
        vaga_candidato = db.query(VagaCandidato).filter(
            VagaCandidato.vaga_id == vaga_id_final,
            VagaCandidato.candidate_id == candidate.id
        ).first()
        
        if not vaga_candidato:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vaga sugerida não encontrada"
            )
        
        # Rejeitar interesse
        from app.models.candidato_teste import StatusKanbanCandidato
        vaga_candidato.status_kanban = StatusKanbanCandidato.REJEITADO
        vaga_candidato.consentimento_entrevista = False
        vaga_candidato.dados_pessoais_liberados = False
        
        db.commit()
        
        return {
            "mensagem": "Interesse rejeitado com sucesso",
            "vaga_id": vaga_id_final
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao rejeitar interesse: {str(e)}"
        )


@router.get("/contratacao", response_model=ContrataçãoResponse)
async def obter_vaga_contratacao(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém informações da vaga e empresa onde o candidato foi contratado"""
    if current_user.user_type.value != "candidato":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para candidatos")
    
    # Buscar candidato
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    # Buscar candidatura com status CONTRATADO
    job_application = db.query(JobApplication).filter(
        JobApplication.candidate_id == candidate.id,
        JobApplication.status == ApplicationStatus.CONTRATADO
    ).first()
    
    if not job_application:
        # Retornar resposta indicando que não foi contratado, sem erro
        return ContrataçãoResponse(
            foi_contratado=False
        )
    
    # Buscar informações da vaga e empresa
    job = db.query(Job).filter(Job.id == job_application.job_id).first()
    company = db.query(Company).filter(Company.id == job.company_id).first()
    
    return ContrataçãoResponse(
        foi_contratado=True,
        vaga_id=job.id,
        vaga_titulo=job.title,
        vaga_descricao=job.description,
        empresa_id=company.id,
        empresa_nome=company.nome_fantasia or company.razao_social,
        empresa_logo=company.logo_url,
        data_contratacao=job_application.updated_at
    )