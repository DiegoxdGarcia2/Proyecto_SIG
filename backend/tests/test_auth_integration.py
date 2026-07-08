from fastapi.testclient import TestClient

def test_register_admin_success(client: TestClient) -> None:
    """Verifica el registro exitoso de un nuevo administrador."""
    payload = {
        "username": "nuevo_admin",
        "password": "password123",
        "company_id": "uagrm",
        "role": "admin"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "nuevo_admin"
    assert data["company_id"] == "uagrm"
    assert "id" in data

def test_register_duplicate_username(client: TestClient) -> None:
    """Verifica que no se permita registrar un usuario con nombre duplicado."""
    payload = {
        "username": "admin",  # Ya existe en seed_in_memory
        "password": "password123",
        "company_id": "uagrm",
        "role": "admin"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "usuario ya está registrado" in response.json()["detail"]

def test_login_admin_success(client: TestClient) -> None:
    """Verifica que un administrador se pueda loguear correctamente."""
    payload = {
        "username": "admin",
        "password": "password"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_admin_by_email(client: TestClient) -> None:
    """Verifica que un administrador se pueda loguear ingresando su email."""
    payload = {
        "username": "admin@uagrm.edu",
        "password": "password"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_tutor_success(client: TestClient) -> None:
    """Verifica que un tutor se pueda loguear usando su tutor_id."""
    payload = {
        "username": "tutor_mama_123",
        "password": "password"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_tutor_by_email(client: TestClient) -> None:
    """Verifica que un tutor se pueda loguear usando su correo electrónico."""
    payload = {
        "username": "maria@gmail.com",
        "password": "password"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_wrong_password(client: TestClient) -> None:
    """Verifica el error correspondiente al ingresar una contraseña incorrecta."""
    payload = {
        "username": "admin",
        "password": "wrongpassword"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "Contraseña incorrecta" in response.json()["detail"]

def test_login_nonexistent_user(client: TestClient) -> None:
    """Verifica el error al intentar loguearse con un usuario no registrado."""
    payload = {
        "username": "no_existe",
        "password": "password"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "no está registrado" in response.json()["detail"]

def test_protected_endpoint_without_token(client: TestClient) -> None:
    """Verifica que las rutas protegidas retornen 401 sin autorización."""
    response = client.get("/api/v1/kindergartens")
    assert response.status_code == 401

def test_protected_endpoint_with_valid_token(client: TestClient, admin_token: str) -> None:
    """Verifica el acceso exitoso a rutas protegidas utilizando un token válido."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/v1/kindergartens", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
