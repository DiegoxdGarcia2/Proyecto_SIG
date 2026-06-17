from pydantic import BaseModel, Field, field_validator
from typing import List, Literal

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
    """Modelo para representar un polígono GeoJSON cerrado."""
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[List[float]]]

    @field_validator("coordinates")
    @classmethod
    def validate_polygon_coordinates(cls, coords: List[List[List[float]]]) -> List[List[List[float]]]:
        if not coords or len(coords[0]) < 4:
            raise ValueError("El anillo exterior del polígono debe tener al menos 4 puntos (incluyendo el de cierre).")
        
        for ring in coords:
            for pt in ring:
                if len(pt) != 2:
                    raise ValueError("Cada coordenada de punto debe ser una lista de 2 números [Longitud, Latitud].")
                lon, lat = pt
                if not (-180.0 <= lon <= 180.0) or not (-90.0 <= lat <= 90.0):
                    raise ValueError(f"Coordenadas fuera de rango: Longitud {lon}, Latitud {lat}.")
            
            # Verificar que sea un anillo cerrado
            if ring[0] != ring[-1]:
                raise ValueError("El primer y el último punto del anillo deben ser idénticos para cerrar el polígono.")
        
        return coords

class PositionUpdate(BaseModel):
    """Modelo de entrada para la actualización de posición del niño."""
    device_id: str = Field(..., min_length=1)
    tutor_id: str = Field(..., min_length=1)
    location: PointModel

class KindergartenCreate(BaseModel):
    """Modelo de entrada para la creación de un establecimiento preescolar (Kinder)."""
    name: str = Field(..., min_length=1)
    geometry: PolygonModel

class TutorFCMRegister(BaseModel):
    """Modelo de entrada para registrar el token FCM del tutor."""
    tutor_id: str = Field(..., min_length=1)
    fcm_token: str = Field(..., min_length=1)

