"""
Endpoints para teste adaptativo com autoavaliação inicial
Implementa o sistema de classificação por níveis (Básico, Intermediário, Avançado, Especialista)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field
import logging

from app.core.database import get_db
from app.core.dependencies import get_current_candidate
from app.models.candidate import Candidate
from app.models.test import Test, Question, Alternative, TestLevel, AdaptiveTestSession, CandidateTestResult
from app.models.competencia import AutoavaliacaoCompetencia

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/candidato/testes-adaptativos", tags=["testes adaptativos"])


# ============================================================================
# SCHEMAS
# ============================================================================

class AutoavaliacaoInicial(BaseModel):
    """Schema para autoavaliação inicial do candidato"""
    habilidade: str = Field(..., description="Ex: React, Python, JavaScript")
    nivel_autoavaliacao: int = Field(..., ge=1, le=3, description="1=Básico, 2=Intermediário, 3=Avançado")
    
    class Config:
        json_schema_extra = {
            "example": {
                "habilidade": "React",
                "nivel_autoavaliacao": 2
            }
        }


class AlternativaParaTeste(BaseModel):
    """Schema de alternativa para exibição no teste"""
    id: int
    texto: str
    ordem: int
    
    class Config:
        from_attributes = True


class QuestaoParaTeste(BaseModel):
    """Schema de questão para exibição (sem resposta correta visível)"""
    id: int
    texto_questao: str
    ordem: int
    alternatives: List[AlternativaParaTeste]
    
    class Config:
        from_attributes = True


class SessaoTestAdaptativoResponse(BaseModel):
    """Schema da sessão de teste adaptativo iniciada"""
    session_id: int
    habilidade: str
    nivel_atual: str
    nivel_autoavaliacao: str
    questao_numero: int  # Qual questão está sendo exibida (1-5 para o nível)
    total_questoes_nivel: int  # Total de questões no nível atual
    questao: QuestaoParaTeste
    
    class Config:
        from_attributes = True


class RespostaQuestao(BaseModel):
    """Schema da resposta a uma questão"""
    session_id: int = Field(..., description="ID da sessão")
    question_id: int = Field(..., description="ID da questão")
    alternative_id: int = Field(..., description="ID da alternativa escolhida")


class RespostaQuestaoResponse(BaseModel):
    """Schema da resposta após submissão"""
    acertou: bool
    resposta_correta_id: int
    proxima_questao: Optional[QuestaoParaTeste] = None
    sessao_completa: bool = False
    resultado_final: Optional[Dict] = None  # Se sessão completa
    
    class Config:
        from_attributes = True


class ResultadoFinalAdaptativo(BaseModel):
    """Schema do resultado final do teste adaptativo"""
    session_id: int
    habilidade: str
    nivel_inicial_autoavaliacao: str
    nivel_final: str
    
    # Resultados por nível
    resultado_basico: Optional[Dict] = None  # {"acertos": 5, "total": 5, "testado": True/False}
    resultado_intermediario: Optional[Dict] = None
    resultado_avancado: Optional[Dict] = None
    
    # Interpretação
    mudanca_nivel: str  # "confirmado", "progrediu", "regrediu"
    descricao_resultado: str
    
    # Recomendação
    pode_avancar: bool
    proximos_passos: List[str]
    
    class Config:
        from_attributes = True


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/iniciar", response_model=SessaoTestAdaptativoResponse)
async def iniciar_teste_adaptativo(
    autoavaliacao: AutoavaliacaoInicial,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Inicia um teste adaptativo com autoavaliação inicial
    
    O sistema solicitará:
    1. Habilidade a ser testada
    2. Nível de autoavaliação (1-3)
    
    Retorna a primeira questão do nível selecionado
    """
    habilidade = autoavaliacao.habilidade.strip().lower()
    nivel_autoavaliacao = autoavaliacao.nivel_autoavaliacao
    
    # Mapear nível de autoavaliação para nome legível
    mapa_niveis = {
        1: "Básico",
        2: "Intermediário",
        3: "Avançado"
    }
    
    # Verificar se já existe sessão ativa para essa habilidade
    sessao_ativa = db.query(AdaptiveTestSession).filter(
        AdaptiveTestSession.candidate_id == current_candidate.id,
        AdaptiveTestSession.habilidade == habilidade,
        AdaptiveTestSession.is_completed == False
    ).first()
    
    if sessao_ativa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Você já possui uma sessão ativa para {habilidade}. Complete-a antes de iniciar outra."
        )
    
    # Mapear autoavaliação para nível de teste
    mapa_nivel_teste = {
        1: TestLevel.basico,
        2: TestLevel.intermediario,
        3: TestLevel.avancado
    }
    
    nivel_teste = mapa_nivel_teste[nivel_autoavaliacao]
    
    # Buscar questões do nível de autoavaliação
    questoes = db.query(Question).join(Test).filter(
        Test.habilidade.ilike(f"%{habilidade}%"),
        Test.nivel == nivel_teste
    ).order_by(func.random()).limit(5).all()
    
    if not questoes or len(questoes) < 5:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Não há questões suficientes para a habilidade '{habilidade}' no nível {mapa_niveis[nivel_autoavaliacao]}"
        )
    
    # Criar sessão
    sessao = AdaptiveTestSession(
        candidate_id=current_candidate.id,
        habilidade=habilidade,
        nivel_atual=str(nivel_teste.value),  # Armazenar valor completo (ex: "Nível 2 - Básico")
        questao_atual_index=0,
        historico_respostas=[],
        total_basico=5 if nivel_autoavaliacao == 1 else 0,
        total_intermediario=5 if nivel_autoavaliacao == 2 else 0,
        total_avancado=5 if nivel_autoavaliacao == 3 else 0,
    )
    
    db.add(sessao)
    db.commit()
    db.refresh(sessao)
    
    # Armazenar questões na sessão
    sessao.questoes_atuais = questoes
    
    # Retornar primeira questão
    primeira_questao = questoes[0]
    
    return {
        "session_id": sessao.id,
        "habilidade": habilidade,
        "nivel_atual": mapa_niveis[nivel_autoavaliacao],
        "nivel_autoavaliacao": mapa_niveis[nivel_autoavaliacao],
        "questao_numero": 1,
        "total_questoes_nivel": 5,
        "questao": {
            "id": primeira_questao.id,
            "texto_questao": primeira_questao.texto_questao,
            "ordem": primeira_questao.ordem,
            "alternatives": [
                {
                    "id": alt.id,
                    "texto": alt.texto,
                    "ordem": alt.ordem
                }
                for alt in primeira_questao.alternatives
            ]
        }
    }


