import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, MockDatabase, seed_in_memory
from app.api.auth import create_access_token
from typing import Generator

# Crear una base de datos en memoria para todas las pruebas de integración
_test_db = MockDatabase()
seed_in_memory(_test_db)

def get_test_db() -> MockDatabase:
    """Retorna la base de datos simulada para pruebas."""
    return _test_db

# Override de la dependencia get_db en la app de FastAPI
app.dependency_overrides[get_db] = get_test_db

@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """Fixture que provee un cliente de pruebas para FastAPI."""
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session")
def admin_token() -> str:
    """Fixture que retorna un token JWT válido de administrador de prueba."""
    token_data = {
        "sub": "admin",
        "company_id": "uagrm",
        "role": "admin",
        "kindergarten_id": None,
        "classroom_id": None
    }
    return create_access_token(token_data)

@pytest.fixture(scope="session")
def tutor_token() -> str:
    """Fixture que retorna un token JWT válido de tutor de prueba."""
    token_data = {
        "sub": "tutor_mama_123",
        "company_id": "uagrm",
        "role": "tutor"
    }
    return create_access_token(token_data)
