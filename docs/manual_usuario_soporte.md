# Documentación Técnica, Soporte y Manual de Usuario - Proyecto SIG Monitoreo Infantil

Este documento contiene la guía de usuario de la aplicación móvil, los pasos técnicos de despliegue e inicialización del backend, y las propuestas de soporte técnico inicial, mantenimiento y capacitación del personal, cumpliendo con los objetivos y metodología de la materia **INF442-SA**.

---

## 1. Manual de Usuario de la Aplicación Móvil (React Native)

La aplicación móvil cuenta con una arquitectura de doble rol integrada para facilitar las pruebas locales y la demostración interactiva del sistema:

### A. Modo Tutor (Monitoreo de Alertas)
* **Pantalla de Estado:** En la parte superior se muestra una tarjeta dinámica de estado:
  * **Verde (SAFE):** Indica que el niño se encuentra seguro dentro del perímetro del Kínder o del buffer de tolerancia.
  * **Azul (CONNECTING):** La aplicación está intentando establecer comunicación con el servidor WebSockets.
  * **Gris (DISCONNECTED):** Conexión perdida con el backend (intenta reconexión automática cada 5 segundos).
  * **Rojo (ALARM):** El niño ha abandonado la zona segura del Kínder.
* **Alertas Físicas (Vibración):** Ante el estado de `ALARM`, el dispositivo del tutor comenzará a vibrar de forma intermitente ([vibración, espera, vibración]) de manera persistente para llamar la atención del usuario inmediatamente.
* **Mapa de Monitoreo:** Muestra el polígono de seguridad del Kínder en color verde (o rojo en alarma) y ubica al niño con un marcador dinámico en tiempo real.
* **Marcado Rápido de Emergencia:** Al activarse la `ALARM`, aparecerá una sección en el encabezado con botones para realizar llamadas telefónicas rápidas utilizando la API de llamadas nativa del celular:
  * 📞 **Policía (110)**
  * 🏫 **Escuela (Administración)**
  * 🚨 **Emergencias (911)**

### B. Modo Simulador GPS (Niño)
* **Propósito:** Permite probar el geofencing en tiempo real sin salir a la calle.
* **Funcionamiento:**
  1. Selecciona la pestaña **"Simulador Niño"** en la barra superior.
  2. Presiona cualquier parte del mapa alrededor de la zona de la UAGRM.
  3. El marcador azul se desplazará al punto seleccionado y enviará de forma automática e inmediata un request HTTP al backend con las nuevas coordenadas.
  4. La tarjeta superior mostrará la respuesta directa del motor de geofencing del servidor: `SAFE` (si estás dentro del polígono delimitado) o `ALARM` (si saliste del Kínder y de la tolerancia del buffer de 10 metros).

---

## 2. Guía Técnica de Configuración y Despliegue del Backend

El backend está desarrollado en **Python con FastAPI** y conectado a **MongoDB Atlas** y **Firebase Cloud Messaging**.

### Requisitos Previos
* Python 3.10 o superior instalado.
* MongoDB Atlas en la nube (o MongoDB local corriendo en puerto 27017).
* Credenciales de una cuenta de servicio de Firebase.

### Paso 1: Configurar Variables de Entorno (.env)
Crea un archivo `.env` en la raíz del backend con los siguientes parámetros:
```env
API_PORT=8000
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/
MONGODB_DB_NAME=proyectoSIGdb
```

### Paso 2: Instalar Dependencias
Crea y activa el entorno virtual de Python, e instala las dependencias declaradas en `requirements.txt`:
```bash
python -m venv venv
.\venv\Scripts\Activate.ps1   # En Windows PowerShell
pip install -r requirements.txt
```

### Paso 3: Inicializar Credenciales de Firebase Admin SDK
Coloca el archivo de credenciales de la cuenta de servicio generado en la consola de Firebase con el nombre `firebase-service-account.json` en el directorio:
`app/core/firebase-service-account.json`

### Paso 4: Poblar la Base de Datos con Datos Piloto (Santa Cruz, Bolivia)
Ejecuta el script independiente de seeding que limpia y carga el Kínder Piloto UAGRM y registra al niño piloto "Juanito Pérez":
```bash
python -m app.scripts.seed_data
```

### Paso 5: Lanzar el Servidor Web
Arranca la aplicación FastAPI usando uvicorn:
```bash
uvicorn app.main:app --port 8000 --reload
```
La documentación interactiva OpenAPI (Swagger) estará disponible en: [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 3. Propuesta de Soporte Técnico y Mantenimiento

Para asegurar la alta disponibilidad del sistema de seguridad infantil, se propone un plan estructurado:

### A. Mesa de Ayuda y Soporte Inicial
* **Nivel 1 (Operativo - Administración del Kínder):** Soporte en el registro de nuevos niños, asignación de dispositivos y actualización de números de teléfono de emergencia del tutor.
* **Nivel 2 (Técnico - Desarrollador/Mantenimiento):** Diagnóstico de problemas de conectividad a la base de datos, fallos en la emisión de notificaciones push de Firebase y calibración del buffer perimetral.

### B. Mantenimiento Preventivo e Infraestructura
* **Monitoreo de Servicios (Health Check):** El backend expone un endpoint `/` para verificar la conectividad de la base de datos y la latencia general del servidor.
* **Indexación y Optimización Geográfica:** Programar la reconstrucción del índice `2dsphere` trimestralmente para mantener el alto rendimiento de las consultas espaciales en la colección de Kíndergartens.
* **Auditoría de Logs de Tracking:** Limpieza mensual o archivado de la colección `tracking_logs` para evitar saturación de almacenamiento, dejando únicamente históricos útiles para reportes de seguridad.

---

## 4. Plan de Capacitación

La capacitación está diseñada para dos perfiles clave de usuarios del establecimiento:

### Perfil A: Directores y Educadores (Administración del Establecimiento)
1. **Gestión de Cerca Virtual:** Capacitación en cómo registrar o modificar el polígono del perímetro seguro del Kínder en el sistema.
2. **Monitoreo Centralizado:** Explicación del flujo de alertas e interpretación de logs en caso de que ocurra una fuga real.
3. **Manejo de Emergencias:** Protocolo de contacto inmediato con el tutor tras dispararse una alerta de abandono de zona.

### Perfil B: Madres, Padres y Tutores (Familiares del Niño)
1. **Configuración de la Aplicación:** Instalación de la app móvil y aceptación de los permisos críticos (Geolocalización en segundo plano y Notificaciones Push).
2. **Entrenamiento del Estado de Alerta:** Comprensión de los estados del banner (SAFE / ALARM) y simulación del sonido/vibración de peligro.
3. **Uso de Acciones Rápidas:** Instrucción sobre cómo usar los botones de marcado directo a la policía o al colegio en situaciones críticas.
