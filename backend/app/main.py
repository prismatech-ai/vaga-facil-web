"""
Aplicação principal FastAPI - VagaFacil Backend
"""
# Importar __init__ primeiro para configurar encoding e carregar .env
import app  # noqa: F401

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pathlib import Path
from app.core.config import settings
from app.api.v1 import api_router

# Run migrations on startup
try:
    from app.migrations.add_candidate_status import add_missing_columns
    add_missing_columns()
except Exception as e:
    print(f"⚠️  Could not run migrations: {e}")

# Force reload 2025-12-17 09:59
app = FastAPI(
    title="VagaFacil API",
    description="API para sistema de gestão de vagas - admin, empresa e candidato",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuração CORS - DEVE SER O PRIMEIRO MIDDLEWARE
cors_origins = list(set(settings.CORS_ORIGINS + [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://vaga-facil-front-beta.vercel.app",
    "https://vaga-facil-front.vercel.app",
    "https://vagafacil.org",
    "https://www.vagafacil.org",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.railway\.app|https://.*vagafacil\.org",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Servir arquivos estáticos (uploads)
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(exist_ok=True)
app.mount(f"/{settings.UPLOAD_DIR}", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Exception handlers with CORS support
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with CORS headers"""
    origin = request.headers.get("origin")
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with CORS headers"""
    origin = request.headers.get("origin")
    response = JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Incluir rotas
app.include_router(api_router, prefix="/api/v1")



@app.get("/")
async def root():
    """API Root - Redireciona para docs"""
    return {
        "message": "VagaFacil API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.middleware("http")
async def add_cors_header_on_error(request: Request, call_next):
    """
    Middleware que garante que CORS headers sejam sempre incluídos,
    mesmo em caso de erro na rota.
    """
    response = await call_next(request)
    origin = request.headers.get("origin")
    
    # Sempre adiciona CORS headers se houver origin
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    
    return response
