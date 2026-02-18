"""
Serviço para gerenciar fluxo de candidato
"""
from sqlalchemy.orm import Session
from app.models import Candidate, User, AutoavaliacaoCompetencia, Competencia, CandidatoTeste, VagaCandidato
from app.models.candidato_teste import StatusOnboarding, StatusKanbanCandidato
from typing import List, Optional


class CandidatoService:
    """Serviço para lógica de candidato"""
    
    @staticmethod
    def inicializar_onboarding(db: Session, candidate_id: int) -> Candidate:
        """Inicializa o onboarding de um candidato"""
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise ValueError("Candidato não encontrado")
        
        candidate.status_onboarding = StatusOnboarding.CADASTRO_INICIAL.value
        candidate.percentual_completude = 0
        db.commit()
        return candidate
    
    @staticmethod
    def definir_area_atuacao(db: Session, candidate_id: int, area: str) -> Candidate:
        """Define a área de atuação do candidato"""
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise ValueError("Candidato não encontrado")
        
        # Validar área (apenas verificar se não é vazia)
        if not area or not isinstance(area, str):
            raise ValueError(f"Área de atuação inválida: {area}")
        
        candidate.area_atuacao = area.lower()
        candidate.status_onboarding = StatusOnboarding.AREA_SELECIONADA.value
        candidate.percentual_completude = 10
        db.commit()
        return candidate
    
    @staticmethod
    def obter_competencias_por_area(db: Session, area: str) -> List[Competencia]:
        """Obtém lista de competências para uma área"""
        if not area or not isinstance(area, str):
            raise ValueError(f"Área de atuação inválida: {area}")
        
        return db.query(Competencia).filter(Competencia.area == area.lower()).all()
    
    @staticmethod
    def salvar_autoavaliacao(
        db: Session, 
        candidate_id: int, 
        competencias: List[dict]  # [{competencia_id, nivel_declarado}, ...]
    ) -> Candidate:
        """Salva autoavaliação de competências"""
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise ValueError("Candidato não encontrado")
        
        # Validar que candidato tem área selecionada
        if not candidate.area_atuacao:
            raise ValueError("Candidato deve selecionar uma área antes de autoavaliar")
        
        # Limpar autoavaliações anteriores
        db.query(AutoavaliacaoCompetencia).filter(
            AutoavaliacaoCompetencia.candidate_id == candidate_id
        ).delete()
        
        # Salvar novas autoavaliações
        for comp_data in competencias:
            autoavaliacao = AutoavaliacaoCompetencia(
                candidate_id=candidate_id,
                competencia_id=comp_data['competencia_id'],
                nivel_declarado=str(comp_data['nivel_declarado'])  # Converter para string
            )
            db.add(autoavaliacao)
        
        candidate.status_onboarding = StatusOnboarding.AUTOAVALIACAO_CONCLUIDA.value
        candidate.percentual_completude = 40
        db.commit()
        return candidate
    
    @staticmethod
    def liberar_testes(db: Session, candidate_id: int) -> List[int]:
        """Libera testes com base nas competências declaradas"""
        # Buscar autoavaliações do candidato
        autoavaliacoes = db.query(AutoavaliacaoCompetencia).filter(
            AutoavaliacaoCompetencia.candidate_id == candidate_id
        ).all()
        
        if not autoavaliacoes:
            return []
        
        # Testes já criados para essas competências
        # Aqui seria implementada a lógica de vincular testes a competências
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        candidate.status_onboarding = StatusOnboarding.TESTES_PENDENTES.value
        candidate.percentual_completude = 50
        db.commit()
        
        return []  # Placeholder
    
    @staticmethod
    def verificar_onboarding_completo(db: Session, candidate_id: int) -> bool:
        """Verifica se o onboarding está completo"""
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            return False
        
        # Verificar se tem autoavaliação
        autoavaliacao_count = db.query(AutoavaliacaoCompetencia).filter(
            AutoavaliacaoCompetencia.candidate_id == candidate_id
        ).count()
        
        if autoavaliacao_count == 0:
            return False
        
        # Verificar se completou todos os testes obrigatórios
        # Placeholder para lógica complexa de testes obrigatórios
        
        return True
    
    @staticmethod
    def finalizar_onboarding(db: Session, candidate_id: int) -> Candidate:
        """Finaliza o onboarding"""
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise ValueError("Candidato não encontrado")
        
        candidate.status_onboarding = StatusOnboarding.ONBOARDING_CONCLUIDO.value
        candidate.percentual_completude = 100
        candidate.onboarding_completo = True
        db.commit()
        return candidate
    
    @staticmethod
    def contar_vagas_disponibles(db: Session, candidate_id: int) -> int:
        """Conta vagas disponíveis para a área do candidato"""
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate or not candidate.area_atuacao:
            return 0
        
        # Contar apenas vagas abertas na mesma área
        from app.models import Job
        return db.query(Job).filter(
            Job.area_atuacao == candidate.area_atuacao,
            Job.status == "aberta"
        ).count()
    
    @staticmethod
    def aceitar_entrevista(db: Session, candidate_id: int, vaga_id: int) -> VagaCandidato:
        """Candidato aceita entrevista - libera dados pessoais"""
        vaga_candidato = db.query(VagaCandidato).filter(
            VagaCandidato.candidate_id == candidate_id,
            VagaCandidato.vaga_id == vaga_id
        ).first()
        
        if not vaga_candidato:
            raise ValueError("Candidato não está vinculado a esta vaga")
        
        from datetime import datetime
        vaga_candidato.consentimento_entrevista = True
        vaga_candidato.dados_pessoais_liberados = True
        vaga_candidato.data_consentimento = datetime.utcnow()
        vaga_candidato.status_kanban = StatusKanbanCandidato.ENTREVISTA_ACEITA
        db.commit()
        return vaga_candidato
