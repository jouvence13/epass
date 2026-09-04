import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Easing, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

export default function ActiveTicketScreen() {
  const { user } = useAuth();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  const isApproved = user?.kyc_status === 'APPROVED';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.alertBanner}>
          <MaterialIcons name="info-outline" size={22} color={colors.onErrorContainer} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Information Trafic : Ligne Campus</Text>
            <Text style={styles.alertBody}>Circulation fluide entre le campus d'Abomey-Calavi et Cotonou.</Text>
          </View>
        </View>

        <Card floating style={styles.ticketCard}>
          <View style={styles.validBadge}>
            <MaterialIcons
              name={isApproved ? 'check-circle' : user?.kyc_status === 'PENDING' ? 'schedule' : 'info'}
              size={14}
              color={colors.onSecondary}
            />
            <Text style={styles.validText}>
              {isApproved ? 'Ticket Valide' : user?.kyc_status === 'PENDING' ? 'KYC En Attente' : 'KYC Non Soumis'}
            </Text>
          </View>
          <Text style={styles.route}>Campus Express • Ligne A</Text>
          <Text style={styles.studentId}>Matricule : {user?.matricule_uac || 'UAC-2024-XXXX'}</Text>

          <View style={styles.qrWrap}>
            <View style={styles.qrBox}>
              <QRCode
                value={`CROUS-UAC-TICKET-${user?.matricule_uac || 'ETUDIANT'}-A7B9`}
                size={160}
                color={colors.onBackground}
                backgroundColor={colors.white}
              />
            </View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                { transform: [{ scale: ringScale }], opacity: ringOpacity },
              ]}
            />
          </View>

          <Text style={styles.code}>A7B9-X2M4</Text>

          <PrimaryButton
            label="Recycler mon Ticket"
            icon="recycling"
            variant="muted"
            onPress={() => Alert.alert('Ticket Universitaire', 'Votre ticket a été replacé dans la file active.')}
            style={{ width: '100%' }}
          />
          <Text style={styles.availFor}>Valable pour la journée en cours</Text>
        </Card>

        <Card style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapTitle}>Suivi GPS en Direct</Text>
              <Text style={styles.hint}>Bus CROUS #402 • Remplissage : 65%</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.eta}>8 min</Text>
              <Text style={styles.etaLabel}>Arrivée estimée</Text>
            </View>
          </View>
          <View style={styles.mapArea}>
            <View style={[StyleSheet.absoluteFill, styles.mapGrid]}>
              {Array.from({ length: 24 }).map((_, i) => (
                <View key={i} style={styles.mapCell} />
              ))}
            </View>
            <View style={styles.routeLine} />
            <View style={styles.busMarker}>
              <MaterialIcons name="directions-bus" size={22} color={colors.onPrimary} />
              <View style={styles.navBadge}>
                <MaterialIcons name="navigation" size={10} color={colors.primary} />
              </View>
            </View>
            <View style={styles.liveDot} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.lg },
  alertBanner: {
    flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.errorContainer,
    padding: spacing.md, borderRadius: radius.md,
  },
  alertTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onErrorContainer },
  alertBody: { ...typography.bodyMd, color: colors.onErrorContainer, opacity: 0.9 },
  ticketCard: {
    alignItems: 'center', paddingTop: spacing.xl, borderTopWidth: 4, borderTopColor: colors.primary,
  },
  validBadge: {
    position: 'absolute', top: -14, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.secondary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full,
  },
  validText: { ...typography.labelCaps, color: colors.onSecondary },
  route: { ...typography.headlineMd, color: colors.primary, marginTop: spacing.sm },
  studentId: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg },
  qrWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  qrBox: {
    width: 200, height: 200, backgroundColor: colors.white, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.surfaceVariant,
  },
  pulseRing: {
    position: 'absolute', width: 200, height: 200, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.secondary,
  },
  code: {
    ...typography.statusCode, color: colors.primaryContainer, backgroundColor: colors.surfaceContainer,
    width: '100%', textAlign: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.lg,
  },
  availFor: { ...typography.labelCaps, color: colors.outline, marginTop: spacing.sm },
  mapCard: { padding: 0, overflow: 'hidden' },
  mapHeader: {
    flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLow, borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant,
  },
  mapTitle: { ...typography.headlineSm, color: colors.primary },
  hint: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  eta: { ...typography.displayLg, fontSize: 28, color: colors.secondary },
  etaLabel: { ...typography.labelCaps, color: colors.outline },
  mapArea: {
    height: 260, backgroundColor: colors.surfaceVariant, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  mapGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  mapCell: {
    width: '25%', height: '25%', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.surfaceDim,
  },
  routeLine: {
    position: 'absolute', left: '15%', right: '15%', top: '50%', height: 4,
    backgroundColor: colors.primaryFixedDim, borderRadius: 2, transform: [{ rotate: '-8deg' }],
  },
  busMarker: {
    position: 'absolute', top: '38%', left: '58%', width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  navBadge: {
    position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  liveDot: {
    position: 'absolute', top: '52%', left: '61%', width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.secondary,
  },
});
