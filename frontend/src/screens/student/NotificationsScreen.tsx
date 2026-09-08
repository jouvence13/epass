import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllAsRead, refreshNotifications } = useNotifications();
  const [filter, setFilter] = useState<'ALL' | 'TRAFFIC' | 'KYC' | 'PAYMENT'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const filteredList = notifications.filter((n) => {
    if (filter === 'ALL') return true;
    if (filter === 'PAYMENT') return n.category === 'PAYMENT' || n.category === 'WALLET';
    return n.category === filter;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Header avec Bannière Nationale */}
        <View style={styles.headerContainer}>
          <View style={styles.beninBanner}>
            <View style={[styles.flagBar, { backgroundColor: colors.beninGreen }]} />
            <View style={[styles.flagBar, { backgroundColor: colors.beninYellow }]} />
            <View style={[styles.flagBar, { backgroundColor: colors.beninRed }]} />
          </View>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Centre de Notifications</Text>
              <Text style={styles.subtitle}>
                {unreadCount > 0
                  ? `${unreadCount} nouvelle(s) alerte(s) non lue(s)`
                  : 'Toutes les notifications sont à jour'}
              </Text>
            </View>
            {unreadCount > 0 && (
              <Pressable style={styles.markReadBtn} onPress={markAllAsRead}>
                <MaterialIcons name="done-all" size={18} color={colors.primary} />
                <Text style={styles.markReadText}>Tout lire</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Onglets Filtres */}
        <View style={styles.filterRow}>
          {[
            { key: 'ALL', label: `Toutes (${notifications.length})` },
            { key: 'TRAFFIC', label: 'Trafic Bus' },
            { key: 'KYC', label: 'Conformité KYC' },
            { key: 'PAYMENT', label: 'Paiements MoMo' },
          ].map((tab) => {
            const isActive = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(tab.key as any)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Liste des Notifications */}
        <View style={{ gap: spacing.sm }}>
          {filteredList.length === 0 ? (
            <Card style={styles.emptyCard}>
              <MaterialIcons name="notifications-none" size={48} color={colors.outline} />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptySub}>
                Vous n'avez aucune alerte dans cette catégorie pour le moment.
              </Text>
            </Card>
          ) : (
            filteredList.map((item) => (
              <Card
                key={item.id}
                style={[
                  styles.notifCard,
                  !item.read && styles.notifCardUnread,
                ]}
              >
                <View style={styles.notifRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      item.type === 'success'
                        ? { backgroundColor: colors.primaryFixed }
                        : item.type === 'warning'
                        ? { backgroundColor: colors.secondaryContainer }
                        : item.type === 'error'
                        ? { backgroundColor: colors.errorContainer }
                        : { backgroundColor: colors.primaryFixed },
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color={
                        item.type === 'success'
                          ? colors.primary
                          : item.type === 'warning'
                          ? '#854d0e'
                          : item.type === 'error'
                          ? colors.error
                          : colors.primary
                      }
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.notifHeaderRow}>
                      <Text style={[styles.notifTitle, !item.read && styles.notifTitleBold]}>
                        {item.title}
                      </Text>
                      {!item.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifMessage}>{item.message}</Text>
                    <Text style={styles.notifTime}>{item.time}</Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  headerContainer: { gap: 4 },
  beninBanner: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
    width: 60,
  },
  flagBar: {
    flex: 1,
    height: '100%',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.headlineSm, color: colors.primary, fontWeight: '800' },
  subtitle: { ...typography.bodySm, color: colors.onSurfaceVariant },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.primaryFixed,
  },
  markReadText: { ...typography.bodySm, color: colors.primary, fontWeight: '700' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterChipText: { ...typography.bodySm, color: colors.onSurfaceVariant, fontWeight: '600', fontSize: 12 },
  filterChipTextActive: { color: colors.onPrimary, fontWeight: '700' },
  notifCard: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  notifCardUnread: {
    borderColor: colors.primary,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.surfaceContainerLowest,
  },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  notifTitle: { ...typography.headlineSm, fontSize: 14, color: colors.onSurface, flex: 1 },
  notifTitleBold: { color: colors.onSurface, fontWeight: '800' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.beninRed },
  notifMessage: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 18, fontSize: 13 },
  notifTime: { ...typography.bodySm, fontSize: 11, color: colors.outline, marginTop: spacing.xs, fontWeight: '500' },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  emptyTitle: { ...typography.headlineSm, color: colors.onSurface },
  emptySub: { ...typography.bodySm, color: colors.onSurfaceVariant, textAlign: 'center' },
});
