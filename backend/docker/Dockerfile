FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Installation des dépendances système nécessaires pour PostGIS, GeoAlchemy2, Cryptographie et PostgreSQL Client
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Droits d'exécution sur le script d'entrée
RUN chmod +x /app/docker/entrypoint.sh && mkdir -p /app/uploads/kyc

EXPOSE 8000

ENTRYPOINT ["/app/docker/entrypoint.sh"]

# Commande par défaut (développement avec rechargement automatique)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
