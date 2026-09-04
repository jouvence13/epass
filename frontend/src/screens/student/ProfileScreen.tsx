import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

const ROWS: { icon: keyof typeof MaterialIcons.glyphMap; label: string; action?: string }[] = [
  { icon: 'receipt-long', label: "Historique d'achats", action: 'History' },
  { icon: 'verified-user', label: 'Vérification KYC (Documents)', action: 'KycOnboarding' },
  { icon: 'payments', label: 'Moyens de paiement (MTN / Moov)' },
  { icon: 'notifications', label: 'Notifications' },
  { icon: 'help-outline', label: 'Aide & support CROUS' },
];

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  const fullName = user ? `${user.first_name} ${user.last_name}` : 'Étudiant UAC';
  const matriculeLabel = user?.matricule_uac
    ? `Matricule : ${user.matricule_uac}`
    : `Téléphone : ${user?.phone_number || '+229 97 00 11 22'}`;

  const kycTone =
    user?.kyc_status === 'APPROVED'
      ? 'success'
      : user?.kyc_status === 'PENDING'
      ? 'warning'
      : 'neutral';

  const kycText =
    user?.kyc_status === 'APPROVED'
      ? 'KYC Validé'
      : user?.kyc_status === 'PENDING'
      ? 'KYC En Attente'
      : 'KYC Non Soumis';

  const kycIcon: keyof typeof MaterialIcons.glyphMap =
    user?.kyc_status === 'APPROVED'
      ? 'check-circle'
      : user?.kyc_status === 'PENDING'
      ? 'schedule'
      : 'info-outline';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={36} color={colors.primary} />
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.hint}>{matriculeLabel}</Text>
          <Badge label={kycText} tone={kycTone as any} icon={kycIcon} />
        </View>

        <Card style={styles.section}>
          {ROWS.map((r, i) => (
            <Pressable
              key={r.label}
              style={[styles.row, i > 0 && styles.rowBorder]}
              onPress={() => {
                if (r.action === 'KycOnboarding') {
                  navigation.navigate('KycOnboarding');
                } else if (r.action === 'History') {
                  navigation.navigate('History');
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

        <Pressable style={styles.logout} onPress={logout}>
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
  header: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  name: { ...typography.headlineMd, color: colors.primary },
  hint: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  section: { padding: 0, overflow: 'hidden' },
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
  },
  logoutText: { ...typography.headlineSm, fontSize: 16, color: colors.error },
});
