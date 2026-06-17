---
name: geo-validator
description: Valida la topología de polígonos GeoJSON evitando auto-intersecciones usando Shapely para optimizar tokens.
---

# Validador de Topología GeoJSON (geo-validator)

Esta habilidad proporciona lógica determinista y optimizada para verificar la validez topológica de los polígonos correspondientes a los perímetros de las instituciones preescolares (Kinders).

> [!IMPORTANT]
> **Carga Bajo Demanda:** Solo debes cargar y aplicar esta habilidad cuando el usuario o el flujo del sistema soliciten explícitamente validar la validez de un polígono GeoJSON, reduciendo así el consumo innecesario de tokens de contexto.

## Lógica Determinista de Validación con Shapely

Para verificar si un polígono GeoJSON es válido (por ejemplo, que no contenga auto-intersecciones), utiliza el siguiente script determinista en Python:

```python
from shapely.geometry import shape, Polygon

def validar_poligono_geojson(geojson_dict: dict) -> tuple[bool, str]:
    """
    Valida la validez de un polígono GeoJSON.
    Retorna (True, 'Polígono válido') o (False, 'Detalle del error').
    """
    try:
        # Cargar la geometría GeoJSON a un objeto Shapely
        geom = shape(geojson_dict)
        
        # Verificar que sea un Polígono o MultiPolígono
        if not isinstance(geom, (Polygon,)):
            return False, f"La geometría debe ser de tipo Polygon. Tipo recibido: {geom.geom_type}"
        
        # Validar topología básica
        if not geom.is_valid:
            # Retorna el motivo de la invalidez (ej. auto-intersección)
            from shapely.validation import explain_validity
            reason = explain_validity(geom)
            return False, f"Polígono inválido: {reason}"
            
        return True, "Polígono válido"
    except Exception as e:
        return False, f"Error al procesar la geometría: {str(e)}"
```

## Directrices Adicionales
- **Evitar Auto-intersecciones:** Un polígono que se cruza a sí mismo (como una figura de 8) no es válido para cálculos de geofencing. MongoDB rechazará la inserción de geometrías inválidas.
- **Simplificación de Polígonos:** Si el polígono tiene demasiados vértices degradando el rendimiento del geofencing, puedes usar `geom.simplify(tolerance)` para reducir la complejidad manteniendo la topología válida.
