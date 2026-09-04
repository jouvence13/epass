import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth, BusSlot } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export default function HomeScreen({ navigation }: any) {
  const {
    user,
    justRegistered,
    clearJustRegistered,
    tickets,
    activeTicket,
    setActiveTicket,
    walletBalance,
    operatorPhoneNumbers,
    busSlots,
    debitWallet,
    purchaseTicket,
  } = useAuth();
  const { showToast } = useNotifications();

  const studentName = user ? `${user.first_name} ${user.last_name}` : 'Étudiant';
  const activeTicketsList = tickets.filter((t) => t.status === 'ACTIVE');

  // État du Modal de Détails & Paiement de Départ (Bottom Sheet)
  const [selectedDeparture, setSelectedDeparture] = useState<BusSlot | null>(null);
  const [departureModalVisible, setDepartureModalVisible] = useState(false);
  const [paymentOp, setPaymentOp] = useState<'WALLET' | 'MTN' | 'MOOV' | 'CELTIIS'>('WALLET');
  const [phone, setPhone] = useState(operatorPhoneNumbers.MTN || '+2290157774305');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenDeparture = (slot: BusSlot) => {
    if (user?.kyc_status !== 'APPROVED') {
      const isPending = user?.kyc_status === 'PENDING';
      showToast({
        title: isPending ? 'Dossier KYC en cours' : 'Certification Requise',
        message: isPending
          ? 'Votre dossier est en cours de validation par le CROUS.'
          : 'Certifiez votre statut étudiant pour débloquer les départs subventionnés.',
        type: 'warning',
        category: 'KYC',
      });
      navigation.navigate('KycOnboarding');
      return;
    }
    setSelectedDeparture(slot);
    setPaymentOp('WALLET');
    setPhone(operatorPhoneNumbers.MTN || '+2290157774305');
    setDepartureModalVisible(true);
  };

  const handleSelectOp = (op: 'WALLET' | 'MTN' | 'MOOV' | 'CELTIIS') => {
    setPaymentOp(op);
    if (op !== 'WALLET') {
      setPhone(operatorPhoneNumbers[op] || '+2290157774305');
    }
  };

  const handleConfirmDeparturePayment = () => {
    if (!selectedDeparture) return;

    if (selectedDeparture.full) {
      Alert.alert('Bus Complet', 'Ce bus est déjà complet (50/50 places occupées). Veuillez choisir une autre rotation.');
      return;
    }

    const price = 100;

    if (paymentOp === 'WALLET') {
      if (walletBalance < price) {
        Alert.alert(
          'Solde CROUS Insuffisant',
          `Votre solde actuel (${walletBalance.toLocaleString(
            'fr-FR'
          )} FCFA) est insuffisant. Veuillez recharger votre portefeuille.`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Recharger',
              onPress: () => {
                setDepartureModalVisible(false);
                navigation.navigate('PaymentMethods');
              },
            },
          ]
        );
        showToast({
          title: 'Solde Insuffisant',
          message: 'Veuillez recharger votre portefeuille CROUS.',
          type: 'error',
          category: 'WALLET',
        });
        return;
      }

      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        const ok = debitWallet(price);
        if (ok) {
          const newTicket = purchaseTicket({
            line: `Ligne ${selectedDeparture.route}`,
            route: selectedDeparture.route,
            busId: 'Bus CROUS #402',
            price: 100,
            paymentMethod: 'Portefeuille CROUS',
            slotId: selectedDeparture.id,
          });

          setDepartureModalVisible(false);

          showToast({
            title: 'Titre Validé en Temps Réel !',
            message: `100 FCFA débités du Portefeuille CROUS. Ticket : ${newTicket.code}`,
            type: 'success',
            category: 'WALLET',
          });

          Alert.alert(
            'Place Réservée avec Succès !',
            `Votre billet (${newTicket.code}) pour le départ de ${selectedDeparture.time} est validé. Retrouvez-le sur l'accueil ou présentez le QR Code.`,
            [
              {
                text: 'Voir mon Ticket Actif',
                onPress: () => {
                  setActiveTicket(newTicket);
                  navigation.navigate('Tickets');
                },
              },
            ]
          );
        }
      }, 700);
      return;
    }

    // Mobile Money
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      Alert.alert('Numéro requis', 'Veuillez saisir un numéro de téléphone valide.');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const opName =
        paymentOp === 'MTN'
          ? 'MTN Mobile Money (*880#)'
          : paymentOp === 'MOOV'
          ? 'Moov Money (*855#)'
          : 'Celtiis Cash (*888#)';

      const newTicket = purchaseTicket({
        line: `Ligne ${selectedDeparture.route}`,
        route: selectedDeparture.route,
        busId: 'Bus CROUS #402',
        price: 100,
        paymentMethod: opName,
        slotId: selectedDeparture.id,
      });

      setDepartureModalVisible(false);

      showToast({
        title: 'Titre Validé !',
        message: `100 FCFA réglés via ${opName} (${cleanPhone}).`,
        type: 'success',
        category: 'PAYMENT',
      });

      Alert.alert(
        'Paiement Réussi !',
        `Votre billet (${newTicket.code}) a été validé avec succès.`,
        [
          {
            text: 'Voir mon Ticket Actif',
            onPress: () => {
              setActiveTicket(newTicket);
              navigation.navigate('Tickets');
            },
          },
        ]
      );
    }, 900);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ========================================================================= */}
        {/* BANNIÈRE DE BIENVENUE APRÈS INSCRIPTION (Notification éphémère)           */}
        {/* ========================================================================= */}
        {justRegistered && (
          <View style={styles.welcomeBanner}>
            <View style={styles.welcomeHeader}>
              <View style={styles.welcomeIconBadge}>
                <MaterialIcons name="celebration" size={22} color="#16a34a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.welcomeTitle}>Inscription réussie !</Text>
                <Text style={styles.welcomeSubtitle}>
                  Bienvenue <Text style={styles.bold}>{studentName}</Text> sur votre application UAC-BusPass.
                </Text>
              </View>
              <Pressable onPress={clearJustRegistered} hitSlop={10} style={styles.closeBannerBtn}>
                <MaterialIcons name="close" size={20} color="#166534" />
              </Pressable>
            </View>
          </View>
        )}

        {/* En-tête Salutation & Solde Rapide */}
        <View style={styles.greetingHeader}>
          <View style={styles.greetingWrap}>
            <Text style={styles.greeting}>Bonjour, {user?.first_name || 'Étudiant'}</Text>
            <Text style={styles.p}>Espace transit universitaire CROUS-UAC</Text>
          </View>
          <Pressable
            style={styles.walletMiniBadge}
            onPress={() => navigation.navigate('PaymentMethods')}
          >
            <MaterialIcons name="account-balance-wallet" size={16} color={colors.primary} />
            <Text style={styles.walletMiniText}>{walletBalance.toLocaleString('fr-FR')} F</Text>
          </Pressable>
        </View>

        {/* ========================================================================= */}
        {/* BANNIÈRE D'ÉTAT DU KYC ACADÉMIQUE                                         */}
        {/* ========================================================================= */}
        {user?.kyc_status !== 'APPROVED' && (
          <View
            style={[
              styles.homeKycCard,
              user?.kyc_status === 'PENDING' ? styles.homeKycPending : styles.homeKycRequired,
            ]}
          >
            <View style={styles.homeKycHeaderRow}>
              <View
                style={[
                  styles.homeKycIconBox,
                  { backgroundColor: user?.kyc_status === 'PENDING' ? '#fef3c7' : colors.primaryFixed },
                ]}
              >
                <MaterialIcons
                  name={user?.kyc_status === 'PENDING' ? 'schedule' : 'verified-user'}
                  size={20}
                  color={user?.kyc_status === 'PENDING' ? '#d97706' : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.homeKycTitle,
                    { color: user?.kyc_status === 'PENDING' ? '#92400e' : colors.primary },
                  ]}
                >
                  {user?.kyc_status === 'PENDING'
                    ? 'Dossier KYC en cours d’examen'
                    : 'Vérification Académique Requise'}
                </Text>
                <Text style={styles.homeKycSubtitle}>
                  {user?.kyc_status === 'PENDING'
                    ? 'Pièces transmises au CROUS • Validation sous 24h ouvrées'
                    : 'Fournissez votre Carte d’Étudiant UAC et votre CIP'}
                </Text>
              </View>
              <Pressable
                style={[
                  styles.homeKycBtn,
                  { backgroundColor: user?.kyc_status === 'PENDING' ? '#d97706' : colors.primary },
                ]}
                onPress={() => navigation.navigate('KycOnboarding')}
              >
                <Text style={styles.homeKycBtnText}>
                  {user?.kyc_status === 'PENDING' ? 'Voir l’état' : 'Certifier'}
                </Text>
                <MaterialIcons name="chevron-right" size={16} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* SECTION 1 : MES TICKETS PAYÉS & ACTIFS                                     */}
        {/* ========================================================================= */}
        <View style={styles.sectionHeadRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="confirmation-number" size={22} color={colors.primary} />
            <Text style={styles.sectionHeaderTitle}>Mes Tickets Payés & Actifs</Text>
          </View>
          <Badge
            label={
              user?.kyc_status !== 'APPROVED'
                ? user?.kyc_status === 'PENDING'
                  ? 'KYC En Attente'
                  : 'KYC Verrouillé'
                : `${activeTicketsList.length} Valide(s)`
            }
            tone={user?.kyc_status === 'APPROVED' ? 'success' : user?.kyc_status === 'PENDING' ? 'warning' : 'error'}
          />
        </View>

        {user?.kyc_status !== 'APPROVED' ? (
          /* KYC non approuvé -> Affichage du verrouillage explicite */
          <Card style={styles.noTicketCard}>
            <MaterialIcons
              name={user?.kyc_status === 'PENDING' ? 'pending-actions' : 'lock-outline'}
              size={36}
              color={user?.kyc_status === 'PENDING' ? '#d97706' : colors.error}
            />
            <Text style={styles.noTicketTitle}>
              {user?.kyc_status === 'PENDING' ? 'Validation Académique en Cours' : 'Accès aux Billets Verrouillé'}
            </Text>
            <Text style={styles.noTicketSub}>
              {user?.kyc_status === 'PENDING'
                ? 'Vos pièces justificatives sont en cours d’examen par le CROUS. Vos titres s’afficheront dès approbation.'
                : 'Faites certifier votre compte étudiant avec votre carte UAC et CIP pour acheter des tickets subventionnés à 100 FCFA.'}
            </Text>
            <Pressable
              style={[styles.buyTicketActionBtn, user?.kyc_status === 'PENDING' && { backgroundColor: '#d97706' }]}
              onPress={() => navigation.navigate('KycOnboarding')}
            >
              <MaterialIcons name={user?.kyc_status === 'PENDING' ? 'visibility' : 'verified-user'} size={18} color="#ffffff" />
              <Text style={styles.buyTicketActionText}>
                {user?.kyc_status === 'PENDING' ? 'Suivre mon Dossier KYC' : 'Faire Certifier mon Compte (KYC)'}
              </Text>
            </Pressable>
          </Card>
        ) : activeTicketsList.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            {activeTicketsList.map((t, idx) => (
              <Card key={t.id} floating style={styles.activeTicketCard}>
                <View style={styles.ticketCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Badge label={`Ticket #${idx + 1}`} tone="primary" />
                      <Badge label="Validé & Payé (100 F)" tone="success" icon="check-circle" />
                    </View>
                    <Text style={styles.ticketRoute}>{t.route}</Text>
                    <Text style={styles.ticketBusSub}>{t.line} • {t.busId}</Text>
                  </View>
                  <Pressable
                    style={styles.qrOpenBtn}
                    onPress={() => {
                      setActiveTicket(t);
                      navigation.navigate('Tickets');
                    }}
                  >
                    <MaterialIcons name="qr-code-2" size={26} color={colors.onPrimary} />
                    <Text style={styles.qrOpenBtnText}>Afficher QR</Text>
                  </Pressable>
                </View>

                <View style={styles.ticketMetaRow}>
                  <View style={styles.ticketMetaItem}>
                    <MaterialIcons name="key" size={14} color={colors.primary} />
                    <Text style={styles.ticketMetaCode}>{t.code}</Text>
                  </View>
                  <View style={styles.ticketMetaItem}>
                    <MaterialIcons name="payments" size={14} color={colors.secondary} />
                    <Text style={styles.ticketMetaText}>{t.paymentMethod}</Text>
                  </View>
                  <View style={styles.ticketMetaItem}>
                    <MaterialIcons name="schedule" size={14} color={colors.outline} />
                    <Text style={styles.ticketMetaText}>{t.date}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          /* Aucun ticket actif -> Inviter à en acheter un */
          <Card style={styles.noTicketCard}>
            <MaterialIcons name="airplane-ticket" size={36} color={colors.outline} />
            <Text style={styles.noTicketTitle}>Aucun titre de transport actif</Text>
            <Text style={styles.noTicketSub}>
              Achetez votre ticket subventionné à 100 FCFA pour voyager sereinement sur le réseau CROUS.
            </Text>
            <Pressable
              style={styles.buyTicketActionBtn}
              onPress={() => navigation.navigate('Booking')}
            >
              <MaterialIcons name="qr-code-scanner" size={18} color="#ffffff" />
              <Text style={styles.buyTicketActionText}>Acheter un Ticket (100 FCFA)</Text>
            </Pressable>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* GRILLE DE NAVIGATION PRINCIPALE                                           */}
        {/* ========================================================================= */}
        <View style={styles.grid}>
          <Pressable
            style={styles.tile}
            onPress={() => {
              if (user?.kyc_status !== 'APPROVED') {
                navigation.navigate('KycOnboarding');
              } else {
                navigation.navigate('Booking');
              }
            }}
          >
            <View style={[styles.tileIcon, { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="confirmation-number" size={24} color={colors.primary} />
            </View>
            <Text style={styles.tileLabel}>Réserver / Payer</Text>
          </Pressable>
          <Pressable
            style={styles.tile}
            onPress={() => {
              if (user?.kyc_status !== 'APPROVED') {
                navigation.navigate('KycOnboarding');
              } else {
                navigation.navigate('Tickets');
              }
            }}
          >
            <View style={[styles.tileIcon, { backgroundColor: colors.secondaryContainer }]}>
              <MaterialIcons name="near-me" size={24} color={colors.onSecondaryContainer} />
            </View>
            <Text style={styles.tileLabel}>Suivi en direct</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => navigation.navigate('PaymentMethods')}>
            <View style={[styles.tileIcon, { backgroundColor: '#fef3c7' }]}>
              <MaterialIcons name="account-balance-wallet" size={24} color="#d97706" />
            </View>
            <Text style={styles.tileLabel}>Portefeuille</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => navigation.navigate('History')}>
            <View style={[styles.tileIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
              <MaterialIcons name="history" size={24} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.tileLabel}>Historique</Text>
          </Pressable>
        </View>

        {/* ========================================================================= */}
        {/* SECTION 2 : PROCHAINS DÉPARTS CROUS (DYNAMIQUE AVEC MODAL DE PAIEMENT)    */}
        {/* ========================================================================= */}
        <Card style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="schedule" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Prochains Départs CROUS</Text>
            </View>
            <Text style={styles.tapToBookHint}>Appuyez pour réserver</Text>
          </View>

          <View style={styles.departuresList}>
            {busSlots.map((slot) => {
              const freeSeats = Math.max(0, slot.totalSeats - slot.bookedSeats);
              return (
                <Pressable
                  key={slot.id}
                  style={[styles.departureRow, slot.full && styles.departureRowFull]}
                  onPress={() => handleOpenDeparture(slot)}
                >
                  <View style={styles.busIconSquare}>
                    <MaterialIcons name="directions-bus" size={20} color={slot.full ? colors.outline : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.departureTitle, slot.full && { color: colors.onSurfaceVariant }]}>
                      {slot.time}
                    </Text>
                    <Text style={styles.departureRouteSub}>{slot.route}</Text>
                    <View style={styles.departureMetaRow}>
                      <MaterialIcons
                        name={slot.full ? 'person-off' : 'groups'}
                        size={13}
                        color={slot.full ? colors.error : colors.secondary}
                      />
                      <Text style={[styles.departureSeatsText, slot.full && { color: colors.error }]}>
                        {slot.full ? 'Bus Complet (50/50)' : `${freeSeats} place(s) libre(s) • ${slot.bookedSeats}/50`}
                      </Text>
                      <Text style={styles.departurePricePill}>100 F</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge label={slot.full ? 'Complet' : 'Disponible'} tone={slot.full ? 'error' : 'success'} />
                    <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </ScrollView>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET MODAL : DÉTAILS DE LA ROTATION & PAIEMENT DU TICKET           */}
      {/* ========================================================================= */}
      <Modal
        visible={departureModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDepartureModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={styles.bottomSheetBackdrop} onPress={() => setDepartureModalVisible(false)} />
          <View style={styles.bottomSheetContent}>
            {/* Poignée de drag */}
            <View style={styles.sheetHandle} />

            {selectedDeparture && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Badge
                      label={selectedDeparture.full ? 'Rotation Complète' : 'Places Disponibles'}
                      tone={selectedDeparture.full ? 'error' : 'success'}
                      icon={selectedDeparture.full ? 'person-off' : 'check-circle'}
                    />
                    <Text style={styles.sheetTitle}>{selectedDeparture.time}</Text>
                    <Text style={styles.sheetSub}>{selectedDeparture.route} • Bus CROUS #402</Text>
                  </View>
                  <Pressable onPress={() => setDepartureModalVisible(false)} style={styles.closeSheetBtn}>
                    <MaterialIcons name="close" size={24} color={colors.onSurface} />
                  </Pressable>
                </View>

                {/* Résumé de l'itinéraire & tarif */}
                <View style={styles.sheetDetailsCard}>
                  <View style={styles.sheetDetailRow}>
                    <MaterialIcons name="trip-origin" size={18} color={colors.primary} />
                    <Text style={styles.sheetDetailLabel}>Départ :</Text>
                    <Text style={styles.sheetDetailVal}>Campus UAC Calavi</Text>
                  </View>
                  <View style={styles.sheetDetailRow}>
                    <MaterialIcons name="location-on" size={18} color={colors.secondary} />
                    <Text style={styles.sheetDetailLabel}>Terminus :</Text>
                    <Text style={styles.sheetDetailVal}>
                      {selectedDeparture.route.includes('Godomey')
                        ? 'Échangeur Godomey'
                        : selectedDeparture.route.includes('Akpakpa')
                        ? 'Akpakpa Sacré-Cœur'
                        : 'Cotonou Étoile Rouge'}
                    </Text>
                  </View>
                  <View style={styles.sheetDivider} />
                  <View style={styles.sheetDetailRow}>
                    <MaterialIcons name="airline-seat-recline-normal" size={18} color={colors.primary} />
                    <Text style={styles.sheetDetailLabel}>Disponibilité :</Text>
                    <Text style={[styles.sheetDetailVal, { color: selectedDeparture.full ? colors.error : colors.secondary, fontWeight: '700' }]}>
                      {selectedDeparture.full ? 'Complet (50/50)' : `${50 - selectedDeparture.bookedSeats} places restantes (${selectedDeparture.bookedSeats}/50)`}
                    </Text>
                  </View>
                  <View style={styles.sheetDetailRow}>
                    <MaterialIcons name="payments" size={18} color={colors.primary} />
                    <Text style={styles.sheetDetailLabel}>Tarif Subventionné CROUS :</Text>
                    <Text style={[styles.sheetDetailVal, { color: colors.primary, fontWeight: '700', fontSize: 16 }]}>
                      100 FCFA
                    </Text>
                  </View>
                </View>

                {/* Choix du moyen de paiement */}
                <Text style={styles.modalSectionTitle}>CHOISIR LE MOYEN DE PAIEMENT</Text>
                <View style={styles.modalOperatorGrid}>
                  {/* PORTEFEUILLE CROUS */}
                  <Pressable
                    style={[styles.modalOpTile, paymentOp === 'WALLET' && styles.modalOpTileActive]}
                    onPress={() => handleSelectOp('WALLET')}
                  >
                    <View style={[styles.modalOpBadge, { backgroundColor: colors.primary }]}>
                      <MaterialIcons name="account-balance-wallet" size={16} color="#ffffff" />
                    </View>
                    <Text style={styles.modalOpTitle}>Portefeuille</Text>
                    <Text style={styles.modalOpSub}>Solde: {walletBalance.toLocaleString('fr-FR')} F</Text>
                  </Pressable>

                  {/* MTN */}
                  <Pressable
                    style={[styles.modalOpTile, paymentOp === 'MTN' && styles.modalOpTileActive]}
                    onPress={() => handleSelectOp('MTN')}
                  >
                    <View style={[styles.modalOpBadge, { backgroundColor: '#fbbf24' }]}>
                      <Text style={styles.modalOpBadgeText}>MTN</Text>
                    </View>
                    <Text style={styles.modalOpTitle}>MTN MoMo</Text>
                    <Text style={styles.modalOpSub}>*880#</Text>
                  </Pressable>

                  {/* MOOV */}
                  <Pressable
                    style={[styles.modalOpTile, paymentOp === 'MOOV' && styles.modalOpTileActive]}
                    onPress={() => handleSelectOp('MOOV')}
                  >
                    <View style={[styles.modalOpBadge, { backgroundColor: '#0284c7' }]}>
                      <Text style={[styles.modalOpBadgeText, { color: '#ffffff' }]}>Moov</Text>
                    </View>
                    <Text style={styles.modalOpTitle}>Moov Money</Text>
                    <Text style={styles.modalOpSub}>*855#</Text>
                  </Pressable>

                  {/* CELTIIS */}
                  <Pressable
                    style={[styles.modalOpTile, paymentOp === 'CELTIIS' && styles.modalOpTileActive]}
                    onPress={() => handleSelectOp('CELTIIS')}
                  >
                    <View style={[styles.modalOpBadge, { backgroundColor: '#0070ba' }]}>
                      <Text style={[styles.modalOpBadgeText, { color: '#ffffff' }]}>Celtiis</Text>
                    </View>
                    <Text style={styles.modalOpTitle}>Celtiis Cash</Text>
                    <Text style={styles.modalOpSub}>*888#</Text>
                  </Pressable>
                </View>

                {paymentOp !== 'WALLET' && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text style={styles.modalInputLabel}>Numéro Mobile Money débité :</Text>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="ex: 0197001122"
                      placeholderTextColor={colors.outline}
                      keyboardType="phone-pad"
                      style={styles.modalPhoneInput}
                    />
                  </View>
                )}

                {/* Bouton de Confirmation */}
                <PrimaryButton
                  label={
                    isProcessing
                      ? 'Paiement en cours...'
                      : selectedDeparture.full
                      ? 'Rotation Complète'
                      : paymentOp === 'WALLET'
                      ? 'Payer avec mon Portefeuille (100 FCFA)'
                      : 'Payer & Réserver mon Siège (100 FCFA)'
                  }
                  icon={selectedDeparture.full ? 'person-off' : paymentOp === 'WALLET' ? 'account-balance-wallet' : 'confirmation-number'}
                  variant={selectedDeparture.full ? 'muted' : 'gold'}
                  onPress={handleConfirmDeparturePayment}
                  disabled={isProcessing || selectedDeparture.full}
                  style={{ marginTop: spacing.md }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.lg },

  // Bannière KYC sur l'accueil
  homeKycCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
  },
  homeKycRequired: {
    backgroundColor: colors.primaryFixed,
    borderColor: colors.primary,
  },
  homeKycPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  homeKycHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  homeKycIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeKycTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
  },
  homeKycSubtitle: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  homeKycBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 2,
  },
  homeKycBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Bannière de bienvenue / Notification
  welcomeBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  welcomeIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    ...typography.headlineSm,
    fontSize: 17,
    color: '#166534',
  },
  welcomeSubtitle: {
    ...typography.bodyMd,
    fontSize: 13,
    color: '#15803d',
    marginTop: 2,
  },
  bold: {
    fontWeight: '700',
  },
  closeBannerBtn: {
    padding: spacing.xs,
  },
  welcomeDetailsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    ...typography.bodySm,
    fontSize: 12,
    color: '#166534',
  },
  welcomeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  kycActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  kycActionText: {
    ...typography.bodySm,
    fontWeight: '700',
    color: '#ffffff',
  },

  greetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingWrap: { gap: 2, flex: 1 },
  greeting: { ...typography.headlineMd, color: colors.primary },
  p: { ...typography.bodySm, color: colors.onSurfaceVariant },
  walletMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  walletMiniText: {
    ...typography.labelCaps,
    fontSize: 12,
    color: '#92400e',
    fontWeight: '700',
  },

  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sectionHeaderTitle: {
    ...typography.headlineSm,
    fontSize: 17,
    color: colors.primary,
  },

  activeTicketCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 4,
    borderTopColor: colors.primary,
    padding: spacing.md,
    gap: spacing.sm,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  ticketRoute: {
    ...typography.headlineSm,
    fontSize: 16,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  ticketBusSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  qrOpenBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    gap: 2,
    minWidth: 64,
  },
  qrOpenBtnText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  ticketMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
    gap: 8,
  },
  ticketMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaCode: {
    ...typography.statusCode,
    fontSize: 12,
    color: colors.primary,
  },
  ticketMetaText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },

  noTicketCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceContainerLowest,
  },
  noTicketTitle: {
    ...typography.headlineSm,
    fontSize: 15,
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  noTicketSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  buyTicketActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  buyTicketActionText: {
    ...typography.bodySm,
    color: colors.onPrimary,
    fontWeight: '700',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  tile: {
    width: '47%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.headlineSm, color: colors.primary, fontSize: 16 },
  tapToBookHint: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },

  // Prochains Départs CROUS
  departuresList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  departureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  departureRowFull: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    opacity: 0.85,
  },
  busIconSquare: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  departureTitle: {
    ...typography.bodyLg,
    fontWeight: '700',
    color: colors.onSurface,
    fontSize: 14,
  },
  departureRouteSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 1,
  },
  departureMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  departureSeatsText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
  },
  departurePricePill: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.primary,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
    fontWeight: '700',
  },

  // Bottom Sheet Modal
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  bottomSheetBackdrop: {
    flex: 1,
  },
  bottomSheetContent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 10,
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sheetTitle: {
    ...typography.headlineMd,
    fontSize: 18,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  sheetSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeSheetBtn: {
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
  },

  sheetDetailsCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  sheetDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetDetailLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    width: 140,
  },
  sheetDetailVal: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.onSurface,
    flex: 1,
    textAlign: 'right',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: 2,
  },

  modalSectionTitle: {
    ...typography.labelCaps,
    fontSize: 11,
    color: colors.outline,
    letterSpacing: 0.8,
    marginTop: spacing.xs,
  },
  modalOperatorGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  modalOpTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: colors.surfaceVariant,
    gap: 4,
  },
  modalOpTileActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixed,
  },
  modalOpBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOpBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  modalOpTitle: {
    ...typography.bodySm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  modalOpSub: {
    ...typography.bodySm,
    fontSize: 9,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  modalInputLabel: {
    ...typography.bodySm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  modalPhoneInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: '600',
  },
});
