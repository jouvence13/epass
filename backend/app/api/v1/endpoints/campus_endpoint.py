import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.core.database import get_async_db
from app.models.user_model import Users, UserRoleEnum
from app.models.campus_model import Campuses
from app.schemas.campus_schema import (
    CampusOutSchema,
    CampusCreateSchema,
    CampusUpdateSchema,
)
from app.services.auth_service import get_current_authenticated_user

router = APIRouter(tags=["Campuses"])


@router.get("/campuses", response_model=List[CampusOutSchema])
async def get_active_campuses(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Returns the list of active university campuses in Benin (UAC, UP, UNA, UNSTIM, etc.)
    with their GPS coordinates and landmarks.
    """
    query = await db.execute(
        select(Campuses)
        .where(Campuses.is_active == True)
        .order_by(Campuses.name.asc())
    )
    campuses = query.scalars().all()
    return campuses


@router.get("/admin/campuses", response_model=List[CampusOutSchema])
async def admin_get_all_campuses(
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Admin endpoint to retrieve all campuses (active and inactive).
    """
    if current_user.role not in [UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé à l'administration des campus."
        )
    query = await db.execute(
        select(Campuses).order_by(Campuses.created_at.desc())
    )
    campuses = query.scalars().all()
    return campuses


@router.post("/admin/campuses", response_model=CampusOutSchema, status_code=status.HTTP_201_CREATED)
async def admin_create_campus(
    payload: CampusCreateSchema,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Admin endpoint to create a new university campus.
    """
    if current_user.role not in [UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé à l'administration des campus."
        )

    # Check if code already exists
    existing = await db.execute(select(Campuses).where(Campuses.code == payload.code.upper()))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Un campus avec le code {payload.code.upper()} existe déjà."
        )

    new_campus = Campuses(
        code=payload.code.upper(),
        name=payload.name,
        city=payload.city,
        latitude=payload.latitude,
        longitude=payload.longitude,
        zoom_level=payload.zoom_level,
        is_active=payload.is_active,
        landmarks=payload.landmarks or []
    )
    db.add(new_campus)
    await db.commit()
    await db.refresh(new_campus)
    return new_campus


@router.put("/admin/campuses/{campus_id}", response_model=CampusOutSchema)
async def admin_update_campus(
    campus_id: uuid.UUID,
    payload: CampusUpdateSchema,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Admin endpoint to update campus details (GPS coordinates, name, active status, landmarks).
    """
    if current_user.role not in [UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé à l'administration des campus."
        )

    query = await db.execute(select(Campuses).where(Campuses.campus_id == campus_id))
    campus = query.scalars().first()
    if not campus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campus introuvable."
        )

    update_data = payload.dict(exclude_unset=True)
    if "code" in update_data and update_data["code"]:
        update_data["code"] = update_data["code"].upper()

    for key, value in update_data.items():
        setattr(campus, key, value)

    await db.commit()
    await db.refresh(campus)
    return campus


@router.delete("/admin/campuses/{campus_id}")
async def admin_delete_campus(
    campus_id: uuid.UUID,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    SuperAdmin endpoint to delete or deactivate a campus.
    """
    if current_user.role != UserRoleEnum.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul le SuperAdmin peut supprimer un campus universitaire."
        )

    query = await db.execute(select(Campuses).where(Campuses.campus_id == campus_id))
    campus = query.scalars().first()
    if not campus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campus introuvable."
        )

    await db.delete(campus)
    await db.commit()
    return {"status": "success", "message": f"Campus {campus.name} supprimé avec succès."}
