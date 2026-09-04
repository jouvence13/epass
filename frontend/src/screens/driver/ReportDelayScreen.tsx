import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const DELAYS = [15, 30, 45];
const INCIDENTS: { key: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'traffic', label: 'Trafic Dense / Embouteillage', icon: 'traffic' },
  { key: 'mechanical', label: 'Problème Mécanique / Panne', icon: 'build' },
  { key: 'roadblock', label: 'Déviation / Route Bloquée', icon: 'block' },
];

export default function ReportDelayScreen({ navigation }: any) {
  const { token } = useAuth();
  const { showToast } = useNotifications();
  const [delay, setDelay] = useState(15);
  const [customDelay, setCustomDelay] = useState('');
  const [incident, setIncident] = useState('traffic');
  const [sending, setSending] = useState(false);

  const broadcast = async () => {
    setSending(true);
    const delayMins = customDelay.trim() ? parseInt(customDelay, 10) || delay : delay;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.DRIVER_REPORT_DELAY, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          delay_minutes: delayMins,
          incident_type: incident,
        }),
      });

      setSending(false);
      if (res.ok) {
        showToast({
          title: 'Retard Diffusé avec Succès',
          message: `Une alerte de +${delayMins} min a été transmise en direct aux étudiants.`,
          type: 'success',
          category: 'TRIP',
        });
        navigation.goBack();
      } else {
        const errData = await res.json().catch(() => null);
        showToast({
          title: 'Erreur de Transmission',
          message: errData?.detail || 'Impossible de diffuser le retard pour ce trajet.',
          type: 'error',
          category: 'TRIP',
        });
      }
    } catch (e) {
      setSending(false);
      showToast({
        title: 'Erreur Réseau',
        message: 'Impossible de joindre le serveur.',
        type: 'error',
        category: 'GENERAL',
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* TopBar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.onPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>Signaler un Retard</Text>
        <View style={styles.emergencyBtn}>
          <MaterialIcons name="warning" size={14} color={colors.onError} />
          <Text style={styles.emergencyText}>URGENCE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Banner */}
        <View style={styles.banner}>
          <MaterialIcons name="campaign" size={28} color={colors.onTertiaryFixedVariant} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Diffusion Instantanée</Text>
            <Text style={styles.bannerBody}>
              En confirmant ci-dessous, une alerte push et une mise à jour d'horaire seront immédiatement transmises à tous les passagers de la navette.
            </Text>
          </View>
        </View>

        {/* Delay Selector */}
        <Text style={styles.sectionTitle}>
          <MaterialIcons name="schedule" size={18} color={colors.primary} /> Retard Estimé
        </Text>
        <View style={styles.delayRow}>
          {DELAYS.map((d) => (
            <Pressable
              key={d}
              onPress={() => {
                setDelay(d);
                setCustomDelay('');
              }}
              style={[styles.delayChip, delay === d && !customDelay && styles.delayChipActive]}
            >
              <Text style={[styles.delayNum, delay === d && !customDelay && styles.delayNumActive]}>+{d}</Text>
              <Text style={styles.delayUnit}>MIN</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.inputLabel}>Autre Durée (en minutes)</Text>
        <TextInput
          value={customDelay}
          onChangeText={setCustomDelay}
          placeholder="Ex: 20, 60..."
          placeholderTextColor={colors.outline}
          keyboardType="number-pad"
          style={styles.input}
        />

        {/* Incident Type */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
          <MaterialIcons name="report" size={18} color={colors.primary} /> Motif de l'Incident
        </Text>
        <View style={{ gap: spacing.sm }}>
          {INCIDENTS.map((inc) => {
            const active = incident === inc.key;
            return (
              <Pressable
                key={inc.key}
                onPress={() => setIncident(inc.key)}
                style={[styles.incidentRow, active && styles.incidentRowActive]}
              >
                <View style={[styles.incidentIcon, active && styles.incidentIconActive]}>
                  <MaterialIcons name={inc.icon} size={20} color={active ? colors.onPrimary : colors.onSurfaceVariant} />
                </View>
                <Text style={[styles.incidentLabel, active && { color: colors.primary }]}>{inc.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable style={styles.broadcastBtn} onPress={broadcast}>
            <MaterialIcons name="send" size={18} color={colors.onTertiaryContainer} />
            <Text style={styles.broadcastText}>Diffuser l'Alerte</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Loading Modal */}
      <Modal transparent visible={sending} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={colors.secondary} />
            <Text style={styles.overlayTitle}>Diffusion en cours...</Text>
            <Text style={styles.overlayBody}>Transmission de l'alerte aux passagers en temps réel.</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    height: 56, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.containerMargin, gap: spacing.sm,
  },
  backBtn: { padding: 4 },
  topBarTitle: { flex: 1, ...typography.headlineSm, fontSize: 16, color: colors.onPrimary },
  emergencyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.error,
    paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.full,
  },
  emergencyText: { ...typography.labelCaps, color: colors.onError },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  banner: {
    flexDirection: 'row', gap: spacing.md, backgroundColor: colors.tertiaryFixed,
    padding: spacing.md, borderRadius: radius.lg,
  },
  bannerTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onTertiaryFixedVariant, marginBottom: 2 },
  bannerBody: { ...typography.bodyMd, color: colors.onTertiaryFixed, opacity: 0.9 },
  sectionTitle: { ...typography.headlineSm, color: colors.primary, marginTop: spacing.sm },
  delayRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  delayChip: {
    flex: 1, height: 64, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.outlineVariant,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  delayChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryFixed },
  delayNum: { ...typography.headlineSm, fontWeight: '700', color: colors.primary },
  delayNumActive: { color: colors.primary },
  delayUnit: { ...typography.labelCaps, color: colors.onSurfaceVariant },
  inputLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: {
    height: 48, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.md,
    paddingHorizontal: spacing.md, ...typography.bodyLg, color: colors.onSurface, backgroundColor: colors.surface,
  },
  incidentRow: {
    flexDirection: 'row', alignItems: 'center', minHeight: 64, borderRadius: radius.lg, borderWidth: 2,
    borderColor: colors.outlineVariant, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.md,
  },
  incidentRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryFixed },
  incidentIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  incidentIconActive: { backgroundColor: colors.primary },
  incidentLabel: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: spacing.lg },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { ...typography.headlineSm, fontSize: 15, color: colors.primary },
  broadcastBtn: {
    flex: 1.4, height: 48, borderRadius: radius.full, backgroundColor: colors.tertiaryFixedDim,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  broadcastText: { ...typography.headlineSm, fontSize: 15, color: colors.onTertiaryContainer },
  overlay: { flex: 1, backgroundColor: 'rgba(25,28,29,0.8)', alignItems: 'center', justifyContent: 'center' },
  overlayCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    width: '80%', alignItems: 'center', gap: spacing.sm,
  },
  overlayTitle: { ...typography.headlineMd, fontSize: 20, color: colors.primary },
  overlayBody: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
});
