import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS } from '../../config/api';

export default function AdminFleetScreen() {
  const { token } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'BUSES' | 'ROUTES' | 'TRIPS'>('BUSES');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [buses, setBuses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  // Modal create bus state
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [newBusCode, setNewBusCode] = useState('');
  const [newImmat, setNewImmat] = useState('');
  const [newCap, setNewCap] = useState('50');
  const [creating, setCreating] = useState(false);

  const fetchFleetData = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const [busesRes, routesRes, tripsRes] = await Promise.all([
        fetch(ENDPOINTS.ADMIN_FLEET, { credentials: 'include', headers }),
        fetch(ENDPOINTS.ADMIN_ROUTES, { credentials: 'include', headers }),
        fetch(ENDPOINTS.ADMIN_TRIPS, { credentials: 'include', headers }),
      ]);

      if (busesRes.ok) setBuses(await busesRes.json());
      if (routesRes.ok) setRoutes(await routesRes.json());
      if (tripsRes.ok) setTrips(await tripsRes.json());
    } catch (e) {
      console.warn('Error fetching fleet data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFleetData();
  }, [fetchFleetData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFleetData();
  };

  const handleCreateBus = async () => {
    if (!newBusCode.trim() || !newImmat.trim()) {
      showToast({
        title: 'Champs requis',
        message: 'Code bus et immatriculation sont obligatoires.',
        type: 'warning',
        category: 'GENERAL',
      });
      return;
    }

    setCreating(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(ENDPOINTS.ADMIN_CREATE_BUS, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          bus_code: newBusCode.toUpperCase(),
          immatriculation_number: newImmat.toUpperCase(),
          max_capacity: parseInt(newCap, 10) || 50,
          status: 'OPERATIONAL',
        }),
      });

      if (res.ok) {
        showToast({
          title: 'Navette Enregistrée',
          message: `Le bus ${newBusCode} a été ajouté à la flotte active.`,
          type: 'success',
          category: 'GENERAL',
        });
        setShowAddBusModal(false);
        setNewBusCode('');
        setNewImmat('');
        await fetchFleetData();
      } else {
        const err = await res.json().catch(() => null);
        showToast({
          title: 'Erreur',
          message: err?.detail || 'Impossible de créer la navette.',
          type: 'error',
          category: 'GENERAL',
        });
      }
    } catch (e) {
      showToast({
        title: 'Erreur Réseau',
        message: 'Impossible de joindre le serveur.',
        type: 'error',
        category: 'GENERAL',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.eyebrow}>INFRASTRUCTURE & OPÉRATIONS</Text>
            <Text style={styles.title}>Flotte & Lignes CROUS</Text>
          </View>
          {activeTab === 'BUSES' && (
            <Pressable style={styles.addBtn} onPress={() => setShowAddBusModal(true)}>
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.addBtnText}>Nouveau Bus</Text>
            </Pressable>
          )}
        </View>

        {/* Tab Buttons */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'BUSES' && styles.tabBtnActive]}
            onPress={() => setActiveTab('BUSES')}
          >
            <MaterialIcons name="directions-bus" size={18} color={activeTab === 'BUSES' ? colors.primary : colors.onSurfaceVariant} />
            <Text style={[styles.tabBtnText, activeTab === 'BUSES' && styles.tabBtnTextActive]}>
              Navettes ({buses.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'ROUTES' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ROUTES')}
          >
            <MaterialIcons name="alt-route" size={18} color={activeTab === 'ROUTES' ? colors.primary : colors.onSurfaceVariant} />
            <Text style={[styles.tabBtnText, activeTab === 'ROUTES' && styles.tabBtnTextActive]}>
              Lignes ({routes.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'TRIPS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('TRIPS')}
          >
            <MaterialIcons name="schedule" size={18} color={activeTab === 'TRIPS' ? colors.primary : colors.onSurfaceVariant} />
            <Text style={[styles.tabBtnText, activeTab === 'TRIPS' && styles.tabBtnTextActive]}>
              Trajets ({trips.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'BUSES' ? (
        <FlatList
          data={buses}
          keyExtractor={(item) => item.bus_id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.busCodeCircle}>
                  <MaterialIcons name="directions-bus" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.itemTitle}>{item.bus_code}</Text>
                  <Text style={styles.itemSub}>Immatriculation : {item.immatriculation_number}</Text>
                </View>
                <Badge
                  label={item.status === 'OPERATIONAL' ? 'EN SERVICE' : 'MAINTENANCE'}
                  variant={item.status === 'OPERATIONAL' ? 'success' : 'warning'}
                />
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.busMetricRow}>
                <Text style={styles.metricText}>Capacité Max : <Text style={{ fontWeight: '700' }}>{item.max_capacity} places</Text></Text>
                <Text style={styles.metricText}>Type : Navette Campus</Text>
              </View>
            </Card>
          )}
        />
      ) : activeTab === 'ROUTES' ? (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.route_id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={[styles.busCodeCircle, { backgroundColor: '#e0f2fe' }]}>
                  <MaterialIcons name="alt-route" size={24} color="#0284c7" />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.itemTitle}>{item.route_name}</Text>
                  <Text style={styles.itemSub}>Durée estimée : {item.estimated_duration_minutes} min</Text>
                </View>
                <Badge label="100 FCFA" variant="neutral" />
              </View>
            </Card>
          )}
        />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.trip_id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={[styles.busCodeCircle, { backgroundColor: '#fef3c7' }]}>
                  <MaterialIcons name="schedule" size={24} color="#b45309" />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.itemTitle}>Rotation #{item.trip_id?.substring(0, 8)?.toUpperCase()}</Text>
                  <Text style={styles.itemSub}>Départ : {new Date(item.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <Badge label={item.status} variant={item.status === 'SCHEDULED' ? 'primary' : 'success'} />
              </View>
              <View style={styles.cardDivider} />
              <Text style={styles.metricText}>Places restantes : {item.available_seats} / {item.total_seats}</Text>
            </Card>
          )}
        />
      )}

      {/* Modal Add Bus */}
      <Modal visible={showAddBusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="add-circle" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Ajouter une Navette</Text>
            </View>

            <Text style={styles.inputLabel}>Code Bus *</Text>
            <TextInput
              value={newBusCode}
              onChangeText={setNewBusCode}
              placeholder="Ex: BUS-UAC-05"
              placeholderTextColor={colors.outline}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Numéro d'Immatriculation *</Text>
            <TextInput
              value={newImmat}
              onChangeText={setNewImmat}
              placeholder="Ex: RB-8899-UAC"
              placeholderTextColor={colors.outline}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Capacité Passagers</Text>
            <TextInput
              value={newCap}
              onChangeText={setNewCap}
              placeholder="50"
              placeholderTextColor={colors.outline}
              keyboardType="number-pad"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowAddBusModal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={handleCreateBus} disabled={creating}>
                {creating ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Enregistrer</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.containerMargin, gap: spacing.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 10 },
  title: { ...typography.headlineMd, color: colors.primary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  addBtnText: { ...typography.labelCaps, color: '#ffffff', fontSize: 11, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.surfaceContainer, padding: 4, borderRadius: radius.md },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  tabBtnActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant },
  tabBtnText: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 11 },
  tabBtnTextActive: { color: colors.primary, fontWeight: '700' },
  list: { paddingHorizontal: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  card: { padding: spacing.md, gap: spacing.xs, backgroundColor: colors.surfaceContainer },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  busCodeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface },
  itemSub: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 11 },
  cardDivider: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing.xs },
  busMetricRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricText: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '85%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  modalTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  inputLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 4 },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 44,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalCancelBtn: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outline, borderRadius: radius.md },
  modalCancelText: { ...typography.labelCaps, color: colors.onSurface, fontSize: 11 },
  modalConfirmBtn: { flex: 1.5, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md },
  modalConfirmText: { ...typography.labelCaps, color: '#ffffff', fontSize: 11, fontWeight: '700' },
});
