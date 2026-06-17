from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.database import init_db, close_db_client
from app.api.endpoints import router as api_router
from app.api.websockets import router as ws_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Maneja el ciclo de vida de la aplicación, inicializando y cerrando la conexión a la base de datos.
    """
    # Ejecutado al iniciar la aplicación
    init_db()
    yield
    # Ejecutado al cerrar la aplicación
    close_db_client()

app = FastAPI(
    title="Sistema de Información Geográfica (SIG) - Monitoreo Infantil",
    description="Backend API para monitoreo en tiempo real de niños preescolares en Santa Cruz de la Sierra.",
    version="1.0.0",
    lifespan=lifespan
)

# Incluir las rutas de la API y WebSockets bajo el prefijo /api/v1
app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/api/v1")

@app.get("/", tags=["Health Check"])
def read_root():
    """Endpoint de verificación de estado básico."""
    return {
        "status": "online",
        "message": "Servicios del Sistema de Información Geográfica (SIG) activos."
    }
