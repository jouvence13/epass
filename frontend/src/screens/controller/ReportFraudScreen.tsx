import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS } from '../../config/api';

interface InfractionItem {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  severity: string;
  penalty_amount: number;
  description: string;
}

export default function ReportFraudScreen({ navigation }: any) {
  const { user, token } = useAuth();
  const { showToast } = useNotifications();

  const [infractions, setInfractions] = useState<InfractionItem[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [studentInfo, setStudentInfo] = useState('');
  const [infractionType, setInfractionType] = useState('NO_TICKET');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const fetchInfractionTypes = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.CONTROLLER_INFRACTION_TYPES, {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setInfractions(data);
          if (!data.some((d: InfractionItem) => d.key === infractionType)) {
            setInfractionType(data[0].key);
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching infraction types from backend:', e);
    } finally {
      setLoadingTypes(false);
      setRefreshing(false);
    }
  }, [token, infractionType]);

  useEffect(() => {
    fetchInfractionTypes();
  }, [fetchInfractionTypes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInfractionTypes();
  };

  const isKycApproved = (user?.kyc_status || 'APPROVED') === 'APPROVED';

  const handleSubmit = async () => {
    if (!isKycApproved) {
      showToast({
        title: 'Habilitation Requise',
        message: 'Votre badge doit être validé par l’administration pour enregistrer un PV.',
        type: 'warning',
        category: 'KYC',
      });
      navigation.navigate('DriverProfile');
      return;
    }

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
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(ENDPOINTS.CONTROLLER_REPORT_FRAUD, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          infraction_type: infractionType,
          student_info: studentInfo.trim(),
          description: description.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast({
          title: `Procès-Verbal ${data.report_id || 'Enregistré'}`,
          message: data.message || 'Le signalement d’infraction a été transmis à la direction des transports.',
          type: 'success',
          category: 'TRIP',
        });
        navigation.goBack();
      } else {
        const err = await res.json().catch(() => null);
        showToast({
          title: 'Erreur d’Enregistrement',
          message: err?.detail || 'Impossible de transmettre le procès-verbal.',
          type: 'error',
          category: 'TRIP',
        });
      }
    } catch (e) {
      showToast({
        title: 'Erreur Réseau',
        message: 'Impossible de joindre le serveur.',
        type: 'error',
        category: 'GENERAL',
      });
    } finally {
      setSending(false);
    }
  };

  const selectedInfraction = infractions.find((i) => i.key === infractionType);

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
          <Text style={styles.badgePvText}>PV Contrôle</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <MaterialIcons name="gavel" size={26} color="#b91c1c" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Procès-Verbal de Contrôle</Text>
            <Text style={styles.bannerBody}>
              Ce signalement est transmis directement à la commission de discipline et à la direction des transports universitaires.
            </Text>
          </View>
        </View>

        {/* Infraction Types from Backend */}
        <Text style={styles.sectionTitle}>
          <MaterialIcons name="report-problem" size={18} color={colors.primary} /> Nature de l'Infraction (Backend)
        </Text>

        {loadingTypes ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement des motifs d'infraction...</Text>
          </View>
        ) : (
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
                    <MaterialIcons name={inf.icon || 'warning'} size={20} color={active ? '#ffffff' : colors.onSurfaceVariant} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.infractionLabel, active && { color: colors.primary, fontWeight: '700' }]}>
                        {inf.label}
                      </Text>
                      {inf.penalty_amount > 0 && (
                        <View style={styles.penaltyBadge}>
                          <Text style={styles.penaltyText}>Amende : {inf.penalty_amount} F</Text>
                        </View>
                      )}
                    </View>
                    {inf.description ? (
                      <Text style={styles.infractionDesc}>{inf.description}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Passenger Identifier */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
          <MaterialIcons name="person" size={18} color={colors.primary} /> Identification du Passager
        </Text>
        <TextInput
          value={studentInfo}
          onChangeText={setStudentInfo}
          placeholder="Nom, Matricule Étudiant ou Téléphone (si disponible)"
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
          <Pressable
            style={[styles.submitBtn, (!isKycApproved || sending) && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={sending}
          >
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
  },
  loadingText: { ...typography.bodySm, color: colors.onSurfaceVariant },
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
  infractionLabel: { ...typography.bodyMd, color: colors.onSurface, fontSize: 14, fontWeight: '600' },
  infractionDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 2 },
  penaltyBadge: {
    backgroundColor: '#fee2e2',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: '#ef4444',
  },
  penaltyText: { ...typography.labelCaps, color: '#b91c1c', fontSize: 9, fontWeight: '700' },
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

