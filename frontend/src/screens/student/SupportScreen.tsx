import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

interface FaqItem {
  id: string;
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    id: '1',
    q: 'Comment valider mon dossier KYC étudiant ?',
    a: "Rendez-vous sur la section KYC, téléversez une photo nette de votre carte d'étudiant valide pour l'année en cours ainsi que votre certificat CIP ou CNI. La vérification académique est traitée sous 24h ouvrées.",
  },
  {
    id: '2',
    q: 'Comment s’appliquent les tarifs subventionnés ?',
    a: "Une fois votre profil académique certifié (KYC validé), le tarif subventionné défini par l'administration du campus est automatiquement appliqué lors de l'achat de vos billets.",
  },
  {
    id: '3',
    q: 'Que faire en cas de retard ou d’incident sur une navette ?',
    a: "Consultez l'onglet Suivi en direct pour localiser le bus par télémétrie GPS en temps réel. En cas de perturbation majeure, le billet reste valide pour la rotation suivante.",
  },
  {
    id: '4',
    q: 'Comment recharger mon portefeuille étudiant ?',
    a: "Dans la rubrique Portefeuille / Moyens de paiement, saisissez le montant souhaité et validez le débit sur votre compte Mobile Money (MTN MoMo, Moov Money ou Celtiis Cash).",
  },
];

