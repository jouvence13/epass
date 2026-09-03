import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';

const ROWS: { icon: keyof typeof MaterialIcons.glyphMap; label: string }[] = [
  { icon: 'receipt-long', label: "Historique d'achats" },
  { icon: 'payments', label: 'Moyens de paiement' },
  { icon: 'notifications', label: 'Notifications' },
  { icon: 'help-outline', label: 'Aide & support' },
];

export default function ProfileScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={32} color={colors.onSurfaceVariant} />
          </View>
          <Text style={styles.name}>Étudiant UAC</Text>
          <Text style={styles.hint}>Matricule 2023-4458</Text>
          <Badge label="KYC Vérifié" tone="success" icon="check-circle" />
        </View>

        <Card style={styles.section}>
          {ROWS.map((r, i) => (
            <Pressable key={r.label} style={[styles.row, i > 0 && styles.rowBorder]}>
              <MaterialIcons name={r.icon} size={22} color={colors.onSurfaceVariant} />
              <Text style={styles.rowLabel}>{r.label}</Text>
              <MaterialIcons name="chevron-right" size={22} color={colors.outline} />
            </Pressable>
          ))}
        </Card>

        <Pressable
          style={styles.logout}
          onPress={() => navigation.getParent()?.navigate('RoleSelect')}
        >
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
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  name: { ...typography.headlineMd, color: colors.primary },
  hint: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  section: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surfaceVariant },
  rowLabel: { flex: 1, ...typography.bodyLg, color: colors.onSurface },
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.error, borderRadius: radius.md, height: 48,
  },
  logoutText: { ...typography.headlineSm, fontSize: 16, color: colors.error },
});
