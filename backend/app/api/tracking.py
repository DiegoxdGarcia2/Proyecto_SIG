from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from bson import ObjectId
from datetime import datetime, timezone
from pymongo.database import Database
from shapely.geometry import Polygon, Point
import logging

from app.core.database import get_db
from app.api.websockets import manager as ws_manager

logger = logging.getLogger("tracking")
router = APIRouter(tags=["Tracking"])

class PositionUpdate(BaseModel):
    child_id: str
    lat: float = Field(..., description="Latitud")
    lng: float = Field(..., description="Longitud")

@router.post("/tracking/position", status_code=status.HTTP_200_OK)
async def update_position(
    payload: PositionUpdate,
    db: Database = Depends(get_db)
):
    """
    Endpoint para recibir actualizaciones en tiempo real de la posición de un niño.
    Realiza el análisis espacial para detectar si sale de la geocerca.
    """
    if not ObjectId.is_valid(payload.child_id):
        raise HTTPException(status_code=400, detail="ID de niño inválido.")

    child = db.children.find_one({"_id": ObjectId(payload.child_id)})
    if not child:
        raise HTTPException(status_code=404, detail="Niño no encontrado.")

    # Actualizar la ubicación actual del niño
    new_location = {
        "type": "Point",
        "coordinates": [payload.lng, payload.lat]
    }
    
    update_data = {
        "current_location": new_location,
        "last_updated": datetime.now(timezone.utc)
    }

    kinder_id = child.get("kindergarten_id")
    kinder = None
    is_safe = True

    if kinder_id and ObjectId.is_valid(kinder_id):
        kinder = db.kindergartens.find_one({"_id": ObjectId(kinder_id)})
    
    if kinder and kinder.get("geometry") and kinder["geometry"].get("coordinates"):
        try:
            # GeoJSON Polygon standard: coordinates is a list of linear rings [[ [lng, lat], ... ]]
            coords = kinder["geometry"]["coordinates"][0]
            poly = Polygon(coords)
            point = Point(payload.lng, payload.lat)
            
            # Aproximación básica de grados a metros (1 metro ≈ 0.000009 grados ecuatoriales)
            # El buffer_meters está acordado en 10.0 por defecto
            buffer_meters = kinder.get("buffer_meters", 10.0)
            buffer_degrees = buffer_meters * 0.000009
            
            buffered_poly = poly.buffer(buffer_degrees)
            
            if not buffered_poly.contains(point):
                is_safe = False
        except Exception as e:
            logger.error(f"Error en análisis espacial de shapely para niño {payload.child_id}: {e}")
            # En caso de error de topología, no cambiamos el estado por seguridad a menos que haya certeza.

    # Determinar el nuevo estado
    new_status = "SAFE" if is_safe else "OUTSIDE"
    old_status = child.get("status", "SAFE")
    
    update_data["status"] = new_status
    
    # Guardar nueva posición
    db.children.update_one({"_id": ObjectId(payload.child_id)}, {"$set": update_data})

    # Si acaba de salir (transición de SAFE a OUTSIDE)
    if not is_safe and old_status == "SAFE":
        logger.warning(f"¡ALERTA! El niño '{child.get('name')}' ha salido de la geocerca.")
        
        # 1. Registrar en bitácora (Logs)
        log_entry = {
            "child_id": str(child["_id"]),
            "kindergarten_id": kinder_id,
            "classroom_id": child.get("classroom_id"),
            "company_id": child.get("company_id"),
            "event_type": "GEOFENCE_EXIT",
            "description": f"El estudiante '{child.get('name')}' salió de los límites de la unidad educativa.",
            "timestamp": datetime.now(timezone.utc),
            "location": new_location
        }
        db.logs.insert_one(log_entry)
        
        # 2. Notificar vía WebSocket a los Tutores
        alert_message = {
            "type": "ALERT",
            "child_id": str(child["_id"]),
            "child_name": child.get("name"),
            "event": "GEOFENCE_EXIT",
            "message": f"¡Alerta! {child.get('name')} ha salido del área segura.",
            "timestamp": log_entry["timestamp"].isoformat()
        }
        for tutor_id in child.get("tutor_ids", []):
            await ws_manager.send_personal_alert(tutor_id, alert_message)
            
        # 3. Notificar a los administradores/profesores de la empresa
        await ws_manager.broadcast_to_admins(child.get("company_id"), alert_message)

    # Si volvió a entrar (transición de OUTSIDE a SAFE)
    elif is_safe and old_status == "OUTSIDE":
        logger.info(f"El niño '{child.get('name')}' ha retornado a la geocerca.")
        
        # 1. Registrar en bitácora (Logs)
        log_entry = {
            "child_id": str(child["_id"]),
            "kindergarten_id": kinder_id,
            "classroom_id": child.get("classroom_id"),
            "company_id": child.get("company_id"),
            "event_type": "GEOFENCE_ENTER",
            "description": f"El estudiante '{child.get('name')}' ha vuelto a ingresar a la unidad educativa.",
            "timestamp": datetime.now(timezone.utc),
            "location": new_location
        }
        db.logs.insert_one(log_entry)
        
        # 2. Notificar retorno a tutores
        alert_message = {
            "type": "INFO",
            "child_id": str(child["_id"]),
            "child_name": child.get("name"),
            "event": "GEOFENCE_ENTER",
            "message": f"{child.get('name')} ha vuelto al área segura.",
            "timestamp": log_entry["timestamp"].isoformat()
        }
        for tutor_id in child.get("tutor_ids", []):
            await ws_manager.send_personal_alert(tutor_id, alert_message)
            
        await ws_manager.broadcast_to_admins(child.get("company_id"), alert_message)

    return {"success": True, "status": new_status, "child_id": payload.child_id}
