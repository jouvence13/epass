import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { normalizeBeninPhone } from '../../utils/phoneUtils';
import { BENIN_CAMPUSES, CampusData } from '../../data/campuses';

export default function RegisterScreen({ navigation }: any) {
  const { register, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<CampusData>(BENIN_CAMPUSES[0]);
  const [showCampusPicker, setShowCampusPicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim() || !password.trim()) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (!matricule.trim()) {
      setErrorMessage(`Le numéro de matricule étudiant (${selectedCampus.code}) est obligatoire pour l'inscription.`);
      return;
    }

    const fullPhone = normalizeBeninPhone(phoneNumber.trim());

    const res = await register({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: fullPhone,
      matricule_uac: matricule.trim(),
      password: password,
      role: 'STUDENT',
      campus_code: selectedCampus.code,
    });

    if (!res.success) {
      setErrorMessage(res.error || "Échec de l'inscription.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* En-tête */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
          <View style={styles.logoBadge}>
            <MaterialIcons name="school" size={32} color={colors.onPrimary} />
          </View>
          <Text style={styles.brand}>Inscription Étudiant</Text>
          <Text style={styles.tagline}>Création de votre compte de transport ePass Campus Bénin</Text>
        </View>

        {/* Message d'erreur */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={colors.onErrorContainer} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Note d'information de sécurité */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            L'auto-inscription est réservée aux étudiants des universités publiques du Bénin.
            Choisissez votre campus de rattachement pour accéder aux lignes de bus et navettes correspondantes.
          </Text>
        </View>

        {/* Formulaire d'Inscription */}
        <Card style={styles.formCard}>
          {/* Sélection Déroulante du Campus Universitaire */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Campus Universitaire de rattachement *</Text>
            <Text style={styles.subLabel}>Université d'études</Text>
          </View>
          <Pressable
            style={styles.campusSelectBox}
            onPress={() => setShowCampusPicker(true)}
          >
            <View style={styles.campusSelectIconBox}>
              <MaterialIcons name="account-balance" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.campusCodeBadge}>{selectedCampus.code}</Text>
                <Text style={styles.campusNameText} numberOfLines={1}>{selectedCampus.name}</Text>
              </View>
              <Text style={styles.campusCityText}>📍 Ville : {selectedCampus.city}</Text>
            </View>
            <MaterialIcons name="arrow-drop-down" size={28} color={colors.primary} />
          </Pressable>

          {/* Prénom & Nom */}
          <View style={[styles.row, { marginTop: spacing.md }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Prénom *</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: Alain"
                placeholderTextColor={colors.outline}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: Koffi"
                placeholderTextColor={colors.outline}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          {/* Numéro de téléphone standard Bénin (+229 01) */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Numéro de téléphone *</Text>
            <Text style={styles.subLabel}>Standard Bénin (10 chiffres)</Text>
          </View>
          <View style={styles.phoneInputContainer}>
            <View style={styles.countryPrefixBadge}>
              <Text style={styles.countryFlag}>🇧🇯</Text>
              <Text style={styles.countryPrefixText}>+229 01</Text>
            </View>
            <TextInput
              style={styles.phoneInputField}
              placeholder="97 00 11 22"
              placeholderTextColor={colors.outline}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoCapitalize="none"
            />
          </View>

          {/* Matricule Étudiant (Obligatoire) */}
          <Text style={[styles.label, { marginTop: spacing.md }]}>
            Matricule Étudiant ({selectedCampus.code}) *
          </Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="badge" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder={`ex: ${selectedCampus.code}-2024-8492`}
              placeholderTextColor={colors.outline}
              value={matricule}
              onChangeText={setMatricule}
              autoCapitalize="characters"
            />
          </View>

          {/* Mot de passe */}
          <Text style={[styles.label, { marginTop: spacing.md }]}>Mot de passe *</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="lock" size={20} color={colors.outline} style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder="Minimum 6 caractères"
              placeholderTextColor={colors.outline}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Bouton de Soumission */}
          <PrimaryButton
            label={isLoading ? 'Inscription en cours...' : `Créer mon compte (${selectedCampus.code})`}
            icon="school"
            onPress={handleRegister}
            disabled={isLoading}
            style={{ marginTop: spacing.lg }}
          />

          {/* Lien retour connexion */}
          <View style={styles.footerLink}>
            <Text style={styles.footerText}>Déjà inscrit ? </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Se connecter</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>

      {/* Modal Déroulant de Sélection du Campus */}
      <Modal
        visible={showCampusPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCampusPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <MaterialIcons name="account-balance" size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>Sélectionnez votre Campus</Text>
              </View>
              <Pressable onPress={() => setShowCampusPicker(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Universités Nationales & Centres Universitaires du Bénin :
            </Text>

            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
              {BENIN_CAMPUSES.map((c) => {
                const isSelected = selectedCampus.code === c.code;
                return (
                  <Pressable
                    key={c.code}
                    style={[styles.campusOptionCard, isSelected && styles.campusOptionCardActive]}
                    onPress={() => {
                      setSelectedCampus(c);
                      setShowCampusPicker(false);
                    }}
                  >
                    <View style={[styles.optionRadio, isSelected && styles.optionRadioActive]}>
                      {isSelected && <View style={styles.optionRadioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.campusCodeTag, isSelected && { backgroundColor: colors.primary }]}>
                          <Text style={[styles.campusCodeTagText, isSelected && { color: '#ffffff' }]}>
                            {c.code}
                          </Text>
                        </View>
                        <Text style={[styles.optionTitle, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                          {c.name}
                        </Text>
                      </View>
                      <Text style={styles.optionSub}>📍 {c.city} • {c.description}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', marginVertical: spacing.md, position: 'relative', width: '100%' },
  backBtn: { position: 'absolute', left: 0, top: 0, padding: spacing.xs },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  brand: { ...typography.displayLg, fontSize: 24, color: colors.primary, marginTop: spacing.xs },
  tagline: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2, textAlign: 'center' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.bodyMd, color: colors.onErrorContainer, flex: 1 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: { ...typography.bodySm, color: '#065f46', flex: 1, lineHeight: 18 },
  formCard: { borderWidth: 1, borderColor: colors.surfaceVariant, padding: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  label: { ...typography.labelCaps, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  subLabel: { ...typography.bodySm, fontSize: 11, color: colors.primary, fontWeight: '600' },
  campusSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  campusSelectIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campusCodeBadge: {
    backgroundColor: colors.primary,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  campusNameText: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface, flex: 1 },
  campusCityText: { ...typography.bodySm, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    height: 48,
    overflow: 'hidden',
  },
  countryPrefixBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: colors.outlineVariant,
    gap: 4,
  },
  countryFlag: { fontSize: 16 },
  countryPrefixText: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
  phoneInputField: {
    flex: 1,
    ...typography.bodyLg,
    color: colors.onSurface,
    paddingHorizontal: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    height: 48,
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputIcon: { marginRight: spacing.sm },
  inputField: { flex: 1, ...typography.bodyLg, color: colors.onSurface },
  footerLink: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  linkText: { ...typography.bodyMd, color: colors.primary, fontWeight: '700' },

  // Modal Picker styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: { ...typography.headlineSm, fontSize: 18, color: colors.primary },
  modalSubtitle: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.md },
  campusOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    padding: spacing.md,
    gap: spacing.md,
  },
  campusOptionCardActive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioActive: { borderColor: colors.primary },
  optionRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  campusCodeTag: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  campusCodeTagText: { ...typography.labelCaps, fontSize: 10, color: colors.onSurface, fontWeight: '700' },
  optionTitle: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface, flex: 1 },
  optionSub: { ...typography.bodySm, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 3 },
});
