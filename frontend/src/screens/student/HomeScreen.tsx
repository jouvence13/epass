import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

export default function HomeScreen({ navigation }: any) {
  const { user, justRegistered, clearJustRegistered } = useAuth();

  const studentName = user ? `${user.first_name} ${user.last_name}` : 'Étudiant';
  const matricule = user?.matricule_uac || 'Étudiant UAC';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ========================================================================= */}
        {/* BANNIÈRE DE BIENVENUE APRÈS INSCRIPTION (Notification éphémère)           */}
        {/* ========================================================================= */}
        {justRegistered && (
          <View style={styles.welcomeBanner}>
            <View style={styles.welcomeHeader}>
              <View style={styles.welcomeIconBadge}>
                <MaterialIcons name="celebration" size={22} color="#16a34a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.welcomeTitle}>Inscription réussie !</Text>
                <Text style={styles.welcomeSubtitle}>
                  Bienvenue <Text style={styles.bold}>{studentName}</Text> sur votre application UAC-BusPass.
                </Text>
              </View>
              <Pressable onPress={clearJustRegistered} hitSlop={10} style={styles.closeBannerBtn}>
                <MaterialIcons name="close" size={20} color="#166534" />
              </Pressable>
            </View>
          </View>
        )}

        {/* En-tête Salutation */}
        <View style={styles.greetingWrap}>
          <Text style={styles.greeting}>Bonjour, {user?.first_name || 'Étudiant'}</Text>
          <Text style={styles.p}>Bienvenue sur votre espace transit universitaire CROUS-UAC.</Text>
        </View>

        {/* Ticket Actif Card / Statut Pass */}
        {user?.kyc_status === 'APPROVED' ? (
          <Card floating style={styles.heroCard}>
            <View style={{ flex: 1 }}>
              <Badge label="Pass Universitaire Actif" tone="success" icon="check-circle" />
              <Text style={styles.heroTitle}>Ticket Campus Express</Text>
              <Text style={styles.heroSub}>Ligne A (Calavi Campus ↔ Cotonou) • Valide</Text>
            </View>
            <Pressable style={styles.heroBtn} onPress={() => navigation.navigate('Tickets')}>
              <MaterialIcons name="qr-code-2" size={28} color={colors.onPrimary} />
            </Pressable>
          </Card>
        ) : user?.kyc_status === 'PENDING' ? (
          <Card style={[styles.heroCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1 }]}>
            <View style={{ flex: 1 }}>
              <Badge label="KYC En Attente de Validation" tone="warning" icon="schedule" />
              <Text style={[styles.heroTitle, { color: '#92400e' }]}>Dossier en cours d'examen</Text>
              <Text style={[styles.heroSub, { color: '#b45309' }]}>Vos justificatifs sont en cours de modération par le CROUS.</Text>
            </View>
            <Pressable
              style={[styles.heroBtn, { backgroundColor: '#d97706' }]}
              onPress={() => navigation.navigate('KycOnboarding')}
            >
              <MaterialIcons name="hourglass-top" size={26} color="#ffffff" />
            </Pressable>
          </Card>
        ) : (
          <Card style={[styles.heroCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1 }]}>
            <View style={{ flex: 1 }}>
              <Badge label="KYC Non Soumis" tone="neutral" icon="warning" />
              <Text style={[styles.heroTitle, { color: '#991b1b' }]}>Activez votre tarif étudiant</Text>
              <Text style={[styles.heroSub, { color: '#b91c1c' }]}>Téléversez votre carte étudiant et CIP pour débloquer vos tickets.</Text>
            </View>
            <Pressable
              style={[styles.heroBtn, { backgroundColor: '#dc2626' }]}
              onPress={() => navigation.navigate('KycOnboarding')}
            >
              <MaterialIcons name="upload-file" size={26} color="#ffffff" />
            </Pressable>
          </Card>
        )}

        {/* Grille de Navigation */}
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
          <Pressable style={styles.tile} onPress={() => navigation.navigate('History')}>
            <View style={[styles.tileIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
              <MaterialIcons name="history" size={24} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.tileLabel}>Historique</Text>
          </Pressable>
        </View>

        {/* Prochain Trajet Section */}
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
  greetingWrap: { gap: 2 },
  greeting: { ...typography.headlineMd, color: colors.primary },
  p: { ...typography.bodyMd, color: colors.onSurfaceVariant },

  // Bannière de bienvenue / Notification
  welcomeBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  welcomeIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    ...typography.headlineSm,
    fontSize: 17,
    color: '#166534',
  },
  welcomeSubtitle: {
    ...typography.bodyMd,
    fontSize: 13,
    color: '#15803d',
    marginTop: 2,
  },
  bold: {
    fontWeight: '700',
  },
  closeBannerBtn: {
    padding: spacing.xs,
  },
  welcomeDetailsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    ...typography.bodySm,
    fontSize: 12,
    color: '#166534',
  },
  welcomeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  kycActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  kycActionText: {
    ...typography.bodySm,
    fontWeight: '700',
    color: '#ffffff',
  },

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
