from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from pymongo.database import Database
from app.core.database import get_db
from app.models.schemas import KindergartenCreate, KindergartenUpdate, KindergartenOut, TokenData
from app.api.auth import get_current_admin

router = APIRouter()

def serialize_kindergarten(k: dict) -> dict:
    """Serializa el documento MongoDB de Kínder a un formato JSON dict."""
    return {
        "id": str(k["_id"]),
        "name": k["name"],
        "geometry": k["geometry"],
        "buffer_meters": k.get("buffer_meters", 10.0),
        "company_id": k["company_id"]
    }

@router.post("/kindergartens", response_model=KindergartenOut, status_code=status.HTTP_201_CREATED)
def create_kindergarten(
    payload: KindergartenCreate,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Crea un Kínder asociado a la empresa actual (Sólo Administradores)."""
    if admin.role == "director":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los directores no tienen permisos para crear unidades educativas."
        )
        
    k_data = {
        "name": payload.name,
        "geometry": payload.geometry.model_dump(),
        "buffer_meters": payload.buffer_meters,
        "company_id": admin.company_id
    }
    res = db.kindergartens.insert_one(k_data)
    k_data["_id"] = res.inserted_id
    return serialize_kindergarten(k_data)

@router.get("/kindergartens", response_model=list[KindergartenOut])
def get_kindergartens(
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Lista todos los Kínders de la empresa actual (Filtrado para Directores)."""
    if admin.role == "director":
        if not admin.kindergarten_id or not ObjectId.is_valid(admin.kindergarten_id):
            return []
        results = db.kindergartens.find({
            "_id": ObjectId(admin.kindergarten_id), 
            "company_id": admin.company_id
        })
    else:
        results = db.kindergartens.find({"company_id": admin.company_id})
    return [serialize_kindergarten(k) for k in results]

@router.put("/kindergartens/{k_id}", response_model=KindergartenOut)
def update_kindergarten(
    k_id: str,
    payload: KindergartenUpdate,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Actualiza los límites de un Kínder (Los Directores sólo pueden actualizar su propio Kínder)."""
    if not ObjectId.is_valid(k_id):
        raise HTTPException(status_code=400, detail="ID de kínder inválido.")
    
    if admin.role == "director" and k_id != admin.kindergarten_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los directores sólo pueden modificar los límites de su propia unidad educativa."
        )
        
    k = db.kindergartens.find_one({"_id": ObjectId(k_id), "company_id": admin.company_id})
    if not k:
        raise HTTPException(status_code=404, detail="Kínder no encontrado.")
    
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "geometry" in update_data:
        update_data["geometry"] = payload.geometry.model_dump()
        
    db.kindergartens.update_one({"_id": ObjectId(k_id)}, {"$set": update_data})
    updated_k = db.kindergartens.find_one({"_id": ObjectId(k_id)})
    return serialize_kindergarten(updated_k)

@router.delete("/kindergartens/{k_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_kindergarten(
    k_id: str,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Elimina un Kínder (Sólo Administradores)."""
    if admin.role == "director":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los directores no tienen permisos para eliminar unidades educativas."
        )
        
    if not ObjectId.is_valid(k_id):
        raise HTTPException(status_code=400, detail="ID de kínder inválido.")
    
    res = db.kindergartens.delete_one({"_id": ObjectId(k_id), "company_id": admin.company_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kínder no encontrado.")
    return
