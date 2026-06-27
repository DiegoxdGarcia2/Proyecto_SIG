# Resumen del Sistema SIG Preescolar Desarrollado

Este documento resume de manera breve y concisa todas las funcionalidades, reglas de negocio y componentes técnicos implementados hasta el momento en la plataforma web (Full Stack: Backend FastAPI + Frontend React).

---

## 1. Arquitectura Base y Enfoque SaaS
*   **SaaS Multi-Inquilino (Multi-tenant):** Aislamiento de datos a nivel de base de datos utilizando el campo `company_id`. Todos los recursos (Kindergartens, Classrooms, Children, Tutors, Logs) se filtran automáticamente por el inquilino activo.
*   **Base de Datos Flexible:** Configurada para conectar a una base de datos física en MongoDB con un fallback automatizado a un simulador de base de datos en memoria (`MockDatabase` con soporte completo de operaciones complejas y consultas `$or` / `$in`) para desarrollo local rápido.
*   **Cifrado Seguro:** Implementación estándar SHA-256 con sal única del proyecto para contraseñas de personal y tutores, eliminando dependencias externas incompatibles en entornos locales.

---

## 2. Acceso Unificado y Autodetectado
*   **Login Consolidado:** Formulario de inicio de sesión unificado sin conmutadores visuales de rol.
*   **Doble Identificador:** Permite el inicio de sesión ingresando el **Nombre de Usuario** (o **ID de Tutor**) o bien el **Correo Electrónico** asociado, junto a su contraseña.
*   **Autodetección:** El backend valida las credenciales buscando en la colección `admins` (obteniendo el rol `admin`, `director` o `teacher`) y de no existir, en la colección `tutors` (obteniendo el rol `tutor`), retornando un token JWT configurado con el alcance del usuario.

---

## 3. Jerarquía y Segmentación de Roles
*   **Administrador SaaS (Admin):** Tiene acceso global dentro de su tenant; gestiona establecimientos, aulas, niños, tutores y ve el mapa con telemetría global.
*   **Director de Establecimiento (Director):** Visualiza información y gestiona los límites vectoriales, aulas, estudiantes y logs en tiempo real únicamente del Kínder bajo su responsabilidad.
*   **Profesor / Maestro (Teacher):** Acceso restringido exclusivamente a la telemetría en tiempo real y bitácora de anomalías de los estudiantes inscritos en su Aula asignada (`classroom_id`).
*   **Tutor / Adulto Responsable (Tutor):** Acceso exclusivo para consultar en tiempo real a los estudiantes vinculados bajo su responsabilidad.

---

## 4. Relación M:N (Tutores y Estudiantes)
*   **Cardinalidad Flexible:** Un estudiante puede tener asignado uno o más tutores (ej: tíos, abuelos, padres como adultos responsables). Un estudiante debe tener **al menos 1 tutor responsable obligatorio** al ser creado.
*   **Varios Estudiantes por Tutor:** Un tutor puede tener a su cargo múltiples estudiantes dentro del mismo kínder.
*   **Alertas Simultáneas:** Cuando se ingesta una posición GPS fuera de límites vectoriales (`ALARM`), el backend propaga en tiempo real alertas de manera simultánea a las conexiones WebSockets y canales FCM de **todos** los tutores a cargo del menor en paralelo.

---

## 5. Interfaz de Usuario y Portal de Tutores (Sidebar + Split Layout)
*   **Barra Lateral Adaptada:** Habilitación de la barra lateral plegable exclusiva para tutores conteniendo las pestañas "Monitoreo en Vivo" e "Historial de Alertas".
*   **Filtros de Fecha Históricos:** Pantalla completa de Historial de Alertas con selector de rangos de fechas (Desde / Hasta) y botón de limpieza de filtros.
*   **Portal en Dos Columnas (Split Layout):**
    *   **Mapa Interactivo (Izquierda):** Muestra el perímetro de seguridad y los marcadores GPS en tiempo real de todos sus estudiantes a cargo.
    *   **Panel de Control (Derecha):**
        *   **Lista de Estudiantes:** Tarjetas con bordes de vidrio con Nombre, Kínder, Aula (resolución dinámica de nombres), Edad, GPS y punto con pulso de estatus en vivo (`SAFE` / `ALARM`).
        *   **Recentrado Dinámico:** Al presionar la tarjeta de un estudiante, el mapa se desplaza y enfoca automáticamente en su posición.
        *   **Bitácora de Alertas:** Panel inferior que muestra el historial de anomalías recientes filtrado exclusivamente por el menor seleccionado.
    *   **Responsividad:** Grilla flexible que colapsa y se apila verticalmente en pantallas de dispositivos móviles de forma automática.
*   **Modo Claro / Oscuro:** Botones estéticos de control de tema en el login y en el Navbar, configurado con el **Modo Claro** como tema por defecto inicial en todas las vistas de la aplicación.
listo