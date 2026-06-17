import os
import logging
from pymongo import MongoClient
from pymongo.database import Database

# Configurar logging básico
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("database")

# Obtener URI de conexión a MongoDB de las variables de entorno
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URL") or "mongodb://localhost:27017"
DB_NAME = os.getenv("MONGODB_DB_NAME") or "proyecto_sig_db"

client = None
db: Database = None

def get_db() -> Database:
    """
    Retorna la instancia de base de datos activa.
    """
    global db
    if db is None:
        init_db_client()
    return db

def init_db_client():
    """
    Inicializa el cliente de MongoDB.
    """
    global client, db
    try:
        logger.info(f"Conectando a MongoDB en {MONGO_URI.split('@')[-1]}...")  # Oculta credenciales en logs
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        logger.info(f"Conexión establecida con la base de datos: {DB_NAME}")
    except Exception as e:
        logger.error(f"Error al conectar a MongoDB: {e}")
        raise e

def init_db():
    """
    Inicializa colecciones y crea índices geoespaciales obligatorios.
    """
    global db
    if db is None:
        init_db_client()
    
    try:
        # Crear índice geoespacial de tipo 2dsphere en la clave 'geometry' de la colección 'kindergartens'
        logger.info("Creando índice geoespacial '2dsphere' en 'kindergartens.geometry'...")
        db.kindergartens.create_index([("geometry", "2dsphere")])
        
        # Crear índice de búsqueda rápida y único para el device_id en la colección 'children'
        logger.info("Creando índice único en 'children.device_id'...")
        db.children.create_index([("device_id", 1)], unique=True)
        
        logger.info("Base de datos inicializada con éxito.")
    except Exception as e:
        logger.error(f"Error al inicializar los índices de la base de datos: {e}")
        raise e

def close_db_client():
    """
    Cierra la conexión al cliente de MongoDB.
    """
    global client, db
    if client is not None:
        client.close()
        logger.info("Conexión a MongoDB cerrada.")
        client = None
        db = None
