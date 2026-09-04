"""
================================================================================
MODULE : CALCUL GÉOSPATIAL, DISTANCE HAVERSINE & ESTIMATION DE TEMPS (ETA)
================================================================================
Ce service calcule en temps réel :
1. La distance sphérique en kilomètres entre deux coordonnées GPS via la formule de Haversine.
2. L'extraction spatiale des coordonnées de l'arrêt de bus d'origine (PostGIS ST_X / ST_Y).
3. L'estimation dynamique du temps d'arrivée (ETA en minutes) pondérée par le trafic urbain local.
================================================================================
"""

import uuid
from math import radians, sin, cos, sqrt, atan2
from typing import Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.functions import ST_X, ST_Y

from app.models.fleet_model import Routes, Stops
from app.models.trip_model import Trips


def haversine_spatial_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcule la distance orthodromique (grand cercle) entre deux points de la Terre en kilomètres.
    
    Formule de Haversine :
      a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
      c = 2 * atan2(√a, √(1-a))
      distance = Rayon_Terre * c
    """
    earth_radius_km = 6371.0 # Rayon moyen de la Terre en kilomètres
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    calc_a = (
        sin(delta_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(delta_lon / 2) ** 2
    )
    calc_c = 2 * atan2(sqrt(calc_a), sqrt(1 - calc_a))
    return earth_radius_km * calc_c


async def get_trip_origin_geometry(trip_id: uuid.UUID, db: AsyncSession) -> Dict[str, float]:
    """
    Extrait les coordonnées spatiales (Latitude, Longitude) de l'arrêt de départ du trajet
    en utilisant les fonctions PostGIS ST_X (longitude) et ST_Y (latitude).
    """
    trip = await db.get(Trips, trip_id)
    if not trip:
        # Coordonnées par défaut : Campus UAC Abomey-Calavi (6.4474, 2.3557)
        return {"latitude": 6.4474, "longitude": 2.3557}

    route = await db.get(Routes, trip.route_id)
    if not route:
        return {"latitude": 6.4474, "longitude": 2.3557}

    # Requête spatiale SQL : extraction X/Y depuis la géométrie PostGIS
    query = select(
        ST_Y(Stops.geolocation).label("lat"),
        ST_X(Stops.geolocation).label("lon")
    ).where(Stops.stop_id == route.origin_stop_id)
    
    result = await db.execute(query)
    row = result.first()
    if row and row.lat is not None and row.lon is not None:
        return {"latitude": float(row.lat), "longitude": float(row.lon)}

    return {"latitude": 6.4474, "longitude": 2.3557}


async def compute_dynamic_eta(
    current_latitude: float,
    current_longitude: float,
    trip_id: uuid.UUID,
    db: AsyncSession
) -> int:
    """
    Calcule l'ETA (Estimated Time of Arrival) dynamique en minutes :
    1. Calcule la distance restante jusqu'à l'arrêt d'origine.
    2. Applique une vitesse moyenne urbaine de flux (ex: 25 km/h sur l'axe Calavi-Cotonou).
    3. Multiplie par un coefficient de trafic local (1.25).
    4. Retourne un minimum de 1 minute.
    """
    stop_coords = await get_trip_origin_geometry(trip_id, db)
    
    # Calcul de la distance en kilomètres
    remaining_distance_km = haversine_spatial_distance(
        current_latitude,
        current_longitude,
        stop_coords["latitude"],
        stop_coords["longitude"]
    )

    # Paramètres d'estimation
    average_urban_speed_kmh = 25.0       # Vitesse urbaine moyenne constatée
    buffer_traffic_multiplier = 1.25     # Facteur d'ajustement trafic et ralentissements

    estimated_time_hours = (remaining_distance_km / average_urban_speed_kmh) * buffer_traffic_multiplier
    eta_final_minutes = int(estimated_time_hours * 60)

    return max(1, eta_final_minutes)
