import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

interface RouteStop {
  id: string;
  name: string;
  status: 'passed' | 'current' | 'upcoming';
  time: string;
  etaMinutes?: number;
  connection?: string;
}

interface BusLineConfig {
  id: string;
  name: string;
  code: string;
  busNumber: string;
  occupancy: string;
  speed: string;
  currentLocation: string;
  nextStop: string;
  nextStopEta: string;
  totalEta: string;
  stops: RouteStop[];
}

const BUS_LINES: Record<string, BusLineConfig> = {
  LIGNE_A: {
    id: 'LIGNE_A',
    name: 'Campus Express',
    code: 'Ligne A (Calavi ↔ Cotonou)',
    busNumber: 'Bus CROUS #402',
    occupancy: '32/50 places (64%)',
    speed: '42 km/h',
    currentLocation: 'Entre IITA et Godomey',
    nextStop: 'Échangeur Godomey',
    nextStopEta: '3 min',
    totalEta: '18 min',
    stops: [
      { id: 's1', name: 'Campus UAC Calavi (Terminus)', status: 'passed', time: '07:35' },
      { id: 's2', name: 'Carrefour IITA', status: 'passed', time: '07:42' },
      { id: 's3', name: 'Échangeur Godomey', status: 'current', time: '07:48', etaMinutes: 3, connection: 'Ligne B' },
      { id: 's4', name: 'Stade Général Mathieu Kérékou', status: 'upcoming', time: '07:56', etaMinutes: 11 },
      { id: 's5', name: 'Place Bulgarie', status: 'upcoming', time: '08:03', etaMinutes: 18 },
      { id: 's6', name: 'Cotonou Étoile Rouge (Terminus)', status: 'upcoming', time: '08:12', etaMinutes: 27 },
    ],
  },
  LIGNE_B: {
    id: 'LIGNE_B',
    name: 'Navette Godomey',
    code: 'Ligne B (Calavi ↔ Godomey)',
    busNumber: 'Bus CROUS #218',
    occupancy: '44/50 places (88%)',
    speed: '35 km/h',
    currentLocation: 'Carrefour KPOTA',
    nextStop: 'Marché Godomey',
    nextStopEta: '5 min',
    totalEta: '12 min',
    stops: [
      { id: 'b1', name: 'Campus UAC Calavi', status: 'passed', time: '08:00' },
      { id: 'b2', name: 'Carrefour KPOTA', status: 'passed', time: '08:08' },
      { id: 'b3', name: 'Marché Godomey', status: 'current', time: '08:14', etaMinutes: 5 },
      { id: 'b4', name: 'Échangeur Godomey (Terminus)', status: 'upcoming', time: '08:22', etaMinutes: 12 },
    ],
  },
  LIGNE_C: {
    id: 'LIGNE_C',
    name: 'Trans-Lagune',
    code: 'Ligne C (Calavi ↔ Akpakpa)',
    busNumber: 'Bus CROUS #305',
    occupancy: '28/50 places (56%)',
    speed: '48 km/h',
    currentLocation: 'Carrefour Vêdoko',
    nextStop: 'Carrefour Toyota',
    nextStopEta: '4 min',
    totalEta: '22 min',
    stops: [
      { id: 'c1', name: 'Campus UAC Calavi', status: 'passed', time: '07:15' },
      { id: 'c2', name: 'Carrefour Vêdoko', status: 'passed', time: '07:32' },
      { id: 'c3', name: 'Carrefour Toyota', status: 'current', time: '07:38', etaMinutes: 4 },
      { id: 'c4', name: 'Dantokpa Grand Marché', status: 'upcoming', time: '07:46', etaMinutes: 12 },
      { id: 'c5', name: 'Akpakpa Sacré-Cœur (Terminus)', status: 'upcoming', time: '07:55', etaMinutes: 21 },
    ],
  },
};

