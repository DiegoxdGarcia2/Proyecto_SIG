from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List
from bson import ObjectId
from datetime import datetime, timezone
from pymongo.database import Database
from shapely.geometry import Polygon, Point
import logging

from app.core.database import get_db
from app.api.websockets import manager as ws_manager
from app.core.firebase_config import send_push_notification

logger = logging.getLogger("tracking")
router = APIRouter(tags=["Tracking"])


# --- Modelos Pydantic ---

class PositionUpdate(BaseModel):
    """Payload del endpoint IoT real (/tracking/position)."""
    child_id: str
    lat: float = Field(..., description="Latitud")
    lng: float = Field(..., description="Longitud")


class GeoJSONPoint(BaseModel):
    """Estructura GeoJSON estándar de un punto."""
    type: str = "Point"
    coordinates: List[float] = Field(..., description="[longitud, latitud]")


class SimulatorUpdate(BaseModel):
    """Payload del simulador móvil (/tracking/update)."""
    device_id: str
    tutor_id: str
    location: GeoJSONPoint


# --- Lógica Compartida de Análisis Espacial ---

async def _analyze_and_notify(
    child: dict,
    lat: float,
    lng: float,
    db: Database
) -> dict:
    """
    Lógica central de análisis geoespacial compartida por ambos endpoints.
    1. Actualiza la ubicación del niño en la base de datos.
    2. Ejecuta el análisis espacial con Shapely (polígono + buffer).
    3. Detecta transiciones de estado (SAFE -> OUTSIDE y viceversa).
    4. Registra en bitácora y dispara alertas WebSocket a tutores, profesores y admins.
    Retorna un dict con el resultado del análisis.
    """
    new_location = {"type": "Point", "coordinates": [lng, lat]}
    update_data = {
        "current_location": new_location,
        "last_updated": datetime.now(timezone.utc),
    }

    kinder_id = child.get("kindergarten_id")
    classroom_id = child.get("classroom_id")
    company_id = child.get("company_id")
    kinder = None
    is_safe = True

    if kinder_id and ObjectId.is_valid(kinder_id):
        kinder = db.kindergartens.find_one({"_id": ObjectId(kinder_id)})

    if kinder and kinder.get("geometry") and kinder["geometry"].get("coordinates"):
        is_safe = _check_within_geofence(kinder, lng, lat)

    new_status = "SAFE" if is_safe else "OUTSIDE"
    old_status = child.get("status", "SAFE")
    update_data["status"] = new_status

    db.children.update_one(
        {"_id": child["_id"]}, {"$set": update_data}
    )

    child_name = child.get("name", "Desconocido")
    child_id_str = str(child["_id"])
    tutor_ids = child.get("tutor_ids", [])
    now = datetime.now(timezone.utc)

    # Transición SAFE -> OUTSIDE (salió de la geocerca)
    if not is_safe and old_status == "SAFE":
        await _handle_exit(
            child_id_str, child_name, kinder_id,
            classroom_id, company_id, tutor_ids,
            new_location, now, db,
        )

    # Transición OUTSIDE -> SAFE (volvió a la geocerca)
    elif is_safe and old_status == "OUTSIDE":
        await _handle_enter(
            child_id_str, child_name, kinder_id,
            classroom_id, company_id, tutor_ids,
            new_location, now, db,
        )

    return {
        "success": True,
        "status": new_status,
        "is_safe": is_safe,
        "child_id": child_id_str,
    }


def _check_within_geofence(kinder: dict, lng: float, lat: float) -> bool:
    """Verifica con Shapely si el punto está dentro del polígono + buffer."""
    try:
        coords = kinder["geometry"]["coordinates"][0]
        poly = Polygon(coords)
        point = Point(lng, lat)

        buffer_meters = kinder.get("buffer_meters", 10.0)
        buffer_degrees = buffer_meters * 0.000009
        buffered_poly = poly.buffer(buffer_degrees)

        return buffered_poly.contains(point)
    except Exception as e:
        logger.error(f"Error en análisis espacial Shapely: {e}")
        return True  # Ante la duda, asumir seguro


