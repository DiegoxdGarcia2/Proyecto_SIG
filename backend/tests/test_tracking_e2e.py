from fastapi.testclient import TestClient
from unittest.mock import patch

def test_tracking_safe_position(client: TestClient) -> None:
    """Verifica que el envío de una ubicación dentro del Kínder resulte en SAFE."""
    payload = {
        "device_id": "dispositivo_juanito_123",
        "tutor_id": "tutor_mama_123",
        "location": {
            "type": "Point",
            "coordinates": [-63.1915, -17.7760]  # Coordenada dentro
        }
    }
    response = client.post("/api/v1/tracking/update", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SAFE"
    assert data["is_safe"] is True

def test_tracking_alarm_position(client: TestClient) -> None:
    """Verifica que salir del perímetro seguro resulte en ALARM."""
    payload = {
        "device_id": "dispositivo_juanito_123",
        "tutor_id": "tutor_mama_123",
        "location": {
            "type": "Point",
            "coordinates": [-63.1800, -17.7600]  # Muy al noreste (fuera)
        }
    }
    
    # Hacemos mock de send_push_notification para no fallar si no hay conexión a Firebase real
    with patch("app.core.firebase_config.send_push_notification") as mock_fcm:
        mock_fcm.return_value = True
        response = client.post("/api/v1/tracking/update", json=payload)
        
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ALARM"
    assert data["is_safe"] is False

def test_tracking_return_to_safe(client: TestClient) -> None:
    """Verifica que retornar al perímetro del Kínder cambie el estado de vuelta a SAFE."""
    # Primero forzamos una posición de alarma
    payload_alarm = {
        "device_id": "dispositivo_juanito_123",
        "tutor_id": "tutor_mama_123",
        "location": {
            "type": "Point",
            "coordinates": [-63.1800, -17.7600]
        }
    }
    with patch("app.core.firebase_config.send_push_notification") as mock_fcm:
        mock_fcm.return_value = True
        client.post("/api/v1/tracking/update", json=payload_alarm)

    # Luego enviamos posición segura
    payload_safe = {
        "device_id": "dispositivo_juanito_123",
        "tutor_id": "tutor_mama_123",
        "location": {
            "type": "Point",
            "coordinates": [-63.1915, -17.7760]
        }
    }
    response = client.post("/api/v1/tracking/update", json=payload_safe)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SAFE"
    assert data["is_safe"] is True
