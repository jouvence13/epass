import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export default function ReportFraudScreen({ navigation }: any) {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [studentInfo, setStudentInfo] = useState('');
  const [infractionType, setInfractionType] = useState('NO_TICKET');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const infractions = [
    { key: 'NO_TICKET', label: 'Absence totale de titre de transport', icon: 'money-off' },
    { key: 'REUSED_TICKET', label: 'Tentative de réutilisation d’un billet expiré', icon: 'replay' },
    { key: 'IDENTITY_MISMATCH', label: 'Usurpation d’identité / Mauvais matricule', icon: 'person-outline' },
    { key: 'REFUSAL', label: 'Refus de contrôle ou comportement inapproprié', icon: 'warning' },
  ];

  const handleSubmit = async () => {
    if (!description.trim() && !studentInfo.trim()) {
      showToast({
        title: 'Champs requis',
        message: 'Veuillez renseigner les détails du passager ou de l’infraction.',
        type: 'warning',
        category: 'TRIP',
      });
      return;
    }

    setSending(true);
    // Simuler l'enregistrement du procès-verbal de contrôle
    setTimeout(() => {
      setSending(false);
      showToast({
        title: 'Procès-Verbal Enregistré',
        message: 'Le signalement d’infraction a été transmis à la direction CROUS.',
        type: 'success',
        category: 'TRIP',
      });
      navigation.goBack();
    }, 600);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#ffffff" />
        </Pressable>
        <Text style={styles.topBarTitle}>Signaler une Fraude</Text>
        <View style={styles.badgePv}>
          <MaterialIcons name="security" size={14} color="#ffffff" />
          <Text style={styles.badgePvText}>PV CROUS</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Banner */}
        <View style={styles.banner}>
          <MaterialIcons name="gavel" size={26} color="#b91c1c" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Procès-Verbal de Contrôle</Text>
            <Text style={styles.bannerBody}>
              Ce signalement est transmis directement à la commission de discipline et au service des transports CROUS.
            </Text>
          </View>
        </View>

        {/* Infraction Types */}
        <Text style={styles.sectionTitle}>
          <MaterialIcons name="report-problem" size={18} color={colors.primary} /> Nature de l'Infraction
        </Text>
        <View style={{ gap: spacing.sm }}>
          {infractions.map((inf) => {
            const active = infractionType === inf.key;
            return (
              <Pressable
                key={inf.key}
                onPress={() => setInfractionType(inf.key)}
                style={[styles.infractionRow, active && styles.infractionRowActive]}
              >
                <View style={[styles.infractionIcon, active && styles.infractionIconActive]}>
                  <MaterialIcons name={inf.icon as any} size={20} color={active ? '#ffffff' : colors.onSurfaceVariant} />
                </View>
                <Text style={[styles.infractionLabel, active && { color: colors.primary, fontWeight: '700' }]}>
                  {inf.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Passenger Identifier */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
          <MaterialIcons name="person" size={18} color={colors.primary} /> Identification du Passager
        </Text>
        <TextInput
          value={studentInfo}
          onChangeText={setStudentInfo}
          placeholder="Nom, Matricule UAC ou Téléphone (si disponible)"
          placeholderTextColor={colors.outline}
          style={styles.input}
        />

        {/* Observation details */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
          <MaterialIcons name="notes" size={18} color={colors.primary} /> Observations & Circonstances
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Détails : arrêt de montée, motif invoqué, refus d'obtempérer..."
          placeholderTextColor={colors.outline}
          multiline
          numberOfLines={4}
          style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: spacing.sm }]}
        />

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={sending}>
            {sending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <MaterialIcons name="assignment-turned-in" size={18} color="#ffffff" />
                <Text style={styles.submitText}>Transmettre le PV</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    height: 56,
    backgroundColor: '#b91c1c',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.containerMargin,
    gap: spacing.sm,
  },
  backBtn: { padding: 4 },
  topBarTitle: { flex: 1, ...typography.headlineSm, fontSize: 16, color: '#ffffff' },
  badgePv: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgePvText: { ...typography.labelCaps, color: '#ffffff', fontSize: 10 },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#fee2e2',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  bannerTitle: { ...typography.headlineSm, fontSize: 15, color: '#991b1b', marginBottom: 2 },
  bannerBody: { ...typography.bodySm, color: '#991b1b', opacity: 0.9 },
  sectionTitle: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface, marginTop: spacing.xs },
  infractionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  infractionRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryFixed },
  infractionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infractionIconActive: { backgroundColor: colors.primary },
  infractionLabel: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { ...typography.labelCaps, color: colors.onSurface, fontSize: 13 },
  submitBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#b91c1c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  submitText: { ...typography.labelCaps, color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
