@.agents/rules/GEMINI.md

# Reglas de Negocio Geospatial - Niños Preescolares

Este archivo define las directrices y restricciones técnicas específicas para el manejo de datos geográficos y cálculo de geofencing en el proyecto.

## Almacenamiento y Estructura de Datos
- **Formato Estricto:** Toda coordenada geográfica debe almacenarse en formato **GeoJSON** estándar: `[Longitud, Latitud]`.
  - *Advertencia:* El orden es crucial para la correcta integración con MongoDB Atlas. Nunca almacenes las coordenadas en orden `[Latitud, Longitud]`.
- **Ejemplo de Punto GeoJSON:**
  ```json
  {
    "type": "Point",
    "coordinates": [-63.1818, -17.7833]
  }
  ```

## Cálculo de Geofencing (Cerca Virtual)
- **Comparación GPS:** Se debe comparar constantemente el punto GPS en tiempo real del niño (Point) contra el polígono definido del establecimiento preescolar (Kinder).
- **Buffer de Tolerancia Obligatorio:**
  - Se debe aplicar una tolerancia de **5 a 10 metros** alrededor del polígono del Kinder.
  - Este buffer tiene como objetivo mitigar falsos positivos y falsas alarmas provocadas por la degradación del GPS en interiores o rebotes de señal (multipath).
  - La lógica matemática para validar si el niño está dentro del Kinder debe considerar: `distancia(GPS, Kinder) <= buffer`.

## 3. Esquema de Datos Base (MongoDB)
- **Colección `kindergartens`**: `{ _id, name, location: Polygon, buffer_meters: 10 }`
- **Colección `children`**: `{ _id, name, device_id, tutor_id, current_location: Point, status: "SAFE" | "ALARM", last_updated }`