async def _handle_exit(
    child_id: str, child_name: str, kinder_id: str,
    classroom_id: str, company_id: str, tutor_ids: list,
    location: dict, timestamp: datetime, db: Database,
):
    """Maneja la transición SAFE -> OUTSIDE: bitácora + WebSocket."""
    logger.warning(f"¡ALERTA! El niño '{child_name}' ha salido de la geocerca.")

    log_entry = {
        "child_id": child_id,
        "kindergarten_id": kinder_id,
        "classroom_id": classroom_id,
        "company_id": company_id,
        "event_type": "GEOFENCE_EXIT",
        "description": f"El estudiante '{child_name}' salió de los límites de la unidad educativa.",
        "timestamp": timestamp,
        "location": location,
    }
    db.logs.insert_one(log_entry)

    alert_msg = _build_alert_message(
        "ALERT", child_id, child_name,
        "GEOFENCE_EXIT",
        f"¡Alerta! {child_name} ha salido del área segura.",
        kinder_id, classroom_id, timestamp, location,
    )

    for tid in tutor_ids:
        await ws_manager.send_personal_alert(tid, alert_msg)
        try:
            from bson import ObjectId
            tutor = db.users.find_one({"_id": ObjectId(tid)})
            if tutor and tutor.get("fcm_token"):
                send_push_notification(
                    fcm_token=tutor["fcm_token"],
                    title="🚨 Alerta de Seguridad",
                    body=f"El estudiante '{child_name}' salió del perímetro seguro.",
                    data={"child_id": child_id, "event": "GEOFENCE_EXIT"}
                )
        except Exception as e:
            logger.error(f"Error enviando Push a tutor {tid}: {e}")

    await ws_manager.broadcast_to_admins(company_id, alert_msg)


async def _handle_enter(
    child_id: str, child_name: str, kinder_id: str,
    classroom_id: str, company_id: str, tutor_ids: list,
    location: dict, timestamp: datetime, db: Database,
):
    """Maneja la transición OUTSIDE -> SAFE: bitácora + WebSocket."""
    logger.info(f"El niño '{child_name}' ha retornado a la geocerca.")

    log_entry = {
        "child_id": child_id,
        "kindergarten_id": kinder_id,
        "classroom_id": classroom_id,
        "company_id": company_id,
        "event_type": "GEOFENCE_ENTER",
        "description": f"El estudiante '{child_name}' ha vuelto a ingresar a la unidad educativa.",
        "timestamp": timestamp,
        "location": location,
    }
    db.logs.insert_one(log_entry)

    alert_msg = _build_alert_message(
        "INFO", child_id, child_name,
        "GEOFENCE_ENTER",
        f"{child_name} ha vuelto al área segura.",
        kinder_id, classroom_id, timestamp, location,
    )

    for tid in tutor_ids:
        await ws_manager.send_personal_alert(tid, alert_msg)
        try:
            from bson import ObjectId
            tutor = db.users.find_one({"_id": ObjectId(tid)})
            if tutor and tutor.get("fcm_token"):
                send_push_notification(
                    fcm_token=tutor["fcm_token"],
                    title="✅ Retorno Seguro",
                    body=f"El estudiante '{child_name}' ha regresado al área.",
                    data={"child_id": child_id, "event": "GEOFENCE_ENTER"}
                )
        except Exception as e:
            logger.error(f"Error enviando Push a tutor {tid}: {e}")

    await ws_manager.broadcast_to_admins(company_id, alert_msg)


def _build_alert_message(
    msg_type: str, child_id: str, child_name: str,
    event: str, message: str,
    kindergarten_id: str, classroom_id: str,
    timestamp: datetime, location: dict,
) -> dict:
    """Construye el diccionario de alerta WebSocket con todos los campos de filtrado."""
    return {
        "type": msg_type,
        "child_id": child_id,
        "child_name": child_name,
        "event": event,
        "message": message,
        "kindergarten_id": kindergarten_id,
        "classroom_id": classroom_id,
        "location": location,
        "timestamp": timestamp.isoformat(),
    }


# --- Endpoints ---

@router.post("/tracking/position", status_code=status.HTTP_200_OK)
async def update_position(
    payload: PositionUpdate,
    db: Database = Depends(get_db),
):
    """
    Endpoint IoT real: recibe actualizaciones de posición por child_id.
    Realiza análisis espacial y dispara alertas a todos los roles.
    """
    if not ObjectId.is_valid(payload.child_id):
        raise HTTPException(status_code=400, detail="ID de niño inválido.")

    child = db.children.find_one({"_id": ObjectId(payload.child_id)})
    if not child:
        raise HTTPException(status_code=404, detail="Niño no encontrado.")

    return await _analyze_and_notify(child, payload.lat, payload.lng, db)


@router.post("/tracking/update", status_code=status.HTTP_200_OK)
async def simulator_update(
    payload: SimulatorUpdate,
    db: Database = Depends(get_db),
):
    """
    Endpoint del simulador móvil: recibe actualizaciones de posición
    por device_id y tutor_id. Busca al niño por su dispositivo GPS
    y ejecuta la misma lógica de análisis espacial y alertas.
    """
    child = db.children.find_one({"device_id": payload.device_id})
    if not child:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró un niño con el dispositivo '{payload.device_id}'.",
        )

    lng, lat = payload.location.coordinates
    return await _analyze_and_notify(child, lat, lng, db)
