import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ENDPOINTS } from '../../config/api';

interface DriverDocument {
  document_id: string;
  document_type: string;
  document_url: string;
  verification_status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_SUBMITTED';
  academic_year?: string;
  rejection_reason?: string;
}

interface DriverProfileData {
  user_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  matricule_uac: string;
  role: string;
  kyc_status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_SUBMITTED';
  assigned_bus?: {
    bus_code: string;
    immatriculation_number: string;
    max_capacity: number;
    status: string;
  } | null;
  documents: DriverDocument[];
}

interface LocalFile {
  file: any;
  name: string;
  size: string;
}

export default function DriverProfileScreen({ navigation }: any) {
  const { user, token, logout, updateUserKycStatus } = useAuth();
  const { showToast } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<DriverProfileData | null>(null);

  // Local state for selected files
  const [selectedFiles, setSelectedFiles] = useState<Record<string, LocalFile>>({});

  const isController = user?.role === 'CONTROLLER' || profile?.role === 'CONTROLLER';

  const fetchProfile = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.DRIVER_PROFILE, {
        credentials: 'include',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        if (data.kyc_status) {
          updateUserKycStatus(data.kyc_status);
        }
      }
    } catch (e) {
      console.warn('Error fetching driver profile:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, updateUserKycStatus]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  // Sélecteur universel de fichiers (Web et Mobile)
  const pickDocument = (docType: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const formattedSize =
            file.size > 1024 * 1024
              ? `${(file.size / (1024 * 1024)).toFixed(2)} Mo`
              : `${(file.size / 1024).toFixed(1)} Ko`;

          setSelectedFiles((prev) => ({
            ...prev,
            [docType]: {
              file,
              name: file.name,
              size: formattedSize,
            },
          }));

          showToast({
            title: 'Fichier Sélectionné',
            message: `${file.name} (${formattedSize}) est prêt pour l'envoi.`,
            type: 'info',
            category: 'KYC',
          });
        }
      };
      input.click();
    }
  };

  // Soumission réelle du dossier au serveur
  const handleSubmitAllDocs = async () => {
    const requiredTypes = isController
      ? ['CONTROLLER_BADGE', 'CIP_IDENTITY']
      : ['DRIVER_LICENSE', 'MEDICAL_CERTIFICATE', 'CIP_IDENTITY'];

    const hasAll = requiredTypes.every((t) => {
      const local = selectedFiles[t];
      const remote = profile?.documents?.some((d) => d.document_type === t && d.verification_status !== 'REJECTED');
      return local || remote;
    });

    if (!hasAll && Object.keys(selectedFiles).length === 0) {
      showToast({
        title: 'Documents Requis',
        message: 'Veuillez sélectionner vos fichiers avant de soumettre.',
        type: 'warning',
        category: 'KYC',
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      const uploadUrl = isController ? ENDPOINTS.CONTROLLER_UPLOAD_DOCS : ENDPOINTS.DRIVER_UPLOAD_DOCS;

      if (isController) {
        const badgeObj = selectedFiles['CONTROLLER_BADGE']?.file;
        const cipObj = selectedFiles['CIP_IDENTITY']?.file;

        if (badgeObj) formData.append('controller_badge_file', badgeObj, selectedFiles['CONTROLLER_BADGE']?.name || 'badge_crous.jpg');
        if (cipObj) formData.append('identity_file', cipObj, selectedFiles['CIP_IDENTITY']?.name || 'cip_controller.jpg');
      } else {
        const licenseObj = selectedFiles['DRIVER_LICENSE']?.file;
        const medObj = selectedFiles['MEDICAL_CERTIFICATE']?.file;
        const cipObj = selectedFiles['CIP_IDENTITY']?.file;

        if (licenseObj) formData.append('driver_license_file', licenseObj, selectedFiles['DRIVER_LICENSE']?.name || 'permis_d.jpg');
        if (medObj) formData.append('medical_cert_file', medObj, selectedFiles['MEDICAL_CERTIFICATE']?.name || 'certificat_medical.jpg');
        if (cipObj) formData.append('identity_file', cipObj, selectedFiles['CIP_IDENTITY']?.name || 'cip_driver.jpg');
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(uploadUrl, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });

      if (res.ok) {
        showToast({
          title: isController ? 'Dossier Contrôleur Transmis' : 'Dossier Chauffeur Transmis',
          message: 'Vos justificatifs ont été envoyés avec succès au CROUS pour examen sous 24h.',
          type: 'success',
          category: 'KYC',
        });
        updateUserKycStatus('PENDING');
        setSelectedFiles({});
        await fetchProfile();
      } else {
        const err = await res.json().catch(() => null);
        showToast({
          title: 'Erreur',
          message: err?.detail || 'Impossible de soumettre le dossier.',
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
      setUploading(false);
    }
  };

  const kycStatus = profile?.kyc_status || user?.kyc_status || 'APPROVED';

  const kycBadgeVariant =
    kycStatus === 'APPROVED'
      ? 'success'
      : kycStatus === 'PENDING'
      ? 'warning'
      : kycStatus === 'REJECTED'
      ? 'error'
      : 'neutral';

  const kycLabel =
    kycStatus === 'APPROVED'
      ? isController ? 'CONTRÔLEUR CROUS VALIDÉ' : 'CHAUFFEUR CROUS VALIDÉ'
      : kycStatus === 'PENDING'
      ? 'EXAMEN EN COURS'
      : kycStatus === 'REJECTED'
      ? 'DOSSIER REFUSÉ'
      : 'PIÈCES NON FOURNIES';

  const complianceDocs = isController
    ? [
        {
          title: "Badge / Accréditation d'Agent CROUS",
          subtitle: 'Carte professionnelle ou badge de service valide',
          type: 'CONTROLLER_BADGE',
          icon: 'badge',
        },
        {
          title: "Certificat d'Identification Personnelle (CIP / CNI)",
          subtitle: 'Pièce biométrique nationale',
          type: 'CIP_IDENTITY',
          icon: 'credit-card',
        },
        {
          title: "Attestation de Service CROUS",
          subtitle: "Certificat d'affectation aux lignes universitaires",
          type: 'ATTESTATION_CROUS',
          icon: 'verified-user',
        },
      ]
    : [
        {
          title: 'Permis de Conduire (Permis D)',
          subtitle: 'Transport en commun valide',
          type: 'DRIVER_LICENSE',
          icon: 'credit-card',
        },
        {
          title: "Certificat d'Aptitude Médicale",
          subtitle: 'Délivré par le service de santé UAC / CROUS',
          type: 'MEDICAL_CERTIFICATE',
          icon: 'health-and-safety',
        },
        {
          title: "Certificat d'Identification Personnelle (CIP / CNI)",
          subtitle: 'Pièce biométrique nationale',
          type: 'CIP_IDENTITY',
          icon: 'badge',
        },
      ];

  const hasPendingFiles = Object.keys(selectedFiles).length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isController ? 'Profil Contrôleur CROUS' : 'Profil Chauffeur CROUS'}
          </Text>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <MaterialIcons name="logout" size={20} color={colors.error} />
          </Pressable>
        </View>

        {/* Identity Card */}
        <Card style={styles.identityCard}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatarCircle, isController && { backgroundColor: '#0284c7' }]}>
              <MaterialIcons
                name={isController ? 'security' : 'airline-seat-recline-normal'}
                size={36}
                color={colors.onPrimary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{profile?.full_name || `${user?.first_name} ${user?.last_name}`}</Text>
              <Text style={styles.driverMatricule}>
                Matricule CROUS :{' '}
                <Text style={{ fontWeight: '700' }}>
                  {profile?.matricule_uac || user?.matricule_uac || (isController ? 'CTR-2024-001' : 'DRV-2024-001')}
                </Text>
              </Text>
              <Text style={styles.driverPhone}>{profile?.phone_number || user?.phone_number || '+229 97 00 00 01'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Compliance Status */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Statut Habilitation CROUS :</Text>
            <Badge label={kycLabel} variant={kycBadgeVariant} />
          </View>

          {kycStatus === 'APPROVED' && (
            <View style={styles.approvedBanner}>
              <MaterialIcons name="verified" size={20} color={colors.primary} />
              <Text style={styles.approvedText}>
                {isController
                  ? 'Habilité au contrôle et compostage des titres de transport à bord et aux arrêts.'
                  : 'Habilité à la conduite des navettes étudiantes et au compostage des titres à bord.'}
              </Text>
            </View>
          )}

          {kycStatus === 'PENDING' && (
            <View style={styles.pendingBanner}>
              <MaterialIcons name="hourglass-empty" size={20} color="#d97706" />
              <Text style={styles.pendingText}>
                Vos pièces professionnelles sont en cours d'examen par la direction des transports CROUS.
              </Text>
            </View>
          )}

          {(kycStatus === 'NOT_SUBMITTED' || kycStatus === 'REJECTED') && (
            <View style={styles.warningBanner}>
              <MaterialIcons name="error-outline" size={20} color={colors.error} />
              <Text style={styles.warningText}>
                {isController
                  ? 'Vous devez soumettre votre Badge CROUS et CIP pour débloquer le contrôle des passagers.'
                  : 'Vous devez soumettre votre Permis D et Certificat Médical pour débloquer les trajets et le scanner.'}
              </Text>
            </View>
          )}
        </Card>

        {/* Assigned Vehicle */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="directions-bus" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>
              {isController ? 'Navette / Ligne Supervisée' : 'Véhicule & Ligne Assignés'}
            </Text>
          </View>
          <View style={styles.busInfoRow}>
            <View style={styles.busMetric}>
              <Text style={styles.busMetricLabel}>Bus CROUS</Text>
              <Text style={styles.busMetricVal}>{profile?.assigned_bus?.bus_code || 'BUS-UAC-01'}</Text>
            </View>
            <View style={styles.busMetric}>
              <Text style={styles.busMetricLabel}>Immatriculation</Text>
              <Text style={styles.busMetricVal}>{profile?.assigned_bus?.immatriculation_number || 'RB-4412-UAC'}</Text>
            </View>
            <View style={styles.busMetric}>
              <Text style={styles.busMetricLabel}>Capacité</Text>
              <Text style={styles.busMetricVal}>{profile?.assigned_bus?.max_capacity || 50} places</Text>
            </View>
          </View>
        </Card>

        {/* Mandatory Compliance Documents */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="folder-shared" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>Pièces Justificatives Obligatoires</Text>
          </View>
          <Text style={styles.sectionSub}>
            Sélectionnez vos pièces justificatives depuis votre appareil :
          </Text>

          {complianceDocs.map((doc) => {
            const hasUploadedOnServer = profile?.documents?.some(
              (d) => d.document_type === doc.type && d.verification_status !== 'REJECTED'
            );
            const localFile = selectedFiles[doc.type];

            return (
              <View key={doc.type} style={styles.docBlock}>
                <View style={styles.docRow}>
                  <View style={styles.docIcon}>
                    <MaterialIcons name={doc.icon as any} size={22} color={colors.onSurfaceVariant} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle}>{doc.title}</Text>
                    <Text style={styles.docSubtitle}>{doc.subtitle}</Text>
                    {localFile ? (
                      <View style={styles.localFileRow}>
                        <MaterialIcons name="attach-file" size={14} color={colors.primary} />
                        <Text style={styles.localFileName} numberOfLines={1}>
                          {localFile.name} ({localFile.size})
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.docStatusBadge}>
                    {hasUploadedOnServer ? (
                      <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                    ) : localFile ? (
                      <MaterialIcons name="check-circle-outline" size={20} color="#0284c7" />
                    ) : (
                      <MaterialIcons name="radio-button-unchecked" size={20} color={colors.outline} />
                    )}
                    <Text
                      style={[
                        styles.docStatusText,
                        hasUploadedOnServer
                          ? { color: colors.primary }
                          : localFile
                          ? { color: '#0284c7' }
                          : { color: colors.outline },
                      ]}
                    >
                      {hasUploadedOnServer ? 'Enregistré' : localFile ? 'Sélectionné' : 'Requis'}
                    </Text>
                  </View>
                </View>

                {/* Document Action Button */}
                <View style={styles.docActionsRow}>
                  <Pressable style={styles.browseDocBtn} onPress={() => pickDocument(doc.type)}>
                    <MaterialIcons name="file-upload" size={16} color={colors.primary} />
                    <Text style={styles.browseDocBtnText}>
                      {localFile ? 'Changer de fichier' : 'Parcourir mes fichiers'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}

          {/* Action Upload All */}
          <Pressable
            style={[styles.uploadBtn, uploading && { opacity: 0.7 }]}
            onPress={handleSubmitAllDocs}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <>
                <MaterialIcons name="cloud-upload" size={20} color={colors.onPrimary} />
                <Text style={styles.uploadBtnText}>
                  {hasPendingFiles
                    ? 'Transmettre les Fichiers Sélectionnés'
                    : kycStatus === 'NOT_SUBMITTED' || kycStatus === 'REJECTED'
                    ? isController
                      ? "Soumettre mes Pièces d'Accréditation"
                      : 'Soumettre mes Justificatifs Professionnels'
                    : 'Mettre à Jour mes Pièces'}
                </Text>
              </>
            )}
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  headerTitle: { ...typography.headlineMd, color: colors.onSurface, fontSize: 18 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  identityCard: { padding: spacing.md, gap: spacing.md },
  avatarContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: { ...typography.headlineSm, fontSize: 18, color: colors.onSurface },
  driverMatricule: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  driverPhone: { ...typography.bodySm, color: colors.outline, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.outlineVariant },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant },
  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryFixed,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  approvedText: { ...typography.bodySm, color: colors.onPrimaryFixed, flex: 1 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#fef3c7',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  pendingText: { ...typography.bodySm, color: '#92400e', flex: 1 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#fee2e2',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  warningText: { ...typography.bodySm, color: colors.error, flex: 1 },
  sectionCard: { padding: spacing.md, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  sectionSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: -4 },
  busInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  busMetric: { alignItems: 'center', flex: 1 },
  busMetricLabel: { ...typography.labelCaps, color: colors.outline, fontSize: 10 },
  busMetricVal: { ...typography.headlineSm, fontSize: 13, color: colors.onSurface, marginTop: 2, fontWeight: '700' },
  docBlock: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  docIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface },
  docSubtitle: { ...typography.bodySm, color: colors.outline, fontSize: 11 },
  localFileRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  localFileName: { ...typography.bodySm, color: colors.primary, fontSize: 11, fontWeight: '600' },
  docStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  docStatusText: { ...typography.labelCaps, fontSize: 11, fontWeight: '700' },
  docActionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 6 },
  browseDocBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  browseDocBtnText: { ...typography.labelCaps, color: colors.primary, fontSize: 11, fontWeight: '700' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  uploadBtnText: { ...typography.labelCaps, color: colors.onPrimary, fontSize: 13, fontWeight: '700' },
});
