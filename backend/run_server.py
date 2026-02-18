#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para iniciar o servidor com encoding UTF-8 configurado
"""
import sys
import os

# Forçar UTF-8 ANTES de qualquer importação
if sys.platform == 'win32':
    # Configurar encoding padrão
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['PGCLIENTENCODING'] = 'UTF8'
    
    # Reconfigurar stdout/stderr
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

# Agora importar e executar uvicorn
if __name__ == "__main__":
    import uvicorn
    from app.main import app
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

