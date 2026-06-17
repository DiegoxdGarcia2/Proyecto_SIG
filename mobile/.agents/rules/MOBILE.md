# Reglas de Gobernanza Móvil (React Native + TypeScript)

Este archivo define las directrices principales de desarrollo y diseño de interfaz para la aplicación móvil del tutor.

## Directrices de Desarrollo y Estilo de Código
- **Uso Estricto de TypeScript:** Todo componente, hook, función y payload de red debe estar fuertemente tipado. Evitar a toda costa el uso de tipo `any`.
- **Separación de Responsabilidades:**
  - **Lógica de red y estado:** Se debe abstraer completamente en hooks personalizados (ej. `useWebSocket`, `useAPI`).
  - **Componentes visuales:** Deben enfocarse únicamente en el renderizado y en reaccionar al estado expuesto por los hooks.

## Reglas de Diseño UX y Alarmas
- **Reacción Inmediata ante Emergencias:** 
  - Al recibir el estado `"ALARM"` desde el WebSocket, la aplicación debe transformar de forma inmediata la interfaz de usuario.
  - El tema visual del banner principal y los contenedores de alerta deben cambiar a un color **rojo de alta visibilidad parpadeante**.
  - Se debe disparar un efecto sonoro/alerta nativa o vibración del dispositivo para llamar la atención del tutor instantáneamente.
- **Formato Geospatial:** Las coordenadas del mapa y el polígono recuperado del Kinder deben mapearse correctamente respetando la regla global de `[Longitud, Latitud]` de la base de datos a `[Latitud, Longitud]` (exigido por `react-native-maps`).
