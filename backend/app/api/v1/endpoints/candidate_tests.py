"""
Endpoints para candidatos acessarem e responderem testes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json
import logging

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_candidate
from app.models.user import User, UserType
from app.models.candidate import Candidate
from app.models.test import Test, Question, Alternative, TestLevel, AdaptiveTestSession, CandidateTestResult
from app.schemas.test import (
    TestResponse, QuestionResponse, AlternativeResponse,
    AdaptiveTestSessionStart, NextQuestionResponse, QuestionWithAlternatives,
    AnswerQuestionRequest, AdaptiveTestResult
)
from app.services.adaptive_test_service import AdaptiveTestService
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/candidates/testes", tags=["testes do candidato"])


# ============================================================================
# SCHEMAS
# ============================================================================

class AlternativaSimples(BaseModel):
    """Schema simplificado de alternativa para o candidato"""
    id: int
    texto: str
    ordem: int
    
    class Config:
        from_attributes = True


class QuestaoComAlternativas(BaseModel):
    """Schema de questão com alternativas (sem resposta correta visível)"""
    id: int
    texto_questao: str
    pergunta: Optional[str] = None  # Alias para texto_questao
    ordem: int
    alternatives: List[AlternativaSimples]
    opcoes: Optional[List[AlternativaSimples]] = None  # Alias para alternatives
    
    class Config:
        from_attributes = True
        populate_by_name = True


class TesteDisponivel(BaseModel):
    """Schema do teste disponível para candidato"""
    id: int
    nome: str
    habilidade: str
    nivel: str
    descricao: Optional[str] = None
    total_questoes: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class TesteComQuestoes(BaseModel):
    """Schema do teste com todas as questões (sem respostas corretas)"""
    id: int
    nome: str
    habilidade: str
    nivel: str
    descricao: Optional[str] = None
    questions: List[QuestaoComAlternativas]
    total_questoes: int
    
    class Config:
        from_attributes = True


class Resposta(BaseModel):
    """Schema da resposta do candidato a uma questão"""
    question_id: int = Field(..., description="ID da questão")
    alternative_id: int = Field(..., description="ID da alternativa escolhida")


class SubmissaoTeste(BaseModel):
    """Schema da submissão completa do teste"""
    test_id: int = Field(..., description="ID do teste")
    respostas: List[Resposta] = Field(..., description="Lista de respostas do candidato")
    tempo_decorrido: Optional[int] = Field(None, description="Tempo em segundos que o candidato levou")


class ResultadoQuestao(BaseModel):
    """Schema do resultado de uma questão"""
    question_id: int
    texto_questao: str
    resposta_candidato_id: int
    resposta_candidato: str
    resposta_correta_id: int
    resposta_correta: str
    acertou: bool
    
    class Config:
        from_attributes = True


class ResultadoTeste(BaseModel):
    """Schema do resultado completo do teste"""
    test_id: int
    nome_teste: str
    habilidade: str
    total_questoes: int
    total_acertos: int
    percentual_acerto: float
    tempo_decorrido: Optional[int] = None
    data_submissao: datetime
    questoes: List[ResultadoQuestao]
    
    class Config:
        from_attributes = True


class TesteRealizado(BaseModel):
    """Schema de um teste realizado (para histórico)"""
    id: int
    test_id: int
    nome_teste: str
    habilidade: str
    nivel: str
    total_questoes: int
    total_acertos: int
    percentual_acerto: float
    tempo_decorrido: Optional[int] = None
    submitted_at: datetime
    
    class Config:
        from_attributes = True


class HistoricoTestes(BaseModel):
    """Schema do histórico de testes realizados"""
    total_testes: int
    media_pontuacao: float
    testes: List[TesteRealizado]
    
    class Config:
        from_attributes = True


# ============================================================================
# HELPERS
# ============================================================================

def get_current_candidate(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Candidate:
    """Verifica se o usuário é um candidato"""
    if current_user.user_type != UserType.candidato:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas candidatos podem acessar testes",
        )
    
    candidate = db.query(Candidate).filter(
        Candidate.user_id == current_user.id
    ).first()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil de candidato não encontrado",
        )
    
    return candidate


# ============================================================================
# ENDPOINTS PÚBLICOS
# ============================================================================

@router.get("", response_model=List[TesteDisponivel])
def listar_testes_disponiveis(
    skip: int = 0,
    limit: int = 100,
    habilidade: Optional[str] = None,
    nivel: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista todos os testes disponíveis para o candidato responder
    
    Parâmetros opcionais:
    - skip: Quantos registros pular (padrão: 0)
    - limit: Limite de resultados (padrão: 100)
    - habilidade: Filtrar por habilidade (ex: "Python", "React")
    - nivel: Filtrar por nível (ex: "Nível 1 - Iniciante")
    """
    try:
        if current_user.user_type != UserType.candidato:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas candidatos podem acessar testes",
            )
        
        query = db.query(Test)
        
        if habilidade:
            query = query.filter(Test.habilidade.ilike(f"%{habilidade}%"))
        
        if nivel:
            query = query.filter(Test.nivel == nivel)
        
        testes = query.order_by(Test.created_at.desc()).offset(skip).limit(limit).all()
        
        result = []
        for teste in testes:
            result.append(TesteDisponivel(
                id=teste.id,
                nome=teste.nome,
                habilidade=teste.habilidade,
                nivel=teste.nivel.value,
                descricao=teste.descricao,
                total_questoes=len(teste.questions),
                created_at=teste.created_at
            ))
        
        logger.info(f"Listados {len(result)} testes para candidato {current_user.id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar testes: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao listar testes"
        )


