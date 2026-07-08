from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from app.core.database import get_db
from app.models.schemas import AnomalyLogOut, TokenData
from app.api.auth import get_current_admin
from datetime import datetime
from typing import Optional
from bson import ObjectId

router = APIRouter()

@router.get("/logs/anomalies", response_model=list[AnomalyLogOut])
def get_anomaly_logs(
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db),
    limit: int = 50,
    skip: int = 0,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Consulta el historial de anomalías (estado ALARM) filtrando por la empresa 
    y unidad/aula/tutor según el rol del usuario, con soporte para rangos de fecha.
    """
    query = {"status": "ALARM", "company_id": admin.company_id}
    
    # Filtro por rango de fechas
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            query["timestamp"]["$lte"] = datetime.strptime(end_date + " 23:59:59", "%Y-%m-%d %H:%M:%S")

    # 1. Obtener la lista de estudiantes filtrados por los privilegios de rol del administrador
    child_query = {"company_id": admin.company_id}
    if admin.role == "director":
        child_query["kindergarten_id"] = admin.kindergarten_id
    elif admin.role == "teacher":
        if admin.classroom_id:
            child_query["classroom_id"] = admin.classroom_id
        else:
            return []
    elif admin.role == "tutor":
        child_query["tutor_ids"] = admin.username

    children_cursor = db.children.find(child_query)
    child_map = {str(c["_id"]): c for c in children_cursor}
    child_ids = list(child_map.keys())

    # 2. Consultar la bitácora de logs reales de geocercas
    query = {
        "company_id": admin.company_id,
        "child_id": {"$in": child_ids}
    }
    
    # Filtro por rango de fechas
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            query["timestamp"]["$lte"] = datetime.strptime(end_date + " 23:59:59", "%Y-%m-%d %H:%M:%S")

    results = db.logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    
    logs_out = []
    for r in results:
        child = child_map.get(r["child_id"])
        child_name = child["name"] if child else "Desconocido"
        device_id = child["device_id"] if child else "Desconocido"
        tutor_id = child["tutor_ids"][0] if child and child.get("tutor_ids") else "Desconocido"

        # Mapear event_type (GEOFENCE_EXIT -> ALARM, GEOFENCE_ENTER -> SAFE)
        status_val = "ALARM" if r.get("event_type") == "GEOFENCE_EXIT" else "SAFE"

        logs_out.append(AnomalyLogOut(
            id=str(r["_id"]),
            device_id=device_id,
            tutor_id=tutor_id,
            location=r["location"],
            status=status_val,
            timestamp=r["timestamp"],
            company_id=r.get("company_id", admin.company_id),
            child_name=child_name
        ))
    return logs_out

@router.get("/tutor/logs", response_model=list[AnomalyLogOut])
def get_tutor_anomaly_logs(
    tutor: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db),
    limit: int = 50,
    skip: int = 0,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Consulta el historial de anomalías exclusivo para el tutor autenticado con filtros de fecha."""
    if tutor.role != "tutor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Este recurso es exclusivo para tutores."
        )
        
    children = db.children.find({"company_id": tutor.company_id, "tutor_ids": tutor.username})
    child_ids = [str(c["_id"]) for c in children]
    
    query = {
        "company_id": tutor.company_id,
        "child_id": {"$in": child_ids}
    }
    
    # Filtro por rango de fechas
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            query["timestamp"]["$lte"] = datetime.strptime(end_date + " 23:59:59", "%Y-%m-%d %H:%M:%S")
            
    results = db.logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    
    logs_out = []
    for r in results:
        child = db.children.find_one({"_id": ObjectId(r["child_id"])})
        child_name = child["name"] if child else "Desconocido"
        device_id = child["device_id"] if child else "Desconocido"
        
        # Mapear event_type (GEOFENCE_EXIT -> ALARM, GEOFENCE_ENTER -> SAFE)
        status_val = "ALARM" if r.get("event_type") == "GEOFENCE_EXIT" else "SAFE"
        
        logs_out.append(AnomalyLogOut(
            id=str(r["_id"]),
            device_id=device_id,
            tutor_id=tutor.username,
            location=r["location"],
            status=status_val,
            timestamp=r["timestamp"],
            company_id=r.get("company_id", tutor.company_id),
            child_name=child_name
        ))
    return logs_out
