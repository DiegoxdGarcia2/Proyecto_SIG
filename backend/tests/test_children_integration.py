from fastapi.testclient import TestClient
from app.api.auth import create_access_token

def test_create_child_with_tutor(client: TestClient, admin_token: str) -> None:
    """Verifica la creación exitosa de un niño con un tutor asignado."""
    payload = {
        "name": "Pepito Pérez",
        "age": 3,
        "tutor_ids": ["tutor_mama_123"]
    }
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post("/api/v1/children", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Pepito Pérez"
    assert data["tutor_ids"] == ["tutor_mama_123"]
    assert "id" in data

def test_create_child_without_tutor_fails(client: TestClient, admin_token: str) -> None:
    """Verifica que falle la creación si la lista de tutores está vacía."""
    payload = {
        "name": "Huerfanito",
        "age": 3,
        "tutor_ids": []  # Debe ser min_length=1
    }
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post("/api/v1/children", json=payload, headers=headers)
    assert response.status_code == 422  # Error de validación de Pydantic

def test_assign_device_to_child(client: TestClient, admin_token: str) -> None:
    """Verifica la vinculación de hardware GPS a un niño."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Crear un niño
    payload = {
        "name": "Carlitos",
        "age": 5,
        "tutor_ids": ["tutor_mama_123"]
    }
    create_res = client.post("/api/v1/children", json=payload, headers=headers)
    c_id = create_res.json()["id"]

    # 2. Asignar dispositivo
    device_payload = {"device_id": "dispositivo_carlitos"}
    assign_res = client.put(f"/api/v1/children/{c_id}/assign-device", json=device_payload, headers=headers)
    assert assign_res.status_code == 200
    assert assign_res.json()["device_id"] == "dispositivo_carlitos"

def test_assign_duplicate_device_fails(client: TestClient, admin_token: str) -> None:
    """Verifica que no se permita asignar un dispositivo que ya está en uso."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Crear un niño nuevo
    payload = {
        "name": "Luisito",
        "age": 4,
        "tutor_ids": ["tutor_mama_123"]
    }
    create_res = client.post("/api/v1/children", json=payload, headers=headers)
    c_id = create_res.json()["id"]

    # Intentar asignar el dispositivo de Juanito que ya está en uso (seed_in_memory)
    device_payload = {"device_id": "dispositivo_juanito_123"}
    assign_res = client.put(f"/api/v1/children/{c_id}/assign-device", json=device_payload, headers=headers)
    assert assign_res.status_code == 400
    assert "dispositivo ya está asignado" in assign_res.json()["detail"] or "Dispositivo en uso" in assign_res.json()["detail"]

def test_teacher_cannot_create_child(client: TestClient) -> None:
    """Verifica que un maestro no tenga permisos para registrar niños."""
    teacher_token = create_access_token({
        "sub": "profesor",
        "company_id": "uagrm",
        "role": "teacher"
    })
    payload = {
        "name": "Estudiante",
        "age": 5,
        "tutor_ids": ["tutor_mama_123"]
    }
    headers = {"Authorization": f"Bearer {teacher_token}"}
    response = client.post("/api/v1/children", json=payload, headers=headers)
    assert response.status_code == 403
    assert "no tienen permisos para registrar" in response.json()["detail"]
