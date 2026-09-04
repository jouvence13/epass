"""
================================================================================
MODULE : GESTION DES SESSIONS DE BASE DE DONNÉES (POSTGRESQL + POSTGIS)
================================================================================
Ce module initialise la connexion à PostgreSQL et PostGIS via SQLAlchemy 2.0 :
1. Un moteur asynchrone (AsyncEngine) via le driver 'asyncpg' pour FastAPI et les WebSockets.
2. Un moteur synchrone (SyncEngine) via le driver 'psycopg2' pour les workers Celery.
3. Un générateur de session 'get_async_db' utilisé comme dépendance dans les routes.
================================================================================
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings

# ==============================================================================
# 1. MOTEUR ASYNCHRONE (ASYNC ENGINE & POOL DE CONNEXIONS)
# ==============================================================================
# 'create_async_engine' gère le pool de connexions asynchrones vers PostgreSQL.
# - pool_size=20 : maintient 20 connexions ouvertes prêtes à être utilisées.
# - max_overflow=10 : autorise jusqu'à 10 connexions supplémentaires lors des pics de charge.
# - pool_pre_ping=True : teste chaque connexion avant de l'utiliser pour éviter les connexions mortes.
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG, # Affiche les requêtes SQL brutes dans la console en mode DEBUG
    future=True,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)

# Fabrique de sessions asynchrones
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False, # Empêche l'invalidation des attributs d'objets après un commit
    autocommit=False,
    autoflush=False
)

# ==============================================================================
# 2. MOTEUR SYNCHRONE (POUR LES WORKERS CELERY & CELERY BEAT)
# ==============================================================================
sync_engine = create_engine(
    settings.SYNC_DATABASE_URL,
    pool_size=10,
    max_overflow=5,
    pool_pre_ping=True
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


# ==============================================================================
# 3. DÉPENDANCE FASTAPI : INJECTION DE SESSION ASYNCHRONE
# ==============================================================================
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Générateur de session BDD asynchrone utilisé dans les endpoints FastAPI.
    
    Le mot-clé 'yield' permet à FastAPI d'exécuter la route avec la session ouverte,
    puis de garantir que 'session.close()' est toujours exécuté dans le bloc 'finally',
    même si une exception ou une erreur HTTP survient !
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            # En cas d'erreur inattendue, annuler les opérations en cours
            await session.rollback()
            raise
        finally:
            # Toujours libérer et restituer la connexion au pool
            await session.close()


def get_sync_session() -> Session:
    """
    Fournit une session synchrone classique pour les tâches de fond exécutées par Celery.
    """
    return SyncSessionLocal()
