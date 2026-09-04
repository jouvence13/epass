import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.config import settings
from app.core.database import get_async_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user_model import Users, UserRoleEnum, KycStatusEnum
from app.schemas.user_schema import (
    UserRegistrationSchema,
    UserLoginSchema,
    TokenResponseSchema,
    RefreshTokenRequestSchema,
    UserProfileSchema,
)
from app.services.auth_service import get_current_authenticated_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """
    Enregistre les cookies de session sécurisés HttpOnly (protection anti-XSS et CSRF Lax).
    """
    response.set_cookie(
        key="epass_session",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    response.set_cookie(
        key="epass_refresh",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/"
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserRegistrationSchema,
    response: Response,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Register a new student or user account. Initial KYC status is set to PENDING.
    Sets HttpOnly session cookie on response.
    """
    # Nettoyage du numéro de téléphone
    phone_clean = payload.phone_number.replace(" ", "").replace("-", "")
    
    # Check uniqueness of matricule (if provided) and phone number
    query_conditions = [Users.phone_number == phone_clean]
    if payload.matricule_uac:
        query_conditions.append(Users.matricule_uac == payload.matricule_uac.strip())
        
    existing_user_query = await db.execute(
        select(Users).where(or_(*query_conditions))
    )
    existing_user = existing_user_query.scalars().first()
    if existing_user:
        if existing_user.phone_number == phone_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce numéro de téléphone est déjà enregistré."
            )
        if payload.matricule_uac and existing_user.matricule_uac == payload.matricule_uac.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce matricule UAC est déjà associé à un autre compte."
            )

    # Règle stricte : Seuls les étudiants peuvent s'inscrire publiquement
    if not payload.matricule_uac or not payload.matricule_uac.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le numéro de matricule UAC est obligatoire pour l'inscription d'un étudiant."
        )

    user_role = UserRoleEnum.STUDENT

    new_user = Users(
        matricule_uac=payload.matricule_uac.strip(),
        phone_number=phone_clean,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        password_hash=hash_password(payload.password),
        role=user_role,
        kyc_status=KycStatusEnum.NOT_SUBMITTED,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Génération automatique du token de session et dépôt du cookie
    access_token = create_access_token(subject=str(new_user.user_id), role=new_user.role.value)
    refresh_token = create_refresh_token(subject=str(new_user.user_id), role=new_user.role.value)
    _set_auth_cookies(response, access_token, refresh_token)

    return {
        "message": "Inscription réussie avec succès. Téléversez vos justificatifs académiques pour valider votre compte.",
        "user_id": new_user.user_id,
        "access_token": access_token,
        "role": new_user.role,
        "kyc_status": new_user.kyc_status
    }


@router.post("/login", response_model=TokenResponseSchema)
async def login_user(
    payload: UserLoginSchema,
    response: Response,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Authenticate user by phone number and password. Returns JWT access and sets session cookie.
    """
    phone_clean = payload.phone_number.replace(" ", "").replace("-", "")
    user_query = await db.execute(
        select(Users).where(Users.phone_number == phone_clean)
    )
    user = user_query.scalars().first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Numéro de téléphone ou mot de passe incorrect."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Votre compte est désactivé. Veuillez contacter le support CROUS."
        )

    access_token = create_access_token(subject=str(user.user_id), role=user.role.value)
    refresh_token = create_refresh_token(subject=str(user.user_id), role=user.role.value)
    _set_auth_cookies(response, access_token, refresh_token)

    return TokenResponseSchema(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user_id=user.user_id,
        role=user.role,
        kyc_status=user.kyc_status
    )


@router.post("/logout")
async def logout_user(response: Response):
    """
    Logout user and clear session cookies.
    """
    response.delete_cookie(key="epass_session", path="/")
    response.delete_cookie(key="epass_refresh", path="/")
    return {"message": "Déconnexion réussie. Session et cookies réinitialisés."}


@router.post("/refresh", response_model=TokenResponseSchema)
async def refresh_access_token(
    payload: RefreshTokenRequestSchema,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Refresh expired JWT access token using valid refresh token.
    """
    try:
        token_payload = decode_token(payload.refresh_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Jeton de rafraîchissement invalide : {str(e)}"
        )

    if token_payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Type de jeton invalide (refresh token requis)."
        )

    user_id_str = token_payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant utilisateur introuvable dans le jeton."
        )
    try:
        user_uuid = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Format d'identifiant utilisateur invalide."
        )

    user = await db.get(Users, user_uuid)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur inactif ou introuvable."
        )

    new_access_token = create_access_token(subject=str(user.user_id), role=user.role.value)
    new_refresh_token = create_refresh_token(subject=str(user.user_id), role=user.role.value)

    return TokenResponseSchema(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user_id=user.user_id,
        role=user.role,
        kyc_status=user.kyc_status
    )


@router.get("/me", response_model=UserProfileSchema)
async def get_my_profile(
    current_user: Users = Depends(get_current_authenticated_user)
):
    """Retrieve logged in user profile & KYC information."""
    return current_user
