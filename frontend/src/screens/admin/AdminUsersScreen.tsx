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
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS } from '../../config/api';

interface UserItem {
  user_id: string;
  matricule_uac?: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  role: string;
  kyc_status: string;
  is_active: boolean;
}

export default function AdminUsersScreen() {
  const { token } = useAuth();
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
  const [enrolling, setEnrolling] = useState(false);

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
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !password.trim()) {
      showToast({
        title: 'Champs requis',
        message: 'Nom, prénom, téléphone et mot de passe sont obligatoires.',
        type: 'warning',
        category: 'GENERAL',
      });
      return;
    }

    setEnrolling(true);
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
          first_name: firstName,
          last_name: lastName,
          phone_number: phone.startsWith('+') ? phone : `+229${phone}`,
          matricule_uac: matricule || undefined,
          password: password,
          role: newRole,
          kyc_status: 'APPROVED',
        }),
      });

      if (res.ok) {
        showToast({
          title: 'Agent Enrôlé avec Succès',
          message: `Le compte ${newRole} de ${firstName} ${lastName} a été créé.`,
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return { label: 'SUPERADMIN', color: '#b91c1c' };
      case 'ADMIN_CROUS':
        return { label: 'ADMIN CROUS', color: colors.primary };
      case 'DRIVER':
        return { label: 'CHAUFFEUR', color: '#0284c7' };
      case 'CONTROLLER':
        return { label: 'CONTRÔLEUR', color: '#7c3aed' };
      default:
        return { label: 'ÉTUDIANT', color: colors.secondary };
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.eyebrow}>GESTION DES ACCÈS CROUS</Text>
            <Text style={styles.title}>Personnel & Utilisateurs</Text>
          </View>
          <Pressable style={styles.enrollBtn} onPress={() => setShowEnrollModal(true)}>
            <MaterialIcons name="person-add" size={18} color="#ffffff" />
            <Text style={styles.enrollBtnText}>Enrôler Agent</Text>
          </Pressable>
        </View>

        {/* Role Filters */}
        <View style={styles.filtersRow}>
          {[
            { key: 'ALL', label: `Tous (${users.length})` },
            { key: 'DRIVER', label: 'Chauffeurs' },
            { key: 'CONTROLLER', label: 'Contrôleurs' },
            { key: 'ADMIN_CROUS', label: 'Admins' },
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
                          : item.role === 'ADMIN_CROUS'
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
                  </View>
                  <View style={styles.badgeColumn}>
                    <View style={[styles.rolePill, { backgroundColor: roleInfo.color }]}>
                      <Text style={styles.rolePillText}>{roleInfo.label}</Text>
                    </View>
                    <Badge
                      label={item.kyc_status === 'APPROVED' ? 'Vérifié' : 'En attente'}
                      variant={item.kyc_status === 'APPROVED' ? 'success' : 'warning'}
                    />
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Modal Enroll Staff */}
      <Modal visible={showEnrollModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="person-add" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Enrôler un Nouvel Agent CROUS</Text>
            </View>

            {/* Role Select */}
            <Text style={styles.inputLabel}>Rôle de l'Agent *</Text>
            <View style={styles.roleSelectorRow}>
              {[
                { key: 'DRIVER', label: 'Chauffeur' },
                { key: 'CONTROLLER', label: 'Contrôleur' },
                { key: 'ADMIN_CROUS', label: 'Admin CROUS' },
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

            <Text style={styles.inputLabel}>Téléphone *</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+229 97 00 00 10"
              placeholderTextColor={colors.outline}
              keyboardType="phone-pad"
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Matricule CROUS (Optionnel)</Text>
            <TextInput
              value={matricule}
              onChangeText={setMatricule}
              placeholder="Ex: DRV-2026-002"
              placeholderTextColor={colors.outline}
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
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Créer le Compte</Text>
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
  header: { padding: spacing.containerMargin, gap: spacing.xs },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 10 },
  title: { ...typography.headlineMd, color: colors.primary },
  enrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  enrollBtnText: { ...typography.labelCaps, color: '#ffffff', fontSize: 11, fontWeight: '700' },
  filtersRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
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
  badgeColumn: { alignItems: 'flex-end', gap: 4 },
  rolePill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  rolePillText: { ...typography.labelCaps, color: '#ffffff', fontSize: 9, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '85%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
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
  modalInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalCancelBtn: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outline, borderRadius: radius.md },
  modalCancelText: { ...typography.labelCaps, color: colors.onSurface, fontSize: 11 },
  modalConfirmBtn: { flex: 1.5, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md },
  modalConfirmText: { ...typography.labelCaps, color: '#ffffff', fontSize: 11, fontWeight: '700' },
});
