import os
import sys
from datetime import datetime, timezone
from pymongo import MongoClient

def load_env_manual(file_path=".env"):
    """Carga de forma manual el archivo de configuración de entorno (.env)."""
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        os.environ[parts[0].strip()] = parts[1].strip()

def run_seed():
    """Limpia los datos previos e inserta los datos de prueba del Kindergarten piloto y niño."""
    mongo_uri = os.getenv("MONGO_URI") or "mongodb://localhost:27017"
    db_name = os.getenv("MONGODB_DB_NAME") or "proyecto_sig_db"
    
    print(f"Conectando a MongoDB Atlas: {mongo_uri[:35]}... DB: {db_name}")
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    # 1. Limpieza de datos
    print("Limpiando colecciones existentes...")
    db.kindergartens.delete_many({})
    db.children.delete_many({})
    db.tracking_logs.delete_many({})
    
    # 2. Inserción de Kindergarten Piloto cerca de la UAGRM
    print("Insertando Kindergarten Piloto (UAGRM)...")
    kinder_doc = {
        "name": "Kinder Piloto UAGRM",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-63.1930, -17.7780],
                [-63.1930, -17.7740],
                [-63.1900, -17.7740],
                [-63.1900, -17.7780],
                [-63.1930, -17.7780]
            ]]
        },
        "buffer_meters": 10.0
    }
    kinder_id = db.kindergartens.insert_one(kinder_doc).inserted_id
    
    # 3. Inserción de niño piloto vinculado
    print("Insertando registro de niño piloto...")
    child_doc = {
        "name": "Juanito Pérez",
        "device_id": "dispositivo_juanito_123",
        "tutor_id": "tutor_mama_123",
        "kindergarten_id": str(kinder_id),
        "status": "SAFE",
        "current_location": {
            "type": "Point",
            "coordinates": [-63.1915, -17.7760]  # Ubicado adentro del Kinder
        },
        "last_updated": datetime.now(timezone.utc)
    }
    db.children.insert_one(child_doc)
    client.close()
    print("¡Poblamiento de base de datos finalizado con éxito!")

def main():
    load_env_manual()
    run_seed()

if __name__ == "__main__":
    main()
