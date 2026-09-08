import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS } from '../../config/api';

export default function AdminFleetScreen() {
  const { token, user } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'BUSES' | 'ROUTES' | 'TRIPS' | 'CAMPUSES'>('BUSES');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [buses, setBuses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);

  // Modal Create Bus
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [newBusCode, setNewBusCode] = useState('');
  const [newImmat, setNewImmat] = useState('');
  const [newCap, setNewCap] = useState('50');
  const [creating, setCreating] = useState(false);

  // Modal Assign Bus
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBusForAssign, setSelectedBusForAssign] = useState<any | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // Modal Create Campus
  const [showAddCampusModal, setShowAddCampusModal] = useState(false);
  const [campusCode, setCampusCode] = useState('');
  const [campusName, setCampusName] = useState('');
  const [campusCity, setCampusCity] = useState('');
  const [campusLat, setCampusLat] = useState('6.4474');
  const [campusLon, setCampusLon] = useState('2.3557');
  const [creatingCampus, setCreatingCampus] = useState(false);

  const fetchFleetData = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const [busesRes, routesRes, tripsRes, driversRes, campusesRes] = await Promise.all([
        fetch(ENDPOINTS.ADMIN_FLEET, { credentials: 'include', headers }),
        fetch(ENDPOINTS.ADMIN_ROUTES, { credentials: 'include', headers }),
        fetch(ENDPOINTS.ADMIN_TRIPS, { credentials: 'include', headers }),
        fetch(`${ENDPOINTS.ADMIN_USERS}?role=DRIVER`, { credentials: 'include', headers }),
        fetch(ENDPOINTS.CAMPUSES, { credentials: 'include', headers }),
      ]);

      if (busesRes.ok) setBuses(await busesRes.json());
      if (routesRes.ok) {
        const rData = await routesRes.json();
        setRoutes(rData);
        if (rData.length > 0 && !selectedRouteId) setSelectedRouteId(rData[0].route_id);
      }
      if (tripsRes.ok) setTrips(await tripsRes.json());
      if (driversRes.ok) {
        const dData = await driversRes.json();
        setDrivers(dData);
        if (dData.length > 0 && !selectedDriverId) setSelectedDriverId(dData[0].user_id);
      }
      if (campusesRes.ok) setCampuses(await campusesRes.json());
    } catch (e) {
      console.warn('Error fetching fleet data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedDriverId, selectedRouteId]);

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

  const openAssignModal = (bus: any) => {
    setSelectedBusForAssign(bus);
    setShowAssignModal(true);
  };

  const handleAssignBus = async () => {
    if (!selectedBusForAssign || !selectedDriverId || !selectedRouteId) {
      Alert.alert('Champs incomplets', 'Veuillez sélectionner un chauffeur et une ligne.');
      return;
    }

    setAssigning(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(ENDPOINTS.ADMIN_ASSIGN_BUS, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          bus_id: selectedBusForAssign.bus_id,
          driver_id: selectedDriverId,
          route_id: selectedRouteId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast({
          title: 'Bus Assigné !',
          message: data.message || 'Le bus a été assigné au chauffeur.',
          type: 'success',
          category: 'TRAFFIC',
        });
        setShowAssignModal(false);
        await fetchFleetData();
      } else {
        const err = await res.json().catch(() => null);
        Alert.alert('Erreur', err?.detail || 'Impossible d\'assigner le bus.');
      }
    } catch (e) {
      Alert.alert('Erreur Réseau', 'Vérifiez votre connexion.');
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateCampus = async () => {
    if (!campusCode.trim() || !campusName.trim() || !campusCity.trim()) {
      showToast({
        title: 'Champs requis',
        message: 'Code, nom du campus et ville sont obligatoires.',
        type: 'warning',
        category: 'GENERAL',
      });
      return;
    }

    setCreatingCampus(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(ENDPOINTS.ADMIN_CAMPUSES, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          code: campusCode.toUpperCase(),
          name: campusName,
          city: campusCity,
          latitude: parseFloat(campusLat) || 6.4474,
          longitude: parseFloat(campusLon) || 2.3557,
          zoom_level: 15.0,
          is_active: true,
          landmarks: [],
        }),
      });

      if (res.ok) {
        showToast({
          title: 'Campus Ajouté !',
          message: `Le campus ${campusCode} - ${campusName} est maintenant actif.`,
          type: 'success',
          category: 'GENERAL',
        });
        setShowAddCampusModal(false);
        setCampusCode('');
        setCampusName('');
        setCampusCity('');
        await fetchFleetData();
      } else {
        const err = await res.json().catch(() => null);
        Alert.alert('Erreur', err?.detail || 'Impossible d’ajouter le campus.');
      }
    } catch (e) {
      Alert.alert('Erreur Réseau', 'Impossible de joindre le serveur.');
    } finally {
      setCreatingCampus(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.eyebrow}>INFRASTRUCTURE & OPÉRATIONS</Text>
            <Text style={styles.title}>Flotte & Lignes Campus</Text>
          </View>
          {activeTab === 'BUSES' && (
            <Pressable style={styles.addBtn} onPress={() => setShowAddBusModal(true)}>
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.addBtnText}>Nouveau Bus</Text>
            </Pressable>
          )}
          {activeTab === 'CAMPUSES' && (
            <Pressable style={styles.addBtn} onPress={() => setShowAddCampusModal(true)}>
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.addBtnText}>Nouveau Campus</Text>
            </Pressable>
          )}
        </View>

        {/* Tab Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'BUSES' && styles.tabBtnActive]}
            onPress={() => setActiveTab('BUSES')}
          >
            <MaterialIcons
              name="directions-bus"
              size={18}
              color={activeTab === 'BUSES' ? colors.primary : colors.onSurfaceVariant}
            />
            <Text style={[styles.tabBtnText, activeTab === 'BUSES' && styles.tabBtnTextActive]}>
              Navettes ({buses.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'ROUTES' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ROUTES')}
          >
            <MaterialIcons
              name="alt-route"
              size={18}
              color={activeTab === 'ROUTES' ? colors.primary : colors.onSurfaceVariant}
            />
            <Text style={[styles.tabBtnText, activeTab === 'ROUTES' && styles.tabBtnTextActive]}>
              Lignes ({routes.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'TRIPS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('TRIPS')}
          >
            <MaterialIcons
              name="schedule"
              size={18}
              color={activeTab === 'TRIPS' ? colors.primary : colors.onSurfaceVariant}
            />
            <Text style={[styles.tabBtnText, activeTab === 'TRIPS' && styles.tabBtnTextActive]}>
              Rotations ({trips.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'CAMPUSES' && styles.tabBtnActive]}
            onPress={() => setActiveTab('CAMPUSES')}
          >
            <MaterialIcons
              name="school"
              size={18}
              color={activeTab === 'CAMPUSES' ? colors.primary : colors.onSurfaceVariant}
            />
            <Text style={[styles.tabBtnText, activeTab === 'CAMPUSES' && styles.tabBtnTextActive]}>
              Campus ({campuses.length})
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Content */}
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
                <Text style={styles.metricText}>
                  Capacité : <Text style={{ fontWeight: '700' }}>{item.max_capacity} places</Text>
                </Text>
                <Pressable
                  style={styles.assignBtn}
                  onPress={() => openAssignModal(item)}
                >
                  <MaterialIcons name="assignment-ind" size={16} color="#ffffff" />
                  <Text style={styles.assignBtnText}>Attribuer Chauffeur / Ligne</Text>
                </Pressable>
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
      ) : activeTab === 'TRIPS' ? (
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
                  <Text style={styles.itemSub}>
                    Départ : {new Date(item.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Badge label={item.status} variant={item.status === 'SCHEDULED' ? 'primary' : 'success'} />
              </View>
              <View style={styles.cardDivider} />
              <Text style={styles.metricText}>
                Places restantes : {item.available_seats} / {item.total_seats}
              </Text>
            </Card>
          )}
        />
      ) : (
        <FlatList
          data={campuses}
          keyExtractor={(item) => item.campus_id || item.code}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={[styles.busCodeCircle, { backgroundColor: '#ecfdf5' }]}>
                  <MaterialIcons name="school" size={24} color="#059669" />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.itemTitle}>{item.code} • {item.name}</Text>
                  <Text style={styles.itemSub}>Ville : {item.city} • Coordonnées : {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}</Text>
                </View>
                <Badge label={item.is_active ? 'ACTIF' : 'INACTIF'} variant={item.is_active ? 'success' : 'neutral'} />
              </View>
              <View style={styles.cardDivider} />
              <Text style={styles.metricText}>
                Pôles & Arrêts enregistrés : <Text style={{ fontWeight: '700' }}>{item.landmarks?.length || 0} points d'intérêt</Text>
              </Text>
            </Card>
          )}
        />
      )}

      {/* Modal Add Campus */}
      <Modal visible={showAddCampusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="school" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Nouveau Campus Universitaire</Text>
            </View>

            <Text style={styles.inputLabel}>Code Campus (ex: UNSTIM, UP) *</Text>
            <TextInput
              value={campusCode}
              onChangeText={setCampusCode}
              placeholder="Ex: UNSTIM"
              placeholderTextColor={colors.outline}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Nom Complet du Campus *</Text>
            <TextInput
              value={campusName}
              onChangeText={setCampusName}
              placeholder="Ex: Université Nationale des Sciences..."
              placeholderTextColor={colors.outline}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Ville Universitaire *</Text>
            <TextInput
              value={campusCity}
              onChangeText={setCampusCity}
              placeholder="Ex: Abomey"
              placeholderTextColor={colors.outline}
              style={styles.modalInput}
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Latitude GPS</Text>
                <TextInput
                  value={campusLat}
                  onChangeText={setCampusLat}
                  placeholder="6.4474"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  style={styles.modalInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Longitude GPS</Text>
                <TextInput
                  value={campusLon}
                  onChangeText={setCampusLon}
                  placeholder="2.3557"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  style={styles.modalInput}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddCampusModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <PrimaryButton
                label={creatingCampus ? 'Enregistrement...' : 'Ajouter Campus'}
                onPress={handleCreateCampus}
                disabled={creatingCampus}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>

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
              placeholder="Ex: BUS-CAMPUS-05"
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
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddBusModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <PrimaryButton
                label={creating ? 'Création...' : 'Créer le Bus'}
                onPress={handleCreateBus}
                disabled={creating}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Assign Bus to Driver & Route */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="assignment-ind" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Attribution de Navette</Text>
            </View>

            <Text style={styles.assignSubtitle}>
              Navette : <Text style={{ fontWeight: '700', color: colors.primary }}>{selectedBusForAssign?.bus_code}</Text> ({selectedBusForAssign?.immatriculation_number})
            </Text>

            {/* Select Driver */}
            <Text style={styles.inputLabel}>Sélectionner le Chauffeur *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              {drivers.map((d) => (
                <Pressable
                  key={d.user_id}
                  style={[styles.selectorChip, selectedDriverId === d.user_id && styles.selectorChipActive]}
                  onPress={() => setSelectedDriverId(d.user_id)}
                >
                  <MaterialIcons
                    name="person"
                    size={16}
                    color={selectedDriverId === d.user_id ? '#ffffff' : colors.onSurface}
                  />
                  <Text style={[styles.selectorText, selectedDriverId === d.user_id && styles.selectorTextActive]}>
                    {d.first_name} {d.last_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Select Route */}
            <Text style={styles.inputLabel}>Sélectionner la Ligne de Campus *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              {routes.map((r) => (
                <Pressable
                  key={r.route_id}
                  style={[styles.selectorChip, selectedRouteId === r.route_id && styles.selectorChipActive]}
                  onPress={() => setSelectedRouteId(r.route_id)}
                >
                  <MaterialIcons
                    name="alt-route"
                    size={16}
                    color={selectedRouteId === r.route_id ? '#ffffff' : colors.onSurface}
                  />
                  <Text style={[styles.selectorText, selectedRouteId === r.route_id && styles.selectorTextActive]}>
                    {r.route_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAssignModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <PrimaryButton
                label={assigning ? 'Attribution...' : 'Confirmer l\'Attribution'}
                icon="check"
                onPress={handleAssignBus}
                disabled={assigning}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.containerMargin, paddingBottom: spacing.sm, gap: spacing.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 10 },
  title: { ...typography.headlineLg, color: colors.onSurface, fontSize: 20, fontWeight: '700' },
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  tabBtnActive: { backgroundColor: colors.surfaceContainerLowest },
  tabBtnText: { fontSize: 11, fontWeight: '600', color: colors.onSurfaceVariant },
  tabBtnTextActive: { color: colors.primary, fontWeight: '700' },
  list: { padding: spacing.containerMargin, gap: spacing.sm, paddingBottom: spacing.xl },
  card: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surfaceContainer },
  rowBetween: { flexDirection: 'row', alignItems: 'center' },
  busCodeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface },
  itemSub: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: colors.outlineVariant },
  busMetricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricText: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 11 },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  assignBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
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
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  modalTitle: { ...typography.headlineSm, fontSize: 17, color: colors.onSurface },
  assignSubtitle: { fontSize: 13, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.onSurface, marginTop: spacing.xs },
  modalInput: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.onSurface,
  },
  selectorRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  selectorChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  selectorTextActive: {
    color: '#ffffff',
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { ...typography.labelCaps, color: colors.onSurface, fontSize: 12 },
});
