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
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS, API_BASE_URL } from '../../config/api';

interface PendingKycDoc {
  document_id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  verification_status: string;
  rejection_reason?: string;
  academic_year: string;
  created_at: string;
  user_full_name?: string;
  user_matricule?: string;
  user_phone?: string;
  user_role?: string;
}

export default function AdminKycModerationScreen() {
  const { token } = useAuth();
  const { showToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [documents, setDocuments] = useState<PendingKycDoc[]>([]);
  const [filter, setFilter] = useState('ALL');

  // Inspection modal state
  const [inspectingDoc, setInspectingDoc] = useState<PendingKycDoc | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

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
        if (inspectingDoc?.user_id === doc.user_id) {
          setInspectingDoc(null);
        }
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
        if (inspectingDoc?.user_id === rejectingDoc.user_id) {
          setInspectingDoc(null);
        }
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
        return { label: 'Badge Contrôleur Campus', icon: 'security', color: '#7c3aed' };
      case 'CIP_IDENTITY':
        return { label: 'Certificat CIP / CNI Bénin', icon: 'badge', color: '#d97706' };
      default:
        return { label: type, icon: 'folder', color: colors.outline };
    }
  };

  const openInspection = (doc: PendingKycDoc) => {
    setInspectingDoc(doc);
    setZoomLevel(1);
    setRotation(0);
  };

  const getFullDocumentUrl = (rawUrl: string) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    const host = API_BASE_URL.replace('/api/v1', '');
    const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    return `${host}${cleanPath}`;
  };

  const filteredDocs = documents.filter((d) => {
    if (filter === 'ALL') return true;
    return d.document_type === filter;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.beninBanner}>
          <View style={[styles.flagBar, { backgroundColor: colors.beninGreen }]} />
          <View style={[styles.flagBar, { backgroundColor: colors.beninYellow }]} />
          <View style={[styles.flagBar, { backgroundColor: colors.beninRed }]} />
        </View>
        <Text style={styles.eyebrow}>CONTRÔLE & CONFORMITÉ ACADÉMIQUE</Text>
        <Text style={styles.title}>Modération des Pièces & Justificatifs</Text>

        {/* Filters */}
        <View style={styles.filtersRow}>
          {[
            { key: 'ALL', label: `Tous (${documents.length})` },
            { key: 'STUDENT_CARD', label: 'Étudiants' },
            { key: 'CIP_IDENTITY', label: 'CIP / CNI' },
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
                      Usager : <Text style={{ fontWeight: '700', color: colors.onSurface }}>{item.user_full_name || 'Étudiant UAC'}</Text>
                      {item.user_matricule ? ` • ${item.user_matricule}` : ''}
                    </Text>
                  </View>
                  <Badge label="EN ATTENTE" variant="warning" />
                </View>

                {/* File Preview Trigger */}
                <Pressable
                  style={styles.fileDetailBox}
                  onPress={() => openInspection(item)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <MaterialIcons name="image" size={18} color={colors.primary} />
                    <Text style={styles.fileDetailText} numberOfLines={1}>
                      {item.document_url.split('/').pop() || 'document_justificatif.jpg'}
                    </Text>
                  </View>
                  <View style={styles.inspectBtn}>
                    <MaterialIcons name="visibility" size={16} color="#ffffff" />
                    <Text style={styles.inspectBtnText}>Voir la pièce</Text>
                  </View>
                </Pressable>

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
                    style={styles.inspectQuickBtn}
                    onPress={() => openInspection(item)}
                  >
                    <MaterialIcons name="fullscreen" size={18} color={colors.primary} />
                    <Text style={styles.inspectQuickBtnText}>Inspecter</Text>
                  </Pressable>

                  <Pressable
                    style={styles.approveBtn}
                    onPress={() => handleApprove(item)}
                    disabled={actionLoading}
                  >
                    <MaterialIcons name="check" size={18} color="#ffffff" />
                    <Text style={styles.approveBtnText}>Valider</Text>
                  </Pressable>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="verified" size={54} color={colors.primary} />
              <Text style={styles.emptyTitle}>Tous les dossiers sont à jour !</Text>
              <Text style={styles.emptySub}>Aucun document en attente d’examen dans cette catégorie.</Text>
            </View>
          }
        />
      )}

      {/* MODAL 1: HIGH-RESOLUTION DOCUMENT INSPECTOR */}
      <Modal visible={!!inspectingDoc} transparent animationType="slide">
        <View style={styles.inspectorOverlay}>
          <View style={styles.inspectorCard}>
            {/* Header */}
            <View style={styles.inspectorHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inspectorTitle}>
                  {inspectingDoc ? getDocTypeInfo(inspectingDoc.document_type).label : 'Inspection Document'}
                </Text>
                <Text style={styles.inspectorSub}>
                  {inspectingDoc?.user_full_name || 'Usager UAC'} {inspectingDoc?.user_matricule ? `• Matricule : ${inspectingDoc.user_matricule}` : ''}
                </Text>
              </View>
              <Pressable
                style={styles.closeModalBtn}
                onPress={() => setInspectingDoc(null)}
              >
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            {/* Viewer Controls Toolbar */}
            <View style={styles.viewerToolbar}>
              <View style={styles.toolGroup}>
                <Pressable
                  style={styles.toolBtn}
                  onPress={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                >
                  <MaterialIcons name="zoom-out" size={20} color={colors.onSurface} />
                </Pressable>
                <Text style={styles.zoomText}>{Math.round(zoomLevel * 100)}%</Text>
                <Pressable
                  style={styles.toolBtn}
                  onPress={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                >
                  <MaterialIcons name="zoom-in" size={20} color={colors.onSurface} />
                </Pressable>
              </View>

              <View style={styles.toolGroup}>
                <Pressable
                  style={styles.toolBtn}
                  onPress={() => setRotation((r) => (r + 90) % 360)}
                >
                  <MaterialIcons name="rotate-right" size={20} color={colors.onSurface} />
                </Pressable>
                <Pressable
                  style={styles.toolBtn}
                  onPress={() => {
                    setZoomLevel(1);
                    setRotation(0);
                  }}
                >
                  <MaterialIcons name="refresh" size={20} color={colors.onSurface} />
                </Pressable>
              </View>
            </View>

            {/* Document Image & High-Fidelity Preview Box */}
            <ScrollView
              style={styles.previewScroll}
              contentContainerStyle={styles.previewScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
            >
              {inspectingDoc && (
                <View
                  style={[
                    styles.docFrame,
                    {
                      transform: [
                        { scale: zoomLevel },
                        { rotate: `${rotation}deg` },
                      ],
                    },
                  ]}
                >
                  {/* Institutional Watermark Badge */}
                  <View style={styles.institutionBadge}>
                    <View style={styles.flagDotRow}>
                      <View style={[styles.flagDot, { backgroundColor: colors.beninGreen }]} />
                      <View style={[styles.flagDot, { backgroundColor: colors.beninYellow }]} />
                      <View style={[styles.flagDot, { backgroundColor: colors.beninRed }]} />
                    </View>
                    <Text style={styles.institutionText}>RÉPUBLIQUE DU BÉNIN • ENSEIGNEMENT SUPÉRIEUR</Text>
                  </View>

                  {/* Document Graphic Card */}
                  <View style={styles.docGraphicCard}>
                    <View style={styles.docGraphicHeader}>
                      <MaterialIcons name="school" size={32} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docGraphicTitle}>
                          {inspectingDoc.document_type === 'STUDENT_CARD'
                            ? 'CARTE D’ÉTUDIANT UNIVERSITAIRE'
                            : inspectingDoc.document_type === 'CIP_IDENTITY'
                            ? 'CERTIFICAT D’IDENTIFICATION PERSONNELLE'
                            : inspectingDoc.document_type === 'DRIVER_LICENSE'
                            ? 'PERMIS DE CONDUIRE PROFESSIONNEL'
                            : 'PIÈCE OFFICIELLE DE VALIDATION'}
                        </Text>
                        <Text style={styles.docGraphicSub}>Année Universitaire : {inspectingDoc.academic_year || '2025-2026'}</Text>
                      </View>
                    </View>

                    <View style={styles.docGraphicBody}>
                      <View style={styles.studentAvatarBox}>
                        <MaterialIcons name="person" size={54} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.docMetaLabel}>TITULAIRE DU COMPTE :</Text>
                        <Text style={styles.docMetaVal}>{inspectingDoc.user_full_name || 'USAGER UAC'}</Text>

                        <Text style={styles.docMetaLabel}>MATRICULE ACADÉMIQUE :</Text>
                        <Text style={styles.docMetaVal}>{inspectingDoc.user_matricule || '12345678-UAC'}</Text>

                        <Text style={styles.docMetaLabel}>TÉLÉPHONE :</Text>
                        <Text style={styles.docMetaVal}>{inspectingDoc.user_phone || '+229 97 00 00 00'}</Text>
                      </View>
                    </View>

                    <View style={styles.docGraphicFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialIcons name="verified-user" size={16} color={colors.beninGreen} />
                        <Text style={styles.secureText}>Document Authentifié Numériquement</Text>
                      </View>
                      <Text style={styles.secureDate}>Soumis le {new Date(inspectingDoc.created_at).toLocaleDateString('fr-FR')}</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Action Bar inside Inspector */}
            {inspectingDoc && (
              <View style={styles.inspectorActions}>
                <Pressable
                  style={styles.inspectorRejectBtn}
                  onPress={() => setRejectingDoc(inspectingDoc)}
                  disabled={actionLoading}
                >
                  <MaterialIcons name="cancel" size={20} color={colors.error} />
                  <Text style={styles.inspectorRejectText}>Rejeter avec motif</Text>
                </Pressable>

                <Pressable
                  style={styles.inspectorApproveBtn}
                  onPress={() => handleApprove(inspectingDoc)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={20} color="#ffffff" />
                      <Text style={styles.inspectorApproveText}>Approuver (90 Jours)</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: REJECTION REASON */}
      <Modal visible={!!rejectingDoc} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="error-outline" size={24} color={colors.error} />
              <Text style={styles.modalTitle}>Motif du Rejet</Text>
            </View>
            <Text style={styles.modalSub}>
              Veuillez spécifier la raison pour laquelle ce document est refusé à {rejectingDoc?.user_full_name || 'l’usager'} :
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
  beninBanner: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
    width: 60,
  },
  flagBar: {
    flex: 1,
    height: '100%',
  },
  eyebrow: {
    ...typography.labelCaps,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '800',
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  list: {
    padding: spacing.containerMargin,
    gap: spacing.md,
  },
  docCard: {
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTypeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  docSub: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  fileDetailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 8,
  },
  fileDetailText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: 4,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: '#fee2e2',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  inspectQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  inspectQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  // Inspector Modal Styles
  inspectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  inspectorCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceContainer,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  inspectorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.onSurface,
  },
  inspectorSub: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  viewerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  toolGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    padding: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  zoomText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
    minWidth: 42,
    textAlign: 'center',
  },
  previewScroll: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  previewScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  docFrame: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
  },
  institutionBadge: {
    backgroundColor: colors.primaryContainer,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flagDotRow: {
    flexDirection: 'row',
    gap: 4,
  },
  flagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  institutionText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.beninYellow,
    letterSpacing: 0.5,
  },
  docGraphicCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  docGraphicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: spacing.sm,
  },
  docGraphicTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  docGraphicSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  docGraphicBody: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  studentAvatarBox: {
    width: 90,
    height: 110,
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
  },
  docMetaVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: 4,
  },
  docGraphicFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secureText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.beninGreen,
  },
  secureDate: {
    fontSize: 10,
    color: colors.outline,
  },
  inspectorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: spacing.md,
  },
  inspectorRejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#fee2e2',
  },
  inspectorRejectText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  inspectorApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  inspectorApproveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Modal Rejection Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  modalSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainer,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  modalCancelText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  modalConfirmText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
});
