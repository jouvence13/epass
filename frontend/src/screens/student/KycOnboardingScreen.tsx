import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';

const STEPS = ['Matricule', 'Student ID', 'National ID'];

export default function KycOnboardingScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [matricule, setMatricule] = useState('');

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      navigation.replace('StudentTabs');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <MaterialIcons name="school" size={22} color={colors.onSurfaceVariant} />
          </View>
          <Text style={styles.brand}>CROUS-UAC</Text>
        </View>

        <Text style={styles.h1}>Student Onboarding</Text>
        <Text style={styles.p}>Please complete your KYC verification to access transit services.</Text>

        <View style={styles.progressRow}>
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    i <= step ? { backgroundColor: colors.primary } : { backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant },
                  ]}
                >
                  {i < step ? (
                    <MaterialIcons name="check" size={16} color={colors.onPrimary} />
                  ) : (
                    <Text style={[styles.stepNum, { color: i <= step ? colors.onPrimary : colors.onSurfaceVariant }]}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, { color: i <= step ? colors.primary : colors.onSurfaceVariant }]}>{label}</Text>
              </View>
              {i < STEPS.length - 1 ? (
                <View style={[styles.stepLine, { backgroundColor: i < step ? colors.primary : colors.surfaceContainerHigh }]} />
              ) : null}
            </React.Fragment>
          ))}
        </View>

        <Card style={styles.formCard}>
          {step === 0 ? (
            <>
              <Text style={styles.cardTitle}>Enter Matricule</Text>
              <Text style={styles.inputLabel}>UAC Matricule Number</Text>
              <TextInput
                value={matricule}
                onChangeText={setMatricule}
                placeholder="e.g. 12345678"
                placeholderTextColor={colors.outline}
                keyboardType="number-pad"
                style={styles.input}
              />
            </>
          ) : step === 1 ? (
            <>
              <Text style={styles.cardTitle}>Photo of Student ID</Text>
              <View style={styles.uploadBox}>
                <MaterialIcons name="badge" size={32} color={colors.outline} />
                <Text style={styles.uploadText}>Tap to capture or upload your student ID card</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Photo of National ID</Text>
              <View style={styles.uploadBox}>
                <MaterialIcons name="credit-card" size={32} color={colors.outline} />
                <Text style={styles.uploadText}>Tap to capture or upload your national ID card</Text>
              </View>
            </>
          )}
          <PrimaryButton label={step === STEPS.length - 1 ? 'Finish' : 'Continue'} icon="arrow-forward" onPress={next} style={{ marginTop: spacing.lg }} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  brand: { ...typography.headlineSm, color: colors.primary },
  h1: { ...typography.headlineMd, color: colors.primary, marginBottom: spacing.xs },
  p: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.xl },
  progressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xl },
  stepItem: { alignItems: 'center', width: 64 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNum: { ...typography.labelCaps },
  stepLabel: { ...typography.labelCaps, marginTop: spacing.xs, textAlign: 'center' },
  stepLine: { flex: 1, height: 2, marginTop: 16, marginHorizontal: spacing.xs },
  formCard: { borderWidth: 1, borderColor: colors.surfaceVariant },
  cardTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: spacing.md },
  inputLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  input: {
    height: 48, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.md,
    paddingHorizontal: spacing.md, ...typography.bodyLg, color: colors.onSurface, backgroundColor: colors.surface,
  },
  uploadBox: {
    borderWidth: 1.5, borderColor: colors.outlineVariant, borderStyle: 'dashed', borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.sm,
  },
  uploadText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: spacing.lg },
});
