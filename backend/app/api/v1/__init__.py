"""
API v1 Routes
"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, companies, jobs, pipeline, dashboard, admin, candidates, onboarding, candidate_tests, autoavaliacao, adaptive_tests, candidato_status, workflow, certification_tests, pagamentos, contratos
from app.api.v1 import candidato as candidato_router
from app.api.v1 import empresa as empresa_router
from app.api.v1 import uploads as uploads_router

api_router = APIRouter()

# Incluir rotas
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
api_router.include_router(onboarding.router)  # router já tem seu próprio prefix="/candidates"
api_router.include_router(candidate_tests.router)  # router já tem seu próprio prefix
api_router.include_router(adaptive_tests.router)  # router já tem seu próprio prefix para testes adaptativos
api_router.include_router(certification_tests.router)  # router para certificação de competências (BD CC)
api_router.include_router(candidato_status.router, prefix="/candidato", tags=["Candidato Status"])  # router já tem seu próprio prefix="/api/v1/candidato"
api_router.include_router(autoavaliacao.router)  # router já tem seu próprio prefix="/autoavaliacao"
api_router.include_router(companies.router, prefix="/companies", tags=["empresas"])
api_router.include_router(candidates.router, prefix="/companies", tags=["Candidatos"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Vagas"])
api_router.include_router(pipeline.router, prefix="/pipeline", tags=["Pipeline"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(admin.router, prefix="/admin", tags=["administração"])

# NOVAS ROTAS - Sistema completo de onboarding e matching
api_router.include_router(candidato_router.router, prefix="/candidato", tags=["Candidato"])
api_router.include_router(empresa_router.router, tags=["Empresa"])
api_router.include_router(empresa_router.router_plural, tags=["Empresa"])
api_router.include_router(uploads_router.router, tags=["Uploads R2"])
api_router.include_router(workflow.router, prefix="/workflow", tags=["Workflow"])
api_router.include_router(pagamentos.router, tags=["Pagamentos"])
api_router.include_router(contratos.router, tags=["Contratos"])

