import json
import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func

from app.core.database import get_async_db
from app.api.websockets.connection_manager import ws_manager
from app.services.eta_calculator_service import compute_dynamic_eta
from app.models.trip_model import Trips, GpsLogs

logger = logging.getLogger(__name__)
ws_router = APIRouter(tags=["Real-Time GPS WebSockets"])


@ws_router.websocket("/ws/driver/track/{trip_id}")
async def driver_geo_stream(websocket: WebSocket, trip_id: str, db: AsyncSession = Depends(get_async_db)):
    """
    Driver GPS telemetry ingestion stream (sent every 10 seconds).
    Receives current coordinates, computes dynamic ETA, broadcasts to students, and logs to PostGIS.
    """
    await websocket.accept()
    try:
        trip_uuid = uuid.UUID(trip_id)
    except ValueError:
        await websocket.close(code=1008, reason="Invalid Trip UUID")
        return

    try:
        while True:
            raw_data = await websocket.receive_text()
            payload = json.loads(raw_data)
            # Payload format: {"latitude": 6.4474, "longitude": 2.3557, "speed_kmh": 35.5, "bearing": 180.0}
            lat = float(payload.get("latitude", 0.0))
            lon = float(payload.get("longitude", 0.0))
            speed = float(payload.get("speed_kmh", 0.0))
            bearing = float(payload.get("bearing", 0.0))

            # 1. Compute dynamic ETA in minutes to origin stop
            calculated_eta_minutes = await compute_dynamic_eta(
                current_latitude=lat,
                current_longitude=lon,
                trip_id=trip_uuid,
                db=db
            )

            # Retrieve bus code
            trip = await db.get(Trips, trip_uuid)
            bus_code = "BUS-UAC"
            bus_id = trip.bus_id if trip else None
            if trip and hasattr(trip, "bus") and trip.bus:
                bus_code = trip.bus.bus_code

            # 2. Build broadcast payload
            broadcast_data = {
                "trip_id": str(trip_uuid),
                "bus_code": bus_code,
                "latitude": lat,
                "longitude": lon,
                "speed_kmh": speed,
                "bearing": bearing,
                "eta_minutes": calculated_eta_minutes,
                "delay_minutes": trip.delay_minutes if trip else 0,
                "is_operational": True,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            # 3. Broadcast to all students listening to this trip
            await ws_manager.broadcast_bus_telemetry(str(trip_uuid), broadcast_data)

            # 4. Log spatial coordinate into PostGIS
            if bus_id:
                gps_log = GpsLogs(
                    bus_id=bus_id,
                    trip_id=trip_uuid,
                    position=func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326),
                    speed_kmh=speed,
                    bearing_degrees=bearing
                )
                db.add(gps_log)
                await db.commit()

    except WebSocketDisconnect:
        logger.info(f"Driver disconnected from trip {trip_id}")
    except Exception as e:
        logger.error(f"Error in driver GPS stream: {e}")
        await websocket.close()


@ws_router.websocket("/ws/student/track/{trip_id}")
async def student_geo_listener(websocket: WebSocket, trip_id: str):
    """
    Student telemetry listening stream.
    Receives live location, speed, bearing, and dynamic ETA of the bus assigned to this trip.
    """
    await ws_manager.connect_student(trip_id, websocket)
    try:
        while True:
            # Keep socket alive and receive any client ping/heartbeats
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_student(trip_id, websocket)
    except Exception as e:
        logger.warning(f"Error in student GPS listener: {e}")
        ws_manager.disconnect_student(trip_id, websocket)