@router.get("/historico", response_model=HistoricoTestes)
def obter_historico_testes(
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Retorna o histórico de todos os testes que o candidato já realizou
    com suas respectivas pontuações.
    
    **Retorna:**
    - Lista de testes realizados com:
      - Nome do teste
      - Habilidade
      - Nível
      - Número de acertos
      - Percentual de acerto
      - Tempo decorrido
      - Data de submissão
    - Total de testes realizados
    - Média de pontuação
    """
    try:
        logger.info(f"[HISTÓRICO] Buscando testes do candidato {candidate.id}")
        
        # Buscar todos os resultados do candidato
        resultados = db.query(CandidateTestResult).filter(
            CandidateTestResult.candidate_id == candidate.id
        ).order_by(CandidateTestResult.submitted_at.desc()).all()
        
        logger.info(f"[HISTÓRICO] Encontrados {len(resultados)} testes para o candidato {candidate.id}")
        
        if not resultados:
            logger.info(f"[HISTÓRICO] Nenhum teste encontrado para candidato {candidate.id}")
            return HistoricoTestes(
                total_testes=0,
                media_pontuacao=0.0,
                testes=[]
            )
        
        # Montar lista de testes realizados
        testes_realizados = []
        total_pontuacao = 0
        
        for resultado in resultados:
            logger.debug(f"[HISTÓRICO] Processando resultado {resultado.id} - test_id: {resultado.test_id}")
            
            teste = db.query(Test).filter(Test.id == resultado.test_id).first()
            
            if teste:
                teste_realizado = TesteRealizado(
                    id=resultado.id,
                    test_id=resultado.test_id,
                    nome_teste=teste.nome,
                    habilidade=teste.habilidade,
                    nivel=teste.nivel.value,
                    total_questoes=resultado.total_questoes,
                    total_acertos=resultado.total_acertos,
                    percentual_acerto=resultado.percentual_acerto,
                    tempo_decorrido=resultado.tempo_decorrido,
                    submitted_at=resultado.submitted_at
                )
                testes_realizados.append(teste_realizado)
                total_pontuacao += resultado.percentual_acerto
                logger.debug(f"[HISTÓRICO] Teste adicionado: {teste.nome} - {resultado.percentual_acerto}%")
            else:
                logger.warning(f"[HISTÓRICO] Teste {resultado.test_id} não encontrado no banco")
        
        media_pontuacao = total_pontuacao / len(testes_realizados) if testes_realizados else 0.0
        
        logger.info(f"[HISTÓRICO] Retornando {len(testes_realizados)} testes - Média: {media_pontuacao}%")
        return HistoricoTestes(
            total_testes=len(testes_realizados),
            media_pontuacao=round(media_pontuacao, 2),
            testes=testes_realizados
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[HISTÓRICO] Erro ao obter histórico de testes: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao carregar histórico de testes: {str(e)}"
        )


@router.get("/questoes/filtrar", response_model=dict)
async def obter_questoes_com_filtros(
    habilidade: str,
    skip: int = 0,
    limit: int = 5,
    nivel: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna questões filtradas para formar um teste personalizado

    **IMPORTANTE**: Sempre retorna exatamente 15 questões (5 de cada nível: Básico, Intermediário, Avançado)
    quando a habilidade é especificada e nenhum nível é fornecido.

    Parâmetros:
    - habilidade: **OBRIGATÓRIO** - Nome da habilidade (ex: "Python", "Java", "React")
    - skip: Quantos registros pular (padrão: 0) - aplicado quando nivel é especificado
    - limit: Limite por nível (padrão: 5) - se sem nivel retorna 5 de cada, se com nivel retorna até limit
    - nivel: Filtrar por nível - aceita: "Iniciante", "Básico", "Intermediário", "Avançado", "Expert"

    Exemplos:
    - GET /candidates/testes/questoes/filtrar?habilidade=Python
      → Retorna EXATAMENTE 15 questões: 5 Básico + 5 Intermediário + 5 Avançado

    - GET /candidates/testes/questoes/filtrar?habilidade=Python&nivel=Básico&limit=10
      → Retorna até 10 questões de Python nível Básico
    """
    try:
        if current_user.user_type != UserType.candidato:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas candidatos podem acessar testes",
            )
        
        # Mapeamento de níveis simples para valores do Enum
        nivel_map = {
            "iniciante": TestLevel.iniciante,
            "básico": TestLevel.basico,
            "intermediário": TestLevel.intermediario,
            "avançado": TestLevel.avancado,
            "expert": TestLevel.expert,
            # Também aceita valores completos
            "Nível 1 - Iniciante": TestLevel.iniciante,
            "Nível 2 - Básico": TestLevel.basico,
            "Nível 3 - Intermediário": TestLevel.intermediario,
            "Nível 4 - Avançado": TestLevel.avancado,
            "Nível 5 - Expert": TestLevel.expert,
        }
        
        questoes_formatadas = []
        total_geral = 0
        
        # Se nível NÃO foi especificado, retorna 5 de cada nível
        if not nivel:
            niveis = [TestLevel.basico, TestLevel.intermediario, TestLevel.avancado]
            
            for nivel_enum in niveis:
                query = db.query(Question).join(Test)
                
                if habilidade:
                    query = query.filter(Test.habilidade.ilike(f"%{habilidade}%"))
                
                query = query.filter(Test.nivel == nivel_enum)
                
                total_nivel = query.count()
                total_geral += total_nivel
                
                # Pega 'limit' questões deste nível
                questoes = query.order_by(Question.id).limit(limit).all()
                
                for questao in questoes:
                    alternativas = [
                        {
                            "id": alt.id,
                            "texto": alt.texto,
                            "ordem": alt.ordem
                        }
                        for alt in sorted(questao.alternatives, key=lambda a: a.ordem)
                    ]
                    
                    questoes_formatadas.append({
                        "id": questao.id,
                        "texto_questao": questao.texto_questao,
                        "pergunta": questao.texto_questao,  # Alias
                        "ordem": questao.ordem,
                        "nivel": nivel_enum.value,
                        "test_id": questao.test_id,
                        "alternativas": alternativas,
                        "opcoes": alternativas  # Alias
                    })
        
        # Se nível FOI especificado, retorna até 'limit' questões desse nível
        else:
            # Converter nível para valor do Enum
            nivel_lower = nivel.lower()
            nivel_enum = nivel_map.get(nivel_lower)
            
            if not nivel_enum:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Nível inválido: '{nivel}'. Use um de: Iniciante, Básico, Intermediário, Avançado, Expert"
                )
            
            query = db.query(Question).join(Test)
            
            if habilidade:
                query = query.filter(Test.habilidade.ilike(f"%{habilidade}%"))
            
            query = query.filter(Test.nivel == nivel_enum)
            
            total_geral = query.count()
            
            questoes = query.order_by(Question.id).offset(skip).limit(limit).all()
            
            for questao in questoes:
                alternativas = [
                    {
                        "id": alt.id,
                        "texto": alt.texto,
                        "ordem": alt.ordem
                    }
                    for alt in sorted(questao.alternatives, key=lambda a: a.ordem)
                ]
                
                questoes_formatadas.append({
                    "id": questao.id,
                    "texto_questao": questao.texto_questao,
                    "pergunta": questao.texto_questao,  # Alias
                    "ordem": questao.ordem,
                    "nivel": nivel_enum.value,
                    "test_id": questao.test_id,
                    "alternativas": alternativas,
                    "opcoes": alternativas  # Alias
                })
        
        logger.info(f"Retornadas {len(questoes_formatadas)} questões para candidato {current_user.id}")
        
        return {
            "total_disponivel": total_geral,
            "quantidade_retornada": len(questoes_formatadas),
            "habilidade": habilidade,
            "nivel": nivel,
            "limit": limit,
            "skip": skip if nivel else None,
            "questoes": questoes_formatadas
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao filtrar questões: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao filtrar questões"
        )


