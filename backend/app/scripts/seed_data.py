import os
import sys
import hashlib
from datetime import datetime, timezone
from pymongo import MongoClient

# Ajustar PYTHONPATH para poder importar módulos de app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

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
    """Limpia los datos previos e inserta los datos de prueba del Kindergarten piloto, tutores, niños y admins/profesor."""
    mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI") or "mongodb://localhost:27017"
    db_name = os.getenv("MONGODB_DB_NAME") or "proyecto_sig_db"
    
    print(f"Conectando a MongoDB: {mongo_uri.split('@')[-1]}... DB: {db_name}")
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    # 1. Limpieza de datos
    print("Limpiando colecciones existentes...")
    db.kindergartens.delete_many({})
    db.classrooms.delete_many({})
    db.children.delete_many({})
    db.tracking_logs.delete_many({})
    db.tutors.delete_many({})
    db.admins.delete_many({})
    
    # 2. Encriptación de contraseñas de prueba
    salt = "sig_saas_salt_2026"
    password_plain = "password"
    password_hash = hashlib.sha256((password_plain + salt).encode('utf-8')).hexdigest()
    
    # 3. Inserción del Administrador SaaS de Prueba
    print("Insertando Administrador SaaS...")
    admin_doc = {
        "username": "admin",
        "password_hash": password_hash,
        "email": "admin@uagrm.edu",
        "company_id": "uagrm",
        "role": "admin",
        "kindergarten_id": None,
        "classroom_id": None
    }
    db.admins.insert_one(admin_doc)

    # 4. Inserción de Tutores
    print("Insertando Tutores (Padre y Madre)...")
    tutor_mama = {
        "tutor_id": "tutor_mama_123",
        "name": "María Pérez",
        "email": "maria@gmail.com",
        "phone": "+59170012345",
        "password_hash": password_hash,
        "company_id": "uagrm",
        "fcm_token": None
    }
    db.tutors.insert_one(tutor_mama)

    tutor_papa = {
        "tutor_id": "tutor_papa_123",
        "name": "José Pérez",
        "email": "jose@gmail.com",
        "phone": "+59170098765",
        "password_hash": password_hash,
        "company_id": "uagrm",
        "fcm_token": None
    }
    db.tutors.insert_one(tutor_papa)

    # 5. Inserción de Kindergarten Piloto cerca de la UAGRM
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
        "buffer_meters": 10.0,
        "company_id": "uagrm"
    }
    kinder_id = db.kindergartens.insert_one(kinder_doc).inserted_id
    
    # 6. Inserción del Director de Kinder de prueba
    print("Insertando Director de Kinder...")
    director_doc = {
        "username": "director",
        "password_hash": password_hash,
        "email": "director@uagrm.edu",
        "company_id": "uagrm",
        "role": "director",
        "kindergarten_id": str(kinder_id),
        "classroom_id": None
    }
    db.admins.insert_one(director_doc)

    # 7. Inserción de Aula y Profesor
    print("Insertando Aula y Profesor...")
    classroom_doc = {
        "name": "Pre-Kínder A",
        "kindergarten_id": str(kinder_id),
        "teacher_id": "profesor",
        "company_id": "uagrm"
    }
    classroom_id = db.classrooms.insert_one(classroom_doc).inserted_id

    teacher_doc = {
        "username": "profesor",
        "password_hash": password_hash,
        "email": "profesor@uagrm.edu",
        "company_id": "uagrm",
        "role": "teacher",
        "kindergarten_id": str(kinder_id),
        "classroom_id": str(classroom_id)
    }
    db.admins.insert_one(teacher_doc)

    # 8. Inserción de Estudiantes (Multi-Tutor & Multi-Hijo)
    print("Insertando Estudiantes (Juanito y Pedrito)...")
    juanito_doc = {
        "name": "Juanito Pérez",
        "age": 4,
        "device_id": "dispositivo_juanito_123",
        "tutor_ids": ["tutor_mama_123", "tutor_papa_123"],
        "kindergarten_id": str(kinder_id),
        "classroom_id": str(classroom_id),
        "status": "SAFE",
        "current_location": {
            "type": "Point",
            "coordinates": [-63.1915, -17.7760]  # Ubicado adentro del Kinder
        },
        "company_id": "uagrm",
        "last_updated": datetime.now(timezone.utc)
    }
    db.children.insert_one(juanito_doc)

    pedrito_doc = {
        "name": "Pedrito Pérez",
        "age": 2,
        "device_id": "dispositivo_pedrito_123",
        "tutor_ids": ["tutor_mama_123"],
        "kindergarten_id": str(kinder_id),
        "classroom_id": str(classroom_id),
        "status": "SAFE",
        "current_location": {
            "type": "Point",
            "coordinates": [-63.1920, -17.7750]  # Ubicado adentro del Kinder
        },
        "company_id": "uagrm",
        "last_updated": datetime.now(timezone.utc)
    }
    db.children.insert_one(pedrito_doc)
    
    client.close()
    print("¡Poblamiento de base de datos finalizado con éxito!")

def main():
    if not os.getenv("MONGODB_URI"):
        load_env_manual()
    run_seed()

if __name__ == "__main__":
    main()
