import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS } from '../../config/api';

export default function ControllerHubScreen({ navigation }: any) {
  const { user, token, logout } = useAuth();
  const { showToast } = useNotifications();
  const controllerName = user ? `${user.first_name} ${user.last_name}` : 'Contrôleur CROUS';

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
      console.warn('Error fetching controller active trip:', e);
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

  const controllerKyc = (activeTrip as any).kyc_status || user?.kyc_status || 'APPROVED';
  const isKycApproved = controllerKyc === 'APPROVED';

  const handleScanPress = () => {
    if (!isKycApproved) {
      showToast({
        title: 'Habilitation Requise',
        message: 'Votre badge doit être validé par le CROUS pour effectuer des contrôles.',
        type: 'warning',
        category: 'KYC',
      });
      navigation.navigate('DriverProfile');
      return;
    }
    navigation.navigate('Scan');
  };

  const handleFraudPress = () => {
    if (!isKycApproved) {
      showToast({
        title: 'Habilitation Requise',
        message: 'Votre badge doit être validé par le CROUS pour déclarer des fraudes.',
        type: 'warning',
        category: 'KYC',
      });
      navigation.navigate('DriverProfile');
      return;
    }
    navigation.navigate('ReportFraud');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Top Controller Header */}
        <View style={styles.topBar}>
          <Pressable style={styles.controllerInfo} onPress={() => navigation.navigate('DriverProfile')}>
            <View style={styles.controllerAvatar}>
              <MaterialIcons name="security" size={24} color={colors.onPrimary} />
            </View>
            <View>
              <Text style={styles.controllerName}>{controllerName}</Text>
              <Text style={styles.controllerRole}>Agent de Contrôle • {user?.matricule_uac || 'CTR-2024-001'}</Text>
            </View>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
            <Pressable
              style={[styles.profileBtn, isKycApproved ? { borderColor: '#0284c7' } : { borderColor: '#d97706' }]}
              onPress={() => navigation.navigate('DriverProfile')}
            >
              <MaterialIcons
                name={isKycApproved ? 'verified' : 'pending-actions'}
                size={18}
                color={isKycApproved ? '#0284c7' : '#d97706'}
              />
              <Text style={[styles.profileBtnText, { color: isKycApproved ? '#0284c7' : '#d97706' }]}>
                {isKycApproved ? 'Badge Validé' : 'Dossier'}
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
                {controllerKyc === 'PENDING' ? 'Badge d’Agent en cours d’examen' : 'Habilitation CROUS Requise'}
              </Text>
              <Text style={styles.kycWarningText}>
                {controllerKyc === 'PENDING'
                  ? 'Vos pièces sont en cours de vérification par l’administration CROUS. Le scanner sera débloqué dès approbation.'
                  : 'Veuillez téléverser votre Badge CROUS et CIP pour débloquer les outils d’inspection.'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#b45309" />
          </Pressable>
        )}

        {/* Supervised Trip Card */}
        <Card style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <View>
              <Text style={styles.badgeLine}>NAVETTE SOUS CONTRÔLE</Text>
              <Text style={styles.routeTitle}>{activeTrip.route_title}</Text>
              <View style={styles.rowCenter}>
                <MaterialIcons name="directions-bus" size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.hint}> {activeTrip.bus_code} • Prochain arrêt : {activeTrip.next_stop_name}</Text>
              </View>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>À bord</Text>
            </View>
          </View>
        </Card>

        {/* Inspection Stats */}
        <View style={styles.bento}>
          <Card style={styles.capacityCard} floating>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Passagers à bord</Text>
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
                {isKycApproved ? 'Scanner & Contrôler' : 'Scanner (Verrouillé)'}
              </Text>
            </Pressable>
          </Card>

          <View style={styles.actionsCol}>
            <Pressable
              style={[styles.fraudBtn, !isKycApproved && { opacity: 0.6 }]}
              onPress={handleFraudPress}
            >
              <MaterialIcons name="gavel" size={26} color="#ffffff" />
              <Text style={styles.fraudBtnText}>Signaler Fraude</Text>
            </Pressable>
            <View style={styles.smallRow}>
              <Pressable style={styles.smallBtn} onPress={() => navigation.navigate('Users')}>
                <MaterialIcons name="people" size={24} color={colors.primary} />
                <Text style={styles.smallBtnLabel}>Manifeste</Text>
              </Pressable>
              <Pressable style={styles.smallBtn} onPress={() => navigation.navigate('Alerts')}>
                <MaterialIcons name="notifications" size={24} color={colors.onSurfaceVariant} />
                <Text style={styles.smallBtnLabel}>Alertes</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Quick Inspection Guide */}
        <Card style={styles.guideCard}>
          <View style={styles.guideHeader}>
            <MaterialIcons name="verified-user" size={20} color={colors.primary} />
            <Text style={styles.guideTitle}>Règles de Contrôle CROUS</Text>
          </View>
          <View style={styles.guideStep}>
            <Text style={styles.guideStepNum}>1</Text>
            <Text style={styles.guideStepText}>Scannez le QR Pass de chaque étudiant à la montée ou à bord.</Text>
          </View>
          <View style={styles.guideStep}>
            <Text style={styles.guideStepNum}>2</Text>
            <Text style={styles.guideStepText}>En cas de panne de batterie, recherchez le passager par son matricule ou téléphone.</Text>
          </View>
          <View style={styles.guideStep}>
            <Text style={styles.guideStepNum}>3</Text>
            <Text style={styles.guideStepText}>Tout billet réutilisé ou invalide doit être signalé immédiatement.</Text>
          </View>
        </Card>
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
  controllerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  controllerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controllerName: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  controllerRole: { ...typography.bodySm, color: colors.onSurfaceVariant },
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
  routeCard: { gap: spacing.xs },
  badgeLine: { ...typography.labelCaps, color: '#0284c7', fontSize: 10, fontWeight: '700' },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeTitle: { ...typography.headlineSm, color: colors.onSurface, marginTop: 2 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  hint: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0284c7' },
  liveText: { ...typography.labelCaps, color: '#0369a1' },
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
  progressFill: { height: '100%', backgroundColor: '#0284c7', borderRadius: 4 },
  boardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#0284c7',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  boardBtnText: { ...typography.labelCaps, color: '#ffffff', fontSize: 11, fontWeight: '700' },
  actionsCol: { flex: 0.9, gap: spacing.sm },
  fraudBtn: {
    backgroundColor: '#dc2626',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 110,
  },
  fraudBtnText: {
    ...typography.headlineSm,
    fontSize: 13,
    color: '#ffffff',
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
  guideCard: { padding: spacing.md, gap: spacing.sm },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  guideTitle: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: 4 },
  guideStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerHigh,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  guideStepText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
});
