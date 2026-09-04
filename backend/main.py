"""
================================================================================
POINT D'ENTRÉE PRINCIPAL DE L'APPLICATION ASGI (FASTAPI)
================================================================================
Ce fichier est le point de départ de votre serveur backend. Il effectue :
1. La configuration du cycle de vie de l'application (Lifespan : démarrage / arrêt).
2. L'activation des middlewares de sécurité (CORS pour autoriser Vue.js et React Native).
3. Le montage des routes de fichiers statiques (pour les photos KYC).
4. L'enregistrement des routeurs d'API REST (v1) et WebSockets (GPS temps réel).
5. La route de santé (Health Check) pour le monitoring des conteneurs.
================================================================================
"""

from contextlib import asynccontextmanager
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Importations internes de notre application
from app.core.config import settings
from app.core.redis import get_redis_client, close_redis_client
from app.api.v1.api_router import api_router
from app.api.websockets.gps_tracker_ws import ws_router

# Configuration du système de journalisation (Logging)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("uac_buspass")


# ==============================================================================
# GESTION DU CYCLE DE VIE (LIFESPAN EVENTS)
# ==============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Le gestionnaire de contexte 'lifespan' remplace les anciens événements '@app.on_event("startup")'.
    - Tout ce qui est AVANT 'yield' s'exécute au DÉMARRAGE du serveur.
    - Tout ce qui est APRÈS 'yield' s'exécute lors de l'ARRÊT du serveur.
    """
    # 1. Création automatique du dossier des téléversements s'il n'existe pas
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info("Dossier de stockage KYC initialisé.")
    
    # 2. Initialisation de la connexion Redis pour le cache et le pub/sub
    logger.info("Connexion au serveur Redis en cours...")
    try:
        await get_redis_client()
        logger.info("Serveur Redis connecté avec succès.")
    except Exception as e:
        logger.warning(f"Avertissement de connexion Redis : {e}")
        
    yield  # Le serveur FastAPI est maintenant actif et traite les requêtes
    
    # 3. Fermeture propre des connexions lors de l'extinction du serveur
    logger.info("Fermeture du pool de connexions Redis...")
    await close_redis_client()
    logger.info("Extinction propre du serveur terminée.")


# ==============================================================================
# CRÉATION DE L'INSTANCE FASTAPI
# ==============================================================================
app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API & WebSockets pour le système de billetterie numérique et gestion de flotte UAC-BusPass.",
    version="1.0.0",
    docs_url="/docs",      # URL pour la documentation interactive Swagger UI
    redoc_url="/redoc",    # URL pour la documentation ReDoc
    lifespan=lifespan
)

# ==============================================================================
# MIDDLEWARE CORS (CROSS-ORIGIN RESOURCE SHARING)
# ==============================================================================
# Indispensable pour autoriser votre binôme Frontend (Vue.js Admin sur le port 5173/3000
# et React Native Mobile) à effectuer des requêtes vers ce backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],  # Autorise toutes les méthodes HTTP (GET, POST, PUT, DELETE...)
    allow_headers=["*"],  # Autorise tous les en-têtes HTTP (Authorization, Content-Type...)
)

# Montage du dossier des fichiers téléversés en accès statique sur le serveur
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Inclusion des routeurs principaux
app.include_router(api_router, prefix=settings.API_V1_PREFIX) # Routes REST : /api/v1/...
app.include_router(ws_router)                                 # Routes WebSockets : /ws/...


# ==============================================================================
# POINT DE CONTRÔLE DE SANTÉ (HEALTH CHECK)
# ==============================================================================
@app.get("/health", tags=["Health & Status"])
async def health_check():
    """
    Endpoint léger utilisé par Docker et les outils de monitoring
    pour vérifier que l'API répond correctement.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "1.0.0"
    }


# Permet d'exécuter directement le fichier avec 'python main.py'
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
