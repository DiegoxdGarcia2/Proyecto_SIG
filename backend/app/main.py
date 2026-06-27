from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db, close_db_client
from app.api.endpoints import router as api_router
from app.api.websockets import router as ws_router
from app.api.auth import router as auth_router
from app.api.kindergartens import router as kindergartens_router
from app.api.tutors import router as tutors_router
from app.api.children import router as children_router
from app.api.logs import router as logs_router
from app.api.classrooms import router as classrooms_router
from app.api.tracking import router as tracking_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Maneja el ciclo de vida de la aplicación, inicializando y cerrando la conexión a la base de datos.
    """
    init_db()
    yield
    close_db_client()

app = FastAPI(
    title="Sistema de Información Geográfica (SIG) - Monitoreo Infantil",
    description="Backend API para monitoreo en tiempo real de niños preescolares en Santa Cruz de la Sierra.",
    version="1.0.0",
    lifespan=lifespan
)

# Configuración de CORS para permitir peticiones desde el frontend en React Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, definir los dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir las rutas de la API bajo el prefijo /api/v1
app.include_router(auth_router, prefix="/api/v1")
app.include_router(kindergartens_router, prefix="/api/v1")
app.include_router(classrooms_router, prefix="/api/v1")
app.include_router(tutors_router, prefix="/api/v1")
app.include_router(children_router, prefix="/api/v1")
app.include_router(logs_router, prefix="/api/v1")
app.include_router(tracking_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/api/v1")

@app.get("/", tags=["Health Check"])
def read_root():
    """Endpoint de verificación de estado básico."""
    return {
        "status": "online",
        "message": "Servicios del Sistema de Información Geográfica (SIG) activos."
    }
