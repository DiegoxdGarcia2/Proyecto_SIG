from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from app.core.database import get_db
from app.models.schemas import AnomalyLogOut, TokenData
from app.api.auth import get_current_admin
from datetime import datetime
from typing import Optional

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

    # Filtros según jerarquía de roles
    if admin.role == "director":
        children = db.children.find({
            "company_id": admin.company_id, 
            "kindergarten_id": admin.kindergarten_id
        })
        device_ids = [c["device_id"] for c in children if c.get("device_id")]
        query["device_id"] = {"$in": device_ids}
        
    elif admin.role == "teacher":
        children = db.children.find({
            "company_id": admin.company_id,
            "classroom_id": admin.classroom_id
        })
        device_ids = [c["device_id"] for c in children if c.get("device_id")]
        query["device_id"] = {"$in": device_ids}
        
    elif admin.role == "tutor":
        children = db.children.find({
            "company_id": admin.company_id,
            "tutor_ids": admin.username
        })
        device_ids = [c["device_id"] for c in children if c.get("device_id")]
        query["device_id"] = {"$in": device_ids}
        
    results = db.tracking_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    
    logs_out = []
    for r in results:
        child = db.children.find_one({"device_id": r["device_id"]})
        child_name = child["name"] if child else "Desconocido"
        
        logs_out.append(AnomalyLogOut(
            id=str(r["_id"]),
            device_id=r["device_id"],
            tutor_id=r["tutor_id"],
            location=r["location"],
            status=r["status"],
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
    device_ids = [c["device_id"] for c in children if c.get("device_id")]
    
    query = {
        "status": "ALARM", 
        "company_id": tutor.company_id,
        "device_id": {"$in": device_ids}
    }
    
    # Filtro por rango de fechas
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            query["timestamp"]["$lte"] = datetime.strptime(end_date + " 23:59:59", "%Y-%m-%d %H:%M:%S")
            
    results = db.tracking_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    
    logs_out = []
    for r in results:
        child = db.children.find_one({"device_id": r["device_id"]})
        child_name = child["name"] if child else "Desconocido"
        
        logs_out.append(AnomalyLogOut(
            id=str(r["_id"]),
            device_id=r["device_id"],
            tutor_id=r["tutor_id"],
            location=r["location"],
            status=r["status"],
            timestamp=r["timestamp"],
            company_id=r.get("company_id", tutor.company_id),
            child_name=child_name
        ))
    return logs_out
