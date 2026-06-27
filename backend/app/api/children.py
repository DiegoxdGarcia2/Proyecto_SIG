from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from pymongo.database import Database
from app.core.database import get_db
from app.models.schemas import ChildCreate, ChildUpdate, ChildOut, TokenData, DeviceAssign, TutorAssign
from app.api.auth import get_current_admin

router = APIRouter()

def serialize_child(c: dict) -> dict:
    """Serializa el documento del niño a un dict JSON."""
    return {
        "id": str(c["_id"]),
        "name": c["name"],
        "age": c["age"],
        "device_id": c.get("device_id"),
        "kindergarten_id": c.get("kindergarten_id"),
        "classroom_id": c.get("classroom_id"),
        "tutor_ids": c.get("tutor_ids", []),
        "status": c.get("status", "SAFE"),
        "company_id": c["company_id"],
        "last_updated": c.get("last_updated")
    }

@router.post("/children", response_model=ChildOut, status_code=status.HTTP_201_CREATED)
def create_child(
    payload: ChildCreate,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Crea un niño preescolar asignado a la empresa actual."""
    if admin.role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesores no tienen permisos para registrar niños."
        )

    target_k_id = admin.kindergarten_id if admin.role == "director" else payload.kindergarten_id

    c_data = {
        "name": payload.name,
        "age": payload.age,
        "device_id": payload.device_id,
        "kindergarten_id": target_k_id,
        "classroom_id": payload.classroom_id,
        "tutor_ids": payload.tutor_ids or [],
        "status": "SAFE",
        "company_id": admin.company_id,
        "last_updated": None
    }

    if target_k_id:
        k = db.kindergartens.find_one({"_id": ObjectId(target_k_id), "company_id": admin.company_id})
        if not k:
            raise HTTPException(status_code=400, detail="Kínder no válido.")
            
    if payload.classroom_id:
        c = db.classrooms.find_one({"_id": ObjectId(payload.classroom_id), "company_id": admin.company_id})
        if not c:
            raise HTTPException(status_code=400, detail="Aula no válida.")
            
    if payload.tutor_ids:
        for t_id in payload.tutor_ids:
            t = db.tutors.find_one({"tutor_id": t_id, "company_id": admin.company_id})
            if not t:
                raise HTTPException(status_code=400, detail=f"Tutor '{t_id}' no válido.")
            
    if payload.device_id:
        if db.children.find_one({"device_id": payload.device_id}):
            raise HTTPException(status_code=400, detail="El dispositivo ya está asignado.")
            
    res = db.children.insert_one(c_data)
    c_data["_id"] = res.inserted_id
    return serialize_child(c_data)

@router.get("/children", response_model=list[ChildOut])
def get_children(
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Lista todos los niños de la empresa actual (Filtrado según Rol de Profesor o Director)."""
    query = {"company_id": admin.company_id}
    
    if admin.role == "director":
        query["kindergarten_id"] = admin.kindergarten_id
    elif admin.role == "teacher":
        if admin.classroom_id:
            query["classroom_id"] = admin.classroom_id
        else:
            return []
    elif admin.role == "tutor":
        # Redirigir a los tutores a sus niños
        query["tutor_ids"] = admin.username
        
    results = db.children.find(query)
    return [serialize_child(c) for c in results]

@router.get("/tutor/children", response_model=list[ChildOut])
def get_tutor_children(
    tutor: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Lista todos los niños a cargo del tutor autenticado (Portal de Tutores)."""
    if tutor.role != "tutor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Este recurso es exclusivo para tutores."
        )
    results = db.children.find({"company_id": tutor.company_id, "tutor_ids": tutor.username})
    return [serialize_child(c) for c in results]

@router.put("/children/{c_id}", response_model=ChildOut)
def update_child(
    c_id: str,
    payload: ChildUpdate,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Actualiza datos básicos de un niño preescolar (Verifica propiedad del Kinder o Aula)."""
    if not ObjectId.is_valid(c_id):
        raise HTTPException(status_code=400, detail="ID inválido.")
        
    child = db.children.find_one({"_id": ObjectId(c_id), "company_id": admin.company_id})
    if not child:
        raise HTTPException(status_code=404, detail="Niño no encontrado.")
        
    if admin.role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesores no tienen permisos para editar perfiles de niños."
        )
        
    if admin.role == "director" and child.get("kindergarten_id") != admin.kindergarten_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar niños de otra unidad educativa."
        )
        
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    
    if admin.role == "director":
        # Evitar que un director mueva al estudiante a otro kínder
        if "kindergarten_id" in update_data:
            update_data["kindergarten_id"] = admin.kindergarten_id
            
    if "device_id" in update_data and update_data["device_id"] != child.get("device_id"):
        if db.children.find_one({"device_id": update_data["device_id"]}):
            raise HTTPException(status_code=400, detail="Dispositivo en uso.")
            
    db.children.update_one({"_id": ObjectId(c_id)}, {"$set": update_data})
    return serialize_child(db.children.find_one({"_id": ObjectId(c_id)}))

