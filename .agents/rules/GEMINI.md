# Reglas de Gobernanza del Agente - GEMINI

Este archivo define las directrices principales de desarrollo y permisos para el agente de IA en este proyecto.

## Estilo de Código Limpio
- **Tamaño de Funciones:** Las funciones deben ser modulares y concisas, con un tamaño máximo de 40 líneas de código.
- **Formato y Calidad:** Se prefiere el uso de tipado estático (Type Hints) en Python y una estructura modular limpia.
- **Idioma:** Toda la documentación, comentarios en el código e interacciones con el usuario se realizarán en **español**.

## Capas de Permisos y Confirmación
- **Lectura y Pruebas (Libre):** El agente puede leer archivos, realizar búsquedas y ejecutar pruebas locales de forma autónoma.
- **Modificación y Creación (Libre):** El agente puede modificar y crear archivos de código fuente según el plan aprobado.
- **Instalación de Dependencias (Confirmación requerida):** El agente debe solicitar autorización expresa antes de instalar paquetes adicionales no declarados en el plan inicial.
- **Control de Versiones (Confirmación requerida):** El agente debe solicitar confirmación explícita del usuario antes de realizar cualquier commit o push en Git.
