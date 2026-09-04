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

interface PendingKycDoc {
  document_id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  verification_status: string;
  rejection_reason?: string;
  academic_year: string;
  created_at: string;
}

export default function AdminKycModerationScreen() {
  const { token } = useAuth();
  const { showToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documents, setDocuments] = useState<PendingKycDoc[]>([]);
  const [filter, setFilter] = useState('ALL');

  // Modal rejection state
  const [rejectingDoc, setRejectingDoc] = useState<PendingKycDoc | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPendingDocuments = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.ADMIN_KYC_PENDING, {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDocuments(data);
        }
      }
    } catch (e) {
      console.warn('Error fetching pending KYC docs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPendingDocuments();
  }, [fetchPendingDocuments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingDocuments();
  };

  const handleApprove = async (doc: PendingKycDoc) => {
    setActionLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.ADMIN_KYC_VERIFY, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          user_id: doc.user_id,
          action: 'APPROVED',
        }),
      });

      if (res.ok) {
        showToast({
          title: 'Dossier Approuvé',
          message: 'Le compte a été validé avec 90 jours de conformité.',
          type: 'success',
          category: 'KYC',
        });
        setDocuments((prev) => prev.filter((d) => d.user_id !== doc.user_id));
      } else {
        showToast({
          title: 'Erreur',
          message: 'Impossible de valider le dossier.',
          type: 'error',
          category: 'KYC',
        });
      }
    } catch (e) {
      showToast({
        title: 'Erreur Réseau',
        message: 'Impossible de joindre le serveur.',
        type: 'error',
        category: 'KYC',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingDoc) return;
    setActionLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.ADMIN_KYC_VERIFY, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          user_id: rejectingDoc.user_id,
          action: 'REJECTED',
          rejection_reason: rejectionReason || 'Document illisible ou non conforme.',
        }),
      });

      if (res.ok) {
        showToast({
          title: 'Dossier Refusé',
          message: 'Notification de rejet envoyée à l’usager avec le motif.',
          type: 'info',
          category: 'KYC',
        });
        setDocuments((prev) => prev.filter((d) => d.user_id !== rejectingDoc.user_id));
        setRejectingDoc(null);
        setRejectionReason('');
      } else {
        showToast({
          title: 'Erreur',
          message: 'Impossible d’enregistrer le rejet.',
          type: 'error',
          category: 'KYC',
        });
      }
    } catch (e) {
      showToast({
        title: 'Erreur Réseau',
        message: 'Impossible de joindre le serveur.',
        type: 'error',
        category: 'KYC',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getDocTypeInfo = (type: string) => {
    switch (type) {
      case 'STUDENT_CARD':
        return { label: 'Carte Étudiant UAC', icon: 'school', color: colors.primary };
      case 'DRIVER_LICENSE':
        return { label: 'Permis D (Chauffeur)', icon: 'directions-bus', color: '#0284c7' };
      case 'MEDICAL_CERTIFICATE':
        return { label: 'Certificat Médical', icon: 'health-and-safety', color: '#059669' };
      case 'CONTROLLER_BADGE':
        return { label: 'Badge Contrôleur CROUS', icon: 'security', color: '#7c3aed' };
      case 'CIP_IDENTITY':
        return { label: 'Certificat CIP / CNI', icon: 'badge', color: '#d97706' };
      default:
        return { label: type, icon: 'folder', color: colors.outline };
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (filter === 'ALL') return true;
    return d.document_type === filter;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MODÉRATION ADMINISTRATIVE</Text>
        <Text style={styles.title}>Dossiers & Pièces en Attente</Text>

        {/* Filters */}
        <View style={styles.filtersRow}>
          {[
            { key: 'ALL', label: `Tous (${documents.length})` },
            { key: 'STUDENT_CARD', label: 'Étudiants' },
            { key: 'DRIVER_LICENSE', label: 'Chauffeurs' },
            { key: 'CONTROLLER_BADGE', label: 'Contrôleurs' },
          ].map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
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
          data={filteredDocs}
          keyExtractor={(item) => item.document_id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderItem={({ item }) => {
            const info = getDocTypeInfo(item.document_type);
            return (
              <Card style={styles.docCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: info.color + '20' }]}>
                    <MaterialIcons name={info.icon as any} size={22} color={info.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTypeTitle}>{info.label}</Text>
                    <Text style={styles.docSub}>
                      Année : <Text style={{ fontWeight: '700' }}>{item.academic_year || '2025-2026'}</Text>
                    </Text>
                  </View>
                  <Badge label="EN ATTENTE" variant="warning" />
                </View>

                {/* File Details */}
                <View style={styles.fileDetailBox}>
                  <MaterialIcons name="attachment" size={16} color={colors.primary} />
                  <Text style={styles.fileDetailText} numberOfLines={1}>
                    Fichier : {item.document_url.split('/').pop() || 'document_soumis.jpg'}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.rejectBtn}
                    onPress={() => setRejectingDoc(item)}
                    disabled={actionLoading}
                  >
                    <MaterialIcons name="close" size={18} color={colors.error} />
                    <Text style={styles.rejectBtnText}>Rejeter</Text>
                  </Pressable>

                  <Pressable
                    style={styles.approveBtn}
                    onPress={() => handleApprove(item)}
                    disabled={actionLoading}
                  >
                    <MaterialIcons name="check" size={18} color="#ffffff" />
                    <Text style={styles.approveBtnText}>Approuver (90 Jours)</Text>
                  </Pressable>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="check-circle" size={54} color={colors.primary} />
              <Text style={styles.emptyTitle}>Tous les dossiers sont à jour !</Text>
              <Text style={styles.emptySub}>Aucun document en attente d’examen dans cette catégorie.</Text>
            </View>
          }
        />
      )}

      {/* Modal Rejection with Reason */}
      <Modal visible={!!rejectingDoc} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="error-outline" size={24} color={colors.error} />
              <Text style={styles.modalTitle}>Motif du Rejet</Text>
            </View>
            <Text style={styles.modalSub}>
              Veuillez spécifier la raison pour laquelle ce document est refusé :
            </Text>

            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Ex: Image floue, carte expirée, document non signé..."
              placeholderTextColor={colors.outline}
              multiline
              numberOfLines={3}
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => {
                  setRejectingDoc(null);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>

              <Pressable
                style={styles.modalConfirmBtn}
                onPress={handleRejectConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirmer le Rejet</Text>
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
  header: { padding: spacing.containerMargin, gap: 4 },
  eyebrow: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 10 },
  title: { ...typography.headlineMd, color: colors.primary },
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
  docCard: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surfaceContainer },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  docTypeTitle: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface },
  docSub: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 11 },
  fileDetailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  fileDetailText: { ...typography.bodySm, color: colors.onSurfaceVariant, fontSize: 11, flex: 1 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surface,
  },
  rejectBtnText: { ...typography.labelCaps, color: colors.error, fontSize: 11, fontWeight: '700' },
  approveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  approveBtnText: { ...typography.labelCaps, color: '#ffffff', fontSize: 11, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface, marginTop: spacing.xs },
  emptySub: { ...typography.bodySm, color: colors.outline, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '85%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  modalTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  modalSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.sm,
    height: 80,
    textAlignVertical: 'top',
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalCancelBtn: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outline, borderRadius: radius.md },
  modalCancelText: { ...typography.labelCaps, color: colors.onSurface, fontSize: 11 },
  modalConfirmBtn: { flex: 1.5, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error, borderRadius: radius.md },
  modalConfirmText: { ...typography.labelCaps, color: '#ffffff', fontSize: 11, fontWeight: '700' },
});
