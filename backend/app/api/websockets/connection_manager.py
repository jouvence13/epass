import json
import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketConnectionManager:
    """Manages active WebSocket connections grouped by Trip ID room for student telemetry broadcast."""

    def __init__(self):
        # Mapping trip_id (str) -> List of connected student WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect_student(self, trip_id: str, websocket: WebSocket) -> None:
        """Accept connection and register student to a trip room."""
        await websocket.accept()
        if trip_id not in self.active_connections:
            self.active_connections[trip_id] = []
        self.active_connections[trip_id].append(websocket)
        logger.info(f"Student connected to trip {trip_id}. Total listeners: {len(self.active_connections[trip_id])}")

    def disconnect_student(self, trip_id: str, websocket: WebSocket) -> None:
        """Remove student WebSocket upon disconnect."""
        if trip_id in self.active_connections:
            if websocket in self.active_connections[trip_id]:
                self.active_connections[trip_id].remove(websocket)
            if not self.active_connections[trip_id]:
                del self.active_connections[trip_id]
        logger.info(f"Student disconnected from trip {trip_id}")

    async def broadcast_bus_telemetry(self, trip_id: str, telemetry_payload: dict) -> None:
        """Broadcast live bus GPS telemetry & dynamic ETA to all students listening to this trip."""
        if trip_id in self.active_connections:
            message_text = json.dumps(telemetry_payload)
            dead_sockets = []
            for client_socket in self.active_connections[trip_id]:
                try:
                    await client_socket.send_text(message_text)
                except Exception as e:
                    logger.warning(f"Failed to send telemetry to student socket: {e}")
                    dead_sockets.append(client_socket)
            
            for dead in dead_sockets:
                self.disconnect_student(trip_id, dead)


ws_manager = WebSocketConnectionManager()