@router.delete("/children/{c_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_child(
    c_id: str,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Elimina un niño preescolar de la empresa actual."""
    if not ObjectId.is_valid(c_id):
        raise HTTPException(status_code=400, detail="ID inválido.")
        
    child = db.children.find_one({"_id": ObjectId(c_id), "company_id": admin.company_id})
    if not child:
        raise HTTPException(status_code=404, detail="Niño no encontrado.")
        
    if admin.role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesores no tienen permisos para eliminar perfiles de niños."
        )

    if admin.role == "director" and child.get("kindergarten_id") != admin.kindergarten_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar niños de otra unidad educativa."
        )
        
    db.children.delete_one({"_id": ObjectId(c_id)})
    return

@router.put("/children/{c_id}/assign-device", response_model=ChildOut)
def assign_device(
    c_id: str,
    payload: DeviceAssign,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Vincula un identificador de hardware al niño."""
    if not ObjectId.is_valid(c_id):
        raise HTTPException(status_code=400, detail="ID inválido.")
        
    child = db.children.find_one({"_id": ObjectId(c_id), "company_id": admin.company_id})
    if not child:
        raise HTTPException(status_code=404, detail="Niño no encontrado.")
        
    if admin.role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesores no tienen permisos para asignar hardware."
        )
        
    if admin.role == "director" and child.get("kindergarten_id") != admin.kindergarten_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para gestionar hardware de niños de otra unidad."
        )
        
    existing = db.children.find_one({"device_id": payload.device_id})
    if existing and str(existing["_id"]) != c_id:
        raise HTTPException(status_code=400, detail="Dispositivo en uso.")
        
    db.children.update_one({"_id": ObjectId(c_id)}, {"$set": {"device_id": payload.device_id}})
    return serialize_child(db.children.find_one({"_id": ObjectId(c_id)}))

@router.put("/children/{c_id}/assign-tutors", response_model=ChildOut)
def assign_tutors(
    c_id: str,
    payload: TutorAssign,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Vincula la relación familiar entre un niño y sus tutores a cargo (M:N)."""
    if not ObjectId.is_valid(c_id):
        raise HTTPException(status_code=400, detail="ID inválido.")
        
    child = db.children.find_one({"_id": ObjectId(c_id), "company_id": admin.company_id})
    if not child:
        raise HTTPException(status_code=404, detail="Niño no encontrado.")
        
    if admin.role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesores no tienen permisos para gestionar asignaciones familiares."
        )
        
    if admin.role == "director" and child.get("kindergarten_id") != admin.kindergarten_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para gestionar asignaciones familiares de niños de otra unidad."
        )
        
    for t_id in payload.tutor_ids:
        t = db.tutors.find_one({"tutor_id": t_id, "company_id": admin.company_id})
        if not t:
            raise HTTPException(status_code=400, detail=f"Tutor '{t_id}' no válido para esta empresa.")
        
    db.children.update_one({"_id": ObjectId(c_id)}, {"$set": {"tutor_ids": payload.tutor_ids}})
    return serialize_child(db.children.find_one({"_id": ObjectId(c_id)}))
