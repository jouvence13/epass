import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

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


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserRegistrationSchema,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Register a new student or user account. Initial KYC status is set to PENDING.
    """
    # Check uniqueness of matricule (if provided) and phone number
    query_conditions = [Users.phone_number == payload.phone_number]
    if payload.matricule_uac:
        query_conditions.append(Users.matricule_uac == payload.matricule_uac)
        
    existing_user_query = await db.execute(
        select(Users).where(or_(*query_conditions))
    )
    existing_user = existing_user_query.scalars().first()
    if existing_user:
        if existing_user.phone_number == payload.phone_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce numéro de téléphone est déjà enregistré."
            )
        if payload.matricule_uac and existing_user.matricule_uac == payload.matricule_uac:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce matricule UAC est déjà associé à un autre compte."
            )

    new_user = Users(
        matricule_uac=payload.matricule_uac,
        phone_number=payload.phone_number,
        first_name=payload.first_name,
        last_name=payload.last_name,
        password_hash=hash_password(payload.password),
        role=payload.role or UserRoleEnum.STUDENT,
        kyc_status=KycStatusEnum.PENDING,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "message": "Inscription réussie avec succès. Téléversez vos justificatifs académiques pour valider votre compte.",
        "user_id": new_user.user_id,
        "kyc_status": new_user.kyc_status
    }


@router.post("/login", response_model=TokenResponseSchema)
async def login_user(
    payload: UserLoginSchema,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Authenticate user by phone number and password. Returns JWT access and refresh tokens.
    """
    user_query = await db.execute(
        select(Users).where(Users.phone_number == payload.phone_number)
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

    return TokenResponseSchema(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user_id=user.user_id,
        role=user.role,
        kyc_status=user.kyc_status
    )


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
