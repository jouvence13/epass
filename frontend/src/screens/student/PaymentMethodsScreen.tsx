import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

interface PaymentMethod {
  id: string;
  type: 'MTN_MOMO' | 'MOOV_MONEY' | 'CROUS_WALLET';
  title: string;
  account: string;
  isDefault: boolean;
  color: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

export default function PaymentMethodsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState(2500); // 2 500 FCFA

  const [methods, setMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'MTN_MOMO',
      title: 'MTN Mobile Money',
      account: user?.phone_number || '+229 97 45 67 89',
      isDefault: true,
      color: '#fbbf24',
      icon: 'phone-android',
    },
    {
      id: '2',
      type: 'MOOV_MONEY',
      title: 'Moov Money Flooz',
      account: '+229 95 12 34 56',
      isDefault: false,
      color: '#0284c7',
      icon: 'contactless',
    },
    {
      id: '3',
      type: 'CROUS_WALLET',
      title: 'Portefeuille Étudiant CROUS',
      account: `Solde : ${walletBalance.toLocaleString('fr-FR')} FCFA`,
      isDefault: false,
      color: colors.primary,
      icon: 'account-balance-wallet',
    },
  ]);

  // Modal d'ajout de moyen de paiement
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<'MTN' | 'MOOV'>('MTN');
  const [newPhone, setNewPhone] = useState('');
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('1000');

  const setDefaultMethod = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => ({
        ...m,
        isDefault: m.id === id,
      }))
    );
  };

  const handleAddMethod = () => {
    if (!newPhone.trim() || newPhone.length < 8) {
      Alert.alert('Numéro invalide', 'Veuillez saisir un numéro de téléphone valide à 8 chiffres.');
      return;
    }

    const cleanNumber = newPhone.startsWith('+229') ? newPhone : `+229 ${newPhone}`;
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: selectedOperator === 'MTN' ? 'MTN_MOMO' : 'MOOV_MONEY',
      title: selectedOperator === 'MTN' ? 'MTN Mobile Money' : 'Moov Money Flooz',
      account: cleanNumber,
      isDefault: false,
      color: selectedOperator === 'MTN' ? '#fbbf24' : '#0284c7',
      icon: selectedOperator === 'MTN' ? 'phone-android' : 'contactless',
    };

    setMethods((prev) => [...prev, newMethod]);
    setNewPhone('');
    setModalVisible(false);
    Alert.alert('Succès', 'Votre moyen de paiement a été ajouté avec succès.');
  };

  const handleRechargeWallet = () => {
    const amount = parseInt(rechargeAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Montant invalide', 'Veuillez entrer un montant valide.');
      return;
    }

    setWalletBalance((prev) => prev + amount);
    setMethods((prev) =>
      prev.map((m) =>
        m.type === 'CROUS_WALLET'
          ? { ...m, account: `Solde : ${(walletBalance + amount).toLocaleString('fr-FR')} FCFA` }
          : m
      )
    );
    setRechargeModalVisible(false);
    Alert.alert('Recharge réussie', `Votre portefeuille a été crédité de ${amount.toLocaleString('fr-FR')} FCFA via Mobile Money.`);
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
            <Text style={styles.title}>Moyens de Paiement</Text>
            <Text style={styles.subtitle}>Gérez vos comptes MTN MoMo, Moov Money et portefeuille CROUS</Text>
          </View>
        </View>

        {/* Solde Portefeuille Card */}
        <Card floating style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Portefeuille Universitaire</Text>
              <Text style={styles.balanceValue}>{walletBalance.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={styles.balanceHint}>Subvention CROUS applicable automatiquement</Text>
            </View>
            <Pressable
              style={styles.rechargeBtn}
              onPress={() => setRechargeModalVisible(true)}
            >
              <MaterialIcons name="add" size={20} color={colors.onPrimary} />
              <Text style={styles.rechargeBtnText}>Recharger</Text>
            </Pressable>
          </View>
        </Card>

        {/* Liste des Moyens de Paiement */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Comptes enregistrés</Text>
          <Pressable
            style={styles.addSmallBtn}
            onPress={() => setModalVisible(true)}
          >
            <MaterialIcons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.addSmallBtnText}>Ajouter</Text>
          </Pressable>
        </View>

        <View style={{ gap: spacing.md }}>
          {methods.map((method) => (
            <Card
              key={method.id}
              style={[
                styles.methodCard,
                method.isDefault && styles.methodCardDefault,
              ]}
            >
              <View style={styles.methodHeader}>
                <View style={[styles.methodIconBox, { backgroundColor: method.color }]}>
                  <MaterialIcons
                    name={method.icon}
                    size={24}
                    color={method.type === 'MTN_MOMO' ? '#000000' : '#ffffff'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Text style={styles.methodTitle}>{method.title}</Text>
                    {method.isDefault && (
                      <Badge label="Par défaut" tone="success" icon="check-circle" />
                    )}
                  </View>
                  <Text style={styles.methodAccount}>{method.account}</Text>
                </View>

                {!method.isDefault && (
                  <Pressable
                    style={styles.setDefaultBtn}
                    onPress={() => setDefaultMethod(method.id)}
                  >
                    <Text style={styles.setDefaultBtnText}>Activer</Text>
                  </Pressable>
                )}
              </View>
            </Card>
          ))}
        </View>

        {/* Instructions de Sécurité Bénin */}
        <Card style={styles.securityCard}>
          <View style={styles.securityRow}>
            <MaterialIcons name="security" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Paiement Sécurisé & Chiffré</Text>
              <Text style={styles.securityText}>
                Toutes les transactions sont confirmées directement sur votre téléphone via le prompt USSD de votre opérateur (MTN *880# ou Moov *855#).
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Modal Ajout Moyen de Paiement */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un compte Mobile Money</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Opérateur Télécom :</Text>
            <View style={styles.operatorRow}>
              <Pressable
                style={[
                  styles.operatorCard,
                  selectedOperator === 'MTN' && styles.operatorCardActive,
                ]}
                onPress={() => setSelectedOperator('MTN')}
              >
                <MaterialIcons name="phone-android" size={24} color="#000000" />
                <Text style={styles.operatorText}>MTN Bénin (*880#)</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.operatorCard,
                  selectedOperator === 'MOOV' && styles.operatorCardActive,
                ]}
                onPress={() => setSelectedOperator('MOOV')}
              >
                <MaterialIcons name="contactless" size={24} color="#0284c7" />
                <Text style={styles.operatorText}>Moov Bénin (*855#)</Text>
              </Pressable>
            </View>

            <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>
              Numéro de téléphone (sans +229) :
            </Text>
            <TextInput
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="ex: 97 00 11 22"
              placeholderTextColor={colors.outline}
              keyboardType="phone-pad"
              style={styles.modalInput}
            />

            <PrimaryButton
              label="Confirmer et Enregistrer"
              icon="save"
              onPress={handleAddMethod}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Recharger Portefeuille */}
      <Modal
        visible={rechargeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRechargeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recharger mon Portefeuille</Text>
              <Pressable onPress={() => setRechargeModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Montant à recharger (FCFA) :</Text>
            <View style={styles.quickAmounts}>
              {['500', '1000', '2000', '5000'].map((amt) => (
                <Pressable
                  key={amt}
                  style={[
                    styles.quickAmountBtn,
                    rechargeAmount === amt && styles.quickAmountBtnActive,
                  ]}
                  onPress={() => setRechargeAmount(amt)}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      rechargeAmount === amt && styles.quickAmountTextActive,
                    ]}
                  >
                    {amt} F
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={rechargeAmount}
              onChangeText={setRechargeAmount}
              placeholder="Montant personnalisé"
              placeholderTextColor={colors.outline}
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <PrimaryButton
              label={`Recharger ${rechargeAmount || 0} FCFA`}
              icon="account-balance-wallet"
              onPress={handleRechargeWallet}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </View>
      </Modal>
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
  balanceCard: { backgroundColor: colors.primaryFixed, borderWidth: 1, borderColor: colors.primary },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { ...typography.labelCaps, color: colors.primary },
  balanceValue: { ...typography.headlineLg, color: colors.primary, marginVertical: spacing.xs },
  balanceHint: { ...typography.bodySm, color: colors.onSurfaceVariant },
  rechargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  rechargeBtnText: { ...typography.labelCaps, color: colors.onPrimary, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.headlineSm, color: colors.primary },
  addSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addSmallBtnText: { ...typography.bodyMd, color: colors.primary, fontWeight: '700' },
  methodCard: { borderWidth: 1, borderColor: colors.surfaceVariant },
  methodCardDefault: { borderColor: colors.primary, backgroundColor: colors.surfaceContainerLowest },
  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  methodIconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  methodAccount: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  setDefaultBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  setDefaultBtnText: { ...typography.bodySm, color: colors.primary, fontWeight: '600' },
  securityCard: { backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant },
  securityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  securityTitle: { ...typography.headlineSm, fontSize: 15, color: colors.primary, marginBottom: 2 },
  securityText: { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  modalTitle: { ...typography.headlineMd, fontSize: 18, color: colors.primary },
  modalLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant },
  operatorRow: { flexDirection: 'row', gap: spacing.md },
  operatorCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    gap: spacing.xs,
  },
  operatorCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixed,
  },
  operatorText: { ...typography.bodyMd, fontWeight: '700', textAlign: 'center' },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.bodyLg,
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  quickAmounts: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  quickAmountBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  quickAmountBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixed,
  },
  quickAmountText: { ...typography.bodyMd, color: colors.onSurface },
  quickAmountTextActive: { color: colors.primary, fontWeight: '700' },
});
