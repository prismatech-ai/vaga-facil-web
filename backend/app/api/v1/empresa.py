"""
Rotas para endpoints da empresa (vagas, matching, kanban)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_current_user
from app.models import User, Company, Job, VagaCandidato, Candidate, Competencia
from app.schemas.vaga import VagaCreate, VagaResponse, ListaVagas, VagaUpdate
from app.schemas.competencia import CompetenciaResponse, CompetenciaSelectResponse
from app.services.empresa_service import EmpresaService
from app.services.email_service import EmailService
from app.models.competencia import AreaAtuacao
from pydantic import BaseModel

router = APIRouter(prefix="/empresa", tags=["empresa"])
router_plural = APIRouter(prefix="/empresas", tags=["empresas"])


class DemonstraInteresseRequest(BaseModel):
    """Request para demonstrar interesse em candidato"""
    candidate_id: int


@router.post("/vagas")
async def criar_vaga(
    vaga_data: VagaCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cria uma nova vaga com filtros técnicos obrigatórios"""
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Validar que tem requisitos
    if not vaga_data.requisitos or len(vaga_data.requisitos) == 0:
        raise HTTPException(status_code=400, detail="Vaga deve ter pelo menos um requisito técnico")
    
    # Criar vaga
    nova_vaga = Job(
        company_id=company.id,
        title=vaga_data.title,
        description=vaga_data.description,
        area_atuacao=vaga_data.area_atuacao,
        requirements=vaga_data.requirements,
        benefits=vaga_data.benefits,
        location=vaga_data.location,
        remote=vaga_data.remote,
        job_type=vaga_data.job_type,
        salary_min=vaga_data.salary_min,
        salary_max=vaga_data.salary_max,
        status="rascunho"
    )
    db.add(nova_vaga)
    db.flush()  # Para obter o ID
    
    # Adicionar requisitos
    from app.models.vaga_requisito import VagaRequisito
    for req in vaga_data.requisitos:
        requisito = VagaRequisito(
            vaga_id=nova_vaga.id,
            competencia_id=req.competencia_id,
            nivel_minimo=req.nivel_minimo,
            teste_obrigatorio=req.teste_obrigatorio or 0
        )
        db.add(requisito)
    
    db.commit()
    
    return {
        "id": nova_vaga.id,
        "titulo": nova_vaga.title,
        "status": nova_vaga.status,
        "mensagem": "Vaga criada com sucesso"
    }


