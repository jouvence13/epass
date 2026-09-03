import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

export default function RoleSelectScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.logoBadge}>
          <MaterialIcons name="directions-bus" size={40} color={colors.onPrimary} />
        </View>
        <Text style={styles.brand}>CROUS-UAC</Text>
        <Text style={styles.tagline}>Billetterie de transit universitaire</Text>

        <View style={styles.cards}>
          <Pressable style={styles.card} onPress={() => navigation.navigate('KycOnboarding')}>
            <MaterialIcons name="school" size={28} color={colors.primary} />
            <Text style={styles.cardTitle}>Je suis étudiant</Text>
            <Text style={styles.cardSub}>Réserver et suivre mon ticket de bus</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => navigation.navigate('DriverTabs')}>
            <MaterialIcons name="local-shipping" size={28} color={colors.primary} />
            <Text style={styles.cardTitle}>Je suis chauffeur</Text>
            <Text style={styles.cardSub}>Gérer ma route et scanner les tickets</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  logoBadge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  brand: { ...typography.displayLg, fontSize: 28, color: colors.primary },
  tagline: { ...typography.bodyLg, color: colors.onSurfaceVariant, marginBottom: spacing.xl },
  cards: { width: '100%', gap: spacing.md },
  card: {
    width: '100%', backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.surfaceVariant, padding: spacing.lg, gap: spacing.xs,
  },
  cardTitle: { ...typography.headlineSm, color: colors.onSurface },
  cardSub: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
