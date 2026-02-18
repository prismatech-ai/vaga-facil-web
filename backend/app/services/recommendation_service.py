"""
Serviço de recomendação de vagas para candidatos
"""
from sqlalchemy.orm import Session
from typing import List, Dict, Optional, Tuple
import json
import logging
from difflib import SequenceMatcher

from app.models.candidate import Candidate
from app.models.job import Job, JobStatus
from app.models.test import Autoavaliacao

logger = logging.getLogger(__name__)


class RecommendationService:
    """Serviço para recomendar vagas com base no perfil do candidato"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def obter_habilidades_candidato(self, candidate_id: int) -> Dict[str, int]:
        """
        Obtém as habilidades autoavaliadas do candidato
        
        Retorna dict com formato: {"Python": 4, "React": 3, ...}
        """
        autoavaliacao = self.db.query(Autoavaliacao).filter(
            Autoavaliacao.candidate_id == candidate_id
        ).first()
        
        if not autoavaliacao:
            return {}
        
        habilidades = {}
        for resposta in autoavaliacao.respostas:
            if isinstance(resposta, dict):
                habilidades[resposta.get("habilidade", "").lower()] = resposta.get("nivel", 0)
        
        return habilidades
    
    def calcular_compatibilidade_localizacao(
        self,
        candidate_cidade: Optional[str],
        candidate_estado: Optional[str],
        job_remote: bool,
        job_location: Optional[str]
    ) -> Tuple[float, str]:
        """
        Calcula compatibilidade de localização
        
        Retorna: (score 0-1, motivo)
        """
        # Se a vaga é 100% remota, compatibilidade máxima
        if job_remote:
            return (1.0, "Vaga 100% remota")
        
        # Se não há localização do candidato ou vaga, score neutro
        if not candidate_cidade or not job_location:
            return (0.5, "Localização não especificada")
        
        # Comparar cidades (simplificado)
        candidate_city_lower = candidate_cidade.lower().strip()
        job_location_lower = job_location.lower().strip()
        
        # Match exato
        if candidate_city_lower == job_location_lower:
            return (1.0, f"Mesma cidade: {candidate_cidade}")
        
        # Match parcial (mesma estado)
        if candidate_estado and job_location_lower.endswith(candidate_estado.lower()):
            return (0.7, f"Mesmo estado: {candidate_estado}")
        
        # Sem match
        return (0.3, f"Localização diferente")
    
    def calcular_compatibilidade_habilidades(
        self,
        habilidades_candidato: Dict[str, int],
        requisitos_job: Optional[str]
    ) -> Tuple[float, int, List[str]]:
        """
        Calcula compatibilidade de habilidades
        
        Retorna: (score 0-1, habilidades_matches, habilidades_faltando)
        """
        if not requisitos_job:
            return (0.5, 0, [])
        
        # Extrair habilidades dos requisitos
        requisitos_lower = requisitos_job.lower()
        
        # Palavras-chave de linguagens e tecnologias
        tecnologias_comuns = {
            "python": ["python", "django", "flask", "fastapi"],
            "javascript": ["javascript", "js", "node", "nodejs"],
            "react": ["react", "reactjs"],
            "typescript": ["typescript", "ts"],
            "java": ["java"],
            "c#": ["c#", "csharp", "dotnet"],
            "sql": ["sql", "postgres", "postgresql", "mysql", "oracle"],
            "nosql": ["nosql", "mongodb", "redis"],
            "docker": ["docker"],
            "kubernetes": ["kubernetes", "k8s"],
            "aws": ["aws", "amazon"],
            "azure": ["azure"],
            "gcp": ["gcp", "google cloud"],
            "git": ["git", "github", "gitlab"],
            "rest": ["rest", "api"],
            "graphql": ["graphql"],
        }
        
        habilidades_encontradas = []
        habilidades_faltando = []
        
        for tech, keywords in tecnologias_comuns.items():
            # Verificar se alguma keyword está nos requisitos
            encontrada = any(keyword in requisitos_lower for keyword in keywords)
            
            if encontrada:
                # Verificar se o candidato tem essa habilidade
                if tech.lower() in habilidades_candidato:
                    habilidades_encontradas.append(tech)
                else:
                    habilidades_faltando.append(tech)
        
        # Calcular score
        total_habilidades = len(habilidades_encontradas) + len(habilidades_faltando)
        
        if total_habilidades == 0:
            return (0.5, 0, [])
        
        score = len(habilidades_encontradas) / total_habilidades
        return (score, len(habilidades_encontradas), habilidades_faltando)
    
    def recomendar_vagas(
        self,
        candidate_id: int,
        limit: int = 10
    ) -> List[Dict]:
        """
        Recomenda vagas para um candidato com base em seu perfil
        
        Retorna lista de vagas com score de compatibilidade
        """
        try:
            # Buscar candidato
            candidate = self.db.query(Candidate).filter(
                Candidate.id == candidate_id
            ).first()
            
            if not candidate:
                return []
            
            # Obter habilidades do candidato
            habilidades_candidato = self.obter_habilidades_candidato(candidate_id)
            
            # Buscar vagas abertas
            vagas = self.db.query(Job).filter(
                Job.status == JobStatus.ABERTA
            ).all()
            
            recomendacoes = []
            
            for vaga in vagas:
                # Score de localização
                score_localizacao, motivo_localizacao = self.calcular_compatibilidade_localizacao(
                    candidate.cidade,
                    candidate.estado,
                    vaga.remote,
                    vaga.location
                )
                
                # Score de habilidades
                score_habilidades, matches, faltando = self.calcular_compatibilidade_habilidades(
                    habilidades_candidato,
                    vaga.requirements
                )
                
                # Score de experiência (baseado em anos)
                score_experiencia = 0.5  # Default
                if candidate.experiencia_profissional and vaga.requirements:
                    # Se candidato tem experiência mencionada, aumenta score
                    if "junior" in vaga.requirements.lower() or "iniciante" in vaga.requirements.lower():
                        score_experiencia = 0.6
                    elif "senior" in vaga.requirements.lower():
                        score_experiencia = 0.7
                    else:
                        score_experiencia = 0.7
                
                # Score final (média ponderada)
                score_final = (
                    score_habilidades * 0.5 +      # 50% peso em habilidades
                    score_localizacao * 0.3 +       # 30% peso em localização
                    score_experiencia * 0.2         # 20% peso em experiência
                )
                
                # Preparar recomendação
                recomendacao = {
                    "job_id": vaga.id,
                    "job_title": vaga.title,
                    "company_id": vaga.company_id,
                    "location": vaga.location,
                    "remote": vaga.remote,
                    "job_type": vaga.job_type,
                    "salary_min": float(vaga.salary_min) if vaga.salary_min else None,
                    "salary_max": float(vaga.salary_max) if vaga.salary_max else None,
                    "description": vaga.description[:200] + "..." if vaga.description else None,
                    
                    # Score de compatibilidade
                    "compatibilidade_score": round(score_final * 100, 1),  # 0-100
                    "motivos": {
                        "localizacao": {
                            "score": round(score_localizacao * 100, 1),
                            "motivo": motivo_localizacao
                        },
                        "habilidades": {
                            "score": round(score_habilidades * 100, 1),
                            "matches": matches,
                            "faltando": faltando[:3]  # Top 3 faltando
                        },
                        "experiencia": {
                            "score": round(score_experiencia * 100, 1),
                            "motivo": "Experiência compatível"
                        }
                    }
                }
                
                recomendacoes.append(recomendacao)
            
            # Ordenar por score (decrescente)
            recomendacoes.sort(key=lambda x: x["compatibilidade_score"], reverse=True)
            
            logger.info(f"Recomendadas {len(recomendacoes[:limit])} vagas para candidato {candidate_id}")
            
            return recomendacoes[:limit]
        
        except Exception as e:
            logger.error(f"Erro ao recomendar vagas: {str(e)}", exc_info=True)
            return []
    
    def recomendar_vagas_por_habilidade(
        self,
        candidate_id: int,
        habilidade: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Recomenda vagas específicas para uma habilidade do candidato
        
        Se habilidade não for especificada, retorna baseado na melhor habilidade do candidato
        """
        try:
            # Obter habilidades do candidato
            habilidades_candidato = self.obter_habilidades_candidato(candidate_id)
            
            if not habilidades_candidato:
                return self.recomendar_vagas(candidate_id, limit)
            
            # Se habilidade não especificada, usar a melhor do candidato
            if not habilidade:
                habilidade = max(habilidades_candidato.items(), key=lambda x: x[1])[0]
            
            # Buscar vagas que mencionam essa habilidade
            vagas = self.db.query(Job).filter(
                Job.status == JobStatus.ABERTA,
                Job.requirements.ilike(f"%{habilidade}%")
            ).all()
            
            # Recomendar usando método principal
            candidate = self.db.query(Candidate).filter(
                Candidate.id == candidate_id
            ).first()
            
            recomendacoes = []
            for vaga in vagas:
                score_localizacao, motivo_localizacao = self.calcular_compatibilidade_localizacao(
                    candidate.cidade if candidate else None,
                    candidate.estado if candidate else None,
                    vaga.remote,
                    vaga.location
                )
                
                score_habilidades, matches, faltando = self.calcular_compatibilidade_habilidades(
                    habilidades_candidato,
                    vaga.requirements
                )
                
                score_final = score_habilidades * 0.7 + score_localizacao * 0.3
                
                recomendacao = {
                    "job_id": vaga.id,
                    "job_title": vaga.title,
                    "company_id": vaga.company_id,
                    "location": vaga.location,
                    "remote": vaga.remote,
                    "job_type": vaga.job_type,
                    "salary_min": float(vaga.salary_min) if vaga.salary_min else None,
                    "salary_max": float(vaga.salary_max) if vaga.salary_max else None,
                    "description": vaga.description[:200] + "..." if vaga.description else None,
                    "compatibilidade_score": round(score_final * 100, 1),
                    "habilidade_alvo": habilidade,
                    "motivo": f"Vaga encontrada para a habilidade {habilidade}"
                }
                
                recomendacoes.append(recomendacao)
            
            recomendacoes.sort(key=lambda x: x["compatibilidade_score"], reverse=True)
            
            return recomendacoes[:limit]
        
        except Exception as e:
            logger.error(f"Erro ao recomendar vagas por habilidade: {str(e)}", exc_info=True)
            return []
