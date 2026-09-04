import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS } from '../../config/api';

export default function DriverHubScreen({ navigation }: any) {
  const { user, token, logout } = useAuth();
  const { showToast } = useNotifications();
  const isController = user?.role === 'CONTROLLER';
  const driverName = user
    ? `${user.first_name} ${user.last_name}`
    : isController
    ? 'Contrôleur CROUS'
    : 'Chauffeur CROUS';

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
    route_title: 'Campus Express Ligne 4',
    next_stop_name: 'Arrêt Faculté des Sciences',
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

  const driverKyc = (activeTrip as any).kyc_status || user?.kyc_status || 'APPROVED';
  const isKycApproved = driverKyc === 'APPROVED';

  const handleScanPress = () => {
    if (!isKycApproved) {
      showToast({
        title: 'Habilitation Requise',
        message: 'Votre dossier doit être validé par le CROUS pour utiliser le scanner.',
        type: 'warning',
        category: 'KYC',
      });
      navigation.navigate('DriverProfile');
      return;
    }
    navigation.navigate('Scan');
  };

  const handleReportDelayPress = () => {
    if (!isKycApproved) {
      showToast({
        title: 'Habilitation Requise',
        message: 'Votre dossier doit être validé par le CROUS pour diffuser des alertes.',
        type: 'warning',
        category: 'KYC',
      });
      navigation.navigate('DriverProfile');
      return;
    }
    navigation.navigate('ReportDelay');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Top Driver Header */}
        <View style={styles.topBar}>
          <Pressable style={styles.driverInfo} onPress={() => navigation.navigate('DriverProfile')}>
            <View style={[styles.driverAvatar, isController && { backgroundColor: '#0284c7' }]}>
              <MaterialIcons
                name={isController ? 'security' : 'airline-seat-recline-normal'}
                size={24}
                color={colors.onPrimary}
              />
            </View>
            <View>
              <Text style={styles.driverName}>{driverName}</Text>
              <Text style={styles.driverRole}>{activeTrip.bus_code} • {activeTrip.route_title.split(' ')[0]}</Text>
            </View>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
            <Pressable
              style={[styles.profileBtn, isKycApproved ? { borderColor: colors.primary } : { borderColor: '#d97706' }]}
              onPress={() => navigation.navigate('DriverProfile')}
            >
              <MaterialIcons
                name={isKycApproved ? 'verified-user' : 'pending-actions'}
                size={18}
                color={isKycApproved ? colors.primary : '#d97706'}
              />
              <Text style={[styles.profileBtnText, { color: isKycApproved ? colors.primary : '#d97706' }]}>
                {isKycApproved ? 'Profil Validé' : 'Dossier'}
              </Text>
            </Pressable>

            <Pressable style={styles.logoutBtn} onPress={logout}>
              <MaterialIcons name="logout" size={18} color={colors.error} />
            </Pressable>
          </View>
        </View>

        {/* KYC Compliance Alert Banner if NOT approved */}
        {!isKycApproved && (
          <Pressable style={styles.kycWarningBanner} onPress={() => navigation.navigate('DriverProfile')}>
            <MaterialIcons name="warning" size={24} color="#b45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.kycWarningTitle}>
                {driverKyc === 'PENDING'
                  ? isController ? 'Dossier Contrôleur en examen' : 'Dossier Chauffeur en cours d’examen'
                  : 'Habilitation CROUS Requise'}
              </Text>
              <Text style={styles.kycWarningText}>
                {driverKyc === 'PENDING'
                  ? 'Vos justificatifs sont en cours d’examen par le service des transports CROUS. Le scan sera débloqué dès approbation.'
                  : 'Veuillez téléverser vos pièces justificatives pour débloquer les outils de contrôle et de conduite.'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#b45309" />
          </Pressable>
        )}

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
            <Pressable
              style={[styles.boardBtn, !isKycApproved && { opacity: 0.6 }]}
              onPress={handleScanPress}
            >
              <MaterialIcons name="qr-code-scanner" size={20} color={colors.onTertiaryContainer} />
              <Text style={styles.boardBtnText}>
                {isKycApproved ? 'Scanner les Billets' : 'Scanner (Verrouillé)'}
              </Text>
            </Pressable>
          </Card>

          <View style={styles.actionsCol}>
            <Pressable
              style={[styles.reportBtn, !isKycApproved && { opacity: 0.6 }]}
              onPress={handleReportDelayPress}
            >
              <MaterialIcons name="warning" size={30} color={colors.onError} />
              <Text style={styles.reportBtnText}>
                {activeTrip.delay_minutes > 0 ? `Retard Signalé (+${activeTrip.delay_minutes} min)` : 'Signaler un Retard'}
              </Text>
            </Pressable>
            <View style={styles.smallRow}>
              <Pressable style={styles.smallBtn} onPress={() => navigation.navigate('Users')}>
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
    paddingVertical: spacing.xs,
  },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  driverRole: { ...typography.bodySm, color: colors.onSurfaceVariant },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surfaceContainer,
  },
  profileBtnText: { ...typography.labelCaps, fontSize: 11, fontWeight: '700' },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surfaceContainer,
  },
  kycWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  kycWarningTitle: { ...typography.headlineSm, fontSize: 14, color: '#92400e', fontWeight: '700' },
  kycWarningText: { ...typography.bodySm, color: '#92400e', marginTop: 2 },
  routeCard: { gap: spacing.sm },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeTitle: { ...typography.headlineSm, color: colors.onSurface },
  rowCenter: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  hint: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  liveText: { ...typography.labelCaps, color: colors.onPrimaryFixed },
  mapPreview: {
    height: 120,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  mapGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  mapCell: {
    width: '33.33%',
    height: 40,
    borderWidth: 0.5,
    borderColor: colors.outlineVariant,
    opacity: 0.4,
  },
  mapRouteLine: {
    width: '80%',
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    transform: [{ rotate: '-6deg' }],
  },
  bento: { flexDirection: 'row', gap: spacing.md },
  capacityCard: { flex: 1.1, padding: spacing.md, gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...typography.labelCaps, color: colors.onSurfaceVariant },
  capacityRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  capacityNum: { ...typography.headlineLg, fontSize: 36, color: colors.onSurface },
  capacityTotal: { ...typography.headlineSm, color: colors.onSurfaceVariant },
  progressTrack: {
    height: 8,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  boardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.tertiaryFixedDim,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  boardBtnText: { ...typography.labelCaps, color: colors.onTertiaryContainer, fontSize: 11, fontWeight: '700' },
  actionsCol: { flex: 0.9, gap: spacing.sm },
  reportBtn: {
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 110,
  },
  reportBtnText: {
    ...typography.headlineSm,
    fontSize: 13,
    color: colors.onErrorContainer,
    textAlign: 'center',
    fontWeight: '700',
  },
  smallRow: { flexDirection: 'row', gap: spacing.sm },
  smallBtn: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  smallBtnLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 10 },
});
