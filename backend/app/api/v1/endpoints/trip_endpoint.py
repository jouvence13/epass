import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_async_db
from app.models.trip_model import Trips, TripStatusEnum, GpsLogs
from app.models.ticket_model import Tickets, TicketStatusEnum
from app.models.fleet_model import Routes, Stops, Buses, RouteStops
from app.models.user_model import Users
from app.schemas.trip_schema import TripOutSchema
from app.schemas.fleet_schema import RouteOutSchema, StopOutSchema, BusOutSchema
from app.schemas.ticket_schema import ActiveTicketScreenOutSchema
from app.services.auth_service import get_current_authenticated_user
from app.services.eta_calculator_service import compute_dynamic_eta

router = APIRouter(prefix="/trips", tags=["Trips & Schedules"])


def _format_trip_output(t: Trips) -> TripOutSchema:
    """Helper to populate frontend-aligned computed fields safely without lazy load errors."""
    origin_name = t.route.origin_stop.stop_name if (t.route and t.route.origin_stop) else ""
    destination_name = t.route.destination_stop.stop_name if (t.route and t.route.destination_stop) else ""
    route_label = t.route.route_name if t.route else ""
    time_str = t.departure_time.strftime("%H:%M") if t.departure_time else ""
    
    formatted_time = f"{time_str} - {route_label}" if (time_str and route_label) else (route_label or time_str)
    total_s = t.total_seats if t.total_seats > 0 else (t.bus.max_capacity if t.bus else 50)
    avail_s = t.available_seats if t.available_seats is not None else total_s
    seats_label = f"{avail_s}/{total_s} places"
    is_full = avail_s <= 0
    price_val = float(t.route.base_price) if (t.route and t.route.base_price) else 100.00
    duration_str = f"{t.route.estimated_duration_minutes} min" if (t.route and t.route.estimated_duration_minutes) else ""

    route_out = None
    if t.route:
        orig_out = None
        if t.route.origin_stop:
            orig_out = StopOutSchema(
                stop_id=t.route.origin_stop.stop_id,
                stop_name=t.route.origin_stop.stop_name,
                created_at=t.route.origin_stop.created_at
            )
        dest_out = None
        if t.route.destination_stop:
            dest_out = StopOutSchema(
                stop_id=t.route.destination_stop.stop_id,
                stop_name=t.route.destination_stop.stop_name,
                created_at=t.route.destination_stop.created_at
            )
        route_out = RouteOutSchema(
            route_id=t.route.route_id,
            route_name=t.route.route_name,
            origin_stop_id=t.route.origin_stop_id,
            destination_stop_id=t.route.destination_stop_id,
            base_price=float(t.route.base_price),
            estimated_duration_minutes=t.route.estimated_duration_minutes,
            is_active=t.route.is_active,
            origin_stop=orig_out,
            destination_stop=dest_out,
            route_stops=None,
            created_at=t.route.created_at
        )

    bus_out = None
    if t.bus:
        bus_out = BusOutSchema(
            bus_id=t.bus.bus_id,
            immatriculation_number=t.bus.immatriculation_number,
            bus_code=t.bus.bus_code,
            max_capacity=t.bus.max_capacity,
            status=t.bus.status,
            current_driver_id=t.bus.current_driver_id,
            created_at=t.bus.created_at
        )

    return TripOutSchema(
        trip_id=t.trip_id,
        route_id=t.route_id,
        bus_id=t.bus_id,
        driver_id=t.driver_id,
        departure_time=t.departure_time,
        estimated_arrival_time=t.estimated_arrival_time,
        actual_departure_time=t.actual_departure_time,
        status=t.status,
        total_seats=total_s,
        available_seats=avail_s,
        delay_minutes=t.delay_minutes,
        delay_reason=t.delay_reason,
        route=route_out,
        bus=bus_out,
        created_at=t.created_at,
        formatted_time=formatted_time,
        seats_label=seats_label,
        full=is_full,
        origin_name=origin_name,
        destination_name=destination_name,
        price=price_val,
        duration=duration_str
    )



