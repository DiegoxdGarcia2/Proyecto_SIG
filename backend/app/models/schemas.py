from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional
from datetime import datetime

class PointModel(BaseModel):
    """Modelo para representar un punto GeoJSON [Longitud, Latitud]."""
    type: Literal["Point"] = "Point"
    coordinates: List[float] = Field(..., min_length=2, max_length=2)

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, coords: List[float]) -> List[float]:
        lon, lat = coords
        if not (-180.0 <= lon <= 180.0):
            raise ValueError("La longitud debe estar entre -180 y 180 grados decimales.")
        if not (-90.0 <= lat <= 90.0):
            raise ValueError("La latitud debe estar entre -90 y 90 grados decimales.")
        return coords

class PolygonModel(BaseModel):
    """Modelo para representar un polígono GeoJSON (límites del Kinder)."""
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[List[float]]] = Field(..., min_length=1)

    @field_validator("coordinates")
    @classmethod
    def validate_polygon(cls, coords: List[List[List[float]]]) -> List[List[List[float]]]:
        if len(coords) < 1:
            raise ValueError("El polígono debe tener al menos un anillo exterior.")
        ring = coords[0]
        if len(ring) < 4:
            raise ValueError("El anillo exterior del polígono debe tener al menos 4 puntos (incluyendo el de cierre).")
        first, last = ring[0], ring[-1]
        if first != last:
            raise ValueError("El polígono debe ser cerrado (el primer punto debe ser igual al último).")
        return coords

class KindergartenCreate(BaseModel):
    name: str = Field(..., min_length=1)
    geometry: PolygonModel
    buffer_meters: float = Field(default=10.0, ge=5.0, le=100.0)

class KindergartenUpdate(BaseModel):
    name: Optional[str] = None
    geometry: Optional[PolygonModel] = None
    buffer_meters: Optional[float] = None

class KindergartenOut(BaseModel):
    id: str
    name: str
    geometry: PolygonModel
    buffer_meters: float
    company_id: str

# --- Aulas (Classrooms) ---
class ClassroomCreate(BaseModel):
    name: str = Field(..., min_length=1)
    kindergarten_id: str = Field(..., min_length=1)
    teacher_id: Optional[str] = None

class ClassroomUpdate(BaseModel):
    name: Optional[str] = None
    kindergarten_id: Optional[str] = None
    teacher_id: Optional[str] = None

class ClassroomOut(BaseModel):
    id: str
    name: str
    kindergarten_id: str
    teacher_id: Optional[str]
    company_id: str

class TutorFCMRegister(BaseModel):
    """Modelo de entrada para registrar el token FCM del tutor."""
    tutor_id: str = Field(..., min_length=1)
    fcm_token: str = Field(..., min_length=1)

class AdminLogin(BaseModel):
    """Modelo para login de administradores."""
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

class TutorLogin(BaseModel):
    """Modelo para login de tutores."""
    tutor_id: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1) # Usará phone o contraseña

class AdminCreate(BaseModel):
    """Modelo para crear administradores y profesores (SaaS)."""
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    company_id: str = Field(..., min_length=1)
    role: Literal["admin", "director", "teacher"] = "admin"
    kindergarten_id: Optional[str] = None
    classroom_id: Optional[str] = None

class AdminOut(BaseModel):
    id: str
    username: str
    company_id: str
    role: str
    kindergarten_id: Optional[str] = None
    classroom_id: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    company_id: Optional[str] = None
    role: Optional[str] = None
    kindergarten_id: Optional[str] = None
    classroom_id: Optional[str] = None

class TutorCreate(BaseModel):
    tutor_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=1)
    password: Optional[str] = None

class TutorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    fcm_token: Optional[str] = None
    password: Optional[str] = None

class TutorOut(BaseModel):
    id: str
    tutor_id: str
    name: str
    email: str
    phone: str
    fcm_token: Optional[str] = None
    company_id: str

class ChildCreate(BaseModel):
    name: str = Field(..., min_length=1)
    age: int = Field(..., gt=0)
    device_id: Optional[str] = None
    kindergarten_id: Optional[str] = None
    classroom_id: Optional[str] = None
    tutor_ids: List[str] = Field(..., min_length=1, description="Debe tener al menos un tutor responsable asignado.")

class ChildUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    device_id: Optional[str] = None
    kindergarten_id: Optional[str] = None
    classroom_id: Optional[str] = None
    tutor_ids: Optional[List[str]] = None

class ChildOut(BaseModel):
    id: str
    name: str
    age: int
    device_id: Optional[str] = None
    kindergarten_id: Optional[str] = None
    classroom_id: Optional[str] = None
    tutor_ids: List[str] = []
    status: str

class DeviceAssign(BaseModel):
    device_id: str = Field(..., min_length=1)

class TutorAssign(BaseModel):
    tutor_ids: List[str] = Field(..., min_length=1)

class PositionUpdate(BaseModel):
    device_id: str = Field(..., min_length=1)
    tutor_id: str = Field(..., min_length=1)
    location: PointModel

class AnomalyLogOut(BaseModel):
    id: str
    device_id: str
    tutor_id: str
    location: PointModel
    status: str
    timestamp: datetime
    company_id: str
    child_name: str
