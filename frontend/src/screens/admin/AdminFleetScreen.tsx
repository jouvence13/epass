import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
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
  const [stops, setStops] = useState<any[]>([]);

  // Modal Create Bus
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [newBusCode, setNewBusCode] = useState('');
  const [newImmat, setNewImmat] = useState('');
  const [newCap, setNewCap] = useState('50');
  const [creatingBus, setCreatingBus] = useState(false);

  // Modal Assign Bus
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBusForAssign, setSelectedBusForAssign] = useState<any | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // Modal Create Route
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newOriginStopId, setNewOriginStopId] = useState('');
  const [newDestStopId, setNewDestStopId] = useState('');
  const [newRouteDuration, setNewRouteDuration] = useState('35');
  const [newRoutePrice, setNewRoutePrice] = useState('250');
  const [creatingRoute, setCreatingRoute] = useState(false);

  // Modal Quick Create Stop
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [newStopLat, setNewStopLat] = useState('6.4474');
  const [newStopLon, setNewStopLon] = useState('2.3557');
  const [creatingStop, setCreatingStop] = useState(false);

  // Modal Add Stop to Route
  const [showAddStopToRouteModal, setShowAddStopToRouteModal] = useState(false);
  const [selectedRouteForStop, setSelectedRouteForStop] = useState<any | null>(null);
  const [targetStopId, setTargetStopId] = useState('');
  const [stopOrder, setStopOrder] = useState('2');
  const [stopEtaMin, setStopEtaMin] = useState('10');
  const [stopConnection, setStopConnection] = useState('');
  const [addingStopToRoute, setAddingStopToRoute] = useState(false);

  // Modal Create Trip / Rotation
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [tripRouteId, setTripRouteId] = useState('');
  const [tripBusId, setTripBusId] = useState('');
  const [tripDriverId, setTripDriverId] = useState('');
  const [tripTime, setTripTime] = useState('08:00');
  const [tripSeats, setTripSeats] = useState('50');
  const [creatingTrip, setCreatingTrip] = useState(false);

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
      const headers: Record<string, string> = {
        'ngrok-skip-browser-warning': 'true',
      };
      if (token && token !== 'cookie_session' && token !== 'cached_session') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const [busesRes, routesRes, tripsRes, driversRes, campusesRes, stopsRes] = await Promise.all([
        fetch(ENDPOINTS.ADMIN_FLEET, { credentials: 'include', headers }),
        fetch(ENDPOINTS.ADMIN_ROUTES, { credentials: 'include', headers }),
        fetch(ENDPOINTS.ADMIN_TRIPS, { credentials: 'include', headers }),
        fetch(`${ENDPOINTS.ADMIN_USERS}?role=DRIVER`, { credentials: 'include', headers }),
        fetch(ENDPOINTS.CAMPUSES, { credentials: 'include', headers }),
        fetch(ENDPOINTS.ADMIN_STOPS, { credentials: 'include', headers }),
      ]);

      if (busesRes.ok) setBuses(await busesRes.json());
      if (routesRes.ok) {
        const rData = await routesRes.json();
        setRoutes(rData);
        if (rData.length > 0 && !selectedRouteId) setSelectedRouteId(rData[0].route_id);
        if (rData.length > 0 && !tripRouteId) setTripRouteId(rData[0].route_id);
      }
      if (tripsRes.ok) setTrips(await tripsRes.json());
      if (driversRes.ok) {
        const dData = await driversRes.json();
        setDrivers(dData);
        if (dData.length > 0 && !selectedDriverId) setSelectedDriverId(dData[0].user_id);
        if (dData.length > 0 && !tripDriverId) setTripDriverId(dData[0].user_id);
      }
      if (campusesRes.ok) setCampuses(await campusesRes.json());
      if (stopsRes.ok) {
        const sData = await stopsRes.json();
        setStops(sData);
        if (sData.length > 0 && !newOriginStopId) setNewOriginStopId(sData[0].stop_id);
        if (sData.length > 1 && !newDestStopId) setNewDestStopId(sData[1].stop_id);
        if (sData.length > 0 && !targetStopId) setTargetStopId(sData[0].stop_id);
      }
    } catch (e) {
      console.warn('Error fetching fleet data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedDriverId, selectedRouteId, tripRouteId, tripDriverId, newOriginStopId, newDestStopId, targetStopId]);

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

    setCreatingBus(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

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
      setCreatingBus(false);
    }
  };

  const handleCreateStop = async () => {
    if (!newStopName.trim()) {
      Alert.alert('Champs requis', 'Nom de l’arrêt obligatoire.');
      return;
    }

    setCreatingStop(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(ENDPOINTS.ADMIN_CREATE_STOP, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          stop_name: newStopName.trim(),
          latitude: parseFloat(newStopLat) || 6.4474,
          longitude: parseFloat(newStopLon) || 2.3557,
        }),
      });

      if (res.ok) {
        const stopObj = await res.json();
        showToast({
          title: 'Arrêt Créé !',
          message: `L'arrêt ${stopObj.stop_name} est maintenant disponible.`,
          type: 'success',
          category: 'GENERAL',
        });
        setShowAddStopModal(false);
        setNewStopName('');
        await fetchFleetData();
      } else {
        const err = await res.json().catch(() => null);
        Alert.alert('Erreur', err?.detail || 'Impossible de créer l’arrêt.');
      }
    } catch (e) {
      Alert.alert('Erreur Réseau', 'Impossible de joindre le serveur.');
    } finally {
      setCreatingStop(false);
    }
  };

  const handleCreateRoute = async () => {
    if (!newRouteName.trim() || !newOriginStopId || !newDestStopId) {
      Alert.alert('Champs requis', 'Veuillez saisir le nom de ligne, l’arrêt de départ et l’arrêt d’arrivée.');
      return;
    }
    if (newOriginStopId === newDestStopId) {
      Alert.alert('Erreur', 'L’arrêt de départ et l’arrêt d’arrivée doivent être différents.');
      return;
    }

    setCreatingRoute(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(ENDPOINTS.ADMIN_CREATE_ROUTE, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          route_name: newRouteName.trim(),
          origin_stop_id: newOriginStopId,
          destination_stop_id: newDestStopId,
          base_price: parseFloat(newRoutePrice) || 250,
          estimated_duration_minutes: parseInt(newRouteDuration, 10) || 35,
          is_active: true,
        }),
      });

      if (res.ok) {
        const rData = await res.json();
        showToast({
          title: 'Ligne Enregistrée !',
          message: `La ligne "${rData.route_name}" a été fixée avec succès.`,
          type: 'success',
          category: 'GENERAL',
        });
        setShowAddRouteModal(false);
        setNewRouteName('');
        await fetchFleetData();
      } else {
        const err = await res.json().catch(() => null);
        Alert.alert('Erreur', err?.detail || 'Impossible de créer la ligne.');
      }
    } catch (e) {
      Alert.alert('Erreur Réseau', 'Impossible de joindre le serveur.');
    } finally {
      setCreatingRoute(false);
    }
  };

  const handleAddStopToRoute = async () => {
    if (!selectedRouteForStop || !targetStopId) {
      Alert.alert('Champs incomplets', 'Veuillez sélectionner un arrêt.');
      return;
    }

    setAddingStopToRoute(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(ENDPOINTS.ADMIN_ADD_ROUTE_STOP(selectedRouteForStop.route_id), {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          stop_id: targetStopId,
          stop_order: parseInt(stopOrder, 10) || 2,
          estimated_minutes_from_origin: parseInt(stopEtaMin, 10) || 10,
          connection_label: stopConnection.trim() || null,
        }),
      });

      if (res.ok) {
        showToast({
          title: 'Arrêt Ajouté à la Ligne !',
          message: 'L\'arrêt intermédiaire a été ajouté à l\'itinéraire.',
          type: 'success',
          category: 'GENERAL',
        });
        setShowAddStopToRouteModal(false);
        await fetchFleetData();
      } else {
        const err = await res.json().catch(() => null);
        Alert.alert('Erreur', err?.detail || 'Impossible d\'ajouter l\'arrêt.');
      }
    } catch (e) {
      Alert.alert('Erreur Réseau', 'Impossible de joindre le serveur.');
    } finally {
      setAddingStopToRoute(false);
    }
  };

  const handleDeleteRoute = (route: any) => {
    Alert.alert(
      'Désactiver la Ligne',
      `Voulez-vous vraiment désactiver la ligne "${route.route_name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désactiver',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers: Record<string, string> = {};
              if (token) headers['Authorization'] = `Bearer ${token}`;
              const res = await fetch(ENDPOINTS.ADMIN_DELETE_ROUTE(route.route_id), {
                method: 'DELETE',
                credentials: 'include',
                headers,
              });
              if (res.ok) {
                showToast({
                  title: 'Ligne Désactivée',
                  message: `La ligne ${route.route_name} est désormais inactive.`,
                  type: 'info',
                  category: 'GENERAL',
                });
                await fetchFleetData();
              }
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de désactiver la ligne.');
            }
          },
        },
      ]
    );
  };

  const handleCreateTrip = async () => {
    if (!tripRouteId || !tripBusId || !tripDriverId) {
      Alert.alert('Champs incomplets', 'Veuillez sélectionner la ligne, le bus et le chauffeur.');
      return;
    }

    setCreatingTrip(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const now = new Date();
      const [h, m] = tripTime.split(':').map((x) => parseInt(x, 10) || 0);
      const depDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);

      const res = await fetch(ENDPOINTS.ADMIN_CREATE_TRIP, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          route_id: tripRouteId,
          bus_id: tripBusId,
          driver_id: tripDriverId,
          departure_time: depDate.toISOString(),
          estimated_arrival_time: new Date(depDate.getTime() + 45 * 60000).toISOString(),
          total_seats: parseInt(tripSeats, 10) || 50,
        }),
      });

      if (res.ok) {
        showToast({
          title: 'Rotation Programmée !',
          message: `Le départ de ${tripTime} a été planifié avec succès.`,
          type: 'success',
          category: 'GENERAL',
        });
        setShowAddTripModal(false);
        await fetchFleetData();
      } else {
        const err = await res.json().catch(() => null);
        Alert.alert('Erreur', err?.detail || 'Impossible de créer la rotation.');
      }
    } catch (e) {
      Alert.alert('Erreur Réseau', 'Impossible de joindre le serveur.');
    } finally {
      setCreatingTrip(false);
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
            <Text style={styles.eyebrow}>INFRASTRUCTURE & OPÉRATIONS (CAMPUS / SUPERADMIN)</Text>
            <Text style={styles.title}>Flotte & Itinéraires de Campus</Text>
          </View>
          {activeTab === 'BUSES' && (
            <Pressable style={styles.addBtn} onPress={() => setShowAddBusModal(true)}>
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.addBtnText}>Nouveau Bus</Text>
            </Pressable>
          )}
          {activeTab === 'ROUTES' && (
            <Pressable style={styles.addBtn} onPress={() => setShowAddRouteModal(true)}>
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.addBtnText}>Nouvelle Ligne</Text>
            </Pressable>
          )}
          {activeTab === 'TRIPS' && (
            <Pressable style={styles.addBtn} onPress={() => setShowAddTripModal(true)}>
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.addBtnText}>Nouvelle Rotation</Text>
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
              Lignes & Arrêts ({routes.length})
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

      {/* Main Content */}
      {activeTab === 'BUSES' ? (
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
                  <Text style={styles.itemSub}>Immat: {item.immatriculation_number} • Capacité : {item.max_capacity} pl.</Text>
                </View>
                <Badge
                  label={item.status}
                  tone={item.status === 'OPERATIONAL' ? 'success' : item.status === 'MAINTENANCE' ? 'warning' : 'neutral'}
                />
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.busMetricRow}>
                <Text style={styles.metricText}>
                  Chauffeur : <Text style={{ fontWeight: '700' }}>{item.current_driver_id ? 'Assigné' : 'Non Assigné'}</Text>
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
          renderItem={({ item }) => {
            const sortedStops = item.route_stops ? [...item.route_stops].sort((a: any, b: any) => a.stop_order - b.stop_order) : [];
            return (
              <Card style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={[styles.busCodeCircle, { backgroundColor: '#e0f2fe' }]}>
                    <MaterialIcons name="alt-route" size={24} color="#0284c7" />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.itemTitle}>{item.route_name}</Text>
                    <Text style={styles.itemSub}>
                      {item.origin_stop?.stop_name || 'Départ'} ↔ {item.destination_stop?.stop_name || 'Arrivée'}
                    </Text>
                  </View>
                  <Badge label={`${item.base_price || 250} FCFA`} tone="primary" />
                </View>

                {/* Stops sequence preview */}
                <View style={styles.stopsSeqBox}>
                  <Text style={styles.stopsSeqTitle}>
                    Itinéraire ({sortedStops.length > 0 ? sortedStops.length : 2} arrêts • ~{item.estimated_duration_minutes} min) :
                  </Text>
                  <View style={styles.stopsSeqList}>
                    {sortedStops.length > 0 ? (
                      sortedStops.map((rs: any, idx: number) => (
                        <View key={rs.route_stop_id || idx} style={styles.stopChip}>
                          <Text style={styles.stopChipOrder}>{rs.stop_order}</Text>
                          <Text style={styles.stopChipName}>{rs.stop?.stop_name || 'Arrêt'}</Text>
                          {rs.estimated_minutes_from_origin !== undefined && (
                            <Text style={styles.stopChipTime}>+{rs.estimated_minutes_from_origin}m</Text>
                          )}
                        </View>
                      ))
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.stopsSeqEmpty}>
                          {item.origin_stop?.stop_name || 'Départ'} (0m) ➔ {item.destination_stop?.stop_name || 'Arrivée'} ({item.estimated_duration_minutes}m)
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Pressable
                    style={styles.addStopToRouteBtn}
                    onPress={() => {
                      setSelectedRouteForStop(item);
                      setStopOrder(String((sortedStops.length || 2) + 1));
                      setShowAddStopToRouteModal(true);
                    }}
                  >
                    <MaterialIcons name="add-location-alt" size={14} color={colors.primary} />
                    <Text style={styles.addStopToRouteText}>Ajouter Arrêt</Text>
                  </Pressable>

                  <Pressable
                    style={styles.deleteRouteBtn}
                    onPress={() => handleDeleteRoute(item)}
                  >
                    <MaterialIcons name="delete-outline" size={14} color={colors.error} />
                    <Text style={styles.deleteRouteText}>Désactiver</Text>
                  </Pressable>
                </View>
              </Card>
            );
          }}
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
                  <Text style={styles.itemTitle}>{item.route?.route_name || 'Rotation Campus'}</Text>
                  <Text style={styles.itemSub}>
                    Départ : {new Date(item.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • Bus: {item.bus?.bus_code || 'Navette'}
                  </Text>
                </View>
                <Badge label={item.status} tone={item.status === 'SCHEDULED' ? 'primary' : 'success'} />
              </View>
              <View style={styles.cardDivider} />
              <Text style={styles.metricText}>
                Places restantes : <Text style={{ fontWeight: '700' }}>{item.available_seats} / {item.total_seats}</Text>
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
                <Badge label={item.is_active ? 'ACTIF' : 'INACTIF'} tone={item.is_active ? 'success' : 'neutral'} />
              </View>
              <View style={styles.cardDivider} />
              <Text style={styles.metricText}>
                Pôles & Arrêts enregistrés : <Text style={{ fontWeight: '700' }}>{item.landmarks?.length || 0} points d'intérêt</Text>
              </Text>
            </Card>
          )}
        />
      )}

      {/* Modal Add Route (Ligne) */}
      <Modal visible={showAddRouteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="alt-route" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Créer un Itinéraire / Ligne</Text>
            </View>

            <Text style={styles.inputLabel}>Nom de la Ligne *</Text>
            <TextInput
              value={newRouteName}
              onChangeText={setNewRouteName}
              placeholder="Ex: Campus Calavi ↔ Parakou Centre"
              placeholderTextColor={colors.outline}
              style={styles.modalInput}
            />

            {/* Origin Stop */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.inputLabel}>Arrêt de Départ (Origine) *</Text>
              <Pressable onPress={() => setShowAddStopModal(true)}>
                <Text style={styles.quickAddStopText}>+ Nouvel Arrêt</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              {stops.map((s) => (
                <Pressable
                  key={s.stop_id}
                  style={[styles.selectorChip, newOriginStopId === s.stop_id && styles.selectorChipActive]}
                  onPress={() => setNewOriginStopId(s.stop_id)}
                >
                  <MaterialIcons name="place" size={14} color={newOriginStopId === s.stop_id ? '#fff' : colors.primary} />
                  <Text style={[styles.selectorText, newOriginStopId === s.stop_id && styles.selectorTextActive]}>
                    {s.stop_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Destination Stop */}
            <Text style={styles.inputLabel}>Arrêt d'Arrivée (Terminus) *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              {stops.map((s) => (
                <Pressable
                  key={s.stop_id}
                  style={[styles.selectorChip, newDestStopId === s.stop_id && styles.selectorChipActive]}
                  onPress={() => setNewDestStopId(s.stop_id)}
                >
                  <MaterialIcons name="flag" size={14} color={newDestStopId === s.stop_id ? '#fff' : colors.secondary} />
                  <Text style={[styles.selectorText, newDestStopId === s.stop_id && styles.selectorTextActive]}>
                    {s.stop_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Duration and Price */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Durée estimée (min) *</Text>
                <TextInput
                  value={newRouteDuration}
                  onChangeText={setNewRouteDuration}
                  placeholder="35"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  style={styles.modalInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Tarif de Base (FCFA) *</Text>
                <TextInput
                  value={newRoutePrice}
                  onChangeText={setNewRoutePrice}
                  placeholder="250"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  style={styles.modalInput}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddRouteModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <PrimaryButton
                label={creatingRoute ? 'Création...' : 'Fixer l\'Itinéraire'}
                onPress={handleCreateRoute}
                disabled={creatingRoute}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Quick Create Stop */}
      <Modal visible={showAddStopModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="add-location" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Créer un Arrêt Physique</Text>
            </View>

            <Text style={styles.inputLabel}>Nom de l'Arrêt *</Text>
            <TextInput
              value={newStopName}
              onChangeText={setNewStopName}
              placeholder="Ex: Carrefour Tankpè"
              placeholderTextColor={colors.outline}
              style={styles.modalInput}
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Latitude</Text>
                <TextInput
                  value={newStopLat}
                  onChangeText={setNewStopLat}
                  placeholder="6.4474"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  style={styles.modalInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Longitude</Text>
                <TextInput
                  value={newStopLon}
                  onChangeText={setNewStopLon}
                  placeholder="2.3557"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  style={styles.modalInput}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddStopModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <PrimaryButton
                label={creatingStop ? 'Création...' : 'Créer l\'Arrêt'}
                onPress={handleCreateStop}
                disabled={creatingStop}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Add Stop to Route */}
      <Modal visible={showAddStopToRouteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="add-location-alt" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Ajouter un Arrêt Intermédiaire</Text>
            </View>
            <Text style={styles.assignSubtitle}>
              Ligne : <Text style={{ fontWeight: '700', color: colors.primary }}>{selectedRouteForStop?.route_name}</Text>
            </Text>

            <Text style={styles.inputLabel}>Sélectionner l'Arrêt *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              {stops.map((s) => (
                <Pressable
                  key={s.stop_id}
                  style={[styles.selectorChip, targetStopId === s.stop_id && styles.selectorChipActive]}
                  onPress={() => setTargetStopId(s.stop_id)}
                >
                  <Text style={[styles.selectorText, targetStopId === s.stop_id && styles.selectorTextActive]}>
                    {s.stop_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Ordre (ex: 2, 3) *</Text>
                <TextInput
                  value={stopOrder}
                  onChangeText={setStopOrder}
                  placeholder="2"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  style={styles.modalInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Temps depuis départ (min) *</Text>
                <TextInput
                  value={stopEtaMin}
                  onChangeText={setStopEtaMin}
                  placeholder="10"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  style={styles.modalInput}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Correspondance Éventuelle (Optionnel)</Text>
            <TextInput
              value={stopConnection}
              onChangeText={setStopConnection}
              placeholder="Ex: Ligne B"
              placeholderTextColor={colors.outline}
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddStopToRouteModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <PrimaryButton
                label={addingStopToRoute ? 'Ajout...' : 'Insérer dans la Ligne'}
                onPress={handleAddStopToRoute}
                disabled={addingStopToRoute}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Add Trip (Rotation) */}
      <Modal visible={showAddTripModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="schedule" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Programmer une Rotation</Text>
            </View>

            {/* Select Route */}
            <Text style={styles.inputLabel}>Sélectionner la Ligne *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              {routes.map((r) => (
                <Pressable
                  key={r.route_id}
                  style={[styles.selectorChip, tripRouteId === r.route_id && styles.selectorChipActive]}
                  onPress={() => setTripRouteId(r.route_id)}
                >
                  <Text style={[styles.selectorText, tripRouteId === r.route_id && styles.selectorTextActive]}>
                    {r.route_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Select Bus */}
            <Text style={styles.inputLabel}>Sélectionner la Navette *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              {buses.map((b) => (
                <Pressable
                  key={b.bus_id}
                  style={[styles.selectorChip, tripBusId === b.bus_id && styles.selectorChipActive]}
                  onPress={() => setTripBusId(b.bus_id)}
                >
                  <Text style={[styles.selectorText, tripBusId === b.bus_id && styles.selectorTextActive]}>
                    {b.bus_code}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Select Driver */}
            <Text style={styles.inputLabel}>Sélectionner le Chauffeur *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
              {drivers.map((d) => (
                <Pressable
                  key={d.user_id}
                  style={[styles.selectorChip, tripDriverId === d.user_id && styles.selectorChipActive]}
                  onPress={() => setTripDriverId(d.user_id)}
                >
                  <Text style={[styles.selectorText, tripDriverId === d.user_id && styles.selectorTextActive]}>
                    {d.first_name} {d.last_name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Heure de Départ (HH:MM)</Text>
                <TextInput
                  value={tripTime}
                  onChangeText={setTripTime}
                  placeholder="08:00"
                  placeholderTextColor={colors.outline}
                  style={styles.modalInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Quota Places</Text>
                <TextInput
                  value={tripSeats}
                  onChangeText={setTripSeats}
                  placeholder="50"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  style={styles.modalInput}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddTripModal(false)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <PrimaryButton
                label={creatingTrip ? 'Planification...' : 'Planifier la Rotation'}
                onPress={handleCreateTrip}
                disabled={creatingTrip}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>

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
                label={creatingBus ? 'Création...' : 'Créer le Bus'}
                onPress={handleCreateBus}
                disabled={creatingBus}
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
    paddingHorizontal: 8,
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
  stopsSeqBox: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 4,
  },
  stopsSeqTitle: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  stopsSeqList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  stopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stopChipOrder: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: '#ffffff',
    width: 14,
    height: 14,
    borderRadius: 7,
    textAlign: 'center',
    lineHeight: 14,
  },
  stopChipName: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSurface,
  },
  stopChipTime: {
    fontSize: 9,
    color: colors.secondary,
    fontWeight: '700',
  },
  stopsSeqEmpty: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  addStopToRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addStopToRouteText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: '#fee2e2',
  },
  deleteRouteText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
  quickAddStopText: {
    ...typography.labelCaps,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
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
    paddingBottom: spacing.xl + 8,
    gap: spacing.sm,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalTitle: { ...typography.headlineSm, color: colors.onSurface, fontSize: 18 },
  inputLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 10, marginTop: 4 },
  modalInput: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    fontSize: 14,
    color: colors.onSurface,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 4,
  },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  selectorChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectorText: { ...typography.bodySm, color: colors.onSurface, fontSize: 12 },
  selectorTextActive: { color: '#ffffff', fontWeight: '700' },
  assignSubtitle: { ...typography.bodySm, color: colors.onSurfaceVariant },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cancelBtnText: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 12 },
});
