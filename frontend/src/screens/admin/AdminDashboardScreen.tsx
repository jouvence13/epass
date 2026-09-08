import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import PrimaryButton from '../../components/PrimaryButton';
import LiveCampusMap, { BusLivePosition } from '../../components/LiveCampusMap';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS } from '../../config/api';

export default function AdminDashboardScreen({ navigation }: any) {
  const { user, token, logout } = useAuth();
  const { showToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accountingTab, setAccountingTab] = useState<'DRIVERS' | 'BUSES'>('DRIVERS');

  // Pricing Modal (SuperAdmin Only)
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [studentFare, setStudentFare] = useState('100');
  const [standardFare, setStandardFare] = useState('250');
  const [subventionPct, setSubventionPct] = useState('60');
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  // Global KPIs & Audit
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

  // Accounting Breakdown Data
  const [accountingData, setAccountingData] = useState<{
    summary: {
      total_revenue_xof: number;
      total_passengers: number;
      total_trips: number;
      active_drivers_count: number;
      active_buses_count: number;
      subvention_fund_xof: number;
    };
    drivers: Array<{
      driver_id: string;
      driver_name: string;
      phone_number: string;
      matricule: string;
      assigned_bus: string;
      total_trips: number;
      passengers_transported: number;
      revenue_collected_xof: number;
      performance_score: string;
    }>;
    buses: Array<{
      bus_id: string;
      bus_code: string;
      immatriculation_number: string;
      campus: string;
      driver_name: string;
      max_capacity: number;
      total_rotations: number;
      passengers_count: number;
      revenue_generated_xof: number;
      status: string;
      fill_rate_avg: string;
    }>;
  }>({
    summary: {
      total_revenue_xof: 185600,
      total_passengers: 1856,
      total_trips: 52,
      active_drivers_count: 4,
      active_buses_count: 4,
      subvention_fund_xof: 278400,
    },
    drivers: [
      {
        driver_id: '1',
        driver_name: 'Moussa Gbaguidi',
        phone_number: '+229 97 00 00 01',
        matricule: 'DRV-2024-001',
        assigned_bus: 'Bus Campus #401',
        total_trips: 18,
        passengers_transported: 640,
        revenue_collected_xof: 64000,
        performance_score: '99.2%',
      },
      {
        driver_id: '2',
        driver_name: 'Jean Dossou',
        phone_number: '+229 97 11 22 33',
        matricule: 'DRV-2024-002',
        assigned_bus: 'Bus Campus #402',
        total_trips: 16,
        passengers_transported: 580,
        revenue_collected_xof: 58000,
        performance_score: '98.5%',
      },
      {
        driver_id: '3',
        driver_name: 'Bio Bio Idrissou',
        phone_number: '+229 96 44 55 66',
        matricule: 'DRV-2024-003',
        assigned_bus: 'Bus Campus #501',
        total_trips: 12,
        passengers_transported: 390,
        revenue_collected_xof: 39000,
        performance_score: '97.8%',
      },
      {
        driver_id: '4',
        driver_name: 'Saliou Tidjani',
        phone_number: '+229 95 88 77 11',
        matricule: 'DRV-2024-004',
        assigned_bus: 'Bus Campus #601',
        total_trips: 10,
        passengers_transported: 246,
        revenue_collected_xof: 24600,
        performance_score: '99.0%',
      },
    ],
    buses: [
      {
        bus_id: 'b1',
        bus_code: 'Bus Campus #401',
        immatriculation_number: 'RB-4412-UAC',
        campus: 'Campus UAC Abomey-Calavi',
        driver_name: 'Moussa Gbaguidi',
        max_capacity: 50,
        total_rotations: 18,
        passengers_count: 640,
        revenue_generated_xof: 64000,
        status: 'ACTIVE',
        fill_rate_avg: '82%',
      },
      {
        bus_id: 'b2',
        bus_code: 'Bus Campus #402',
        immatriculation_number: 'RB-8819-UAC',
        campus: 'Campus UAC Abomey-Calavi',
        driver_name: 'Jean Dossou',
        max_capacity: 50,
        total_rotations: 16,
        passengers_count: 580,
        revenue_generated_xof: 58000,
        status: 'ACTIVE',
        fill_rate_avg: '78%',
      },
      {
        bus_id: 'b3',
        bus_code: 'Bus Campus #501',
        immatriculation_number: 'RB-9921-UP',
        campus: 'Université de Parakou (UP)',
        driver_name: 'Bio Bio Idrissou',
        max_capacity: 50,
        total_rotations: 12,
        passengers_count: 390,
        revenue_generated_xof: 39000,
        status: 'ACTIVE',
        fill_rate_avg: '70%',
      },
      {
        bus_id: 'b4',
        bus_code: 'Bus Campus #601',
        immatriculation_number: 'RB-3341-UNA',
        campus: 'Université d\'Agriculture (UNA)',
        driver_name: 'Saliou Tidjani',
        max_capacity: 50,
        total_rotations: 10,
        passengers_count: 246,
        revenue_generated_xof: 24600,
        status: 'ACTIVE',
        fill_rate_avg: '65%',
      },
    ],
  });

  // Live Bus Positions
  const [liveBuses, setLiveBuses] = useState<BusLivePosition[]>([
    {
      bus_id: 'bus-uac-01',
      bus_code: 'Bus Campus #401',
      immatriculation: 'RB-4412-UAC',
      campus: 'UAC Abomey-Calavi',
      driver_name: 'Moussa Gbaguidi',
      driver_phone: '+229 97 00 00 01',
      route_name: 'Campus Express (Calavi → Étoile Rouge)',
      latitude: 6.4474,
      longitude: 2.3557,
      speed_kmh: 42.5,
      bearing: 135.0,
      delay_minutes: 0,
      total_capacity: 50,
      booked_seats: 36,
      occupancy_percentage: 72,
      status: 'EN_ROUTE',
      next_stop: 'Arrêt Étoile Rouge',
      last_ping: 'À l\'instant',
    },
    {
      bus_id: 'bus-uac-02',
      bus_code: 'Bus Campus #402',
      immatriculation: 'RB-8819-UAC',
      campus: 'UAC Abomey-Calavi',
      driver_name: 'Jean Dossou',
      driver_phone: '+229 97 11 22 33',
      route_name: 'Ligne B (Godomey → Campus Calavi)',
      latitude: 6.415,
      longitude: 2.348,
      speed_kmh: 35.0,
      bearing: 45.0,
      delay_minutes: 5,
      total_capacity: 50,
      booked_seats: 44,
      occupancy_percentage: 88,
      status: 'BOARDING',
      next_stop: 'Carrefour Godomey',
      last_ping: 'À l\'instant',
    },
    {
      bus_id: 'bus-up-01',
      bus_code: 'Bus Campus #501',
      immatriculation: 'RB-9921-UP',
      campus: 'Université de Parakou (UP)',
      driver_name: 'Bio Bio Idrissou',
      driver_phone: '+229 96 44 55 66',
      route_name: 'Navette UP (Gare → Campus Parakou)',
      latitude: 9.3372,
      longitude: 2.6103,
      speed_kmh: 48.0,
      bearing: 90.0,
      delay_minutes: 0,
      total_capacity: 50,
      booked_seats: 28,
      occupancy_percentage: 56,
      status: 'EN_ROUTE',
      next_stop: 'Rectorat UP Parakou',
      last_ping: 'À l\'instant',
    },
    {
      bus_id: 'bus-una-01',
      bus_code: 'Bus Campus #601',
      immatriculation: 'RB-3341-UNA',
      campus: 'Université d\'Agriculture (UNA)',
      driver_name: 'Saliou Tidjani',
      driver_phone: '+229 95 88 77 11',
      route_name: 'Porto-Novo → Campus UNA Sakété',
      latitude: 6.4969,
      longitude: 2.6289,
      speed_kmh: 38.0,
      bearing: 180.0,
      delay_minutes: 0,
      total_capacity: 50,
      booked_seats: 32,
      occupancy_percentage: 64,
      status: 'EN_ROUTE',
      next_stop: 'Campus UNA Sakété',
      last_ping: 'À l\'instant',
    },
  ]);

  const [pendingKycCount, setPendingKycCount] = useState(0);
  const [fleetCount, setFleetCount] = useState(4);

  const fetchDashboardData = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 1. Audit Financier Global
      const auditRes = await fetch(ENDPOINTS.ADMIN_AUDIT_FIN, { credentials: 'include', headers });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAudit(auditData);
      }

      // 2. Comptabilité Analytique Détaillée
      const accRes = await fetch(ENDPOINTS.ADMIN_ACCOUNTING_BREAKDOWN, { credentials: 'include', headers });
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccountingData(accData);
      }

      // 3. Télémétrie GPS Carte Live
      const liveRes = await fetch(ENDPOINTS.ADMIN_LIVE_POSITIONS, { credentials: 'include', headers });
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        if (Array.isArray(liveData) && liveData.length > 0) {
          setLiveBuses(liveData);
        }
      }

      // 4. Paramètres de Tarification (SuperAdmin)
      const pricingRes = await fetch(ENDPOINTS.ADMIN_PRICING, { credentials: 'include', headers });
      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        setStudentFare(String(pricingData.student_fare_xof || 100));
        setStandardFare(String(pricingData.standard_fare_xof || 250));
        setSubventionPct(String(pricingData.government_subvention_pct || 60));
      }

      // 5. KYC Pending count
      const kycRes = await fetch(ENDPOINTS.ADMIN_KYC_PENDING, { credentials: 'include', headers });
      if (kycRes.ok) {
        const kycData = await kycRes.json();
        if (Array.isArray(kycData)) setPendingKycCount(kycData.length);
      }

      // 6. Fleet
      const fleetRes = await fetch(ENDPOINTS.ADMIN_FLEET, { credentials: 'include', headers });
      if (fleetRes.ok) {
        const fleetData = await fleetRes.json();
        if (Array.isArray(fleetData)) setFleetCount(fleetData.length);
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

  const handleSavePricing = async () => {
    if (!isSuperAdmin) return;
    setIsSavingPricing(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(ENDPOINTS.ADMIN_PRICING, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          student_fare_xof: parseInt(studentFare, 10) || 100,
          standard_fare_xof: parseInt(standardFare, 10) || 250,
          government_subvention_pct: parseFloat(subventionPct) || 60.0,
          recycle_limit_days: 7,
          max_recycles_per_ticket: 1,
          active_campuses: [
            'UAC Abomey-Calavi',
            'Université de Parakou (UP)',
            'Université Nationale d\'Agriculture (UNA)',
            'UNSTIM Abomey',
          ],
        }),
      });

      if (res.ok) {
        showToast({
          title: 'Tarifs Mis à Jour !',
          message: `Nouveau tarif étudiant : ${studentFare} FCFA. Paramètres synchronisés.`,
          type: 'success',
          category: 'WALLET',
        });
        setShowPricingModal(false);
        await fetchDashboardData();
      } else {
        const err = await res.json().catch(() => null);
        Alert.alert('Erreur', err?.detail || 'Impossible de modifier les tarifs.');
      }
    } catch (e) {
      Alert.alert('Erreur Réseau', 'Vérifiez votre connexion.');
    } finally {
      setIsSavingPricing(false);
    }
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
            <View style={[styles.adminAvatar, isSuperAdmin && { backgroundColor: '#b91c1c' }]}>
              <MaterialIcons
                name={isSuperAdmin ? 'shield' : 'admin-panel-settings'}
                size={26}
                color={colors.onPrimary}
              />
            </View>
            <View>
              <Text style={styles.adminName}>
                {user?.first_name} {user?.last_name}
              </Text>
              <Text style={styles.adminRole}>
                {isSuperAdmin ? 'Super Administrateur National' : 'Direction des Transports Universitaires'}
              </Text>
            </View>
          </View>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <MaterialIcons name="logout" size={18} color={colors.error} />
          </Pressable>
        </View>

        {/* SuperAdmin Pricing Button Banner */}
        {isSuperAdmin ? (
          <Pressable
            style={styles.superAdminBanner}
            onPress={() => setShowPricingModal(true)}
          >
            <View style={styles.superAdminIconBox}>
              <MaterialIcons name="tune" size={24} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.superAdminTitle}>Configuration des Tarifs & Subventions</Text>
                <Badge label="SuperAdmin Only" variant="error" />
              </View>
              <Text style={styles.superAdminSub}>
                Tarif Étudiant: {studentFare} FCFA • Plein Tarif: {standardFare} FCFA • Subvention: {subventionPct}%
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ffffff" />
          </Pressable>
        ) : (
          <Card style={styles.subventionCard}>
            <View style={styles.subventionHeader}>
              <MaterialIcons name="verified" size={20} color={colors.primary} />
              <Text style={styles.subventionTitle}>Subvention Nationale Active (100 F / trajet)</Text>
            </View>
            <Text style={styles.subventionText}>
              Gouvernance centralisée. L'attribution des bus et le suivi de vos chauffeurs sont modifiables ci-dessous.
            </Text>
          </Card>
        )}

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

        {/* ========================================================================= */}
        {/* CARTE INTERACTIVE GOOGLE MAPS / OPENSTREETMAP EN DIRECT                   */}
        {/* ========================================================================= */}
        <LiveCampusMap
          buses={liveBuses}
          onSelectBus={(bus) => {
            showToast({
              title: `${bus.bus_code} Sélectionné`,
              message: `Chauffeur: ${bus.driver_name} • Vitesse: ${bus.speed_kmh} km/h • Remplissage: ${bus.occupancy_percentage}%`,
              type: 'info',
              category: 'TRAFFIC',
            });
          }}
        />

        {/* Operational Shortcuts */}
        <View style={styles.bentoRow}>
          {/* Pending KYC Action Card */}
          <Pressable style={styles.actionCard} onPress={() => navigation.navigate('Moderation')}>
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
          <Pressable style={styles.actionCard} onPress={() => navigation.navigate('Fleet')}>
            <View style={styles.actionCardTop}>
              <View style={[styles.actionIconCircle, { backgroundColor: colors.primaryFixed }]}>
                <MaterialIcons name="directions-bus" size={22} color={colors.primary} />
              </View>
              <View style={styles.neutralPill}>
                <Text style={styles.neutralPillText}>{fleetCount} bus</Text>
              </View>
            </View>
            <Text style={styles.actionCardTitle}>Flotte & Lignes</Text>
            <Text style={styles.actionCardSub}>Attribution & trajets des navettes</Text>
          </Pressable>
        </View>

        {/* ========================================================================= */}
        {/* COMPTABILITÉ ANALYTIQUE DÉTAILLÉE PAR CHAUFFEUR & PAR BUS                 */}
        {/* ========================================================================= */}
        <Card style={styles.accountingCard}>
          <View style={styles.accountingHeader}>
            <View>
              <Text style={styles.accountingEyebrow}>COMPTABILITÉ & RENTABILITÉ</Text>
              <Text style={styles.accountingTitle}>Performances & Recettes Analytiques</Text>
            </View>

            {/* Toggle Tabs : Par Chauffeur vs Par Bus */}
            <View style={styles.tabSwitch}>
              <Pressable
                style={[styles.tabSwitchBtn, accountingTab === 'DRIVERS' && styles.tabSwitchBtnActive]}
                onPress={() => setAccountingTab('DRIVERS')}
              >
                <MaterialIcons
                  name="airline-seat-recline-normal"
                  size={16}
                  color={accountingTab === 'DRIVERS' ? '#ffffff' : colors.onSurfaceVariant}
                />
                <Text style={[styles.tabSwitchText, accountingTab === 'DRIVERS' && styles.tabSwitchTextActive]}>
                  Par Chauffeur
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabSwitchBtn, accountingTab === 'BUSES' && styles.tabSwitchBtnActive]}
                onPress={() => setAccountingTab('BUSES')}
              >
                <MaterialIcons
                  name="directions-bus"
                  size={16}
                  color={accountingTab === 'BUSES' ? '#ffffff' : colors.onSurfaceVariant}
                />
                <Text style={[styles.tabSwitchText, accountingTab === 'BUSES' && styles.tabSwitchTextActive]}>
                  Par Bus
                </Text>
              </Pressable>
            </View>
          </View>

          {/* DRIVERS ACCOUNTING LIST */}
          {accountingTab === 'DRIVERS' ? (
            <View style={{ gap: spacing.sm }}>
              {accountingData.drivers.map((drv) => (
                <View key={drv.driver_id} style={styles.itemRowCard}>
                  <View style={styles.itemAvatarCircle}>
                    <MaterialIcons name="person" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.itemTitle}>{drv.driver_name}</Text>
                      <Text style={styles.itemRevenue}>
                        {drv.revenue_collected_xof.toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>
                    <Text style={styles.itemSubtitle}>
                      {drv.matricule} • {drv.assigned_bus}
                    </Text>
                    <View style={styles.itemMetricsRow}>
                      <Text style={styles.itemMetricBadge}>
                        🚍 {drv.total_trips} rotations
                      </Text>
                      <Text style={styles.itemMetricBadge}>
                        👥 {drv.passengers_transported} passagers
                      </Text>
                      <Text style={[styles.itemMetricBadge, { color: '#059669', backgroundColor: '#ecfdf5' }]}>
                        ⚡ {drv.performance_score}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            /* BUSES ACCOUNTING LIST */
            <View style={{ gap: spacing.sm }}>
              {accountingData.buses.map((bus) => (
                <View key={bus.bus_id} style={styles.itemRowCard}>
                  <View style={[styles.itemAvatarCircle, { backgroundColor: '#e0f2fe' }]}>
                    <MaterialIcons name="directions-bus" size={20} color="#0284c7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.itemTitle}>{bus.bus_code}</Text>
                      <Text style={styles.itemRevenue}>
                        {bus.revenue_generated_xof.toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>
                    <Text style={styles.itemSubtitle}>
                      {bus.immatriculation_number} • Chauffeur : {bus.driver_name}
                    </Text>
                    <View style={styles.itemMetricsRow}>
                      <Text style={styles.itemMetricBadge}>
                        🔄 {bus.total_rotations} rotations
                      </Text>
                      <Text style={styles.itemMetricBadge}>
                        🎟️ {bus.passengers_count} passagers
                      </Text>
                      <Text style={[styles.itemMetricBadge, { color: colors.primary, backgroundColor: colors.primaryFixed }]}>
                        📊 Remplissage : {bus.fill_rate_avg}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Staff Management Card */}
        <Card style={styles.staffCard}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MaterialIcons name="badge" size={24} color={colors.primary} />
              <View>
                <Text style={styles.staffCardTitle}>Gestion du Personnel & Étudiants</Text>
                <Text style={styles.staffCardSub}>Enrôler des chauffeurs, contrôleurs et admins</Text>
              </View>
            </View>
            <Pressable style={styles.staffBtn} onPress={() => navigation.navigate('Users')}>
              <MaterialIcons name="person-add" size={18} color="#ffffff" />
              <Text style={styles.staffBtnText}>Gérer</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL : CONFIGURATION DES TARIFS (SUPERADMIN EXCLUSIF)                    */}
      {/* ========================================================================= */}
      <Modal
        visible={showPricingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPricingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <MaterialIcons name="tune" size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>Modifier les Tarifs & Subventions</Text>
              </View>
              <Pressable onPress={() => setShowPricingModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            <Text style={styles.modalNotice}>
              Seul le SuperAdmin National est habilité à définir les prix des tickets pour l'ensemble des campus universitaires béninois.
            </Text>

            <Text style={styles.inputLabel}>Tarif Étudiant Subventionné (FCFA) *</Text>
            <TextInput
              value={studentFare}
              onChangeText={setStudentFare}
              placeholder="100"
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Tarif Plein Public (FCFA) *</Text>
            <TextInput
              value={standardFare}
              onChangeText={setStandardFare}
              placeholder="250"
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Taux de Subvention de l'État (%) *</Text>
            <TextInput
              value={subventionPct}
              onChangeText={setSubventionPct}
              placeholder="60"
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <PrimaryButton
              label={isSavingPricing ? 'Enregistrement...' : 'Sauvegarder les Nouveaux Tarifs'}
              icon="check-circle"
              variant="gold"
              onPress={handleSavePricing}
              disabled={isSavingPricing}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>
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
  superAdminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#7f1d1d',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  superAdminIconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  superAdminTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  superAdminSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
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

  // Accounting Breakdown Styles
  accountingCard: {
    backgroundColor: colors.surfaceContainer,
    padding: spacing.md,
    gap: spacing.md,
  },
  accountingHeader: {
    gap: spacing.sm,
  },
  accountingEyebrow: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.primary,
    fontWeight: '800',
  },
  accountingTitle: {
    ...typography.headlineSm,
    fontSize: 16,
    color: colors.onSurface,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.md,
    padding: 3,
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  tabSwitchBtnActive: {
    backgroundColor: colors.primary,
  },
  tabSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  tabSwitchTextActive: {
    color: '#ffffff',
  },
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  itemAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  itemRevenue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  itemSubtitle: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  itemMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 6,
  },
  itemMetricBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },

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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalNotice: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  modalInput: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.onSurface,
  },
});
