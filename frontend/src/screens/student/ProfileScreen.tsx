import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatBeninPhoneDisplay } from '../../utils/phoneUtils';

const ROWS: { icon: keyof typeof MaterialIcons.glyphMap; label: string; action: string }[] = [
  { icon: 'receipt-long', label: "Historique d'achats", action: 'History' },
  { icon: 'verified-user', label: 'Vérification KYC (Documents)', action: 'KycOnboarding' },
  { icon: 'payments', label: 'Moyens de paiement (MTN / Moov / Celtiis)', action: 'PaymentMethods' },
  { icon: 'notifications', label: 'Notifications', action: 'Notifications' },
  { icon: 'help-outline', label: 'Aide & support Campus', action: 'Support' },
];

export default function ProfileScreen({ navigation }: any) {
  const { user, walletBalance, refreshWallet, logout } = useAuth();
  const { showToast } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    if (refreshWallet) {
      await refreshWallet();
    }
    setRefreshing(false);
  };

  const handleLogout = () => {
    showToast({
      title: 'Déconnexion Réussie',
      message: 'Votre session a été fermée en toute sécurité.',
      type: 'info',
      category: 'GENERAL',
    });
    logout();
  };

  const fullName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Étudiant'
    : 'Étudiant';

  const roleLabel =
    user?.role === 'SUPERADMIN'
      ? 'Super Administrateur'
      : user?.role === 'ADMIN' || user?.role === 'ADMIN_CAMPUS' || user?.role === 'ADMIN_CROUS'
      ? 'Directeur de Campus'
      : user?.role === 'DRIVER'
      ? 'Chauffeur'
      : user?.role === 'CONTROLLER'
      ? 'Contrôleur'
      : 'Étudiant';

  const campusDisplayName = user?.campus_name || '';
  const campusCode = user?.campus_code || '';
  const phoneDisplay = user?.phone_number ? formatBeninPhoneDisplay(user.phone_number) : 'Non renseigné';
  const matricule = user?.matricule_uac || 'Non renseigné';

  const kycTone =
    user?.kyc_status === 'APPROVED'
      ? 'success'
      : user?.kyc_status === 'PENDING'
      ? 'warning'
      : 'neutral';

  const kycText =
    user?.kyc_status === 'APPROVED'
      ? 'KYC Validé & Certifié'
      : user?.kyc_status === 'PENDING'
      ? 'KYC En Attente'
      : 'KYC Non Soumis';

  const kycIcon: keyof typeof MaterialIcons.glyphMap =
    user?.kyc_status === 'APPROVED'
      ? 'verified'
      : user?.kyc_status === 'PENDING'
      ? 'schedule'
      : 'info-outline';

  const formattedJoinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Non renseigné';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* En-tête Profil */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={42} color={colors.primary} />
            {user?.kyc_status === 'APPROVED' && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="check" size={14} color="#FFF" />
              </View>
            )}
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>{roleLabel}</Text>
          </View>
          {campusDisplayName ? (
            <View style={styles.campusBadge}>
              <MaterialIcons name="account-balance" size={16} color={colors.primary} />
              <Text style={styles.campusBadgeText}>{campusDisplayName}</Text>
            </View>
          ) : null}
        </View>

        {/* Fiche d'Identité Complète & Données Académiques */}
        <Card style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <MaterialIcons name="badge" size={20} color={colors.primary} />
            <Text style={styles.infoCardTitle}>Informations du Compte</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="phone" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Numéro de Téléphone</Text>
                <Text style={styles.infoValue}>{phoneDisplay}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="school" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Matricule Académique</Text>
                <Text style={styles.infoValue}>{matricule}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="location-on" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Campus d'Attache</Text>
                <Text style={styles.infoValue}>
                  {campusDisplayName
                    ? campusCode
                      ? `${campusDisplayName} (${campusCode})`
                      : campusDisplayName
                    : 'Non renseigné'}
                </Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="security" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Statut Certification KYC</Text>
                <View style={styles.kycRowContainer}>
                  <Badge label={kycText} tone={kycTone as any} icon={kycIcon} />
                </View>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="account-balance-wallet" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Solde Portefeuille Universitaire</Text>
                <Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>
                  {walletBalance.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="event" size={18} color={colors.onSurfaceVariant} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Membre du Réseau depuis</Text>
                <Text style={styles.infoSubValue}>{formattedJoinDate}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Section Navigation & Services */}
        <Card style={styles.section}>
          {ROWS.map((r, i) => (
            <Pressable
              key={r.label}
              style={[styles.row, i > 0 && styles.rowBorder]}
              onPress={() => {
                if (r.action) {
                  navigation.navigate(r.action);
                }
              }}
            >
              <MaterialIcons name={r.icon} size={22} color={colors.onSurfaceVariant} />
              <Text style={styles.rowLabel}>{r.label}</Text>
              {r.action === 'KycOnboarding' && (
                <Badge label={kycText} tone={kycTone as any} icon={kycIcon} />
              )}
              <MaterialIcons name="chevron-right" size={22} color={colors.outline} />
            </Pressable>
          ))}
        </Card>

        {/* Bouton Déconnexion */}
        <Pressable style={styles.logout} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.lg },
  header: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E6F4FE',
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  name: { ...typography.headlineMd, color: colors.onSurface, fontWeight: '700', textAlign: 'center' },
  roleTag: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: 2,
  },
  roleTagText: { ...typography.bodySm, color: colors.primary, fontWeight: '600' },
  campusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    backgroundColor: '#F0F9F4',
    borderWidth: 1,
    borderColor: '#C3E6D3',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  campusBadgeText: { ...typography.bodyMd, color: colors.primary, fontWeight: '600' },

  // Fiche d'informations
  infoCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    marginBottom: spacing.xs,
  },
  infoCardTitle: {
    ...typography.headlineSm,
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  infoGrid: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4FAF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  infoSubValue: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  kycRowContainer: {
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.surfaceVariant,
    marginLeft: 52,
  },

  section: { padding: 0, overflow: 'hidden', borderRadius: radius.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surfaceVariant },
  rowLabel: { flex: 1, ...typography.bodyLg, color: colors.onSurface },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    height: 48,
    backgroundColor: '#FFF',
  },
  logoutText: { ...typography.headlineSm, fontSize: 16, color: colors.error },
});
