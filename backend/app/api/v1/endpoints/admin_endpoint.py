import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_async_db
from app.core.security import hash_password
from app.models.user_model import Users, UserRoleEnum, KycStatusEnum
from app.models.fleet_model import Buses, Stops, Routes, BusStatusEnum
from app.models.trip_model import Trips, TripStatusEnum
from app.models.payment_model import Payments, PaymentStatusEnum
from app.models.ticket_model import Tickets, TicketStatusEnum
from app.schemas.user_schema import AdminCreateUserSchema, UserProfileSchema
from app.schemas.fleet_schema import (
    BusCreateSchema,
    BusOutSchema,
    StopCreateSchema,
    StopOutSchema,
    RouteCreateSchema,
    RouteOutSchema,
)
from app.schemas.trip_schema import TripCreateSchema, TripOutSchema
from app.services.auth_service import require_roles

router = APIRouter(prefix="/admin", tags=["Admin & Fleet Management"])


# ==============================================================================
# User Management & Enrollment (SuperAdmin & Admin CROUS)
# ==============================================================================

@router.post("/users", response_model=UserProfileSchema, status_code=status.HTTP_201_CREATED)
async def create_user_by_admin(
    payload: AdminCreateUserSchema,
    current_admin: Users = Depends(require_roles([UserRoleEnum.SUPERADMIN, UserRoleEnum.ADMIN_CROUS])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    SuperAdmin & Admin CROUS: Create any staff or student user account (DRIVER, CONTROLLER, ADMIN_CROUS, STUDENT).
    Règle stricte: Il est strictement impossible de créer un autre compte SUPERADMIN.
    """
    if payload.role == UserRoleEnum.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Action interdite : Il est impossible de créer un compte avec le rôle SUPERADMIN."
        )

    # Check uniqueness of phone number and matricule
    query_conditions = [Users.phone_number == payload.phone_number]
    if payload.matricule_uac:
        query_conditions.append(Users.matricule_uac == payload.matricule_uac)

    existing = (await db.execute(select(Users).where(or_(*query_conditions)))).scalars().first()
    if existing:
        if existing.phone_number == payload.phone_number:
            raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà utilisé.")
        if payload.matricule_uac and existing.matricule_uac == payload.matricule_uac:
            raise HTTPException(status_code=400, detail="Ce matricule UAC est déjà assigné.")

    now = datetime.now(timezone.utc)
    new_user = Users(
        matricule_uac=payload.matricule_uac,
        phone_number=payload.phone_number,
        first_name=payload.first_name,
        last_name=payload.last_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        kyc_status=payload.kyc_status or (
            KycStatusEnum.APPROVED if payload.role != UserRoleEnum.STUDENT else KycStatusEnum.PENDING
        ),
        last_kyc_verification_date=now if payload.role != UserRoleEnum.STUDENT else None,
        next_kyc_due_date=(now + timedelta(days=90)) if payload.role != UserRoleEnum.STUDENT else None,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


# ==============================================================================
# Fleet Management (Buses, Stops, Routes)
# ==============================================================================

@router.get("/fleet", response_model=List[BusOutSchema])
async def list_fleet_buses(
    current_admin: Users = Depends(require_roles([UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """Admin: List all buses in the fleet."""
    result = await db.execute(select(Buses).order_by(Buses.bus_code.asc()))
    return result.scalars().all()


@router.post("/fleet/bus", response_model=BusOutSchema, status_code=status.HTTP_201_CREATED)
async def create_bus(
    payload: BusCreateSchema,
    current_admin: Users = Depends(require_roles([UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """Admin: Register a new bus in the fleet."""
    bus = Buses(
        immatriculation_number=payload.immatriculation_number,
        bus_code=payload.bus_code,
        max_capacity=payload.max_capacity,
        status=payload.status or BusStatusEnum.OPERATIONAL,
        current_driver_id=payload.current_driver_id
    )
    db.add(bus)
    await db.commit()
    await db.refresh(bus)
    return bus


@router.post("/stops", response_model=StopOutSchema, status_code=status.HTTP_201_CREATED)
async def create_stop(
    payload: StopCreateSchema,
    current_admin: Users = Depends(require_roles([UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """Admin: Create a new geographic bus stop with PostGIS Point(lon, lat)."""
    stop = Stops(
        stop_name=payload.stop_name,
        geolocation=func.ST_SetSRID(func.ST_MakePoint(payload.longitude, payload.latitude), 4326)
    )
    db.add(stop)
    await db.commit()
    await db.refresh(stop)

    return StopOutSchema(
        stop_id=stop.stop_id,
        stop_name=stop.stop_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        created_at=stop.created_at
    )


@router.post("/routes", response_model=RouteOutSchema, status_code=status.HTTP_201_CREATED)
async def create_route(
    payload: RouteCreateSchema,
    current_admin: Users = Depends(require_roles([UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """Admin: Create a new bus route / line."""
    route = Routes(
        route_name=payload.route_name,
        origin_stop_id=payload.origin_stop_id,
        destination_stop_id=payload.destination_stop_id,
        base_price=payload.base_price,
        estimated_duration_minutes=payload.estimated_duration_minutes,
        is_active=payload.is_active
    )
    db.add(route)
    await db.commit()
    await db.refresh(route)
    return route


@router.post("/trips", response_model=TripOutSchema, status_code=status.HTTP_201_CREATED)
async def schedule_trip(
    payload: TripCreateSchema,
    current_admin: Users = Depends(require_roles([UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """Admin: Schedule a new bus trip with capacity quota."""
    trip = Trips(
        route_id=payload.route_id,
        bus_id=payload.bus_id,
        driver_id=payload.driver_id,
        departure_time=payload.departure_time,
        estimated_arrival_time=payload.estimated_arrival_time,
        total_seats=payload.total_seats,
        available_seats=payload.total_seats,
        status=TripStatusEnum.SCHEDULED
    )
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return trip


# ==============================================================================
# Financial Audit & Global Reporting
# ==============================================================================

@router.get("/audit-fin")
async def get_financial_audit(
    current_admin: Users = Depends(require_roles([UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
) -> Dict[str, Any]:
    """
    Admin: Financial reporting, total revenue, mobile money gateway breakdown,
    ticket consumption metrics and recycling counts.
    """
    total_rev_query = select(func.coalesce(func.sum(Payments.amount), 0)).where(
        Payments.status == PaymentStatusEnum.SUCCESSFUL
    )
    total_rev = (await db.execute(total_rev_query)).scalar_one()

    total_tickets = (await db.execute(select(func.count(Tickets.ticket_id)))).scalar_one()
    validated_tickets = (await db.execute(select(func.count(Tickets.ticket_id)).where(Tickets.status == TicketStatusEnum.VALIDATED))).scalar_one()
    recycled_tickets = (await db.execute(select(func.count(Tickets.ticket_id)).where(Tickets.recycle_count > 0))).scalar_one()

    return {
        "total_revenue_xof": float(total_rev),
        "total_tickets_issued": total_tickets,
        "total_tickets_validated": validated_tickets,
        "total_tickets_recycled": recycled_tickets,
        "currency": "XOF (FCFA)"
    }
