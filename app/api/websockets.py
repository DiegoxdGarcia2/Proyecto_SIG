from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import logging

logger = logging.getLogger("websockets")
router = APIRouter()

class ConnectionManager:
    """Administra las conexiones activas WebSocket de los tutores por su tutor_id."""
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, tutor_id: str):
        """Acepta la conexión y la asocia al tutor_id correspondiente."""
        await websocket.accept()
        self.active_connections[tutor_id] = websocket
        logger.info(f"Tutor '{tutor_id}' conectado por WebSocket.")

    def disconnect(self, tutor_id: str):
        """Elimina el registro de la conexión del tutor."""
        if tutor_id in self.active_connections:
            del self.active_connections[tutor_id]
            logger.info(f"Tutor '{tutor_id}' desconectado.")

    async def send_personal_alert(self, tutor_id: str, message: dict):
        """Envía un mensaje de alerta JSON en tiempo real si el tutor está en línea."""
        websocket = self.active_connections.get(tutor_id)
        if websocket:
            try:
                await websocket.send_json(message)
                logger.info(f"Alerta WebSocket enviada al tutor '{tutor_id}'.")
            except Exception as e:
                logger.error(f"Error al enviar alerta por WebSocket a '{tutor_id}': {e}")
                self.disconnect(tutor_id)

manager = ConnectionManager()

@router.websocket("/ws/tutor/{tutor_id}")
async def websocket_endpoint(websocket: WebSocket, tutor_id: str):
    """Endpoint WebSocket para recibir notificaciones del estado del niño."""
    await manager.connect(websocket, tutor_id)
    try:
        while True:
            # Mantener la conexión abierta esperando pings/mensajes del cliente
            data = await websocket.receive_text()
            # Responder echo simple para confirmar conectividad
            await websocket.send_json({"status": "alive", "echo": data})
    except WebSocketDisconnect:
        manager.disconnect(tutor_id)
