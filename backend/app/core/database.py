import os
import logging
import hashlib
from datetime import datetime, timezone
from pymongo import MongoClient
from pymongo.database import Database
from bson import ObjectId

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("database")

MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URL") or "mongodb://localhost:27017"
DB_NAME = os.getenv("MONGODB_DB_NAME") or "proyecto_sig_db"

client = None
db = None

class MockCollection:
    """Clase para simular una colección de MongoDB en memoria para desarrollo local."""
    def __init__(self, name):
        self.name = name
        self.data = []

    def create_index(self, keys, **kwargs):
        pass

    def insert_one(self, doc):
        if "_id" not in doc:
            doc["_id"] = ObjectId()
        self.data.append(doc)
        class InsertResult:
            inserted_id = doc["_id"]
        return InsertResult()

    def find_one(self, query):
        for doc in self.data:
            if self._matches(doc, query):
                return doc
        return None

    def _matches(self, doc, query) -> bool:
        for k, v in query.items():
            if k == "$or":
                match_any = False
                for sub_query in v:
                    if self._matches(doc, sub_query):
                        match_any = True
                        break
                if not match_any:
                    return False
            elif k == "_id":
                if str(doc.get("_id")) != str(v):
                    return False
            elif isinstance(v, dict):
                if "$in" in v:
                    doc_val = doc.get(k)
                    if isinstance(doc_val, list):
                        if not any(item in v["$in"] for item in doc_val):
                            return False
                    elif doc_val not in v["$in"]:
                        return False
                elif "$gte" in v or "$lte" in v:
                    val = doc.get(k)
                    if val is None:
                        return False
                    if "$gte" in v:
                        comp = v["$gte"]
                        if isinstance(val, str) and not isinstance(comp, str):
                            val = datetime.fromisoformat(val.replace("Z", "+00:00"))
                        if isinstance(comp, str) and not isinstance(val, str):
                            comp = datetime.fromisoformat(comp.replace("Z", "+00:00"))
                        if isinstance(val, datetime) and isinstance(comp, datetime):
                            if val.tzinfo is not None and comp.tzinfo is None:
                                comp = comp.replace(tzinfo=val.tzinfo)
                            elif val.tzinfo is None and comp.tzinfo is not None:
                                val = val.replace(tzinfo=comp.tzinfo)
                        if val < comp:
                            return False
                    if "$lte" in v:
                        comp = v["$lte"]
                        if isinstance(val, str) and not isinstance(comp, str):
                            val = datetime.fromisoformat(val.replace("Z", "+00:00"))
                        if isinstance(comp, str) and not isinstance(val, str):
                            comp = datetime.fromisoformat(comp.replace("Z", "+00:00"))
                        if isinstance(val, datetime) and isinstance(comp, datetime):
                            if val.tzinfo is not None and comp.tzinfo is None:
                                comp = comp.replace(tzinfo=val.tzinfo)
                            elif val.tzinfo is None and comp.tzinfo is not None:
                                val = val.replace(tzinfo=comp.tzinfo)
                        if val > comp:
                            return False
            else:
                doc_val = doc.get(k)
                # Emular comportamiento MongoDB: si el campo es un array,
                # verificar si el valor escalar está contenido en el array.
                if isinstance(doc_val, list):
                    if v not in doc_val:
                        return False
                elif doc_val != v:
                    return False
        return True

    def find(self, query=None):
        query = query or {}
        matches = [doc for doc in self.data if self._matches(doc, query)]
        class MockCursor:
            def __init__(self, d):
                self.d = d
            def __iter__(self):
                return iter(self.d)
            def sort(self, k, direction=-1):
                self.d.sort(key=lambda x: x.get(k) or "", reverse=(direction==-1))
                return self
            def skip(self, n):
                self.d = self.d[n:]
                return self
            def limit(self, n):
                self.d = self.d[:n]
                return self
        return MockCursor(matches)

    def update_one(self, query, update, upsert=False):
        doc = self.find_one(query)
        if not doc:
            if upsert:
                new_doc = query.copy()
                if "$set" in update:
                    new_doc.update(update["$set"])
                self.insert_one(new_doc)
            return
        if "$set" in update:
            for k, v in update["$set"].items():
                doc[k] = v

    def delete_one(self, query):
        doc = self.find_one(query)
        if doc:
            self.data.remove(doc)
            class DeleteResult:
                deleted_count = 1
            return DeleteResult()
        class DeleteResultEmpty:
            deleted_count = 0
        return DeleteResultEmpty()

    def delete_many(self, query):
        self.data.clear()

