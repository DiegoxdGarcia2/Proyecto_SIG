from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from pymongo.database import Database
from app.core.database import get_db
from app.models.schemas import TutorCreate, TutorUpdate, TutorOut, TokenData
from app.api.auth import get_current_admin, get_password_hash

router = APIRouter()

def serialize_tutor(t: dict) -> dict:
    """Serializa un tutor de MongoDB a formato JSON dict."""
    return {
        "id": str(t["_id"]),
        "tutor_id": t["tutor_id"],
        "name": t["name"],
        "email": t["email"],
        "phone": t["phone"],
        "fcm_token": t.get("fcm_token"),
        "company_id": t["company_id"]
    }

@router.post("/tutors", response_model=TutorOut, status_code=status.HTTP_201_CREATED)
def create_tutor(
    payload: TutorCreate,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Crea un Tutor asociado a la empresa actual."""
    if admin.role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesores no tienen permisos para registrar tutores."
        )

    existing = db.tutors.find_one({"tutor_id": payload.tutor_id, "company_id": admin.company_id})
    if existing:
        raise HTTPException(status_code=400, detail="El tutor ya está registrado en esta empresa.")
    
    t_data = {
        "tutor_id": payload.tutor_id,
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone,
        "company_id": admin.company_id,
        "password_hash": get_password_hash(payload.password) if payload.password else None,
        "fcm_token": None
    }
    res = db.tutors.insert_one(t_data)
    t_data["_id"] = res.inserted_id
    return serialize_tutor(t_data)

@router.get("/tutors", response_model=list[TutorOut])
def get_tutors(
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Lista todos los Tutores de la empresa actual (Filtrado según Rol)."""
    if admin.role == "director":
        # Tutores de los niños de su unidad
        children = db.children.find({
            "company_id": admin.company_id, 
            "kindergarten_id": admin.kindergarten_id
        })
        tutor_ids = set()
        for c in children:
            tutor_ids.update(c.get("tutor_ids", []))
            
        results = db.tutors.find({
            "company_id": admin.company_id,
            "tutor_id": {"$in": list(tutor_ids)}
        })
    elif admin.role == "teacher":
        # Tutores de los niños de su aula
        children = db.children.find({
            "company_id": admin.company_id,
            "classroom_id": admin.classroom_id
        })
        tutor_ids = set()
        for c in children:
            tutor_ids.update(c.get("tutor_ids", []))
            
        results = db.tutors.find({
            "company_id": admin.company_id,
            "tutor_id": {"$in": list(tutor_ids)}
        })
    elif admin.role == "tutor":
        # Un tutor sólo puede verse a sí mismo
        results = db.tutors.find({
            "company_id": admin.company_id,
            "tutor_id": admin.username
        })
    else:
        results = db.tutors.find({"company_id": admin.company_id})
        
    return [serialize_tutor(t) for t in results]

@router.put("/tutors/{t_id}", response_model=TutorOut)
def update_tutor(
    t_id: str,
    payload: TutorUpdate,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Actualiza la información de un Tutor (Verifica pertenencia a la Unidad si es Director o Profesor)."""
    if not ObjectId.is_valid(t_id):
        raise HTTPException(status_code=400, detail="ID inválido.")
    
    tutor = db.tutors.find_one({"_id": ObjectId(t_id), "company_id": admin.company_id})
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor no encontrado.")
        
    if admin.role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesores no tienen permisos para actualizar tutores."
        )
        
    if admin.role == "director":
        has_kid = db.children.find_one({
            "company_id": admin.company_id,
            "kindergarten_id": admin.kindergarten_id,
            "tutor_ids": tutor["tutor_id"]
        })
        if not has_kid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para modificar este tutor, ya que no tiene alumnos en tu unidad."
            )
            
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(payload.password)
        del update_data["password"]

    db.tutors.update_one({"_id": ObjectId(t_id)}, {"$set": update_data})
    updated_t = db.tutors.find_one({"_id": ObjectId(t_id)})
    return serialize_tutor(updated_t)

@router.delete("/tutors/{t_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tutor(
    t_id: str,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Elimina un Tutor (Verifica pertenencia si es Director)."""
    if not ObjectId.is_valid(t_id):
        raise HTTPException(status_code=400, detail="ID inválido.")
        
    tutor = db.tutors.find_one({"_id": ObjectId(t_id), "company_id": admin.company_id})
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor no encontrado.")
        
    if admin.role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesores no tienen permisos para eliminar tutores."
        )
        
    if admin.role == "director":
        has_kid = db.children.find_one({
            "company_id": admin.company_id,
            "kindergarten_id": admin.kindergarten_id,
            "tutor_ids": tutor["tutor_id"]
        })
        if not has_kid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para eliminar este tutor, ya que no tiene alumnos en tu unidad."
            )
    
    res = db.tutors.delete_one({"_id": ObjectId(t_id), "company_id": admin.company_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tutor no encontrado.")
    return
