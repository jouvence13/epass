import pytest
from app.services.eta_calculator_service import haversine_spatial_distance


def test_haversine_distance_calculation():
    # Calavi Campus (6.4474, 2.3557) to Étoile Rouge Cotonou (6.3703, 2.4174)
    dist_km = haversine_spatial_distance(6.4474, 2.3557, 6.3703, 2.4174)
    # Approx distance should be ~10-12 km
    assert 9.0 <= dist_km <= 13.0