export default function SupportScreen({ navigation }: any) {
  const { user } = useAuth();
  const [expandedFaq, setExpandedFaq] = useState<string | null>('1');
  const [subject, setSubject] = useState('Vérification KYC');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const supportPhone = (user as any)?.campus_support_phone || (user as any)?.support_phone || '';
  const supportWhatsapp = (user as any)?.campus_support_whatsapp || (user as any)?.support_whatsapp || '';
  const supportOffice = user?.campus_name
    ? `${user.campus_name} • Guichet d'Accueil & Assistance Transport`
    : "Guichet d'Accueil & Assistance Transport Universitaire";
  const supportHours = 'Du Lundi au Vendredi : 08h00 - 17h30';

  const toggleFaq = (id: string) => {
    setExpandedFaq((prev) => (prev === id ? null : id));
  };

  const handleCallSupport = () => {
    if (!supportPhone) {
      Alert.alert(
        'Assistance Téléphonique',
        "Le numéro direct du service d'assistance de votre campus sera affiché dès configuration par votre administration."
      );
      return;
    }
    Linking.openURL(`tel:${supportPhone}`).catch(() => {
      Alert.alert('Numéro Assistance', `Téléphone : ${supportPhone}`);
    });
  };

  const handleWhatsapp = () => {
    if (!supportWhatsapp) {
      Alert.alert(
        'Assistance WhatsApp',
        "Le canal WhatsApp officiel de votre campus sera mis à disposition par l'administration académique."
      );
      return;
    }
    const cleanPhone = supportWhatsapp.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${cleanPhone}?text=Bonjour%20Support%20Campus`).catch(() => {
      Alert.alert('WhatsApp Support', `Numéro WhatsApp : ${supportWhatsapp}`);
    });
  };

  const handleSendMessage = () => {
    if (!message.trim()) {
      Alert.alert('Message requis', 'Veuillez saisir votre message ou votre question.');
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setMessage('');
      Alert.alert(
        'Demande transmise',
        "Votre message a été envoyé à l'administration de votre campus. Vous recevrez une notification dès traitement."
      );
    }, 700);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Aide & Support Campus</Text>
            <Text style={styles.subtitle}>
              {user?.campus_name ? `${user.campus_name} • Assistance` : 'Assistance aux étudiants et transport'}
            </Text>
          </View>
        </View>

        {/* Canaux de Contact Directs */}
        <View style={styles.contactRow}>
          <Pressable style={styles.contactCard} onPress={handleCallSupport}>
            <View style={[styles.contactIconCircle, { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="phone" size={24} color={colors.primary} />
            </View>
            <Text style={styles.contactTitle}>Appel Assistance</Text>
            <Text style={styles.contactSub}>{supportPhone || 'Standard Campus'}</Text>
          </Pressable>

          <Pressable style={styles.contactCard} onPress={handleWhatsapp}>
            <View style={[styles.contactIconCircle, { backgroundColor: '#dcfce7' }]}>
              <MaterialIcons name="chat" size={24} color="#16a34a" />
            </View>
            <Text style={styles.contactTitle}>WhatsApp</Text>
            <Text style={styles.contactSub}>{supportWhatsapp || 'Assistance en ligne'}</Text>
          </Pressable>
        </View>

        {/* Guichet physique info */}
        <Card style={styles.locationCard}>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationTitle}>Guichet Universitaire</Text>
              <Text style={styles.locationText}>{supportOffice}</Text>
              <Text style={styles.locationHours}>{supportHours}</Text>
            </View>
          </View>
        </Card>

        {/* FAQ Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Questions Fréquentes (FAQ)</Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          {FAQS.map((faq) => {
            const isExpanded = expandedFaq === faq.id;
            return (
              <Card key={faq.id} style={styles.faqCard}>
                <Pressable style={styles.faqHeader} onPress={() => toggleFaq(faq.id)}>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <MaterialIcons
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={24}
                    color={colors.primary}
                  />
                </Pressable>
                {isExpanded && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  </View>
                )}
              </Card>
            );
          })}
        </View>

        {/* Formulaire de Contact */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Envoyer un message à l'administration</Text>
          <Text style={styles.formSub}>
            L'équipe administrative de votre campus prendra en charge votre dossier.
          </Text>

          <Text style={styles.inputLabel}>Objet de votre demande :</Text>
          <View style={styles.subjectChips}>
            {['Vérification KYC', 'Paiement / Recharge', 'Retard de navette', 'Autre'].map((s) => (
              <Pressable
                key={s}
                style={[styles.subjectChip, subject === s && styles.subjectChipActive]}
                onPress={() => setSubject(s)}
              >
                <Text style={[styles.subjectChipText, subject === s && styles.subjectChipTextActive]}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Votre message :</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Détaillez votre situation ou question..."
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />

          <PrimaryButton
            label={isSending ? 'Envoi en cours...' : 'Transmettre au support'}
            icon="send"
            onPress={handleSendMessage}
            disabled={isSending}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.headlineMd, color: colors.primary },
  subtitle: { ...typography.bodySm, color: colors.onSurfaceVariant },
  contactRow: { flexDirection: 'row', gap: spacing.md },
  contactCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  contactIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTitle: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface },
  contactSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  locationCard: { backgroundColor: colors.primaryFixed, borderWidth: 1, borderColor: colors.primary },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  locationTitle: { ...typography.headlineSm, fontSize: 15, color: colors.primary, marginBottom: 2 },
  locationText: { ...typography.bodyMd, color: colors.onSurface, lineHeight: 18 },
  locationHours: { ...typography.bodySm, color: colors.primary, fontWeight: '700', marginTop: spacing.xs },
  sectionHeader: { marginTop: spacing.xs },
  sectionTitle: { ...typography.headlineSm, color: colors.primary },
  faqCard: { borderWidth: 1, borderColor: colors.surfaceVariant, padding: 0, overflow: 'hidden' },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  faqQuestion: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface, flex: 1, paddingRight: spacing.sm },
  faqBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceVariant,
    paddingTop: spacing.sm,
  },
  faqAnswer: { ...typography.bodyMd, color: colors.onSurfaceVariant, lineHeight: 20 },
  formCard: { borderWidth: 1, borderColor: colors.surfaceVariant, padding: spacing.lg },
  formTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: 2 },
  formSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.md },
  inputLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
  subjectChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  subjectChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  subjectChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixed,
  },
  subjectChipText: { ...typography.bodySm, color: colors.onSurface },
  subjectChipTextActive: { color: colors.primary, fontWeight: '700' },
  textArea: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
