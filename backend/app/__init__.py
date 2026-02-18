"""
Inicialização da aplicação - Configurar encoding UTF-8 ANTES de tudo
"""
import sys
import os

# Carregar .env ANTES de qualquer outra coisa (MUITO IMPORTANTE)
from dotenv import load_dotenv
load_dotenv(verbose=True)

# DEBUG: Variáveis carregadas via load_dotenv

# Forçar UTF-8 no Windows ANTES de qualquer outra coisa
if sys.platform == 'win32':
    # Configurar encoding padrão
    if hasattr(sys, 'setdefaultencoding'):
        sys.setdefaultencoding('utf-8')
    
    # Configurar variáveis de ambiente
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['PGCLIENTENCODING'] = 'UTF8'
    
    # Reconfigurar stdout/stderr para UTF-8
    if sys.stdout:
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except:
            pass
    if sys.stderr:
        try:
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        except:
            pass
