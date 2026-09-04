import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth, UserRole } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const { register, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);
    if (!firstName || !lastName || !phoneNumber || !password) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const res = await register({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phoneNumber.trim(),
      matricule_uac: matricule.trim() || undefined,
      password: password,
      role: role,
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
          <Text style={styles.brand}>Créer un compte</Text>
          <Text style={styles.tagline}>Rejoignez le réseau de transit universitaire UAC</Text>
        </View>

        {/* Message d'erreur */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={colors.onErrorContainer} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Choix du Rôle Opérationnel (Admin exclu de l'auto-inscription) */}
        <Text style={styles.roleLabel}>Sélectionnez votre profil :</Text>
        <View style={styles.roleSelector}>
          <Pressable
            style={[styles.roleOption, role === 'STUDENT' && styles.roleOptionActive]}
            onPress={() => setRole('STUDENT')}
          >
            <MaterialIcons
              name="school"
              size={18}
              color={role === 'STUDENT' ? colors.onPrimary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.roleText,
                role === 'STUDENT' && { color: colors.onPrimary, fontWeight: '700' },
              ]}
            >
              Étudiant
            </Text>
          </Pressable>

          <Pressable
            style={[styles.roleOption, role === 'DRIVER' && styles.roleOptionActive]}
            onPress={() => setRole('DRIVER')}
          >
            <MaterialIcons
              name="local-shipping"
              size={18}
              color={role === 'DRIVER' ? colors.onPrimary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.roleText,
                role === 'DRIVER' && { color: colors.onPrimary, fontWeight: '700' },
              ]}
            >
              Chauffeur
            </Text>
          </Pressable>

          <Pressable
            style={[styles.roleOption, role === 'CONTROLLER' && styles.roleOptionActive]}
            onPress={() => setRole('CONTROLLER')}
          >
            <MaterialIcons
              name="qr-code-scanner"
              size={18}
              color={role === 'CONTROLLER' ? colors.onPrimary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.roleText,
                role === 'CONTROLLER' && { color: colors.onPrimary, fontWeight: '700' },
              ]}
            >
              Contrôleur
            </Text>
          </Pressable>
        </View>

        {/* Note de sécurité sur les rôles */}
        <View style={styles.roleNotice}>
          <MaterialIcons name="info-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.roleNoticeText}>
            Les comptes d'administration CROUS sont nominatifs et créés par la direction.
          </Text>
        </View>

        {/* Formulaire d'Inscription */}
        <Card style={styles.formCard}>
          {/* Prénom & Nom */}
          <View style={styles.row}>
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

          {/* Numéro de téléphone */}
          <Text style={[styles.label, { marginTop: spacing.md }]}>Numéro de téléphone *</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="phone" size={20} color={colors.outline} style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder="+229 97 00 11 22"
              placeholderTextColor={colors.outline}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>

          {/* Matricule (Étudiant) */}
          {role === 'STUDENT' && (
            <>
              <Text style={[styles.label, { marginTop: spacing.md }]}>Matricule UAC (optionnel)</Text>
              <View style={styles.inputWrap}>
                <MaterialIcons name="badge" size={20} color={colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="ex: UAC-2024-8492"
                  placeholderTextColor={colors.outline}
                  value={matricule}
                  onChangeText={setMatricule}
                />
              </View>
            </>
          )}

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
            label={isLoading ? 'Inscription en cours...' : "S'inscrire"}
            icon="check"
            onPress={handleRegister}
            disabled={isLoading}
            style={{ marginTop: spacing.lg }}
          />

          {/* Lien retour connexion */}
          <View style={styles.footerLink}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Se connecter</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', marginVertical: spacing.md, position: 'relative', width: '100%' },
  backBtn: { position: 'absolute', left: 0, top: 0, padding: spacing.xs },
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
  roleLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing.xs,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: 4,
  },
  roleOptionActive: { backgroundColor: colors.primary },
  roleText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  roleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  roleNoticeText: { ...typography.bodySm, fontSize: 12, color: colors.onSurfaceVariant },
  formCard: { borderWidth: 1, borderColor: colors.surfaceVariant, padding: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  label: { ...typography.labelCaps, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
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
});
