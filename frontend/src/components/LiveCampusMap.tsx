import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';
import { ENDPOINTS } from '../config/api';
import Badge from './Badge';

export interface BusLivePosition {
  bus_id: string;
  bus_code: string;
  immatriculation: string;
  campus: string;
  driver_name: string;
  driver_phone: string;
  route_name: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  bearing: number;
  delay_minutes: number;
  total_capacity: number;
  booked_seats: number;
  occupancy_percentage: number;
  status: 'SCHEDULED' | 'BOARDING' | 'EN_ROUTE' | 'COMPLETED';
  next_stop: string;
  last_ping: string;
}

export interface CampusItem {
  id: string;
  code: string;
  name: string;
  city: string;
  icon: string;
  latitude: number;
  longitude: number;
  zoom: number;
  landmarks?: Array<{ name: string; lat: number; lon: number; type: string }>;
}

interface LiveCampusMapProps {
  buses: BusLivePosition[];
  onSelectBus?: (bus: BusLivePosition) => void;
  selectedBusId?: string;
  selectedCampus?: string;
  onSelectCampus?: (campus: string) => void;
}

const DEFAULT_CAMPUSES: CampusItem[] = [
  { id: 'ALL', code: 'ALL', name: 'Tous les Campus', city: 'Bénin National', icon: 'public', latitude: 7.5, longitude: 2.3, zoom: 8 },
  { id: 'UAC', code: 'UAC', name: 'UAC Abomey-Calavi', city: 'Abomey-Calavi', icon: 'school', latitude: 6.4474, longitude: 2.3557, zoom: 15 },
  { id: 'UP', code: 'UP', name: 'UP Parakou', city: 'Parakou', icon: 'school', latitude: 9.3512, longitude: 2.6288, zoom: 15 },
  { id: 'UNA', code: 'UNA', name: 'UNA Porto-Novo', city: 'Porto-Novo', icon: 'school', latitude: 6.4969, longitude: 2.6289, zoom: 15 },
  { id: 'UNSTIM', code: 'UNSTIM', name: 'UNSTIM Abomey', city: 'Abomey', icon: 'school', latitude: 7.1856, longitude: 1.9912, zoom: 15 },
];

