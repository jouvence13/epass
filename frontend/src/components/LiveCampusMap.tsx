import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
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
  latitude?: number;
  longitude?: number;
  landmarks?: Array<{ name: string; lat: number; lon: number; type: string }>;
}

interface LiveCampusMapProps {
  buses: BusLivePosition[];
  onSelectBus?: (bus: BusLivePosition) => void;
  selectedBusId?: string;
  selectedCampus?: string;
  onSelectCampus?: (campus: string) => void;
}

export default function LiveCampusMap({
  buses,
  onSelectBus,
  selectedBusId,
  selectedCampus = 'ALL',
  onSelectCampus,
}: LiveCampusMapProps) {
  const [campuses, setCampuses] = useState<CampusItem[]>([
    { id: 'ALL', code: 'ALL', name: 'Tous les Campus', city: 'Bénin', icon: 'public' },
    { id: 'UAC', code: 'UAC', name: 'UAC Abomey-Calavi', city: 'Abomey-Calavi', icon: 'school' },
    { id: 'UP', code: 'UP', name: 'UP Parakou', city: 'Parakou', icon: 'school' },
    { id: 'UNA', code: 'UNA', name: 'UNA Porto-Novo', city: 'Porto-Novo', icon: 'school' },
  ]);
  const [activeCampus, setActiveCampus] = useState(selectedCampus);
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
              { id: 'ALL', code: 'ALL', name: 'Tous les Campus', city: 'National', icon: 'public' },
              ...data.map((c: any) => ({
                id: c.code,
                code: c.code,
                name: `${c.code} ${c.city}`,
                city: c.city,
                icon: 'school',
                latitude: c.latitude,
                longitude: c.longitude,
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

  const selectedCampusObj = campuses.find((c) => c.id === activeCampus);
  const dynamicLandmarks = selectedCampusObj?.landmarks && selectedCampusObj.landmarks.length > 0
    ? selectedCampusObj.landmarks
    : [
        { name: 'Hub Universitaire', lat: 6.4474, lon: 2.3557, type: 'hub' },
        { name: 'Terminus Ville', lat: 6.4000, lon: 2.3400, type: 'stop' },
      ];

  return (
    <View style={styles.container}>
      {/* 1. Campus Filter Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.liveIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveTag}>CARTE SATELLITE & FLOTTE EN DIRECT</Text>
          </View>
          <Text style={styles.subTitle}>Suivi géospatial des navettes et appareils</Text>
        </View>
      </View>

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

      {/* 2. Interactive Styled Map Canvas */}
      <View style={styles.mapCanvas}>
        {/* Background Grid & Roads Pattern */}
        <View style={styles.mapBackground}>
          <View style={styles.roadLineH} />
          <View style={[styles.roadLineH, { top: '65%' }]} />
          <View style={styles.roadLineV} />
          <View style={[styles.roadLineV, { left: '70%' }]} />
          <View style={styles.campusZone}>
            <MaterialIcons name="account-balance" size={24} color="rgba(0,111,107,0.15)" />
            <Text style={styles.campusZoneText}>
              {selectedCampusObj ? `Zone ${selectedCampusObj.name}` : `Zone Campus ${activeCampus}`}
            </Text>
          </View>
        </View>

        {/* Dynamic Campus Landmark Hubs */}
        {dynamicLandmarks.map((lm, lIdx) => {
          const lTop = lIdx === 0 ? '25%' : lIdx === 1 ? '70%' : lIdx === 2 ? '35%' : '60%';
          const lLeft = lIdx === 0 ? '20%' : lIdx === 1 ? '68%' : lIdx === 2 ? '80%' : '15%';
          const isStop = lm.type === 'stop';
          return (
            <View key={`${lm.name}-${lIdx}`} style={[styles.landmarkPin, { top: lTop as any, left: lLeft as any }]}>
              <View style={[styles.landmarkDot, isStop && { backgroundColor: '#d97706' }]} />
              <Text style={styles.landmarkLabel}>{lm.name}</Text>
            </View>
          );
        })}

        {/* Bus Markers on Map */}
        {filteredBuses.map((bus, idx) => {
          const isSelected = activeBus?.bus_id === bus.bus_id;
          // Dynamic positions for demonstration in canvas
          const topPos = idx === 0 ? '40%' : idx === 1 ? '55%' : idx === 2 ? '30%' : '65%';
          const leftPos = idx === 0 ? '38%' : idx === 1 ? '60%' : idx === 2 ? '75%' : '28%';

          return (
            <Pressable
              key={bus.bus_id}
              style={[
                styles.busMarker,
                { top: topPos as any, left: leftPos as any },
                isSelected && styles.busMarkerSelected,
              ]}
              onPress={() => handleSelect(bus)}
            >
              <View style={[styles.busMarkerIcon, isSelected && styles.busMarkerIconSelected]}>
                <MaterialIcons name="directions-bus" size={18} color="#ffffff" />
              </View>
              <View style={styles.busMarkerBadge}>
                <Text style={styles.busMarkerText}>{bus.bus_code.replace('Bus Campus ', '')}</Text>
                <View style={[styles.statusDot, { backgroundColor: bus.speed_kmh > 0 ? '#10b981' : '#f59e0b' }]} />
              </View>
            </Pressable>
          );
        })}

        {/* Map Floating Controls */}
        <View style={styles.mapControls}>
          <Pressable style={styles.mapCtrlBtn}>
            <MaterialIcons name="my-location" size={18} color={colors.onSurface} />
          </Pressable>
          <Pressable style={styles.mapCtrlBtn}>
            <MaterialIcons name="layers" size={18} color={colors.onSurface} />
          </Pressable>
        </View>

        {/* Real-time Telemetry Pill */}
        <View style={styles.liveFleetPill}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveFleetText}>{filteredBuses.length} navettes actives en temps réel</Text>
        </View>
      </View>

      {/* 3. Selected Bus Detail Drawer */}
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
  },
  titleRow: {
    flex: 1,
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
  campusTabs: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  campusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
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
    height: 240,
    backgroundColor: '#1b2a32',
    borderRadius: radius.lg,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#162329',
  },
  roadLineH: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#263b45',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roadLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '35%',
    width: 12,
    backgroundColor: '#263b45',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  campusZone: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    width: 140,
    height: 80,
    backgroundColor: 'rgba(0,111,107,0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,111,107,0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  campusZoneText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryFixed,
    textTransform: 'uppercase',
  },
  landmarkPin: {
    position: 'absolute',
    alignItems: 'center',
    gap: 2,
  },
  landmarkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  landmarkLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  busMarker: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  busMarkerSelected: {
    zIndex: 10,
    transform: [{ translateX: -20 }, { translateY: -20 }, { scale: 1.15 }],
  },
  busMarkerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  busMarkerIconSelected: {
    backgroundColor: '#d97706',
  },
  busMarkerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginTop: 2,
  },
  busMarkerText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  mapControls: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    gap: spacing.xs,
  },
  mapCtrlBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  liveFleetPill: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  liveFleetText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  busDetailCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
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
    marginTop: 2,
  },
  speedBox: {
    alignItems: 'flex-end',
  },
  speedVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  speedUnit: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  busDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gridCol: {
    flex: 1,
    gap: 2,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  gridVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  gridSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  capacitySection: {
    gap: 4,
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
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
});
