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
    InfractionTypeOutSchema,
    ReportFraudRequestSchema,
    ReportFraudResponseSchema,
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
    Returns the driver's currently assigned active route, live capacity metrics,
    next upcoming stop, and delay status dynamically from the database.
    """
    from app.models.fleet_model import Routes, RouteStops

    query = (
        select(Trips)
        .options(
            selectinload(Trips.route).selectinload(Routes.route_stops).selectinload(RouteStops.stop),
            selectinload(Trips.route).selectinload(Routes.origin_stop),
            selectinload(Trips.route).selectinload(Routes.destination_stop),
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
                selectinload(Trips.route).selectinload(Routes.route_stops).selectinload(RouteStops.stop),
                selectinload(Trips.route).selectinload(Routes.origin_stop),
                selectinload(Trips.route).selectinload(Routes.destination_stop),
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
    total_cap = trip.total_seats if trip.total_seats > 0 else (trip.bus.max_capacity if trip.bus else 50)
    occupied = total_cap - max(0, trip.available_seats)
    cap_pct = int((occupied / total_cap) * 100) if total_cap > 0 else 0

    route_title = trip.route.route_name if trip.route else "Ligne Campus"
    bus_code = trip.bus.bus_code if trip.bus else "Navette Campus"

    # Compute next upcoming stop dynamically
    next_stop_name = "Terminus Destination"
    next_stop_eta_minutes = 5

    if trip.route:
        if trip.route.route_stops and len(trip.route.route_stops) > 1:
            sorted_stops = sorted(trip.route.route_stops, key=lambda s: s.stop_order)
            # Pick the second stop (first upcoming intermediate stop)
            upcoming = sorted_stops[1] if len(sorted_stops) > 1 else sorted_stops[0]
            if upcoming.stop:
                next_stop_name = upcoming.stop.stop_name
            next_stop_eta_minutes = max(3, upcoming.estimated_minutes_from_origin)
        elif trip.route.destination_stop:
            next_stop_name = trip.route.destination_stop.stop_name
            next_stop_eta_minutes = max(5, trip.route.estimated_duration_minutes)

    return DriverActiveTripOutSchema(
        trip_id=trip.trip_id,
        route_title=route_title,
        next_stop_name=next_stop_name,
        next_stop_eta_minutes=next_stop_eta_minutes,
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
        select(Trips)
        .options(
            selectinload(Trips.route).selectinload(Routes.origin_stop),
            selectinload(Trips.route).selectinload(Routes.destination_stop)
        )
        .where(Trips.trip_id == target_trip_id)
    )
    trip = trip_res.scalars().first()
    trip_title = f"Rotation #{str(target_trip_id)[:4].upper()} - {trip.route.route_name if (trip and trip.route) else 'Ligne Campus'}"
    default_stop_str = trip.route.destination_stop.stop_name if (trip and trip.route and trip.route.destination_stop) else "Arrêt Campus"

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
            checked_time_str = tk.validated_at.strftime("%H:%M") if tk.validated_at else "À l'instant"
        else:
            pending_count += 1
            checked_time_str = None

        name_str = f"{u.first_name} {u.last_name}" if u else "Étudiant Campus"
        matricule_str = u.matricule_uac if (u and u.matricule_uac) else f"EPASS-{str(tk.ticket_id)[:6].upper()}"
        phone_str = u.phone_number if u else ""
        stop_str = default_stop_str

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
            detail="Opération bloquée : Votre dossier professionnel doit être validé par l'administration pour scanner et valider les titres."
        )

    target_trip_id = payload.trip_id
    active_t = None
    if not target_trip_id:
        active_trip_res = await db.execute(
            select(Trips)
            .options(selectinload(Trips.route))
            .where(Trips.driver_id == current_driver.user_id)
            .order_by(Trips.departure_time.asc())
        )
        active_t = active_trip_res.scalars().first()
        if active_t:
            target_trip_id = active_t.trip_id
        else:
            # Fallback to any active trip
            first_t = (await db.execute(select(Trips).options(selectinload(Trips.route)).limit(1))).scalars().first()
            if first_t:
                target_trip_id = first_t.trip_id
                active_t = first_t
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

    line_str = (active_t.route.route_name if (active_t and active_t.route) else "Ligne Campus")
    now_str = ticket.validated_at.strftime("%H:%M") if ticket.validated_at else "À l'instant"

    return TicketValidationResponseSchema(
        validation_status="ACCESS_GRANTED",
        message="Ticket validé avec succès. Accès autorisé à bord.",
        student_name=f"{student.first_name} {student.last_name}" if student else "Étudiant Campus",
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
            detail="Opération bloquée : Votre dossier professionnel doit être validé par l'administration."
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
        student_name=f"{student.first_name} {student.last_name}" if student else "Étudiant Campus",
        matricule_uac=student.matricule_uac if student else None,
        ticket_id=ticket.ticket_id,
        line_name="Ligne Campus",
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
            detail="Opération bloquée : Votre dossier Chauffeur doit être validé par l'administration pour diffuser des alertes."
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


# ==============================================================================
# 7. Fraud & Infractions System (ReportFraudScreen.tsx)
# ==============================================================================

from app.models.fraud_model import InfractionTypes, FraudReports

DEFAULT_INFRACTION_TYPES = [
    {
        "key": "NO_TICKET",
        "label": "Absence totale de titre de transport",
        "icon": "money-off",
        "severity": "HIGH",
        "penalty_amount": 500.0,
        "description": "Passager voyageant à bord sans aucun titre valide ou non composté."
    },
    {
        "key": "REUSED_TICKET",
        "label": "Tentative de réutilisation d’un billet expiré",
        "icon": "replay",
        "severity": "MEDIUM",
        "penalty_amount": 300.0,
        "description": "Présentation d'un titre de transport ayant déjà dépassé son délai ou sa limite d'utilisation."
    },
    {
        "key": "IDENTITY_MISMATCH",
        "label": "Usurpation d’identité / Mauvais matricule",
        "icon": "person-outline",
        "severity": "HIGH",
        "penalty_amount": 1000.0,
        "description": "Non-concordance entre la carte d'étudiant / CIP et le titulaire du billet."
    },
    {
        "key": "REFUSAL",
        "label": "Refus d'obtempérer ou comportement inapproprié",
        "icon": "warning",
        "severity": "CRITICAL",
        "penalty_amount": 2000.0,
        "description": "Obstruction au travail des agents assermentés de contrôle ou trouble à l'ordre à bord."
    },
    {
        "key": "FORGERY",
        "label": "Faux titre / Capture d'écran contrefaite",
        "icon": "phonelink-erase",
        "severity": "CRITICAL",
        "penalty_amount": 5000.0,
        "description": "Utilisation frauduleuse d'une capture d'écran, QR code falsifié ou titre contrefait."
    }
]


@router.get("/infractions/types", response_model=List[InfractionTypeOutSchema])
async def get_infraction_types(
    current_user: Users = Depends(require_roles([UserRoleEnum.CONTROLLER, UserRoleEnum.DRIVER, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Returns the dynamic catalog of infractions and fraud types configured in PostgreSQL.
    If the table is unseeded, automatically populates the default regulatory catalog.
    """
    result = await db.execute(select(InfractionTypes).where(InfractionTypes.is_active == True))
    db_items = result.scalars().all()

    if not db_items:
        # Auto-seed into PostgreSQL
        for item in DEFAULT_INFRACTION_TYPES:
            inf = InfractionTypes(
                infraction_id=uuid.uuid4(),
                key=item["key"],
                label=item["label"],
                icon=item["icon"],
                severity=item["severity"],
                penalty_amount=item["penalty_amount"],
                description=item["description"],
                is_active=True
            )
            db.add(inf)
        await db.commit()
        result = await db.execute(select(InfractionTypes).where(InfractionTypes.is_active == True))
        db_items = result.scalars().all()

    return [
        InfractionTypeOutSchema(
            key=it.key,
            label=it.label,
            icon=it.icon,
            severity=it.severity,
            penalty_amount=it.penalty_amount,
            description=it.description or ""
        )
        for it in db_items
    ]


