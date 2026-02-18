"""
Serviço para gerenciar testes adaptativos por nível
Implementa algoritmo: Autoavaliação → Teste com 5Q por nível → Classificação final

Regras:
- Nível 2 (Intermediário): 
  - 0-1 acertos → Nível 1 (não testa Nível 1)
  - 2-3 acertos → Nível 2
  - 4-5 acertos → vai para Nível 3
  
- Nível 3 (Avançado):
  - 0-1 acertos → Nível 2 (volta)
  - 2-4 acertos → Nível 3
  - 5 acertos → Nível 4 (Especialista)

- Confirmado quando: ≥3 acertos em 5 questões
"""
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from typing import Optional, Dict, List, Tuple
from datetime import datetime
import random

from app.models.test import Test, Question, Alternative, AdaptiveTestSession, TestLevel
from app.models.candidate import Candidate


class AdaptiveTestService:
    """
    Serviço para testes adaptativos por nível
    Cada nível tem exatamente 5 questões
    """
    
    QUESTOES_POR_NIVEL = 5
    MIN_ACERTOS_CONFIRMACAO = 3  # ≥3 para confirmar nível
    
    def __init__(self, db: Session):
        self.db = db
        self._questoes_cache = {}  # Cache para evitar re-embaralhamento
    
    def iniciar_sessao_adaptativa(
        self, 
        candidate_id: int, 
        habilidade: str, 
        nivel_inicial: str
    ) -> AdaptiveTestSession:
        """
        Inicia nova sessão com nível inicial escolhido pelo candidato
        nivel_inicial: "basico" (1), "intermediario" (2), ou "avancado" (3)
        """
        # Verificar se já existe sessão ativa
        sessao_ativa = self.db.query(AdaptiveTestSession).filter(
            AdaptiveTestSession.candidate_id == candidate_id,
            AdaptiveTestSession.habilidade == habilidade,
            AdaptiveTestSession.is_completed == False
        ).first()
        
        if sessao_ativa:
            return sessao_ativa
        
        # Criar nova sessão
        nova_sessao = AdaptiveTestSession(
            candidate_id=candidate_id,
            habilidade=habilidade,
            nivel_atual=nivel_inicial,
            questao_atual_index=0,
            total_basico=0,
            total_intermediario=0,
            total_avancado=0,
            acertos_basico=0,
            acertos_intermediario=0,
            acertos_avancado=0,
            historico_respostas=[]
        )
        
        self.db.add(nova_sessao)
        self.db.commit()
        self.db.refresh(nova_sessao)
        
        return nova_sessao
    
    def obter_proxima_questao(self, sessao: AdaptiveTestSession) -> Optional[Question]:
        """
        Obtém a próxima questão para a sessão, usando cache para evitar re-embaralhamento.
        
        Cache é inicializado no __init__ e compartilhado entre chamadas,
        evitando que as questões sejam re-embaralhadas.
        """
        nivel_atual = sessao.nivel_atual
        index_atual = sessao.questao_atual_index
        
        # Verificar se já completou este nível (5 questões)
        if nivel_atual == "basico":
            if sessao.total_basico >= self.QUESTOES_POR_NIVEL:
                return None
            chave_cache = "questoes_basico"
        elif nivel_atual == "intermediario":
            if sessao.total_intermediario >= self.QUESTOES_POR_NIVEL:
                return None
            chave_cache = "questoes_intermediario"
        elif nivel_atual == "avancado":
            if sessao.total_avancado >= self.QUESTOES_POR_NIVEL:
                return None
            chave_cache = "questoes_avancado"
        else:
            return None
        
        # Se não tem questões em cache para este nível, buscar e embaralhar
        if chave_cache not in self._questoes_cache:
            questoes = self.db.query(Question).join(Test).filter(
                Test.habilidade.ilike(f"%{sessao.habilidade}%"),
                Test.nivel == self._nivel_para_enum(nivel_atual)
            ).options(selectinload(Question.alternatives)).all()
            
            if not questoes:
                return None
            
            random.shuffle(questoes)
            self._questoes_cache[chave_cache] = questoes
        
        questoes = self._questoes_cache[chave_cache]
        
        # Retornar questão na sequência
        if index_atual < len(questoes):
            questao = questoes[index_atual]
            # Não incrementar aqui - deixar para depois que responder
            return questao
        
        return None
    
    def _nivel_para_enum(self, nivel: str) -> TestLevel:
        """Helper para converter string de nível para enum"""
        nivel_map = {
            "basico": TestLevel.basico,
            "intermediario": TestLevel.intermediario,
            "avancado": TestLevel.avancado
        }
        return nivel_map.get(nivel)
    
    def registrar_resposta(
        self, 
        sessao: AdaptiveTestSession, 
        question_id: int, 
        alternative_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Registra resposta, valida alternativa e atualiza contadores
        Retorna (is_correct, mensagem_erro)
        """
        # Buscar questão e alternativa
        questao = self.db.query(Question).filter(Question.id == question_id).first()
        if not questao:
            return False, "Questão não encontrada"
        
        alternativa = self.db.query(Alternative).filter(
            Alternative.id == alternative_id,
            Alternative.question_id == question_id
        ).first()
        
        if not alternativa:
            return False, "Alternativa não encontrada"
        
        is_correct = alternativa.is_correct
        
        # Registrar no histórico
        if sessao.historico_respostas is None:
            sessao.historico_respostas = []
        
        sessao.historico_respostas.append({
            "question_id": question_id,
            "alternative_id": alternative_id,
            "is_correct": is_correct,
            "nivel": sessao.nivel_atual,
            "timestamp": datetime.now().isoformat()
        })
        
        # Atualizar contadores do nível atual
        if sessao.nivel_atual == "basico":
            sessao.total_basico += 1
            if is_correct:
                sessao.acertos_basico += 1
        elif sessao.nivel_atual == "intermediario":
            sessao.total_intermediario += 1
            if is_correct:
                sessao.acertos_intermediario += 1
        elif sessao.nivel_atual == "avancado":
            sessao.total_avancado += 1
            if is_correct:
                sessao.acertos_avancado += 1
        
        # Incrementar índice APÓS registrar resposta
        sessao.questao_atual_index += 1
        self.db.commit()
        
        return is_correct, None
    
    def decidir_proximo_nivel(self, sessao: AdaptiveTestSession) -> Tuple[Optional[str], str]:
        """
        Decide qual é o próximo nível ou se finaliza
        Retorna (proximo_nivel, mensagem)
        
        Regras:
        - Nível 2 com 0-1: vai para Nível 1 (FINALIZA, sem teste Nível 1)
        - Nível 2 com 2-3: Nível 2 confirmado (FINALIZA)
        - Nível 2 com 4-5: vai para Nível 3
        
        - Nível 3 com 0-1: volta para Nível 2 (FINALIZA, sem reteste)
        - Nível 3 com 2-4: Nível 3 confirmado (FINALIZA)
        - Nível 3 com 5: Nível 4 Especialista (FINALIZA)
        """
        acertos = 0
        
        if sessao.nivel_atual == "basico":
            acertos = sessao.acertos_basico
            if acertos >= self.MIN_ACERTOS_CONFIRMACAO:
                return None, f"Nível Básico confirmado ({acertos}/5 acertos)"
            else:
                return None, f"Desempenho insuficiente ({acertos}/5 acertos)"
        
        elif sessao.nivel_atual == "intermediario":
            acertos = sessao.acertos_intermediario
            
            if acertos <= 1:
                # Rebaixar para Nível 1 (sem teste)
                return None, f"Rebaixado para Nível 1 ({acertos}/5 acertos)"
            elif acertos <= 3:
                # Confirmado Nível 2
                return None, f"Nível Intermediário confirmado ({acertos}/5 acertos)"
            else:  # 4-5 acertos
                # Avançar para Nível 3
                return "avancado", f"Avançando para Nível Avançado ({acertos}/5 acertos)"
        
        elif sessao.nivel_atual == "avancado":
            acertos = sessao.acertos_avancado
            
            if acertos <= 1:
                # Rebaixar para Nível 2 (sem reteste)
                return None, f"Rebaixado para Nível 2 ({acertos}/5 acertos)"
            elif acertos <= 4:
                # Confirmado Nível 3
                return None, f"Nível Avançado confirmado ({acertos}/5 acertos)"
            else:  # 5 acertos
                # Especialista!
                return None, f"Nível Especialista alcançado! 🎉 (5/5 acertos)"
        
        return None, "Teste finalizado"
    
    def calcular_nivel_final(self, sessao: AdaptiveTestSession) -> Tuple[str, str, bool]:
        """
        Calcula nível final baseado no desempenho
        Retorna (nivel_final, descricao, foi_confirmado)
        
        Nível 1: 0-1 acertos no Intermediário OU apenas Básico com ≥3
        Nível 2: Intermediário com 2-3 acertos
        Nível 3: Intermediário com 4-5 E foi para Avançado
        Nível 4: Avançado com 5 acertos
        """
        
        # Se tem acertos em Avançado
        if sessao.total_avancado > 0:
            acertos_a = sessao.acertos_avancado
            
            if acertos_a == 5:
                return "N4", "Especialista - Domínio Completo", True
            elif acertos_a >= 2:
                return "N3", "Avançado - Conhecimento Aprofundado", True
            else:
                return "N2", "Intermediário - Fundamentos Sólidos", True
        
        # Se tem acertos em Intermediário
        elif sessao.total_intermediario > 0:
            acertos_i = sessao.acertos_intermediario
            
            if acertos_i >= 4:
                return "N3", "Avançado - Conhecimento Aprofundado", False  # Não confirmado pois não fez avançado
            elif acertos_i >= 2:
                return "N2", "Intermediário - Fundamentos Sólidos", True
            else:
                return "N1", "Básico - Fundamentos", True
        
        # Apenas Básico
        elif sessao.total_basico > 0:
            acertos_b = sessao.acertos_basico
            
            if acertos_b >= self.MIN_ACERTOS_CONFIRMACAO:
                return "N1", "Básico - Fundamentos", True
            else:
                return "N0", "Iniciante - Conhecimento Insuficiente", False
        
        return "N0", "Não avaliado", False
    
    def finalizar_sessao(self, sessao: AdaptiveTestSession) -> AdaptiveTestSession:
        """
        Finaliza sessão e calcula nível final
        """
        if sessao.is_completed:
            return sessao
        
        nivel_final, descricao_nivel, foi_confirmado = self.calcular_nivel_final(sessao)
        
        sessao.nivel_final_atingido = nivel_final
        sessao.is_completed = True
        sessao.completed_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(sessao)
        
        return sessao
    
    def obter_descricao_nivel(self, nivel_codigo: str) -> str:
        """
        Retorna a descrição legível de um nível de teste.
        
        Níveis:
        - N0: Iniciante - Conhecimento Insuficiente
        - N1: Básico - Fundamentos
        - N2: Intermediário - Fundamentos Sólidos
        - N3: Avançado - Conhecimento Aprofundado
        - N4: Especialista - Domínio Completo
        """
        descricoes = {
            "N0": "Iniciante - Conhecimento Insuficiente",
            "N1": "Básico - Fundamentos",
            "N2": "Intermediário - Fundamentos Sólidos",
            "N3": "Avançado - Conhecimento Aprofundado",
            "N4": "Especialista - Domínio Completo"
        }
        return descricoes.get(nivel_codigo, "Não avaliado")
