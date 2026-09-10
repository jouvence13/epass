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
import { normalizeBeninPhone, extractLocalDigits } from '../../utils/phoneUtils';

type LoginRole = 'STUDENT' | 'DRIVER' | 'CONTROLLER';

const ROLES: { key: LoginRole; label: string; icon: any; hint: string }[] = [
  {
    key: 'STUDENT',
    label: 'Étudiant',
    icon: 'school',
    hint: 'Accès tickets, QR Code & suivi GPS des bus campus',
  },
  {
    key: 'DRIVER',
    label: 'Chauffeur',
    icon: 'local-shipping',
    hint: 'Gestion des trajets, retards & manifeste de bord (Matricule requis)',
  },
  {
    key: 'CONTROLLER',
    label: 'Contrôleur',
    icon: 'qr-code-scanner',
    hint: 'Scan et contrôle des titres de transport à bord (Matricule requis)',
  },
];

export default function LoginScreen({ navigation }: any) {
  const { login, isLoading, justLoggedOut, clearJustLoggedOut } = useAuth();
  const [selectedRole, setSelectedRole] = useState<LoginRole>('STUDENT');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeRoleObj = ROLES.find(r => r.key === selectedRole) || ROLES[0];

  const handleRoleChange = (roleKey: LoginRole) => {
    setSelectedRole(roleKey);
    setErrorMessage(null);
  };

  const handleLogin = async () => {
    setErrorMessage(null);

    const cleanLocalDigits = extractLocalDigits(phoneNumber);
    if (!cleanLocalDigits && !phoneNumber.trim()) {
      setErrorMessage('Veuillez renseigner votre numéro de téléphone.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Veuillez renseigner votre mot de passe.');
      return;
    }

    // Vérification obligatoire du matricule pour Chauffeur et Contrôleur
    if (selectedRole === 'DRIVER') {
      if (!matricule.trim()) {
        setErrorMessage('Le matricule professionnel de chauffeur est obligatoire (ex: DRV-2024-001).');
        return;
      }
    } else if (selectedRole === 'CONTROLLER') {
      if (!matricule.trim()) {
        setErrorMessage('Le matricule officiel de contrôleur assermenté est obligatoire (ex: CTR-2024-001).');
        return;
      }
    }

    const fullPhone = normalizeBeninPhone(phoneNumber.trim());

    const res = await login(fullPhone, password.trim(), {
      expectedRole: selectedRole as UserRole,
      requiredMatricule: (selectedRole === 'DRIVER' || selectedRole === 'CONTROLLER') ? matricule.trim() : undefined,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Identifiants ou matricule incorrects.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* En-tête avec Logo ePass Campus Bénin */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <MaterialIcons name="directions-bus" size={36} color={colors.onPrimary} />
          </View>
          <Text style={styles.brand}>ePass Campus Bénin</Text>
          <Text style={styles.tagline}>Réseau National Universitaire & Inter-Campus</Text>
        </View>

        {/* Bannière de confirmation de Déconnexion */}
        {justLoggedOut && (
          <View style={styles.logoutBanner}>
            <View style={styles.logoutIconBadge}>
              <MaterialIcons name="check-circle" size={20} color="#166534" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.logoutBannerTitle}>Déconnexion réussie</Text>
              <Text style={styles.logoutBannerText}>
                Votre session a été fermée en toute sécurité.
              </Text>
            </View>
            <Pressable onPress={clearJustLoggedOut} hitSlop={10} style={styles.closeBannerBtn}>
              <MaterialIcons name="close" size={18} color="#166534" />
            </Pressable>
          </View>
        )}

        {/* Message d'erreur */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={22} color={colors.onErrorContainer} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Conteneur Formulaire & Inputs de Connexion */}
        <Card style={styles.formCard}>
          <Text style={styles.cardTitle}>Espace Connexion</Text>
          
          {/* Sélecteur de Rôle (Étudiant / Chauffeur / Contrôleur) */}
          <Text style={styles.roleHeaderLabel}>Profil d'accès au réseau :</Text>
          <View style={styles.roleSelector}>
            {ROLES.map((roleItem) => {
              const isActive = selectedRole === roleItem.key;
              return (
                <Pressable
                  key={roleItem.key}
                  style={[styles.roleOption, isActive && styles.roleOptionActive]}
                  onPress={() => handleRoleChange(roleItem.key)}
                >
                  <MaterialIcons
                    name={roleItem.icon}
                    size={18}
                    color={isActive ? colors.onPrimary : colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      isActive && { color: colors.onPrimary, fontWeight: '700' },
                    ]}
                  >
                    {roleItem.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          
          {/* Note d'information spécifique au profil */}
          <View style={[
            styles.roleBadgeNotice,
            (selectedRole === 'DRIVER' || selectedRole === 'CONTROLLER') && styles.roleBadgeNoticeStaff
          ]}>
            <MaterialIcons
              name={selectedRole === 'STUDENT' ? 'info' : 'security'}
              size={18}
              color={selectedRole === 'STUDENT' ? colors.primary : '#991b1b'}
            />
            <Text style={[
              styles.roleHint,
              (selectedRole === 'DRIVER' || selectedRole === 'CONTROLLER') && styles.roleHintStaff
            ]}>
              {selectedRole === 'DRIVER' && 'Conducteur agréé : Votre matricule professionnel délivré par la direction est obligatoire.'}
              {selectedRole === 'CONTROLLER' && 'Agent de contrôle assermenté : Votre matricule officiel d\'agent est strictement requis.'}
              {selectedRole === 'STUDENT' && activeRoleObj.hint}
            </Text>
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

          {/* Champ Matricule Obligatoire pour Chauffeur & Contrôleur */}
          {selectedRole === 'DRIVER' && (
            <>
              <Text style={[styles.label, { marginTop: spacing.md }]}>
                Matricule Professionnel Chauffeur *
              </Text>
              <View style={styles.inputWrap}>
                <MaterialIcons name="badge" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ex: DRV-2024-001"
                  placeholderTextColor={colors.outline}
                  value={matricule}
                  onChangeText={setMatricule}
                  autoCapitalize="characters"
                />
              </View>
            </>
          )}

          {selectedRole === 'CONTROLLER' && (
            <>
              <Text style={[styles.label, { marginTop: spacing.md }]}>
                Matricule Contrôleur Assermenté *
              </Text>
              <View style={styles.inputWrap}>
                <MaterialIcons name="verified-user" size={20} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ex: CTR-2024-001"
                  placeholderTextColor={colors.outline}
                  value={matricule}
                  onChangeText={setMatricule}
                  autoCapitalize="characters"
                />
              </View>
            </>
          )}

          {/* Mot de passe */}
          <Text style={[styles.label, { marginTop: spacing.md }]}>Mot de passe *</Text>
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
            label={isLoading ? 'Vérification & Connexion...' : `Se connecter (${activeRoleObj.label})`}
            icon="login"
            onPress={handleLogin}
            disabled={isLoading}
            style={{ marginTop: spacing.lg }}
          />

          {/* Lien vers Inscription Étudiant */}
          {selectedRole === 'STUDENT' ? (
            <View style={styles.footerLink}>
              <Text style={styles.footerText}>Nouvel étudiant ? </Text>
              <Pressable onPress={() => navigation.navigate('Register')}>
                <Text style={styles.linkText}>Créer un compte</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.staffNoticeFooter}>
              <MaterialIcons name="lock-outline" size={16} color={colors.outline} />
              <Text style={styles.staffNoticeText}>
                Comptes opérationnels gérés exclusivement par la Direction du Campus.
              </Text>
            </View>
          )}
        </Card>
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
  tagline: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2, textAlign: 'center' },
  logoutBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  logoutIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBannerTitle: {
    ...typography.bodyMd,
    fontWeight: '700',
    color: '#065f46',
  },
  logoutBannerText: {
    ...typography.bodySm,
    color: '#047857',
    marginTop: 1,
  },
  closeBannerBtn: {
    padding: 4,
  },
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
  errorText: { ...typography.bodyMd, color: colors.onErrorContainer, flex: 1, fontWeight: '600' },
  formCard: { width: '100%', borderWidth: 1, borderColor: colors.surfaceVariant, padding: spacing.lg },
  cardTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: spacing.xs },
  roleHeaderLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
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
  roleBadgeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  roleBadgeNoticeStaff: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  roleHint: { ...typography.bodySm, fontSize: 12, color: '#166534', flex: 1 },
  roleHintStaff: { color: '#991b1b', fontWeight: '600' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  label: { ...typography.labelCaps, color: colors.onSurfaceVariant },
  subLabel: { ...typography.bodySm, fontSize: 11, color: colors.primary, fontWeight: '600' },
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
  staffNoticeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: 6,
  },
  staffNoticeText: { ...typography.bodySm, fontSize: 12, color: colors.outline, textAlign: 'center' },
});
