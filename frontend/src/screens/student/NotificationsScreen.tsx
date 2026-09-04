import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

interface NotificationItem {
  id: string;
  category: 'TRAFFIC' | 'KYC' | 'PAYMENT' | 'SCHEDULE';
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: keyof typeof MaterialIcons.glyphMap;
  tone: 'info' | 'warning' | 'success' | 'neutral';
}

export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'ALL' | 'TRAFFIC' | 'KYC' | 'PAYMENT'>('ALL');

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      category: 'KYC',
      title: user?.kyc_status === 'APPROVED' ? 'Dossier KYC Validé' : 'Dossier KYC en examen',
      message:
        user?.kyc_status === 'APPROVED'
          ? 'Félicitations ! Vos pièces justificatives ont été vérifiées par le CROUS. Vous bénéficiez du tarif subventionné.'
          : 'Vos justificatifs académiques ont bien été reçus et sont en cours de vérification par les équipes CROUS.',
      time: 'Il y a 10 min',
      read: false,
      icon: 'verified',
      tone: user?.kyc_status === 'APPROVED' ? 'success' : 'warning',
    },
    {
      id: '2',
      category: 'TRAFFIC',
      title: 'Trafic Fluide - Ligne Campus Express',
      message: 'Les bus circulent normalement sur l\'axe Campus Abomey-Calavi ↔ Étoile Rouge Cotonou.',
      time: 'Il y a 1h',
      read: false,
      icon: 'directions-bus',
      tone: 'info',
    },
    {
      id: '3',
      category: 'PAYMENT',
      title: 'Achat de Pass Campus Validé',
      message: 'Votre ticket A7B9-X2M4 a été débité de votre compte MTN MoMo (100 FCFA).',
      time: 'Hier, 18:30',
      read: true,
      icon: 'receipt',
      tone: 'success',
    },
    {
      id: '4',
      category: 'SCHEDULE',
      title: 'Horaires de Soirée Renforcés',
      message: 'Des rotations supplémentaires sont assurées jusqu\'à 21h30 du lundi au vendredi.',
      time: 'Il y a 2 jours',
      read: true,
      icon: 'schedule',
      tone: 'neutral',
    },
  ]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filteredList = notifications.filter((n) => {
    if (filter === 'ALL') return true;
    return n.category === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
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
                      item.tone === 'success'
                        ? { backgroundColor: colors.primaryFixed }
                        : item.tone === 'warning'
                        ? { backgroundColor: '#fef3c7' }
                        : item.tone === 'info'
                        ? { backgroundColor: '#e0f2fe' }
                        : { backgroundColor: colors.surfaceContainer },
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color={
                        item.tone === 'success'
                          ? colors.primary
                          : item.tone === 'warning'
                          ? '#d97706'
                          : item.tone === 'info'
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
