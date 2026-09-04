import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.functions import ST_X, ST_Y

from app.core.database import get_async_db
from app.core.security import hash_password
from app.models.user_model import Users, UserRoleEnum, KycStatusEnum
from app.models.fleet_model import Buses, Stops, Routes, BusStatusEnum
from app.models.trip_model import Trips, TripStatusEnum, GpsLogs
from app.models.payment_model import Payments, PaymentStatusEnum, PaymentGatewayEnum
from app.models.ticket_model import Tickets, TicketStatusEnum
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
# Demo Data Seeder (Initialise toutes les entités requises par le Frontend)
# ==============================================================================

@router.post("/seed-demo-data", status_code=status.HTTP_200_OK)
async def seed_demo_data(
    db: AsyncSession = Depends(get_async_db)
) -> Dict[str, Any]:
    """
    Seed Demo Data Endpoint:
    Populates the database with realistic test records matching the mobile app screens:
    - Stops: Calavi Campus, Science Block, Godomey, Cotonou Centre
    - Route: Campus Express Route 4 (250 FCFA)
    - Bus: Bus #402 (BUS-UAC-01)
    - Trips: 07:30 (32 seats available), 08:15 (0 seats - Full)
    - Students: Koffi Alain (active ticket A7B9-X2M4), Sena Dossou, Aminata Sylla, Marius Adjovi
    - Driver: Chauffeur UAC
    """
    now = datetime.now(timezone.utc)

    # 1. Stops
    stops_data = [
        ("Calavi Campus", 6.4474, 2.3557),
        ("Science Block", 6.4420, 2.3600),
        ("Godomey", 6.4000, 2.3400),
        ("Cotonou Centre", 6.3703, 2.4174)
    ]
    stops_map = {}
    for name, lat, lon in stops_data:
        existing = (await db.execute(select(Stops).where(Stops.stop_name == name))).scalars().first()
        if not existing:
            existing = Stops(
                stop_name=name,
                geolocation=func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
            )
            db.add(existing)
            await db.flush()
        stops_map[name] = existing

    # 2. Driver & Students
    driver = (await db.execute(select(Users).where(Users.phone_number == "+22997000001"))).scalars().first()
    if not driver:
        driver = Users(
            matricule_uac="DRV-2024-001",
            phone_number="+22997000001",
            first_name="Chauffeur",
            last_name="CROUS",
            password_hash=hash_password("Driver1234"),
            role=UserRoleEnum.DRIVER,
            kyc_status=KycStatusEnum.APPROVED,
            is_active=True
        )
        db.add(driver)
        await db.flush()

    students_data = [
        ("Koffi", "Alain", "UAC-2022-8492", "+22997001122"),
        ("Sena", "Dossou", "UAC-2021-3310", "+22995443322"),
        ("Aminata", "Sylla", "UAC-2023-1102", "+22961229988"),
        ("Marius", "Adjovi", "UAC-2020-5521", "+22966123456")
    ]
    students_map = {}
    for fn, ln, mat, phone in students_data:
        st = (await db.execute(select(Users).where(Users.phone_number == phone))).scalars().first()
        if not st:
            st = Users(
                matricule_uac=mat,
                phone_number=phone,
                first_name=fn,
                last_name=ln,
                password_hash=hash_password("Student1234"),
                role=UserRoleEnum.STUDENT,
                kyc_status=KycStatusEnum.APPROVED,
                last_kyc_verification_date=now,
                next_kyc_due_date=now + timedelta(days=90),
                is_active=True
            )
            db.add(st)
            await db.flush()
        students_map[phone] = st

    # 3. Route & Bus
    route = (await db.execute(select(Routes).where(Routes.route_name == "Campus Express Route 4"))).scalars().first()
    if not route:
        route = Routes(
            route_name="Campus Express Route 4",
            origin_stop_id=stops_map["Calavi Campus"].stop_id,
            destination_stop_id=stops_map["Cotonou Centre"].stop_id,
            base_price=250.00,
            estimated_duration_minutes=35,
            is_active=True
        )
        db.add(route)
        await db.flush()

    bus = (await db.execute(select(Buses).where(Buses.bus_code == "BUS-UAC-01"))).scalars().first()
    if not bus:
        bus = Buses(
            immatriculation_number="RB-4412-UAC",
            bus_code="BUS-UAC-01",
            max_capacity=50,
            status=BusStatusEnum.OPERATIONAL,
            current_driver_id=driver.user_id
        )
        db.add(bus)
        await db.flush()

    # 4. Scheduled Trips
    trip_730 = (await db.execute(select(Trips).where(Trips.route_id == route.route_id))).scalars().first()
    if not trip_730:
        trip_730 = Trips(
            route_id=route.route_id,
            bus_id=bus.bus_id,
            driver_id=driver.user_id,
            departure_time=now + timedelta(hours=1),
            estimated_arrival_time=now + timedelta(hours=1, minutes=35),
            status=TripStatusEnum.SCHEDULED,
            total_seats=50,
            available_seats=32,
            delay_minutes=15,
            delay_reason="Due to heavy traffic near the central campus roundabout."
        )
        db.add(trip_730)
        await db.flush()

    # 5. Tickets with exact frontend codes
    koffi = students_map["+22997001122"]
    existing_tk = (await db.execute(select(Tickets).where(Tickets.user_id == koffi.user_id))).scalars().first()
    if not existing_tk:
        pay = Payments(
            user_id=koffi.user_id,
            transaction_reference=f"PAY-{uuid.uuid4().hex[:8].upper()}",
            gateway=PaymentGatewayEnum.FEDAPAY,
            amount=250.00,
            phone_number=koffi.phone_number,
            status=PaymentStatusEnum.SUCCESSFUL
        )
        db.add(pay)
        await db.flush()

        tk = Tickets(
            user_id=koffi.user_id,
            trip_id=trip_730.trip_id,
            payment_id=pay.payment_id,
            qr_code_token="CROUS-UAC-TICKET-A7B9X2M4",
            sms_backup_code="A7B9X2M4",
            status=TicketStatusEnum.ISSUED,
            recycle_count=0,
            initial_expiration_date=trip_730.departure_time,
            final_expiration_date=trip_730.departure_time + timedelta(days=6)
        )
        db.add(tk)

    await db.commit()

    return {
        "status": "success",
        "message": "Données de démonstration initialisées avec succès.",
        "route": "Campus Express Route 4 (250 FCFA)",
        "trip_id": trip_730.trip_id,
        "koffi_phone": "+22997001122",
        "driver_phone": "+22997000001"
    }


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
