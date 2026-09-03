import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';

export default function HomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>Bonjour, Étudiant 👋</Text>
        <Text style={styles.p}>Bienvenue sur votre espace transit universitaire.</Text>

        <Card floating style={styles.heroCard}>
          <View style={{ flex: 1 }}>
            <Badge label="Verified" tone="success" icon="check-circle" />
            <Text style={styles.heroTitle}>Ticket actif</Text>
            <Text style={styles.heroSub}>Campus Express Route 4 • A7B9-X2M4</Text>
          </View>
          <Pressable style={styles.heroBtn} onPress={() => navigation.navigate('Tickets')}>
            <MaterialIcons name="qr-code-2" size={28} color={colors.onPrimary} />
          </Pressable>
        </Card>

        <View style={styles.grid}>
          <Pressable style={styles.tile} onPress={() => navigation.navigate('Booking')}>
            <View style={[styles.tileIcon, { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="confirmation-number" size={24} color={colors.primary} />
            </View>
            <Text style={styles.tileLabel}>Réserver un ticket</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => navigation.navigate('Tickets')}>
            <View style={[styles.tileIcon, { backgroundColor: colors.secondaryContainer }]}>
              <MaterialIcons name="near-me" size={24} color={colors.onSecondaryContainer} />
            </View>
            <Text style={styles.tileLabel}>Suivi en direct</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => navigation.navigate('Profile')}>
            <View style={[styles.tileIcon, { backgroundColor: colors.tertiaryFixed }]}>
              <MaterialIcons name="badge" size={24} color={colors.onTertiaryFixedVariant} />
            </View>
            <Text style={styles.tileLabel}>Mon profil KYC</Text>
          </Pressable>
          <Pressable style={styles.tile}>
            <View style={[styles.tileIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
              <MaterialIcons name="history" size={24} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.tileLabel}>Historique</Text>
          </Pressable>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Prochain trajet</Text>
          <View style={styles.tripRow}>
            <MaterialIcons name="directions-bus" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tripTitle}>Calavi Campus → Cotonou Centre</Text>
              <Text style={styles.hint}>Aujourd'hui, 07:30 - Ligne A</Text>
            </View>
            <Badge label="Disponible" tone="success" />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.lg },
  greeting: { ...typography.headlineMd, color: colors.primary },
  p: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  heroCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryContainer, gap: spacing.md,
  },
  heroTitle: { ...typography.headlineSm, color: colors.onPrimaryContainer, marginTop: spacing.xs },
  heroSub: { ...typography.bodyMd, color: colors.onPrimaryContainer, opacity: 0.85 },
  heroBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  tile: {
    width: '47%', backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg,
    padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.surfaceVariant,
  },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { ...typography.bodyLg, fontWeight: '600', color: colors.onSurface },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.headlineSm, color: colors.primary },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tripTitle: { ...typography.bodyLg, fontWeight: '600' },
  hint: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
