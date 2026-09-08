import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';
import { useAuth, UserRole } from '../context/AuthContext';
import { normalizeBeninPhone } from '../utils/phoneUtils';
import PrimaryButton from '../components/PrimaryButton';

interface RoleOption {
  key: UserRole;
  title: string;
  sub: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  requiresMatricule: boolean;
  matriculePlaceholder: string;
  defaultPhone: string;
  defaultMatricule: string;
}

const ROLES_LIST: RoleOption[] = [
  {
    key: 'STUDENT',
    title: 'Espace Étudiant',
    sub: 'Réservation, paiement MoMoPay & QR Code de bord',
    icon: 'school',
    requiresMatricule: false,
    matriculePlaceholder: 'ex: UAC-2024-8492',
    defaultPhone: '+2290197001122',
    defaultMatricule: 'UAC-2024-8492',
  },
  {
    key: 'DRIVER',
    title: 'Conducteur / Chauffeur',
    sub: 'Trajets en direct, signalement & manifeste de bord',
    icon: 'local-shipping',
    badge: 'Matricule requis',
    badgeColor: '#b45309',
    requiresMatricule: true,
    matriculePlaceholder: 'ex: DRV-2024-001',
    defaultPhone: '+2290197000001',
    defaultMatricule: 'DRV-2024-001',
  },
  {
    key: 'CONTROLLER',
    title: 'Contrôleur de Ligne',
    sub: 'Terminal de scan & vérification assermentée des titres',
    icon: 'qr-code-scanner',
    badge: 'Matricule requis',
    badgeColor: '#b91c1c',
    requiresMatricule: true,
    matriculePlaceholder: 'ex: CTR-2024-001',
    defaultPhone: '+2290197000002',
    defaultMatricule: 'CTR-2024-001',
  },
  {
    key: 'ADMIN',
    title: 'Direction Universitaire',
    sub: 'Directeur de Campus & Super Administration Bénin',
    icon: 'admin-panel-settings',
    badge: 'Administration',
    badgeColor: '#008751',
    requiresMatricule: true,
    matriculePlaceholder: 'ex: ADMIN-2024-001',
    defaultPhone: '+2290197000000',
    defaultMatricule: 'ADMIN-2024-001',
  },
];

