"""
Endpoints para Teste de Certificação de Competências (BD CC)

Implementa a lógica de progressão por níveis:
- Inicia com 5 questões nível Básico
- ≥3 acertos → Progride para Intermediário (mais 5 questões)
- ≥3 acertos → Progride para Avançado (mais 5 questões)
- Classifica final: N0, N1, N2, N3 ou N4

Tempo estimado: 30-60 min (dependendo da progressão)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import logging

from app.core.database import get_db
from app.core.dependencies import get_current_candidate, get_current_company
from app.models.candidate import Candidate
from app.models.company import Company
from app.models.test import Test, Question, Alternative, TestLevel
from app.models.competencia import (
    CertificacaoSessao, 
    CertificacaoCompetencia, 
    MapaCompetencias,
    AutoavaliacaoCompetencia,
    NivelCertificado,
    NivelProficiencia
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/certificacao", tags=["certificacao competencias"])


# ============================================================================
# CONSTANTES - REGRAS DE PROGRESSÃO
# ============================================================================

QUESTOES_POR_NIVEL = 5

# Critérios de classificação por nível (conforme tabela de certificação)
# BÁSICO: 0-2=N0, 3=N1, 4-5=progride
# INTERMEDIÁRIO: 1-2=N1, 3=N2, 4-5=progride  
# AVANÇADO: 0-2=N2, 3-4=N3, 5=N4
ACERTOS_PROGRESSAO_MINIMO = 4  # ≥4 para progredir para próximo nível
ACERTOS_CERTIFICAR_NIVEL = 3   # =3 para certificar no nível atual (sem progredir)
ACERTOS_ESPECIALISTA = 5       # 5/5 no avançado para N4

# Mapeamento de níveis
NIVEIS_ORDEM = ["basico", "intermediario", "avancado"]
NIVEL_PARA_TEST_LEVEL = {
    "basico": TestLevel.basico,
    "intermediario": TestLevel.intermediario,
    "avancado": TestLevel.avancado
}


# ============================================================================
# SCHEMAS
# ============================================================================

class IniciarCertificacaoRequest(BaseModel):
    """Request para iniciar teste de certificação"""
    competencia: str = Field(..., min_length=1, max_length=255, description="Nome da competência a ser testada")
    
    class Config:
        json_schema_extra = {
            "example": {"competencia": "Python"}
        }


class AlternativaResponse(BaseModel):
    """Alternativa de questão"""
    id: int
    texto: str
    ordem: int
    
    class Config:
        from_attributes = True


class QuestaoResponse(BaseModel):
    """Questão para o teste"""
    id: int
    texto_questao: str
    alternatives: List[AlternativaResponse]
    
    class Config:
        from_attributes = True


class SessaoInfoResponse(BaseModel):
    """Informações da sessão de certificação"""
    session_id: int
    competencia: str
    nivel_atual: str
    nivel_atual_display: str
    questao_numero: int
    total_questoes_nivel: int
    progresso_geral: str
    tempo_decorrido_segundos: int
    questao: Optional[QuestaoResponse] = None
    
    class Config:
        from_attributes = True


class ResponderQuestaoRequest(BaseModel):
    """Request para responder uma questão"""
    session_id: int
    question_id: int
    alternative_id: int


class ResponderQuestaoResponse(BaseModel):
    """Response após responder questão"""
    acertou: bool
    resposta_correta_id: int
    acertos_nivel_atual: int
    total_nivel_atual: int
    
    # Próxima ação
    proxima_questao: Optional[QuestaoResponse] = None
    progrediu_nivel: bool = False
    novo_nivel: Optional[str] = None
    
    # Finalização
    teste_finalizado: bool = False
    resultado_final: Optional[Dict] = None


class ResultadoCertificacaoResponse(BaseModel):
    """Resultado final da certificação"""
    session_id: int
    competencia: str
    
    # Resultado por nível
    resultado_basico: Dict[str, int]  # {"acertos": X, "total": 5}
    resultado_intermediario: Optional[Dict[str, int]] = None
    resultado_avancado: Optional[Dict[str, int]] = None
    
    # Classificação final
    nivel_certificado: int  # 0-4
    nivel_nome: str  # "N1 - Básico", etc.
    nivel_descricao: str
    
    # Comparação com autoavaliação
    nivel_autoavaliacao: Optional[int] = None
    diferenca: Optional[int] = None
    analise_comparacao: Optional[str] = None
    
    # Tempo
    tempo_total_minutos: int
    data_certificacao: datetime


class MapaCompetenciasResponse(BaseModel):
    """Mapa de competências Auto x Certificação"""
    competencia: str
    nivel_autoavaliacao: Optional[int] = None
    nivel_autoavaliacao_nome: Optional[str] = None
    nivel_certificado: Optional[int] = None
    nivel_certificado_nome: Optional[str] = None
    diferenca: Optional[int] = None
    confiabilidade: Optional[str] = None
    status: str


# ============================================================================
# FUNÇÕES AUXILIARES
# ============================================================================

def _obter_questoes_nivel(db: Session, competencia: str, nivel: str, questoes_usadas: List[int], quantidade: int = 5) -> List[Question]:
    """Obtém questões para um nível específico, excluindo já usadas"""
    test_level = NIVEL_PARA_TEST_LEVEL.get(nivel)
    
    query = db.query(Question).join(Test).filter(
        Test.habilidade.ilike(f"%{competencia}%"),
        Test.nivel == test_level
    )
    
    if questoes_usadas:
        query = query.filter(~Question.id.in_(questoes_usadas))
    
    questoes = query.order_by(func.random()).limit(quantidade).all()
    return questoes


def _calcular_nivel_final(sessao: CertificacaoSessao) -> int:
    """
    Calcula o nível final de certificação baseado nos acertos
    
    Critério conforme tabela de certificação:
    
    BÁSICO (5 questões):
    - 0-2 acertos → N0 (sem contato)
    - 3 acertos → N1 (básico)
    - 4-5 acertos → progride para intermediário
    
    INTERMEDIÁRIO (5 questões):
    - 1-2 acertos → N1 (básico)
    - 3 acertos → N2 (intermediário)
    - 4-5 acertos → progride para avançado
    
    AVANÇADO (5 questões):
    - 0-2 acertos → N2 (intermediário - mantém conquista anterior)
    - 3-4 acertos → N3 (avançado)
    - 5 acertos → N4 (especialista)
    """
    # Se não chegou ao Intermediário (parou no Básico)
    if sessao.total_intermediario == 0:
        if sessao.acertos_basico <= 2:
            return 0  # N0 - Sem contato
        elif sessao.acertos_basico == 3:
            return 1  # N1 - Básico
        else:  # 4-5 acertos - deveria ter progredido (caso de borda)
            return 1  # N1 - Básico
    
    # Se não chegou ao Avançado (parou no Intermediário)
    if sessao.total_avancado == 0:
        if sessao.acertos_intermediario <= 2:
            return 1  # N1 - Básico (não confirmou intermediário)
        elif sessao.acertos_intermediario == 3:
            return 2  # N2 - Intermediário
        else:  # 4-5 acertos - deveria ter progredido (caso de borda)
            return 2  # N2 - Intermediário
    
    # Chegou no Avançado
    if sessao.acertos_avancado <= 2:
        return 2  # N2 - Intermediário (mantém conquista anterior)
    elif sessao.acertos_avancado <= 4:
        return 3  # N3 - Avançado (3 ou 4 acertos)
    else:  # 5 acertos
        return 4  # N4 - Especialista (perfeito)


def _questao_para_response(questao: Question) -> Dict:
    """Converte questão para response"""
    return {
        "id": questao.id,
        "texto_questao": questao.texto_questao,
        "alternatives": [
            {"id": alt.id, "texto": alt.texto, "ordem": alt.ordem}
            for alt in sorted(questao.alternatives, key=lambda x: x.ordem)
        ]
    }


def _atualizar_mapa_competencias(db: Session, candidate_id: int, competencia_nome: str, 
                                  nivel_cert: int = None, nivel_auto: int = None):
    """Atualiza ou cria entrada no mapa de competências"""
    mapa = db.query(MapaCompetencias).filter(
        MapaCompetencias.candidate_id == candidate_id,
        MapaCompetencias.competencia_nome == competencia_nome
    ).first()
    
    if not mapa:
        mapa = MapaCompetencias(
            candidate_id=candidate_id,
            competencia_nome=competencia_nome
        )
        db.add(mapa)
    
    if nivel_cert is not None:
        mapa.nivel_certificado = nivel_cert
    if nivel_auto is not None:
        mapa.nivel_autoavaliacao = nivel_auto
    
    # Calcular diferença e confiabilidade
    if mapa.nivel_autoavaliacao is not None and mapa.nivel_certificado is not None:
        mapa.diferenca = mapa.nivel_autoavaliacao - mapa.nivel_certificado
        
        if abs(mapa.diferenca) == 0:
            mapa.confiabilidade = "alta"
        elif abs(mapa.diferenca) == 1:
            mapa.confiabilidade = "media"
        else:
            mapa.confiabilidade = "baixa"
    
    db.commit()
    return mapa


# ============================================================================
# ENDPOINTS - CANDIDATO
# ============================================================================

@router.post("/iniciar", response_model=SessaoInfoResponse)
async def iniciar_certificacao(
    request: IniciarCertificacaoRequest,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Inicia um teste de certificação para uma competência
    
    O teste começa sempre no nível Básico com 5 questões.
    A progressão para níveis superiores depende do desempenho.
    """
    competencia = request.competencia.strip()
    
    # Verificar se há sessão ativa para esta competência
    sessao_ativa = db.query(CertificacaoSessao).filter(
        CertificacaoSessao.candidate_id == current_candidate.id,
        CertificacaoSessao.competencia_nome.ilike(f"%{competencia}%"),
        CertificacaoSessao.is_completed == False
    ).first()
    
    if sessao_ativa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Você já tem uma sessão ativa para '{competencia}'. Complete ou cancele antes de iniciar outra."
        )
    
    # Buscar questões do nível Básico
    questoes = _obter_questoes_nivel(db, competencia, "basico", [], QUESTOES_POR_NIVEL)
    
    if len(questoes) < QUESTOES_POR_NIVEL:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Não há questões suficientes para '{competencia}' no nível Básico. Necessário: {QUESTOES_POR_NIVEL}, encontrado: {len(questoes)}"
        )
    
    # Criar sessão
    sessao = CertificacaoSessao(
        candidate_id=current_candidate.id,
        competencia_nome=competencia,
        nivel_atual="basico",
        questao_atual_index=0,
        total_basico=QUESTOES_POR_NIVEL,
        historico_respostas=[],
        questoes_usadas=[q.id for q in questoes]
    )
    
    db.add(sessao)
    db.commit()
    db.refresh(sessao)
    
    # Armazenar questões na sessão (cache em memória para este request)
    primeira_questao = questoes[0]
    
    return {
        "session_id": sessao.id,
        "competencia": competencia,
        "nivel_atual": "basico",
        "nivel_atual_display": "Nível 1 - Básico",
        "questao_numero": 1,
        "total_questoes_nivel": QUESTOES_POR_NIVEL,
        "progresso_geral": "Etapa 1 de até 3",
        "tempo_decorrido_segundos": 0,
        "questao": _questao_para_response(primeira_questao)
    }