@router.get("/{test_id}", response_model=TesteComQuestoes)
def obter_teste(
    test_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtém um teste específico com suas questões (sem mostrar respostas corretas)
    
    O candidato pode ver as questões e alternativas, mas não sabe qual é a correta.
    """
    try:
        if current_user.user_type != UserType.candidato:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas candidatos podem acessar testes",
            )
        
        teste = db.query(Test).filter(Test.id == test_id).first()
        
        if not teste:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teste não encontrado"
            )
        
        # Montar resposta com questões
        questoes = []
        for questao in sorted(teste.questions, key=lambda q: q.ordem):
            alternativas = []
            for alt in sorted(questao.alternatives, key=lambda a: a.ordem):
                alternativas.append(AlternativaSimples(
                    id=alt.id,
                    texto=alt.texto,
                    ordem=alt.ordem
                ))
            
            questoes.append(QuestaoComAlternativas(
                id=questao.id,
                texto_questao=questao.texto_questao,
                pergunta=questao.texto_questao,  # Populate alias
                ordem=questao.ordem,
                alternatives=alternativas,
                opcoes=alternativas  # Populate alias for frontend compatibility
            ))
        
        logger.info(f"Teste {test_id} recuperado para candidato {current_user.id}")
        return TesteComQuestoes(
            id=teste.id,
            nome=teste.nome,
            habilidade=teste.habilidade,
            nivel=teste.nivel.value,
            descricao=teste.descricao,
            questions=questoes,
            total_questoes=len(teste.questions)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter teste {test_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao carregar teste"
        )


@router.post("/{test_id}/submeter", response_model=ResultadoTeste)
def submeter_teste(
    test_id: int,
    submissao: SubmissaoTeste,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Submete as respostas do candidato para um teste
    
    Calcula:
    - Número de acertos
    - Percentual de acerto
    - Detalhes de cada questão (resposta dada vs. resposta correta)
    """
    try:
        teste = db.query(Test).filter(Test.id == test_id).first()
        
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
        
        # Processar respostas
        total_acertos = 0
        resultados_questoes = []
        
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
            
            acertou = alternativa_escolhida.id == alternativa_correta.id
            if acertou:
                total_acertos += 1
            
            resultados_questoes.append(ResultadoQuestao(
                question_id=questao.id,
                texto_questao=questao.texto_questao,
                resposta_candidato_id=alternativa_escolhida.id,
                resposta_candidato=alternativa_escolhida.texto,
                resposta_correta_id=alternativa_correta.id,
                resposta_correta=alternativa_correta.texto,
                acertou=acertou
            ))
        
        # Calcular percentual
        percentual_acerto = (total_acertos / total_questoes * 100) if total_questoes > 0 else 0
        
        logger.info(f"[SUBMETER TESTE] Teste {test_id} - Acertos: {total_acertos}/{total_questoes} - {percentual_acerto}%")
        
        # Armazenar resultado no banco de dados
        try:
            logger.info(f"[SUBMETER TESTE] Salvando resultado para candidato {candidate.id}")
            
            # Criar detalhes das questões
            detalhes = [
                {
                    "question_id": q.question_id,
                    "texto_questao": q.texto_questao,
                    "resposta_candidato": q.resposta_candidato,
                    "resposta_correta": q.resposta_correta,
                    "acertou": q.acertou
                } for q in resultados_questoes
            ]
            
            resultado = CandidateTestResult(
                candidate_id=candidate.id,
                test_id=teste.id,
                total_questoes=total_questoes,
                total_acertos=total_acertos,
                percentual_acerto=round(percentual_acerto, 2),
                tempo_decorrido=submissao.tempo_decorrido,
                detalhes_questoes=json.dumps(detalhes)
            )
            
            logger.info(f"[SUBMETER TESTE] Adicionando resultado ao banco...")
            db.add(resultado)
            db.commit()
            logger.info(f"[SUBMETER TESTE] ✓ Resultado salvo com sucesso - ID: {resultado.id}")
            
        except Exception as e:
            logger.error(f"[SUBMETER TESTE] ✗ Erro ao salvar resultado: {str(e)}", exc_info=True)
            db.rollback()
            # Continuar mesmo se falhar em salvar no histórico
        
        logger.info(f"[SUBMETER TESTE] Teste {test_id} submetido por candidato {candidate.id}")
        return ResultadoTeste(
            test_id=teste.id,
            nome_teste=teste.nome,
            habilidade=teste.habilidade,
            total_questoes=total_questoes,
            total_acertos=total_acertos,
            percentual_acerto=round(percentual_acerto, 2),
            tempo_decorrido=submissao.tempo_decorrido,
            data_submissao=datetime.utcnow(),
            questoes=resultados_questoes
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao submeter teste {test_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar resposta do teste"
        )


# ============================================================================
# FUNÇÕES AUXILIARES
# ============================================================================

def _criar_questoes_exemplo(db: Session, habilidade: str, nivel: str, sessao: AdaptiveTestSession) -> Optional[Question]:
    """
    Cria questões de exemplo se não existirem questões para a habilidade e nível.
    Retorna a primeira questão criada ou None se não conseguir criar.
    """
    try:
        # Mapear nível string para enum
        nivel_enum_map = {
            "basico": TestLevel.basico,
            "intermediario": TestLevel.intermediario,
            "avancado": TestLevel.avancado
        }
        nivel_enum = nivel_enum_map.get(nivel)
        
        if not nivel_enum:
            logger.warning(f"Nível inválido: {nivel}")
            return None
        
        # Verificar se já existe um teste para esta habilidade e nível
        teste_existente = db.query(Test).filter(
            Test.habilidade.ilike(f"%{habilidade}%"),
            Test.nivel == nivel_enum
        ).first()
        
        if teste_existente and teste_existente.questions:
            # Teste existe e tem questões, buscar a primeira
            return teste_existente.questions[0]
        
        # Buscar ou criar usuário admin para criar o teste
        admin_user = db.query(User).filter(User.id == 1).first()
        if not admin_user:
            # Se não houver user 1, buscar qualquer admin
            admin_user = db.query(User).filter(User.user_type == UserType.admin).first()
        
        if not admin_user:
            logger.warning("Nenhum usuário admin encontrado para criar o teste")
            return None
        
        # Criar novo teste para esta habilidade
        novo_teste = Test(
            nome=f"Teste de {habilidade} - {nivel.capitalize()}",
            habilidade=habilidade,
            nivel=nivel_enum,
            descricao=f"Teste adaptativo automático para {habilidade}",
            created_by=admin_user.id
        )
        db.add(novo_teste)
        db.flush()  # Flush para obter o ID
        
        # Criar 5 questões de exemplo
        questoes_exemplo = [
            {
                "texto": f"Questão 1: O que é {habilidade}?",
                "alternativas": [
                    {"texto": "Opção A", "is_correct": True},
                    {"texto": "Opção B", "is_correct": False},
                    {"texto": "Opção C", "is_correct": False},
                    {"texto": "Opção D", "is_correct": False},
                ]
            },
            {
                "texto": f"Questão 2: Qual é a característica principal de {habilidade}?",
                "alternativas": [
                    {"texto": "Alternativa 1", "is_correct": False},
                    {"texto": "Alternativa 2", "is_correct": True},
                    {"texto": "Alternativa 3", "is_correct": False},
                    {"texto": "Alternativa 4", "is_correct": False},
                ]
            },
            {
                "texto": f"Questão 3: Como se usa {habilidade}?",
                "alternativas": [
                    {"texto": "Forma 1", "is_correct": False},
                    {"texto": "Forma 2", "is_correct": False},
                    {"texto": "Forma 3", "is_correct": True},
                    {"texto": "Forma 4", "is_correct": False},
                ]
            },
            {
                "texto": f"Questão 4: Qual é o benefício de usar {habilidade}?",
                "alternativas": [
                    {"texto": "Benefício A", "is_correct": True},
                    {"texto": "Benefício B", "is_correct": False},
                    {"texto": "Benefício C", "is_correct": False},
                    {"texto": "Benefício D", "is_correct": False},
                ]
            },
            {
                "texto": f"Questão 5: Qual é o nível avançado de {habilidade}?",
                "alternativas": [
                    {"texto": "Nível 1", "is_correct": False},
                    {"texto": "Nível 2", "is_correct": False},
                    {"texto": "Nível 3", "is_correct": False},
                    {"texto": "Nível 4", "is_correct": True},
                ]
            }
        ]
        
        primeira_questao = None
        
        for idx, questao_data in enumerate(questoes_exemplo, 1):
            questao = Question(
                test_id=novo_teste.id,
                texto_questao=questao_data["texto"],
                ordem=idx
            )
            db.add(questao)
            db.flush()
            
            if idx == 1:
                primeira_questao = questao
            
            # Criar alternativas
            for alt_idx, alt_data in enumerate(questao_data["alternativas"], 1):
                alternativa = Alternative(
                    question_id=questao.id,
                    texto=alt_data["texto"],
                    is_correct=alt_data["is_correct"],
                    ordem=alt_idx
                )
                db.add(alternativa)
        
        db.commit()
        logger.info(f"Questões criadas para {habilidade} - {nivel}")
        
        # Recarregar a sessão para obter as questões
        return primeira_questao
        
    except Exception as e:
        logger.error(f"Erro ao criar questões de exemplo: {str(e)}", exc_info=True)
        db.rollback()
        return None


# ============================================================================
# ENDPOINTS DE TESTE ADAPTATIVO
# ============================================================================

@router.post("/adaptativo/iniciar", response_model=NextQuestionResponse)
async def iniciar_teste_adaptativo(
    payload: AdaptiveTestSessionStart,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Inicia teste adaptativo com nível inicial escolhido pelo candidato.
    
    **Fluxo:**
    1. Candidato escolhe nível inicial (Básico, Intermediário ou Avançado)
    2. Sistema apresenta 5 questões daquele nível
    3. Baseado no desempenho, decide se avança, mantém ou rebaixa
    
    **Níveis:**
    - basico (1): Fundamental
    - intermediario (2): Intermediário
    - avancado (3): Avançado
    
    **Regras de Progressão:**
    - Nível 2 com 0-1 acertos → Nível 1 (sem teste)
    - Nível 2 com 2-3 acertos → Nível 2 confirmado
    - Nível 2 com 4-5 acertos → vai para Nível 3
    
    - Nível 3 com 0-1 acertos → Nível 2 (rebaixa)
    - Nível 3 com 2-4 acertos → Nível 3 confirmado
    - Nível 3 com 5 acertos → Nível 4 (Especialista!)
    """
    try:
        # Validar nível inicial
        nivel_inicial = payload.nivel_inicial.lower()
        if nivel_inicial not in ["basico", "intermediario", "avancado"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nível inicial deve ser: 'basico', 'intermediario' ou 'avancado'"
            )
        
        service = AdaptiveTestService(db)
        
        # Iniciar sessão com nível escolhido
        sessao = service.iniciar_sessao_adaptativa(
            candidate_id=candidate.id,
            habilidade=payload.habilidade,
            nivel_inicial=nivel_inicial
        )
        
        # Buscar primeira questão
        questao = service.obter_proxima_questao(sessao)
        
        if not questao:
            # Se não encontrar questões, criar questões de exemplo
            logger.info(f"Criando questões de exemplo para {payload.habilidade} - {nivel_inicial}")
            questao = _criar_questoes_exemplo(db, payload.habilidade, nivel_inicial, sessao)
            
            if not questao:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Nenhuma questão disponível para habilidade '{payload.habilidade}' no nível {nivel_inicial}"
                )
        
        # Formatar alternativas (sem indicar qual é correta)
        alternativas_formatadas = [
            {"id": alt.id, "texto": alt.texto, "ordem": alt.ordem}
            for alt in sorted(questao.alternatives, key=lambda a: a.ordem)
        ]
        
        questao_response = QuestionWithAlternatives(
            id=questao.id,
            texto_questao=questao.texto_questao,
            pergunta=questao.texto_questao,
            nivel=sessao.nivel_atual,
            opcoes=alternativas_formatadas,
            numero_questao=1
        )
        
        progresso = {
            "basico": {"acertos": sessao.acertos_basico, "total": sessao.total_basico},
            "intermediario": {"acertos": sessao.acertos_intermediario, "total": sessao.total_intermediario},
            "avancado": {"acertos": sessao.acertos_avancado, "total": sessao.total_avancado}
        }
        
        nivel_map = {"basico": "Básico", "intermediario": "Intermediário", "avancado": "Avançado"}
        
        logger.info(f"Teste adaptativo iniciado: sessão {sessao.id}, habilidade {payload.habilidade}, nível {nivel_inicial}")
        
        return NextQuestionResponse(
            session_id=sessao.id,
            is_completed=False,
            questao=questao_response,
            nivel_atual=sessao.nivel_atual,
            progresso=progresso,
            mensagem=f"Iniciando teste de {payload.habilidade} - Nível {nivel_map[nivel_inicial]} (Questão 1 de 5)"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao iniciar teste adaptativo: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao iniciar teste adaptativo"
        )


@router.post("/adaptativo/sessao/{session_id}/responder", response_model=NextQuestionResponse)
async def responder_teste_adaptativo(
    session_id: int,
    resposta: AnswerQuestionRequest,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Responde uma questão do teste adaptativo.
    """
    try:
        logger.info(f"[TESTE] Iniciando resposta - session_id={session_id}, question_id={resposta.question_id}")
        
        service = AdaptiveTestService(db)
        
        # Buscar sessão
        sessao = db.query(AdaptiveTestSession).filter(
            AdaptiveTestSession.id == session_id,
            AdaptiveTestSession.candidate_id == candidate.id
        ).first()
        
        if not sessao:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sessão de teste não encontrada"
            )
        
        if sessao.is_completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta sessão de teste já foi finalizada"
            )
        
        logger.info(f"[TESTE] Sessão encontrada - nível_atual={sessao.nivel_atual}")
        
        # Registrar resposta e validar alternativa
        is_correct, erro = service.registrar_resposta(
            sessao=sessao,
            question_id=resposta.question_id,
            alternative_id=resposta.alternative_id
        )
        
        if erro:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=erro
            )
        
        logger.info(f"[TESTE] Resposta registrada - is_correct={is_correct}")
        
        # Informar se acertou ou errou
        resultado_msg = "✓ Correto!" if is_correct else "✗ Incorreto"
        
        # Verificar se completou este nível (5 questões) - APÓS registrar resposta
        if sessao.nivel_atual == "basico":
            questoes_feitas = sessao.total_basico
        elif sessao.nivel_atual == "intermediario":
            questoes_feitas = sessao.total_intermediario
        else:  # avancado
            questoes_feitas = sessao.total_avancado
        
        logger.info(f"[TESTE] Questões feitas no nível {sessao.nivel_atual}: {questoes_feitas}/5")
        
        # Completou este nível (5 questões)
        if questoes_feitas >= 5:
            logger.info(f"[TESTE] Completou nível {sessao.nivel_atual} com {questoes_feitas} questões, decidindo próximo nível")
            
            # Sem mais questões, finalizar nível
            proximo_nivel, mensagem_finalizacao = service.decidir_proximo_nivel(sessao)
            
            logger.info(f"[TESTE] Decisão: proximo_nivel={proximo_nivel}, msg={mensagem_finalizacao}")
            
            if proximo_nivel:
                # Avançar para próximo nível
                sessao.nivel_atual = proximo_nivel
                sessao.questao_atual_index = 0
                db.commit()
                
                logger.info(f"[TESTE] Avançando para nível {proximo_nivel}")
                
                # Buscar primeira questão do novo nível
                questao = service.obter_proxima_questao(sessao)
                
                if questao:
                    alternativas_formatadas = [
                        {"id": alt.id, "texto": alt.texto, "ordem": alt.ordem}
                        for alt in sorted(questao.alternatives, key=lambda a: a.ordem)
                    ]
                    
                    nivel_map = {"basico": "Básico", "intermediario": "Intermediário", "avancado": "Avançado"}
                    
                    questao_response = QuestionWithAlternatives(
                        id=questao.id,
                        texto_questao=questao.texto_questao,
                        pergunta=questao.texto_questao,
                        nivel=sessao.nivel_atual,
                        opcoes=alternativas_formatadas,
                        numero_questao=1
                    )
                    
                    progresso = {
                        "basico": {"acertos": sessao.acertos_basico, "total": sessao.total_basico},
                        "intermediario": {"acertos": sessao.acertos_intermediario, "total": sessao.total_intermediario},
                        "avancado": {"acertos": sessao.acertos_avancado, "total": sessao.total_avancado}
                    }
                    
                    return NextQuestionResponse(
                        session_id=sessao.id,
                        is_completed=False,
                        questao=questao_response,
                        nivel_atual=sessao.nivel_atual,
                        progresso=progresso,
                        mensagem=f"{resultado_msg} {mensagem_finalizacao} Avançando para Nível {nivel_map[proximo_nivel]}!"
                    )
            
            logger.info(f"[TESTE] Finalizando teste")
            
            # Não avança, finalizar teste
            sessao = service.finalizar_sessao(sessao)
            
            # Salvar resultado
            try:
                total_acertos = sessao.acertos_basico + sessao.acertos_intermediario + sessao.acertos_avancado
                total_questoes = sessao.total_basico + sessao.total_intermediario + sessao.total_avancado
                
                teste_habilidade = db.query(Test).filter(
                    Test.habilidade == sessao.habilidade
                ).first()
                
                if teste_habilidade:
                    resultado = CandidateTestResult(
                        candidate_id=candidate.id,
                        test_id=teste_habilidade.id,
                        total_questoes=total_questoes,
                        total_acertos=total_acertos,
                        percentual_acerto=round((total_acertos / total_questoes * 100) if total_questoes > 0 else 0, 2),
                        tempo_decorrido=None,
                        detalhes_questoes=json.dumps({
                            "nivel_final": sessao.nivel_final_atingido,
                            "habilidade": sessao.habilidade,
                            "historico_respostas": sessao.historico_respostas or []
                        })
                    )
                    db.add(resultado)
                    db.commit()
                    logger.info(f"[TESTE] Resultado salvo")
            except Exception as e:
                logger.error(f"[TESTE] Erro ao salvar resultado: {str(e)}", exc_info=True)
                db.rollback()
            
            progresso = {
                "basico": {"acertos": sessao.acertos_basico, "total": sessao.total_basico},
                "intermediario": {"acertos": sessao.acertos_intermediario, "total": sessao.total_intermediario},
                "avancado": {"acertos": sessao.acertos_avancado, "total": sessao.total_avancado}
            }
            
            nivel_final_map = {
                "N0": "Iniciante",
                "N1": "Básico",
                "N2": "Intermediário",
                "N3": "Avançado",
                "N4": "Especialista"
            }
            
            return NextQuestionResponse(
                session_id=sessao.id,
                is_completed=True,
                questao=None,
                nivel_atual=None,
                progresso=progresso,
                mensagem=f"{resultado_msg} {mensagem_finalizacao} Teste finalizado! Você atingiu o nível {nivel_final_map[sessao.nivel_final_atingido]}"
            )
        
        # Ainda há questões a fazer neste nível
        logger.info(f"[TESTE] Buscando próxima questão do nível {sessao.nivel_atual}")
        
        # Buscar próxima questão do mesmo nível
        questao = service.obter_proxima_questao(sessao)
        
        if not questao:
            logger.warning(f"[TESTE] Nenhuma questão encontrada para nível {sessao.nivel_atual}, mas total < 5")
            # Isso pode acontecer se não houver questões suficientes no banco
            # Forçar finalização
            proximo_nivel, mensagem_finalizacao = service.decidir_proximo_nivel(sessao)
            
            if proximo_nivel:
                sessao.nivel_atual = proximo_nivel
                sessao.questao_atual_index = 0
                db.commit()
                
                questao = service.obter_proxima_questao(sessao)
                if questao:
                    alternativas_formatadas = [
                        {"id": alt.id, "texto": alt.texto, "ordem": alt.ordem}
                        for alt in sorted(questao.alternatives, key=lambda a: a.ordem)
                    ]
                    
                    nivel_map = {"basico": "Básico", "intermediario": "Intermediário", "avancado": "Avançado"}
                    
                    questao_response = QuestionWithAlternatives(
                        id=questao.id,
                        texto_questao=questao.texto_questao,
                        pergunta=questao.texto_questao,
                        nivel=sessao.nivel_atual,
                        opcoes=alternativas_formatadas,
                        numero_questao=1
                    )
                    
                    progresso = {
                        "basico": {"acertos": sessao.acertos_basico, "total": sessao.total_basico},
                        "intermediario": {"acertos": sessao.acertos_intermediario, "total": sessao.total_intermediario},
                        "avancado": {"acertos": sessao.acertos_avancado, "total": sessao.total_avancado}
                    }
                    
                    return NextQuestionResponse(
                        session_id=sessao.id,
                        is_completed=False,
                        questao=questao_response,
                        nivel_atual=sessao.nivel_atual,
                        progresso=progresso,
                        mensagem=f"{resultado_msg} {mensagem_finalizacao} Avançando para Nível {nivel_map[proximo_nivel]}!"
                    )
            
            # Não há próximo nível, finalizar teste
            sessao = service.finalizar_sessao(sessao)
            
            try:
                total_acertos = sessao.acertos_basico + sessao.acertos_intermediario + sessao.acertos_avancado
                total_questoes = sessao.total_basico + sessao.total_intermediario + sessao.total_avancado
                
                teste_habilidade = db.query(Test).filter(
                    Test.habilidade == sessao.habilidade
                ).first()
                
                if teste_habilidade:
                    resultado = CandidateTestResult(
                        candidate_id=candidate.id,
                        test_id=teste_habilidade.id,
                        total_questoes=total_questoes,
                        total_acertos=total_acertos,
                        percentual_acerto=round((total_acertos / total_questoes * 100) if total_questoes > 0 else 0, 2),
                        tempo_decorrido=None,
                        detalhes_questoes=json.dumps({
                            "nivel_final": sessao.nivel_final_atingido,
                            "habilidade": sessao.habilidade,
                            "historico_respostas": sessao.historico_respostas or []
                        })
                    )
                    db.add(resultado)
                    db.commit()
                    logger.info(f"[TESTE] Resultado salvo")
            except Exception as e:
                logger.error(f"[TESTE] Erro ao salvar resultado: {str(e)}", exc_info=True)
                db.rollback()
            
            progresso = {
                "basico": {"acertos": sessao.acertos_basico, "total": sessao.total_basico},
                "intermediario": {"acertos": sessao.acertos_intermediario, "total": sessao.total_intermediario},
                "avancado": {"acertos": sessao.acertos_avancado, "total": sessao.total_avancado}
            }
            
            nivel_final_map = {
                "N0": "Iniciante",
                "N1": "Básico",
                "N2": "Intermediário",
                "N3": "Avançado",
                "N4": "Especialista"
            }
            
            return NextQuestionResponse(
                session_id=sessao.id,
                is_completed=True,
                questao=None,
                nivel_atual=None,
                progresso=progresso,
                mensagem=f"{resultado_msg} {mensagem_finalizacao} Teste finalizado! Você atingiu o nível {nivel_final_map[sessao.nivel_final_atingido]}"
            )
        
        # Próxima questão do mesmo nível
        alternativas_formatadas = [
            {"id": alt.id, "texto": alt.texto, "ordem": alt.ordem}
            for alt in sorted(questao.alternatives, key=lambda a: a.ordem)
        ]
        
        questao_response = QuestionWithAlternatives(
            id=questao.id,
            texto_questao=questao.texto_questao,
            pergunta=questao.texto_questao,
            nivel=sessao.nivel_atual,
            opcoes=alternativas_formatadas,
            numero_questao=questoes_feitas + 1
        )
        
        progresso = {
            "basico": {"acertos": sessao.acertos_basico, "total": sessao.total_basico},
            "intermediario": {"acertos": sessao.acertos_intermediario, "total": sessao.total_intermediario},
            "avancado": {"acertos": sessao.acertos_avancado, "total": sessao.total_avancado}
        }
        
        return NextQuestionResponse(
            session_id=sessao.id,
            is_completed=False,
            questao=questao_response,
            nivel_atual=sessao.nivel_atual,
            progresso=progresso,
            mensagem=f"{resultado_msg} Questão {questoes_feitas + 1} de 5"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TESTE] Erro ao responder questão adaptativa: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar resposta: {str(e)}"
        )