@router.post("/vagas/{vaga_id}/publicar")
async def publicar_vaga(
    vaga_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publica uma vaga"""
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    vaga = db.query(Job).filter(
        Job.id == vaga_id,
        Job.company_id == company.id
    ).first()
    
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    from datetime import datetime
    vaga.status = "aberta"
    vaga.published_at = datetime.utcnow()
    db.commit()
    
    return {"mensagem": "Vaga publicada com sucesso"}


@router.get("/vagas")
async def listar_vagas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista todas as vagas da empresa"""
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    vagas = db.query(Job).filter(Job.company_id == company.id).all()
    
    return {
        "total": len(vagas),
        "vagas": [
            {
                "id": v.id,
                "titulo": v.title,
                "area": v.area_atuacao.value,
                "status": v.status,
                "candidatos_totais": db.query(VagaCandidato).filter(
                    VagaCandidato.vaga_id == v.id
                ).count(),
                "criada_em": v.created_at.isoformat()
            }
            for v in vagas
        ]
    }


@router.get("/vagas/{vaga_id}/candidatos")
async def obter_candidatos_vaga(
    vaga_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém lista de candidatos para uma vaga (anônimos)"""
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    vaga = db.query(Job).filter(
        Job.id == vaga_id,
        Job.company_id == company.id
    ).first()
    
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    try:
        # Usar matching prioritizado v2 (1º BD CC, 2º BD CA)
        candidatos, excluidos = EmpresaService.obter_candidatos_para_vaga_v2(db, vaga_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Separar candidatos por tipo de match para melhor visualização
    certificados = [c for c in candidatos if c.get('tipo_match', '').startswith('1º')]
    autoavaliados = [c for c in candidatos if c.get('tipo_match', '').startswith('2º')]
    
    return {
        "vaga_id": vaga_id,
        "vaga_titulo": vaga.title,
        "total_candidatos": len(candidatos),
        "candidatos_excluidos": excluidos,
        "resumo_matching": {
            "certificados": len(certificados),
            "autoavaliados": len(autoavaliados),
            "descricao": "Candidatos certificados (1º Match) aparecem primeiro por serem mais confiáveis"
        },
        "candidatos": candidatos
    }


@router.get("/vagas/{vaga_id}/matching")
async def obter_matching_detalhado(
    vaga_id: int,
    apenas_certificados: bool = False,
    apenas_autoavaliados: bool = False,
    score_minimo: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtém matching detalhado de candidatos para uma vaga.
    
    Fluxo de matching:
    - 1º Match (BD CC): Candidatos com CERTIFICAÇÕES (mais confiável)
    - 2º Match (BD CA): Candidatos apenas com AUTOAVALIAÇÃO (menos confiável)
    
    Parâmetros de filtro:
    - apenas_certificados: Retorna apenas candidatos do 1º Match
    - apenas_autoavaliados: Retorna apenas candidatos do 2º Match
    - score_minimo: Filtra candidatos com score >= valor
    """
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    vaga = db.query(Job).filter(
        Job.id == vaga_id,
        Job.company_id == company.id
    ).first()
    
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    try:
        candidatos, excluidos = EmpresaService.obter_candidatos_para_vaga_v2(db, vaga_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Aplicar filtros
    if apenas_certificados:
        candidatos = [c for c in candidatos if c.get('tipo_match', '').startswith('1º')]
    elif apenas_autoavaliados:
        candidatos = [c for c in candidatos if c.get('tipo_match', '').startswith('2º')]
    
    if score_minimo > 0:
        candidatos = [c for c in candidatos if c.get('score_total', 0) >= score_minimo]
    
    # Separar por tipo
    certificados = [c for c in candidatos if c.get('tipo_match', '').startswith('1º')]
    autoavaliados = [c for c in candidatos if c.get('tipo_match', '').startswith('2º')]
    
    return {
        "vaga_id": vaga_id,
        "vaga_titulo": vaga.title,
        "fluxo_matching": {
            "etapa_1": {
                "nome": "1º Match - BD CC (Certificações)",
                "descricao": "Candidatos com certificações comprovadas na plataforma",
                "confiabilidade": "Alta",
                "total": len(certificados)
            },
            "etapa_2": {
                "nome": "2º Match - BD CA (Autoavaliação)",
                "descricao": "Candidatos com competências autodeclaradas",
                "confiabilidade": "Média",
                "total": len(autoavaliados)
            }
        },
        "filtros_aplicados": {
            "apenas_certificados": apenas_certificados,
            "apenas_autoavaliados": apenas_autoavaliados,
            "score_minimo": score_minimo
        },
        "resumo": {
            "total_candidatos": len(candidatos),
            "candidatos_excluidos_requisitos": excluidos,
            "certificados": len(certificados),
            "autoavaliados": len(autoavaliados)
        },
        "candidatos": candidatos
    }


@router.get("/vagas/{vaga_id}/kanban")
async def obter_kanban_vaga(
    vaga_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém o kanban de uma vaga com candidatos por coluna"""
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    vaga = db.query(Job).filter(
        Job.id == vaga_id,
        Job.company_id == company.id
    ).first()
    
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    try:
        kanban = EmpresaService.obter_kanban_vaga(db, vaga_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return kanban


@router.post("/vagas/{vaga_id}/candidatos/{candidate_id}/interesse")
async def demonstrar_interesse(
    vaga_id: int,
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Empresa demonstra interesse em um candidato"""
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    vaga = db.query(Job).filter(
        Job.id == vaga_id,
        Job.company_id == company.id
    ).first()
    
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    # Buscar dados do candidato
    candidato = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    try:
        EmpresaService.demonstrar_interesse(db, vaga_id, candidate_id)
        
        # Enviar email de convite ao candidato
        link_resposta = f"https://vagafacil.com/candidato/convites/{vaga_id}"
        EmailService.enviar_convite_entrevista(
            candidato_email=candidato.email,
            candidato_nome=candidato.full_name,
            empresa_nome=company.nome_fantasia or company.razao_social,
            vaga_titulo=vaga.title,
            link_resposta=link_resposta
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {"mensagem": "Interesse demonstrado. Candidato será notificado por email"}


@router.get("/vagas/{vaga_id}/candidatos/{candidate_id}")
async def obter_dados_candidato(
    vaga_id: int,
    candidate_id: str = Path(..., description="ID do candidato (inteiro ou formato CAND-XXXXX)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna dados do candidato apenas se consentimento foi concedido.
    Sem consentimento, retorna apenas dados técnicos anônimos.
    
    Suporta:
    - candidate_id como inteiro (ID direto)
    - candidate_id como string (ID anônimo CAND-XXXXX)
    """
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    vaga = db.query(Job).filter(
        Job.id == vaga_id,
        Job.company_id == company.id
    ).first()
    
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    # Converter candidate_id para inteiro
    candidate_id_int = None
    try:
        candidate_id_int = int(candidate_id)
    except ValueError:
        # É um ID anônimo (CAND-XXXXX), precisa buscar na tabela VagaCandidato
        from app.models.candidato_teste import VagaCandidato
        from app.services.candidato_service import anonimizar_candidato
        
        # Buscar VagaCandidato com esse candidate_id anônimo
        # Primeiro, buscar todos os candidatos e encontrar o que gera esse ID anônimo
        vaga_candidato = db.query(VagaCandidato).filter(
            VagaCandidato.vaga_id == vaga_id
        ).all()
        
        for vc in vaga_candidato:
            candidate = vc.candidate
            if candidate:
                # Gerar ID anônimo desse candidato
                id_anonimo = anonimizar_candidato(candidate).get("id_anonimo")
                if id_anonimo == candidate_id:
                    candidate_id_int = candidate.id
                    break
        
        if not candidate_id_int:
            raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    # Obter dados (com proteção de privacidade)
    dados = EmpresaService.obter_dados_candidato(db, vaga_id, candidate_id_int)
    
    if not dados:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    if "erro" in dados:
        raise HTTPException(status_code=403, detail=dados["mensagem"])
    
    return dados

@router.get("/convites/{vaga_id}")
async def obter_convites_vaga(
    vaga_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna lista de convites enviados para uma vaga
    
    **Acesso**: Apenas empresas autenticadas (que possuem a vaga)
    
    Retorna:
    - Total de convites enviados
    - Lista de convites com status, datas e dados do candidato
    """
    if not current_user or current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=403, detail="Empresa não encontrada para este usuário")
    
    # Verificar se a vaga pertence à empresa
    vaga = db.query(Job).filter(
        Job.id == vaga_id,
        Job.company_id == company.id
    ).first()
    
    if not vaga:
        raise HTTPException(status_code=403, detail="Vaga não encontrada ou não pertence à sua empresa")
    
    # Buscar todos os VagaCandidato onde empresa demonstrou interesse
    from app.models.candidato_teste import VagaCandidato
    
    convites = db.query(VagaCandidato).filter(
        VagaCandidato.vaga_id == vaga_id,
        VagaCandidato.empresa_demonstrou_interesse == True
    ).all()
    
    # Montar lista de convites
    convites_lista = []
    for convite in convites:
        convites_lista.append({
            "vaga_id": vaga_id,
            "candidate_id": convite.candidate_id,
            "status": convite.status_kanban.value if convite.status_kanban else "pendente",
            "data_interesse": convite.data_interesse,
            "consentimento_concedido": convite.consentimento_entrevista,
            "data_consentimento": convite.data_consentimento if convite.consentimento_entrevista else None,
            "dados_liberados": convite.dados_pessoais_liberados,
            "entrevista_agendada": convite.entrevista_agendada,
            "data_entrevista": convite.data_entrevista if convite.entrevista_agendada else None,
            "resultado_final": {
                "foi_contratado": convite.foi_contratado,
                "data_resultado": convite.data_resultado if convite.foi_contratado is not None else None
            }
        })
    
    return {
        "vaga_id": vaga_id,
        "vaga_titulo": vaga.title,
        "total_convites": len(convites_lista),
        "convites": convites_lista
    }


@router.get("/dashboard")
async def get_empresa_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna dados do dashboard da empresa
    
    **Acesso**: Apenas usuários do tipo empresa
    
    Retorna:
    - Total de vagas
    - Vagas abertas
    - Total de candidatos com interesse da empresa
    - Convites enviados
    - Convites aceitos
    - Total de visualizações
    - Pipeline de candidatos
    """
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    from app.services.dashboard_service import DashboardService
    service = DashboardService(db)
    dashboard_data = await service.get_company_dashboard(company.id)
    
    return dashboard_data


# Rotas alternativas com prefixo plural /empresas
@router_plural.get("/dashboard")
async def get_empresas_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rota alternativa plural: GET /api/v1/empresas/dashboard
    Mesmo comportamento que /api/v1/empresa/dashboard
    """
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    from app.services.dashboard_service import DashboardService
    service = DashboardService(db)
    dashboard_data = await service.get_company_dashboard(company.id)
    
    return dashboard_data


@router_plural.get("/convites/{vaga_id}")
async def get_empresas_convites(
    vaga_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rota alternativa plural: GET /api/v1/empresas/convites/{vaga_id}
    Mesmo comportamento que /api/v1/empresa/convites/{vaga_id}
    """
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Verificar se a vaga pertence à empresa
    vaga = db.query(Job).filter(
        Job.id == vaga_id,
        Job.company_id == company.id
    ).first()
    
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    # Buscar todos os VagaCandidato onde empresa demonstrou interesse
    from app.models.candidato_teste import VagaCandidato
    
    convites = db.query(VagaCandidato).filter(
        VagaCandidato.vaga_id == vaga_id,
        VagaCandidato.empresa_demonstrou_interesse == True
    ).all()
    
    # Montar lista de convites
    convites_lista = []
    for convite in convites:
        convites_lista.append({
            "vaga_id": vaga_id,
            "candidate_id": convite.candidate_id,
            "status": convite.status_kanban.value if convite.status_kanban else "pendente",
            "data_interesse": convite.data_interesse,
            "consentimento_concedido": convite.consentimento_entrevista,
            "data_consentimento": convite.data_consentimento if convite.consentimento_entrevista else None,
            "dados_liberados": convite.dados_pessoais_liberados,
            "entrevista_agendada": convite.entrevista_agendada,
            "data_entrevista": convite.data_entrevista if convite.entrevista_agendada else None,
            "resultado_final": {
                "foi_contratado": convite.foi_contratado,
                "data_resultado": convite.data_resultado if convite.foi_contratado is not None else None
            }
        })
    
    return {
        "vaga_id": vaga_id,
        "vaga_titulo": vaga.title,
        "total_convites": len(convites_lista),
        "convites": convites_lista
    }


@router.get("/competencias", response_model=List[CompetenciaSelectResponse])
async def listar_competencias_empresa(
    area: str = None,
    categoria: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista competências para popular select/dropdown no formulário de criação de vagas
    
    **Acesso**: Apenas usuários do tipo empresa
    
    **Filtros opcionais**:
    - area: Filtra por área de atuação (ex: automacao, eletrica)
    - categoria: Filtra por categoria (ex: tecnica, soft)
    
    **Exemplo**:
    - GET /api/v1/empresa/competencias
    - GET /api/v1/empresa/competencias?area=eletrica
    - GET /api/v1/empresa/competencias?area=automacao&categoria=tecnica
    """
    if current_user.user_type.value != "empresa":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para empresas")
    
    query = db.query(Competencia)
    
    if area:
        try:
            area_enum = AreaAtuacao(area.lower())
            query = query.filter(Competencia.area == area_enum.value)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Área inválida: {area}"
            )
    
    if categoria:
        query = query.filter(Competencia.categoria == categoria)
    
    competencias = query.order_by(Competencia.nome).all()
    
    result = []
    for c in competencias:
        try:
            area_enum = AreaAtuacao(c.area)
        except ValueError:
            continue
        
        result.append(CompetenciaSelectResponse(
            id=c.id,
            nome=c.nome,
            descricao=c.descricao,
            categoria=c.categoria,
            area=area_enum
        ))
    
    return result

