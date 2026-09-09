import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Alert,
  Pressable,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth, StudentTicket } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS } from '../../config/api';

export interface RouteStop {
  id: string;
  name: string;
  status: 'passed' | 'current' | 'upcoming';
  time: string;
  etaMinutes?: number;
  connection?: string;
}

export interface BusLineConfig {
  id: string;
  routeId?: string;
  name: string;
  code: string;
  origin?: string;
  destination?: string;
  busNumber: string;
  occupancy: string;
  speed: string;
  currentLocation: string;
  nextStop: string;
  nextStopEta: string;
  totalEta: string;
  stops: RouteStop[];
}

export default function ActiveTicketScreen({ navigation }: any) {
  const { user, token, tickets, activeTicket, setActiveTicket, busSlots, recycleTicket, refreshTickets } = useAuth();
  const { showToast } = useNotifications();

  // Lignes et arrêts de bus 100% dynamiques chargés depuis le Backend API / Base de données
  const [busLines, setBusLines] = useState<Record<string, BusLineConfig>>({});
  const [loadingLines, setLoadingLines] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveLines = async () => {
    try {
      const headers: Record<string, string> = {
        'ngrok-skip-browser-warning': 'true',
      };
      if (token && token !== 'cookie_session' && token !== 'cached_session') {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.LIVE_LINES, {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setBusLines(data);
        }
      }
    } catch (e) {
      console.warn('Live lines fetch error:', e);
    } finally {
      setLoadingLines(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveLines();
  }, [token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLiveLines(), refreshTickets ? refreshTickets() : Promise.resolve()]);
  };

  // Billets actifs de l'étudiant
  const userActiveTickets = tickets.filter((t) => t.status === 'ACTIVE');

  // Trouver la ligne correspondante dans les données retournées par le backend
  const findMatchingLineKey = (t?: StudentTicket | null): string => {
    if (!t) {
      const firstKey = Object.keys(busLines)[0];
      return firstKey || '';
    }

    // 1. Match direct par routeId / id
    if (t.routeId && busLines[t.routeId]) return t.routeId;
    if (t.id && busLines[t.id]) return t.id;

    // 2. Match direct par nom de ligne ou route
    if (t.line && busLines[t.line]) return t.line;
    if (t.route && busLines[t.route]) return t.route;

    // 3. Match partiel / textuel sur les noms de ligne fixés par l'admin
    const tLineText = `${t.line || ''} ${t.route || ''}`.toLowerCase();
    for (const [key, line] of Object.entries(busLines)) {
      const lName = (line.name || '').toLowerCase();
      const lCode = (line.code || '').toLowerCase();
      if (
        (lName && tLineText.includes(lName)) ||
        (lCode && tLineText.includes(lCode)) ||
        (line.origin && tLineText.includes(line.origin.toLowerCase()))
      ) {
        return key;
      }
    }

    // 4. Premier disponible
    return Object.keys(busLines)[0] || '';
  };

  const [selectedLineKey, setSelectedLineKey] = useState<string>('');

  useEffect(() => {
    const matchedKey = findMatchingLineKey(activeTicket);
    if (matchedKey) {
      setSelectedLineKey(matchedKey);
    }
  }, [activeTicket?.id, busLines]);

  // Ensemble des clés de ligne pour les billets actifs de l'étudiant
  const availableLineKeys = useMemo(() => {
    const keys = new Set<string>();
    userActiveTickets.forEach((t) => {
      const k = findMatchingLineKey(t);
      if (k) keys.add(k);
    });
    return Array.from(keys);
  }, [userActiveTickets, busLines]);

  // Construction de la configuration active de ligne (dynamique 100%)
  const activeLine: BusLineConfig = useMemo(() => {
    if (selectedLineKey && busLines[selectedLineKey]) {
      return busLines[selectedLineKey];
    }
    const firstAvailable = Object.values(busLines)[0];
    if (firstAvailable) {
      return firstAvailable;
    }

    // Structure dynamique basée sur le ticket actif
    const routeName = activeTicket?.route || activeTicket?.line || 'Ligne Campus Universitaire';
    return {
      id: activeTicket?.id || 'dynamic-line',
      name: routeName,
      code: routeName,
      busNumber: activeTicket?.busId || 'Bus Campus',
      occupancy: 'En rotation',
      speed: '40 km/h',
      currentLocation: 'Campus Universitaire',
      nextStop: 'Arrêt suivant',
      nextStopEta: '5 min',
      totalEta: '30 min',
      stops: [
        { id: 'st-orig', name: 'Départ Campus (Terminus)', status: 'passed', time: '07:30' },
        { id: 'st-mid', name: 'Arrêt Intermédiaire', status: 'current', time: '07:45', etaMinutes: 5 },
        { id: 'st-dest', name: 'Terminus Destination', status: 'upcoming', time: '08:00', etaMinutes: 20 },
      ],
    };
  }, [selectedLineKey, busLines, activeTicket]);

  // État du Modal de Recyclage
  const [recycleModalVisible, setRecycleModalVisible] = useState(false);
  const [selectedTargetSlotId, setSelectedTargetSlotId] = useState<string>('slot-2');
  const [isRecycling, setIsRecycling] = useState(false);

  // Animations
  const pulse = useRef(new Animated.Value(0)).current;
  const busMoveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    const moveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(busMoveAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(busMoveAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    moveLoop.start();
    return () => moveLoop.stop();
  }, [busMoveAnim]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  const busTranslateX = busMoveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-15, 20],
  });

  const isApproved = user?.kyc_status === 'APPROVED';
  const isPending = user?.kyc_status === 'PENDING';
  const isRecycled = Boolean(activeTicket?.recycleCount && activeTicket.recycleCount >= 1);

  const handleOpenRecycleModal = () => {
    if (!activeTicket) {
      Alert.alert('Aucun Ticket', 'Vous n\'avez aucun titre de transport actif à recycler.');
      return;
    }
    if (isRecycled) {
      Alert.alert(
        'Recyclage Non Autorisé',
        "Ce ticket a déjà fait l'objet d'un report. Selon la réglementation universitaire, un seul recyclage est autorisé par titre (limite J+7)."
      );
      return;
    }
    const firstAvailable = busSlots.find((s) => !s.full) || busSlots[0];
    if (firstAvailable) {
      setSelectedTargetSlotId(firstAvailable.id);
    }
    setRecycleModalVisible(true);
  };

  const handleConfirmRecycle = async () => {
    if (!activeTicket) return;
    setIsRecycling(true);
    const res = await recycleTicket(activeTicket.id, selectedTargetSlotId);
    setIsRecycling(false);
    setRecycleModalVisible(false);

    if (res.success && res.ticket) {
      showToast({
        title: 'Ticket Recyclé !',
        message: `Votre billet a été reporté vers ${res.ticket.timeSlot}. Nouveau code : ${res.ticket.code}`,
        type: 'success',
        category: 'GENERAL',
      });
      Alert.alert(
        'Recyclage Effectué !',
        `Votre titre de transport a été reporté avec succès.\n\n• Nouveau Code : ${res.ticket.code}\n• Nouveau créneau : ${res.ticket.timeSlot}\n• Nouveau QR Code sécurisé généré.`
      );
    } else {
      Alert.alert('Erreur de Recyclage', res.error || 'Impossible de recycler le ticket.');
    }
  };

  // VERROUILLAGE KYC : Si le KYC n'est pas validé, accès bloqué
  if (!isApproved) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Card floating style={styles.kycLockCard}>
            <View style={[styles.kycLockIconBox, isPending ? styles.kycPendingBox : styles.kycRestrictedBox]}>
              <MaterialIcons
                name={isPending ? 'pending-actions' : 'lock-outline'}
                size={48}
                color={isPending ? '#d97706' : colors.error}
              />
            </View>

            <Text style={styles.kycLockTitle}>
              {isPending
                ? 'Dossier Étudiant en Examen'
                : 'Certification Étudiante Requise'}
            </Text>

            <Text style={styles.kycLockDesc}>
              {isPending
                ? "Votre dossier académique est en cours de vérification par les agents d'administration. Dès approbation, vos billets actifs, QR code de validation et outils de suivi GPS s’afficheront ici."
                : 'Conformément aux règles du transport universitaire au Bénin, l’émission des titres de transport, le QR code de contrôle et le suivi GPS des navettes en temps réel nécessitent un profil étudiant certifié.'}
            </Text>

            {!isPending && (
              <View style={styles.kycRequirementsCard}>
                <Text style={styles.kycRequirementsTitle}>Documents requis :</Text>
                <View style={styles.kycReqItem}>
                  <MaterialIcons name="check-circle" size={16} color={colors.primary} />
                  <Text style={styles.kycReqText}>Carte d’Étudiant Béninoise (valide)</Text>
                </View>
                <View style={styles.kycReqItem}>
                  <MaterialIcons name="check-circle" size={16} color={colors.primary} />
                  <Text style={styles.kycReqText}>Certificat d’Identification Personnelle (CIP) ou CNI</Text>
                </View>
              </View>
            )}

            <PrimaryButton
              label={isPending ? 'Vérifier l’État de mon Dossier' : 'Certifier mon Profil Étudiant (KYC)'}
              icon={isPending ? 'visibility' : 'verified-user'}
              variant={isPending ? 'outline' : 'primary'}
              onPress={() => navigation?.navigate('KycOnboarding')}
              style={{ width: '100%', marginTop: spacing.md }}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Sélecteur de Ticket dynamique (Scrollable horizontalement pour supporter 2, 5, 10+ tickets) */}
        {userActiveTickets.length > 1 && (
          <View style={styles.ticketSwitcherContainer}>
            <View style={styles.ticketSwitcherHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="confirmation-number" size={16} color={colors.primary} />
                <Text style={styles.ticketSwitcherTitle}>
                  Mes Titres Disponibles ({userActiveTickets.length})
                </Text>
              </View>
              <Text style={styles.ticketSwitcherCounter}>
                Affichage : {userActiveTickets.findIndex((t) => t.id === activeTicket?.id) + 1} / {userActiveTickets.length}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ticketSwitcherScroll}
            >
              {userActiveTickets.map((t, idx) => {
                const isSelected = activeTicket?.id === t.id;
                const isItemRecycled = Boolean(t.recycleCount && t.recycleCount >= 1);
                return (
                  <Pressable
                    key={t.id}
                    style={[styles.ticketSwitcherTab, isSelected && styles.ticketSwitcherTabActive]}
                    onPress={() => {
                      setActiveTicket(t);
                      const key = findMatchingLineKey(t);
                      if (key) setSelectedLineKey(key);
                    }}
                  >
                    <MaterialIcons
                      name={isItemRecycled ? 'recycling' : 'confirmation-number'}
                      size={16}
                      color={isSelected ? colors.onPrimary : colors.primary}
                    />
                    <View style={{ flexShrink: 1 }}>
                      <Text style={[styles.ticketSwitcherText, isSelected && styles.ticketSwitcherTextActive]}>
                        Ticket #{idx + 1} ({t.code})
                      </Text>
                      <Text
                        style={[styles.ticketSwitcherSubtext, isSelected && styles.ticketSwitcherSubtextActive]}
                        numberOfLines={1}
                      >
                        {t.line ? t.line.replace('Campus Express • ', '') : t.route || 'Ligne Campus'}
                      </Text>
                    </View>
                    {isItemRecycled && (
                      <View style={[styles.recycledPill, isSelected && styles.recycledPillActive]}>
                        <Text style={[styles.recycledPillText, isSelected && styles.recycledPillTextActive]}>
                          Reporté
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Bannière Info Trafic */}
        <View style={styles.alertBanner}>
          <MaterialIcons name="info-outline" size={22} color={colors.onErrorContainer} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Information Trafic : Réseau Universitaire</Text>
            <Text style={styles.alertBody}>Itinéraires officiels synchronisés avec la base de données du campus.</Text>
          </View>
        </View>

        {/* Carte du Ticket QR */}
        <Card floating style={styles.ticketCard}>
          <View style={styles.ticketCardBadgesRow}>
            <Badge
              label={isApproved ? `Ticket Valide (${activeTicket?.price || 100} F)` : user?.kyc_status === 'PENDING' ? 'KYC En Attente' : 'KYC Non Soumis'}
              tone={isApproved ? 'success' : 'warning'}
              icon={isApproved ? 'check-circle' : user?.kyc_status === 'PENDING' ? 'schedule' : 'info'}
            />
            {isRecycled && (
              <Badge label="Reporté / Recyclé (1/1)" tone="primary" icon="recycling" />
            )}
          </View>
          <Text style={styles.route}>{activeTicket?.route || activeLine.code || activeLine.name}</Text>
          <Text style={styles.studentId}>
            {activeTicket?.line || activeLine.name} • {activeTicket?.busId || activeLine.busNumber} • Matricule : {user?.matricule_uac || 'ETUDIANT-BENIN'}
          </Text>

          <View style={styles.qrWrap}>
            <View style={styles.qrBox}>
              <QRCode
                value={`EPASS-BENIN-TICKET-${user?.matricule_uac || 'ETUDIANT'}-${activeTicket?.code || 'A7B9-X2M4'}`}
                size={160}
                color={colors.onBackground}
                backgroundColor={colors.white}
              />
            </View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                { transform: [{ scale: ringScale }], opacity: ringOpacity },
              ]}
            />
          </View>

          <Text style={styles.code}>{activeTicket?.code || 'A7B9-X2M4'}</Text>

          <PrimaryButton
            label={isRecycled ? 'Ticket Déjà Recyclé (1/1 Max)' : 'Recycler / Reporter mon Ticket'}
            icon="recycling"
            variant={isRecycled ? 'muted' : 'gold'}
            disabled={isRecycled}
            onPress={handleOpenRecycleModal}
            style={{ width: '100%' }}
          />
          <Text style={styles.availFor}>
            Valable pour la journée en cours • Payé via {activeTicket?.paymentMethod || 'Portefeuille Campus'} ({activeTicket?.price || 100} FCFA)
          </Text>
        </Card>

        {/* ========================================================================= */}
        {/* SUIVI GPS EN DIRECT & TRAJET SUR LA CARTE (100% ISSU DE LA BASE DE DONNÉES) */}
        {/* ========================================================================= */}
        <Card style={styles.mapCard}>
          {/* Header de la carte avec sélecteur de ligne */}
          <View style={styles.mapHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapTitle}>Suivi GPS & Trajet en Temps Réel</Text>
              <Text style={styles.hint}>
                {activeLine.busNumber} ({activeLine.name}) • Remplissage : {activeLine.occupancy}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.eta}>{activeLine.nextStopEta}</Text>
              <Text style={styles.etaLabel}>Prochain Arrêt</Text>
            </View>
          </View>

          {/* Bandeau d'exclusivité du bus suivi */}
          <View style={styles.exclusiveTrackBadge}>
            <MaterialIcons name="radar" size={16} color={colors.primary} />
            <Text style={styles.exclusiveTrackText}>
              Suivi en direct du bus réservé pour votre ticket ({activeTicket?.code || 'Actif'})
            </Text>
          </View>

          {/* Onglets de sélection de ligne : Uniquement si l'étudiant a plusieurs tickets sur des lignes distinctes */}
          {availableLineKeys.length > 1 && (
            <View style={styles.lineTabs}>
              {availableLineKeys.map((key) => {
                const lineInfo = busLines[key] || { code: key, name: key };
                const isActive = selectedLineKey === key;
                return (
                  <Pressable
                    key={key}
                    style={[styles.lineTab, isActive && styles.lineTabActive]}
                    onPress={() => setSelectedLineKey(key)}
                  >
                    <Text style={[styles.lineTabText, isActive && styles.lineTabTextActive]}>
                      {lineInfo.name || lineInfo.code}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Aire de la carte stylisée avec repères dynamiques */}
          <View style={styles.mapArea}>
            {/* Grille de repères */}
            <View style={[StyleSheet.absoluteFill, styles.mapGrid]}>
              {Array.from({ length: 24 }).map((_, i) => (
                <View key={i} style={styles.mapCell} />
              ))}
            </View>

            {/* Tracé principal de la route */}
            <View style={styles.routeMainRoad} />
            <View style={styles.routeDashedLine} />

            {/* Arrêts positionnés 100% dynamiquement à partir de la liste des arrêts en base de données */}
            {activeLine.stops && activeLine.stops.length > 0 && (
              activeLine.stops.map((stop, idx) => {
                const total = Math.max(1, activeLine.stops.length - 1);
                const leftPct = Math.round((idx / total) * 78 + 8);
                const topPct = Math.round(55 - (idx / total) * 20);

                const isCurrent = stop.status === 'current';
                const isPassed = stop.status === 'passed';

                return (
                  <View
                    key={stop.id || idx}
                    style={[
                      styles.mapStopMarker,
                      { left: `${leftPct}%`, top: `${topPct}%` },
                    ]}
                  >
                    <View
                      style={[
                        styles.stopDot,
                        isPassed && styles.stopDotPassed,
                        isCurrent && styles.stopDotActive,
                        !isPassed && !isCurrent && styles.stopDotUpcoming,
                      ]}
                    />
                    <Text
                      style={[
                        styles.stopMapLabel,
                        isCurrent && { color: colors.primary, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {stop.name.replace(' (Terminus)', '')}
                    </Text>
                  </View>
                );
              })
            )}

            {/* Bus en mouvement animé */}
            <Animated.View
              style={[
                styles.busMarker,
                { transform: [{ translateX: busTranslateX }] },
              ]}
            >
              <MaterialIcons name="directions-bus" size={24} color={colors.onPrimary} />
              <View style={styles.navBadge}>
                <MaterialIcons name="navigation" size={10} color={colors.primary} />
              </View>
            </Animated.View>

            {/* Badge de Télémétrie en direct */}
            <View style={styles.telemetryOverlay}>
              <View style={styles.telemetryItem}>
                <MaterialIcons name="speed" size={14} color={colors.primary} />
                <Text style={styles.telemetryText}>{activeLine.speed}</Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryItem}>
                <MaterialIcons name="my-location" size={14} color={colors.secondary} />
                <Text style={styles.telemetryText}>{activeLine.currentLocation}</Text>
              </View>
            </View>
          </View>

          {/* ========================================================================= */}
          {/* DÉTAIL DU TRAJET & DESTINATIONS SUR LE CHEMIN (BASE DE DONNÉES)           */}
          {/* ========================================================================= */}
          <View style={styles.stopsTimelineContainer}>
            <View style={styles.stopsTimelineHeader}>
              <MaterialIcons name="alt-route" size={20} color={colors.primary} />
              <Text style={styles.stopsTimelineTitle}>
                Destinations & Arrêts sur l'Itinéraire ({activeLine.stops?.length || 0})
              </Text>
            </View>

            <View style={styles.timelineList}>
              {activeLine.stops && activeLine.stops.map((stop, index) => {
                const isLast = index === activeLine.stops.length - 1;
                return (
                  <View key={stop.id || index} style={styles.stopRow}>
                    {/* Colonne heure / ETA */}
                    <View style={styles.stopTimeCol}>
                      <Text
                        style={[
                          styles.stopTimeText,
                          stop.status === 'current' && { color: colors.primary, fontWeight: '700' },
                        ]}
                      >
                        {stop.time}
                      </Text>
                      {stop.etaMinutes !== undefined && (
                        <Text style={styles.stopEtaBadge}>
                          {stop.status === 'current' ? `Dans ${stop.etaMinutes} min` : `+${stop.etaMinutes} min`}
                        </Text>
                      )}
                    </View>

                    {/* Ligne verticale & Puce d'état */}
                    <View style={styles.stopIndicatorCol}>
                      <View
                        style={[
                          styles.stopIndicatorDot,
                          stop.status === 'passed' && styles.dotPassed,
                          stop.status === 'current' && styles.dotCurrent,
                          stop.status === 'upcoming' && styles.dotUpcoming,
                        ]}
                      >
                        <MaterialIcons
                          name={
                            stop.status === 'passed'
                              ? 'check'
                              : stop.status === 'current'
                              ? 'directions-bus'
                              : 'radio-button-unchecked'
                          }
                          size={12}
                          color={
                            stop.status === 'passed'
                              ? '#ffffff'
                              : stop.status === 'current'
                              ? '#ffffff'
                              : colors.outline
                          }
                        />
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.stopTimelineLine,
                            stop.status === 'passed' ? styles.linePassed : styles.lineUpcoming,
                          ]}
                        />
                      )}
                    </View>

                    {/* Nom de l'arrêt et statut */}
                    <View style={styles.stopDetailsCol}>
                      <Text
                        style={[
                          styles.stopName,
                          stop.status === 'current' && styles.stopNameActive,
                          stop.status === 'passed' && styles.stopNamePassed,
                        ]}
                      >
                        {stop.name}
                      </Text>
                      <View style={styles.stopBadgesRow}>
                        {stop.status === 'passed' && (
                          <Badge label="Arrêt Effectué" tone="success" icon="check" />
                        )}
                        {stop.status === 'current' && (
                          <Badge label="Prochain Arrêt" tone="primary" icon="near-me" />
                        )}
                        {stop.status === 'upcoming' && (
                          <Badge label="À Venir" tone="neutral" />
                        )}
                        {stop.connection && (
                          <View style={styles.connectionBadge}>
                            <MaterialIcons name="swap-horiz" size={12} color={colors.primary} />
                            <Text style={styles.connectionText}>Corr. {stop.connection}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET MODAL : RECYCLAGE / REPORT DU TICKET (RÈGLE J+7)              */}
      {/* ========================================================================= */}
      <Modal
        visible={recycleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRecycleModalVisible(false)}
      >
        <View style={styles.recycleModalOverlay}>
          <Pressable style={styles.recycleModalBackdrop} onPress={() => setRecycleModalVisible(false)} />
          <View style={styles.recycleModalContent}>
            <View style={styles.sheetHandle} />

            {/* En-tête */}
            <View style={styles.recycleHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="recycling" size={22} color={colors.primary} />
                  <Text style={styles.recycleSheetTitle}>Recycler mon Ticket</Text>
                </View>
                <Text style={styles.recycleSheetSub}>
                  Reportez votre billet ({activeTicket?.code}) vers une autre rotation de bus sans frais.
                </Text>
              </View>
              <Pressable onPress={() => setRecycleModalVisible(false)} style={styles.closeRecycleBtn}>
                <MaterialIcons name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>

            {/* Règle Universitaire J+7 Notice */}
            <View style={styles.recycleNoticeCard}>
              <MaterialIcons name="verified-user" size={18} color="#16a34a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.recycleNoticeTitle}>Règlement de report (J+7) :</Text>
                <Text style={styles.recycleNoticeBody}>
                  • Un (1) seul recyclage autorisé par titre.{'\n'}
                  • Votre place sur la navette initiale sera libérée.{'\n'}
                  • Nouveau QR Code et code SMS émis instantanément.
                </Text>
              </View>
            </View>

            {/* Liste des créneaux disponibles pour le report */}
            <Text style={styles.recycleSectionTitle}>CHOISIR LE NOUVEAU CRÉNEAU DE DÉPART</Text>
            <ScrollView style={{ maxHeight: 210 }} contentContainerStyle={{ gap: spacing.sm }}>
              {busSlots.map((slot) => {
                const isSelected = selectedTargetSlotId === slot.id;
                const freeSeats = Math.max(0, slot.totalSeats - slot.bookedSeats);
                return (
                  <Pressable
                    key={slot.id}
                    disabled={slot.full}
                    style={[
                      styles.recycleSlotTile,
                      isSelected && styles.recycleSlotTileActive,
                      slot.full && styles.recycleSlotTileFull,
                    ]}
                    onPress={() => setSelectedTargetSlotId(slot.id)}
                  >
                    <MaterialIcons
                      name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={20}
                      color={isSelected ? colors.primary : slot.full ? colors.outline : colors.onSurfaceVariant}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recycleSlotTime, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                        {slot.time}
                      </Text>
                      <Text style={styles.recycleSlotRoute}>{slot.route}</Text>
                    </View>
                    <Badge
                      label={slot.full ? 'Complet' : `${freeSeats} pl.`}
                      tone={slot.full ? 'error' : isSelected ? 'primary' : 'success'}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Bouton de confirmation */}
            <PrimaryButton
              label={isRecycling ? 'Recyclage en cours...' : 'Confirmer le Report vers ce Bus'}
              icon="check-circle"
              variant="gold"
              disabled={isRecycling}
              onPress={handleConfirmRecycle}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.lg },
  ticketSwitcherContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: spacing.xs,
  },
  ticketSwitcherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  ticketSwitcherTitle: {
    ...typography.labelCaps,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '800',
  },
  ticketSwitcherCounter: {
    ...typography.labelCaps,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  ticketSwitcherScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  ticketSwitcherTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    minWidth: 165,
  },
  ticketSwitcherTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketSwitcherText: {
    ...typography.labelCaps,
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: '800',
  },
  ticketSwitcherTextActive: {
    color: colors.onPrimary,
  },
  ticketSwitcherSubtext: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    maxWidth: 110,
  },
  ticketSwitcherSubtextActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  recycledPill: {
    backgroundColor: 'rgba(26, 86, 219, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  recycledPillActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  recycledPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  recycledPillTextActive: {
    color: colors.onPrimary,
  },
  alertBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  alertTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onErrorContainer },
  alertBody: { ...typography.bodyMd, color: colors.onErrorContainer, opacity: 0.9 },
  ticketCard: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 4,
    borderTopColor: colors.primary,
  },
  ticketCardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  route: { ...typography.headlineMd, color: colors.primary, marginTop: spacing.xs, textAlign: 'center' },
  studentId: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg, textAlign: 'center' },
  qrWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  qrBox: {
    width: 200,
    height: 200,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  pulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  code: {
    ...typography.statusCode,
    color: colors.primaryContainer,
    backgroundColor: colors.surfaceContainer,
    width: '100%',
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  availFor: { ...typography.labelCaps, color: colors.outline, marginTop: spacing.sm, textAlign: 'center' },
  mapCard: { padding: 0, overflow: 'hidden', borderWidth: 1, borderColor: colors.surfaceVariant },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  mapTitle: { ...typography.headlineSm, color: colors.primary },
  hint: { ...typography.bodySm, color: colors.onSurfaceVariant },
  eta: { ...typography.headlineMd, fontSize: 24, color: colors.secondary, fontWeight: '700' },
  etaLabel: { ...typography.labelCaps, color: colors.outline },
  exclusiveTrackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  exclusiveTrackText: {
    ...typography.labelCaps,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  lineTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  lineTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineTabActive: {
    backgroundColor: colors.primary,
  },
  lineTabText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  lineTabTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  mapArea: {
    height: 220,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  mapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mapCell: {
    width: '25%',
    height: '25%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  routeMainRoad: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    top: '48%',
    height: 10,
    backgroundColor: '#334155',
    borderRadius: 5,
    transform: [{ rotate: '-6deg' }],
  },
  routeDashedLine: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    top: '52%',
    height: 2,
    backgroundColor: '#38bdf8',
    transform: [{ rotate: '-6deg' }],
  },
  mapStopMarker: {
    position: 'absolute',
    alignItems: 'center',
    gap: 4,
    transform: [{ translateX: -14 }],
  },
  stopDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  stopDotPassed: {
    backgroundColor: colors.secondary,
  },
  stopDotActive: {
    backgroundColor: '#f59e0b',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
  stopDotUpcoming: {
    backgroundColor: '#94a3b8',
  },
  stopMapLabel: {
    ...typography.labelCaps,
    fontSize: 9,
    color: '#e2e8f0',
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    textAlign: 'center',
    maxWidth: 90,
  },
  busMarker: {
    position: 'absolute',
    top: '32%',
    left: '46%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  telemetryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  telemetryDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  telemetryText: {
    ...typography.bodySm,
    color: '#f8fafc',
    fontWeight: '600',
  },
  stopsTimelineContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  stopsTimelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  stopsTimelineTitle: {
    ...typography.headlineSm,
    fontSize: 15,
    color: colors.primary,
  },
  timelineList: {
    gap: 0,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stopTimeCol: {
    width: 70,
    paddingTop: 2,
    alignItems: 'flex-start',
  },
  stopTimeText: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  stopEtaBadge: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.secondary,
    fontWeight: '700',
  },
  stopIndicatorCol: {
    width: 32,
    alignItems: 'center',
  },
  stopIndicatorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotPassed: {
    backgroundColor: colors.secondary,
  },
  dotCurrent: {
    backgroundColor: colors.primary,
  },
  dotUpcoming: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
  },
  stopTimelineLine: {
    width: 2,
    height: 48,
    marginVertical: 2,
  },
  linePassed: {
    backgroundColor: colors.secondary,
  },
  lineUpcoming: {
    backgroundColor: colors.outlineVariant,
  },
  stopDetailsCol: {
    flex: 1,
    paddingBottom: spacing.md,
    gap: 4,
  },
  stopName: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.onSurface,
  },
  stopNameActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  stopNamePassed: {
    color: colors.onSurfaceVariant,
  },
  stopBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  connectionText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.primary,
  },

  // Recycle Modal Styles
  recycleModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  recycleModalBackdrop: {
    flex: 1,
  },
  recycleModalContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 8,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  recycleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  recycleSheetTitle: {
    ...typography.headlineSm,
    fontSize: 18,
    color: colors.primary,
  },
  recycleSheetSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeRecycleBtn: {
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
  },
  recycleNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  recycleNoticeTitle: {
    ...typography.bodySm,
    fontWeight: '700',
    color: '#065f46',
    fontSize: 12,
  },
  recycleNoticeBody: {
    ...typography.bodySm,
    color: '#047857',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  recycleSectionTitle: {
    ...typography.labelCaps,
    fontSize: 11,
    color: colors.outline,
    letterSpacing: 0.8,
  },
  recycleSlotTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceVariant,
  },
  recycleSlotTileActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixed,
  },
  recycleSlotTileFull: {
    opacity: 0.6,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  recycleSlotTime: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.onSurface,
  },
  recycleSlotRoute: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  kycLockCard: {
    padding: spacing.xl,
    alignItems: 'center',
    textAlign: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  kycLockIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  kycPendingBox: {
    backgroundColor: '#fef3c7',
  },
  kycRestrictedBox: {
    backgroundColor: '#fee2e2',
  },
  kycLockTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  kycLockDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: spacing.xs,
  },
  kycRequirementsCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginVertical: spacing.sm,
    gap: spacing.xs,
  },
  kycRequirementsTitle: {
    ...typography.bodySm,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  kycReqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kycReqText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
});
