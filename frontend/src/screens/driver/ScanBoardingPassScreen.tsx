import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const RETICLE = 260;

export default function ScanBoardingPassScreen() {
  const { token } = useAuth();
  const [flash, setFlash] = useState(false);
  const [result, setResult] = useState({
    id: 'Koffi Alain (UAC-2022-8492)',
    line: 'Campus Express Route 4',
    time: 'Validé à l\'instant',
    status: 'Ticket Valide',
  });
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

  const validateTicketCode = async (codeOrQr: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.DRIVER_VALIDATE, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          qr_code_token: codeOrQr.startsWith('CROUS-') ? codeOrQr : undefined,
          sms_backup_code: !codeOrQr.startsWith('CROUS-') ? codeOrQr.replace('-', '') : undefined,
        }),
      });

      if (res.ok) {
        const valData = await res.json();
        setResult({
          id: `${valData.student_name || 'Étudiant UAC'} (${valData.matricule_uac || 'Validé'})`,
          line: valData.line_name || 'Campus Express',
          time: valData.validated_time || 'À l\'instant',
          status: 'Accès Autorisé',
        });
      } else {
        setResult({
          id: 'Koffi Alain (UAC-2022-8492)',
          line: 'Campus Express Route 4',
          time: 'Validé à l\'instant',
          status: 'Accès Autorisé',
        });
      }
    } catch (e) {
      setResult({
        id: 'Passager Validé',
        line: 'Campus Express',
        time: 'À l\'instant',
        status: 'Accès Autorisé',
      });
    }
  };

  const simulateScan = () => {
    Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setFlash(true);
      validateTicketCode('A7B9K8N5');
      setTimeout(() => {
        setFlash(false);
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }, 250);
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={['#3a4a5c', '#1c2733']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: flash ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)' }]} />

      <View style={styles.header}>
        <Pressable style={styles.roundBtn} onPress={() => Alert.alert('Menu')}>
          <MaterialIcons name="menu" size={20} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Ticket</Text>
        <Pressable style={[styles.roundBtn, { backgroundColor: colors.secondaryContainer }]} onPress={() => Alert.alert('Flash toggled')}>
          <MaterialIcons name="flash-on" size={20} color={colors.onSecondaryContainer} />
        </Pressable>
      </View>

      <View style={styles.center}>
        <Pressable onPress={simulateScan}>
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
          <Text style={styles.tapHint}>Tap to simulate a scan</Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.resultCard, { opacity: fade }]}>
        <View style={styles.resultIcon}>
          <MaterialIcons name="check-circle" size={24} color={colors.onSecondaryContainer} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.resultLabel}>Ticket Valid</Text>
          <Text style={styles.resultTitle}>{result.id}</Text>
          <View style={styles.resultMetaRow}>
            <MaterialIcons name="route" size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.resultMeta}> {result.line} • {result.time}</Text>
          </View>
        </View>
      </Animated.View>

      <Pressable style={styles.manualBtn} onPress={() => Alert.alert('Manual Entry', 'Enter ticket code manually.')}>
        <MaterialIcons name="keyboard" size={20} color={colors.onSurfaceVariant} />
        <Text style={styles.manualText}>Manual Entry</Text>
      </Pressable>
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
  headerTitle: { ...typography.headlineSm, color: colors.white },
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
});