@router.get("/adaptativo/sessao/{session_id}/resultado", response_model=AdaptiveTestResult)
async def obter_resultado_teste_adaptativo(
    session_id: int,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    """
    Obtém o resultado final de uma sessão de teste adaptativo.
    
    **Retorna:**
    - Nível final atingido (N0, N1, N2, N3, N4)
    - Pontuação final
    - Detalhes de acertos por nível
    - Histórico completo de respostas
    - Tempo total gasto
    
    **Níveis:**
    - **N0**: Não exposto - < 3 acertos básicos
    - **N1**: Iniciante - ≥3 acertos básicos
    - **N2**: Básico - ≥4B e ≥3I
    - **N3**: Intermediário - ≥4I e ≥3A
    - **N4**: Especialista - 100% acertos avançados
    """
    try:
        service = AdaptiveTestService(db)
        
        sessao = db.query(AdaptiveTestSession).filter(
            AdaptiveTestSession.id == session_id,
            AdaptiveTestSession.candidate_id == candidate.id
        ).first()
        
        if not sessao:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sessão de teste não encontrada"
            )
        
        if not sessao.is_completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Teste ainda não foi finalizado"
            )
        
        # Calcular tempo total
        tempo_total = None
        if sessao.completed_at and sessao.started_at:
            tempo_total = int((sessao.completed_at - sessao.started_at).total_seconds())
        
        detalhes_por_nivel = {
            "basico": {
                "acertos": sessao.acertos_basico,
                "total": sessao.total_basico,
                "percentual": round((sessao.acertos_basico / sessao.total_basico * 100) if sessao.total_basico > 0 else 0, 2)
            },
            "intermediario": {
                "acertos": sessao.acertos_intermediario,
                "total": sessao.total_intermediario,
                "percentual": round((sessao.acertos_intermediario / sessao.total_intermediario * 100) if sessao.total_intermediario > 0 else 0, 2)
            },
            "avancado": {
                "acertos": sessao.acertos_avancado,
                "total": sessao.total_avancado,
                "percentual": round((sessao.acertos_avancado / sessao.total_avancado * 100) if sessao.total_avancado > 0 else 0, 2)
            }
        }
        
        # Calcular pontuação final se não foi calculada
        pontuacao_final = sessao.pontuacao_final
        if pontuacao_final is None:
            total_acertos = sessao.acertos_basico + sessao.acertos_intermediario + sessao.acertos_avancado
            total_questoes = sessao.total_basico + sessao.total_intermediario + sessao.total_avancado
            pontuacao_final = round((total_acertos / total_questoes * 100) if total_questoes > 0 else 0, 2)
        
        return AdaptiveTestResult(
            session_id=sessao.id,
            habilidade=sessao.habilidade,
            nivel_final_atingido=sessao.nivel_final_atingido,
            descricao_nivel=service.obter_descricao_nivel(sessao.nivel_final_atingido),
            pontuacao_final=pontuacao_final,
            detalhes_por_nivel=detalhes_por_nivel,
            historico_respostas=sessao.historico_respostas or [],
            tempo_total_segundos=tempo_total,
            started_at=sessao.started_at,
            completed_at=sessao.completed_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter resultado: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar resultado do teste"
        )


