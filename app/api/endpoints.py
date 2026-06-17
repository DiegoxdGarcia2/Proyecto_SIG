from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from datetime import datetime, timezone
from bson import ObjectId
from app.models.schemas import KindergartenCreate, PositionUpdate, TutorFCMRegister
from app.core.database import get_db
from app.core.geo_engine import check_child_safety
from pymongo.database import Database

router = APIRouter()

def _get_child_and_kinder(device_id: str, db: Database) -> tuple[dict, dict]:
    """Recupera al niño y su Kinder asociado de la base de datos."""
    child = db.children.find_one({"device_id": device_id})
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispositivo del niño con ID '{device_id}' no registrado."
        )
    
    kindergarten_id = child.get("kindergarten_id")
    if not kindergarten_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El niño no tiene un Kínder asignado en el sistema."
        )
    
    try:
        k_id = ObjectId(kindergarten_id) if ObjectId.is_valid(kindergarten_id) else kindergarten_id
    except Exception:
        k_id = kindergarten_id

    kinder = db.kindergartens.find_one({"_id": k_id})
    if not kinder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El Kínder asociado al niño no existe en la base de datos."
        )
    return child, kinder

def _evaluate_and_update_status(
    device_id: str, tutor_id: str, location, kinder: dict, db: Database
) -> tuple[str, bool, datetime]:
    """Evalúa el geofencing del niño y actualiza los registros y logs en MongoDB."""
    is_safe = check_child_safety(
        child_location=location.coordinates,
        kinder_polygon_coords=kinder["geometry"]["coordinates"],
        buffer_meters=kinder.get("buffer_meters", 10.0)
    )
    current_status = "SAFE" if is_safe else "ALARM"
    now = datetime.now(timezone.utc)
    
    # Actualizar estado y última ubicación del niño en MongoDB
    db.children.update_one(
        {"device_id": device_id},
        {
            "$set": {
                "current_location": location.model_dump(),
                "status": current_status,
                "last_updated": now
            }
        }
    )
    # Guardar log de auditoría
    db.tracking_logs.insert_one({
        "device_id": device_id,
        "tutor_id": tutor_id,
        "location": location.model_dump(),
        "status": current_status,
        "timestamp": now
    })
    return current_status, is_safe, now

def _send_fcm_alert_background(tutor_id: str, child_name: str, db: Database) -> None:
    """Busca el token FCM del tutor en MongoDB y le envía una alerta push de FCM."""
    tutor = db.tutors.find_one({"tutor_id": tutor_id})
    if not tutor or not tutor.get("fcm_token"):
        return
        
    from app.core.firebase_config import send_push_notification
    token = tutor["fcm_token"]
    title = "¡ALERTA DE SEGURIDAD!"
    body = f"El niño '{child_name}' ha salido del perímetro seguro del Kinder."
    data = {
        "event": "ALARM",
        "child_name": child_name,
        "message": body
    }
    send_push_notification(token, title, body, data)

@router.post("/kindergartens", status_code=status.HTTP_201_CREATED)
async def create_kindergarten(payload: KindergartenCreate, db: Database = Depends(get_db)):
    """Registra un nuevo establecimiento preescolar (Kinder) en la base de datos."""
    try:
        k_data = {
            "name": payload.name,
            "geometry": payload.geometry.model_dump(),
            "buffer_meters": 10.0
        }
        res = db.kindergartens.insert_one(k_data)
        return {
            "id": str(res.inserted_id),
            "name": payload.name,
            "status": "created"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el Kínder: {str(e)}"
        )

@router.post("/tutors/register-fcm", status_code=status.HTTP_200_OK)
async def register_tutor_fcm(payload: TutorFCMRegister, db: Database = Depends(get_db)):
    """Registra o actualiza el token FCM del tutor en MongoDB."""
    try:
        db.tutors.update_one(
            {"tutor_id": payload.tutor_id},
            {
                "$set": {
                    "fcm_token": payload.fcm_token,
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        return {"tutor_id": payload.tutor_id, "status": "registered"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar el token FCM: {str(e)}"
        )

@router.post("/tracking/update", status_code=status.HTTP_200_OK)
async def update_tracking(
    payload: PositionUpdate, 
    background_tasks: BackgroundTasks,
    db: Database = Depends(get_db)
):
    """Actualiza la ubicación del niño, verifica geofencing y notifica vía WebSocket y FCM si es ALARM."""
    child, kinder = _get_child_and_kinder(payload.device_id, db)
    
    status_str, is_safe, now = _evaluate_and_update_status(
        payload.device_id, payload.tutor_id, payload.location, kinder, db
    )
    
    if not is_safe:
        alert_payload = {
            "event": "ALARM",
            "device_id": payload.device_id,
            "child_name": child.get("name", "Niño"),
            "message": f"¡ALERTA! El niño '{child.get('name', 'Niño')}' ha salido del perímetro del Kinder.",
            "timestamp": now.isoformat()
        }
        from app.api.websockets import manager
        await manager.send_personal_alert(payload.tutor_id, alert_payload)
        
        background_tasks.add_task(
            _send_fcm_alert_background, 
            payload.tutor_id, 
            child.get("name", "Niño"), 
            db
        )
        
    return {
        "device_id": payload.device_id,
        "status": status_str,
        "last_updated": now.isoformat(),
        "is_safe": is_safe
    }