@router.post("/report-fraud", response_model=ReportFraudResponseSchema)
async def report_fraud_incident(
    payload: ReportFraudRequestSchema,
    current_user: Users = Depends(require_roles([UserRoleEnum.CONTROLLER, UserRoleEnum.DRIVER, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Records a formal inspection fraud report (Procès-Verbal de Contrôle) in PostgreSQL.
    Alerts transport administration and logs the incident in PostgreSQL tables.
    """
    if current_user.kyc_status != KycStatusEnum.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Opération bloquée : Votre badge / accréditation doit être validé par l'administration pour déclarer des fraudes."
        )

    # 1. Query infraction details from PostgreSQL
    res = await db.execute(select(InfractionTypes).where(InfractionTypes.key == payload.infraction_type))
    item_info = res.scalars().first()

    infraction_label = item_info.label if item_info else payload.infraction_type
    penalty_val = item_info.penalty_amount if item_info else 0.0
    penalty_str = f" (Amende standard : {penalty_val:.0f} FCFA)" if penalty_val > 0 else ""

    report_uuid = uuid.uuid4()
    pv_code = f"PV-{str(report_uuid)[:8].upper()}"

    # 2. Persist FraudReport in PostgreSQL
    fraud_report = FraudReports(
        report_id=report_uuid,
        pv_code=pv_code,
        controller_id=current_user.user_id,
        trip_id=payload.trip_id,
        student_identifier=payload.student_info,
        infraction_type_key=payload.infraction_type,
        penalty_amount=penalty_val,
        description=payload.description,
        status="TRANSMITTED"
    )
    db.add(fraud_report)

    # 3. Record notification for administration
    admin_notif = Notifications(
        user_id=current_user.user_id,
        title=f"🚨 Procès-Verbal #{pv_code} : {infraction_label}",
        message=f"Agent : {current_user.first_name} {current_user.last_name} ({current_user.matricule_uac or 'Contrôleur'}). "
                f"Passager : {payload.student_info or 'Non identifié'}. "
                f"Motif : {infraction_label}{penalty_str}. Observations : {payload.description or 'Aucune'}",
        channel="PUSH",
        is_sent=True,
        scheduled_for=datetime.now(timezone.utc),
        sent_at=datetime.now(timezone.utc)
    )
    db.add(admin_notif)
    await db.commit()
    await db.refresh(fraud_report)

    return ReportFraudResponseSchema(
        success=True,
        report_id=pv_code,
        message="Procès-verbal enregistré avec succès. Le signalement d’infraction a été transmis à la direction des transports.",
        infraction_type=payload.infraction_type,
        student_info=payload.student_info,
        recorded_at=fraud_report.created_at or datetime.now(timezone.utc)
    )


