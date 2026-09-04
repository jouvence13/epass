import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
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
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0
                ? `${unreadCount} nouvelle(s) alerte(s) non lue(s)`
                : 'Toutes les notifications sont lues'}
            </Text>
          </View>
          {unreadCount > 0 && (
            <Pressable style={styles.markReadBtn} onPress={markAllAsRead}>
              <MaterialIcons name="done-all" size={18} color={colors.primary} />
              <Text style={styles.markReadText}>Tout lire</Text>
            </Pressable>
          )}
        </View>

        {/* Onglets Filtres */}
        <View style={styles.filterRow}>
          {[
            { key: 'ALL', label: 'Toutes' },
            { key: 'TRAFFIC', label: 'Trafic Bus' },
            { key: 'KYC', label: 'KYC' },
            { key: 'PAYMENT', label: 'Achats' },
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
                Vous n'avez pas de notification dans cette catégorie pour le moment.
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
                        ? { backgroundColor: '#fef3c7' }
                        : item.type === 'info'
                        ? { backgroundColor: '#e0f2fe' }
                        : { backgroundColor: colors.surfaceContainer },
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color={
                        item.type === 'success'
                          ? colors.primary
                          : item.type === 'warning'
                          ? '#d97706'
                          : item.type === 'info'
                          ? '#0284c7'
                          : colors.onSurfaceVariant
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
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.headlineMd, color: colors.primary },
  subtitle: { ...typography.bodySm, color: colors.onSurfaceVariant },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryFixed,
  },
  markReadText: { ...typography.bodySm, color: colors.primary, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterChipText: { ...typography.bodySm, color: colors.onSurfaceVariant, fontWeight: '600' },
  filterChipTextActive: { color: colors.onPrimary, fontWeight: '700' },
  notifCard: {
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    padding: spacing.md,
  },
  notifCardUnread: {
    borderColor: colors.primary,
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
  notifHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifTitle: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface },
  notifTitleBold: { color: colors.primary, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  notifMessage: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 20 },
  notifTime: { ...typography.bodySm, fontSize: 12, color: colors.outline, marginTop: spacing.xs },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  emptyTitle: { ...typography.headlineSm, color: colors.onSurface },
  emptySub: { ...typography.bodySm, color: colors.onSurfaceVariant, textAlign: 'center' },
});