export default function RoleSelectScreen({ navigation }: any) {
  const { login, isAuthenticated, user, logout } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectRole = (roleItem: RoleOption) => {
    setSelectedRole(roleItem);
    setPhoneNumber(roleItem.defaultPhone);
    setMatricule(roleItem.defaultMatricule);
    setPassword(roleItem.key === 'STUDENT' ? 'Student1234' : roleItem.key === 'DRIVER' ? 'Driver1234' : roleItem.key === 'CONTROLLER' ? 'Controller1234' : 'Admin1234');
    setErrorMessage(null);
    setModalVisible(true);
  };

  const handleVerifyAndProceed = async () => {
    if (!selectedRole) return;
    setErrorMessage(null);

    // Vérification du matricule obligatoire
    if (selectedRole.requiresMatricule && !matricule.trim()) {
      setErrorMessage(`Le matricule officiel (${selectedRole.title}) est obligatoire pour accéder à cet espace.`);
      return;
    }

    if (!phoneNumber.trim() || !password.trim()) {
      setErrorMessage('Numéro de téléphone et mot de passe requis.');
      return;
    }

    setIsVerifying(true);
    const fullPhone = normalizeBeninPhone(phoneNumber.trim());

    const res = await login(fullPhone, password.trim(), {
      expectedRole: selectedRole.key,
      requiredMatricule: selectedRole.requiresMatricule ? matricule.trim() : undefined,
    });

    setIsVerifying(false);

    if (res.success) {
      setModalVisible(false);
      // Navigation automatique gérée par RootNavigator selon le rôle
    } else {
      setErrorMessage(res.error || `Accès refusé : Le matricule ou les identifiants ne sont pas autorisés.`);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Logo et Entête Bénin */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <MaterialIcons name="directions-bus" size={38} color={colors.onPrimary} />
          </View>
          <Text style={styles.brand}>ePass Campus Bénin</Text>
          <Text style={styles.tagline}>Portail Officiel du Réseau Universitaire</Text>
          <View style={styles.countryBadge}>
            <Text style={styles.countryFlag}>🇧🇯</Text>
            <Text style={styles.countryBadgeText}>RÉPUBLIQUE DU BÉNIN</Text>
          </View>
        </View>

        {/* Info sécurité */}
        <View style={styles.securityNotice}>
          <MaterialIcons name="verified-user" size={20} color="#008751" />
          <Text style={styles.securityNoticeText}>
            Pour des raisons de sécurité, chaque profil (Chauffeur, Contrôleur, Administration) requiert la saisie d'un matricule professionnel valide.
          </Text>
        </View>

        {/* Grille de sélection des Rôles */}
        <View style={styles.cards}>
          {ROLES_LIST.map((role) => (
            <Pressable
              key={role.key}
              style={styles.card}
              onPress={() => handleSelectRole(role)}
            >
              <View style={styles.cardIconBox}>
                <MaterialIcons name={role.icon} size={28} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>{role.title}</Text>
                  {role.badge && (
                    <View style={[styles.roleBadge, { backgroundColor: role.badgeColor || colors.primary }]}>
                      <Text style={styles.roleBadgeText}>{role.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardSub}>{role.sub}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.outline} />
            </Pressable>
          ))}
        </View>

        {/* Bouton de redirection vers la page de connexion standard */}
        <Pressable
          style={styles.standardLoginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.standardLoginText}>
            Accéder à l'écran de connexion traditionnel →
          </Text>
        </Pressable>
      </ScrollView>

      {/* Modal de Vérification Obligatoire du Matricule */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                <MaterialIcons
                  name={selectedRole?.icon || 'security'}
                  size={24}
                  color={colors.primary}
                />
                <View>
                  <Text style={styles.modalTitle}>Authentification Sécurisée</Text>
                  <Text style={styles.modalSubtitle}>{selectedRole?.title}</Text>
                </View>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {/* Alerte Erreur */}
            {errorMessage && (
              <View style={styles.modalError}>
                <MaterialIcons name="error-outline" size={20} color={colors.onErrorContainer} />
                <Text style={styles.modalErrorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Champ Téléphone Bénin */}
            <Text style={styles.inputLabel}>Numéro de téléphone Bénin *</Text>
            <View style={styles.phoneInputWrap}>
              <View style={styles.phonePrefixTag}>
                <Text style={{ fontSize: 14 }}>🇧🇯</Text>
                <Text style={styles.phonePrefixText}>+229 01</Text>
              </View>
              <TextInput
                style={styles.phoneTextInput}
                placeholder="97 00 11 22"
                placeholderTextColor={colors.outline}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            {/* Champ Matricule */}
            {selectedRole?.requiresMatricule && (
              <>
                <Text style={styles.inputLabel}>
                  Matricule Professionnel Requis *
                </Text>
                <View style={styles.inputWrap}>
                  <MaterialIcons name="badge" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={selectedRole.matriculePlaceholder}
                    placeholderTextColor={colors.outline}
                    value={matricule}
                    onChangeText={setMatricule}
                    autoCapitalize="characters"
                  />
                </View>
              </>
            )}

            {/* Champ Mot de passe */}
            <Text style={styles.inputLabel}>Mot de passe *</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="lock" size={20} color={colors.outline} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor={colors.outline}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Boutons d'action */}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={isVerifying}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>

              <PrimaryButton
                label={isVerifying ? 'Vérification...' : 'Valider & Entrer'}
                icon="verified"
                onPress={handleVerifyAndProceed}
                disabled={isVerifying}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xxl, alignItems: 'center' },
  header: { alignItems: 'center', marginVertical: spacing.lg },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  brand: { ...typography.displayLg, fontSize: 26, color: colors.primary },
  tagline: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2, textAlign: 'center' },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    gap: 6,
    marginTop: spacing.sm,
  },
  countryFlag: { fontSize: 14 },
  countryBadgeText: { ...typography.labelCaps, color: '#065f46', fontSize: 10, letterSpacing: 1 },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    width: '100%',
  },
  securityNoticeText: { ...typography.bodySm, color: '#334155', flex: 1, lineHeight: 18 },
  cards: { width: '100%', gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  cardTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  roleBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeText: { ...typography.labelCaps, fontSize: 9, color: '#ffffff', fontWeight: '700' },
  cardSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  standardLoginLink: { marginTop: spacing.xl, padding: spacing.sm },
  standardLoginText: { ...typography.bodyMd, color: colors.primary, fontWeight: '700', textAlign: 'center' },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.headlineSm, fontSize: 18, color: colors.primary },
  modalSubtitle: { ...typography.bodySm, color: colors.onSurfaceVariant, fontWeight: '600' },
  closeBtn: { padding: 4 },
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalErrorText: { ...typography.bodySm, color: colors.onErrorContainer, flex: 1, fontWeight: '600' },
  inputLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, marginTop: spacing.sm, marginBottom: 4 },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    height: 48,
    overflow: 'hidden',
  },
  phonePrefixTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: colors.outlineVariant,
    gap: 4,
  },
  phonePrefixText: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
  phoneTextInput: {
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
  textInput: { flex: 1, ...typography.bodyLg, color: colors.onSurface },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cancelBtnText: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurfaceVariant },
});
