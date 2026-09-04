import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS } from '../../config/api';

export default function AdminDashboardScreen({ navigation }: any) {
  const { user, token, logout } = useAuth();
  const { showToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [audit, setAudit] = useState<{
    total_revenue_xof: number;
    total_tickets_issued: number;
    total_tickets_validated: number;
    total_tickets_recycled: number;
    currency: string;
  }>({
    total_revenue_xof: 125000,
    total_tickets_issued: 1250,
    total_tickets_validated: 1180,
    total_tickets_recycled: 45,
    currency: 'XOF (FCFA)',
  });

  const [pendingKycCount, setPendingKycCount] = useState(0);
  const [fleetCount, setFleetCount] = useState(4);
  const [activeTripsCount, setActiveTripsCount] = useState(2);

  const fetchDashboardData = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 1. Audit Financier
      const auditRes = await fetch(ENDPOINTS.ADMIN_AUDIT_FIN, { credentials: 'include', headers });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAudit(auditData);
      }

      // 2. Pending KYC count
      const kycRes = await fetch(ENDPOINTS.ADMIN_KYC_PENDING, { credentials: 'include', headers });
      if (kycRes.ok) {
        const kycData = await kycRes.json();
        if (Array.isArray(kycData)) {
          setPendingKycCount(kycData.length);
        }
      }

      // 3. Fleet buses
      const fleetRes = await fetch(ENDPOINTS.ADMIN_FLEET, { credentials: 'include', headers });
      if (fleetRes.ok) {
        const fleetData = await fleetRes.json();
        if (Array.isArray(fleetData)) {
          setFleetCount(fleetData.length);
        }
      }

      // 4. Active Trips
      const tripsRes = await fetch(ENDPOINTS.ADMIN_TRIPS, { credentials: 'include', headers });
      if (tripsRes.ok) {
        const tripsData = await tripsRes.json();
        if (Array.isArray(tripsData)) {
          setActiveTripsCount(tripsData.length);
        }
      }
    } catch (e) {
      console.warn('Error fetching admin dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const isSuperAdmin = user?.role === 'SUPERADMIN';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Top Header */}
        <View style={styles.topBar}>
          <View style={styles.adminInfo}>
            <View style={styles.adminAvatar}>
              <MaterialIcons name="admin-panel-settings" size={26} color={colors.onPrimary} />
            </View>
            <View>
              <Text style={styles.adminName}>{user?.first_name} {user?.last_name}</Text>
              <Text style={styles.adminRole}>
                {isSuperAdmin ? 'Super Administrateur CROUS' : 'Direction des Transports CROUS'}
              </Text>
            </View>
          </View>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <MaterialIcons name="logout" size={18} color={colors.error} />
          </Pressable>
        </View>

        {/* Global Financial KPI Card */}
        <Card style={styles.financialCard} floating>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.kpiEyebrow}>RECETTES TOTALES ENCAISSÉES</Text>
              <Text style={styles.revenueAmount}>
                {audit.total_revenue_xof.toLocaleString('fr-FR')} <Text style={styles.currency}>FCFA</Text>
              </Text>
            </View>
            <View style={styles.kpiIconBox}>
              <MaterialIcons name="account-balance-wallet" size={28} color={colors.primary} />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{audit.total_tickets_issued}</Text>
              <Text style={styles.metricLbl}>Billets Émis</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.primary }]}>{audit.total_tickets_validated}</Text>
              <Text style={styles.metricLbl}>Compostés</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.secondary }]}>{audit.total_tickets_recycled}</Text>
              <Text style={styles.metricLbl}>Recyclés (J+7)</Text>
            </View>
          </View>
        </Card>

        {/* Operational Highlights */}
        <View style={styles.bentoRow}>
          {/* Pending KYC Action Card */}
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('Moderation')}
          >
            <View style={styles.actionCardTop}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#fef3c7' }]}>
                <MaterialIcons name="folder-shared" size={22} color="#b45309" />
              </View>
              {pendingKycCount > 0 && (
                <View style={styles.urgentPill}>
                  <Text style={styles.urgentPillText}>{pendingKycCount} en attente</Text>
                </View>
              )}
            </View>
            <Text style={styles.actionCardTitle}>Modération KYC</Text>
            <Text style={styles.actionCardSub}>Vérifier les dossiers étudiants & staff</Text>
          </Pressable>

          {/* Fleet Overview Card */}
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('Fleet')}
          >
            <View style={styles.actionCardTop}>
              <View style={[styles.actionIconCircle, { backgroundColor: colors.primaryFixed }]}>
                <MaterialIcons name="directions-bus" size={22} color={colors.primary} />
              </View>
              <View style={styles.neutralPill}>
                <Text style={styles.neutralPillText}>{fleetCount} bus</Text>
              </View>
            </View>
            <Text style={styles.actionCardTitle}>Flotte & Lignes</Text>
            <Text style={styles.actionCardSub}>Gérer les navettes et trajets</Text>
          </Pressable>
        </View>

        {/* Staff & User Management Shortcut */}
        <Card style={styles.staffCard}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MaterialIcons name="badge" size={24} color={colors.primary} />
              <View>
                <Text style={styles.staffCardTitle}>Gestion du Personnel & Étudiants</Text>
                <Text style={styles.staffCardSub}>Enrôler des chauffeurs, contrôleurs et admins</Text>
              </View>
            </View>
            <Pressable
              style={styles.staffBtn}
              onPress={() => navigation.navigate('Users')}
            >
              <MaterialIcons name="person-add" size={18} color="#ffffff" />
              <Text style={styles.staffBtnText}>Gérer</Text>
            </Pressable>
          </View>
        </Card>

        {/* Subvention CROUS Banner */}
        <Card style={styles.subventionCard}>
          <View style={styles.subventionHeader}>
            <MaterialIcons name="verified" size={20} color={colors.primary} />
            <Text style={styles.subventionTitle}>Subvention Universitaire Active</Text>
          </View>
          <Text style={styles.subventionText}>
            Tarif étudiant subventionné fixé à <Text style={{ fontWeight: '700' }}>100 FCFA / trajet</Text>. Les remboursements et la redistribution vers les opérateurs (MTN, Moov, Celtiis) sont synchronisés en temps réel.
          </Text>
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
  adminInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminName: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  adminRole: { ...typography.bodySm, color: colors.onSurfaceVariant },
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
  financialCard: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.surfaceContainer },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiEyebrow: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 10 },
  revenueAmount: { ...typography.headlineLg, fontSize: 30, color: colors.onSurface, marginTop: 2, fontWeight: '800' },
  currency: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  kpiIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.outlineVariant },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  metricItem: { alignItems: 'center' },
  metricVal: { ...typography.headlineSm, fontSize: 20, color: colors.onSurface, fontWeight: '700' },
  metricLbl: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 2 },
  bentoRow: { flexDirection: 'row', gap: spacing.md },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  actionCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentPill: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  urgentPillText: { ...typography.labelCaps, color: '#dc2626', fontSize: 9, fontWeight: '700' },
  neutralPill: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  neutralPillText: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 9 },
  actionCardTitle: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface, marginTop: 4 },
  actionCardSub: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 11 },
  staffCard: { padding: spacing.md, backgroundColor: colors.surfaceContainer },
  staffCardTitle: { ...typography.headlineSm, fontSize: 14, color: colors.onSurface },
  staffCardSub: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 2 },
  staffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  staffBtnText: { ...typography.labelCaps, color: '#ffffff', fontSize: 11, fontWeight: '700' },
  subventionCard: { padding: spacing.md, gap: spacing.xs, backgroundColor: colors.primaryFixed },
  subventionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  subventionTitle: { ...typography.headlineSm, fontSize: 14, color: colors.onPrimaryFixed },
  subventionText: { ...typography.bodySm, color: colors.onPrimaryFixedVariant, fontSize: 12 },
});
