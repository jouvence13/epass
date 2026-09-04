import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { ENDPOINTS } from '../../config/api';

export default function DriverHubScreen({ navigation }: any) {
  const { user, token, logout } = useAuth();
  const driverName = user ? `${user.first_name} ${user.last_name}` : 'Chauffeur CROUS';

  const [activeTrip, setActiveTrip] = useState<{
    route_title: string;
    next_stop_name: string;
    next_stop_eta_minutes: number;
    capacity_num: number;
    capacity_total: number;
    capacity_percentage: number;
    bus_code: string;
    delay_minutes: number;
  }>({
    route_title: 'Campus Express Route 4',
    next_stop_name: 'Science Block',
    next_stop_eta_minutes: 5,
    capacity_num: 32,
    capacity_total: 50,
    capacity_percentage: 64,
    bus_code: 'Bus #402',
    delay_minutes: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchActiveTrip = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.DRIVER_ACTIVE_TRIP, {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.route_title) {
          setActiveTrip({
            route_title: data.route_title,
            next_stop_name: data.next_stop_name || 'Prochain Arrêt',
            next_stop_eta_minutes: data.next_stop_eta_minutes ?? 5,
            capacity_num: data.capacity_num ?? 32,
            capacity_total: data.capacity_total ?? 50,
            capacity_percentage: data.capacity_percentage ?? 64,
            bus_code: data.bus_code || 'Bus CROUS',
            delay_minutes: data.delay_minutes ?? 0,
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching driver active trip:', e);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchActiveTrip();
  }, [fetchActiveTrip]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveTrip();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Top Driver Header */}
        <View style={styles.topBar}>
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <MaterialIcons name="local-shipping" size={24} color={colors.onPrimary} />
            </View>
            <View>
              <Text style={styles.driverName}>{driverName}</Text>
              <Text style={styles.driverRole}>{activeTrip.bus_code} • {activeTrip.route_title.split(' ')[0]}</Text>
            </View>
          </View>

          <Pressable style={styles.logoutBtn} onPress={logout}>
            <MaterialIcons name="logout" size={20} color={colors.error} />
            <Text style={styles.logoutBtnText}>Déconnexion</Text>
          </Pressable>
        </View>

        <Card style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <View>
              <Text style={styles.routeTitle}>{activeTrip.route_title}</Text>
              <View style={styles.rowCenter}>
                <MaterialIcons name="schedule" size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.hint}>
                  {' '}Prochain arrêt dans {activeTrip.next_stop_eta_minutes} min : {activeTrip.next_stop_name}
                </Text>
              </View>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>En direct</Text>
            </View>
          </View>
          <View style={styles.mapPreview}>
            <View style={[StyleSheet.absoluteFill, styles.mapGrid]}>
              {Array.from({ length: 18 }).map((_, i) => (
                <View key={i} style={styles.mapCell} />
              ))}
            </View>
            <View style={styles.mapRouteLine} />
          </View>
        </Card>

        <View style={styles.bento}>
          <Card style={styles.capacityCard} floating>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Capacité Passagers</Text>
              <MaterialIcons name="group" size={20} color={colors.outline} />
            </View>
            <View style={styles.capacityRow}>
              <Text style={styles.capacityNum}>{activeTrip.capacity_num}</Text>
              <Text style={styles.capacityTotal}>/{activeTrip.capacity_total}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${activeTrip.capacity_percentage}%` }]} />
            </View>
            <Pressable style={styles.boardBtn} onPress={() => navigation.navigate('Scan')}>
              <MaterialIcons name="qr-code-scanner" size={20} color={colors.onTertiaryContainer} />
              <Text style={styles.boardBtnText}>Scanner les Billets</Text>
            </Pressable>
          </Card>

          <View style={styles.actionsCol}>
            <Pressable style={styles.reportBtn} onPress={() => navigation.navigate('ReportDelay')}>
              <MaterialIcons name="warning" size={30} color={colors.onError} />
              <Text style={styles.reportBtnText}>
                {activeTrip.delay_minutes > 0 ? `Retard Signalé (+${activeTrip.delay_minutes} min)` : 'Signaler un Retard / Bouchon'}
              </Text>
            </Pressable>
            <View style={styles.smallRow}>
              <Pressable style={styles.smallBtn} onPress={() => navigation.navigate('Passengers')}>
                <MaterialIcons name="people" size={26} color={colors.primary} />
                <Text style={styles.smallBtnLabel}>Passagers</Text>
              </Pressable>
              <Pressable style={styles.smallBtn} onPress={() => navigation.navigate('Alerts')}>
                <MaterialIcons name="notifications" size={26} color={colors.onSurfaceVariant} />
                <Text style={styles.smallBtnLabel}>Alertes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  driverRole: { ...typography.bodySm, color: colors.onSurfaceVariant },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutBtnText: { ...typography.labelCaps, color: colors.error, fontSize: 12 },
  routeCard: { gap: spacing.md, borderWidth: 1, borderColor: 'rgba(115,119,128,0.3)' },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeTitle: { ...typography.headlineMd, fontSize: 20, color: colors.primary },
  rowCenter: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  hint: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  liveText: { ...typography.labelCaps, color: colors.onSurfaceVariant },
  mapPreview: { height: 160, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceContainerHigh },
  mapGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  mapCell: { width: '25%', height: '33.3%', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.surfaceDim },
  mapRouteLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '50%',
    height: 4,
    backgroundColor: colors.primaryFixedDim,
    borderRadius: 2,
    transform: [{ rotate: '4deg' }],
  },
  bento: { gap: spacing.md },
  capacityCard: { alignItems: 'stretch', borderWidth: 1, borderColor: 'rgba(115,119,128,0.3)' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...typography.headlineSm, color: colors.primary },
  capacityRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingVertical: spacing.md },
  capacityNum: { ...typography.displayLg, color: colors.primary },
  capacityTotal: { ...typography.headlineMd, color: colors.outline, marginBottom: 4 },
  progressTrack: { height: 10, backgroundColor: colors.surfaceContainer, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.secondary, borderRadius: 5 },
  boardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.tertiaryFixedDim,
    borderRadius: radius.md,
    height: 52,
    marginTop: spacing.md,
  },
  boardBtnText: { ...typography.headlineSm, fontSize: 16, color: colors.onTertiaryContainer },
  actionsCol: { gap: spacing.md },
  reportBtn: {
    backgroundColor: colors.error,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  reportBtnText: { ...typography.headlineSm, fontSize: 16, color: colors.onError },
  smallRow: { flexDirection: 'row', gap: spacing.md },
  smallBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  smallBtnLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant },
});
