"""
Endpoints para onboarding e perfil do candidato
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Request
from sqlalchemy.orm import Session, attributes
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import logging

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_candidate
from app.models.user import User, UserType
from app.models.candidate import Candidate, Genero as GeneroModel, EstadoCivil as EstadoCivilModel, TipoPCD
from app.models.test import Test, Alternative, CandidateTestResult
from app.models.formacao_academica import FormacaoAcademica as FormacaoAcademicaModel
from app.models.experiencia_profissional import ExperienciaProfissional as ExperienciaProfissionalModel
from app.models.trabalho_temporario import TrabalhoTemporario as TrabalhoTemporarioModel
from app.services.file_service import FileService
from app.schemas.onboarding import (
    DadosPessoaisUpdate,
    DadosProfissionaisUpdate,
    ResultadoTesteHabilidade,
    CandidatoOnboardingResponse,
    ProgressoOnboarding,
    HabilidadeAutoAvaliacao,
    FormacaoAcademica,
    FormacaoAcademicaRequest,
    ExperienciaProfissional,
    ExperienciaProfissionalRequest,
    CandidatoPerfilUpdate,
    CandidatoPerfilCreate,
    CandidatoPerfilResponse,
)
from app.schemas.trabalho_temporario import TrabalhoTemporarioRequest, TrabalhoTemporarioResponse
from app.api.v1.endpoints.candidate_tests import SubmissaoTeste

# Importante: o prefix aqui deve ser apenas "/candidates" porque
# o api_router já é montado com prefix "/api/v1" em app.main
router = APIRouter(prefix="/candidates", tags=["onboarding", "perfil"])
logger = logging.getLogger(__name__)


@router.post("/create-profile", response_model=CandidatoPerfilResponse, status_code=status.HTTP_201_CREATED)
async def create_candidate_profile(
    payload: CandidatoPerfilCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cria o perfil de candidato para o usuário logado quando ainda não existir.

    Requisitos:
    - Usuário deve ser do tipo "candidato"
    - `cpf` (11 dígitos) e `full_name` obrigatórios
    """
    if current_user.user_type != UserType.candidato:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas candidatos podem criar perfil de candidato",
        )

    existing = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Perfil de candidato já existe",
        )

    # Validar CPF simples: 11 dígitos
    cpf_clean = "".join(ch for ch in (payload.cpf or "") if ch.isdigit())
    if len(cpf_clean) != 11:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="CPF inválido. Deve conter 11 dígitos",
        )

    # Garantir unicidade do CPF
    cpf_conflict = db.query(Candidate).filter(Candidate.cpf == cpf_clean).first()
    if cpf_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="CPF já cadastrado para outro candidato",
        )

    # Converter valores opcionais
    genero_val = GeneroModel(payload.genero.value) if payload.genero else None
    estado_civil_val = EstadoCivilModel(payload.estado_civil.value) if payload.estado_civil else None

    birth_date_val = None
    if payload.birth_date:
        try:
            birth_date_val = datetime.strptime(payload.birth_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Data de nascimento inválida. Use formato YYYY-MM-DD",
            )

    candidate = Candidate(
        user_id=current_user.id,
        cpf=cpf_clean,
        full_name=payload.full_name,
        phone=payload.phone,
        rg=payload.rg,
        birth_date=birth_date_val,
        genero=genero_val,
        estado_civil=estado_civil_val,
        location=payload.location,
        cep=payload.cep,
        logradouro=payload.logradouro,
        numero=payload.numero,
        complemento=payload.complemento,
        bairro=payload.bairro,
        cidade=payload.cidade,
        estado=payload.estado,
        percentual_completude=0,
        onboarding_completo=False,
    )

    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    return CandidatoPerfilResponse(
        id=candidate.id,
        cpf=candidate.cpf,
        full_name=candidate.full_name,
        email=current_user.email,
        phone=candidate.phone,
        rg=candidate.rg,
        birth_date=str(candidate.birth_date) if candidate.birth_date else None,
        genero=candidate.genero.value if candidate.genero else None,
        estado_civil=candidate.estado_civil.value if candidate.estado_civil else None,
        location=candidate.location,
        cep=candidate.cep,
        logradouro=candidate.logradouro,
        numero=candidate.numero,
        complemento=candidate.complemento,
        bairro=candidate.bairro,
        cidade=candidate.cidade,
        estado=candidate.estado,
        is_pcd=candidate.is_pcd or False,
        tipo_pcd=candidate.tipo_pcd.value if candidate.tipo_pcd else None,
        necessidades_adaptacao=candidate.necessidades_adaptacao,
        resume_url=candidate.resume_url,
        linkedin_url=candidate.linkedin_url,
        portfolio_url=candidate.portfolio_url,
        bio=candidate.bio,
        onboarding_completo=candidate.onboarding_completo or False,
        percentual_completude=candidate.percentual_completude or 0,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


def calculate_progress(candidate: Candidate, db: Session = None) -> int:
    """
    Calcula percentual de completude do onboarding baseado apenas em 2 categorias.
    
    Progresso:
    - 50%: Dados Pessoais Básicos (cep, logradouro, numero, bairro, cidade, estado)
    - 50%: Dados Profissionais (formacao_escolaridade ou formacoes_academicas + experiencia_profissional ou experiencias_profissionais)
    
    Nota: PCD é opcional e não afeta o progresso
    Total: 100%
    """
    progress = 0
    
    # 1. Dados Pessoais Básicos (50%)
    if candidate.cep and candidate.logradouro and candidate.numero and candidate.bairro and candidate.cidade and candidate.estado:
        progress += 50
    
    # 2. Dados Profissionais (50%)
    # Verifica EDUCAÇÃO: campo texto OU registros na tabela formacoes_academicas
    has_education = False
    try:
        if candidate.formacao_escolaridade and isinstance(candidate.formacao_escolaridade, str) and len(candidate.formacao_escolaridade.strip()) > 0:
            has_education = True
        elif db:
            formacoes_count = db.query(FormacaoAcademicaModel).filter(
                FormacaoAcademicaModel.candidate_id == candidate.id
            ).count()
            has_education = formacoes_count > 0
    except:
        has_education = False
    
    # Verifica EXPERIÊNCIA: campo texto OU registros na tabela experiencias_profissionais
    has_experience = False
    try:
        if candidate.experiencia_profissional and isinstance(candidate.experiencia_profissional, str) and len(candidate.experiencia_profissional.strip()) > 0:
            has_experience = True
        elif db:
            experiencias_count = db.query(ExperienciaProfissionalModel).filter(
                ExperienciaProfissionalModel.candidate_id == candidate.id
            ).count()
            has_experience = experiencias_count > 0
    except:
        has_experience = False
    
    # Dados profissionais completos se tem AMBOS educação E experiência
    if has_education and has_experience:
        progress += 50
    
    return min(progress, 100)


@router.get("/onboarding/status", response_model=CandidatoOnboardingResponse)
async def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna status completo do onboarding do candidato.
    Mostra todos os dados preenchidos e progresso.

    Se o perfil de candidato não existir, retorna status padrão (0% completo).
    """
    # Verificar tipo de usuário
    if current_user.user_type != UserType.candidato:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas candidatos podem acessar este recurso."
        )

    # Buscar candidato
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()

    # Se não existe perfil, retornar status padrão
    if candidate is None:
        return CandidatoOnboardingResponse(
            id=0,
            full_name=current_user.full_name or current_user.email.split("@")[0],
            email=current_user.email,
            cpf=None,
            phone=None,
            rg=None,
            birth_date=None,
            genero=None,
            estado_civil=None,
            cep=None,
            logradouro=None,
            numero=None,
            complemento=None,
            bairro=None,
            cidade=None,
            estado=None,
            location=None,
            is_pcd=False,
            tipo_pcd=None,
            necessidades_adaptacao=None,
            bio=None,
            linkedin_url=None,
            portfolio_url=None,
            resume_url=None,
            experiencia_profissional=None,
            formacao_escolaridade=None,
            formacoes_academicas=None,
            experiencias_profissionais=None,
            habilidades=None,
            autoavaliacao_habilidades=None,
            teste_habilidades_completado=False,
            score_teste_habilidades=None,
            dados_teste_habilidades=None,
            percentual_completude=0,
            onboarding_completo=False,
            created_at=current_user.created_at,
            updated_at=current_user.updated_at,
        )

    # Parse JSON fields if they exist
    habilidades = None
    if candidate.habilidades:
        try:
            habilidades_data = json.loads(candidate.habilidades) if isinstance(candidate.habilidades, str) else candidate.habilidades
            habilidades = [HabilidadeAutoAvaliacao(**h) for h in habilidades_data]
        except:
            habilidades = None
    
    # Buscar formações acadêmicas do banco de dados (JOIN)
    formacoes_db = db.query(FormacaoAcademicaModel).filter(
        FormacaoAcademicaModel.candidate_id == candidate.id
    ).all()
    
    formacoes_academicas = None
    if formacoes_db:
        formacoes_academicas = [
            {
                "instituicao": f.instituicao,
                "curso": f.curso,
                "nivel": f.nivel,
                "status": f.status,
                "ano_conclusao": f.ano_conclusao
            }
            for f in formacoes_db
        ]
    
    # Buscar experiências profissionais do banco de dados (JOIN)
    experiencias_db = db.query(ExperienciaProfissionalModel).filter(
        ExperienciaProfissionalModel.candidate_id == candidate.id
    ).all()
    
    # Manter campo JSON compatível
    if experiencias_db:
        candidate.experiencia_profissional = json.dumps([
            {
                "cargo": e.cargo,
                "empresa": e.empresa,
                "periodo": e.periodo,
                "descricao": e.descricao
            }
            for e in experiencias_db
        ])

    return CandidatoOnboardingResponse(
        id=candidate.id,
        full_name=candidate.full_name or current_user.full_name or current_user.email.split("@")[0],
        email=current_user.email,
        cpf=f"{candidate.cpf[:3]}.{candidate.cpf[3:6]}.{candidate.cpf[6:9]}-{candidate.cpf[9:]}" if candidate.cpf else None,
        phone=candidate.phone,
        rg=candidate.rg,
        birth_date=candidate.birth_date.isoformat() if candidate.birth_date else None,
        genero=candidate.genero.value if candidate.genero else None,
        estado_civil=candidate.estado_civil.value if candidate.estado_civil else None,
        cep=candidate.cep,
        logradouro=candidate.logradouro,
        numero=candidate.numero,
        complemento=candidate.complemento,
        bairro=candidate.bairro,
        cidade=candidate.cidade,
        estado=candidate.estado,
        location=candidate.location,
        is_pcd=candidate.is_pcd or False,
        tipo_pcd=candidate.tipo_pcd.value if candidate.tipo_pcd else None,
        necessidades_adaptacao=candidate.necessidades_adaptacao,
        bio=candidate.bio,
        linkedin_url=candidate.linkedin_url,
        portfolio_url=candidate.portfolio_url,
        resume_url=candidate.resume_url,
        experiencia_profissional=candidate.experiencia_profissional,
        formacao_escolaridade=candidate.formacao_escolaridade,
        formacoes_academicas=formacoes_academicas,
        experiencias_profissionais=[
            {
                "cargo": e.cargo,
                "empresa": e.empresa,
                "periodo": e.periodo,
                "descricao": e.descricao
            }
            for e in experiencias_db
        ] if experiencias_db else None,
        habilidades=habilidades,
        autoavaliacao_habilidades=candidate.autoavaliacao_habilidades,
        teste_habilidades_completado=candidate.teste_habilidades_completado or False,
        score_teste_habilidades=candidate.score_teste_habilidades,
        dados_teste_habilidades=json.loads(candidate.dados_teste_habilidades) if candidate.dados_teste_habilidades and isinstance(candidate.dados_teste_habilidades, str) else candidate.dados_teste_habilidades,
        percentual_completude=calculate_progress(candidate, db),
        onboarding_completo=candidate.onboarding_completo or False,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


@router.get("/onboarding/progresso", response_model=ProgressoOnboarding)
async def get_onboarding_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna apenas o progresso do onboarding (para barra de progresso).

    Se o perfil de candidato não existir, retorna progresso padrão (0%).
    """
    try:
        # Verificar tipo de usuário
        if current_user.user_type != UserType.candidato:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado. Apenas candidatos podem acessar este recurso."
            )

        # Buscar candidato
        candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()

        # Se não existe perfil, retornar progresso padrão
        if candidate is None:
            return ProgressoOnboarding(
                percentual_completude=0,
                onboarding_completo=False,
                dados_pessoais_completo=False,
                dados_profissionais_completo=False,
                teste_habilidades_completo=False,
                etapas_completas={
                    "dados_pessoais": False,
                    "profissional": False,
                    "pcd": False,
                    "educacao": False,
                    "experiencia": False,
                }
            )

        # Calcular cada etapa
        dados_pessoais_completo = bool(candidate.cep and candidate.logradouro and candidate.numero and candidate.bairro and candidate.cidade and candidate.estado)
        
        # Dados profissionais: precisa de AMBOS educação E experiência
        try:
            has_education = bool(candidate.formacao_escolaridade and isinstance(candidate.formacao_escolaridade, str) and len(candidate.formacao_escolaridade.strip()) > 0)
        except:
            has_education = False
        
        try:
            has_education_table = db.query(FormacaoAcademicaModel).filter(
                FormacaoAcademicaModel.candidate_id == candidate.id
            ).count() > 0
        except:
            has_education_table = False
        
        try:
            has_experience = bool(candidate.experiencia_profissional and isinstance(candidate.experiencia_profissional, str) and len(candidate.experiencia_profissional.strip()) > 0)
        except:
            has_experience = False
        
        try:
            has_experience_table = db.query(ExperienciaProfissionalModel).filter(
                ExperienciaProfissionalModel.candidate_id == candidate.id
            ).count() > 0
        except:
            has_experience_table = False
        
        dados_profissionais_completo = (has_education or has_education_table) and (has_experience or has_experience_table)

        progress = calculate_progress(candidate, db)

        return ProgressoOnboarding(
            percentual_completude=progress,
            onboarding_completo=candidate.onboarding_completo or False,
            dados_pessoais_completo=dados_pessoais_completo,
            dados_profissionais_completo=dados_profissionais_completo,
            teste_habilidades_completo=False,
            etapas_completas={
                "dados_pessoais": dados_pessoais_completo,
                "profissional": dados_profissionais_completo,
                "pcd": False,  # PCD é opcional, sempre False
                "educacao": has_education or has_education_table,
                "experiencia": has_experience or has_experience_table,
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] get_onboarding_progress: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding/dados-pessoais", response_model=CandidatoOnboardingResponse)
async def update_dados_pessoais(
    user_id: int = Query(..., description="ID do usuário/candidato"),
    dados: DadosPessoaisUpdate = None,
    db: Session = Depends(get_db),
):
    """
    Atualiza dados pessoais do candidato (Step 1 - Onboarding)
    
    **Dados pessoais**:
    - phone: Telefone/celular
    - rg: RG
    - birth_date: Data de nascimento (formato: dd/mm/aaaa)
    - genero: Gênero
    - estado_civil: Estado civil
    
    **Endereço**:
    - cep: CEP
    - logradouro: Rua/Avenida
    - numero: Número do imóvel
    - complemento: Complemento (apto, bloco, etc)
    - bairro: Bairro
    - cidade: Cidade
    - estado: Estado/UF
    
    **PCD**:
    - is_pcd: Pessoa com Deficiência?
    - tipo_pcd: Tipo de deficiência (se PCD)
    - necessidades_adaptacao: Necessidades especiais (se PCD)
    """
    # Buscar candidato pelo user_id
    candidate = db.query(Candidate).filter(Candidate.user_id == user_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato não encontrado"
        )
    
    print(f"\n{'='*80}")
    print(f"[UPDATE DADOS PESSOAIS] Iniciando atualização")
    print(f"[UPDATE DADOS PESSOAIS] Dados recebidos: {dados.dict()}")
    print(f"[UPDATE DADOS PESSOAIS] Candidate ID: {candidate.id}")
    print(f"{'='*80}\n")
    # Atualizar dados pessoais
    if dados.phone is not None:
        candidate.phone = dados.phone
    
    if dados.rg is not None:
        candidate.rg = dados.rg
    
    if dados.birth_date is not None:
        try:
            from datetime import datetime as dt
            candidate.birth_date = dt.strptime(dados.birth_date, "%d/%m/%Y").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Data de nascimento inválida. Use o formato: dd/mm/aaaa"
            )
    
    if dados.genero is not None:
        candidate.genero = GeneroModel(dados.genero)
    
    if dados.estado_civil is not None:
        candidate.estado_civil = EstadoCivilModel(dados.estado_civil)
    
    # Atualizar endereço
    if dados.cep is not None:
        candidate.cep = dados.cep
    
    if dados.logradouro is not None:
        candidate.logradouro = dados.logradouro
    
    if dados.numero is not None:
        candidate.numero = dados.numero
    
    if dados.complemento is not None:
        candidate.complemento = dados.complemento
    
    if dados.bairro is not None:
        candidate.bairro = dados.bairro
    
    if dados.cidade is not None:
        candidate.cidade = dados.cidade
    
    if dados.estado is not None:
        candidate.estado = dados.estado
    
    # Atualizar PCD
    if dados.is_pcd is not None:
        candidate.is_pcd = dados.is_pcd
        print(f"[DEBUG] Set is_pcd: {dados.is_pcd}")
    
    # Atualizar tipo de PCD
    if dados.tipo_pcd is not None:
        candidate.tipo_pcd = TipoPCD(dados.tipo_pcd.value)


    
    if dados.necessidades_adaptacao is not None:
        candidate.necessidades_adaptacao = dados.necessidades_adaptacao
        print(f"[DEBUG] Set necessidades_adaptacao: {dados.necessidades_adaptacao}")
    
    # Atualizar percentual de completude
    candidate.percentual_completude = calculate_progress(candidate, db)
    
    print(f"\n[DEBUG] Before commit:")
    print(f"  is_pcd: {candidate.is_pcd}")
    print(f"  tipo_pcd: {candidate.tipo_pcd}")
    print(f"  necessidades_adaptacao: {candidate.necessidades_adaptacao}")
    
    print(f"\n[DEBUG] About to commit...")
    try:
        db.commit()
        print(f"[DEBUG] Commit successful")
    except Exception as e:
        print(f"[ERROR] Commit failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    
    print(f"[DEBUG] About to refresh...")
    try:
        db.refresh(candidate)
        print(f"[DEBUG] Refresh successful")
    except Exception as e:
        print(f"[ERROR] Refresh failed: {e}")
        import traceback
        traceback.print_exc()
    
    print(f"\n[DEBUG] After refresh:")
    print(f"  is_pcd: {candidate.is_pcd}")
    print(f"  tipo_pcd: {candidate.tipo_pcd}")
    print(f"  necessidades_adaptacao: {candidate.necessidades_adaptacao}")

    
    # Parse JSON fields
    habilidades = None
    if candidate.habilidades:
        try:
            habilidades_data = json.loads(candidate.habilidades) if isinstance(candidate.habilidades, str) else candidate.habilidades
            habilidades = [HabilidadeAutoAvaliacao(**h) for h in habilidades_data]
        except:
            habilidades = None
    
    return CandidatoOnboardingResponse(
        id=candidate.id,
        full_name=candidate.full_name or current_user.full_name or current_user.email.split("@")[0],
        email=current_user.email,
        cpf=f"{candidate.cpf[:3]}.{candidate.cpf[3:6]}.{candidate.cpf[6:9]}-{candidate.cpf[9:]}" if candidate.cpf else None,
        phone=candidate.phone,
        rg=candidate.rg,
        birth_date=candidate.birth_date.isoformat() if candidate.birth_date else None,
        genero=candidate.genero.value if candidate.genero else None,
        estado_civil=candidate.estado_civil.value if candidate.estado_civil else None,
        cep=candidate.cep,
        logradouro=candidate.logradouro,
        numero=candidate.numero,
        complemento=candidate.complemento,
        bairro=candidate.bairro,
        cidade=candidate.cidade,
        estado=candidate.estado,
        location=candidate.location,
        is_pcd=candidate.is_pcd or False,
        tipo_pcd=candidate.tipo_pcd.value if candidate.tipo_pcd else None,
        necessidades_adaptacao=candidate.necessidades_adaptacao,
        bio=candidate.bio,
        linkedin_url=candidate.linkedin_url,
        portfolio_url=candidate.portfolio_url,
        resume_url=candidate.resume_url,
        experiencia_profissional=candidate.experiencia_profissional,
        formacao_escolaridade=candidate.formacao_escolaridade,
        formacoes_academicas=None,
        experiencias_profissionais=None,
        habilidades=habilidades,
        autoavaliacao_habilidades=candidate.autoavaliacao_habilidades,
        teste_habilidades_completado=candidate.teste_habilidades_completado or False,
        score_teste_habilidades=candidate.score_teste_habilidades,
        dados_teste_habilidades=json.loads(candidate.dados_teste_habilidades) if candidate.dados_teste_habilidades and isinstance(candidate.dados_teste_habilidades, str) else candidate.dados_teste_habilidades,
        percentual_completude=candidate.percentual_completude or 0,
        onboarding_completo=candidate.onboarding_completo or False,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )




@router.get("/onboarding/dados-profissionais", response_model=CandidatoOnboardingResponse)
async def obter_dados_profissionais(
    user_id: int = Query(..., description="ID do usuário/candidato"),
    db: Session = Depends(get_db),
):
    """
    Obtém os dados profissionais do candidato
    
    Retorna: bio, linkedin_url, portfolio_url, resume_url, habilidades, experiências, área de atuação
    """
    # Buscar candidato pelo user_id
    candidate = db.query(Candidate).filter(Candidate.user_id == user_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato não encontrado"
        )
    
    # Get email from User if candidate doesn't have it
    email = candidate.user.email if candidate.user else ""
    
    return CandidatoOnboardingResponse(
        id=candidate.id,
        user_id=candidate.user_id,
        cpf=candidate.cpf,
        email=email,
        full_name=candidate.full_name or "",
        phone=candidate.phone,
        rg=candidate.rg,
        birth_date=candidate.birth_date.isoformat() if candidate.birth_date else None,
        genero=candidate.genero.value if candidate.genero else None,
        estado_civil=candidate.estado_civil.value if candidate.estado_civil else None,
        # Endereço
        cep=candidate.cep,
        logradouro=candidate.logradouro,
        numero=candidate.numero,
        complemento=candidate.complemento,
        bairro=candidate.bairro,
        cidade=candidate.cidade,
        estado=candidate.estado,
        # Profissional
        bio=candidate.bio,
        linkedin_url=candidate.linkedin_url,
        portfolio_url=candidate.portfolio_url,
        resume_url=candidate.resume_url,
        # Área de Atuação
        area_atuacao=candidate.area_atuacao,
        # Status
        status_onboarding=candidate.status_onboarding or "cadastro_inicial",
        percentual_completude=candidate.percentual_completude or 0,
        onboarding_completo=candidate.onboarding_completo or False,
        created_at=candidate.user.created_at,
        updated_at=candidate.user.updated_at,
    )


@router.post("/onboarding/dados-profissionais", response_model=CandidatoOnboardingResponse)
async def update_dados_profissionais(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Atualiza dados profissionais do candidato (Step 2 - Onboarding)

    Aceita tanto JSON body quanto form-data, com campos opcionais. 
    Valida apenas os campos que são enviados.

    **Campos Opcionais (JSON ou Form)**:
    - **user_id**: ID do usuário (query param ou no JSON body)
    - **bio**: Bio/Resumo profissional (string)
    - **linkedin_url**: URL do LinkedIn (string)
    - **portfolio_url**: URL do Portfólio (string)
    - **resume_url**: URL/caminho do Currículo (string)
    - **area_atuacao**: Área de atuação (string)
    - **experiencia_profissional**: JSON array de experiências
    - **formacao_escolaridade**: Nível de escolaridade (string)
    - **habilidades**: JSON array de habilidades
    - **formacoes_academicas**: JSON array de formações
    - **autoavaliacao_competencias**: JSON array de autoavaliação

    **Arquivo**:
    - **curriculo**: Arquivo PDF do currículo (opcional)

    **Exemplos**:
    
    1. Com JSON body (apenas autoavaliação):
    ```
    POST /api/v1/candidates/onboarding/dados-profissionais?user_id=123
    Content-Type: application/json
    
    {
        "autoavaliacao_competencias": [{"competencia": "Python", "nivel": 3}]
    }
    ```
    
    2. Com JSON body (múltiplos campos):
    ```
    POST /api/v1/candidates/onboarding/dados-profissionais?user_id=123
    Content-Type: application/json
    
    {
        "bio": "Dev full stack",
        "linkedin_url": "https://linkedin.com/in/usuario",
        "habilidades": [{"habilidade": "Python", "nivel": 4}]
    }
    ```
    
    3. Com form-data (compatibilidade):
    ```
    POST /api/v1/candidates/onboarding/dados-profissionais?user_id=123
    -F "bio=Desenvolvedor"
    -F "linkedin_url=https://linkedin.com/in/usuario"
    -F "curriculo=@resume.pdf"
    ```
    """
    # Obter user_id dos query params ou do body
    user_id = request.query_params.get("user_id")
    
    # Tentar parsear dados do request
    try:
        content_type = request.headers.get("content-type", "")
        
        if "application/json" in content_type:
            # Parse JSON body
            body = await request.json()
            data = body
            # Extrair user_id do body se não estiver nos query params
            if not user_id and "user_id" in body:
                user_id = body.get("user_id")
        elif "multipart/form-data" in content_type:
            # Parse form-data
            form = await request.form()
            data = dict(form)
        else:
            # Tentar JSON por padrão
            try:
                body = await request.json()
                data = body
            except:
                form = await request.form()
                data = dict(form)
                
    except Exception as e:
        print(f"[DEBUG] Erro ao parsear request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao parsear dados da requisição: {str(e)}"
        )
    
    # Validar user_id
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="user_id é obrigatório (query param ou no body)"
        )
    
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="user_id deve ser um número inteiro"
        )
    
    # Buscar candidato pelo user_id
    candidate = db.query(Candidate).filter(Candidate.user_id == user_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato não encontrado"
        )
    
    print(f"\n{'='*60}")
    print(f"[INICIO] POST /dados-profissionais")
    print(f"[DEBUG] user_id: {user_id}")
    print(f"[DEBUG] candidate.id: {candidate.id}")
    print(f"[DEBUG] Campos recebidos: {list(data.keys())}")
    print(f"{'='*60}\n")
    
    # Atualizar bio
    bio = data.get("bio")
    if bio is not None and str(bio).strip():
        candidate.bio = str(bio).strip()
    
    # Atualizar LinkedIn
    linkedin_url = data.get("linkedin_url")
    if linkedin_url is not None and str(linkedin_url).strip():
        candidate.linkedin_url = str(linkedin_url).strip()
    
    # Atualizar portfólio
    portfolio_url = data.get("portfolio_url")
    if portfolio_url is not None and str(portfolio_url).strip():
        candidate.portfolio_url = str(portfolio_url).strip()
    
    # Atualizar URL do resumo
    resume_url = data.get("resume_url")
    if resume_url is not None and str(resume_url).strip():
        candidate.resume_url = str(resume_url).strip()
    
    # Atualizar área de atuação
    area_atuacao = data.get("area_atuacao")
    print(f"[DEBUG] area_atuacao (raw): {repr(area_atuacao)}")
    if area_atuacao is not None:
        area_str = str(area_atuacao).strip()
        if area_str:
            candidate.area_atuacao = area_str
            print(f"[DEBUG] area_atuacao atualizada para: {area_str}")
        else:
            print(f"[DEBUG] area_atuacao vazia ou apenas espaços")
    else:
        print(f"[DEBUG] area_atuacao não fornecida")

    # Atualizar anos de experiência
    anos_experiencia = data.get("anos_experiencia")
    if anos_experiencia is not None:
        try:
            anos_int = int(anos_experiencia)
            if anos_int >= 0:
                candidate.anos_experiencia = anos_int
            else:
                raise ValueError("Anos de experiência não pode ser negativo")
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"anos_experiencia deve ser um número inteiro positivo: {str(e)}"
            )

    # Atualizar experiência profissional
    experiencia_profissional = data.get("experiencia_profissional")
    print(f"[DEBUG] experiencia_profissional (raw): {repr(experiencia_profissional)}")
    if experiencia_profissional is not None:
        exp_str = str(experiencia_profissional).strip() if not isinstance(experiencia_profissional, str) else experiencia_profissional.strip()
        if exp_str:
            try:
                if isinstance(experiencia_profissional, str):
                    experiencia_list = json.loads(exp_str)
                else:
                    experiencia_list = experiencia_profissional if isinstance(experiencia_profissional, list) else json.loads(json.dumps(experiencia_profissional))
                
                # Validar cada experiência
                for exp in experiencia_list:
                    ExperienciaProfissional(**exp)

                experiencia_json = json.dumps(experiencia_list, ensure_ascii=False)
                candidate.experiencia_profissional = experiencia_json
                attributes.flag_modified(candidate, "experiencia_profissional")
                print(f"[DEBUG] Experiência salva com sucesso")
            except json.JSONDecodeError as e:
                print(f"[DEBUG] ERRO JSON na experiência: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Experiência profissional deve ser JSON válido: {str(e)}"
                )
            except Exception as e:
                print(f"[DEBUG] ERRO Validação experiência: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Erro ao validar experiência profissional: {str(e)}"
                )
    # Atualizar formação escolaridade
    formacao_escolaridade = data.get("formacao_escolaridade")
    if formacao_escolaridade is not None and str(formacao_escolaridade).strip():
        candidate.formacao_escolaridade = str(formacao_escolaridade).strip()
    
    # Atualizar formações acadêmicas detalhadas
    formacoes_academicas = data.get("formacoes_academicas")
    print(f"[DEBUG] formacoes_academicas (raw): {repr(formacoes_academicas)}")
    if formacoes_academicas is not None:
        form_str = str(formacoes_academicas).strip() if not isinstance(formacoes_academicas, str) else formacoes_academicas.strip()
        if form_str:
            try:
                if isinstance(formacoes_academicas, str):
                    formacoes_list = json.loads(form_str)
                else:
                    formacoes_list = formacoes_academicas if isinstance(formacoes_academicas, list) else json.loads(json.dumps(formacoes_academicas))
                
                # Validar cada formação
                for f in formacoes_list:
                    FormacaoAcademica(**f)

                formacoes_json = json.dumps(formacoes_list, ensure_ascii=False)
                candidate.formacoes_academicas = formacoes_json
                attributes.flag_modified(candidate, "formacoes_academicas")
                print(f"[DEBUG] Formações acadêmicas salvas com sucesso")
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Formações acadêmicas deve ser JSON válido: {str(e)}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Erro ao validar formações acadêmicas: {str(e)}"
                )
    
    # Atualizar habilidades
    habilidades = data.get("habilidades")
    print(f"[DEBUG] habilidades (raw): {repr(habilidades)}")
    if habilidades is not None:
        hab_str = str(habilidades).strip() if not isinstance(habilidades, str) else habilidades.strip()
        if hab_str:
            try:
                if isinstance(habilidades, str):
                    habilidades_list = json.loads(hab_str)
                else:
                    habilidades_list = habilidades if isinstance(habilidades, list) else json.loads(json.dumps(habilidades))
                
                # Validar cada habilidade
                for h in habilidades_list:
                    HabilidadeAutoAvaliacao(**h)

                habilidades_json = json.dumps(habilidades_list, ensure_ascii=False)
                candidate.habilidades = habilidades_json
                attributes.flag_modified(candidate, "habilidades")
                print(f"[DEBUG] Habilidades salvas com sucesso")
            except json.JSONDecodeError as e:
                print(f"[DEBUG] ERRO JSON em habilidades: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Habilidades deve ser JSON válido: {str(e)}"
                )
            except Exception as e:
                print(f"[DEBUG] ERRO Validação habilidades: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Erro ao validar habilidades: {str(e)}"
                )
    
    # Atualizar autoavaliação de competências
    autoavaliacao_competencias = data.get("autoavaliacao_competencias")
    print(f"[DEBUG] autoavaliacao_competencias (raw): {repr(autoavaliacao_competencias)}")
    if autoavaliacao_competencias is not None:
        autoa_str = str(autoavaliacao_competencias).strip() if not isinstance(autoavaliacao_competencias, str) else autoavaliacao_competencias.strip()
        if autoa_str:
            try:
                if isinstance(autoavaliacao_competencias, str):
                    autoavaliacao_list = json.loads(autoa_str)
                else:
                    autoavaliacao_list = autoavaliacao_competencias if isinstance(autoavaliacao_competencias, list) else json.loads(json.dumps(autoavaliacao_competencias))
                
                # Armazenar como JSON no banco
                autoavaliacao_json = json.dumps(autoavaliacao_list, ensure_ascii=False)
                candidate.autoavaliacao_habilidades = autoavaliacao_json
                attributes.flag_modified(candidate, "autoavaliacao_habilidades")
                print(f"[DEBUG] Autoavaliação salva com sucesso")
            except json.JSONDecodeError as e:
                print(f"[DEBUG] ERRO JSON em autoavaliação: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Autoavaliação deve ser JSON válido: {str(e)}"
                )
            except Exception as e:
                print(f"[DEBUG] ERRO em autoavaliação: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Erro ao processar autoavaliação: {str(e)}"
                )
    
    # Fazer upload do currículo se fornecido (apenas em multipart)
    if "multipart/form-data" in content_type:
        try:
            curriculo = data.get("curriculo")
            if curriculo and hasattr(curriculo, "filename"):
                # Validar tipo de arquivo
                if not curriculo.filename.lower().endswith('.pdf'):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Apenas arquivos PDF são aceitos para o currículo"
                    )
                
                file_service = FileService()
                resume_url_uploaded = await file_service.upload_file(curriculo, subfolder="curriculos")
                candidate.resume_url = resume_url_uploaded
                print(f"[DEBUG] Currículo enviado com sucesso: {resume_url_uploaded}")
        except HTTPException:
            raise
        except Exception as e:
            print(f"[DEBUG] Erro ao fazer upload do currículo: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Erro ao fazer upload do currículo: {str(e)}"
            )
    
    # Atualizar percentual de completude
    candidate.percentual_completude = calculate_progress(candidate, db)
    
    print(f"\n[DEBUG] Antes do commit:")
    print(f"  - candidate.habilidades: {repr(candidate.habilidades)}")
    
    db.commit()
    db.refresh(candidate)
    
    print(f"[DEBUG] Após commit e refresh:")
    print(f"  - candidate.habilidades: {repr(candidate.habilidades)}")
    print(f"{'='*60}\n")
    
    # Parse JSON fields para response
    habilidades_parsed = None
    if candidate.habilidades:
        try:
            habilidades_data = json.loads(candidate.habilidades) if isinstance(candidate.habilidades, str) else candidate.habilidades
            habilidades_parsed = [HabilidadeAutoAvaliacao(**h) for h in habilidades_data]
            print(f"[DEBUG] Habilidades parseadas com sucesso: {len(habilidades_parsed)} items")
        except Exception as e:
            print(f"[DEBUG] ERRO ao parsear habilidades para response: {str(e)}")
            habilidades_parsed = None
    
    # Parse formações acadêmicas
    formacoes_academicas_parsed = None
    if candidate.formacoes_academicas:
        try:
            formacoes_data = json.loads(candidate.formacoes_academicas) if isinstance(candidate.formacoes_academicas, str) else candidate.formacoes_academicas
            formacoes_academicas_parsed = [FormacaoAcademica(**f) for f in formacoes_data]
        except Exception as e:
            print(f"[DEBUG] ERRO ao parsear formações acadêmicas para response: {str(e)}")
            formacoes_academicas_parsed = None
    
    # Parse experiências profissionais
    experiencias_profissionais_parsed = None
    if candidate.experiencia_profissional:
        try:
            experiencias_data = json.loads(candidate.experiencia_profissional) if isinstance(candidate.experiencia_profissional, str) else candidate.experiencia_profissional
            experiencias_profissionais_parsed = [ExperienciaProfissional(**e) for e in experiencias_data]
        except Exception as e:
            print(f"[DEBUG] ERRO ao parsear experiências profissionais para response: {str(e)}")
            experiencias_profissionais_parsed = None
    
    return CandidatoOnboardingResponse(
        id=candidate.id,
        full_name=candidate.user.full_name or candidate.user.email.split("@")[0],
        email=candidate.user.email,
        cpf=f"{candidate.cpf[:3]}.{candidate.cpf[3:6]}.{candidate.cpf[6:9]}-{candidate.cpf[9:]}" if candidate.cpf else None,
        phone=candidate.phone,
        rg=candidate.rg,
        birth_date=candidate.birth_date.isoformat() if candidate.birth_date else None,
        genero=candidate.genero.value if candidate.genero else None,
        estado_civil=candidate.estado_civil.value if candidate.estado_civil else None,
        cep=candidate.cep,
        logradouro=candidate.logradouro,
        numero=candidate.numero,
        complemento=candidate.complemento,
        bairro=candidate.bairro,
        cidade=candidate.cidade,
        estado=candidate.estado,
        location=candidate.location,
        is_pcd=candidate.is_pcd or False,
        tipo_pcd=candidate.tipo_pcd.value if candidate.tipo_pcd else None,
        necessidades_adaptacao=candidate.necessidades_adaptacao,
        experiencia_profissional=candidate.experiencia_profissional,
        formacao_escolaridade=candidate.formacao_escolaridade,
        area_atuacao=candidate.area_atuacao,
        formacoes_academicas=formacoes_academicas_parsed,
        experiencias_profissionais=experiencias_profissionais_parsed,
        habilidades=habilidades_parsed,
        autoavaliacao_habilidades=candidate.autoavaliacao_habilidades,
        teste_habilidades_completado=candidate.teste_habilidades_completado or False,
        score_teste_habilidades=candidate.score_teste_habilidades,
        dados_teste_habilidades=json.loads(candidate.dados_teste_habilidades) if candidate.dados_teste_habilidades and isinstance(candidate.dados_teste_habilidades, str) else candidate.dados_teste_habilidades,
        percentual_completude=candidate.percentual_completude or 0,
        onboarding_completo=candidate.onboarding_completo or False,
        created_at=candidate.user.created_at,
        updated_at=candidate.user.updated_at,
    )


@router.post("/onboarding/teste-habilidades", response_model=CandidatoOnboardingResponse)
async def submit_teste_habilidades(
    user_id: int = Query(..., description="ID do usuário/candidato"),
    submissao: SubmissaoTeste = None,
    db: Session = Depends(get_db),
):
    """
    Submete as respostas do teste de habilidades do onboarding.
    
    O backend valida as respostas, calcula o score e completa o onboarding.
    
    - **test_id**: ID do teste de habilidades
    - **respostas**: Lista de respostas (question_id, alternative_id)
    - **tempo_decorrido**: Tempo em segundos (opcional)
    """
    # Buscar candidato pelo user_id
    candidate = db.query(Candidate).filter(Candidate.user_id == user_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato não encontrado"
        )
    
    try:
        teste = db.query(Test).filter(Test.id == submissao.test_id).first()
        
        if not teste:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teste não encontrado"
            )
        
        # Validar que o candidato enviou respostas para todas as questões
        total_questoes = len(teste.questions)
        total_respostas = len(submissao.respostas)
        
        if total_respostas != total_questoes:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Você deve responder todas as {total_questoes} questões. "
                       f"Respondidas: {total_respostas}"
            )
        
        # Processar respostas e calcular score
        total_acertos = 0
        respostas_map = {r.question_id: r.alternative_id for r in submissao.respostas}
        
        for questao in teste.questions:
            if questao.id not in respostas_map:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Falta resposta para a questão {questao.ordem}"
                )
            
            alternative_id_escolhida = respostas_map[questao.id]
            
            # Encontrar alternativa correta
            alternativa_correta = db.query(Alternative).filter(
                Alternative.question_id == questao.id,
                Alternative.is_correct == True
            ).first()
            
            # Encontrar alternativa escolhida
            alternativa_escolhida = db.query(Alternative).filter(
                Alternative.id == alternative_id_escolhida,
                Alternative.question_id == questao.id
            ).first()
            
            if not alternativa_escolhida:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Alternativa inválida para a questão {questao.ordem}"
                )
            
            if not alternativa_correta:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Nenhuma alternativa correta configurada para a questão {questao.ordem}"
                )
            
            # Verificar se a resposta está correta
            if alternativa_escolhida.id == alternativa_correta.id:
                total_acertos += 1
        
        # Calcular percentual (0-100)
        percentual_acerto = (total_acertos / total_questoes * 100) if total_questoes > 0 else 0
        score = round(percentual_acerto, 2)
        
        # Atualizar dados do candidato
        candidate.teste_habilidades_completado = True
        candidate.score_teste_habilidades = score
        candidate.onboarding_completo = True
        candidate.percentual_completude = 100
        
        # Salvar dados detalhados do teste
        dados_teste = {
            "test_id": teste.id,
            "nome_teste": teste.nome,
            "habilidade": teste.habilidade,
            "total_questoes": total_questoes,
            "total_acertos": total_acertos,
            "percentual_acerto": score,
            "tempo_decorrido": submissao.tempo_decorrido,
            "data_submissao": datetime.utcnow().isoformat()
        }
        candidate.dados_teste_habilidades = json.dumps(dados_teste)
        
        db.commit()
        
        # Salvar resultado no histórico de testes
        try:
            detalhes = []
            for questao in teste.questions:
                resposta_id = respostas_map.get(questao.id)
                if resposta_id:
                    alternativa_escolhida = db.query(Alternative).filter(
                        Alternative.id == resposta_id
                    ).first()
                    alternativa_correta = db.query(Alternative).filter(
                        Alternative.question_id == questao.id,
                        Alternative.is_correct == True
                    ).first()
                    
                    detalhes.append({
                        "question_id": questao.id,
                        "texto_questao": questao.texto_questao,
                        "resposta_candidato": alternativa_escolhida.texto if alternativa_escolhida else None,
                        "resposta_correta": alternativa_correta.texto if alternativa_correta else None,
                        "acertou": alternativa_escolhida and alternativa_correta and alternativa_escolhida.id == alternativa_correta.id
                    })
            
            resultado = CandidateTestResult(
                candidate_id=candidate.id,
                test_id=teste.id,
                total_questoes=total_questoes,
                total_acertos=total_acertos,
                percentual_acerto=score,
                tempo_decorrido=submissao.tempo_decorrido,
                detalhes_questoes=json.dumps(detalhes)
            )
            db.add(resultado)
            db.commit()
        except Exception as e:
            logger.error(f"Erro ao salvar resultado do teste no histórico: {str(e)}")
            # Continuar mesmo se falhar
        
        db.refresh(candidate)
        
        # Parse JSON fields
        habilidades = None
        if candidate.habilidades:
            try:
                habilidades_data = json.loads(candidate.habilidades) if isinstance(candidate.habilidades, str) else candidate.habilidades
                habilidades = [HabilidadeAutoAvaliacao(**h) for h in habilidades_data]
            except:
                habilidades = None
        
        return CandidatoOnboardingResponse(
            id=candidate.id,
            full_name=candidate.user.full_name or candidate.user.email.split("@")[0],
            email=candidate.user.email,
            phone=candidate.phone,
            cidade=candidate.cidade,
            estado=candidate.estado,
            is_pcd=candidate.is_pcd or False,
            tipo_pcd=candidate.tipo_pcd.value if candidate.tipo_pcd else None,
            necessidades_adaptacao=candidate.necessidades_adaptacao,
            experiencia_profissional=candidate.experiencia_profissional,
            formacao_escolaridade=candidate.formacao_escolaridade,
            habilidades=habilidades,
            teste_habilidades_completado=candidate.teste_habilidades_completado or False,
            score_teste_habilidades=candidate.score_teste_habilidades,
            percentual_completude=candidate.percentual_completude or 0,
            onboarding_completo=candidate.onboarding_completo or False,
            created_at=candidate.user.created_at,
            updated_at=candidate.user.updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar respostas do teste"
        )


@router.post("/onboarding/formacoes-academicas", response_model=CandidatoOnboardingResponse)
async def salvar_formacoes_academicas(
    user_id: int = Query(..., description="ID do usuário/candidato"),
    request: FormacaoAcademicaRequest = None,
    db: Session = Depends(get_db),
):
    """
    Salva as formações acadêmicas do candidato.
    
    Body JSON esperado:
    ```json
    {
      "formacoes_academicas": [
        {
          "instituicao": "string",
          "curso": "string",
          "nivel": "string",
          "status": "string",
          "ano_conclusao": 0
        }
      ]
    }
    ```
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        # Buscar candidato pelo user_id
        candidate = db.query(Candidate).filter(Candidate.user_id == user_id).first()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidato não encontrado"
            )
        
        # Log do request recebido
        logger.info(f"[FORMACOES] Request recebido - Candidato ID: {candidate.id}")
        logger.info(f"[FORMACOES] Formações recebidas: {len(request.formacoes_academicas)}")
        
        # Log detalhado de cada formação
        for i, f in enumerate(request.formacoes_academicas):
            logger.info(f"[FORMACOES] Formação {i}: {f.instituicao} - {f.curso} ({f.nivel}) - Status: {f.status}")
        
        formacoes_data = request.formacoes_academicas
        
        # Deletar formações antigas
        logger.info(f"[FORMACOES] Deletando formações antigas para candidato {candidate.id}")
        deleted_count = db.query(FormacaoAcademicaModel).filter(
            FormacaoAcademicaModel.candidate_id == candidate.id
        ).delete()
        logger.info(f"[FORMACOES] Deletadas {deleted_count} formações antigas")
        
        # Criar novas formações
        logger.info(f"[FORMACOES] Criando {len(formacoes_data)} novas formações")
        for formacao_item in formacoes_data:
            formacao = FormacaoAcademicaModel(
                candidate_id=candidate.id,
                instituicao=formacao_item.instituicao,
                curso=formacao_item.curso,
                nivel=formacao_item.nivel,
                status=formacao_item.status,
                ano_conclusao=formacao_item.ano_conclusao
            )
            db.add(formacao)
            logger.info(f"[FORMACOES] Adicionada formação: {formacao_item.instituicao}")
        
        db.commit()
        logger.info(f"[FORMACOES] Commit realizado com sucesso")
        
        # Manter também o campo JSON por compatibilidade
        candidate.formacoes_academicas = json.dumps([f.dict() for f in formacoes_data])
        db.commit()
        db.refresh(candidate)
        logger.info(f"[FORMACOES] Candidato atualizado com sucesso")
        
        # Parse JSON fields
        habilidades = None
        if candidate.habilidades:
            try:
                habilidades_data = json.loads(candidate.habilidades) if isinstance(candidate.habilidades, str) else candidate.habilidades
                habilidades = [HabilidadeAutoAvaliacao(**h) for h in habilidades_data]
            except:
                habilidades = None
        
        # Buscar formações acadêmicas do banco de dados
        logger.info(f"[FORMACOES] Buscando formações para candidate_id={candidate.id}")
        formacoes_db = db.query(FormacaoAcademicaModel).filter(
            FormacaoAcademicaModel.candidate_id == candidate.id
        ).all()
        logger.info(f"[FORMACOES] Encontradas {len(formacoes_db)} formações no banco")
        
        formacoes_academicas = [
            FormacaoAcademica(
                instituicao=f.instituicao,
                curso=f.curso,
                nivel=f.nivel,
                status=f.status,
                ano_conclusao=f.ano_conclusao
            )
            for f in formacoes_db
        ]
        logger.info(f"[FORMACOES] Parseadas {len(formacoes_academicas)} formações para response")
        
        # Buscar experiências profissionais do banco de dados
        logger.info(f"[FORMACOES] Buscando experiências para candidate_id={candidate.id}")
        experiencias_db = db.query(ExperienciaProfissionalModel).filter(
            ExperienciaProfissionalModel.candidate_id == candidate.id
        ).all()
        logger.info(f"[FORMACOES] Encontradas {len(experiencias_db)} experiências no banco")
        
        experiencias_profissionais = [
            ExperienciaProfissional(
                cargo=e.cargo,
                empresa=e.empresa,
                periodo=e.periodo
            )
            for e in experiencias_db
        ]
        logger.info(f"[FORMACOES] Parseadas {len(experiencias_profissionais)} experiências para response")
        
        logger.info(f"[FORMACOES] Retornando resposta com sucesso - {len(formacoes_academicas)} formações e {len(experiencias_profissionais)} experiências")
        return CandidatoOnboardingResponse(
            id=candidate.id,
            full_name=candidate.user.full_name or candidate.user.email.split("@")[0],
            email=candidate.user.email,
            phone=candidate.phone,
            cidade=candidate.cidade,
            estado=candidate.estado,
            is_pcd=candidate.is_pcd or False,
            tipo_pcd=candidate.tipo_pcd.value if candidate.tipo_pcd else None,
            necessidades_adaptacao=candidate.necessidades_adaptacao,
            experiencia_profissional=candidate.experiencia_profissional,
            formacao_escolaridade=candidate.formacao_escolaridade,
            formacoes_academicas=formacoes_academicas,
            experiencias_profissionais=experiencias_profissionais,
            habilidades=habilidades,
            teste_habilidades_completado=candidate.teste_habilidades_completado or False,
            score_teste_habilidades=candidate.score_teste_habilidades,
            percentual_completude=candidate.percentual_completude or 0,
            onboarding_completo=candidate.onboarding_completo or False,
            created_at=candidate.user.created_at,
            updated_at=candidate.user.updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"[FORMACOES] Erro ao salvar formações: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar formações acadêmicas: {str(e)}"
        )


@router.post("/onboarding/experiencias-profissionais", response_model=CandidatoOnboardingResponse)
async def salvar_experiencias_profissionais(
    user_id: int = Query(..., description="ID do usuário/candidato"),
    request: ExperienciaProfissionalRequest = None,
    db: Session = Depends(get_db),
):
    """
    Salva as experiências profissionais do candidato.
    
    Body JSON esperado:
    ```json
    {
      "experiencias_profissionais": [
        {
          "cargo": "string",
          "empresa": "string",
          "periodo": "string",
          "descricao": "string"
        }
      ]
    }
    ```
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        # Buscar candidato pelo user_id
        candidate = db.query(Candidate).filter(Candidate.user_id == user_id).first()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidato não encontrado"
            )
        
        # Log do request recebido
        logger.info(f"[EXPERIENCIAS] Request recebido - Candidato ID: {candidate.id}")
        logger.info(f"[EXPERIENCIAS] Experiências recebidas: {len(request.experiencias_profissionais)}")
        
        # Log detalhado de cada experiência
        for i, e in enumerate(request.experiencias_profissionais):
            logger.info(f"[EXPERIENCIAS] Experiência {i}: {e.cargo} - {e.empresa} ({e.periodo})")
        
        experiencias_data = request.experiencias_profissionais
        
        # Deletar experiências antigas
        logger.info(f"[EXPERIENCIAS] Deletando experiências antigas para candidato {candidate.id}")
        deleted_count = db.query(ExperienciaProfissionalModel).filter(
            ExperienciaProfissionalModel.candidate_id == candidate.id
        ).delete()
        logger.info(f"[EXPERIENCIAS] Deletadas {deleted_count} experiências antigas")
        
        # Criar novas experiências
        logger.info(f"[EXPERIENCIAS] Criando {len(experiencias_data)} novas experiências")
        for experiencia_item in experiencias_data:
            experiencia = ExperienciaProfissionalModel(
                candidate_id=candidate.id,
                cargo=experiencia_item.cargo,
                empresa=experiencia_item.empresa,
                periodo=experiencia_item.periodo,
                descricao=experiencia_item.descricao
            )
            db.add(experiencia)
            logger.info(f"[EXPERIENCIAS] Adicionada experiência: {experiencia_item.cargo}")
        
        db.commit()
        logger.info(f"[EXPERIENCIAS] Commit realizado com sucesso")
        
        # Manter também o campo JSON por compatibilidade
        candidate.experiencia_profissional = json.dumps([e.dict() for e in experiencias_data])
        db.commit()
        db.refresh(candidate)
        logger.info(f"[EXPERIENCIAS] Candidato atualizado com sucesso")
        
        # Parse JSON fields
        habilidades = None
        if candidate.habilidades:
            try:
                habilidades_data = json.loads(candidate.habilidades) if isinstance(candidate.habilidades, str) else candidate.habilidades
                habilidades = [HabilidadeAutoAvaliacao(**h) for h in habilidades_data]
            except:
                habilidades = None
        
        # Buscar formações acadêmicas do banco de dados
        formacoes_db = db.query(FormacaoAcademicaModel).filter(
            FormacaoAcademicaModel.candidate_id == candidate.id
        ).all()
        formacoes_academicas = [
            FormacaoAcademica(
                instituicao=f.instituicao,
                curso=f.curso,
                nivel=f.nivel,
                status=f.status,
                ano_conclusao=f.ano_conclusao
            )
            for f in formacoes_db
        ]
        
        # Buscar experiências profissionais do banco de dados
        experiencias_db = db.query(ExperienciaProfissionalModel).filter(
            ExperienciaProfissionalModel.candidate_id == candidate.id
        ).all()
        experiencias_profissionais = [
            ExperienciaProfissional(
                cargo=e.cargo,
                empresa=e.empresa,
                periodo=e.periodo
            )
            for e in experiencias_db
        ]
        
        logger.info(f"[EXPERIENCIAS] Retornando resposta com sucesso - {len(experiencias_profissionais)} experiências encontradas")
        return CandidatoOnboardingResponse(
            id=candidate.id,
            full_name=candidate.user.full_name or candidate.user.email.split("@")[0],
            email=candidate.user.email,
            phone=candidate.phone,
            cidade=candidate.cidade,
            estado=candidate.estado,
            is_pcd=candidate.is_pcd or False,
            tipo_pcd=candidate.tipo_pcd.value if candidate.tipo_pcd else None,
            necessidades_adaptacao=candidate.necessidades_adaptacao,
            experiencia_profissional=candidate.experiencia_profissional,
            formacao_escolaridade=candidate.formacao_escolaridade,
            formacoes_academicas=formacoes_academicas,
            experiencias_profissionais=experiencias_profissionais,
            habilidades=habilidades,
            teste_habilidades_completado=candidate.teste_habilidades_completado or False,
            score_teste_habilidades=candidate.score_teste_habilidades,
            percentual_completude=candidate.percentual_completude or 0,
            onboarding_completo=candidate.onboarding_completo or False,
            created_at=candidate.user.created_at,
            updated_at=candidate.user.updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"[EXPERIENCIAS] Erro ao salvar experiências: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar experiências profissionais: {str(e)}"
        )


# ============================================================================
# ROTAS DE EDIÇÃO DE PERFIL
# ============================================================================


@router.get("/me", response_model=CandidatoPerfilResponse)
async def get_perfil_candidato(
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Retorna o perfil completo do candidato logado.
    
    Inclui:
    - Dados pessoais (nome, telefone, data nascimento, gênero, estado civil)
    - Endereço completo
    - Informações profissionais (CV, LinkedIn, portfolio, bio)
    - Status de PCD
    - Progresso do onboarding
    """
    
    # Buscar formações acadêmicas do banco de dados
    formacoes_db = db.query(FormacaoAcademicaModel).filter(
        FormacaoAcademicaModel.candidate_id == candidate.id
    ).all()
    formacoes_academicas = [
        FormacaoAcademica(
            instituicao=f.instituicao,
            curso=f.curso,
            nivel=f.nivel,
            status=f.status,
            ano_conclusao=f.ano_conclusao
        )
        for f in formacoes_db
    ] if formacoes_db else None
    
    return CandidatoPerfilResponse(
        id=candidate.id,
        cpf=candidate.cpf,
        full_name=candidate.full_name,
        email=candidate.user.email,
        phone=candidate.phone,
        rg=candidate.rg,
        birth_date=str(candidate.birth_date) if candidate.birth_date else None,
        genero=candidate.genero.value if candidate.genero else None,
        estado_civil=candidate.estado_civil.value if candidate.estado_civil else None,
        location=candidate.location,
        cep=candidate.cep,
        logradouro=candidate.logradouro,
        numero=candidate.numero,
        complemento=candidate.complemento,
        bairro=candidate.bairro,
        cidade=candidate.cidade,
        estado=candidate.estado,
        is_pcd=candidate.is_pcd or False,
        tipo_pcd=candidate.tipo_pcd.value if candidate.tipo_pcd else None,
        necessidades_adaptacao=candidate.necessidades_adaptacao,
        resume_url=candidate.resume_url,
        linkedin_url=candidate.linkedin_url,
        portfolio_url=candidate.portfolio_url,
        bio=candidate.bio,
        area_atuacao=candidate.area_atuacao,
        experiencia_profissional=candidate.experiencia_profissional,
        formacao_escolaridade=candidate.formacao_escolaridade,
        formacoes_academicas=formacoes_academicas,
        onboarding_completo=candidate.onboarding_completo or False,
        percentual_completude=candidate.percentual_completude or 0,
        created_at=candidate.user.created_at,
        updated_at=candidate.user.updated_at,
    )


@router.put("/me", response_model=CandidatoPerfilResponse)
async def atualizar_perfil_candidato(
    perfil_update: CandidatoPerfilUpdate,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Atualiza o perfil completo do candidato logado.
    
    Permite atualizar:
    - **Dados Pessoais**: full_name, phone, rg, birth_date, genero, estado_civil, location
    - **Endereço**: cep, logradouro, numero, complemento, bairro, cidade, estado
    - **Profissional**: resume_url, linkedin_url, portfolio_url, bio
    
    Retorna o perfil atualizado com todos os dados.
    """
    try:
        logger.info(f"Atualizando perfil do candidato {candidate.id}")
        logger.debug(f"Dados recebidos: {perfil_update.model_dump()}")
        
        # Atualizar dados pessoais
        if perfil_update.full_name:
            candidate.full_name = perfil_update.full_name
        
        if perfil_update.phone:
            candidate.phone = perfil_update.phone
        
        if perfil_update.rg:
            candidate.rg = perfil_update.rg
        
        if perfil_update.birth_date:
            try:
                candidate.birth_date = datetime.strptime(perfil_update.birth_date, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Data de nascimento inválida. Use formato YYYY-MM-DD"
                )
        
        if perfil_update.genero:
            candidate.genero = perfil_update.genero
        
        if perfil_update.estado_civil:
            candidate.estado_civil = perfil_update.estado_civil
        
        if perfil_update.location:
            candidate.location = perfil_update.location
        
        # Atualizar endereço
        if perfil_update.cep:
            candidate.cep = perfil_update.cep
        
        if perfil_update.logradouro:
            candidate.logradouro = perfil_update.logradouro
        
        if perfil_update.numero:
            candidate.numero = perfil_update.numero
        
        if perfil_update.complemento:
            candidate.complemento = perfil_update.complemento
        
        if perfil_update.bairro:
            candidate.bairro = perfil_update.bairro
        
        if perfil_update.cidade:
            candidate.cidade = perfil_update.cidade
        
        if perfil_update.estado:
            candidate.estado = perfil_update.estado
        
        # Atualizar dados profissionais
        if perfil_update.resume_url:
            candidate.resume_url = perfil_update.resume_url
        
        if perfil_update.linkedin_url:
            candidate.linkedin_url = perfil_update.linkedin_url
        
        if perfil_update.portfolio_url:
            candidate.portfolio_url = perfil_update.portfolio_url
        
        if perfil_update.bio:
            candidate.bio = perfil_update.bio
        
        # Atualizar área de atuação
        if perfil_update.area_atuacao:
            candidate.area_atuacao = perfil_update.area_atuacao.lower()
        
        db.commit()
        db.refresh(candidate)
        
        return CandidatoPerfilResponse(
            id=candidate.id,
            cpf=candidate.cpf,
            full_name=candidate.full_name,
            email=candidate.user.email,
            phone=candidate.phone,
            rg=candidate.rg,
            birth_date=str(candidate.birth_date) if candidate.birth_date else None,
            genero=candidate.genero.value if candidate.genero else None,
            estado_civil=candidate.estado_civil.value if candidate.estado_civil else None,
            location=candidate.location,
            cep=candidate.cep,
            logradouro=candidate.logradouro,
            numero=candidate.numero,
            complemento=candidate.complemento,
            bairro=candidate.bairro,
            cidade=candidate.cidade,
            estado=candidate.estado,
            is_pcd=candidate.is_pcd or False,
            tipo_pcd=candidate.tipo_pcd.value if candidate.tipo_pcd else None,
            necessidades_adaptacao=candidate.necessidades_adaptacao,
            resume_url=candidate.resume_url,
            linkedin_url=candidate.linkedin_url,
            portfolio_url=candidate.portfolio_url,
            bio=candidate.bio,
            area_atuacao=candidate.area_atuacao,
            onboarding_completo=candidate.onboarding_completo or False,
            percentual_completude=candidate.percentual_completude or 0,
            created_at=candidate.user.created_at,
            updated_at=candidate.user.updated_at,
        )
    except Exception as e:
        logger.error(f"Erro ao atualizar perfil do candidato: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Erro ao atualizar perfil: {str(e)}"
        )


@router.post("/onboarding/trabalho-temporario", response_model=TrabalhoTemporarioResponse, status_code=status.HTTP_201_CREATED)
async def save_trabalho_temporario(
    payload: TrabalhoTemporarioRequest,
    user_id: int = Query(..., description="ID do usuário (user_id, não candidate_id)"),
    db: Session = Depends(get_db),
):
    """
    Salva ou atualiza informações de interesse em trabalho temporário.
    
    - **tem_interesse**: Boolean indicando interesse em trabalhos temporários
    - **tipos_trabalho**: Lista de tipos (Paradas Industriais, Manutenção, Projetos, Outlets)
    - **disponibilidade_geografica**: Estados/regiões disponíveis
    - **restricao_saude**: Restrições de saúde (opcional)
    - **experiencia_anterior**: Experiência anterior em trabalhos temporários (opcional)
    """
    # Garantir que user_id é um inteiro válido
    if not isinstance(user_id, int) or user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID do usuário inválido"
        )
    
    # Buscar candidato pelo user_id (não candidate_id)
    candidate = db.query(Candidate).filter(Candidate.user_id == user_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidato para o usuário {user_id} não encontrado"
        )
    
    # Verificar se já existe registro para este candidato
    trabalho_temporario = db.query(TrabalhoTemporarioModel).filter(
        TrabalhoTemporarioModel.candidate_id == candidate.id
    ).first()
    
    if not trabalho_temporario:
        # Criar novo registro
        trabalho_temporario = TrabalhoTemporarioModel(
            candidate_id=candidate.id,
            tem_interesse=payload.tem_interesse,
            tipos_trabalho=payload.tipos_trabalho,
            disponibilidade_geografica=payload.disponibilidade_geografica,
            restricao_saude=payload.restricao_saude,
            experiencia_anterior=payload.experiencia_anterior,
        )
        db.add(trabalho_temporario)
    else:
        # Atualizar registro existente
        trabalho_temporario.tem_interesse = payload.tem_interesse
        trabalho_temporario.tipos_trabalho = payload.tipos_trabalho
        trabalho_temporario.disponibilidade_geografica = payload.disponibilidade_geografica
        trabalho_temporario.restricao_saude = payload.restricao_saude
        trabalho_temporario.experiencia_anterior = payload.experiencia_anterior
    
    db.commit()
    db.refresh(trabalho_temporario)
    
    return TrabalhoTemporarioResponse(
        id=trabalho_temporario.id,
        candidate_id=trabalho_temporario.candidate_id,
        tem_interesse=trabalho_temporario.tem_interesse,
        tipos_trabalho=trabalho_temporario.tipos_trabalho,
        disponibilidade_geografica=trabalho_temporario.disponibilidade_geografica,
        restricao_saude=trabalho_temporario.restricao_saude,
        experiencia_anterior=trabalho_temporario.experiencia_anterior,
        created_at=trabalho_temporario.created_at,
        updated_at=trabalho_temporario.updated_at,
    )


@router.get("/onboarding/trabalho-temporario", response_model=TrabalhoTemporarioResponse)
async def get_trabalho_temporario(
    user_id: int = Query(..., description="ID do usuário (user_id, não candidate_id)"),
    db: Session = Depends(get_db),
):
    """
    Recupera informações de trabalho temporário do candidato.
    """
    # Garantir que user_id é um inteiro válido
    if not isinstance(user_id, int) or user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID do usuário inválido"
        )
    
    # Buscar candidato pelo user_id
    candidate = db.query(Candidate).filter(Candidate.user_id == user_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidato para o usuário {user_id} não encontrado"
        )
    
    # Buscar trabalho temporário pelo candidate_id
    trabalho_temporario = db.query(TrabalhoTemporarioModel).filter(
        TrabalhoTemporarioModel.candidate_id == candidate.id
    ).first()
    
    if not trabalho_temporario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Informações de trabalho temporário não encontradas"
        )
    
    return TrabalhoTemporarioResponse(
        id=trabalho_temporario.id,
        candidate_id=trabalho_temporario.candidate_id,
        tem_interesse=trabalho_temporario.tem_interesse,
        tipos_trabalho=trabalho_temporario.tipos_trabalho,
        disponibilidade_geografica=trabalho_temporario.disponibilidade_geografica,
        restricao_saude=trabalho_temporario.restricao_saude,
        experiencia_anterior=trabalho_temporario.experiencia_anterior,
        created_at=trabalho_temporario.created_at,
        updated_at=trabalho_temporario.updated_at,
    )
