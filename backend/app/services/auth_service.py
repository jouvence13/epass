"""
================================================================================
MODULE : SERVICE D'AUTHENTIFICATION ET DE GESTION DES DROITS (RBAC)
================================================================================
Ce fichier gère :
1. L'extraction et la validation sécurisée du jeton JWT envoyé par le client.
2. La récupération de l'utilisateur connecté depuis la base de données.
3. La vérification du contrôle d'accès basé sur les rôles (RBAC : Role-Based Access Control).
================================================================================
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

# FastAPI fournit les outils pour créer des APIs et gérer la sécurité HTTP
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# SQLAlchemy pour interagir avec la base de données PostgreSQL de manière asynchrone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Importations internes de notre application
from app.core.database import get_async_db
from app.core.security import decode_token, verify_password
from app.models.user_model import Users, UserRoleEnum, KycStatusEnum

# 'HTTPBearer' indique à Swagger et à FastAPI que l'authentification se fait via l'en-tête :
# Authorization: Bearer <token_jwt>
# Le paramètre 'auto_error=False' permet de gérer nous-mêmes le message d'erreur si le token est manquant.
security_scheme = HTTPBearer(auto_error=False)


async def get_current_authenticated_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_async_db)
) -> Users:
    """
    DÉPENDANCE FASTAPI : Récupère l'utilisateur connecté à partir du jeton JWT.
    
    Fonctionnement étape par étape :
    1. Vérifie si le header 'Authorization: Bearer ...' est présent dans la requête.
    2. Décode et vérifie la signature cryptographique du jeton JWT (HMAC-SHA256).
    3. Vérifie que le jeton n'est pas expiré et qu'il s'agit bien d'un token d'accès ('access').
    4. Récupère l'utilisateur dans PostgreSQL via son UUID.
    5. Vérifie que le compte utilisateur est actif (non suspendu).
    """

    # 1. Vérification de la présence des identifiants dans la requête HTTP
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton d'authentification manquant. Veuillez vous connecter.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Récupération de la chaîne brute du jeton JWT
    token = credentials.credentials
    try:
        # Décoder le jeton et vérifier sa signature avec notre clé secrète (SECRET_KEY)
        payload = decode_token(token)
    except ValueError as e:
        # Si le jeton est falsifié, corrompu ou expiré, lever une erreur 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Jeton d'accès invalide ou expiré : {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Vérification du type de jeton (doit être 'access' et non un 'refresh token')
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Type de jeton invalide (un jeton d'accès 'access' est requis).",
        )
    
    # 4. Extraction de l'identifiant utilisateur (champ 'sub' pour subject)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur introuvable dans le contenu du jeton.",
        )
    
    # Conversion de la chaîne en UUID valide
    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Format de l'identifiant utilisateur (UUID) invalide.",
        )
    
    # 5. Recherche de l'utilisateur dans PostgreSQL (via la session SQLAlchemy asynchrone)
    user = await db.get(Users, user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable dans la base de données.",
        )
    
    # 6. Vérification du statut d'activation du compte
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte utilisateur est désactivé ou temporairement suspendu.",
        )
    
    # Retourne l'objet modèle Users complet, accessible dans les routes FastAPI
    return user


def require_roles(allowed_roles: List[UserRoleEnum]):
    """
    USINE DE DÉPENDANCE (Dependency Factory) pour restreindre l'accès à certains rôles :
    Exemple d'utilisation sur un endpoint :
      current_admin = Depends(require_roles([UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN]))
    
    Si l'utilisateur connecté n'a pas l'un des rôles requis, une exception HTTP 403 Forbidden est levée.
    """
    async def role_checker(current_user: Users = Depends(get_current_authenticated_user)) -> Users:
        # Les SUPERADMIN ont toujours accès à toutes les fonctionnalités
        if current_user.role not in allowed_roles and current_user.role != UserRoleEnum.SUPERADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès refusé. Rôles autorisés pour cette action : {[r.value for r in allowed_roles]}",
            )
        return current_user
    
    return role_checker