export default function ActiveTicketScreen() {
  const { user, activeTicket } = useAuth();
  const [selectedLineKey, setSelectedLineKey] = useState<'LIGNE_A' | 'LIGNE_B' | 'LIGNE_C'>('LIGNE_A');

  const activeLine = BUS_LINES[selectedLineKey];

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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Bannière Info Trafic */}
        <View style={styles.alertBanner}>
          <MaterialIcons name="info-outline" size={22} color={colors.onErrorContainer} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Information Trafic : Réseau CROUS</Text>
            <Text style={styles.alertBody}>Circulation fluide sur la RNIE 2 entre le Campus d'Abomey-Calavi et Cotonou.</Text>
          </View>
        </View>

        {/* Carte du Ticket QR */}
        <Card floating style={styles.ticketCard}>
          <View style={styles.validBadge}>
            <MaterialIcons
              name={isApproved ? 'check-circle' : user?.kyc_status === 'PENDING' ? 'schedule' : 'info'}
              size={14}
              color={colors.onSecondary}
            />
            <Text style={styles.validText}>
              {isApproved ? 'Ticket Valide & Payé' : user?.kyc_status === 'PENDING' ? 'KYC En Attente' : 'KYC Non Soumis'}
            </Text>
          </View>
          <Text style={styles.route}>{activeTicket?.route || activeLine.code}</Text>
          <Text style={styles.studentId}>
            {activeTicket?.line || activeLine.name} • {activeTicket?.busId || activeLine.busNumber} • Matricule : {user?.matricule_uac || 'UAC-2024-XXXX'}
          </Text>

          <View style={styles.qrWrap}>
            <View style={styles.qrBox}>
              <QRCode
                value={`CROUS-UAC-TICKET-${user?.matricule_uac || 'ETUDIANT'}-${activeTicket?.code || 'A7B9-X2M4'}`}
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
            label="Recycler mon Ticket"
            icon="recycling"
            variant="muted"
            onPress={() => Alert.alert('Ticket Universitaire', 'Votre ticket a été replacé dans la file active.')}
            style={{ width: '100%' }}
          />
          <Text style={styles.availFor}>
            Valable pour la journée en cours • Payé via {activeTicket?.paymentMethod || 'Portefeuille CROUS'} (100 FCFA)
          </Text>
        </Card>

        {/* ========================================================================= */}
        {/* SUIVI GPS EN DIRECT & TRAJET SUR LA CARTE                                 */}
        {/* ========================================================================= */}
        <Card style={styles.mapCard}>
          {/* Header de la carte avec sélecteur de ligne */}
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapTitle}>Suivi GPS & Trajet en Temps Réel</Text>
              <Text style={styles.hint}>{activeLine.busNumber} • Remplissage : {activeLine.occupancy}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.eta}>{activeLine.nextStopEta}</Text>
              <Text style={styles.etaLabel}>Prochain Arrêt</Text>
            </View>
          </View>

          {/* Onglets de sélection de ligne */}
          <View style={styles.lineTabs}>
            <Pressable
              style={[styles.lineTab, selectedLineKey === 'LIGNE_A' && styles.lineTabActive]}
              onPress={() => setSelectedLineKey('LIGNE_A')}
            >
              <Text style={[styles.lineTabText, selectedLineKey === 'LIGNE_A' && styles.lineTabTextActive]}>
                Ligne A (Calavi ↔ Cotonou)
              </Text>
            </Pressable>
            <Pressable
              style={[styles.lineTab, selectedLineKey === 'LIGNE_B' && styles.lineTabActive]}
              onPress={() => setSelectedLineKey('LIGNE_B')}
            >
              <Text style={[styles.lineTabText, selectedLineKey === 'LIGNE_B' && styles.lineTabTextActive]}>
                Ligne B (Godomey)
              </Text>
            </Pressable>
            <Pressable
              style={[styles.lineTab, selectedLineKey === 'LIGNE_C' && styles.lineTabActive]}
              onPress={() => setSelectedLineKey('LIGNE_C')}
            >
              <Text style={[styles.lineTabText, selectedLineKey === 'LIGNE_C' && styles.lineTabTextActive]}>
                Ligne C (Akpakpa)
              </Text>
            </Pressable>
          </View>

          {/* Aire de la carte stylisée */}
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

            {/* Arrêt Départ Calavi */}
            <View style={[styles.mapStopMarker, { left: '8%', top: '55%' }]}>
              <View style={[styles.stopDot, styles.stopDotPassed]} />
              <Text style={styles.stopMapLabel}>Campus UAC</Text>
            </View>

            {/* Arrêt Intermédiaire 1 */}
            <View style={[styles.mapStopMarker, { left: '32%', top: '48%' }]}>
              <View style={[styles.stopDot, styles.stopDotPassed]} />
              <Text style={styles.stopMapLabel}>IITA</Text>
            </View>

            {/* Arrêt Intermédiaire 2 (Prochain arrêt) */}
            <View style={[styles.mapStopMarker, { left: '56%', top: '41%' }]}>
              <View style={[styles.stopDot, styles.stopDotActive]} />
              <Text style={[styles.stopMapLabel, { color: colors.primary, fontWeight: '700' }]}>
                {activeLine.nextStop}
              </Text>
            </View>

            {/* Arrêt Terminus Cotonou */}
            <View style={[styles.mapStopMarker, { left: '82%', top: '34%' }]}>
              <View style={[styles.stopDot, styles.stopDotUpcoming]} />
              <Text style={styles.stopMapLabel}>Terminus</Text>
            </View>

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
          {/* DÉTAIL DU TRAJET & DESTINATIONS SUR LE CHEMIN                              */}
          {/* ========================================================================= */}
          <View style={styles.stopsTimelineContainer}>
            <View style={styles.stopsTimelineHeader}>
              <MaterialIcons name="alt-route" size={20} color={colors.primary} />
              <Text style={styles.stopsTimelineTitle}>Destinations & Arrêts sur le chemin</Text>
            </View>

            <View style={styles.timelineList}>
              {activeLine.stops.map((stop, index) => {
                const isLast = index === activeLine.stops.length - 1;
                return (
                  <View key={stop.id} style={styles.stopRow}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.lg },
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
    paddingTop: spacing.xl,
    borderTopWidth: 4,
    borderTopColor: colors.primary,
  },
  validBadge: {
    position: 'absolute',
    top: -14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  validText: { ...typography.labelCaps, color: colors.onSecondary },
  route: { ...typography.headlineMd, color: colors.primary, marginTop: spacing.sm, textAlign: 'center' },
  studentId: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg },
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
    transform: [{ translateX: -12 }],
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
});
