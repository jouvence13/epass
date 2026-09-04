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

const MOCK_HISTORY: TicketHistoryItem[] = [
  {
    ticket_id: '1',
    trip_id: 'trip-1',
    route_name: 'Campus Express Route 4',
    student_name: 'Koffi Alain',
    student_id: 'Student ID: UAC-2022-8492',
    code: 'A7B9-X2M4',
    status: 'Valid Ticket',
    raw_status: 'ISSUED',
    avail_for_label: 'Valide pour 6 jours',
    bus_code: 'Bus #402',
  },
  {
    ticket_id: '2',
    trip_id: 'trip-2',
    route_name: 'Navette Inter-Facultés',
    student_name: 'Koffi Alain',
    student_id: 'Student ID: UAC-2022-8492',
    code: 'B8C2-D9E1',
    status: 'Validated',
    raw_status: 'VALIDATED',
    avail_for_label: 'Utilisé hier à 16:45',
    bus_code: 'Bus #108',
  },
  {
    ticket_id: '3',
    trip_id: 'trip-3',
    route_name: 'Ligne Calavi - Porto-Novo',
    student_name: 'Koffi Alain',
    student_id: 'Student ID: UAC-2022-8492',
    code: 'C3D4-E5F6',
    status: 'Expired',
    raw_status: 'EXPIRED',
    avail_for_label: 'Expiré le 28 Août',
    bus_code: 'Bus #304',
  },
];

export default function HistoryScreen({ navigation }: any) {
  const { token } = useAuth();
  const [history, setHistory] = useState<TicketHistoryItem[]>(MOCK_HISTORY);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await fetch(ENDPOINTS.TICKET_HISTORY, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setHistory(data);
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
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

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
          data={history}
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
                Vous n'avez pas encore acheté de billet de bus pour vos trajets.
              </Text>
              <PrimaryButton
                label="Réserver mon premier trajet"
                icon="add-circle"
                onPress={() => navigation.navigate('Booking')}
                style={{ marginTop: spacing.lg }}
              />
            </View>
          }
          renderItem={({ item }) => {
            const isIssued = item.status === 'Valid Ticket' || item.raw_status === 'ISSUED';
            return (
              <Pressable
                onPress={() => {
                  if (isIssued) {
                    navigation.navigate('Tickets');
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
  },
});
