import os
import logging
import firebase_admin
from firebase_admin import credentials, messaging
from typing import Dict, Optional

logger = logging.getLogger("firebase_config")

def init_firebase() -> None:
    """
    Inicializa Firebase Admin SDK utilizando las credenciales de la cuenta de servicio.
    """
    if firebase_admin._apps:
        return
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    cred_path = os.path.join(current_dir, "firebase-service-account.json")
    
    if not os.path.exists(cred_path):
        logger.warning("⚠️ Archivo 'firebase-service-account.json' no encontrado. FCM desactivado.")
        return
        
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        logger.info("🔥 Firebase Admin SDK inicializado exitosamente.")
    except Exception as e:
        logger.error(f"❌ Error al inicializar Firebase Admin SDK: {e}")

def send_push_notification(
    fcm_token: str, 
    title: str, 
    body: str, 
    data: Optional[Dict[str, str]] = None
) -> bool:
    """
    Envía una notificación push de FCM de alta prioridad a un token específico.
    """
    init_firebase()
    if not firebase_admin._apps:
        logger.warning("FCM no disponible (Firebase no inicializado).")
        return False
        
    if not fcm_token:
        logger.warning("Token de FCM vacío. Se omite envío.")
        return False
        
    try:
        notification = messaging.Notification(title=title, body=body)
        message = messaging.Message(
            token=fcm_token,
            notification=notification,
            data=data or {},
            android=messaging.AndroidConfig(
                priority="high"
            )
        )
        response = messaging.send(message)
        logger.info(f"Notificación FCM enviada con éxito. ID: {response}")
        return True
    except Exception as e:
        logger.error(f"Error al enviar la notificación FCM: {e}")
        return False
