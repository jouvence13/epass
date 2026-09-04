import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import PrimaryButton from '../../components/PrimaryButton';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface Slot {
  time: string;
  route: string;
  seats: string;
  full: boolean;
}

const SLOTS: Slot[] = [
  { time: '07:30 - Rotation Matin', route: 'Ligne A (Calavi ↔ Cotonou)', seats: '32/50 places', full: false },
  { time: '08:15 - Rotation Express', route: 'Ligne B (Calavi ↔ Godomey)', seats: '50/50 places', full: true },
  { time: '09:00 - Rotation Campus', route: 'Ligne A (Calavi ↔ Cotonou)', seats: '18/50 places', full: false },
  { time: '12:30 - Rotation Midi', route: 'Ligne C (Calavi ↔ Akpakpa)', seats: '40/50 places', full: false },
];

export default function BookTicketScreen({ navigation }: any) {
  const { user, walletBalance, operatorPhoneNumbers, debitWallet, busSlots, purchaseTicket } = useAuth();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<'SCAN_QR' | 'MANUAL_BOOKING'>('SCAN_QR');

  // État du Scan QR
  const [isScanning, setIsScanning] = useState(true);
  const [scannedBusData, setScannedBusData] = useState<{
    busId: string;
    line: string;
    route: string;
    price: number;
  } | null>(null);

  // Moyen de paiement
  const [paymentOperator, setPaymentOperator] = useState<'MTN' | 'MOOV' | 'CELTIIS' | 'WALLET'>('MTN');
  const [phone, setPhone] = useState(operatorPhoneNumbers.MTN || '+2290157774305');
  const [isProcessing, setIsProcessing] = useState(false);

  // Synchronisation automatique du numéro de téléphone lors du changement d'opérateur
  const handleSelectOperator = (op: 'MTN' | 'MOOV' | 'CELTIIS' | 'WALLET') => {
    setPaymentOperator(op);
    if (op !== 'WALLET') {
      const savedNumber = operatorPhoneNumbers[op] || user?.phone_number || '+2290157774305';
      setPhone(savedNumber);
    }
  };

  // État Réservation Manuelle
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [departure, setDeparture] = useState('Calavi Campus');
  const [destination, setDestination] = useState('Cotonou Centre');

  // Animation laser du scanner QR
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeTab === 'SCAN_QR' && isScanning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [activeTab, isScanning, scanLineAnim]);

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 190],
  });

  const handleSimulateScan = () => {
    setIsScanning(false);
    setScannedBusData({
      busId: 'Bus CROUS #402',
      line: 'Ligne A (Express Campus)',
      route: 'Calavi Campus → Cotonou Étoile Rouge',
      price: 100, // Tarif subventionné
    });
  };

  const handleResetScan = () => {
    setScannedBusData(null);
    setIsScanning(true);
  };

  const handleConfirmPayment = (priceOverride?: number) => {
    const price = priceOverride || scannedBusData?.price || 100;
    const isQR = activeTab === 'SCAN_QR';
    const currentSlot = busSlots[selectedSlot] || busSlots[0];
    const targetLine = isQR ? scannedBusData?.line || 'Ligne A (Express Campus)' : currentSlot.route;
    const targetRoute = isQR ? scannedBusData?.route || 'Calavi Campus → Cotonou Étoile Rouge' : `${departure} → ${destination}`;
    const targetBus = isQR ? scannedBusData?.busId || 'Bus CROUS #402' : 'Bus CROUS #402';
    const slotId = isQR ? 'slot-1' : currentSlot.id;

    if (paymentOperator === 'WALLET') {
      if (walletBalance < price) {
        Alert.alert(
          'Solde CROUS Insuffisant',
          `Votre solde actuel (${walletBalance.toLocaleString(
            'fr-FR'
          )} FCFA) est insuffisant pour régler ce titre de ${price} FCFA. Veuillez recharger votre portefeuille.`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Recharger mon Portefeuille',
              onPress: () => navigation.navigate('Moyens de Paiement'),
            },
          ]
        );
        showToast({
          title: 'Solde Insuffisant',
          message: `Solde CROUS: ${walletBalance} F. Recharge requise.`,
          type: 'error',
          category: 'WALLET',
        });
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const success = debitWallet(price);
        if (success) {
          // Création et enregistrement du ticket actif + décompte des places
          const createdTicket = purchaseTicket({
            line: targetLine,
            route: targetRoute,
            busId: targetBus,
            price,
            paymentMethod: 'Portefeuille CROUS',
            slotId,
          });

          showToast({
            title: 'Titre Validé en Temps Réel !',
            message: `${price} FCFA débités du Portefeuille CROUS. Ticket code: ${createdTicket.code}`,
            type: 'success',
            category: 'WALLET',
          });

          Alert.alert(
            'Paiement Portefeuille Réussi !',
            `Votre titre de transport (${createdTicket.code}) a été validé avec succès. Vous pouvez le retrouver sur l'accueil et monter à bord.`,
            [
              {
                text: 'Voir mon Ticket Actif',
                onPress: () => navigation.navigate('Tickets'),
              },
            ]
          );
        }
      }, 800);
      return;
    }

    // Paiement Mobile Money (MTN, Moov, Celtiis)
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      Alert.alert('Numéro Requis', 'Veuillez renseigner un numéro de téléphone Mobile Money valide.');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const opName =
        paymentOperator === 'MTN'
          ? 'MTN Mobile Money (*880#)'
          : paymentOperator === 'MOOV'
          ? 'Moov Money (*855#)'
          : 'Celtiis Cash (*888#)';

      const createdTicket = purchaseTicket({
        line: targetLine,
        route: targetRoute,
        busId: targetBus,
        price,
        paymentMethod: opName,
        slotId,
      });

      showToast({
        title: 'Titre Validé avec Succès !',
        message: `${price} FCFA réglés via ${opName} (${cleanPhone}).`,
        type: 'success',
        category: 'PAYMENT',
      });

      Alert.alert(
        'Paiement Réussi !',
        `Votre titre de transport (${createdTicket.code}) a été validé avec succès via ${opName}. Il est maintenant disponible sur votre accueil.`,
        [
          {
            text: 'Voir mon Ticket Actif',
            onPress: () => navigation.navigate('Tickets'),
          },
        ]
      );
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Onglets de sélection de méthode */}
        <View style={styles.modeTabsRow}>
          <Pressable
            style={[styles.modeTab, activeTab === 'SCAN_QR' && styles.modeTabActive]}
            onPress={() => setActiveTab('SCAN_QR')}
          >
            <MaterialIcons
              name="qr-code-scanner"
              size={20}
              color={activeTab === 'SCAN_QR' ? colors.onPrimary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.modeTabText,
                activeTab === 'SCAN_QR' && styles.modeTabTextActive,
              ]}
            >
              Scanner Borne / Bus
            </Text>
          </Pressable>

          <Pressable
            style={[styles.modeTab, activeTab === 'MANUAL_BOOKING' && styles.modeTabActive]}
            onPress={() => setActiveTab('MANUAL_BOOKING')}
          >
            <MaterialIcons
              name="event-seat"
              size={20}
              color={activeTab === 'MANUAL_BOOKING' ? colors.onPrimary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.modeTabText,
                activeTab === 'MANUAL_BOOKING' && styles.modeTabTextActive,
              ]}
            >
              Réserver Trajet
            </Text>
          </Pressable>
        </View>

        {/* ========================================================================= */}
        {/* MODE 1 : SCANNER QR CODE DE LA BORNE DU BUS                               */}
        {/* ========================================================================= */}
        {activeTab === 'SCAN_QR' ? (
          <>
            {!scannedBusData ? (
              <Card style={styles.scannerCard}>
                <Text style={styles.scannerTitle}>Scannez le QR Code pour Payer</Text>
                <Text style={styles.scannerSub}>
                  Pointez votre appareil vers le QR Code affiché sur la borne de l'arrêt de bus ou auprès du chauffeur.
                </Text>

                {/* Viseur Caméra & Animation Laser */}
                <View style={styles.viewfinder}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  {/* Faisceau laser animé */}
                  <Animated.View
                    style={[
                      styles.laserLine,
                      { transform: [{ translateY }] },
                    ]}
                  />

                  <MaterialIcons name="qr-code-2" size={90} color="rgba(0,104,55,0.25)" />
                </View>

                <PrimaryButton
                  label="Déclencher le scan du QR Code"
                  icon="qr-code-scanner"
                  onPress={handleSimulateScan}
                  style={{ width: '100%', marginTop: spacing.md }}
                />

                <Text style={styles.scannerHint}>
                  Fonctionne instantanément avec les bornes intelligentes du réseau CROUS-UAC.
                </Text>
              </Card>
            ) : (
              /* Détection du bus et confirmation de paiement */
              <Card style={styles.resultCard}>
                <View style={styles.busDetectedHeader}>
                  <View style={styles.busIconBadge}>
                    <MaterialIcons name="directions-bus" size={28} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Badge label="Borne Bus Détectée" tone="success" icon="check-circle" />
                    <Text style={styles.busDetectedTitle}>{scannedBusData.line}</Text>
                    <Text style={styles.busDetectedSub}>{scannedBusData.busId}</Text>
                  </View>
                  <Pressable style={styles.rescanBtn} onPress={handleResetScan}>
                    <MaterialIcons name="refresh" size={20} color={colors.primary} />
                    <Text style={styles.rescanText}>Scanner à nouveau</Text>
                  </Pressable>
                </View>

                <View style={styles.tripSummaryBox}>
                  <View style={styles.tripSummaryRow}>
                    <Text style={styles.tripSummaryLabel}>Trajet :</Text>
                    <Text style={styles.tripSummaryVal}>{scannedBusData.route}</Text>
                  </View>
                  <View style={styles.tripSummaryRow}>
                    <Text style={styles.tripSummaryLabel}>Tarif étudiant CROUS :</Text>
                    <Text style={[styles.tripSummaryVal, { color: colors.primary, fontSize: 18 }]}>
                      {scannedBusData.price} FCFA
                    </Text>
                  </View>
                  <View style={styles.tripSummaryRow}>
                    <Text style={styles.tripSummaryLabel}>Statut subvention :</Text>
                    <Text style={[styles.tripSummaryVal, { color: colors.tertiary }]}>
                      {user?.kyc_status === 'APPROVED' ? 'Tarif Subventionné (100 F)' : 'Tarif Standard (250 F)'}
                    </Text>
                  </View>
                </View>

                {/* Choix de l'Opérateur de Paiement */}
                <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
                  CHOISIR LE MOYEN DE PAIEMENT
                </Text>

                <View style={styles.operatorGrid}>
                  {/* MTN */}
                  <Pressable
                    style={[
                      styles.operatorTile,
                      paymentOperator === 'MTN' && styles.operatorTileActive,
                    ]}
                    onPress={() => handleSelectOperator('MTN')}
                  >
                    <View style={[styles.operatorBadge, { backgroundColor: '#fbbf24' }]}>
                      <Text style={styles.operatorBadgeText}>MTN</Text>
                    </View>
                    <Text style={styles.operatorTileTitle}>MTN MoMo</Text>
                    <Text style={styles.operatorTileCode}>*880#</Text>
                  </Pressable>

                  {/* MOOV */}
                  <Pressable
                    style={[
                      styles.operatorTile,
                      paymentOperator === 'MOOV' && styles.operatorTileActive,
                    ]}
                    onPress={() => handleSelectOperator('MOOV')}
                  >
                    <View style={[styles.operatorBadge, { backgroundColor: '#0284c7' }]}>
                      <Text style={[styles.operatorBadgeText, { color: '#ffffff' }]}>Moov</Text>
                    </View>
                    <Text style={styles.operatorTileTitle}>Moov Money</Text>
                    <Text style={styles.operatorTileCode}>*855#</Text>
                  </Pressable>

                  {/* CELTIIS */}
                  <Pressable
                    style={[
                      styles.operatorTile,
                      paymentOperator === 'CELTIIS' && styles.operatorTileActive,
                    ]}
                    onPress={() => handleSelectOperator('CELTIIS')}
                  >
                    <View style={[styles.operatorBadge, { backgroundColor: '#0070ba' }]}>
                      <Text style={[styles.operatorBadgeText, { color: '#ffffff' }]}>Celtiis</Text>
                    </View>
                    <Text style={styles.operatorTileTitle}>Celtiis Cash</Text>
                    <Text style={styles.operatorTileCode}>*888#</Text>
                  </Pressable>

                  {/* PORTEFEUILLE CROUS */}
                  <Pressable
                    style={[
                      styles.operatorTile,
                      paymentOperator === 'WALLET' && styles.operatorTileActive,
                    ]}
                    onPress={() => handleSelectOperator('WALLET')}
                  >
                    <View style={[styles.operatorBadge, { backgroundColor: colors.primary }]}>
                      <MaterialIcons name="account-balance-wallet" size={16} color="#ffffff" />
                    </View>
                    <Text style={styles.operatorTileTitle}>Portefeuille</Text>
                    <Text style={styles.operatorTileCode}>Solde: {walletBalance.toLocaleString('fr-FR')} F</Text>
                  </Pressable>
                </View>

                {paymentOperator !== 'WALLET' && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
                      Numéro Mobile Money débité :
                    </Text>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="ex: 0197001122"
                      placeholderTextColor={colors.outline}
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                  </>
                )}

                <PrimaryButton
                  label={
                    isProcessing
                      ? 'Validation en cours...'
                      : paymentOperator === 'WALLET'
                      ? `Payer avec mon Portefeuille (${scannedBusData.price} FCFA)`
                      : `Confirmer et Payer ${scannedBusData.price} FCFA`
                  }
                  icon={paymentOperator === 'WALLET' ? 'account-balance-wallet' : 'check'}
                  variant="gold"
                  onPress={() => handleConfirmPayment(scannedBusData.price)}
                  disabled={isProcessing}
                  style={{ marginTop: spacing.lg }}
                />
              </Card>
            )}
          </>
        ) : (
          /* ========================================================================= */
          /* MODE 2 : RÉSERVATION MANUELLE DE TRAJET À L'AVANCE                        */
          /* ========================================================================= */
          <>
            <Card style={styles.section}>
              <Text style={styles.sectionLabel}>CHOIX DU TRAJET</Text>
              <View style={styles.routeRow}>
                <MaterialIcons name="trip-origin" size={20} color={colors.primary} />
                <View style={styles.select}>
                  <Text style={styles.selectText}>{departure}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeRow}>
                <MaterialIcons name="location-on" size={20} color={colors.error} />
                <View style={styles.select}>
                  <Text style={styles.selectText}>{destination}</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionLabel}>ROTATIONS DISPONIBLES (AUJOURD'HUI)</Text>
              {busSlots.map((s, i) => (
                <Pressable
                  key={s.id}
                  disabled={s.full}
                  onPress={() => setSelectedSlot(i)}
                  style={[
                    styles.slot,
                    s.full ? styles.slotFull : selectedSlot === i ? styles.slotActive : null,
                  ]}
                >
                  <View style={styles.slotLeft}>
                    <View
                      style={[
                        styles.radio,
                        selectedSlot === i && !s.full ? styles.radioActive : null,
                      ]}
                    />
                    <View>
                      <Text
                        style={[
                          styles.slotTime,
                          s.full && { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {s.time}
                      </Text>
                      <Text style={styles.slotRouteSub}>{s.route}</Text>
                      <View style={styles.slotSeatsRow}>
                        <MaterialIcons
                          name={s.full ? 'person-off' : 'groups'}
                          size={14}
                          color={s.full ? colors.error : colors.onSurfaceVariant}
                        />
                        <Text
                          style={[
                            styles.slotSeats,
                            { color: s.full ? colors.error : colors.onSurfaceVariant },
                          ]}
                        >
                          {' '}
                          {s.bookedSeats}/{s.totalSeats} places
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Badge
                    label={s.full ? 'Complet' : 'Disponible'}
                    tone={s.full ? 'error' : 'success'}
                  />
                </Pressable>
              ))}
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionLabel}>MOYEN DE PAIEMENT</Text>
              <View style={styles.operatorGrid}>
                <Pressable
                  style={[
                    styles.operatorTile,
                    paymentOperator === 'MTN' && styles.operatorTileActive,
                  ]}
                  onPress={() => handleSelectOperator('MTN')}
                >
                  <View style={[styles.operatorBadge, { backgroundColor: '#fbbf24' }]}>
                    <Text style={styles.operatorBadgeText}>MTN</Text>
                  </View>
                  <Text style={styles.operatorTileTitle}>MTN MoMo</Text>
                  <Text style={styles.operatorTileCode}>*880#</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.operatorTile,
                    paymentOperator === 'MOOV' && styles.operatorTileActive,
                  ]}
                  onPress={() => handleSelectOperator('MOOV')}
                >
                  <View style={[styles.operatorBadge, { backgroundColor: '#0284c7' }]}>
                    <Text style={[styles.operatorBadgeText, { color: '#ffffff' }]}>Moov</Text>
                  </View>
                  <Text style={styles.operatorTileTitle}>Moov Money</Text>
                  <Text style={styles.operatorTileCode}>*855#</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.operatorTile,
                    paymentOperator === 'CELTIIS' && styles.operatorTileActive,
                  ]}
                  onPress={() => handleSelectOperator('CELTIIS')}
                >
                  <View style={[styles.operatorBadge, { backgroundColor: '#0070ba' }]}>
                    <Text style={[styles.operatorBadgeText, { color: '#ffffff' }]}>Celtiis</Text>
                  </View>
                  <Text style={styles.operatorTileTitle}>Celtiis Cash</Text>
                  <Text style={styles.operatorTileCode}>*888#</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.operatorTile,
                    paymentOperator === 'WALLET' && styles.operatorTileActive,
                  ]}
                  onPress={() => handleSelectOperator('WALLET')}
                >
                  <View style={[styles.operatorBadge, { backgroundColor: colors.primary }]}>
                    <MaterialIcons name="account-balance-wallet" size={16} color="#ffffff" />
                  </View>
                  <Text style={styles.operatorTileTitle}>Portefeuille</Text>
                  <Text style={styles.operatorTileCode}>Solde: {walletBalance.toLocaleString('fr-FR')} F</Text>
                </Pressable>
              </View>

              {paymentOperator !== 'WALLET' && (
                <>
                  <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>
                    Numéro de téléphone :
                  </Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="ex: 0197001122"
                    placeholderTextColor={colors.outline}
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                </>
              )}
            </Card>

            <PrimaryButton
              label={
                isProcessing
                  ? 'Validation en cours...'
                  : paymentOperator === 'WALLET'
                  ? `Payer avec mon Portefeuille (100 FCFA)`
                  : 'Réserver & Payer (100 FCFA)'
              }
              icon={paymentOperator === 'WALLET' ? 'account-balance-wallet' : 'confirmation-number'}
              variant="gold"
              onPress={() => handleConfirmPayment(100)}
              disabled={isProcessing}
              style={{ marginTop: spacing.sm }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  modeTabsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  modeTabActive: {
    backgroundColor: colors.primary,
  },
  modeTabText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: colors.onPrimary,
  },
  scannerCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  scannerTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: spacing.xs },
  scannerSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  viewfinder: {
    width: 220,
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginVertical: spacing.md,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 6 },
  laserLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: '#eab308',
    borderRadius: 2,
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  scannerHint: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  resultCard: { borderWidth: 1.5, borderColor: colors.primary, padding: spacing.lg },
  busDetectedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  busIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busDetectedTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface, marginTop: 2 },
  busDetectedSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  rescanBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: spacing.xs },
  rescanText: { ...typography.bodySm, color: colors.primary, fontWeight: '700' },
  tripSummaryBox: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  tripSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripSummaryLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  tripSummaryVal: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700' },
  section: { gap: spacing.sm, borderWidth: 1, borderColor: colors.surfaceVariant },
  sectionLabel: { ...typography.labelCaps, color: colors.primary, marginBottom: spacing.xs },
  inputLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  operatorGrid: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  operatorTile: {
    flex: 1,
    minWidth: '46%',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    gap: 2,
  },
  operatorTileActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixed,
  },
  operatorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  operatorBadgeText: { fontSize: 11, fontWeight: '800', color: '#000000' },
  operatorTileTitle: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
  operatorTileCode: { ...typography.bodySm, fontSize: 11, color: colors.onSurfaceVariant },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  routeLine: { width: 2, height: 16, backgroundColor: colors.outlineVariant, marginLeft: 9 },
  select: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  selectText: { ...typography.bodyLg, color: colors.onSurface },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  slotActive: { borderColor: colors.primary, backgroundColor: colors.surfaceContainerLowest },
  slotFull: { backgroundColor: colors.surfaceDim, opacity: 0.7 },
  slotLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  slotTime: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  slotRouteSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  slotSeatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  slotSeats: { ...typography.bodyMd },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.outlineVariant },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.bodyLg,
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
});
