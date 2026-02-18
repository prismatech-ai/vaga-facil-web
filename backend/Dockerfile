FROM python:3.11-slim

WORKDIR /app

# Configuração de região para assinaturas S3-compatible (Cloudflare R2)
ENV R2_REGION=auto

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Criar diretório de uploads
RUN mkdir -p uploads

# Expor porta
EXPOSE 8000

# Comando para executar a aplicação
CMD ["bash", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]


