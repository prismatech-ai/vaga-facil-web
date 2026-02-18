"""
Configuração do banco de dados
"""
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import os
import sys

# Configurar encoding UTF-8 para PostgreSQL
os.environ['PGCLIENTENCODING'] = 'UTF8'
os.environ['PYTHONIOENCODING'] = 'utf-8'

# No Windows, configurar encoding do stdout/stderr
if sys.platform == 'win32':
    if sys.stdout:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if sys.stderr:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Criar engine com configurações de encoding
# Railway já fornece uma URL de conexão completa
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,  # Recicla conexões a cada 1 hora (importante para Railway)
    connect_args={
        "client_encoding": "UTF8",
        "sslmode": "require",  # Railway requer SSL
    },
    echo=False
)

# Função para configurar encoding na conexão
@event.listens_for(engine, "connect")
def set_postgres_encoding(dbapi_conn, connection_record):
    """Configura encoding UTF-8 na conexão"""
    try:
        # Tentar configurar via método do psycopg2
        if hasattr(dbapi_conn, 'set_client_encoding'):
            dbapi_conn.set_client_encoding('UTF8')
        else:
            # Fallback: usar SQL
            with dbapi_conn.cursor() as cursor:
                cursor.execute("SET client_encoding TO 'UTF8'")
    except Exception:
        # Ignorar erros de encoding na configuração
        pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency para obter sessão do banco de dados"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