# ============================================================================
# TESTES DISPONÍVEIS BASEADO EM AUTOAVALIAÇÃO
# ============================================================================

class TesteDisponivel(BaseModel):
    """Schema de teste disponível com questões"""
    id: int
    nome: str
    habilidade: str
    nivel: str
    descricao: Optional[str] = None
    questoes: List[QuestaoComAlternativas]
    total_questoes: int
    
    class Config:
        from_attributes = True


class ListaTestesDisponiveisResponse(BaseModel):
    """Resposta com lista de testes disponíveis"""
    total_testes: int
    testes: List[TesteDisponivel]
    autoavaliacao_nivel: dict  # {competencia_id: nivel}
    mensagem: str
    
    class Config:
        from_attributes = True


@router.get("/habilidades-disponiveis", response_model=ListaTestesDisponiveisResponse)
async def obter_testes_disponiveis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna testes disponíveis baseado na autoavaliação do candidato
    
    Lógica:
    - Busca as competências avaliadas na autoavaliação
    - Filtra testes relacionados às competências
    - Retorna 15 questões distribuídas entre os testes
    - Segue a matriz de dificuldade (Básico, Intermediário, Avançado)
    
    Matriz de Testes:
    - N0 (Não exposto): Não aplica teste
    - N1 (Básico): ≥ 3B
    - N2 (Intermediário): ≥ 4B ou ≥ 3I  
    - N3 (Avançado): ≥ 4I ou ≥ 3A
    - N4 (Especialista): 100% A
    
    Resposta:
    - Testes disponíveis com suas questões (sem mostrar resposta correta)
    - 15 questões distribuídas por nível de dificuldade
    """
    
    # Validar se é candidato
    if current_user.user_type.value != "candidato":
        raise HTTPException(status_code=403, detail="Acesso permitido apenas para candidatos")
    
    # Buscar candidato
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    # Buscar autoavaliações do candidato
    from app.models.competencia import AutoavaliacaoCompetencia
    autoavaliacoes = db.query(AutoavaliacaoCompetencia).filter(
        AutoavaliacaoCompetencia.candidate_id == candidate.id
    ).all()
    
    if not autoavaliacoes:
        raise HTTPException(
            status_code=400,
            detail="Nenhuma autoavaliação encontrada. Complete a autoavaliação primeiro."
        )
    
    # Mapear níveis de competências
    competencia_niveis = {}  # {competencia_id: nivel_declarado (1-4)}
    for autoav in autoavaliacoes:
        try:
            nivel = int(autoav.nivel_declarado)
            competencia_niveis[autoav.competencia_id] = nivel
        except (ValueError, TypeError):
            continue
    
    # Buscar testes relacionados às competências avaliadas
    testes_por_competencia = {}
    
    for competencia_id in competencia_niveis.keys():
        # Buscar testes que tenham questões relacionadas a esta competência
        testes = db.query(Test).filter(
            Test.id.in_(
                db.query(Question.test_id).filter(
                    # Aqui você pode adicionar uma relação entre Question e Competencia
                    # Por enquanto, vamos buscar testes cujo nome inclua a competência
                ).all()
            ) if db.query(Question.test_id).filter().all() else []
        ).all()
        
        if not testes:
            # Fallback: buscar testes sem filtro de competência se necessário
            testes = db.query(Test).limit(3).all()
        
        testes_por_competencia[competencia_id] = testes
    
    # Algoritmo de seleção de testes baseado na matriz
    testes_selecionados = []
    questoes_coletadas = []
    
    for competencia_id, nivel_auto in competencia_niveis.items():
        # Determinar qual nível de teste aplicar
        nivel_teste = _determinar_nivel_teste(nivel_auto)
        
        if nivel_teste == "N0":
            continue  # Não aplica teste
        
        # Buscar testes do nível apropriado
        testes_competencia = testes_por_competencia.get(competencia_id, [])
        
        for teste in testes_competencia:
            if teste.id not in [t.id for t in testes_selecionados]:
                testes_selecionados.append(teste)
                
                # Coletar questões do teste
                questoes = db.query(Question).filter(
                    Question.test_id == teste.id
                ).order_by(Question.ordem).all()
                
                for questao in questoes:
                    if len(questoes_coletadas) < 15:  # Máximo 15 questões
                        # Buscar alternativas
                        alternativas = db.query(Alternative).filter(
                            Alternative.question_id == questao.id
                        ).order_by(Alternative.ordem).all()
                        
                        questao_dict = {
                            "id": questao.id,
                            "texto_questao": questao.texto_questao,
                            "ordem": questao.ordem,
                            "alternatives": [
                                AlternativaSimples(
                                    id=alt.id,
                                    texto=alt.texto,
                                    ordem=alt.ordem
                                ).model_dump()
                                for alt in alternativas
                            ]
                        }
                        questoes_coletadas.append(questao_dict)
            
            if len(questoes_coletadas) >= 15:
                break
        
        if len(questoes_coletadas) >= 15:
            break
    
    # Organizar resposta com testes e questões
    testes_response = []
    
    for teste in testes_selecionados:
        questoes_teste = [q for q in questoes_coletadas if db.query(Question).filter(
            Question.id == q['id']
        ).first().test_id == teste.id]
        
        if questoes_teste:
            teste_dict = {
                "id": teste.id,
                "nome": teste.nome,
                "habilidade": teste.habilidade,
                "nivel": teste.nivel.value if hasattr(teste.nivel, 'value') else str(teste.nivel),
                "descricao": teste.descricao,
                "questoes": questoes_teste,
                "total_questoes": len(questoes_teste)
            }
            testes_response.append(teste_dict)
    
    # Se não houver questões coletadas, retornar mensagem informativa
    if not questoes_coletadas:
        return ListaTestesDisponiveisResponse(
            total_testes=0,
            testes=[],
            autoavaliacao_nivel=competencia_niveis,
            mensagem="Nenhum teste disponível para as competências avaliadas."
        )
    
    return ListaTestesDisponiveisResponse(
        total_testes=len(testes_response),
        testes=testes_response,
        autoavaliacao_nivel=competencia_niveis,
        mensagem=f"{len(questoes_coletadas)} questões disponíveis em {len(testes_response)} teste(s)"
    )


def _determinar_nivel_teste(nivel_autoavaliacao: int) -> str:
    """
    Determina qual nível de teste aplicar baseado na autoavaliação
    
    Matriz de Decisão:
    - Nível 1 (Básico): Aplica N1 (≥ 3B)
    - Nível 2 (Intermediário): Aplica N2 (≥ 4B ou ≥ 3I)
    - Nível 3 (Avançado): Aplica N3 (≥ 4I ou ≥ 3A)
    - Nível 4 (Especialista): Aplica N4 (100% A)
    
    Args:
        nivel_autoavaliacao: Nível declarado na autoavaliação (1-4)
    
    Returns:
        Nível de teste a aplicar (N0, N1, N2, N3, N4)
    """
    if nivel_autoavaliacao == 1:
        return "N1"  # Básico
    elif nivel_autoavaliacao == 2:
        return "N2"  # Intermediário
    elif nivel_autoavaliacao == 3:
        return "N3"  # Avançado
    elif nivel_autoavaliacao == 4:
        return "N4"  # Especialista
    else:
        return "N0"  # Não aplica

