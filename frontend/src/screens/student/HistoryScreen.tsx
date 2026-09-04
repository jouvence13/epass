import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
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

interface TicketHistoryItem {
  ticket_id: string;
  trip_id: string;
  route_name: string;
  student_name: string;
  student_id: string;
  code: string;
  status: string;
  raw_status?: string;
  available_for_days?: number;
  avail_for_label?: string;
  bus_code?: string;
}

export default function HistoryScreen({ navigation }: any) {
  const { token, tickets, user } = useAuth();
  const { showToast } = useNotifications();
  const [serverHistory, setServerHistory] = useState<TicketHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.TICKET_HISTORY, {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setServerHistory(data);
        }
      }
    } catch (e) {
      console.warn('Error fetching ticket history:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleBookingPress = () => {
    const kycStatus = user?.kyc_status;
    if (kycStatus === 'APPROVED') {
      showToast({
        title: 'Réservation de trajet',
        message: 'Sélectionnez votre départ ou scannez le QR code du bus.',
        type: 'info',
        category: 'GENERAL',
      });
      navigation.navigate('StudentTabs', { screen: 'Booking' });
    } else if (kycStatus === 'PENDING') {
      showToast({
        title: 'Dossier KYC en cours d’examen',
        message: 'Votre dossier académique est en cours de validation par le CROUS. Vous recevrez une alerte dès approbation.',
        type: 'warning',
        category: 'KYC',
      });
      navigation.navigate('KycOnboarding');
    } else {
      showToast({
        title: 'Vérification KYC requise',
        message: 'Pour débloquer les billets à 100 FCFA, vous devez fournir : 1. Carte Étudiant UAC, 2. Pièce d’identité (CIP / CNI).',
        type: 'warning',
        category: 'KYC',
      });
      navigation.navigate('KycOnboarding');
    }
  };

  // Liste des billets synchronisée avec le backend
  const combinedHistory: TicketHistoryItem[] = serverHistory.length > 0
    ? serverHistory
    : tickets.map((t) => ({
        ticket_id: t.id,
        trip_id: `trip-${t.id}`,
        route_name: t.route,
        student_name: user ? `${user.first_name} ${user.last_name}` : 'Étudiant UAC',
        student_id: `Matricule: ${user?.matricule_uac || 'UAC-2024-XXXX'}`,
        code: t.code,
        status: t.status === 'ACTIVE' ? 'Valid Ticket' : t.status === 'USED' ? 'Validated' : 'Expired',
        raw_status: t.status === 'ACTIVE' ? 'ISSUED' : t.status === 'USED' ? 'VALIDATED' : 'EXPIRED',
        avail_for_label: t.date,
        bus_code: t.busId,
      }));

  const getStatusBadge = (item: TicketHistoryItem) => {
    const isIssued = item.status === 'Valid Ticket' || item.raw_status === 'ISSUED';
    const isValidated = item.status === 'Validated' || item.raw_status === 'VALIDATED';

    if (isIssued) {
      return <Badge label="Billet Actif" tone="success" icon="check-circle" />;
    }
    if (isValidated) {
      return <Badge label="Validé / Utilisé" tone="primary" icon="done-all" />;
    }
    return <Badge label="Expiré" tone="error" icon="cancel" />;
  };

  const isKycApproved = user?.kyc_status === 'APPROVED';
  const isKycPending = user?.kyc_status === 'PENDING';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Historique des Billets</Text>
          <Text style={styles.headerSubtitle}>Mes achats & trajets universitaires</Text>
        </View>
        <Pressable onPress={onRefresh} hitSlop={10} style={styles.refreshBtn}>
          <MaterialIcons name="refresh" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={combinedHistory}
          keyExtractor={(item) => item.ticket_id || item.code}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="receipt-long" size={48} color={colors.outline} />
              </View>
              <Text style={styles.emptyTitle}>Aucun billet trouvé</Text>
              <Text style={styles.emptySubtitle}>
                Vous n'avez pas encore acheté de billet de bus pour vos trajets universitaires.
              </Text>

              {/* Encadré d'information KYC selon le statut du compte */}
              {!isKycApproved && (
                <View style={[styles.kycNoticeBox, isKycPending ? styles.kycNoticePending : styles.kycNoticeRequired]}>
                  <View style={styles.kycNoticeHeader}>
                    <MaterialIcons
                      name={isKycPending ? 'schedule' : 'warning-amber'}
                      size={22}
                      color={isKycPending ? colors.tertiary : colors.primary}
                    />
                    <Text style={[styles.kycNoticeTitle, { color: isKycPending ? colors.tertiary : colors.primary }]}>
                      {isKycPending ? 'Vérification KYC en cours d’examen' : 'Vérification KYC requise avant réservation'}
                    </Text>
                  </View>
                  <Text style={styles.kycNoticeText}>
                    {isKycPending
                      ? 'Votre dossier académique a été soumis. La commission CROUS examine vos pièces sous 24h ouvrées. Vous recevrez une notification dès validation pour réserver à 100 FCFA.'
                      : 'Pour accéder aux tarifs subventionnés (100 FCFA) et réserver des places, vous devez fournir : 1. Votre Carte d’Étudiant UAC (Année en cours), 2. Votre Certificat CIP ou CNI.'}
                  </Text>
                </View>
              )}

              <PrimaryButton
                label={
                  isKycApproved
                    ? 'Réserver mon premier trajet'
                    : isKycPending
                    ? 'Consulter l’état de mon KYC'
                    : 'Fournir mes pièces KYC (Carte & CIP)'
                }
                icon={isKycApproved ? 'add-circle' : isKycPending ? 'schedule' : 'verified-user'}
                onPress={handleBookingPress}
                style={{ marginTop: spacing.md, width: '100%' }}
              />
            </View>
          }
          renderItem={({ item }) => {
            const isIssued = item.status === 'Valid Ticket' || item.raw_status === 'ISSUED';
            return (
              <Pressable
                onPress={() => {
                  if (isIssued) {
                    navigation.navigate('StudentTabs', { screen: 'Tickets' });
                  }
                }}
              >
                <Card style={[styles.ticketCard, isIssued && styles.activeTicketCard]}>
                  <View style={styles.ticketTopRow}>
                    <View style={styles.iconCircle}>
                      <MaterialIcons name="directions-bus" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeName}>{item.route_name}</Text>
                      <Text style={styles.busInfo}>{item.bus_code || 'Bus CROUS'}</Text>
                    </View>
                    {getStatusBadge(item)}
                  </View>

                  <View style={styles.ticketDivider} />

                  <View style={styles.ticketBottomRow}>
                    <View>
                      <Text style={styles.codeLabel}>Code Billet</Text>
                      <Text style={styles.codeValue}>{item.code}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.expiryLabel}>Statut validité</Text>
                      <Text style={styles.expiryValue}>
                        {item.avail_for_label || (isIssued ? 'Valide' : 'Passé')}
                      </Text>
                    </View>
                  </View>

                  {isIssued && (
                    <View style={styles.viewQrPrompt}>
                      <Text style={styles.viewQrText}>Voir le QR Code du billet</Text>
                      <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  refreshBtn: { padding: spacing.xs },
  headerTitle: { ...typography.headlineSm, fontSize: 18, color: colors.primary },
  headerSubtitle: { ...typography.bodyMd, fontSize: 12, color: colors.onSurfaceVariant },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.containerMargin, paddingBottom: spacing.xxl, gap: spacing.md },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    gap: spacing.sm,
  },
  activeTicketCard: {
    borderColor: colors.primary,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeName: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface },
  busInfo: { ...typography.bodyMd, fontSize: 12, color: colors.onSurfaceVariant },
  ticketDivider: {
    height: 1,
    backgroundColor: colors.surfaceVariant,
    marginVertical: spacing.xs,
  },
  ticketBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeLabel: { ...typography.labelCaps, fontSize: 10, color: colors.onSurfaceVariant },
  codeValue: { ...typography.statusCode, fontSize: 14, color: colors.primary },
  expiryLabel: { ...typography.labelCaps, fontSize: 10, color: colors.onSurfaceVariant },
  expiryValue: { ...typography.bodySm, fontWeight: '600', color: colors.onSurface },
  viewQrPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceVariant,
  },
  viewQrText: { ...typography.bodySm, color: colors.primary, fontWeight: '700' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.headlineMd, fontSize: 18, color: colors.onSurface },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xs,
  },
  kycNoticeBox: {
    width: '100%',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  kycNoticeRequired: {
    backgroundColor: colors.primaryFixed,
    borderColor: colors.primary,
  },
  kycNoticePending: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  kycNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  kycNoticeTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  kycNoticeText: {
    ...typography.bodySm,
    color: colors.onSurface,
    lineHeight: 18,
  },
});
