import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

export default function HomeScreen({ navigation }: any) {
  const { user, justRegistered, clearJustRegistered, tickets, activeTicket, setActiveTicket, walletBalance } = useAuth();

  const studentName = user ? `${user.first_name} ${user.last_name}` : 'Étudiant';
  const activeTicketsList = tickets.filter((t) => t.status === 'ACTIVE');

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

        {/* En-tête Salutation & Solde Rapide */}
        <View style={styles.greetingHeader}>
          <View style={styles.greetingWrap}>
            <Text style={styles.greeting}>Bonjour, {user?.first_name || 'Étudiant'}</Text>
            <Text style={styles.p}>Espace transit universitaire CROUS-UAC</Text>
          </View>
          <Pressable
            style={styles.walletMiniBadge}
            onPress={() => navigation.navigate('PaymentMethods')}
          >
            <MaterialIcons name="account-balance-wallet" size={16} color={colors.primary} />
            <Text style={styles.walletMiniText}>{walletBalance.toLocaleString('fr-FR')} F</Text>
          </Pressable>
        </View>

        {/* ========================================================================= */}
        {/* SECTION 1 : MES TICKETS PAYÉS & ACTIFS                                     */}
        {/* ========================================================================= */}
        <View style={styles.sectionHeadRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="confirmation-number" size={22} color={colors.primary} />
            <Text style={styles.sectionHeaderTitle}>Mes Tickets Payés & Actifs</Text>
          </View>
          <Badge label={`${activeTicketsList.length} Valide(s)`} tone="success" />
        </View>

        {activeTicketsList.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            {activeTicketsList.map((t) => (
              <Card key={t.id} floating style={styles.activeTicketCard}>
                <View style={styles.ticketCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Badge label="Ticket Valide & Payé" tone="success" icon="check-circle" />
                    <Text style={styles.ticketRoute}>{t.route}</Text>
                    <Text style={styles.ticketBusSub}>{t.line} • {t.busId}</Text>
                  </View>
                  <Pressable
                    style={styles.qrOpenBtn}
                    onPress={() => {
                      setActiveTicket(t);
                      navigation.navigate('Tickets');
                    }}
                  >
                    <MaterialIcons name="qr-code-2" size={28} color={colors.onPrimary} />
                    <Text style={styles.qrOpenBtnText}>Scanner</Text>
                  </Pressable>
                </View>

                <View style={styles.ticketMetaRow}>
                  <View style={styles.ticketMetaItem}>
                    <MaterialIcons name="key" size={14} color={colors.primary} />
                    <Text style={styles.ticketMetaCode}>{t.code}</Text>
                  </View>
                  <View style={styles.ticketMetaItem}>
                    <MaterialIcons name="payments" size={14} color={colors.secondary} />
                    <Text style={styles.ticketMetaText}>{t.paymentMethod} ({t.price} F)</Text>
                  </View>
                  <View style={styles.ticketMetaItem}>
                    <MaterialIcons name="schedule" size={14} color={colors.outline} />
                    <Text style={styles.ticketMetaText}>{t.date}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          /* Aucun ticket actif -> Inviter à en acheter un */
          <Card style={styles.noTicketCard}>
            <MaterialIcons name="airplane-ticket" size={36} color={colors.outline} />
            <Text style={styles.noTicketTitle}>Aucun titre de transport actif</Text>
            <Text style={styles.noTicketSub}>
              Achetez votre ticket subventionné à 100 FCFA pour voyager sereinement sur le réseau CROUS.
            </Text>
            <Pressable
              style={styles.buyTicketActionBtn}
              onPress={() => navigation.navigate('Booking')}
            >
              <MaterialIcons name="qr-code-scanner" size={18} color="#ffffff" />
              <Text style={styles.buyTicketActionText}>Acheter un Ticket (100 FCFA)</Text>
            </Pressable>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* GRILLE DE NAVIGATION PRINCIPALE                                           */}
        {/* ========================================================================= */}
        <View style={styles.grid}>
          <Pressable style={styles.tile} onPress={() => navigation.navigate('Booking')}>
            <View style={[styles.tileIcon, { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="confirmation-number" size={24} color={colors.primary} />
            </View>
            <Text style={styles.tileLabel}>Réserver / Payer</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => navigation.navigate('Tickets')}>
            <View style={[styles.tileIcon, { backgroundColor: colors.secondaryContainer }]}>
              <MaterialIcons name="near-me" size={24} color={colors.onSecondaryContainer} />
            </View>
            <Text style={styles.tileLabel}>Suivi en direct</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => navigation.navigate('PaymentMethods')}>
            <View style={[styles.tileIcon, { backgroundColor: '#fef3c7' }]}>
              <MaterialIcons name="account-balance-wallet" size={24} color="#d97706" />
            </View>
            <Text style={styles.tileLabel}>Portefeuille</Text>
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
          <Text style={styles.sectionTitle}>Prochains Départs CROUS</Text>
          <View style={styles.tripRow}>
            <MaterialIcons name="directions-bus" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tripTitle}>Calavi Campus → Cotonou Étoile Rouge</Text>
              <Text style={styles.hint}>Ligne A (Express) • Départ 07:30 • Tarif: 100 FCFA</Text>
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

  greetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingWrap: { gap: 2, flex: 1 },
  greeting: { ...typography.headlineMd, color: colors.primary },
  p: { ...typography.bodySm, color: colors.onSurfaceVariant },
  walletMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  walletMiniText: {
    ...typography.labelCaps,
    fontSize: 12,
    color: '#92400e',
    fontWeight: '700',
  },

  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sectionHeaderTitle: {
    ...typography.headlineSm,
    fontSize: 17,
    color: colors.primary,
  },

  activeTicketCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 4,
    borderTopColor: colors.primary,
    padding: spacing.md,
    gap: spacing.sm,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  ticketRoute: {
    ...typography.headlineSm,
    fontSize: 16,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  ticketBusSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  qrOpenBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    gap: 2,
    minWidth: 64,
  },
  qrOpenBtnText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  ticketMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
    gap: 8,
  },
  ticketMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaCode: {
    ...typography.statusCode,
    fontSize: 12,
    color: colors.primary,
  },
  ticketMetaText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },

  noTicketCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceContainerLowest,
  },
  noTicketTitle: {
    ...typography.headlineSm,
    fontSize: 15,
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  noTicketSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  buyTicketActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  buyTicketActionText: {
    ...typography.bodySm,
    color: colors.onPrimary,
    fontWeight: '700',
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
