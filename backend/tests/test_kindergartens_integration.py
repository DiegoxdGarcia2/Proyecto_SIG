from fastapi.testclient import TestClient
from app.api.auth import create_access_token

# Polígono de prueba válido (cerrado y de 5 puntos)
K_TEST_COORDS = [[
    [-63.1930, -17.7780],
    [-63.1930, -17.7740],
    [-63.1900, -17.7740],
    [-63.1900, -17.7780],
    [-63.1930, -17.7780]
]]

def test_create_kindergarten_as_admin(client: TestClient, admin_token: str) -> None:
    """Verifica que un administrador pueda crear un Kindergarten."""
    payload = {
        "name": "Kinder San Aurelio",
        "geometry": {
            "type": "Polygon",
            "coordinates": K_TEST_COORDS
        },
        "buffer_meters": 15.0
    }
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.post("/api/v1/kindergartens", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Kinder San Aurelio"
    assert data["buffer_meters"] == 15.0
    assert "id" in data

def test_create_kindergarten_as_director_forbidden(client: TestClient) -> None:
    """Verifica que un Director no tenga permisos para crear unidades educativas."""
    director_token = create_access_token({
        "sub": "director",
        "company_id": "uagrm",
        "role": "director",
        "kindergarten_id": "algún_id",
        "classroom_id": None
    })
    payload = {
        "name": "Kinder Sin Permiso",
        "geometry": {
            "type": "Polygon",
            "coordinates": K_TEST_COORDS
        }
    }
    headers = {"Authorization": f"Bearer {director_token}"}
    response = client.post("/api/v1/kindergartens", json=payload, headers=headers)
    assert response.status_code == 403
    assert "no tienen permisos para crear" in response.json()["detail"]

def test_list_kindergartens(client: TestClient, admin_token: str) -> None:
    """Verifica que se listen correctamente los Kindergartens de la empresa."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/v1/kindergartens", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["company_id"] == "uagrm"

def test_update_kindergarten_geometry(client: TestClient, admin_token: str) -> None:
    """Verifica que se puedan actualizar los límites de un Kínder."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    list_res = client.get("/api/v1/kindergartens", headers=headers)
    k_id = list_res.json()[0]["id"]

    # Nueva geometría desplazada levemente
    new_coords = [[
        [-63.1940, -17.7790],
        [-63.1940, -17.7750],
        [-63.1910, -17.7750],
        [-63.1910, -17.7790],
        [-63.1940, -17.7790]
    ]]
    payload = {
        "name": "Kinder Actualizado",
        "geometry": {
            "type": "Polygon",
            "coordinates": new_coords
        },
        "buffer_meters": 20.0
    }
    update_res = client.put(f"/api/v1/kindergartens/{k_id}", json=payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Kinder Actualizado"
    assert update_res.json()["buffer_meters"] == 20.0

def test_delete_kindergarten(client: TestClient, admin_token: str) -> None:
    """Verifica que un administrador pueda eliminar un Kindergarten."""
    # Primero creamos un kínder temporal para eliminar
    payload = {
        "name": "Kinder Temporal",
        "geometry": {
            "type": "Polygon",
            "coordinates": K_TEST_COORDS
        }
    }
    headers = {"Authorization": f"Bearer {admin_token}"}
    create_res = client.post("/api/v1/kindergartens", json=payload, headers=headers)
    k_id = create_res.json()["id"]

    del_res = client.delete(f"/api/v1/kindergartens/{k_id}", headers=headers)
    assert del_res.status_code == 204
