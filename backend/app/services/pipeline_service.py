"""
Serviço de Pipeline de candidatos
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.job_application import JobApplication, ApplicationStatus
from app.models.job import Job
from sqlalchemy import func

class PipelineService:
    """Serviço para operações com pipeline de candidatos"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def update_application_status(
        self,
        application_id: int,
        company_id: int,
        new_status: ApplicationStatus
    ) -> JobApplication:
        """Atualiza status de uma candidatura"""
        application = self.db.query(JobApplication).join(Job).filter(
            JobApplication.id == application_id,
            Job.company_id == company_id
        ).first()
        
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidatura não encontrada"
            )
        
        application.status = new_status
        self.db.commit()
        self.db.refresh(application)
        
        return application
    
    async def get_company_pipeline_stats(self, company_id: int) -> dict:
        """Retorna estatísticas do pipeline da empresa"""
        # Contar candidaturas por status para todas as vagas da empresa
        stats = {}
        total = 0
        
        for status_enum in ApplicationStatus:
            count = self.db.query(func.count(JobApplication.id)).join(Job).filter(
                Job.company_id == company_id,
                JobApplication.status == status_enum
            ).scalar()
            stats[status_enum.value] = count
            total += count
        
        return {
            "total_applications": total,
            "by_status": stats
        }
    
    async def get_job_pipeline_stats(self, job_id: int) -> dict:
        """Retorna estatísticas do pipeline de uma vaga específica"""
        stats = {}
        total = 0
        
        for status_enum in ApplicationStatus:
            count = self.db.query(func.count(JobApplication.id)).filter(
                JobApplication.job_id == job_id,
                JobApplication.status == status_enum
            ).scalar()
            stats[status_enum.value] = count
            total += count
        
        return {
            "job_id": job_id,
            "total_applications": total,
            "by_status": stats
        }

