import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Passenger } from '../../data/passengers';

const RETICLE = 260;

export default function ScanBoardingPassScreen({ navigation }: any) {
  const { token } = useAuth();
  const { showToast } = useNotifications();
  const [flash, setFlash] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loadingPassengers, setLoadingPassengers] = useState(false);
  const [validating, setValidating] = useState(false);

  const [result, setResult] = useState<{
    id: string;
    line: string;
    time: string;
    status: string;
    isValid: boolean;
  } | null>(null);

  const scanY = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scanY, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [scanY]);

  const translateY = scanY.interpolate({ inputRange: [0, 1], outputRange: [-RETICLE / 2, RETICLE / 2] });

  const fetchPassengers = useCallback(async () => {
    setLoadingPassengers(true);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.DRIVER_PASSENGERS, {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.passengers)) {
          setPassengers(data.passengers);
        }
      }
    } catch (e) {
      console.warn('Error fetching passengers for scan:', e);
    } finally {
      setLoadingPassengers(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPassengers();
  }, [fetchPassengers]);

  const validateTicketCode = async (codeOrQr: string) => {
    const cleanInput = codeOrQr.trim();
    if (!cleanInput) {
      showToast({
        title: 'Code Requis',
        message: 'Veuillez saisir un code SMS de 8 caractères ou un token QR Code.',
        type: 'warning',
        category: 'TRIP',
      });
      return;
    }

    setValidating(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const isQr = cleanInput.startsWith('EPASS-') || cleanInput.startsWith('CAMPUS-') || cleanInput.length > 12;
      const cleanSms = cleanInput.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

      const res = await fetch(ENDPOINTS.DRIVER_VALIDATE, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          qr_code_token: isQr ? cleanInput : undefined,
          sms_backup_code: !isQr ? cleanSms : undefined,
        }),
      });

      if (res.ok) {
        const valData = await res.json();
        setResult({
          id: `${valData.student_name || 'Étudiant Campus'}${valData.matricule_uac ? ` (${valData.matricule_uac})` : ''}`,
          line: valData.line_name || 'Ligne Campus',
          time: valData.validated_time || 'À l\'instant',
          status: 'Titre de Transport Valide • Accès Autorisé',
          isValid: true,
        });
        showToast({
          title: 'Billet Validé',
          message: `${valData.student_name || 'Passager'} composté avec succès.`,
          type: 'success',
          category: 'TRIP',
        });
        setModalVisible(false);
        setManualCode('');
        fetchPassengers();
      } else {
        const err = await res.json().catch(() => null);
        setResult({
          id: cleanInput,
          line: 'Contrôle à bord',
          time: 'À l\'instant',
          status: err?.detail || 'Billet Non Valide ou Expiré',
          isValid: false,
        });
        showToast({
          title: 'Validation Échouée',
          message: err?.detail || 'Billet introuvable ou déjà composté.',
          type: 'error',
          category: 'TRIP',
        });
      }
    } catch (e) {
      showToast({
        title: 'Erreur Réseau',
        message: 'Impossible de joindre le serveur de validation.',
        type: 'error',
        category: 'TRIP',
      });
    } finally {
      setValidating(false);
    }
  };

  const openScanModal = () => {
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={['#3a4a5c', '#1c2733']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: flash ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)' }]} />

      <View style={styles.header}>
        <Pressable style={styles.roundBtn} onPress={() => navigation?.goBack?.() || navigation?.navigate?.('Home')}>
          <MaterialIcons name="arrow-back" size={20} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Scanner un Titre de Transport</Text>
        <Pressable
          style={[styles.roundBtn, { backgroundColor: colors.secondaryContainer }]}
          onPress={() => {
            setFlash((prev) => !prev);
            showToast({
              title: 'Éclairage Caméra',
              message: 'Torche activée pour la lecture des QR Codes.',
              type: 'info',
              category: 'GENERAL',
            });
          }}
        >
          <MaterialIcons name="flash-on" size={20} color={colors.onSecondaryContainer} />
        </Pressable>
      </View>

      <View style={styles.center}>
        <Pressable onPress={openScanModal}>
          <View style={styles.reticle}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]}>
              <LinearGradient
                colors={['transparent', 'rgba(160,243,153,0.85)', 'transparent']}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </View>
          <Text style={styles.tapHint}>Touchez le cadre pour saisir ou sélectionner un billet</Text>
        </Pressable>
      </View>

      {result ? (
        <Animated.View style={[styles.resultCard, { opacity: fade }]}>
          <View style={[styles.resultIcon, !result.isValid && { backgroundColor: colors.errorContainer }]}>
            <MaterialIcons
              name={result.isValid ? 'check-circle' : 'cancel'}
              size={24}
              color={result.isValid ? colors.onSecondaryContainer : colors.error}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.resultLabel, !result.isValid && { color: colors.error }]}>
              {result.status}
            </Text>
            <Text style={styles.resultTitle}>{result.id}</Text>
            <View style={styles.resultMetaRow}>
              <MaterialIcons name="route" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.resultMeta}> {result.line} • {result.time}</Text>
            </View>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.waitingCard}>
          <MaterialIcons name="qr-code-scanner" size={24} color={colors.primary} />
          <Text style={styles.waitingText}>Prêt pour le scan ou la saisie manuelle</Text>
        </View>
      )}

      <Pressable
        style={styles.manualBtn}
        onPress={openScanModal}
      >
        <MaterialIcons name="keyboard" size={20} color={colors.onSurfaceVariant} />
        <Text style={styles.manualText}>Saisir un Code SMS ou Choisir un Passager</Text>
      </Pressable>

      {/* Modal interactif de validation dynamique */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Validation de Titre</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            <Text style={styles.modalSub}>
              Saisissez le code SMS (8 caractères) ou le token QR Code :
            </Text>

            <View style={styles.inputRow}>
              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Ex: A7B9X2M4 ou token QR"
                placeholderTextColor={colors.outline}
                autoCapitalize="characters"
                style={styles.textInput}
              />
              <Pressable
                style={[styles.submitCodeBtn, (!manualCode.trim() || validating) && { opacity: 0.6 }]}
                disabled={!manualCode.trim() || validating}
                onPress={() => validateTicketCode(manualCode)}
              >
                {validating ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={styles.submitCodeText}>Valider</Text>
                )}
              </Pressable>
            </View>

            {/* Liste dynamique des passagers en attente */}
            <Text style={[styles.modalSub, { marginTop: spacing.md, fontWeight: '700' }]}>
              Passagers en attente sur cette rotation :
            </Text>

            {loadingPassengers ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
            ) : passengers.length === 0 ? (
              <Text style={styles.emptyPassengersText}>Aucun passager en attente pour cette rotation.</Text>
            ) : (
              <FlatList
                data={passengers}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 200, marginTop: spacing.xs }}
                renderItem={({ item }) => {
                  const isChecked = item.status === 'checked';
                  return (
                    <Pressable
                      style={[styles.passengerItem, isChecked && styles.passengerItemChecked]}
                      disabled={isChecked || validating}
                      onPress={() => validateTicketCode(item.matricule || item.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.passengerItemName}>{item.name}</Text>
                        <Text style={styles.passengerItemSub}>{item.matricule} • {item.phone}</Text>
                      </View>
                      <View style={[styles.passengerStatusPill, isChecked ? styles.pillChecked : styles.pillPending]}>
                        <MaterialIcons name={isChecked ? 'check' : 'qr-code'} size={14} color={isChecked ? colors.primary : colors.onTertiaryContainer} />
                        <Text style={[styles.passengerStatusText, isChecked && { color: colors.primary }]}>
                          {isChecked ? 'Composté' : 'Composter'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1c2733' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin, paddingTop: spacing.md,
  },
  roundBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(237,238,239,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headlineSm, fontSize: 16, color: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reticle: {
    width: RETICLE, height: RETICLE, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.5)', overflow: 'hidden',
  },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: colors.secondaryContainer },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.lg },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.lg },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.lg },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.lg },
  scanLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: 100, marginTop: -50 },
  tapHint: { ...typography.bodyMd, color: colors.white, textAlign: 'center', marginTop: spacing.md, opacity: 0.8 },
  resultCard: {
    flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, marginHorizontal: spacing.containerMargin,
  },
  resultIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  resultLabel: { ...typography.labelCaps, color: colors.onSecondaryContainer, marginBottom: 2 },
  resultTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  resultMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  resultMeta: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  manualBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHigh, height: 56, borderRadius: radius.lg,
    marginHorizontal: spacing.containerMargin, marginTop: spacing.sm, marginBottom: spacing.md,
  },
  manualText: { ...typography.bodyLg, color: colors.onSurfaceVariant },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.containerMargin,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  waitingText: { ...typography.bodyMd, color: colors.white, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: { ...typography.headlineSm, color: colors.primary, fontWeight: '800' },
  closeBtn: { padding: 4 },
  modalSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  textInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.bodyLg,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
  },
  submitCodeBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitCodeText: { ...typography.labelCaps, color: colors.onPrimary, fontWeight: '700' },
  emptyPassengersText: { ...typography.bodySm, color: colors.outline, marginVertical: spacing.sm },
  passengerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  passengerItemChecked: {
    opacity: 0.5,
  },
  passengerItemName: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
  passengerItemSub: { ...typography.bodySm, color: colors.outline, fontSize: 11 },
  passengerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  pillPending: { backgroundColor: colors.primaryFixed },
  pillChecked: { backgroundColor: colors.surfaceContainerHighest },
  passengerStatusText: { ...typography.labelCaps, fontSize: 10, color: colors.primary, fontWeight: '700' },
});
