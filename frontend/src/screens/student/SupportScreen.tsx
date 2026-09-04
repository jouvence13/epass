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
    a: 'Rendez-vous sur "Mon profil KYC", téléversez une photo nette de votre carte d\'étudiant UAC valide et votre certificat CIP. La modération par le CROUS est effective en moins de 24h.',
  },
  {
    id: '2',
    q: 'Quels sont les tarifs subventionnés par trajet ?',
    a: 'Grâce à la subvention étatique CROUS-UAC, le ticket étudiant est à seulement 100 FCFA par trajet au lieu du tarif plein grand public.',
  },
  {
    id: '3',
    q: 'Que faire en cas de retard d\'un bus ?',
    a: 'Consultez la section "Suivi en direct" pour localiser votre bus par GPS en temps réel. Si le retard dépasse 15 min, vous pouvez recycler votre ticket sans pénalité.',
  },
  {
    id: '4',
    q: 'Comment recharger mon solde via MTN ou Moov ?',
    a: 'Dans "Moyens de paiement", cliquez sur "Recharger". Saisissez le montant et validez sur votre téléphone via le prompt sécurisé MTN Mobile Money (*880#) ou Moov Money (*855#).',
  },
];

export default function SupportScreen({ navigation }: any) {
  const { user } = useAuth();
  const [expandedFaq, setExpandedFaq] = useState<string | null>('1');
  const [subject, setSubject] = useState('Problème de validation KYC');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const toggleFaq = (id: string) => {
    setExpandedFaq((prev) => (prev === id ? null : id));
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+22921360100').catch(() => {
      Alert.alert('Numéro CROUS', 'Téléphone : +229 21 36 01 00');
    });
  };

  const handleWhatsapp = () => {
    Linking.openURL('https://wa.me/22997000000?text=Bonjour%20CROUS%20UAC%20BusPass').catch(() => {
      Alert.alert('WhatsApp CROUS', 'Numéro WhatsApp : +229 97 00 00 00');
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
      setSentSuccess(true);
      setMessage('');
      Alert.alert(
        'Message transmis',
        'Votre demande a été transmise aux services CROUS-UAC. Vous recevrez une réponse dans l\'onglet Notifications.'
      );
    }, 800);
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
            <Text style={styles.title}>Aide & Support CROUS</Text>
            <Text style={styles.subtitle}>Assistance aux étudiants et transport universitaire</Text>
          </View>
        </View>

        {/* Canaux de Contact Directs */}
        <View style={styles.contactRow}>
          <Pressable style={styles.contactCard} onPress={handleCallSupport}>
            <View style={[styles.contactIconCircle, { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="phone" size={24} color={colors.primary} />
            </View>
            <Text style={styles.contactTitle}>Appel CROUS</Text>
            <Text style={styles.contactSub}>+229 21 36 01 00</Text>
          </Pressable>

          <Pressable style={styles.contactCard} onPress={handleWhatsapp}>
            <View style={[styles.contactIconCircle, { backgroundColor: '#dcfce7' }]}>
              <MaterialIcons name="chat" size={24} color="#16a34a" />
            </View>
            <Text style={styles.contactTitle}>WhatsApp</Text>
            <Text style={styles.contactSub}>Assistance directe</Text>
          </Pressable>
        </View>

        {/* Guichet physique info */}
        <Card style={styles.locationCard}>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationTitle}>Guichet Physique CROUS-UAC</Text>
              <Text style={styles.locationText}>
                Campus Principal d'Abomey-Calavi • Bâtiment Administratif CROUS (RDC)
              </Text>
              <Text style={styles.locationHours}>Du Lundi au Vendredi : 08h00 - 17h30</Text>
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
            Une équipe du CROUS prendra en charge votre dossier sous 24h ouvrées.
          </Text>

          <Text style={styles.inputLabel}>Objet de votre demande :</Text>
          <View style={styles.subjectChips}>
            {[
              'Problème KYC',
              'Paiement / Recharge',
              'Retard de bus',
              'Autre',
            ].map((s) => (
              <Pressable
                key={s}
                style={[
                  styles.subjectChip,
                  subject === s && styles.subjectChipActive,
                ]}
                onPress={() => setSubject(s)}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    subject === s && styles.subjectChipTextActive,
                  ]}
                >
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
            label={isSending ? 'Envoi en cours...' : 'Transmettre au CROUS'}
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
