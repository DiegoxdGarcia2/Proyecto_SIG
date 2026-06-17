# Workflow de Inicialización Técnica

Este flujo de trabajo guía al agente de forma autónoma para preparar el entorno de desarrollo técnico de Python/FastAPI.

## Pasos del Flujo de Inicialización

1. **Inicialización de Git**
   - Ejecutar `git init` en la raíz del proyecto (`d:\Proyecto_SIG`).
   - Crear un archivo `.gitignore` adecuado para Python y FastAPI, evitando subir entornos virtuales (`venv`), archivos de entorno (`.env`), y archivos temporales.

2. **Creación del Entorno Virtual de Python (venv)**
   - Crear el entorno virtual ejecutando `python -m venv venv`.
   - Activar el entorno virtual según el sistema operativo (en Windows PowerShell: `.\venv\Scripts\Activate.ps1`).

3. **Instalación de Dependencias**
   - Instalar las dependencias base necesarias:
     - `fastapi` (Framework web rápido y moderno).
     - `uvicorn[standard]` (Servidor ASGI rápido).
     - `pymongo` (Driver oficial para MongoDB).
     - `shapely` (Biblioteca para manipulación y análisis de geometrías planas y geofencing).
   - Generar un archivo `requirements.txt` inicial con las dependencias instaladas.

4. **Creación de la Estructura Base del Backend**
   - Crear los siguientes directorios para organizar el código de manera modular y limpia:
     - `app/` (Directorio raíz de la aplicación backend).
     - `app/api/` (Controladores, rutas y endpoints de la API).
     - `app/core/` (Configuración general, base de datos y utilidades transversales).
     - `tests/` (Módulos de pruebas unitarias y de integración).

5. **Generación del Archivo de Configuración de Entorno (.env.example)**
   - Crear un archivo `.env.example` en la raíz del proyecto con las variables de configuración requeridas:
     - `MONGODB_URL` (URL de conexión a MongoDB Atlas).
     - `MONGODB_DB_NAME` (Nombre de la base de datos).
     - `FIREBASE_PROJECT_ID` (ID del proyecto de Firebase para notificaciones de alerta).
     - `API_PORT` (Puerto de escucha del servidor FastAPI).
