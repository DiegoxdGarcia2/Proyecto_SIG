import math
from shapely.geometry import Point, Polygon
from typing import List

def _project_point(lon: float, lat: float, origin_lon: float, origin_lat: float) -> tuple[float, float]:
    """
    Proyecta un punto de coordenadas WGS84 (Longitud, Latitud) a coordenadas planas en metros (X, Y)
    relativas a un origen local mediante una aproximación equirectangular corregida por latitud.
    """
    # 1 grado de latitud es aproximadamente 111,320 metros
    lat_m = 111320.0
    # 1 grado de longitud depende de la latitud: 111,320 * cos(latitud)
    lon_m = 111320.0 * math.cos(math.radians(origin_lat))
    
    x = (lon - origin_lon) * lon_m
    y = (lat - origin_lat) * lat_m
    return x, y

def _project_polygon(rings: List[List[List[float]]], origin_lon: float, origin_lat: float) -> List[List[tuple[float, float]]]:
    """
    Proyecta todos los anillos de un polígono GeoJSON a coordenadas planas en metros.
    """
    projected_rings = []
    for ring in rings:
        projected_ring = []
        for pt in ring:
            x, y = _project_point(pt[0], pt[1], origin_lon, origin_lat)
            projected_ring.append((x, y))
        projected_rings.append(projected_ring)
    return projected_rings

def check_child_safety(
    child_location: List[float], 
    kinder_polygon_coords: List[List[List[float]]], 
    buffer_meters: float = 10.0
) -> bool:
    """
    Determina si un niño se encuentra dentro del perímetro del Kinder considerando un buffer de tolerancia.
    
    Argumentos:
        child_location: Coordenadas del niño en formato [Longitud, Latitud].
        kinder_polygon_coords: Coordenadas del polígono en formato GeoJSON coordinates: [[[lon, lat], ...]].
        buffer_meters: Buffer de tolerancia en metros.
        
    Retorna:
        True si el niño está dentro del polígono con buffer (SAFE).
        False si el niño está fuera del perímetro tolerado (ALARM).
    """
    if not kinder_polygon_coords or not kinder_polygon_coords[0]:
        raise ValueError("El polígono del Kinder no contiene coordenadas válidas.")
    
    # Usar el primer punto del anillo exterior como el origen de la proyección local
    origin_lon = kinder_polygon_coords[0][0][0]
    origin_lat = kinder_polygon_coords[0][0][1]
    
    # 1. Proyectar las coordenadas del niño a metros
    child_x, child_y = _project_point(child_location[0], child_location[1], origin_lon, origin_lat)
    child_pt = Point(child_x, child_y)
    
    # 2. Proyectar los anillos del polígono a metros
    projected_rings = _project_polygon(kinder_polygon_coords, origin_lon, origin_lat)
    
    # 3. Crear el polígono en Shapely
    # El primer anillo es el exterior, los subsecuentes (si existen) son agujeros
    exterior_ring = projected_rings[0]
    interior_rings = projected_rings[1:] if len(projected_rings) > 1 else None
    
    kinder_poly = Polygon(shell=exterior_ring, holes=interior_rings)
    
    # 4. Aplicar el buffer en metros al polígono del Kinder
    # Un buffer positivo expande la frontera exterior del polígono hacia afuera.
    buffered_kinder = kinder_poly.buffer(buffer_meters)
    
    # 5. Evaluar si el punto proyectado del niño está dentro del polígono expandido
    return buffered_kinder.contains(child_pt)
