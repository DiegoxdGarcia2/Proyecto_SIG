from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from pymongo.database import Database
from app.core.database import get_db
from app.models.schemas import ClassroomCreate, ClassroomUpdate, ClassroomOut, TokenData
from app.api.auth import get_current_admin

router = APIRouter()

def serialize_classroom(c: dict) -> dict:
    """Serializa un documento de aula de MongoDB a un formato JSON dict."""
    return {
        "id": str(c["_id"]),
        "name": c["name"],
        "kindergarten_id": c["kindergarten_id"],
        "teacher_id": c.get("teacher_id"),
        "company_id": c["company_id"]
    }

@router.post("/classrooms", response_model=ClassroomOut, status_code=status.HTTP_201_CREATED)
def create_classroom(
    payload: ClassroomCreate,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Crea una Aula/Clase asociada a un Kindergarten de la empresa (Sólo Admins y Directores)."""
    if admin.role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesores no tienen permisos para crear aulas."
        )
        
    if admin.role == "director" and payload.kindergarten_id != admin.kindergarten_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los directores sólo pueden crear aulas en su propia unidad educativa."
        )

    # Validar que el Kindergarten existe
    k = db.kindergartens.find_one({"_id": ObjectId(payload.kindergarten_id), "company_id": admin.company_id})
    if not k:
        raise HTTPException(status_code=400, detail="Kínder no válido.")

    c_data = {
        "name": payload.name,
        "kindergarten_id": payload.kindergarten_id,
        "teacher_id": payload.teacher_id,
        "company_id": admin.company_id
    }
    res = db.classrooms.insert_one(c_data)
    c_data["_id"] = res.inserted_id
    return serialize_classroom(c_data)

@router.get("/classrooms", response_model=list[ClassroomOut])
def get_classrooms(
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Lista todas las Aulas de la empresa actual (Filtrado por Unidad/Aula según Rol)."""
    query = {"company_id": admin.company_id}
    
    if admin.role == "director":
        query["kindergarten_id"] = admin.kindergarten_id
    elif admin.role == "teacher":
        # El profesor sólo puede ver su aula asignada
        if admin.classroom_id:
            query["_id"] = ObjectId(admin.classroom_id)
        else:
            return []
            
    results = db.classrooms.find(query)
    return [serialize_classroom(c) for c in results]

@router.put("/classrooms/{c_id}", response_model=ClassroomOut)
def update_classroom(
    c_id: str,
    payload: ClassroomUpdate,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Actualiza una Aula/Clase (Sólo Admins y Directores autorizados)."""
    if not ObjectId.is_valid(c_id):
        raise HTTPException(status_code=400, detail="ID de aula inválido.")
        
    classroom = db.classrooms.find_one({"_id": ObjectId(c_id), "company_id": admin.company_id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Aula no encontrada.")

    if admin.role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesores no tienen permisos para editar aulas."
        )

    if admin.role == "director" and classroom["kindergarten_id"] != admin.kindergarten_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar aulas de otra unidad educativa."
        )

    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    
    # Validar si cambia de kínder
    if "kindergarten_id" in update_data:
        if admin.role == "director" and update_data["kindergarten_id"] != admin.kindergarten_id:
            raise HTTPException(status_code=400, detail="No puedes reasignar el aula a otra unidad educativa.")
            
        k = db.kindergartens.find_one({"_id": ObjectId(update_data["kindergarten_id"]), "company_id": admin.company_id})
        if not k:
            raise HTTPException(status_code=400, detail="Kínder no válido.")

    db.classrooms.update_one({"_id": ObjectId(c_id)}, {"$set": update_data})
    updated = db.classrooms.find_one({"_id": ObjectId(c_id)})
    return serialize_classroom(updated)

@router.delete("/classrooms/{c_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_classroom(
    c_id: str,
    admin: TokenData = Depends(get_current_admin),
    db: Database = Depends(get_db)
):
    """Elimina una Aula (Sólo Admins y Directores autorizados)."""
    if not ObjectId.is_valid(c_id):
        raise HTTPException(status_code=400, detail="ID de aula inválido.")
        
    classroom = db.classrooms.find_one({"_id": ObjectId(c_id), "company_id": admin.company_id})
    if not classroom:
        raise HTTPException(status_code=404, detail="Aula no encontrada.")

    if admin.role == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los profesores no tienen permisos para eliminar aulas."
        )

    if admin.role == "director" and classroom["kindergarten_id"] != admin.kindergarten_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar aulas de otra unidad educativa."
        )

    db.classrooms.delete_one({"_id": ObjectId(c_id)})
    return