@router.post("/responder", response_model=ResponderQuestaoResponse)
async def responder_questao(
    request: ResponderQuestaoRequest,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Submete resposta para uma questão do teste de certificação
    
    Retorna feedback imediato e próxima questão ou resultado.
    """
    # Buscar sessão
    sessao = db.query(CertificacaoSessao).filter(
        CertificacaoSessao.id == request.session_id,
        CertificacaoSessao.candidate_id == current_candidate.id,
        CertificacaoSessao.is_completed == False
    ).first()
    
    if not sessao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão não encontrada ou já finalizada"
        )
    
    # Validar questão
    questao = db.query(Question).filter(Question.id == request.question_id).first()
    if not questao:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    
    # Validar alternativa
    alternativa = db.query(Alternative).filter(
        Alternative.id == request.alternative_id,
        Alternative.question_id == request.question_id
    ).first()
    
    if not alternativa:
        raise HTTPException(status_code=404, detail="Alternativa não encontrada")
    
    # Verificar se acertou
    acertou = alternativa.is_correct
    
    # Buscar resposta correta
    resposta_correta = db.query(Alternative).filter(
        Alternative.question_id == request.question_id,
        Alternative.is_correct == True
    ).first()
    
    # Registrar no histórico
    if not sessao.historico_respostas:
        sessao.historico_respostas = []
    
    sessao.historico_respostas = sessao.historico_respostas + [{
        "question_id": request.question_id,
        "alternative_id": request.alternative_id,
        "is_correct": acertou,
        "nivel": sessao.nivel_atual,
        "timestamp": datetime.utcnow().isoformat()
    }]
    
    # Atualizar contadores do nível atual
    if sessao.nivel_atual == "basico":
        if acertou:
            sessao.acertos_basico += 1
    elif sessao.nivel_atual == "intermediario":
        if acertou:
            sessao.acertos_intermediario += 1
    elif sessao.nivel_atual == "avancado":
        if acertou:
            sessao.acertos_avancado += 1
    
    # Incrementar índice da questão
    sessao.questao_atual_index += 1
    
    # Calcular acertos do nível atual
    if sessao.nivel_atual == "basico":
        acertos_atual = sessao.acertos_basico
        total_atual = sessao.total_basico
    elif sessao.nivel_atual == "intermediario":
        acertos_atual = sessao.acertos_intermediario
        total_atual = sessao.total_intermediario
    else:
        acertos_atual = sessao.acertos_avancado
        total_atual = sessao.total_avancado
    
    # Verificar se completou as questões do nível atual
    questoes_respondidas_nivel = len([
        r for r in sessao.historico_respostas 
        if r["nivel"] == sessao.nivel_atual
    ])
    
    progrediu_nivel = False
    novo_nivel = None
    teste_finalizado = False
    resultado_final = None
    proxima_questao = None
    
    if questoes_respondidas_nivel >= QUESTOES_POR_NIVEL:
        # Completou o nível atual - verificar progressão conforme critério:
        # BÁSICO: 0-2=N0 (encerra), 3=N1 (encerra), 4-5=progride
        # INTERMEDIÁRIO: 1-2=N1 (encerra), 3=N2 (encerra), 4-5=progride
        # AVANÇADO: 0-2=N2 (encerra), 3-4=N3 (encerra), 5=N4 (encerra)
        
        if sessao.nivel_atual == "basico":
            if sessao.acertos_basico >= ACERTOS_PROGRESSAO_MINIMO:  # 4 ou 5 acertos
                # Progride para Intermediário
                sessao.nivel_atual = "intermediario"
                sessao.total_intermediario = QUESTOES_POR_NIVEL
                sessao.questao_atual_index = 0
                progrediu_nivel = True
                novo_nivel = "intermediario"
            else:
                # 0-3 acertos: N0 (0-2) ou N1 (3) - finaliza
                teste_finalizado = True
        
        elif sessao.nivel_atual == "intermediario":
            if sessao.acertos_intermediario >= ACERTOS_PROGRESSAO_MINIMO:  # 4 ou 5 acertos
                # Progride para Avançado
                sessao.nivel_atual = "avancado"
                sessao.total_avancado = QUESTOES_POR_NIVEL
                sessao.questao_atual_index = 0
                progrediu_nivel = True
                novo_nivel = "avancado"
            else:
                # 1-3 acertos: N1 (1-2) ou N2 (3) - finaliza
                teste_finalizado = True
        
        elif sessao.nivel_atual == "avancado":
            # Avançado sempre finaliza: N2 (0-2), N3 (3-4), N4 (5)
            teste_finalizado = True
    
    # Se progrediu, buscar questões do novo nível
    if progrediu_nivel and not teste_finalizado:
        questoes_usadas = sessao.questoes_usadas or []
        novas_questoes = _obter_questoes_nivel(
            db, sessao.competencia_nome, novo_nivel, 
            questoes_usadas, QUESTOES_POR_NIVEL
        )
        
        if len(novas_questoes) < QUESTOES_POR_NIVEL:
            # Não há questões suficientes - finaliza no nível atual
            teste_finalizado = True
            logger.warning(f"Questões insuficientes para nível {novo_nivel}")
        else:
            sessao.questoes_usadas = questoes_usadas + [q.id for q in novas_questoes]
            proxima_questao = _questao_para_response(novas_questoes[0])
    
    # Se não progrediu e não finalizou, buscar próxima questão do nível atual
    elif not teste_finalizado:
        questoes_nivel = db.query(Question).filter(
            Question.id.in_(sessao.questoes_usadas or [])
        ).join(Test).filter(
            Test.nivel == NIVEL_PARA_TEST_LEVEL.get(sessao.nivel_atual)
        ).all()
        
        # Filtrar questões já respondidas
        questoes_respondidas_ids = [r["question_id"] for r in sessao.historico_respostas]
        questoes_disponiveis = [q for q in questoes_nivel if q.id not in questoes_respondidas_ids]
        
        if questoes_disponiveis:
            proxima_questao = _questao_para_response(questoes_disponiveis[0])
        else:
            # Buscar novas questões
            novas_questoes = _obter_questoes_nivel(
                db, sessao.competencia_nome, sessao.nivel_atual,
                questoes_respondidas_ids, 1
            )
            if novas_questoes:
                sessao.questoes_usadas = (sessao.questoes_usadas or []) + [novas_questoes[0].id]
                proxima_questao = _questao_para_response(novas_questoes[0])
    
    # Se finalizou, calcular resultado
    if teste_finalizado:
        sessao.is_completed = True
        sessao.completed_at = datetime.utcnow()
        sessao.tempo_total_segundos = int((sessao.completed_at - sessao.started_at).total_seconds())
        
        nivel_final = _calcular_nivel_final(sessao)
        sessao.nivel_final_certificado = nivel_final
        
        # Buscar autoavaliação para comparação
        autoavaliacao = db.query(AutoavaliacaoCompetencia).join(
            AutoavaliacaoCompetencia.competencia
        ).filter(
            AutoavaliacaoCompetencia.candidate_id == current_candidate.id
        ).first()
        
        nivel_auto = None
        if autoavaliacao:
            nivel_auto = autoavaliacao.nivel_declarado
        
        # Criar registro de certificação
        diferenca = (nivel_auto - nivel_final) if nivel_auto is not None else None
        
        certificacao = CertificacaoCompetencia(
            candidate_id=current_candidate.id,
            competencia_nome=sessao.competencia_nome,
            sessao_id=sessao.id,
            nivel_certificado=nivel_final,
            acertos_basico=sessao.acertos_basico,
            acertos_intermediario=sessao.acertos_intermediario,
            acertos_avancado=sessao.acertos_avancado,
            nivel_autoavaliacao=nivel_auto,
            diferenca_auto_cert=diferenca,
            valido_ate=datetime.utcnow() + timedelta(days=365)  # Válido por 1 ano
        )
        db.add(certificacao)
        
        # Atualizar mapa de competências
        _atualizar_mapa_competencias(
            db, current_candidate.id, sessao.competencia_nome,
            nivel_cert=nivel_final, nivel_auto=nivel_auto
        )
        
        # Preparar resultado final
        resultado_final = {
            "session_id": sessao.id,
            "competencia": sessao.competencia_nome,
            "resultado_basico": {"acertos": sessao.acertos_basico, "total": sessao.total_basico},
            "resultado_intermediario": {
                "acertos": sessao.acertos_intermediario, 
                "total": sessao.total_intermediario
            } if sessao.total_intermediario > 0 else None,
            "resultado_avancado": {
                "acertos": sessao.acertos_avancado, 
                "total": sessao.total_avancado
            } if sessao.total_avancado > 0 else None,
            "nivel_certificado": nivel_final,
            "nivel_nome": NivelCertificado.get_nome(nivel_final),
            "nivel_descricao": NivelCertificado.get_descricao(nivel_final),
            "nivel_autoavaliacao": nivel_auto,
            "diferenca": diferenca,
            "analise_comparacao": _gerar_analise_comparacao(nivel_auto, nivel_final) if nivel_auto is not None else None,
            "tempo_total_minutos": sessao.tempo_total_segundos // 60,
            "data_certificacao": datetime.utcnow()
        }
    
    db.commit()
    
    return {
        "acertou": acertou,
        "resposta_correta_id": resposta_correta.id if resposta_correta else None,
        "acertos_nivel_atual": acertos_atual,
        "total_nivel_atual": total_atual,
        "proxima_questao": proxima_questao,
        "progrediu_nivel": progrediu_nivel,
        "novo_nivel": novo_nivel,
        "teste_finalizado": teste_finalizado,
        "resultado_final": resultado_final
    }


def _gerar_analise_comparacao(nivel_auto: int, nivel_cert: int) -> str:
    """Gera análise textual da comparação auto x certificação"""
    diferenca = nivel_auto - nivel_cert
    
    if diferenca == 0:
        return "Sua autoavaliação foi precisa! O resultado do teste confirmou seu nível declarado."
    elif diferenca > 0:
        return f"Você superestimou seu nível em {diferenca} ponto(s). O teste identificou oportunidades de desenvolvimento."
    else:
        return f"Você subestimou seu nível em {abs(diferenca)} ponto(s)! Você demonstrou mais conhecimento do que declarou."


@router.get("/sessao/{session_id}", response_model=SessaoInfoResponse)
async def obter_sessao(
    session_id: int,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """Obtém informações da sessão atual de certificação"""
    sessao = db.query(CertificacaoSessao).filter(
        CertificacaoSessao.id == session_id,
        CertificacaoSessao.candidate_id == current_candidate.id
    ).first()
    
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    tempo_decorrido = int((datetime.utcnow() - sessao.started_at).total_seconds())
    
    # Determinar próxima questão
    proxima_questao = None
    if not sessao.is_completed:
        questoes_respondidas_ids = [r["question_id"] for r in (sessao.historico_respostas or [])]
        questoes_disponiveis = db.query(Question).filter(
            Question.id.in_(sessao.questoes_usadas or []),
            ~Question.id.in_(questoes_respondidas_ids)
        ).join(Test).filter(
            Test.nivel == NIVEL_PARA_TEST_LEVEL.get(sessao.nivel_atual)
        ).first()
        
        if questoes_disponiveis:
            proxima_questao = _questao_para_response(questoes_disponiveis)
    
    # Calcular questão atual no nível
    questoes_nivel_respondidas = len([
        r for r in (sessao.historico_respostas or [])
        if r["nivel"] == sessao.nivel_atual
    ])
    
    nivel_display_map = {
        "basico": "Nível 1 - Básico",
        "intermediario": "Nível 2 - Intermediário",
        "avancado": "Nível 3 - Avançado"
    }
    
    progresso_map = {
        "basico": "Etapa 1 de até 3",
        "intermediario": "Etapa 2 de até 3",
        "avancado": "Etapa 3 de 3"
    }
    
    return {
        "session_id": sessao.id,
        "competencia": sessao.competencia_nome,
        "nivel_atual": sessao.nivel_atual,
        "nivel_atual_display": nivel_display_map.get(sessao.nivel_atual, sessao.nivel_atual),
        "questao_numero": questoes_nivel_respondidas + 1,
        "total_questoes_nivel": QUESTOES_POR_NIVEL,
        "progresso_geral": progresso_map.get(sessao.nivel_atual, ""),
        "tempo_decorrido_segundos": tempo_decorrido,
        "questao": proxima_questao
    }


@router.get("/resultado/{session_id}", response_model=ResultadoCertificacaoResponse)
async def obter_resultado(
    session_id: int,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """Obtém o resultado final de uma sessão de certificação"""
    sessao = db.query(CertificacaoSessao).filter(
        CertificacaoSessao.id == session_id,
        CertificacaoSessao.candidate_id == current_candidate.id,
        CertificacaoSessao.is_completed == True
    ).first()
    
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão não encontrada ou não finalizada")
    
    # Buscar certificação
    certificacao = db.query(CertificacaoCompetencia).filter(
        CertificacaoCompetencia.sessao_id == session_id
    ).first()
    
    return {
        "session_id": sessao.id,
        "competencia": sessao.competencia_nome,
        "resultado_basico": {"acertos": sessao.acertos_basico, "total": sessao.total_basico},
        "resultado_intermediario": {
            "acertos": sessao.acertos_intermediario,
            "total": sessao.total_intermediario
        } if sessao.total_intermediario > 0 else None,
        "resultado_avancado": {
            "acertos": sessao.acertos_avancado,
            "total": sessao.total_avancado
        } if sessao.total_avancado > 0 else None,
        "nivel_certificado": sessao.nivel_final_certificado,
        "nivel_nome": NivelCertificado.get_nome(sessao.nivel_final_certificado),
        "nivel_descricao": NivelCertificado.get_descricao(sessao.nivel_final_certificado),
        "nivel_autoavaliacao": certificacao.nivel_autoavaliacao if certificacao else None,
        "diferenca": certificacao.diferenca_auto_cert if certificacao else None,
        "analise_comparacao": _gerar_analise_comparacao(
            certificacao.nivel_autoavaliacao, 
            sessao.nivel_final_certificado
        ) if certificacao and certificacao.nivel_autoavaliacao is not None else None,
        "tempo_total_minutos": (sessao.tempo_total_segundos or 0) // 60,
        "data_certificacao": sessao.completed_at or datetime.utcnow()
    }


@router.delete("/sessao/{session_id}")
async def cancelar_sessao(
    session_id: int,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """Cancela uma sessão de certificação em andamento"""
    sessao = db.query(CertificacaoSessao).filter(
        CertificacaoSessao.id == session_id,
        CertificacaoSessao.candidate_id == current_candidate.id,
        CertificacaoSessao.is_completed == False
    ).first()
    
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão não encontrada ou já finalizada")
    
    db.delete(sessao)
    db.commit()
    
    return {"message": "Sessão cancelada com sucesso"}


@router.get("/minhas-certificacoes", response_model=List[ResultadoCertificacaoResponse])
async def listar_minhas_certificacoes(
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """Lista todas as certificações do candidato"""
    sessoes = db.query(CertificacaoSessao).filter(
        CertificacaoSessao.candidate_id == current_candidate.id,
        CertificacaoSessao.is_completed == True
    ).order_by(CertificacaoSessao.completed_at.desc()).all()
    
    resultados = []
    for sessao in sessoes:
        certificacao = db.query(CertificacaoCompetencia).filter(
            CertificacaoCompetencia.sessao_id == sessao.id
        ).first()
        
        resultados.append({
            "session_id": sessao.id,
            "competencia": sessao.competencia_nome,
            "resultado_basico": {"acertos": sessao.acertos_basico, "total": sessao.total_basico},
            "resultado_intermediario": {
                "acertos": sessao.acertos_intermediario,
                "total": sessao.total_intermediario
            } if sessao.total_intermediario > 0 else None,
            "resultado_avancado": {
                "acertos": sessao.acertos_avancado,
                "total": sessao.total_avancado
            } if sessao.total_avancado > 0 else None,
            "nivel_certificado": sessao.nivel_final_certificado,
            "nivel_nome": NivelCertificado.get_nome(sessao.nivel_final_certificado),
            "nivel_descricao": NivelCertificado.get_descricao(sessao.nivel_final_certificado),
            "nivel_autoavaliacao": certificacao.nivel_autoavaliacao if certificacao else None,
            "diferenca": certificacao.diferenca_auto_cert if certificacao else None,
            "analise_comparacao": None,
            "tempo_total_minutos": (sessao.tempo_total_segundos or 0) // 60,
            "data_certificacao": sessao.completed_at or datetime.utcnow()
        })
    
    return resultados


# ============================================================================
# ENDPOINTS - MAPA DE COMPETÊNCIAS
# ============================================================================

@router.get("/mapa", response_model=List[MapaCompetenciasResponse])
async def obter_mapa_competencias(
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Obtém o mapa consolidado de competências do candidato
    Mostra comparação entre autoavaliação e certificação
    """
    mapas = db.query(MapaCompetencias).filter(
        MapaCompetencias.candidate_id == current_candidate.id
    ).order_by(MapaCompetencias.competencia_nome).all()
    
    resultados = []
    for mapa in mapas:
        resultados.append({
            "competencia": mapa.competencia_nome,
            "nivel_autoavaliacao": mapa.nivel_autoavaliacao,
            "nivel_autoavaliacao_nome": NivelProficiencia.get_nome(mapa.nivel_autoavaliacao) if mapa.nivel_autoavaliacao is not None else None,
            "nivel_certificado": mapa.nivel_certificado,
            "nivel_certificado_nome": NivelCertificado.get_nome(mapa.nivel_certificado) if mapa.nivel_certificado is not None else None,
            "diferenca": mapa.diferenca,
            "confiabilidade": mapa.confiabilidade,
            "status": mapa.status
        })
    
    return resultados


# ============================================================================
# ENDPOINTS - EMPRESA (Consulta)
# ============================================================================

@router.get("/empresa/candidatos-certificados")
async def listar_candidatos_certificados(
    competencia: Optional[str] = None,
    nivel_minimo: int = 0,
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Lista candidatos com certificações (para empresas)
    Permite filtrar por competência e nível mínimo
    """
    query = db.query(CertificacaoCompetencia).filter(
        CertificacaoCompetencia.is_valido == True,
        CertificacaoCompetencia.nivel_certificado >= nivel_minimo
    )
    
    if competencia:
        query = query.filter(
            CertificacaoCompetencia.competencia_nome.ilike(f"%{competencia}%")
        )
    
    certificacoes = query.order_by(
        CertificacaoCompetencia.nivel_certificado.desc()
    ).all()
    
    # Agrupar por candidato
    candidatos = {}
    for cert in certificacoes:
        if cert.candidate_id not in candidatos:
            candidatos[cert.candidate_id] = {
                "candidate_id": cert.candidate_id,
                "certificacoes": []
            }
        
        candidatos[cert.candidate_id]["certificacoes"].append({
            "competencia": cert.competencia_nome,
            "nivel_certificado": cert.nivel_certificado,
            "nivel_nome": NivelCertificado.get_nome(cert.nivel_certificado),
            "data_certificacao": cert.certified_at,
            "confiabilidade": "alta" if cert.diferenca_auto_cert == 0 else (
                "media" if abs(cert.diferenca_auto_cert or 0) == 1 else "baixa"
            ) if cert.diferenca_auto_cert is not None else None
        })
    
    return list(candidatos.values())


@router.get("/empresa/estatisticas-certificacoes")
async def estatisticas_certificacoes(
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Estatísticas agregadas de certificações para empresas
    """
    # Total de certificações por competência
    por_competencia = db.query(
        CertificacaoCompetencia.competencia_nome,
        func.count(CertificacaoCompetencia.id).label("total"),
        func.avg(CertificacaoCompetencia.nivel_certificado).label("nivel_medio")
    ).filter(
        CertificacaoCompetencia.is_valido == True
    ).group_by(
        CertificacaoCompetencia.competencia_nome
    ).all()
    
    # Distribuição por nível
    por_nivel = db.query(
        CertificacaoCompetencia.nivel_certificado,
        func.count(CertificacaoCompetencia.id).label("total")
    ).filter(
        CertificacaoCompetencia.is_valido == True
    ).group_by(
        CertificacaoCompetencia.nivel_certificado
    ).all()
    
    return {
        "por_competencia": [
            {
                "competencia": c.competencia_nome,
                "total_certificados": c.total,
                "nivel_medio": round(c.nivel_medio, 2)
            }
            for c in por_competencia
        ],
        "por_nivel": [
            {
                "nivel": n.nivel_certificado,
                "nivel_nome": NivelCertificado.get_nome(n.nivel_certificado),
                "total": n.total
            }
            for n in por_nivel
        ],
        "total_certificacoes": sum(n.total for n in por_nivel)
    }