@router.post("/responder", response_model=RespostaQuestaoResponse)
async def responder_questao(
    resposta: RespostaQuestao,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Submete a resposta a uma questão e retorna a próxima questão ou resultado
    """
    # Buscar sessão
    sessao = db.query(AdaptiveTestSession).filter(
        AdaptiveTestSession.id == resposta.session_id,
        AdaptiveTestSession.candidate_id == current_candidate.id,
        AdaptiveTestSession.is_completed == False
    ).first()
    
    if not sessao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão não encontrada ou já foi concluída"
        )
    
    # Buscar questão
    questao = db.query(Question).filter(Question.id == resposta.question_id).first()
    if not questao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Questão não encontrada"
        )
    
    # Buscar alternativa e verificar se está correta
    alternativa = db.query(Alternative).filter(Alternative.id == resposta.alternative_id).first()
    if not alternativa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alternativa não encontrada"
        )
    
    acertou = alternativa.is_correct
    
    # Atualizar histórico
    if not sessao.historico_respostas:
        sessao.historico_respostas = []
    
    sessao.historico_respostas.append({
        "question_id": resposta.question_id,
        "alternative_id": resposta.alternative_id,
        "is_correct": acertou,
        "nivel": sessao.nivel_atual,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # Contar acertos no nível atual
    if "Básico" in sessao.nivel_atual:
        sessao.acertos_basico += 1 if acertou else 0
    elif "Intermediário" in sessao.nivel_atual:
        sessao.acertos_intermediario += 1 if acertou else 0
    elif "Avançado" in sessao.nivel_atual:
        sessao.acertos_avancado += 1 if acertou else 0
    
    # Incrementar índice
    sessao.questao_atual_index += 1
    
    resposta_correta = db.query(Alternative).filter(
        Alternative.question_id == resposta.question_id,
        Alternative.is_correct == True
    ).first()
    
    # Verificar se tem mais questões neste nível
    tem_mais_questoes = sessao.questao_atual_index < 5
    
    proxima_questao_data = None
    sessao_completa = False
    resultado_final = None
    
    if tem_mais_questoes:
        # Buscar próxima questão do mesmo nível
        questoes = db.query(Question).join(Test).filter(
            Test.habilidade.ilike(f"%{sessao.habilidade}%"),
            Test.nivel == sessao.nivel_atual
        ).order_by(func.random()).limit(5).offset(sessao.questao_atual_index).all()
        
        if questoes:
            proxima_q = questoes[0]
            proxima_questao_data = {
                "id": proxima_q.id,
                "texto_questao": proxima_q.texto_questao,
                "ordem": proxima_q.ordem,
                "alternatives": [
                    {
                        "id": alt.id,
                        "texto": alt.texto,
                        "ordem": alt.ordem
                    }
                    for alt in proxima_q.alternatives
                ]
            }
    else:
        # Completou as 5 questões deste nível - aplicar lógica de progressão
        sessao_completa = True
        resultado_final = _calcular_resultado_adaptativo(sessao, db)
    
    db.commit()
    
    return {
        "acertou": acertou,
        "resposta_correta_id": resposta_correta.id if resposta_correta else None,
        "proxima_questao": proxima_questao_data,
        "sessao_completa": sessao_completa,
        "resultado_final": resultado_final
    }


@router.get("/sessao/{session_id}", response_model=Dict)
async def obter_sessao(
    session_id: int,
    current_candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """Obtém informações da sessão de teste"""
    sessao = db.query(AdaptiveTestSession).filter(
        AdaptiveTestSession.id == session_id,
        AdaptiveTestSession.candidate_id == current_candidate.id
    ).first()
    
    if not sessao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão não encontrada"
        )
    
    return {
        "id": sessao.id,
        "habilidade": sessao.habilidade,
        "nivel_atual": sessao.nivel_atual,
        "questao_atual": sessao.questao_atual_index + 1,
        "is_completed": sessao.is_completed,
        "nivel_final": sessao.nivel_final_atingido if sessao.is_completed else None,
        "started_at": sessao.started_at,
        "completed_at": sessao.completed_at
    }


# ============================================================================
# FUNÇÕES AUXILIARES
# ============================================================================

def _calcular_resultado_adaptativo(sessao: AdaptiveTestSession, db: Session) -> Dict:
    """
    Calcula o resultado final do teste baseado nas regras de progressão/regressão
    
    Regras:
    - Se começou no Nível 2 (Intermediário):
        - 0-1 acertos → Nível Básico (sem testar básico)
        - 2-3 acertos → Nível Intermediário
        - 4-5 acertos → Testa Nível 3 (Avançado)
    
    - Se começou no Nível 3 (Avançado):
        - 0-1 acertos → Nível Intermediário
        - 2-4 acertos → Nível Avançado
        - 5 acertos → Nível Especialista
    
    - Se começou no Nível 1 (Básico):
        - Sempre ≥3 → Nível Básico
    """
    
    mapa_niveis_inverso = {
        "Nível 2 - Básico": 1,
        "Nível 3 - Intermediário": 2,
        "Nível 4 - Avançado": 3,
        "Nível 5 - Expert": 4
    }
    
    nivel_numero = mapa_niveis_inverso.get(sessao.nivel_atual, 1)
    
    if nivel_numero == 2:  # Começou no Intermediário
        if sessao.acertos_intermediario <= 1:
            nivel_final = "Nível 2 - Básico"
            mudanca = "regrediu"
            descricao = f"Seu desempenho foi abaixo do esperado ({sessao.acertos_intermediario}/5 acertos). Classificado como Básico."
        elif sessao.acertos_intermediario <= 3:
            nivel_final = "Nível 3 - Intermediário"
            mudanca = "confirmado"
            descricao = f"Seu nível foi confirmado como Intermediário ({sessao.acertos_intermediario}/5 acertos)."
        else:  # 4 ou 5 acertos
            # Precisa testar Avançado
            # TODO: Aplicar teste Avançado
            nivel_final = "Nível 3 - Intermediário"  # Temporário
            mudanca = "progrediu"
            descricao = f"Desempenho excelente ({sessao.acertos_intermediario}/5)! Teste de Avançado necessário."
    
    elif nivel_numero == 3:  # Começou no Avançado
        if sessao.acertos_avancado <= 1:
            nivel_final = "Nível 3 - Intermediário"
            mudanca = "regrediu"
            descricao = f"Desempenho abaixo do esperado ({sessao.acertos_avancado}/5). Reclassificado como Intermediário."
        elif sessao.acertos_avancado <= 4:
            nivel_final = "Nível 4 - Avançado"
            mudanca = "confirmado"
            descricao = f"Nível Avançado confirmado ({sessao.acertos_avancado}/5 acertos)."
        else:  # 5 acertos
            nivel_final = "Nível 5 - Expert"
            mudanca = "progrediu"
            descricao = "Parabéns! Você atingiu o nível Especialista (100% de acertos)!"
    
    else:  # Começou no Básico
        if sessao.acertos_basico >= 3:
            nivel_final = "Nível 2 - Básico"
            mudanca = "confirmado"
            descricao = f"Nível Básico confirmado ({sessao.acertos_basico}/5 acertos)."
        else:
            nivel_final = "Nível 1 - Iniciante"
            mudanca = "regrediu"
            descricao = f"Desempenho insuficiente ({sessao.acertos_basico}/5). Continue praticando!"
    
    # Atualizar sessão
    sessao.is_completed = True
    sessao.nivel_final_atingido = nivel_final
    sessao.completed_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "session_id": sessao.id,
        "habilidade": sessao.habilidade,
        "nivel_final": nivel_final,
        "mudanca_nivel": mudanca,
        "descricao_resultado": descricao,
        "acertos_intermediario": sessao.acertos_intermediario if sessao.total_intermediario > 0 else None,
        "acertos_avancado": sessao.acertos_avancado if sessao.total_avancado > 0 else None,
        "acertos_basico": sessao.acertos_basico if sessao.total_basico > 0 else None
    }
