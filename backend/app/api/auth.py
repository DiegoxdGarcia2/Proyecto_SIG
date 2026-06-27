from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo.database import Database
import hashlib

try:
    from jose import jwt, JWTError
except ImportError:
    try:
        import jwt
        JWTError = jwt.PyJWTError
    except ImportError:
        # Fallback de emergencia si ninguna de las librerías JWT está instalada
        class JWTError(Exception):
            pass
        class DummyJWT:
            def encode(self, payload, key, algorithm):
                import json, base64
                data_encoded = base64.b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8')
                return f"header.{data_encoded}.signature"
            def decode(self, token, key, algorithms):
                import json, base64
                try:
                    parts = token.split(".")
                    payload_part = parts[1] if len(parts) > 1 else parts[0]
                    # Corregir padding de base64
                    padding = len(payload_part) % 4
                    if padding:
                        payload_part += "=" * (4 - padding)
                    return json.loads(base64.b64decode(payload_part).decode('utf-8'))
                except Exception:
                    raise JWTError("Invalid token format")
        jwt = DummyJWT()

from app.core.database import get_db
from app.models.schemas import AdminCreate, AdminLogin, AdminOut, Token, TokenData

# Configuración de Seguridad
SECRET_KEY = "sig_secret_key_super_secure_uagrm_2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas de sesión
SALT = "sig_saas_salt_2026"

security = HTTPBearer()
router = APIRouter()

def get_password_hash(password: str) -> str:
    """Retorna el hash SHA-256 de la contraseña con salt."""
    return hashlib.sha256((password + SALT).encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña coincide con el hash almacenado."""
    calc = hashlib.sha256((plain_password + SALT).encode('utf-8')).hexdigest()
    return calc == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Genera un token JWT firmado con expiración."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    """Decodifica y valida un token JWT."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Database = Depends(get_db)
) -> TokenData:
    """Dependencia para verificar el token JWT y obtener el usuario actual (Admin, Director, Profesor o Tutor)."""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenData(
        username=payload.get("sub"),
        company_id=payload.get("company_id"),
        role=payload.get("role"),
        kindergarten_id=payload.get("kindergarten_id"),
        classroom_id=payload.get("classroom_id")
    )

@router.post("/auth/register", response_model=AdminOut, status_code=status.HTTP_201_CREATED)
def register_admin(payload: AdminCreate, db: Database = Depends(get_db)):
    """Registra un nuevo administrador bajo una empresa específica (SaaS)."""
    existing = db.admins.find_one({"username": payload.username})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está registrado."
        )
    
    admin_data = {
        "username": payload.username,
        "password_hash": get_password_hash(payload.password),
        "company_id": payload.company_id,
        "role": payload.role,
        "kindergarten_id": payload.kindergarten_id,
        "classroom_id": payload.classroom_id
    }
    res = db.admins.insert_one(admin_data)
    return AdminOut(
        id=str(res.inserted_id),
        username=payload.username,
        company_id=payload.company_id,
        role=payload.role,
        kindergarten_id=payload.kindergarten_id,
        classroom_id=payload.classroom_id
    )

@router.post("/auth/login", response_model=Token)
def login(payload: AdminLogin, db: Database = Depends(get_db)):
    """
    Inicia sesión unificada. Identifica automáticamente si es Administrador, Director, 
    Profesor o Tutor consultando por su usuario, ID de tutor o correo electrónico.
    """
    # 1. Intentar buscar en la colección de Administradores/Personal (por usuario o correo)
    admin = db.admins.find_one({
        "$or": [
            {"username": payload.username},
            {"email": payload.username}
        ]
    })
    if admin:
        if verify_password(payload.password, admin["password_hash"]):
            token_data = {
                "sub": admin["username"],
                "company_id": admin["company_id"],
                "role": admin.get("role", "admin"),
                "kindergarten_id": admin.get("kindergarten_id"),
                "classroom_id": admin.get("classroom_id")
            }
            token = create_access_token(token_data)
            return Token(access_token=token, token_type="bearer")
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Contraseña incorrecta."
            )
            
    # 2. Si no es administrador, buscar en la colección de Tutores (por ID de tutor o correo)
    tutor = db.tutors.find_one({
        "$or": [
            {"tutor_id": payload.username},
            {"email": payload.username}
        ]
    })
    if tutor:
        if "password_hash" in tutor and tutor["password_hash"]:
            if verify_password(payload.password, tutor["password_hash"]):
                token_data = {
                    "sub": tutor["tutor_id"],
                    "company_id": tutor["company_id"],
                    "role": "tutor"
                }
                token = create_access_token(token_data)
                return Token(access_token=token, token_type="bearer")
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta."
        )

    # 3. No encontrado en ninguna colección
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="El identificador o correo electrónico ingresado no está registrado en el sistema."
    )
