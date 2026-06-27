from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import logging

logger = logging.getLogger("websockets")
router = APIRouter()

class ConnectionManager:
    """Administra las conexiones WebSocket de tutores y personal administrativo (empresa, unidad, aula)."""
    def __init__(self):
        self.tutor_connections: Dict[str, WebSocket] = {}
        # Guardamos: { company_id: [{"websocket": WebSocket, "kindergarten_id": str, "classroom_id": str}] }
        self.admin_connections: Dict[str, List[Dict]] = {}

    async def connect_tutor(self, websocket: WebSocket, tutor_id: str):
        """Acepta y registra una conexión de tutor."""
        await websocket.accept()
        self.tutor_connections[tutor_id] = websocket
        logger.info(f"Tutor '{tutor_id}' conectado por WebSocket.")

    def disconnect_tutor(self, tutor_id: str):
        """Elimina el registro de la conexión del tutor."""
        if tutor_id in self.tutor_connections:
            del self.tutor_connections[tutor_id]
            logger.info(f"Tutor '{tutor_id}' desconectado.")

    async def connect_admin(self, websocket: WebSocket, company_id: str, kindergarten_id: str = None, classroom_id: str = None):
        """Acepta y registra una conexión de administrador/director/profesor bajo una empresa."""
        await websocket.accept()
        if company_id not in self.admin_connections:
            self.admin_connections[company_id] = []
        self.admin_connections[company_id].append({
            "websocket": websocket,
            "kindergarten_id": kindergarten_id,
            "classroom_id": classroom_id
        })
        logger.info(f"Conexión WS: Empresa={company_id}, Kínder={kindergarten_id}, Aula={classroom_id}")

    def disconnect_admin(self, websocket: WebSocket, company_id: str):
        """Desconecta a un administrador de la lista de la empresa."""
        if company_id in self.admin_connections:
            self.admin_connections[company_id] = [
                c for c in self.admin_connections[company_id] if c["websocket"] != websocket
            ]
            logger.info(f"Conexión WS de empresa '{company_id}' cerrada.")

    async def send_personal_alert(self, tutor_id: str, message: dict):
        """Envía una alerta en tiempo real al tutor si está conectado."""
        websocket = self.tutor_connections.get(tutor_id)
        if websocket:
            try:
                await websocket.send_json(message)
                logger.info(f"Alerta WebSocket enviada al tutor '{tutor_id}'.")
            except Exception as e:
                logger.error(f"Error al enviar a tutor '{tutor_id}': {e}")
                self.disconnect_tutor(tutor_id)

    async def broadcast_to_admins(self, company_id: str, message: dict):
        """Envía una actualización en tiempo real a los admins/directores/profesores según corresponda."""
        connections = self.admin_connections.get(company_id, [])
        for conn in list(connections):
            ws = conn["websocket"]
            k_id = conn["kindergarten_id"]
            c_id = conn["classroom_id"]
            
            # Filtro para Profesores (sólo reciben actualizaciones de su aula)
            if c_id and message.get("classroom_id") != c_id:
                continue
                
            # Filtro para Directores (sólo reciben actualizaciones de su unidad)
            if k_id and message.get("kindergarten_id") != k_id:
                continue
                
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"Error enviando a conexión en '{company_id}': {e}")
                self.disconnect_admin(ws, company_id)

manager = ConnectionManager()

@router.websocket("/ws/tutor/{tutor_id}")
async def websocket_tutor_endpoint(websocket: WebSocket, tutor_id: str):
    """WebSocket para tutores móviles (Monitoreo de sus hijos en tiempo real)."""
    await manager.connect_tutor(websocket, tutor_id)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"status": "alive", "echo": data})
    except WebSocketDisconnect:
        manager.disconnect_tutor(tutor_id)

@router.websocket("/ws/admin/{company_id}")
async def websocket_admin_endpoint(
    websocket: WebSocket, 
    company_id: str, 
    kindergarten_id: str = None,
    classroom_id: str = None
):
    """WebSocket para administradores, directores y profesores."""
    await manager.connect_admin(websocket, company_id, kindergarten_id, classroom_id)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"status": "alive", "echo": data})
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket, company_id)
