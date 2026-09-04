import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth, UserRole } from '../../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { login, quickLogin, isLoading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!phoneNumber || !password) {
      setErrorMessage('Veuillez renseigner votre numéro de téléphone et votre mot de passe.');
      return;
    }

    const res = await login(phoneNumber.trim(), password);
    if (!res.success) {
      setErrorMessage(res.error || 'Identifiants incorrects.');
    }
  };

  const handleQuickLogin = async (role: 'STUDENT' | 'DRIVER' | 'CONTROLLER' | 'ADMIN_CROUS') => {
    setErrorMessage(null);
    await quickLogin(role);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* En-tête avec Logo CROUS-UAC */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <MaterialIcons name="directions-bus" size={36} color={colors.onPrimary} />
          </View>
          <Text style={styles.brand}>CROUS-UAC</Text>
          <Text style={styles.tagline}>Connexion à votre espace transport</Text>
        </View>

        {/* Message d'erreur */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color={colors.onErrorContainer} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Formulaire de Connexion */}
        <Card style={styles.formCard}>
          <Text style={styles.cardTitle}>Identifiants</Text>

          {/* Numéro de téléphone */}
          <Text style={styles.label}>Numéro de téléphone</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="phone" size={20} color={colors.outline} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+229 97 00 11 22"
              placeholderTextColor={colors.outline}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoCapitalize="none"
            />
          </View>

          {/* Mot de passe */}
          <Text style={[styles.label, { marginTop: spacing.md }]}>Mot de passe</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="lock" size={20} color={colors.outline} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor={colors.outline}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={colors.outline}
              />
            </Pressable>
          </View>

          {/* Bouton de Connexion */}
          <PrimaryButton
            label={isLoading ? 'Connexion en cours...' : 'Se connecter'}
            icon="login"
            onPress={handleLogin}
            disabled={isLoading}
            style={{ marginTop: spacing.lg }}
          />

          {/* Lien vers Inscription */}
          <View style={styles.footerLink}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>Créer un compte</Text>
            </Pressable>
          </View>
        </Card>

        {/* Sélecteur de Connexion Rapide (Mode Test) */}
        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>⚡ Connexion Rapide (Comptes de Test)</Text>
          <Text style={styles.quickSub}>Testez immédiatement chaque rôle en 1 clic :</Text>

          <View style={styles.quickGrid}>
            <Pressable
              style={styles.quickChip}
              onPress={() => handleQuickLogin('STUDENT')}
              disabled={isLoading}
            >
              <MaterialIcons name="school" size={22} color={colors.primary} />
              <View>
                <Text style={styles.chipTitle}>Étudiant</Text>
                <Text style={styles.chipSub}>Koffi Alain (Ticket Actif)</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.quickChip}
              onPress={() => handleQuickLogin('DRIVER')}
              disabled={isLoading}
            >
              <MaterialIcons name="local-shipping" size={22} color={colors.primary} />
              <View>
                <Text style={styles.chipTitle}>Chauffeur</Text>
                <Text style={styles.chipSub}>Chauffeur CROUS (Bus 402)</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.quickChip}
              onPress={() => handleQuickLogin('CONTROLLER')}
              disabled={isLoading}
            >
              <MaterialIcons name="qr-code-scanner" size={22} color={colors.primary} />
              <View>
                <Text style={styles.chipTitle}>Contrôleur</Text>
                <Text style={styles.chipSub}>Validation des titres</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.quickChip}
              onPress={() => handleQuickLogin('ADMIN_CROUS')}
              disabled={isLoading}
            >
              <MaterialIcons name="admin-panel-settings" size={22} color={colors.primary} />
              <View>
                <Text style={styles.chipTitle}>Admin CROUS</Text>
                <Text style={styles.chipSub}>Gestion flotte & KYC</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xxl, alignItems: 'center' },
  header: { alignItems: 'center', marginVertical: spacing.lg },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  brand: { ...typography.displayLg, fontSize: 26, color: colors.primary },
  tagline: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  errorBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.bodyMd, color: colors.onErrorContainer, flex: 1 },
  formCard: { width: '100%', borderWidth: 1, borderColor: colors.surfaceVariant, padding: spacing.lg },
  cardTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: spacing.md },
  label: { ...typography.labelCaps, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
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
  input: { flex: 1, ...typography.bodyLg, color: colors.onSurface },
  eyeBtn: { padding: spacing.xs },
  footerLink: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  linkText: { ...typography.bodyMd, color: colors.primary, fontWeight: '700' },
  quickSection: { width: '100%', marginTop: spacing.xl },
  quickTitle: { ...typography.titleMd, color: colors.onSurface, fontWeight: '700' },
  quickSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.md },
  quickGrid: { width: '100%', gap: spacing.sm },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  chipTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  chipSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
});
