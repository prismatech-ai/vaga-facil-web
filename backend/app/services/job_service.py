"""
Serviço de Vagas
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.job import Job, JobStatus
from app.schemas.job import JobCreate, JobUpdate
from datetime import datetime
from sqlalchemy import func

class JobService:
    """Serviço para operações com vagas"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_job(self, company_id: int, job_data: JobCreate) -> Job:
        """Cria uma nova vaga"""
        # Criar vaga
        job = Job(
            company_id=company_id,
            title=job_data.title,
            description=job_data.description,
            requirements=job_data.requirements,
            benefits=job_data.benefits,
            location=job_data.location,
            remote=job_data.remote,
            job_type=job_data.job_type,
            salary_min=job_data.salary_min,
            salary_max=job_data.salary_max,
            salary_currency=job_data.salary_currency,
            status=JobStatus.RASCUNHO
        )
        
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        
        return job
    
    async def update_job(self, job_id: int, company_id: int, job_update: JobUpdate) -> Job:
        """Atualiza uma vaga"""
        job = self.db.query(Job).filter(
            Job.id == job_id,
            Job.company_id == company_id
        ).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vaga não encontrada"
            )
        
        # Atualizar campos fornecidos
        update_data = job_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(job, field, value)
        
        job.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(job)
        
        return job
    
    async def publish_job(self, job_id: int, company_id: int) -> Job:
        """Publica uma vaga"""
        job = self.db.query(Job).filter(
            Job.id == job_id,
            Job.company_id == company_id
        ).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vaga não encontrada"
            )
        
        job.status = JobStatus.ABERTA
        job.published_at = datetime.utcnow()
        job.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(job)
        
        return job
    
    async def close_job(self, job_id: int, company_id: int) -> Job:
        """Encerra uma vaga"""
        job = self.db.query(Job).filter(
            Job.id == job_id,
            Job.company_id == company_id
        ).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vaga não encontrada"
            )
        
        job.status = JobStatus.ENCERRADA
        job.closed_at = datetime.utcnow()
        job.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(job)
        
        return job
    
    async def get_job_metrics(self, job_id: int, company_id: int) -> dict:
        """Retorna métricas de uma vaga"""
        job = self.db.query(Job).filter(
            Job.id == job_id,
            Job.company_id == company_id
        ).first()
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vaga não encontrada"
            )
        
        # Contar candidaturas por status
        from app.models.job_application import JobApplication, ApplicationStatus
        
        applications_by_status = {}
        for status_enum in ApplicationStatus:
            count = self.db.query(func.count(JobApplication.id)).filter(
                JobApplication.job_id == job_id,
                JobApplication.status == status_enum
            ).scalar()
            applications_by_status[status_enum.value] = count
        
        return {
            "job_id": job.id,
            "views_count": job.views_count,
            "applications_count": job.applications_count,
            "applications_by_status": applications_by_status,
            "top_candidates": []  # Implementar lógica de top candidatos se necessário
        }

