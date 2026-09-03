import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import PrimaryButton from '../../components/PrimaryButton';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';

const SLOTS = [
  { time: '07:30 - Ligne A', seats: '32/50 places', full: false },
  { time: '08:15 - Ligne B', seats: '50/50 places', full: true },
];

export default function BookTicketScreen() {
  const [slot, setSlot] = useState(0);
  const [payment, setPayment] = useState<'mtn' | 'moov'>('mtn');
  const [phone, setPhone] = useState('');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Booking</Text>
        <Text style={styles.p}>Réservez votre trajet universitaire.</Text>

        <Card style={styles.section}>
          <Text style={styles.label}>TRAJET</Text>
          <View style={styles.routeRow}>
            <MaterialIcons name="trip-origin" size={20} color={colors.primary} />
            <View style={styles.select}>
              <Text style={styles.selectText}>Calavi Campus</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <MaterialIcons name="location-on" size={20} color={colors.error} />
            <View style={styles.select}>
              <Text style={styles.selectText}>Cotonou Centre</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.label}>HORAIRES DISPONIBLES (AUJOURD'HUI)</Text>
          {SLOTS.map((s, i) => (
            <Pressable
              key={s.time}
              disabled={s.full}
              onPress={() => setSlot(i)}
              style={[
                styles.slot,
                s.full ? styles.slotFull : slot === i ? styles.slotActive : null,
              ]}
            >
              <View style={styles.slotLeft}>
                <View style={[styles.radio, slot === i && !s.full ? styles.radioActive : null]} />
                <View>
                  <Text style={[styles.slotTime, s.full && { color: colors.onSurfaceVariant }]}>{s.time}</Text>
                  <View style={styles.slotSeatsRow}>
                    <MaterialIcons
                      name={s.full ? 'person-off' : 'groups'}
                      size={14}
                      color={s.full ? colors.error : colors.onSurfaceVariant}
                    />
                    <Text style={[styles.slotSeats, { color: s.full ? colors.error : colors.onSurfaceVariant }]}> {s.seats}</Text>
                  </View>
                </View>
              </View>
              <Badge label={s.full ? 'Complet' : 'Disponible'} tone={s.full ? 'error' : 'success'} />
            </Pressable>
          ))}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.label}>MODE DE PAIEMENT</Text>
          <Pressable style={[styles.payRow, payment === 'mtn' && styles.payRowActive]} onPress={() => setPayment('mtn')}>
            <View style={[styles.radio, payment === 'mtn' ? styles.radioActive : null]} />
            <View style={[styles.payLogo, { backgroundColor: colors.mtnYellow }]}>
              <Text style={styles.payLogoText}>MTN</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.slotTime}>MTN Mobile Money</Text>
              <Text style={styles.hint}>Frais: 0F</Text>
            </View>
          </Pressable>
          <Pressable style={[styles.payRow, payment === 'moov' && styles.payRowActive]} onPress={() => setPayment('moov')}>
            <View style={[styles.radio, payment === 'moov' ? styles.radioActive : null]} />
            <View style={[styles.payLogo, { backgroundColor: colors.moovBlue }]}>
              <Text style={[styles.payLogoText, { color: colors.white }]}>Moov</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.slotTime}>Moov Money</Text>
              <Text style={styles.hint}>Frais: 0F</Text>
            </View>
          </Pressable>

          <Text style={[styles.label, { marginTop: spacing.sm }]}>NUMÉRO DE PAIEMENT</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Ex: 97000000"
            placeholderTextColor={colors.outline}
            keyboardType="phone-pad"
            style={styles.input}
          />
        </Card>

        <PrimaryButton
          label="Payer & Réserver"
          trailing="250 FCFA"
          variant="gold"
          floating
          onPress={() => Alert.alert('Réservation', 'Un SMS de confirmation vous sera envoyé.')}
          style={{ marginTop: spacing.sm }}
        />
        <Text style={styles.footerNote}>Un SMS de confirmation vous sera envoyé.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  h1: { ...typography.headlineMd, color: colors.primary },
  p: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  section: { gap: spacing.sm },
  label: { ...typography.labelCaps, color: colors.outline, marginBottom: spacing.xs },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  routeLine: { width: 2, height: 16, backgroundColor: colors.outlineVariant, marginLeft: 9 },
  select: {
    flex: 1, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 12, backgroundColor: colors.surface,
  },
  selectText: { ...typography.bodyLg, color: colors.onSurface },
  slot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.md, padding: spacing.sm,
  },
  slotActive: { borderColor: colors.primary },
  slotFull: { backgroundColor: colors.surfaceDim, opacity: 0.7 },
  slotLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  slotTime: { ...typography.bodyLg, fontWeight: '600' },
  slotSeatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  slotSeats: { ...typography.bodyMd },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.outlineVariant },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  payRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, height: 64,
    borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.md, paddingHorizontal: spacing.sm,
  },
  payRowActive: { borderColor: colors.primary },
  payLogo: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  payLogoText: { fontWeight: '700', color: colors.black },
  hint: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  input: {
    height: 48, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.md,
    paddingHorizontal: spacing.md, ...typography.bodyLg, color: colors.onSurface, backgroundColor: colors.surface,
  },
  footerNote: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
});
