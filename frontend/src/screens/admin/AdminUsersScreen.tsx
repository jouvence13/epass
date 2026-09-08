import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS } from '../../config/api';
import { normalizeBeninPhone } from '../../utils/phoneUtils';
import { BENIN_CAMPUSES } from '../../data/campuses';

interface UserItem {
  user_id: string;
  matricule_uac?: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  role: string;
  kyc_status: string;
  campus_id?: string;
  campus_code?: string;
  campus_name?: string;
  is_active: boolean;
}

export default function AdminUsersScreen() {
  const { token, user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const { showToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal enroll staff
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [newRole, setNewRole] = useState<'DRIVER' | 'CONTROLLER' | 'ADMIN_CROUS'>('DRIVER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [enrollCampus, setEnrollCampus] = useState('UAC');
  const [enrolling, setEnrolling] = useState(false);

  // Modal Attribution / Modification Campus (SuperAdmin)
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [userToReassign, setUserToReassign] = useState<UserItem | null>(null);
  const [targetCampusCode, setTargetCampusCode] = useState('UAC');
  const [isReassigning, setIsReassigning] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const url = roleFilter !== 'ALL' ? `${ENDPOINTS.ADMIN_USERS}?role=${roleFilter}` : ENDPOINTS.ADMIN_USERS;
      const res = await fetch(url, { credentials: 'include', headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(data);
        }
      }
    } catch (e) {
      console.warn('Error fetching users:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleEnrollStaff = async () => {
    if (!firstName || !lastName || !phone || !password) {
      showToast({
        title: 'Formulaire incomplet',
        message: 'Veuillez remplir tous les champs obligatoires.',
        type: 'warning',
        category: 'GENERAL',
      });
      return;
    }

    if ((newRole === 'DRIVER' || newRole === 'CONTROLLER') && !matricule.trim()) {
      showToast({
        title: 'Matricule Obligatoire',
        message: `Le matricule professionnel est obligatoire pour un ${newRole === 'DRIVER' ? 'Chauffeur (ex: DRV-2024-001)' : 'Contrôleur (ex: CTR-2024-001)'}.`,
        type: 'warning',
        category: 'GENERAL',
      });
      return;
    }

    setEnrolling(true);
    const fullPhone = normalizeBeninPhone(phone.trim());
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(ENDPOINTS.ADMIN_CREATE_USER, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: fullPhone,
          matricule_uac: matricule.trim() || undefined,
          password: password,
          role: newRole,
          campus_code: enrollCampus,
          kyc_status: 'APPROVED',
        }),
      });

      if (res.ok) {
        showToast({
          title: 'Agent Enrôlé avec Succès',
          message: `Le compte ${newRole} de ${firstName} ${lastName} a été affecté au campus ${enrollCampus}.`,
          type: 'success',
          category: 'GENERAL',
        });
        setShowEnrollModal(false);
        setFirstName('');
        setLastName('');
        setPhone('');
        setMatricule('');
        setPassword('');
        await fetchUsers();
      } else {
        const err = await res.json().catch(() => null);
        showToast({
          title: 'Erreur',
          message: err?.detail || 'Impossible d’enrôler cet agent.',
          type: 'error',
          category: 'GENERAL',
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
      setEnrolling(false);
    }
  };

  const openReassignCampusModal = (targetUser: UserItem) => {
    setUserToReassign(targetUser);
    setTargetCampusCode(targetUser.campus_code || 'UAC');
    setReassignModalVisible(true);
  };

  const handleConfirmReassignCampus = async () => {
    if (!userToReassign) return;
    setIsReassigning(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(ENDPOINTS.ADMIN_ASSIGN_CAMPUS(userToReassign.user_id), {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          campus_code: targetCampusCode,
        }),
      });

      if (res.ok) {
        showToast({
          title: 'Campus Attribué avec Succès !',
          message: `Le compte de ${userToReassign.first_name} ${userToReassign.last_name} a été affecté au campus ${targetCampusCode}.`,
          type: 'success',
          category: 'GENERAL',
        });
        setReassignModalVisible(false);
        await fetchUsers();
      } else {
        const err = await res.json().catch(() => null);
        showToast({
          title: 'Erreur',
          message: err?.detail || 'Impossible d’attribuer ce campus.',
          type: 'error',
          category: 'GENERAL',
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
      setIsReassigning(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'DRIVER':
        return { label: 'Chauffeur', color: '#b45309' };
      case 'CONTROLLER':
        return { label: 'Contrôleur', color: '#b91c1c' };
      case 'ADMIN':
      case 'ADMIN_CAMPUS':
      case 'ADMIN_CROUS':
        return { label: 'Directeur Campus', color: '#008751' };
      case 'SUPERADMIN':
        return { label: 'Super Admin National', color: '#047857' };
      case 'STUDENT':
      default:
        return { label: 'Étudiant', color: '#0284c7' };
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Comptes & Utilisateurs</Text>
            <Text style={styles.sub}>
              {isSuperAdmin
                ? 'Supervision Nationale : Attribution de campus & gestion des directeurs'
                : 'Gestion locale des chauffeurs, contrôleurs et usagers'}
            </Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => setShowEnrollModal(true)}>
            <MaterialIcons name="person-add" size={18} color="#ffffff" />
            <Text style={styles.addBtnText}>Enrôler un Agent</Text>
          </Pressable>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {[
            { key: 'ALL', label: 'Tous' },
            { key: 'DRIVER', label: 'Chauffeurs' },
            { key: 'CONTROLLER', label: 'Contrôleurs' },
            { key: 'ADMIN_CROUS', label: 'Directeurs' },
            { key: 'STUDENT', label: 'Étudiants' },
          ].map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setRoleFilter(f.key)}
              style={[styles.filterChip, roleFilter === f.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, roleFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderItem={({ item }) => {
            const roleInfo = getRoleBadge(item.role);
            return (
              <Card style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={[styles.avatarCircle, { backgroundColor: roleInfo.color + '20' }]}>
                    <MaterialIcons
                      name={
                        item.role === 'DRIVER'
                          ? 'airline-seat-recline-normal'
                          : item.role === 'CONTROLLER'
                          ? 'security'
                          : item.role === 'SUPERADMIN'
                          ? 'shield'
                          : item.role === 'ADMIN_CROUS' || item.role === 'ADMIN'
                          ? 'admin-panel-settings'
                          : 'school'
                      }
                      size={22}
                      color={roleInfo.color}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.userName}>{item.first_name} {item.last_name}</Text>
                    <Text style={styles.userPhone}>{item.phone_number}</Text>
                    {item.matricule_uac && (
                      <Text style={styles.userMatricule}>Matricule : {item.matricule_uac}</Text>
                    )}
                    
                    {/* Badge Campus Attribué */}
                    <View style={styles.campusCardTag}>
                      <MaterialIcons name="account-balance" size={12} color={colors.primary} />
                      <Text style={styles.campusCardTagText}>
                        Campus : {item.campus_name || item.campus_code || 'UAC Abomey-Calavi'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.badgeColumn}>
                    <View style={[styles.rolePill, { backgroundColor: roleInfo.color }]}>
                      <Text style={styles.rolePillText}>{roleInfo.label}</Text>
                    </View>
                    <Badge
                      label={item.kyc_status === 'APPROVED' ? 'Vérifié' : 'En attente'}
                      variant={item.kyc_status === 'APPROVED' ? 'success' : 'warning'}
                    />

                    {/* Bouton d'attribution de campus réservé au SuperAdmin */}
                    {isSuperAdmin && item.role !== 'SUPERADMIN' && (
                      <Pressable
                        style={styles.reassignCampusBtn}
                        onPress={() => openReassignCampusModal(item)}
                      >
                        <MaterialIcons name="edit-location-alt" size={14} color={colors.primary} />
                        <Text style={styles.reassignCampusBtnText}>Campus</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Modal Enroll Staff */}
      <Modal visible={showEnrollModal} transparent animationType="fade" onRequestClose={() => setShowEnrollModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="person-add" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Enrôler un Nouvel Agent</Text>
            </View>

            {/* Role Select */}
            <Text style={styles.inputLabel}>Rôle de l'Agent *</Text>
            <View style={styles.roleSelectorRow}>
              {[
                { key: 'DRIVER', label: 'Chauffeur' },
                { key: 'CONTROLLER', label: 'Contrôleur' },
                ...(isSuperAdmin ? [{ key: 'ADMIN_CROUS', label: 'Directeur Campus' }] : []),
              ].map((r) => (
                <Pressable
                  key={r.key}
                  style={[styles.roleSelectChip, newRole === r.key && styles.roleSelectChipActive]}
                  onPress={() => setNewRole(r.key as any)}
                >
                  <Text style={[styles.roleSelectText, newRole === r.key && styles.roleSelectTextActive]}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Campus d'Affectation */}
            <Text style={styles.inputLabel}>Campus Universitaire d'Affectation *</Text>
            <View style={styles.campusSelectorRow}>
              {BENIN_CAMPUSES.map((c) => (
                <Pressable
                  key={c.code}
                  style={[styles.campusSelectChip, enrollCampus === c.code && styles.campusSelectChipActive]}
                  onPress={() => setEnrollCampus(c.code)}
                >
                  <Text style={[styles.campusSelectChipText, enrollCampus === c.code && styles.campusSelectChipTextActive]}>
                    {c.code}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Prénom *</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ex: Jean"
              placeholderTextColor={colors.outline}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Nom *</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Ex: Dossou"
              placeholderTextColor={colors.outline}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Numéro de Téléphone Bénin *</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.countryBadge}>
                <Text style={{ fontSize: 13 }}>🇧🇯</Text>
                <Text style={styles.countryBadgeText}>+229 01</Text>
              </View>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="97 00 00 10"
                placeholderTextColor={colors.outline}
                keyboardType="phone-pad"
                style={styles.phoneInput}
              />
            </View>

            <Text style={styles.inputLabel}>
              {newRole === 'DRIVER'
                ? 'Matricule Chauffeur * (ex: DRV-2024-001)'
                : newRole === 'CONTROLLER'
                ? 'Matricule Contrôleur * (ex: CTR-2024-001)'
                : 'Matricule Directeur de Campus * (ex: DIR-2024-001)'}
            </Text>
            <TextInput
              value={matricule}
              onChangeText={setMatricule}
              placeholder={newRole === 'DRIVER' ? 'ex: DRV-2024-005' : newRole === 'CONTROLLER' ? 'ex: CTR-2024-003' : 'ex: DIR-2024-001'}
              placeholderTextColor={colors.outline}
              autoCapitalize="characters"
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Mot de Passe Temporaire *</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 caractères"
              placeholderTextColor={colors.outline}
              secureTextEntry
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowEnrollModal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={handleEnrollStaff} disabled={enrolling}>
                {enrolling ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Enrôler l'Agent</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Attribution de Campus (SuperAdmin) */}
      <Modal visible={reassignModalVisible} transparent animationType="fade" onRequestClose={() => setReassignModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="edit-location-alt" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Attribuer un Campus Universitaire</Text>
            </View>

            <Text style={styles.reassignIntroText}>
              Modifier l'affectation territoriale de{' '}
              <Text style={{ fontWeight: '700', color: colors.primary }}>
                {userToReassign?.first_name} {userToReassign?.last_name}
              </Text>{' '}
              ({getRoleBadge(userToReassign?.role || '').label}) :
            </Text>

            <View style={{ gap: spacing.sm, marginVertical: spacing.md }}>
              {BENIN_CAMPUSES.map((c) => {
                const isSelected = targetCampusCode === c.code;
                return (
                  <Pressable
                    key={c.code}
                    style={[styles.campusReassignCard, isSelected && styles.campusReassignCardActive]}
                    onPress={() => setTargetCampusCode(c.code)}
                  >
                    <View style={[styles.optionRadio, isSelected && styles.optionRadioActive]}>
                      {isSelected && <View style={styles.optionRadioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.campusReassignTitle, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                        {c.code} - {c.name}
                      </Text>
                      <Text style={styles.campusReassignSub}>📍 {c.city}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setReassignModalVisible(false)} disabled={isReassigning}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={handleConfirmReassignCampus} disabled={isReassigning}>
                {isReassigning ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirmer l'Affectation</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.containerMargin, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.headlineLg, fontSize: 22, color: colors.primary },
  sub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  addBtnText: { ...typography.labelCaps, color: '#ffffff', fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 11 },
  filterChipTextActive: { color: '#ffffff', fontWeight: '700' },
  list: { paddingHorizontal: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  card: { padding: spacing.md, backgroundColor: colors.surfaceContainer },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface },
  userPhone: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 1 },
  userMatricule: { ...typography.labelCaps, color: colors.outline, fontSize: 10, marginTop: 2 },
  campusCardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  campusCardTagText: { ...typography.bodySm, fontSize: 11, color: '#065f46', fontWeight: '600' },
  badgeColumn: { alignItems: 'flex-end', gap: 4 },
  rolePill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  rolePillText: { ...typography.labelCaps, color: '#ffffff', fontSize: 9, fontWeight: '700' },
  reassignCampusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  reassignCampusBtnText: { ...typography.labelCaps, fontSize: 9, color: colors.primary, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  modalCard: { width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  modalTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  inputLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 4 },
  roleSelectorRow: { flexDirection: 'row', gap: spacing.xs, marginVertical: 4 },
  roleSelectChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.sm,
  },
  roleSelectChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleSelectText: { ...typography.labelCaps, fontSize: 10, color: colors.onSurfaceVariant },
  roleSelectTextActive: { color: '#ffffff', fontWeight: '700' },
  campusSelectorRow: { flexDirection: 'row', gap: spacing.xs, marginVertical: 4 },
  campusSelectChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLow,
  },
  campusSelectChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  campusSelectChipText: { ...typography.labelCaps, fontSize: 10, color: colors.onSurfaceVariant, fontWeight: '600' },
  campusSelectChipTextActive: { color: '#ffffff', fontWeight: '700' },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    height: 40,
    overflow: 'hidden',
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.xs,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: colors.outlineVariant,
    gap: 2,
  },
  countryBadgeText: { ...typography.bodySm, fontWeight: '700', fontSize: 11, color: colors.onSurface },
  phoneInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingHorizontal: spacing.sm,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalCancelBtn: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outline, borderRadius: radius.md },
  modalCancelText: { ...typography.labelCaps, color: colors.onSurface, fontSize: 11 },
  modalConfirmBtn: { flex: 1.5, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md },
  modalConfirmText: { ...typography.labelCaps, color: '#ffffff', fontSize: 11, fontWeight: '700' },

  reassignIntroText: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  campusReassignCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  campusReassignCardActive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  optionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioActive: { borderColor: colors.primary },
  optionRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  campusReassignTitle: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface },
  campusReassignSub: { ...typography.bodySm, fontSize: 11, color: colors.onSurfaceVariant },
});
