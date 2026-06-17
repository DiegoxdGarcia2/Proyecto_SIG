import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db

# Crear un mock de la base de datos de MongoDB
mock_db = MagicMock()

# Reemplazar la dependencia de get_db en FastAPI con nuestro mock
def override_get_db():
    return mock_db

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# Polígono del Kinder de prueba cerca de la UAGRM
KINDER_TEST_COORDS = [[
    [-63.1910, -17.7760],
    [-63.1910, -17.7751],
    [-63.1901, -17.7751],
    [-63.1901, -17.7760],
    [-63.1910, -17.7760]
]]

def test_read_root_health():
    """Prueba que el root endpoint responda correctamente (Health Check)."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_create_kindergarten_endpoint():
    """Prueba la creación exitosa de un Kindergarten."""
    # Configurar el retorno del mock
    mock_db.kindergartens.insert_one.return_value = MagicMock(inserted_id="60b8c8f0f1d2b827e8d4a45a")
    
    payload = {
        "name": "Kinder Rayito de Sol",
        "geometry": {
            "type": "Polygon",
            "coordinates": KINDER_TEST_COORDS
        }
    }
    
    response = client.post("/api/v1/kindergartens", json=payload)
    assert response.status_code == 201
    assert response.json()["name"] == "Kinder Rayito de Sol"
    assert "id" in response.json()
    assert response.json()["status"] == "created"

def test_tracking_update_safe():
    """Prueba la actualización de posición de un niño que se encuentra a salvo (SAFE)."""
    # 1. Mock de la búsqueda del niño
    mock_db.children.find_one.return_value = {
        "_id": "60b8c8f0f1d2b827e8d4a45b",
        "name": "Juanito",
        "device_id": "device_juanito",
        "tutor_id": "tutor_mama",
        "kindergarten_id": "60b8c8f0f1d2b827e8d4a45a",
        "status": "SAFE"
    }
    
    # 2. Mock de la búsqueda del Kinder
    mock_db.kindergartens.find_one.return_value = {
        "_id": "60b8c8f0f1d2b827e8d4a45a",
        "name": "Kinder Rayito de Sol",
        "geometry": {
            "type": "Polygon",
            "coordinates": KINDER_TEST_COORDS
        },
        "buffer_meters": 10.0
    }
    
    # Mocks para inserción y actualización
    mock_db.children.update_one.return_value = MagicMock()
    mock_db.tracking_logs.insert_one.return_value = MagicMock()
    
    # Payload con posición central interna del Kinder
    payload = {
        "device_id": "device_juanito",
        "tutor_id": "tutor_mama",
        "location": {
            "type": "Point",
            "coordinates": [-63.1905, -17.7755]  # Dentro del Kinder
        }
    }
    
    response = client.post("/api/v1/tracking/update", json=payload)
    assert response.status_code == 200
    assert response.json()["device_id"] == "device_juanito"
    assert response.json()["status"] == "SAFE"
    assert response.json()["is_safe"] is True

def test_tracking_update_alarm():
    """Prueba la actualización de posición de un niño que sale del perímetro (ALARM)."""
    # 1. Mock de la búsqueda del niño
    mock_db.children.find_one.return_value = {
        "_id": "60b8c8f0f1d2b827e8d4a45b",
        "name": "Juanito",
        "device_id": "device_juanito",
        "tutor_id": "tutor_mama",
        "kindergarten_id": "60b8c8f0f1d2b827e8d4a45a",
        "status": "SAFE"
    }
    
    # 2. Mock de la búsqueda del Kinder
    mock_db.kindergartens.find_one.return_value = {
        "_id": "60b8c8f0f1d2b827e8d4a45a",
        "name": "Kinder Rayito de Sol",
        "geometry": {
            "type": "Polygon",
            "coordinates": KINDER_TEST_COORDS
        },
        "buffer_meters": 10.0
    }
    
    # Mocks para inserción y actualización
    mock_db.children.update_one.return_value = MagicMock()
    mock_db.tracking_logs.insert_one.return_value = MagicMock()
    
    # Payload con posición lejana (fuera del buffer)
    payload = {
        "device_id": "device_juanito",
        "tutor_id": "tutor_mama",
        "location": {
            "type": "Point",
            "coordinates": [-63.1950, -17.7800]  # Fuera del Kinder
        }
    }
    
    response = client.post("/api/v1/tracking/update", json=payload)
    assert response.status_code == 200
    assert response.json()["device_id"] == "device_juanito"
    assert response.json()["status"] == "ALARM"
    assert response.json()["is_safe"] is False

def test_tracking_update_child_not_found():
    """Prueba que se responda con 404 si el dispositivo no está registrado."""
    # Configurar find_one de niños para retornar None
    mock_db.children.find_one.return_value = None
    
    payload = {
        "device_id": "unknown_device",
        "tutor_id": "unknown_tutor",
        "location": {
            "type": "Point",
            "coordinates": [-63.1905, -17.7755]
        }
    }
    
    response = client.post("/api/v1/tracking/update", json=payload)
    assert response.status_code == 404
    assert "no registrado" in response.json()["detail"]

def test_websocket_connection():
    """Prueba que se acepte una conexión WebSocket para el tutor y responda a pings."""
    with client.websocket_connect("/api/v1/ws/tutor/tutor_123") as websocket:
        # Enviar texto de prueba
        websocket.send_text("ping")
        # Recibir la respuesta
        data = websocket.receive_json()
        assert data["status"] == "alive"
        assert data["echo"] == "ping"

def test_register_tutor_fcm():
    """Prueba el registro exitoso del token FCM de un tutor."""
    mock_db.tutors.update_one.return_value = MagicMock()
    
    payload = {
        "tutor_id": "tutor_mama",
        "fcm_token": "token_fcm_simulado_123"
    }
    
    response = client.post("/api/v1/tutors/register-fcm", json=payload)
    assert response.status_code == 200
    assert response.json()["tutor_id"] == "tutor_mama"
    assert response.json()["status"] == "registered"

def test_tracking_update_alarm_with_fcm():
    """Prueba que en estado ALARM se intente buscar y enviar la alerta push al tutor."""
    # 1. Mock de la búsqueda del niño
    mock_db.children.find_one.return_value = {
        "_id": "60b8c8f0f1d2b827e8d4a45b",
        "name": "Juanito",
        "device_id": "device_juanito",
        "tutor_id": "tutor_mama",
        "kindergarten_id": "60b8c8f0f1d2b827e8d4a45a",
        "status": "SAFE"
    }
    
    # 2. Mock de la búsqueda del Kinder
    mock_db.kindergartens.find_one.return_value = {
        "_id": "60b8c8f0f1d2b827e8d4a45a",
        "name": "Kinder Rayito de Sol",
        "geometry": {
            "type": "Polygon",
            "coordinates": KINDER_TEST_COORDS
        },
        "buffer_meters": 10.0
    }
    
    # 3. Mock de la búsqueda del tutor con FCM
    mock_db.tutors.find_one.return_value = {
        "tutor_id": "tutor_mama",
        "fcm_token": "token_fcm_simulado_123"
    }
    
    from unittest.mock import patch
    mock_db.children.update_one.return_value = MagicMock()
    mock_db.tracking_logs.insert_one.return_value = MagicMock()
    
    payload = {
        "device_id": "device_juanito",
        "tutor_id": "tutor_mama",
        "location": {
            "type": "Point",
            "coordinates": [-63.1950, -17.7800]  # Fuera del Kinder
        }
    }
    
    with patch("app.core.firebase_config.send_push_notification") as mock_send_push:
        mock_send_push.return_value = True
        response = client.post("/api/v1/tracking/update", json=payload)
        
    assert response.status_code == 200
    assert response.json()["status"] == "ALARM"


