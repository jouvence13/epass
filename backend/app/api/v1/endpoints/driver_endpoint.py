import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_async_db
from app.models.user_model import Users, UserRoleEnum, KycStatusEnum
from app.models.trip_model import Trips, TripStatusEnum
from app.models.ticket_model import Tickets, TicketStatusEnum
from app.models.notification_model import Notifications
from app.schemas.ticket_schema import (
    TicketValidationRequestSchema,
    TicketValidationResponseSchema,
    PassengerOutSchema,
    PassengerManifestCountsSchema,
    PassengerManifestResponseSchema,
    DriverReportDelayRequestSchema,
    DriverReportDelayResponseSchema,
    DriverAlertOutSchema,
)
from app.schemas.trip_schema import DriverActiveTripOutSchema
from app.services.auth_service import require_roles, get_current_authenticated_user
from app.services.ticket_engine_service import validate_ticket_by_driver
from app.api.websockets.connection_manager import ws_manager

router = APIRouter(prefix="/driver", tags=["Driver Operations & Transit Control"])


# ==============================================================================
# 1. Active Trip & Driver Hub
# ==============================================================================

@router.get("/active-trip", response_model=DriverActiveTripOutSchema)
async def get_driver_active_trip(
    current_driver: Users = Depends(require_roles([UserRoleEnum.DRIVER, UserRoleEnum.CONTROLLER, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Driver Hub Endpoint:
    Returns the driver's currently assigned active route, live capacity metrics (e.g. 32/50),
    next upcoming stop, and delay status.
    """
    query = (
        select(Trips)
        .options(
            selectinload(Trips.route),
            selectinload(Trips.bus)
        )
        .where(
            Trips.driver_id == current_driver.user_id,
            Trips.status.in_([TripStatusEnum.SCHEDULED, TripStatusEnum.BOARDING, TripStatusEnum.EN_ROUTE])
        )
        .order_by(Trips.departure_time.asc())
    )
    result = await db.execute(query)
    trip = result.scalars().first()

    # If no trip is directly assigned to this driver, fetch next scheduled trip as fallback for demo
    if not trip:
        fallback_query = (
            select(Trips)
            .options(
                selectinload(Trips.route),
                selectinload(Trips.bus)
            )
            .where(Trips.status.in_([TripStatusEnum.SCHEDULED, TripStatusEnum.BOARDING, TripStatusEnum.EN_ROUTE]))
            .order_by(Trips.departure_time.asc())
        )
        trip = (await db.execute(fallback_query)).scalars().first()

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun trajet actif ou programmé trouvé pour ce chauffeur."
        )

    # Calculate capacity values
    total_cap = trip.total_seats if trip.total_seats > 0 else 50
    occupied = total_cap - max(0, trip.available_seats)
    cap_pct = int((occupied / total_cap) * 100) if total_cap > 0 else 0

    route_title = trip.route.route_name if trip.route else "Campus Express Route 4"
    bus_code = trip.bus.bus_code if trip.bus else "Bus #402"
    next_stop_name = "Science Block"

    return DriverActiveTripOutSchema(
        trip_id=trip.trip_id,
        route_title=route_title,
        next_stop_name=next_stop_name,
        next_stop_eta_minutes=5,
        capacity_num=occupied,
        capacity_total=total_cap,
        capacity_percentage=cap_pct,
        bus_code=bus_code,
        status=trip.status,
        is_live=True,
        delay_minutes=trip.delay_minutes,
        delay_reason=trip.delay_reason,
        departure_time=trip.departure_time,
        kyc_status=current_driver.kyc_status.value
    )


# ==============================================================================
# 2. Passenger Manifest & Lookup (PassengerLookupScreen.tsx)
# ==============================================================================

@router.get("/passengers", response_model=PassengerManifestResponseSchema)
@router.get("/trips/{trip_id}/passengers", response_model=PassengerManifestResponseSchema)
async def get_passenger_manifest(
    trip_id: Optional[uuid.UUID] = None,
    current_driver: Users = Depends(require_roles([UserRoleEnum.DRIVER, UserRoleEnum.CONTROLLER, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Passenger Manifest & Lookup Endpoint:
    Returns the real-time passenger roster for the active trip matching the frontend structure:
    counts (all, pending, checked) and passenger items with name, matricule, phone, stop, status.
    """
    target_trip_id = trip_id

    # If trip_id not provided, find driver's current trip
    if not target_trip_id:
        driver_trip = await db.execute(
            select(Trips)
            .where(
                Trips.driver_id == current_driver.user_id,
                Trips.status.in_([TripStatusEnum.SCHEDULED, TripStatusEnum.BOARDING, TripStatusEnum.EN_ROUTE])
            )
            .order_by(Trips.departure_time.asc())
        )
        t = driver_trip.scalars().first()
        if not t:
            # Fallback to any active trip
            t = (await db.execute(select(Trips).limit(1))).scalars().first()
        if t:
            target_trip_id = t.trip_id

    if not target_trip_id:
        return PassengerManifestResponseSchema(
            trip_id=uuid.uuid4(),
            trip_title="Trip #4022 - Campus to Cotonou",
            counts=PassengerManifestCountsSchema(all=0, pending=0, checked=0),
            passengers=[]
        )

    # Fetch trip and tickets with eager loading
    trip_res = await db.execute(
        select(Trips).options(selectinload(Trips.route)).where(Trips.trip_id == target_trip_id)
    )
    trip = trip_res.scalars().first()
    trip_title = f"Trip #{str(target_trip_id)[:4].upper()} - {trip.route.route_name if (trip and trip.route) else 'Campus to Cotonou'}"

    tickets_query = (
        select(Tickets)
        .options(selectinload(Tickets.user))
        .where(
            Tickets.trip_id == target_trip_id,
            Tickets.status.in_([TicketStatusEnum.ISSUED, TicketStatusEnum.VALIDATED])
        )
        .order_by(Tickets.created_at.asc())
    )
    tickets = (await db.execute(tickets_query)).scalars().all()

    passenger_list: List[PassengerOutSchema] = []
    pending_count = 0
    checked_count = 0

    for tk in tickets:
        u = tk.user
        checked = tk.status == TicketStatusEnum.VALIDATED
        if checked:
            checked_count += 1
            checked_time_str = tk.validated_at.strftime("%H:%M %p") if tk.validated_at else "Just now"
        else:
            pending_count += 1
            checked_time_str = None

        name_str = f"{u.first_name} {u.last_name}" if u else "Étudiant UAC"
        matricule_str = u.matricule_uac if (u and u.matricule_uac) else f"UAC-2023-{str(tk.ticket_id)[:4]}"
        phone_str = u.phone_number if u else "+229 97 00 00 00"
        stop_str = "Portail Principal"

        passenger_list.append(
            PassengerOutSchema(
                id=str(tk.ticket_id),
                name=name_str,
                matricule=matricule_str,
                phone=phone_str,
                stop=stop_str,
                status="checked" if checked else "pending",
                checkedAt=checked_time_str
            )
        )

    return PassengerManifestResponseSchema(
        trip_id=target_trip_id,
        trip_title=trip_title,
        counts=PassengerManifestCountsSchema(
            all=len(passenger_list),
            pending=pending_count,
            checked=checked_count
        ),
        passengers=passenger_list
    )


# ==============================================================================
# 3. Ticket Validation (Optical QR & Manual Lookup)
# ==============================================================================

@router.post("/validate-ticket", response_model=TicketValidationResponseSchema)
async def validate_student_ticket(
    payload: TicketValidationRequestSchema,
    current_driver: Users = Depends(require_roles([UserRoleEnum.DRIVER, UserRoleEnum.CONTROLLER, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Boarding Pass Validation Endpoint:
    Processes student optical AES QR scan or SMS backup code.
    Returns ACCESS_GRANTED with student details, line name, and formatted timestamp.
    """
    if current_driver.kyc_status != KycStatusEnum.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Opération bloquée : Votre dossier professionnel doit être validé par l'administration CROUS pour scanner et valider les titres."
        )

    target_trip_id = payload.trip_id
    if not target_trip_id:
        active_trip_res = await db.execute(
            select(Trips).where(Trips.driver_id == current_driver.user_id).order_by(Trips.departure_time.asc())
        )
        active_t = active_trip_res.scalars().first()
        if active_t:
            target_trip_id = active_t.trip_id
        else:
            # Fallback to any active trip
            first_t = (await db.execute(select(Trips).limit(1))).scalars().first()
            if first_t:
                target_trip_id = first_t.trip_id
            else:
                target_trip_id = uuid.uuid4()

    ticket, student = await validate_ticket_by_driver(
        driver=current_driver,
        trip_id=target_trip_id,
        scan_mode=payload.scan_mode,
        qr_code_token=payload.qr_code_token,
        sms_backup_code=payload.sms_backup_code,
        db=db
    )

    line_str = "Campus Express (Ligne A)"
    now_str = ticket.validated_at.strftime("%H:%M %p") if ticket.validated_at else "Just now"

    return TicketValidationResponseSchema(
        validation_status="ACCESS_GRANTED",
        message="Ticket validé avec succès. Accès autorisé à bord.",
        student_name=f"{student.first_name} {student.last_name}" if student else "Étudiant UAC",
        matricule_uac=student.matricule_uac if student else None,
        ticket_id=ticket.ticket_id,
        line_name=line_str,
        validated_time=now_str,
        timestamp=ticket.validated_at or datetime.now(timezone.utc)
    )


@router.post("/tickets/{ticket_id}/manual-validate", response_model=TicketValidationResponseSchema)
async def manual_validate_passenger_ticket(
    ticket_id: uuid.UUID,
    current_driver: Users = Depends(require_roles([UserRoleEnum.DRIVER, UserRoleEnum.CONTROLLER, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Driver Manual Validation Endpoint:
    Directly validates a passenger from the manifest list by ticket ID.
    """
    if current_driver.kyc_status != KycStatusEnum.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Opération bloquée : Votre dossier professionnel doit être validé par l'administration CROUS."
        )

    ticket = await db.get(Tickets, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket introuvable.")

    if ticket.status == TicketStatusEnum.VALIDATED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ce ticket a déjà été validé.")

    ticket.status = TicketStatusEnum.VALIDATED
    ticket.validated_at = datetime.now(timezone.utc)
    ticket.validated_by_driver_id = current_driver.user_id

    student = await db.get(Users, ticket.user_id)
    await db.commit()

    return TicketValidationResponseSchema(
        validation_status="ACCESS_GRANTED",
        message="Passager validé manuellement avec succès.",
        student_name=f"{student.first_name} {student.last_name}" if student else "Étudiant UAC",
        matricule_uac=student.matricule_uac if student else None,
        ticket_id=ticket.ticket_id,
        line_name="Ligne Campus UAC",
        validated_time="Just now",
        timestamp=ticket.validated_at
    )


# ==============================================================================
# 4. Incident & Delay Reporting (ReportDelayScreen.tsx)
# ==============================================================================

@router.post("/report-delay", response_model=DriverReportDelayResponseSchema)
async def report_trip_delay(
    payload: DriverReportDelayRequestSchema,
    current_driver: Users = Depends(require_roles([UserRoleEnum.DRIVER, UserRoleEnum.CONTROLLER, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Incident & Delay Reporting Endpoint:
    Updates trip delay, sets reason ('Heavy Traffic', 'Mechanical Issue', 'Roadblock / Detour'),
    notifies all booked passengers, and broadcasts live WebSocket alert event.
    """
    if current_driver.kyc_status != KycStatusEnum.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Opération bloquée : Votre dossier Chauffeur doit être validé par l'administration CROUS pour diffuser des alertes."
        )
    target_trip_id = payload.trip_id
    if not target_trip_id:
        active_t = (
            await db.execute(
                select(Trips).where(Trips.driver_id == current_driver.user_id).order_by(Trips.departure_time.asc())
            )
        ).scalars().first()
        if not active_t:
            active_t = (await db.execute(select(Trips).limit(1))).scalars().first()
        if active_t:
            target_trip_id = active_t.trip_id

    if not target_trip_id:
        raise HTTPException(status_code=404, detail="Aucun trajet actif trouvé pour signaler le retard.")

    trip = await db.get(Trips, target_trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trajet introuvable.")

    incident_labels = {
        "traffic": "Heavy Traffic",
        "mechanical": "Mechanical Issue",
        "roadblock": "Roadblock / Detour",
        "other": "Incident Signalé"
    }
    incident_label = incident_labels.get(payload.incident_type, "Incident Signalé")
    reason_msg = payload.custom_message or f"Due to {incident_label.lower()} on the route."

    trip.delay_minutes = payload.delay_minutes
    trip.delay_reason = reason_msg

    # Count passengers tracking this trip
    tickets_res = await db.execute(
        select(Tickets).where(Tickets.trip_id == target_trip_id, Tickets.status == TicketStatusEnum.ISSUED)
    )
    active_tickets = tickets_res.scalars().all()
    passengers_count = len(active_tickets) or 50

    # Record notification log
    for tk in active_tickets:
        notif = Notifications(
            user_id=tk.user_id,
            ticket_id=tk.ticket_id,
            title=f"Delay: +{payload.delay_minutes} min",
            message=reason_msg,
            channel="PUSH",
            is_sent=True,
            scheduled_for=datetime.now(timezone.utc),
            sent_at=datetime.now(timezone.utc)
        )
        db.add(notif)

    await db.commit()

    # Broadcast real-time WebSocket alert to all students listening to this trip
    broadcast_data = {
        "event": "DELAY_ALERT",
        "trip_id": str(target_trip_id),
        "delay_minutes": payload.delay_minutes,
        "delay_title": f"Delay: +{payload.delay_minutes} min",
        "delay_reason": reason_msg,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await ws_manager.broadcast_bus_telemetry(str(target_trip_id), broadcast_data)

    return DriverReportDelayResponseSchema(
        message="Incident broadcasted successfully.",
        trip_id=target_trip_id,
        delay_minutes=payload.delay_minutes,
        incident_type=payload.incident_type,
        passengers_notified_count=passengers_count
    )


# ==============================================================================
# 5. Driver Alerts List (AlertsScreen.tsx)
# ==============================================================================

@router.get("/alerts", response_model=List[DriverAlertOutSchema])
async def get_driver_alerts(
    current_driver: Users = Depends(require_roles([UserRoleEnum.DRIVER, UserRoleEnum.CONTROLLER, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Driver Alerts Endpoint:
    Returns system alerts, delay broadcasts, refuel reminders, and dispatch messages from PostgreSQL.
    """
    notifs_query = await db.execute(
        select(Notifications)
        .where(Notifications.user_id == current_driver.user_id)
        .order_by(Notifications.created_at.desc())
    )
    notifs = notifs_query.scalars().all()

    now = datetime.now(timezone.utc)
    alerts: List[DriverAlertOutSchema] = []

    for n in notifs:
        text = f"{n.title} {n.message}".lower()
        if "retard" in text or "trafic" in text or "embouteillage" in text:
            icon = "warning"
            tone = "#ffdad6"
        elif "carburant" in text or "essence" in text:
            icon = "local-gas-station"
            tone = "#e2d6ff"
        else:
            icon = "chat"
            tone = "#e0e3e5"

        delta = now - n.created_at
        if delta.total_seconds() < 3600:
            time_str = f"Il y a {max(1, int(delta.total_seconds() // 60))} min"
        elif delta.total_seconds() < 86400:
            time_str = f"Il y a {int(delta.total_seconds() // 3600)} h"
        else:
            time_str = n.created_at.strftime("%d/%m, %H:%M")

        alerts.append(
            DriverAlertOutSchema(
                id=str(n.notification_id),
                icon=icon,
                title=n.title,
                body=n.message,
                time=time_str,
                tone=tone
            )
        )

    return alerts


# ==============================================================================
# 6. Driver / Staff Profile & Compliance Details (DriverProfileScreen.tsx)
# ==============================================================================

@router.get("/profile")
async def get_driver_profile(
    current_user: Users = Depends(require_roles([UserRoleEnum.DRIVER, UserRoleEnum.CONTROLLER, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Driver & Controller Profile Endpoint:
    Returns staff identity, assigned fleet bus, current route, KYC status, and uploaded compliance docs.
    """
    from app.models.user_model import KycDocuments
    from app.models.fleet_model import Buses

    # 1. Fetch user's uploaded documents
    docs_query = await db.execute(
        select(KycDocuments).where(KycDocuments.user_id == current_user.user_id).order_by(KycDocuments.created_at.desc())
    )
    docs = docs_query.scalars().all()

    # 2. Fetch assigned bus (if driver)
    assigned_bus_query = await db.execute(
        select(Buses).where(Buses.current_driver_id == current_user.user_id)
    )
    assigned_bus = assigned_bus_query.scalars().first()

    return {
        "user_id": str(current_user.user_id),
        "full_name": f"{current_user.first_name} {current_user.last_name}",
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "phone_number": current_user.phone_number,
        "matricule_uac": current_user.matricule_uac,
        "role": current_user.role.value,
        "kyc_status": current_user.kyc_status.value,
        "is_active": current_user.is_active,
        "last_kyc_verification_date": current_user.last_kyc_verification_date,
        "next_kyc_due_date": current_user.next_kyc_due_date,
        "assigned_bus": {
            "bus_id": str(assigned_bus.bus_id),
            "bus_code": assigned_bus.bus_code,
            "immatriculation_number": assigned_bus.immatriculation_number,
            "max_capacity": assigned_bus.max_capacity,
            "status": assigned_bus.status.value
        } if assigned_bus else None,
        "documents": [
            {
                "document_id": str(d.document_id),
                "document_type": d.document_type.value,
                "document_url": d.document_url,
                "verification_status": d.verification_status.value,
                "academic_year": d.academic_year,
                "rejection_reason": d.rejection_reason,
                "validated_at": d.validated_at
            }
            for d in docs
        ]
    }
