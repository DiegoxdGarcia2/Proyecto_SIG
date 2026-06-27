import os
import sys

def load_env_manual(file_path=".env"):
    """Carga variables de entorno manualmente desde un archivo .env si existe."""
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        key, val = parts
                        os.environ[key.strip()] = val.strip()

# Cargar variables de entorno del archivo .env
load_env_manual()

from app.core.database import get_db, init_db, close_db_client

def main():
    print("Iniciando verificación de conexión a MongoDB Atlas...")
    
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGODB_DB_NAME")
    
    if not mongo_uri:
        print("[ERROR] MONGO_URI no está definida en las variables de entorno.")
        sys.exit(1)
        
    print(f"MONGO_URI: {mongo_uri[:35]}... (oculto por seguridad)")
    print(f"Base de datos: {db_name}")
    
    try:
        # Inicializar base de datos e índices
        init_db()
        
        db = get_db()
        
        # Listar colecciones
        collections = db.list_collection_names()
        print(f"\nColecciones encontradas en la BD: {collections}")
        
        # Mostrar índices de kindergartens
        if "kindergartens" in collections:
            print("\nÍndices en la colección 'kindergartens':")
            for name, index_info in db.kindergartens.index_information().items():
                print(f"  - {name}: {index_info}")
        
        # Mostrar índices de children
        if "children" in collections:
            print("\nÍndices en la colección 'children':")
            for name, index_info in db.children.index_information().items():
                print(f"  - {name}: {index_info}")
                
        print("\n¡Verificación completada con éxito! Conexión a MongoDB Atlas establecida.")
        
    except Exception as e:
        print(f"\n[ERROR] No se pudo conectar o inicializar la BD: {e}")
        sys.exit(1)
    finally:
        close_db_client()

if __name__ == "__main__":
    main()
