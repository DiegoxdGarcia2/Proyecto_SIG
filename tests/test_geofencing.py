import pytest
from pydantic import ValidationError
from app.models.schemas import PositionUpdate, KindergartenCreate
from app.core.geo_engine import check_child_safety

# Polígono del Kinder ficticio cerca de la UAGRM (Santa Cruz de la Sierra)
# Formato GeoJSON: [Longitud, Latitud]
# Representa un cuadrado aproximado de 100m x 100m
# Esquina inferior izquierda (Origen de referencia): [-63.1910, -17.7760]
KINDER_POLYGON_COORDS = [[
    [-63.1910, -17.7760],
    [-63.1910, -17.7751],
    [-63.1901, -17.7751],
    [-63.1901, -17.7760],
    [-63.1910, -17.7760]  # Cierre del polígono
]]

def test_child_inside_kinder():
    """Prueba que un niño ubicado exactamente dentro del perímetro del Kínder sea SAFE."""
    # Ubicación en el centro del polígono
    child_loc = [-63.1905, -17.7755]
    is_safe = check_child_safety(child_loc, KINDER_POLYGON_COORDS, buffer_meters=10.0)
    assert is_safe is True

def test_child_far_outside():
    """Prueba que un niño ubicado a más de 50 metros del Kínder sea ALARM."""
    # Ubicado a ~50m al oeste y ~50m al sur de la esquina inferior izquierda
    # Desplazamiento aproximado de 0.00045 grados decimales en cada eje
    child_loc = [-63.19145, -17.77645]
    is_safe = check_child_safety(child_loc, KINDER_POLYGON_COORDS, buffer_meters=10.0)
    assert is_safe is False

def test_child_critical_in_buffer():
    """Prueba un caso crítico en el borde del límite, a ~5m del perímetro (dentro del buffer de 10m)."""
    # Desplazamiento de 5 metros al oeste de la esquina inferior izquierda (~0.000045 grados)
    child_loc = [-63.191045, -17.7760]
    is_safe = check_child_safety(child_loc, KINDER_POLYGON_COORDS, buffer_meters=10.0)
    assert is_safe is True  # Está fuera del perímetro real pero dentro del buffer de 10m

def test_child_critical_outside_buffer():
    """Prueba un caso crítico justo fuera del buffer de 10m (a ~12m del perímetro)."""
    # Desplazamiento de 12 metros al oeste de la esquina inferior izquierda (~0.000108 grados)
    child_loc = [-63.191108, -17.7760]
    is_safe = check_child_safety(child_loc, KINDER_POLYGON_COORDS, buffer_meters=10.0)
    assert is_safe is False  # Está fuera del polígono y excede la tolerancia de 10m

# --- Pruebas de los Modelos de Pydantic ---

def test_valid_position_update_model():
    """Verifica que el modelo PositionUpdate acepte y valide datos de entrada válidos."""
    data = {
        "device_id": "device123",
        "tutor_id": "tutor456",
        "location": {
            "type": "Point",
            "coordinates": [-63.1905, -17.7755]
        }
    }
    update = PositionUpdate(**data)
    assert update.device_id == "device123"
    assert update.location.coordinates == [-63.1905, -17.7755]

def test_invalid_position_update_coords():
    """Verifica que PositionUpdate lance un ValidationError si las coordenadas están fuera de rango."""
    invalid_data = {
        "device_id": "device123",
        "tutor_id": "tutor456",
        "location": {
            "type": "Point",
            "coordinates": [-190.0, -17.7755]  # Longitud inválida
        }
    }
    with pytest.raises(ValidationError):
        PositionUpdate(**invalid_data)

def test_valid_kindergarten_create_model():
    """Verifica que KindergartenCreate valide un polígono cerrado correctamente."""
    data = {
        "name": "Kinder Rayito de Sol",
        "geometry": {
            "type": "Polygon",
            "coordinates": KINDER_POLYGON_COORDS
        }
    }
    kinder = KindergartenCreate(**data)
    assert kinder.name == "Kinder Rayito de Sol"
    assert len(kinder.geometry.coordinates[0]) == 5

def test_invalid_kindergarten_unclosed():
    """Verifica que se lance error si el polígono del Kinder no está cerrado."""
    unclosed_coords = [[
        [-63.1910, -17.7760],
        [-63.1910, -17.7751],
        [-63.1901, -17.7751],
        [-63.1901, -17.7760]  # No se repite el primer punto
    ]]
    data = {
        "name": "Kinder Rayito de Sol",
        "geometry": {
            "type": "Polygon",
            "coordinates": unclosed_coords
        }
    }
    with pytest.raises(ValidationError) as exc_info:
        KindergartenCreate(**data)
    assert "primer y el último punto del anillo deben ser idénticos" in str(exc_info.value)
