"""
Serviço de empresas
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, UserType
from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.core.security import get_password_hash
from app.utils.cnpj_validator import validate_cnpj
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class CompanyService:
    """Serviço para operações com empresas"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_company(self, company_data: CompanyCreate) -> Company:
        """Cria uma nova empresa"""
        logger.info(f"Criando empresa: email={company_data.email}, cnpj={company_data.cnpj}")
        
        # Validar CNPJ
        if not validate_cnpj(company_data.cnpj):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CNPJ inválido"
            )
        
        # Verificar se CNPJ já existe
        existing_company = self.db.query(Company).filter(
            Company.cnpj == company_data.cnpj
        ).first()
        if existing_company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CNPJ já cadastrado"
            )
        
        # Verificar se email já existe
        existing_user = self.db.query(User).filter(
            User.email == company_data.email
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já cadastrado"
            )
        
        # Criar usuário
        user = User(
            email=company_data.email,
            password_hash=get_password_hash(company_data.password),
            user_type=UserType.empresa,
            is_active=True,
            is_verified=False
        )
        self.db.add(user)
        self.db.flush()  # Flush para gerar o ID do usuário sem fazer commit
        
        # Criar empresa
        company = Company(
            user_id=user.id,  # Agora user.id está disponível após flush
            cnpj=company_data.cnpj,
            razao_social=company_data.razao_social,
            nome_fantasia=company_data.nome_fantasia,
            setor=company_data.setor,
            site=company_data.site,
            descricao=company_data.descricao,
            is_verified=False,
            is_active=True
        )
        
        self.db.add(company)
        
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao salvar no banco: {str(e)}"
            )
        
        self.db.refresh(company)
        self.db.refresh(user)
        print(f"DEBUG: Refresh realizado. User ID: {user.id}, Company ID: {company.id}")
        
        # Verificar se a company foi realmente salva no banco
        verify_company = self.db.query(Company).filter(Company.id == company.id).first()
        print(f"DEBUG: Verificação pós-commit - Company encontrada no banco: {verify_company is not None}")
        if verify_company:
            print(f"DEBUG: Company verificada - ID: {verify_company.id}, CNPJ: {verify_company.cnpj}, User ID: {verify_company.user_id}")
        else:
            print(f"DEBUG: ERRO - Company NÃO foi encontrada no banco após commit!")
        
        logger.info(f"Empresa criada com sucesso: id={company.id}, cnpj={company.cnpj}")
        
        
        return company
    
    async def update_company(self, company_id: int, company_update: CompanyUpdate) -> Company:
        """Atualiza dados da empresa"""
        company = self.db.query(Company).filter(Company.id == company_id).first()
        
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="empresa não encontrada"
            )
        
        # Atualizar campos fornecidos
        update_data = company_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(company, field, value)
        
        company.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(company)
        
        return company
    
    async def get_company_by_id(self, company_id: int) -> Company:
        """Retorna empresa por ID"""
        company = self.db.query(Company).filter(Company.id == company_id).first()
        
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="empresa não encontrada"
            )
        
        return company

