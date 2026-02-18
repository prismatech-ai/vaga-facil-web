"""
Endpoints de Dashboard
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_company
from app.models.company import Company
from app.schemas.company import CompanyDashboard
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/company", response_model=CompanyDashboard)
async def get_company_dashboard(
    current_company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Retorna dados do dashboard da empresa"""
    service = DashboardService(db)
    dashboard_data = await service.get_company_dashboard(current_company.id)
    return dashboard_data