class MockDatabase:
    """Clase para simular una base de datos de MongoDB en memoria."""
    def __init__(self):
        self.collections = {}

    def __getattr__(self, name):
        if name not in self.collections:
            self.collections[name] = MockCollection(name)
        return self.collections[name]

    def __getitem__(self, name):
        return getattr(self, name)

def seed_in_memory(mock_db):
    """Inserta datos de prueba en la base de datos simulada en memoria."""
    salt = "sig_saas_salt_2026"
    pwd_hash = hashlib.sha256(("password" + salt).encode('utf-8')).hexdigest()
    
    mock_db.admins.insert_one({
        "username": "admin", 
        "password_hash": pwd_hash, 
        "email": "admin@uagrm.edu",
        "company_id": "uagrm",
        "role": "admin",
        "kindergarten_id": None,
        "classroom_id": None
    })
    
    mock_db.tutors.insert_one({
        "tutor_id": "tutor_mama_123",
        "name": "María Pérez",
        "email": "maria@gmail.com",
        "phone": "+59170012345",
        "password_hash": pwd_hash,
        "company_id": "uagrm",
        "fcm_token": None
    })
    
    mock_db.tutors.insert_one({
        "tutor_id": "tutor_papa_123",
        "name": "José Pérez",
        "email": "jose@gmail.com",
        "phone": "+59170098765",
        "password_hash": pwd_hash,
        "company_id": "uagrm",
        "fcm_token": None
    })
    
    k_id = mock_db.kindergartens.insert_one({
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
    }).inserted_id
    
    mock_db.admins.insert_one({
        "username": "director", 
        "password_hash": pwd_hash, 
        "email": "director@uagrm.edu",
        "company_id": "uagrm",
        "role": "director",
        "kindergarten_id": str(k_id),
        "classroom_id": None
    })

    c_id = mock_db.classrooms.insert_one({
        "name": "Pre-Kínder A",
        "kindergarten_id": str(k_id),
        "teacher_id": "profesor",
        "company_id": "uagrm"
    }).inserted_id

    mock_db.admins.insert_one({
        "username": "profesor", 
        "password_hash": pwd_hash, 
        "email": "profesor@uagrm.edu",
        "company_id": "uagrm",
        "role": "teacher",
        "kindergarten_id": str(k_id),
        "classroom_id": str(c_id)
    })

    mock_db.children.insert_one({
        "name": "Juanito Pérez",
        "age": 4,
        "device_id": "dispositivo_juanito_123",
        "tutor_ids": ["tutor_mama_123", "tutor_papa_123"],
        "kindergarten_id": str(k_id),
        "classroom_id": str(c_id),
        "status": "SAFE",
        "current_location": {
            "type": "Point",
            "coordinates": [-63.1915, -17.7760]
        },
        "company_id": "uagrm",
        "last_updated": datetime.now(timezone.utc)
    })

    mock_db.children.insert_one({
        "name": "Pedrito Pérez",
        "age": 2,
        "device_id": "dispositivo_pedrito_123",
        "tutor_ids": ["tutor_mama_123"],
        "kindergarten_id": str(k_id),
        "classroom_id": str(c_id),
        "status": "SAFE",
        "current_location": {
            "type": "Point",
            "coordinates": [-63.1920, -17.7750]
        },
        "company_id": "uagrm",
        "last_updated": datetime.now(timezone.utc)
    })

def get_db():
    global db
    if db is None:
        init_db()
    return db

def init_db_client():
    global client, db
    try:
        logger.info(f"Conectando a MongoDB en {MONGO_URI.split('@')[-1]}...")
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        db = client[DB_NAME]
    except Exception as e:
        logger.error(f"Error al conectar a MongoDB: {e}")
        raise e

def init_db():
    global db
    try:
        init_db_client()
        # Forzar chequeo de conexión
        client.admin.command('ping')
        db.kindergartens.create_index([("geometry", "2dsphere")])
        db.children.create_index([("device_id", 1)], unique=True)
        logger.info("Base de datos MongoDB inicializada con éxito.")
    except Exception:
        logger.warning("No se pudo conectar a MongoDB. Usando base de datos simulada en memoria para desarrollo.")
        db = MockDatabase()
        seed_in_memory(db)

def close_db_client():
    global client, db
    if client is not None:
        client.close()
        logger.info("Conexión a MongoDB cerrada.")
        client = None
        db = None
