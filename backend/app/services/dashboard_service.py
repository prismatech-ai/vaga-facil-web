"""
Serviço de Dashboard
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.company import Company
from app.models.job import Job, JobStatus
from app.models.job_application import JobApplication, ApplicationStatus
from app.models.candidato_teste import VagaCandidato
from app.schemas.company import CompanyDashboard, CompanyResponse

class DashboardService:
    """Serviço para dados do dashboard"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_company_dashboard(self, company_id: int) -> CompanyDashboard:
        """Retorna dados do dashboard da empresa"""
        company = self.db.query(Company).filter(Company.id == company_id).first()
        
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="empresa não encontrada"
            )
        
        # Total de vagas
        total_jobs = self.db.query(func.count(Job.id)).filter(
            Job.company_id == company_id
        ).scalar() or 0
        
        # Vagas abertas
        open_jobs = self.db.query(func.count(Job.id)).filter(
            Job.company_id == company_id,
            Job.status == JobStatus.ABERTA
        ).scalar() or 0
        
        # Total de candidatos com interesse da empresa
        try:
            total_candidates = self.db.query(func.count(func.distinct(VagaCandidato.candidate_id))).filter(
                VagaCandidato.vaga_id.in_(
                    self.db.query(Job.id).filter(Job.company_id == company_id)
                ),
                VagaCandidato.empresa_demonstrou_interesse == True
            ).scalar() or 0
        except:
            total_candidates = 0
        
        # Convites enviados (onde empresa demonstrou interesse)
        try:
            convites_enviados = self.db.query(func.count(VagaCandidato.id)).filter(
                VagaCandidato.vaga_id.in_(
                    self.db.query(Job.id).filter(Job.company_id == company_id)
                ),
                VagaCandidato.empresa_demonstrou_interesse == True
            ).scalar() or 0
        except:
            convites_enviados = 0
        
        # Convites aceitos (onde candidato consentiu com a entrevista)
        try:
            convites_aceitos = self.db.query(func.count(VagaCandidato.id)).filter(
                VagaCandidato.vaga_id.in_(
                    self.db.query(Job.id).filter(Job.company_id == company_id)
                ),
                VagaCandidato.empresa_demonstrou_interesse == True,
                VagaCandidato.consentimento_entrevista == True
            ).scalar() or 0
        except:
            convites_aceitos = 0
        
        # Total de visualizações
        total_views = self.db.query(func.sum(Job.views_count)).filter(
            Job.company_id == company_id
        ).scalar() or 0
        
        # candidatos no pipeline por status
        pipeline_candidates = {}
        for status_enum in ApplicationStatus:
            count = self.db.query(func.count(JobApplication.id)).join(Job).filter(
                Job.company_id == company_id,
                JobApplication.status == status_enum
            ).scalar() or 0
            pipeline_candidates[status_enum.value] = count
        
        return CompanyDashboard(
            company=CompanyResponse.model_validate(company),
            total_jobs=total_jobs,
            open_jobs=open_jobs,
            total_candidates=total_candidates,
            convites_enviados=convites_enviados,
            convites_aceitos=convites_aceitos,
            total_views=int(total_views),
            pipeline_candidates=pipeline_candidates
        )