export default function LiveCampusMap({
  buses,
  onSelectBus,
  selectedBusId,
  selectedCampus = 'ALL',
  onSelectCampus,
}: LiveCampusMapProps) {
  const [campuses, setCampuses] = useState<CampusItem[]>(DEFAULT_CAMPUSES);
  const [activeCampus, setActiveCampus] = useState(selectedCampus);
  const [mapMode, setMapMode] = useState<'streets' | 'satellite' | 'osm'>('streets');
  const [activeBus, setActiveBus] = useState<BusLivePosition | null>(
    buses.find((b) => b.bus_id === selectedBusId) || buses[0] || null
  );

  useEffect(() => {
    let isMounted = true;
    const loadDynamicCampuses = async () => {
      try {
        const res = await fetch(ENDPOINTS.CAMPUSES);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && isMounted) {
            const formatted: CampusItem[] = [
              { id: 'ALL', code: 'ALL', name: 'Tous les Campus', city: 'Bénin National', icon: 'public', latitude: 7.5, longitude: 2.3, zoom: 8 },
              ...data.map((c: any) => ({
                id: c.code,
                code: c.code,
                name: `${c.code} ${c.city}`,
                city: c.city,
                icon: 'school',
                latitude: c.latitude || 6.4474,
                longitude: c.longitude || 2.3557,
                zoom: 15,
                landmarks: c.landmarks,
              })),
            ];
            setCampuses(formatted);
          }
        }
      } catch (e) {
        console.warn('Erreur chargement dynamique campus:', e);
      }
    };
    loadDynamicCampuses();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (selectedBusId) {
      const found = buses.find((b) => b.bus_id === selectedBusId);
      if (found) setActiveBus(found);
    } else if (buses.length > 0 && !activeBus) {
      setActiveBus(buses[0]);
    }
  }, [selectedBusId, buses]);

  const filteredBuses = buses.filter((b) => {
    if (activeCampus === 'ALL') return true;
    const target = activeCampus.toUpperCase();
    return (
      (b.campus && b.campus.toUpperCase().includes(target)) ||
      (b.route_name && b.route_name.toUpperCase().includes(target))
    );
  });

  const handleCampusChange = (campusId: string) => {
    setActiveCampus(campusId);
    onSelectCampus?.(campusId);
    const inCampus = buses.find((b) => {
      if (campusId === 'ALL') return true;
      const target = campusId.toUpperCase();
      return (
        (b.campus && b.campus.toUpperCase().includes(target)) ||
        (b.route_name && b.route_name.toUpperCase().includes(target))
      );
    });
    if (inCampus) setActiveBus(inCampus);
  };

  const handleSelect = (b: BusLivePosition) => {
    setActiveBus(b);
    onSelectBus?.(b);
  };

  const currentCampusObj = campuses.find((c) => c.id === activeCampus) || campuses[0];
  const mapCenterLat = activeBus ? activeBus.latitude : currentCampusObj.latitude;
  const mapCenterLon = activeBus ? activeBus.longitude : currentCampusObj.longitude;
  const mapZoom = activeCampus === 'ALL' ? (activeBus ? 14 : 8) : 15;

  // Generate interactive Leaflet / Google Maps HTML payload
  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .bus-marker {
      background: #008751;
      border: 2.5px solid #ffffff;
      color: #ffffff;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 135, 81, 0.45);
      font-size: 14px;
      cursor: pointer;
      position: relative;
    }
    .bus-marker.selected {
      background: #E8112D;
      border-color: #FCD116;
      transform: scale(1.15);
      box-shadow: 0 4px 14px rgba(232, 17, 45, 0.6);
    }
    .pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2px solid #008751;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.9; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .campus-badge {
      background: #004D2E;
      color: #FCD116;
      border: 2px solid #ffffff;
      font-weight: bold;
      border-radius: 12px;
      padding: 3px 8px;
      font-size: 11px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      white-space: nowrap;
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      padding: 0;
      overflow: hidden;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
    }
    .leaflet-popup-content {
      margin: 0;
      padding: 12px;
      font-size: 12px;
      line-height: 1.4;
    }
    .pop-header {
      background: #008751;
      color: white;
      margin: -12px -12px 10px -12px;
      padding: 10px 12px;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .pop-row { margin: 4px 0; display: flex; justify-content: space-between; }
    .pop-label { color: #64748b; font-weight: 500; }
    .pop-val { color: #0f172a; font-weight: 700; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var centerLat = ${mapCenterLat};
    var centerLon = ${mapCenterLon};
    var zoomLevel = ${mapZoom};

    var map = L.map('map', {
      center: [centerLat, centerLon],
      zoom: zoomLevel,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Google Maps & OSM Tiles
    var streetLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '© Google Maps Bénin'
    });

    var satLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '© Google Satellite'
    });

    var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });

    var currentMode = '${mapMode}';
    if (currentMode === 'satellite') {
      satLayer.addTo(map);
    } else if (currentMode === 'osm') {
      osmLayer.addTo(map);
    } else {
      streetLayer.addTo(map);
    }

    // Campuses
    var campuses = ${JSON.stringify(campuses.filter((c) => c.id !== 'ALL'))};
    campuses.forEach(function(c) {
      var icon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div class="campus-badge">🏛️ ' + c.name + '</div>',
        iconSize: [120, 24],
        iconAnchor: [60, 12]
      });
      L.marker([c.latitude, c.longitude], { icon: icon }).addTo(map);
    });

    // Buses
    var buses = ${JSON.stringify(filteredBuses)};
    var selectedBusId = '${activeBus?.bus_id || ''}';

    buses.forEach(function(b) {
      var isSel = (b.bus_id === selectedBusId);
      var icon = L.divIcon({
        className: 'custom-bus-icon',
        html: '<div class="bus-marker ' + (isSel ? 'selected' : '') + '">' +
                '<div class="pulse-ring"></div>' +
                '🚌' +
              '</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      var marker = L.marker([b.latitude, b.longitude], { icon: icon }).addTo(map);
      
      var popupContent = 
        '<div class="pop-header">' +
          '<span>' + b.bus_code + '</span>' +
          '<span style="background: ' + (b.speed_kmh > 0 ? '#10b981' : '#FCD116') + '; color: #000; padding: 2px 6px; border-radius: 6px; font-size: 11px;">' + (b.speed_kmh > 0 ? b.speed_kmh + ' km/h' : 'À l’arrêt') + '</span>' +
        '</div>' +
        '<div class="pop-row"><span class="pop-label">Immatriculation:</span><span class="pop-val">' + b.immatriculation + '</span></div>' +
        '<div class="pop-row"><span class="pop-label">Ligne:</span><span class="pop-val">' + b.route_name + '</span></div>' +
        '<div class="pop-row"><span class="pop-label">Chauffeur:</span><span class="pop-val">' + b.driver_name + ' (' + b.driver_phone + ')</span></div>' +
        '<div class="pop-row"><span class="pop-label">Places:</span><span class="pop-val">' + b.booked_seats + ' / ' + b.total_capacity + ' (' + b.occupancy_percentage + '%)</span></div>' +
        '<div class="pop-row"><span class="pop-label">Prochain arrêt:</span><span class="pop-val">' + b.next_stop + '</span></div>';

      marker.bindPopup(popupContent);
      if (isSel) {
        marker.openPopup();
      }
    });
  </script>
</body>
</html>
`;

  return (
    <View style={styles.container}>
      {/* 1. Campus Filter Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.liveIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveTag}>GOOGLE MAPS & FLOTTE TEMPS RÉEL (BÉNIN)</Text>
          </View>
          <Text style={styles.subTitle}>Suivi géospatial officiel des navettes universitaires</Text>
        </View>

        {/* Map Type Switcher Buttons */}
        <View style={styles.modeSwitcher}>
          <Pressable
            style={[styles.modeBtn, mapMode === 'streets' && styles.modeBtnActive]}
            onPress={() => setMapMode('streets')}
          >
            <Text style={[styles.modeBtnText, mapMode === 'streets' && styles.modeBtnTextActive]}>Plan</Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mapMode === 'satellite' && styles.modeBtnActive]}
            onPress={() => setMapMode('satellite')}
          >
            <Text style={[styles.modeBtnText, mapMode === 'satellite' && styles.modeBtnTextActive]}>Satellite</Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mapMode === 'osm' && styles.modeBtnActive]}
            onPress={() => setMapMode('osm')}
          >
            <Text style={[styles.modeBtnText, mapMode === 'osm' && styles.modeBtnTextActive]}>OSM</Text>
          </Pressable>
        </View>
      </View>

      {/* Campus Selector Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.campusTabs}
      >
        {campuses.map((c) => {
          const active = activeCampus === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => handleCampusChange(c.id)}
              style={[styles.campusChip, active && styles.campusChipActive]}
            >
              <MaterialIcons
                name={c.icon as any}
                size={16}
                color={active ? '#ffffff' : colors.primary}
              />
              <Text style={[styles.campusChipText, active && styles.campusChipTextActive]}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 2. Authentic Interactive Google Maps Layer */}
      <View style={styles.mapCanvas}>
        {Platform.OS === 'web' ? (
          // @ts-ignore - Web iframe rendering with real Google Maps tiles
          <iframe
            srcDoc={mapHtml}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: radius.lg,
            }}
            title="Carte Google Maps Temps Réel"
          />
        ) : (
          <View style={styles.mobileFallback}>
            <MaterialIcons name="map" size={48} color={colors.primary} />
            <Text style={styles.mobileFallbackText}>Google Maps Bénin Connecté</Text>
            <Text style={styles.mobileFallbackSub}>{filteredBuses.length} navettes en mouvement</Text>
          </View>
        )}

        {/* Real-time Telemetry Pill */}
        <View style={styles.liveFleetPill}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveFleetText}>{filteredBuses.length} navettes actives en direct</Text>
        </View>
      </View>

      {/* 3. Bus Selector Thumbnails */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.busThumbRow}
      >
        {filteredBuses.map((bus) => {
          const isSelected = activeBus?.bus_id === bus.bus_id;
          return (
            <Pressable
              key={bus.bus_id}
              style={[styles.busThumbCard, isSelected && styles.busThumbCardSelected]}
              onPress={() => handleSelect(bus)}
            >
              <View style={[styles.busThumbIcon, isSelected && styles.busThumbIconSelected]}>
                <MaterialIcons name="directions-bus" size={16} color={isSelected ? '#ffffff' : colors.primary} />
              </View>
              <View>
                <Text style={[styles.busThumbTitle, isSelected && styles.busThumbTitleSelected]}>
                  {bus.bus_code}
                </Text>
                <Text style={styles.busThumbSub}>{bus.speed_kmh > 0 ? `${bus.speed_kmh} km/h` : 'Arrêt'}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 4. Selected Bus Detail Drawer */}
      {activeBus && (
        <View style={styles.busDetailCard}>
          <View style={styles.busDetailHeader}>
            <View style={styles.busIconBox}>
              <MaterialIcons name="directions-bus" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={styles.busDetailTitle}>{activeBus.bus_code}</Text>
                <Badge
                  label={activeBus.status === 'EN_ROUTE' ? 'En Route' : 'À l\'arrêt'}
                  variant={activeBus.status === 'EN_ROUTE' ? 'success' : 'warning'}
                />
              </View>
              <Text style={styles.busDetailSub}>{activeBus.immatriculation} • {activeBus.campus}</Text>
            </View>
            <View style={styles.speedBox}>
              <Text style={styles.speedVal}>{activeBus.speed_kmh}</Text>
              <Text style={styles.speedUnit}>km/h</Text>
            </View>
          </View>

          <View style={styles.busDivider} />

          {/* Route & Driver Details */}
          <View style={styles.detailGrid}>
            <View style={styles.gridCol}>
              <Text style={styles.gridLabel}>LIGNE DE TRANSPORT</Text>
              <Text style={styles.gridVal} numberOfLines={1}>{activeBus.route_name}</Text>
              <Text style={styles.gridSub}>Prochain arrêt : <Text style={{ fontWeight: '700' }}>{activeBus.next_stop}</Text></Text>
            </View>

            <View style={styles.gridCol}>
              <Text style={styles.gridLabel}>CHAUFFEUR ASSIGNÉ</Text>
              <Text style={styles.gridVal}>{activeBus.driver_name}</Text>
              <Text style={styles.gridSub}>{activeBus.driver_phone}</Text>
            </View>
          </View>

          {/* Capacity Progress Bar */}
          <View style={styles.capacitySection}>
            <View style={styles.capacityHeader}>
              <Text style={styles.capacityTitle}>Taux de remplissage passagers</Text>
              <Text style={styles.capacityCount}>
                <Text style={{ fontWeight: '700', color: colors.primary }}>{activeBus.booked_seats}</Text> / {activeBus.total_capacity} places ({activeBus.occupancy_percentage}%)
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${activeBus.occupancy_percentage}%`,
                    backgroundColor:
                      activeBus.occupancy_percentage > 85 ? colors.error : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  titleRow: {
    flex: 1,
    minWidth: 200,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  liveTag: {
    ...typography.labelCaps,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  campusTabs: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  campusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  campusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  campusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  campusChipTextActive: {
    color: '#ffffff',
  },
  mapCanvas: {
    height: 320,
    backgroundColor: '#e2e8f0',
    borderRadius: radius.lg,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  mobileFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  mobileFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  mobileFallbackSub: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  liveFleetPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 77, 46, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#FCD116',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  liveFleetText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  busThumbRow: {
    gap: spacing.xs,
    paddingVertical: 4,
  },
  busThumbCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  busThumbCardSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  busThumbIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busThumbIconSelected: {
    backgroundColor: colors.primary,
  },
  busThumbTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  busThumbTitleSelected: {
    color: '#ffffff',
  },
  busThumbSub: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  busDetailCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  busDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  busIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busDetailTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  busDetailSub: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  speedBox: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  speedVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  speedUnit: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  busDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    opacity: 0.6,
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.outline,
    marginBottom: 2,
  },
  gridVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  gridSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  capacitySection: {
    gap: 4,
    marginTop: 4,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  capacityCount: {
    fontSize: 11,
    color: colors.onSurface,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