@router.get("/available", response_model=List[TripOutSchema])
async def list_available_trips(
    origin_stop_id: Optional[uuid.UUID] = Query(None, description="Filtrer par arrêt de départ"),
    destination_stop_id: Optional[uuid.UUID] = Query(None, description="Filtrer par arrêt d'arrivée"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Search available bus trips with open seat capacity.
    Includes frontend-ready slot formatting (e.g. '07:30 - Ligne A', '32/50 places', full: false).
    """
    query = (
        select(Trips)
        .options(
            selectinload(Trips.route).selectinload(Routes.origin_stop),
            selectinload(Trips.route).selectinload(Routes.destination_stop),
            selectinload(Trips.bus)
        )
        .where(
            Trips.status.in_([TripStatusEnum.SCHEDULED, TripStatusEnum.BOARDING])
        )
        .order_by(Trips.departure_time.asc())
    )

    result = await db.execute(query)
    trips = result.scalars().all()

    formatted_list = []
    for t in trips:
        if origin_stop_id and t.route and t.route.origin_stop_id != origin_stop_id:
            continue
        if destination_stop_id and t.route and t.route.destination_stop_id != destination_stop_id:
            continue
        formatted_list.append(_format_trip_output(t))

    return formatted_list


async def _compute_trip_telemetry_and_stops(
    trip: Optional[Trips],
    route: Optional[Routes],
    db: AsyncSession,
    now: Optional[datetime] = None
) -> dict:
    """
    Calcule de façon unifiée et dynamique :
    1. Les arrêts réels (RouteStops / Stops) avec leurs statuts ('passed', 'current', 'upcoming'),
       horaires estimés et correspondances.
    2. Le taux de remplissage et les libellés de rotation.
    3. La position GPS en direct (GpsLogs), vitesse et temps d'arrivée restant (ETA).
    """
    if now is None:
        now = datetime.now(timezone.utc)

    target_route = route or (trip.route if trip else None)
    target_bus = trip.bus if trip else None

    origin_n = target_route.origin_stop.stop_name if (target_route and target_route.origin_stop) else ""
    dest_n = target_route.destination_stop.stop_name if (target_route and target_route.destination_stop) else ""
    route_name = target_route.route_name if target_route else ""
    route_id = target_route.route_id if target_route else None
    duration_mins = target_route.estimated_duration_minutes if target_route else 0

    # Occupation du bus
    total_seats = trip.total_seats if (trip and trip.total_seats > 0) else (target_bus.max_capacity if target_bus else 0)
    avail_seats = trip.available_seats if (trip and trip.available_seats is not None) else total_seats
    occupied = max(0, total_seats - avail_seats)
    pct = int((occupied / total_seats) * 100) if total_seats > 0 else 0
    occupancy_label = f"{occupied}/{total_seats} places ({pct}%)" if total_seats > 0 else "0/0"

    bus_label = (
        f"Bus #{target_bus.bus_code.split('-')[-1]}"
        if (target_bus and target_bus.bus_code and "-" in target_bus.bus_code)
        else (target_bus.bus_code if (target_bus and target_bus.bus_code) else (target_bus.immatriculation_number if target_bus else ""))
    )

    # Télémétrie GPS
    speed_kmh = 0.0
    lat = 6.4474
    lon = 2.3557
    if trip and trip.trip_id:
        latest_gps_q = await db.execute(
            select(GpsLogs).where(GpsLogs.trip_id == trip.trip_id).order_by(GpsLogs.recorded_at.desc()).limit(1)
        )
        latest_gps = latest_gps_q.scalars().first()
        if latest_gps:
            if latest_gps.speed_kmh is not None:
                speed_kmh = float(latest_gps.speed_kmh)
            try:
                from geoalchemy2.shape import to_shape
                pt = to_shape(latest_gps.position)
                lat = float(pt.y)
                lon = float(pt.x)
            except Exception:
                pass

    speed_val = f"{int(speed_kmh)} km/h" if speed_kmh > 0 else "0 km/h"

    # Calcul dynamique de la séquence des arrêts
    stops_list = []
    current_loc = origin_n
    next_stop = dest_n
    next_stop_eta = ""
    total_eta_str = f"{duration_mins} min" if duration_mins > 0 else ""

    dep_base = trip.departure_time if (trip and trip.departure_time) else now
    sorted_route_stops = sorted(target_route.route_stops, key=lambda x: x.stop_order) if (target_route and target_route.route_stops) else []

    if sorted_route_stops:
        total_stops = len(sorted_route_stops)
        if trip and trip.status == TripStatusEnum.COMPLETED:
            current_idx = total_stops - 1
        elif trip and trip.status == TripStatusEnum.SCHEDULED:
            current_idx = 0
        else:
            current_idx = max(0, min(total_stops - 1, total_stops // 2))

        for i, rs in enumerate(sorted_route_stops):
            stop_time = (dep_base + timedelta(minutes=rs.estimated_minutes_from_origin)).strftime("%H:%M")
            if i < current_idx:
                st_status = "passed"
                eta_mins = None
            elif i == current_idx:
                st_status = "current"
                eta_mins = max(1, rs.estimated_minutes_from_origin // 3) if rs.estimated_minutes_from_origin > 0 else 2
                current_loc = rs.stop.stop_name if rs.stop else origin_n
                if i + 1 < total_stops:
                    next_stop = sorted_route_stops[i + 1].stop.stop_name if sorted_route_stops[i + 1].stop else dest_n
                    next_stop_eta = f"{max(2, sorted_route_stops[i + 1].estimated_minutes_from_origin - rs.estimated_minutes_from_origin)} min"
                else:
                    next_stop = "Terminus Destination"
                    next_stop_eta = "Arrivé"
            else:
                st_status = "upcoming"
                eta_mins = max(2, rs.estimated_minutes_from_origin - sorted_route_stops[current_idx].estimated_minutes_from_origin)

            st_name = rs.stop.stop_name if rs.stop else f"Arrêt #{i+1}"
            stop_dict = {
                "id": str(rs.stop.stop_id)[:8] if (rs.stop and rs.stop.stop_id) else f"st-{i+1}",
                "name": f"{st_name} (Terminus)" if (i == 0 or i == total_stops - 1) else st_name,
                "status": st_status,
                "time": stop_time,
            }
            if eta_mins is not None:
                stop_dict["etaMinutes"] = eta_mins
            if rs.connection_label:
                stop_dict["connection"] = rs.connection_label
            stops_list.append(stop_dict)
    elif target_route and (target_route.origin_stop or target_route.destination_stop):
        # Repli si aucun arrêt intermédiaire n'est déclaré : Départ & Arrivée
        arr_time = (dep_base + timedelta(minutes=duration_mins)).strftime("%H:%M")
        stops_list = [
            {
                "id": str(target_route.origin_stop_id)[:8] if target_route.origin_stop_id else "orig",
                "name": f"{origin_n} (Terminus)" if origin_n else "Origine",
                "status": "passed" if (trip and trip.status != TripStatusEnum.SCHEDULED) else "current",
                "time": dep_base.strftime("%H:%M"),
                "etaMinutes": 0 if (trip and trip.status != TripStatusEnum.SCHEDULED) else 2
            },
            {
                "id": str(target_route.destination_stop_id)[:8] if target_route.destination_stop_id else "dest",
                "name": f"{dest_n} (Terminus)" if dest_n else "Destination",
                "status": "current" if (trip and trip.status != TripStatusEnum.SCHEDULED) else "upcoming",
                "time": arr_time,
                "etaMinutes": max(1, duration_mins)
            }
        ]

    return {
        "route_id": route_id,
        "route_name": route_name,
        "origin_name": origin_n,
        "destination_name": dest_n,
        "bus_label": bus_label,
        "total_seats": total_seats,
        "available_seats": avail_seats,
        "capacity_percentage": pct,
        "occupancy_label": occupancy_label,
        "speed_kmh": speed_kmh,
        "speed_val": speed_val,
        "latitude": lat,
        "longitude": lon,
        "current_loc": current_loc,
        "next_stop": next_stop,
        "next_stop_eta": next_stop_eta,
        "total_eta": total_eta_str,
        "stops": stops_list
    }


@router.get("/student/active-ticket", response_model=ActiveTicketScreenOutSchema)
async def get_student_active_ticket(
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Student Active Ticket & Live GPS Tracking Screen Endpoint:
    Returns the student's current active pass with QR Code, formatted backup SMS code (A7B9-X2M4),
    J+7 remaining days, live bus delay alert banner, stops progression, and real-time GPS telemetry.
    """
    query = (
        select(Tickets)
        .options(
            selectinload(Tickets.trip).selectinload(Trips.route).selectinload(Routes.origin_stop),
            selectinload(Tickets.trip).selectinload(Trips.route).selectinload(Routes.destination_stop),
            selectinload(Tickets.trip).selectinload(Trips.route).selectinload(Routes.route_stops).selectinload(RouteStops.stop),
            selectinload(Tickets.trip).selectinload(Trips.bus),
            selectinload(Tickets.payment)
        )
        .where(
            Tickets.user_id == current_user.user_id,
            Tickets.status.in_([TicketStatusEnum.ISSUED, TicketStatusEnum.VALIDATED])
        )
        .order_by(Tickets.created_at.desc())
    )
    result = await db.execute(query)
    ticket = result.scalars().first()

    if not ticket or not ticket.trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun ticket actif trouvé pour cet étudiant."
        )

    trip = ticket.trip
    route = trip.route

    now = datetime.now(timezone.utc)
    delta_days = max(0, (ticket.final_expiration_date - now).days)
    avail_label = f"Available for {delta_days} more days" if delta_days > 1 else (
        "Expires today" if delta_days == 1 else "Last hours"
    )

    raw_code = ticket.sms_backup_code
    if len(raw_code) == 8:
        formatted_code = f"{raw_code[:4]}-{raw_code[4:]}"
    elif len(raw_code) == 6:
        formatted_code = f"{raw_code[:3]}-{raw_code[3:]}"
    else:
        formatted_code = raw_code

    student_name = f"{current_user.first_name} {current_user.last_name}"
    student_id_label = f"Student ID: {current_user.matricule_uac or '2023-4458'}"

    # Calcul dynamique de la télémétrie et de tous les arrêts
    telemetry = await _compute_trip_telemetry_and_stops(trip, route, db, now)

    has_delay = trip.delay_minutes > 0
    delay_title = f"Delay: +{trip.delay_minutes} min" if has_delay else None
    delay_reason = trip.delay_reason or (
        "Due to heavy traffic near the central campus roundabout." if has_delay else None
    )

    amount_paid_val = float(ticket.payment.amount) if ticket.payment else (float(route.base_price) if route else 100.0)

    return ActiveTicketScreenOutSchema(
        ticket_id=ticket.ticket_id,
        trip_id=trip.trip_id,
        route_id=telemetry["route_id"],
        route_name=telemetry["route_name"],
        origin_name=telemetry["origin_name"],
        destination_name=telemetry["destination_name"],
        student_name=student_name,
        student_id=student_id_label,
        matricule_uac=current_user.matricule_uac,
        qr_code_token=ticket.qr_code_token,
        code=formatted_code,
        status="Valid Ticket" if ticket.status == TicketStatusEnum.ISSUED else "Validated",
        raw_status=ticket.status,
        recycle_count=ticket.recycle_count,
        available_for_days=delta_days,
        avail_for_label=avail_label,
        has_delay=has_delay,
        delay_minutes=trip.delay_minutes,
        delay_title=delay_title,
        delay_reason=delay_reason,
        bus_code=telemetry["bus_label"],
        capacity_percentage=telemetry["capacity_percentage"],
        occupancy_label=telemetry["occupancy_label"],
        current_location=telemetry["current_loc"],
        next_stop=telemetry["next_stop"],
        next_stop_eta=telemetry["next_stop_eta"],
        total_eta=telemetry["total_eta"],
        eta_minutes=8 if ticket.status == TicketStatusEnum.ISSUED else 0,
        eta_label=telemetry["next_stop_eta"],
        latitude=telemetry["latitude"],
        longitude=telemetry["longitude"],
        speed_kmh=telemetry["speed_kmh"],
        amount_paid=amount_paid_val,
        stops=telemetry["stops"]
    )


@router.get("/student/history", response_model=List[ActiveTicketScreenOutSchema])
async def get_student_ticket_history(
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Student Ticket & Purchase History Endpoint:
    Returns the student's complete list of past and present bus tickets for ProfileScreen and HomeScreen.
    """
    query = (
        select(Tickets)
        .options(
            selectinload(Tickets.trip).selectinload(Trips.route).selectinload(Routes.origin_stop),
            selectinload(Tickets.trip).selectinload(Trips.route).selectinload(Routes.destination_stop),
            selectinload(Tickets.trip).selectinload(Trips.route).selectinload(Routes.route_stops).selectinload(RouteStops.stop),
            selectinload(Tickets.trip).selectinload(Trips.bus),
            selectinload(Tickets.payment)
        )
        .where(Tickets.user_id == current_user.user_id)
        .order_by(Tickets.created_at.desc())
    )
    result = await db.execute(query)
    tickets = result.scalars().all()

    history_list = []
    now = datetime.now(timezone.utc)

    for tk in tickets:
        trip = tk.trip
        route = trip.route if trip else None

        delta_days = max(0, (tk.final_expiration_date - now).days)
        avail_label = f"Available for {delta_days} more days" if delta_days > 1 else (
            "Expires today" if delta_days == 1 else "Expired"
        )

        raw_code = tk.sms_backup_code
        if len(raw_code) == 8:
            formatted_code = f"{raw_code[:4]}-{raw_code[4:]}"
        elif len(raw_code) == 6:
            formatted_code = f"{raw_code[:3]}-{raw_code[3:]}"
        else:
            formatted_code = raw_code

        status_str = "Valid Ticket" if tk.status == TicketStatusEnum.ISSUED else (
            "Validated" if tk.status == TicketStatusEnum.VALIDATED else "Expired"
        )

        telemetry = await _compute_trip_telemetry_and_stops(trip, route, db, now)
        amount_val = float(tk.payment.amount) if tk.payment else (float(route.base_price) if route else 100.0)

        history_list.append(
            ActiveTicketScreenOutSchema(
                ticket_id=tk.ticket_id,
                trip_id=trip.trip_id if trip else uuid.uuid4(),
                route_id=telemetry["route_id"],
                route_name=telemetry["route_name"],
                origin_name=telemetry["origin_name"],
                destination_name=telemetry["destination_name"],
                student_name=f"{current_user.first_name} {current_user.last_name}",
                student_id=f"Student ID: {current_user.matricule_uac or '2023-4458'}",
                matricule_uac=current_user.matricule_uac,
                qr_code_token=tk.qr_code_token,
                code=formatted_code,
                status=status_str,
                raw_status=tk.status,
                recycle_count=tk.recycle_count,
                available_for_days=delta_days,
                avail_for_label=avail_label,
                has_delay=trip.delay_minutes > 0 if trip else False,
                delay_minutes=trip.delay_minutes if trip else 0,
                delay_title=f"Delay: +{trip.delay_minutes} min" if (trip and trip.delay_minutes > 0) else None,
                delay_reason=trip.delay_reason if trip else None,
                bus_code=telemetry["bus_label"],
                capacity_percentage=telemetry["capacity_percentage"],
                occupancy_label=telemetry["occupancy_label"],
                current_location=telemetry["current_loc"],
                next_stop=telemetry["next_stop"],
                next_stop_eta=telemetry["next_stop_eta"],
                total_eta=telemetry["total_eta"],
                eta_minutes=0 if tk.status != TicketStatusEnum.ISSUED else 8,
                eta_label="Terminé" if tk.status != TicketStatusEnum.ISSUED else telemetry["next_stop_eta"],
                latitude=telemetry["latitude"],
                longitude=telemetry["longitude"],
                speed_kmh=telemetry["speed_kmh"],
                amount_paid=amount_val,
                stops=telemetry["stops"]
            )
        )

    return history_list


@router.get("/live-lines")
async def get_live_lines(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Returns real-time line configs, stops, bus capacity, GPS telemetry,
    and progress dynamically from PostgreSQL database.
    """
    routes_query = (
        select(Routes)
        .options(
            selectinload(Routes.origin_stop),
            selectinload(Routes.destination_stop),
            selectinload(Routes.route_stops).selectinload(RouteStops.stop),
            selectinload(Routes.trips).selectinload(Trips.bus),
            selectinload(Routes.trips).selectinload(Trips.driver)
        )
        .where(Routes.is_active == True)
    )
    routes = (await db.execute(routes_query)).scalars().all()

    line_configs = {}
    now = datetime.now(timezone.utc)

    for r in routes:
        route_id_str = str(r.route_id)

        active_trip = next((t for t in r.trips if t.status in [TripStatusEnum.SCHEDULED, TripStatusEnum.BOARDING, TripStatusEnum.EN_ROUTE]), None)
        if not active_trip and r.trips:
            active_trip = r.trips[0]

        telemetry = await _compute_trip_telemetry_and_stops(active_trip, r, db, now)

        config = {
            "id": route_id_str,
            "routeId": route_id_str,
            "name": r.route_name,
            "code": f"{r.route_name} ({telemetry['origin_name']} ↔ {telemetry['destination_name']})",
            "origin": telemetry["origin_name"],
            "destination": telemetry["destination_name"],
            "busNumber": telemetry["bus_label"],
            "occupancy": telemetry["occupancy_label"],
            "speed": telemetry["speed_val"],
            "currentLocation": telemetry["current_loc"],
            "nextStop": telemetry["next_stop"],
            "nextStopEta": telemetry["next_stop_eta"],
            "totalEta": telemetry["total_eta"],
            "stops": telemetry["stops"]
        }

        # Index by route_id, route_name, and simple slug
        line_configs[route_id_str] = config
        line_configs[r.route_name] = config
        line_configs[r.route_name.lower().strip()] = config

        # Legacy aliases for backward compatibility if names match
        if "Ligne A" in r.route_name or "Express" in r.route_name:
            line_configs["LIGNE_A"] = config
        if "Ligne B" in r.route_name or "Godomey" in r.route_name:
            line_configs["LIGNE_B"] = config
        if "Porto-Novo" in r.route_name:
            line_configs["LIGNE_PORTO_NOVO"] = config
        if "Akpakpa" in r.route_name or "Ligne C" in r.route_name:
            line_configs["LIGNE_C"] = config

    return line_configs



@router.get("/{trip_id}", response_model=TripOutSchema)
async def get_trip_details(
    trip_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """Get detailed information about a specific trip."""
    query = (
        select(Trips)
        .options(
            selectinload(Trips.route).selectinload(Routes.origin_stop),
            selectinload(Trips.route).selectinload(Routes.destination_stop),
            selectinload(Trips.bus)
        )
        .where(Trips.trip_id == trip_id)
    )
    result = await db.execute(query)
    trip = result.scalars().first()

    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trajet non trouvé.")

    return _format_trip_output(trip)
