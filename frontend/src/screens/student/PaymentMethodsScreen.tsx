import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface PaymentMethod {
  id: string;
  type: 'MTN_MOMO' | 'MOOV_MONEY' | 'CELTIIS_CASH' | 'CROUS_WALLET';
  title: string;
  account: string;
  isDefault: boolean;
  color: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  code: string;
}

interface RechargeHistory {
  id: string;
  amount: number;
  operator: string;
  phone: string;
  date: string;
}

import { ENDPOINTS } from '../../config/api';

export default function PaymentMethodsScreen({ navigation }: any) {
  const { user, walletBalance, operatorPhoneNumbers, rechargeWallet, updateOperatorPhone } = useAuth();
  const { showToast } = useNotifications();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistory[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchPaymentData = async () => {
    try {
      const [methodsRes, histRes] = await Promise.all([
        fetch(ENDPOINTS.PAYMENT_METHODS, { credentials: 'include' }),
        fetch(ENDPOINTS.PAYMENT_HISTORY, { credentials: 'include' }),
      ]);
      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setMethods(data);
      }
      if (histRes.ok) {
        const data = await histRes.json();
        setRechargeHistory(data);
      }
    } catch (e) {
      console.warn('Error fetching payment data:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, [operatorPhoneNumbers, walletBalance]);

  // Modal d'ajout ou d'édition de compte Mobile Money
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<'MTN' | 'MOOV' | 'CELTIIS'>('MTN');
  const [inputPhoneNumber, setInputPhoneNumber] = useState('');

  // Modal de Recharge du Portefeuille
  const [rechargeModalVisible, setRechargeModalVisible] = useState(false);
  const [rechargeOperator, setRechargeOperator] = useState<'MTN' | 'MOOV' | 'CELTIIS'>('MTN');
  const [rechargePhone, setRechargePhone] = useState(operatorPhoneNumbers.MTN || '+2290157774305');
  const [rechargeAmount, setRechargeAmount] = useState('1000');
  const [ussdPromptVisible, setUssdPromptVisible] = useState(false);
  const [isProcessingUssd, setIsProcessingUssd] = useState(false);

  const handleSelectRechargeOperator = (op: 'MTN' | 'MOOV' | 'CELTIIS') => {
    setRechargeOperator(op);
    setRechargePhone(operatorPhoneNumbers[op] || '+2290157774305');
  };

  const setDefaultMethod = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => ({
        ...m,
        isDefault: m.id === id,
      }))
    );
  };

  const openAddModal = () => {
    setEditingMethodId(null);
    setSelectedOperator('MTN');
    setInputPhoneNumber(operatorPhoneNumbers.MTN.replace('+229', ''));
    setModalVisible(true);
  };

  const openEditModal = (method: PaymentMethod) => {
    setEditingMethodId(method.id);
    const op =
      method.type === 'MTN_MOMO'
        ? 'MTN'
        : method.type === 'MOOV_MONEY'
        ? 'MOOV'
        : 'CELTIIS';
    setSelectedOperator(op);
    // Nettoie pour afficher format compact
    const clean = method.account.replace('+229', '').replace(/\s+/g, '').trim();
    setInputPhoneNumber(clean);
    setModalVisible(true);
  };

  const handleSaveMethod = () => {
    const compactInput = inputPhoneNumber.replace(/\s+/g, '').replace(/-/g, '').trim();
    if (!compactInput || compactInput.length < 8) {
      Alert.alert('Numéro incomplet', 'Veuillez saisir un numéro de téléphone valide à 10 chiffres (ex: 0197001122).');
      return;
    }

    const formatted = compactInput.startsWith('+229') ? compactInput : `+229${compactInput}`;
    updateOperatorPhone(selectedOperator, formatted);

    setModalVisible(false);
    showToast({
      title: 'Numéro Enregistré',
      message: `Compte ${selectedOperator} mis à jour : ${formatted}`,
      type: 'success',
      category: 'PAYMENT',
    });
    Alert.alert('Numéro Enregistré', `Le numéro de votre compte ${selectedOperator} (${formatted}) a été synchronisé.`);
  };

  const handleInitiateRecharge = () => {
    const amount = parseInt(rechargeAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Montant invalide', 'Veuillez choisir ou saisir un montant de recharge valide.');
      return;
    }
    const cleanPhone = rechargePhone.replace(/\s+/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      Alert.alert('Numéro requis', 'Veuillez renseigner le numéro de téléphone qui sera débité.');
      return;
    }

    setRechargeModalVisible(false);
    setUssdPromptVisible(true);
  };

  const handleConfirmUssdPayment = () => {
    setIsProcessingUssd(true);
    const amount = parseInt(rechargeAmount, 10);
    const opName =
      rechargeOperator === 'MTN'
        ? 'MTN Mobile Money'
        : rechargeOperator === 'MOOV'
        ? 'Moov Money Flooz'
        : 'Celtiis Cash';

    const cleanRechargePhone = rechargePhone.replace(/\s+/g, '').trim();
    const formattedPhone = cleanRechargePhone.startsWith('+229') ? cleanRechargePhone : `+229${cleanRechargePhone}`;

    setTimeout(async () => {
      setIsProcessingUssd(false);
      setUssdPromptVisible(false);

      rechargeWallet(amount, opName, formattedPhone);

      try {
        const rechargeRes = await fetch(ENDPOINTS.WALLET_RECHARGE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            amount: amount,
            operator: opName,
            phone_number: formattedPhone,
          }),
        });
        if (rechargeRes.ok) {
          const histItem = await rechargeRes.json();
          setRechargeHistory((prev) => [histItem, ...prev]);
        }
      } catch (err) {
        console.warn('Error saving recharge to backend:', err);
      }

      const newBal = walletBalance + amount;
      showToast({
        title: 'Recharge Portefeuille Réussie !',
        message: `+${amount.toLocaleString('fr-FR')} FCFA ajoutés. Nouveau solde : ${newBal.toLocaleString('fr-FR')} FCFA`,
        type: 'success',
        category: 'WALLET',
      });

      Alert.alert(
        'Recharge Validée !',
        `Votre Portefeuille Universitaire CROUS a été crédité de ${amount.toLocaleString(
          'fr-FR'
        )} FCFA. Nouveau solde : ${newBal.toLocaleString('fr-FR')} FCFA.`
      );
    }, 1200);
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
            <Text style={styles.subtitle}>Gérez vos numéros MTN, Moov, Celtiis et Portefeuille CROUS</Text>
          </View>
        </View>

        {/* Solde Portefeuille Card */}
        <Card floating style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Portefeuille Universitaire CROUS</Text>
              <Text style={styles.balanceValue}>{walletBalance.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={styles.balanceHint}>Paiement instantané en 1 clic à 100 F par trajet</Text>
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
          <Text style={styles.sectionTitle}>Comptes & Numéros Enregistrés</Text>
          <Pressable style={styles.addSmallBtn} onPress={openAddModal}>
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

                {/* Actions par carte */}
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  {method.type !== 'CROUS_WALLET' ? (
                    <Pressable
                      style={styles.editBtn}
                      onPress={() => openEditModal(method)}
                    >
                      <MaterialIcons name="edit" size={16} color={colors.primary} />
                      <Text style={styles.editText}>Modifier</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.rechargeMiniBtn}
                      onPress={() => setRechargeModalVisible(true)}
                    >
                      <MaterialIcons name="add-card" size={16} color={colors.primary} />
                      <Text style={styles.rechargeMiniText}>Créditer</Text>
                    </Pressable>
                  )}

                  {!method.isDefault && method.type !== 'CROUS_WALLET' && (
                    <Pressable
                      style={styles.setDefaultBtn}
                      onPress={() => setDefaultMethod(method.id)}
                    >
                      <Text style={styles.setDefaultBtnText}>Activer</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Historique des Recharges */}
        <View style={[styles.sectionHeader, { marginTop: spacing.md }]}>
          <Text style={styles.sectionTitle}>Dernières Recharges du Portefeuille</Text>
        </View>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {rechargeHistory.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.historyRow,
                idx > 0 && styles.historyRowBorder,
              ]}
            >
              <View style={styles.historyIconBox}>
                <MaterialIcons name="account-balance-wallet" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyOp}>{item.operator}</Text>
                <Text style={styles.historyPhone}>{item.phone} • {item.date}</Text>
              </View>
              <Text style={styles.historyAmount}>+{item.amount.toLocaleString('fr-FR')} F</Text>
            </View>
          ))}
        </Card>

        {/* Instructions de Sécurité Bénin */}
        <Card style={styles.securityCard}>
          <View style={styles.securityRow}>
            <MaterialIcons name="security" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Paiement Sécurisé & Chiffré</Text>
              <Text style={styles.securityText}>
                Toutes les recharges et débits s'effectuent via le prompt USSD de votre opérateur : MTN (*880#), Moov (*855#) ou Celtiis (*888#).
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1 : SAISIR OU MODIFIER UN NUMÉRO DE TÉLÉPHONE                       */}
      {/* ========================================================================= */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMethodId ? 'Modifier mon numéro de téléphone' : 'Ajouter un compte Mobile Money'}
              </Text>
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
                <MaterialIcons name="phone-android" size={22} color="#000000" />
                <Text style={styles.operatorText}>MTN (*880#)</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.operatorCard,
                  selectedOperator === 'MOOV' && styles.operatorCardActive,
                ]}
                onPress={() => setSelectedOperator('MOOV')}
              >
                <MaterialIcons name="contactless" size={22} color="#0284c7" />
                <Text style={styles.operatorText}>Moov (*855#)</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.operatorCard,
                  selectedOperator === 'CELTIIS' && styles.operatorCardActive,
                ]}
                onPress={() => setSelectedOperator('CELTIIS')}
              >
                <MaterialIcons name="smartphone" size={22} color="#0070ba" />
                <Text style={styles.operatorText}>Celtiis (*888#)</Text>
              </Pressable>
            </View>

            <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>
              Saisissez votre numéro de téléphone (10 chiffres) :
            </Text>
            <TextInput
              value={inputPhoneNumber}
              onChangeText={setInputPhoneNumber}
              placeholder="ex: 0197001122"
              placeholderTextColor={colors.outline}
              keyboardType="phone-pad"
              style={styles.modalInput}
            />

            <PrimaryButton
              label={editingMethodId ? 'Enregistrer la modification' : 'Ajouter ce moyen de paiement'}
              icon="save"
              onPress={handleSaveMethod}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2 : RECHARGER LE PORTEFEUILLE UNIVERSITAIRE                          */}
      {/* ========================================================================= */}
      <Modal
        visible={rechargeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRechargeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Recharger mon Portefeuille</Text>
                <Text style={styles.modalSub}>Créditez votre solde CROUS pour payer vos trajets en 1 tap</Text>
              </View>
              <Pressable onPress={() => setRechargeModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            {/* 1. Choix du compte / opérateur qui paye */}
            <Text style={styles.modalLabel}>1. Payer depuis mon compte Mobile Money :</Text>
            <View style={styles.operatorRow}>
              <Pressable
                style={[
                  styles.operatorCard,
                  rechargeOperator === 'MTN' && styles.operatorCardActive,
                ]}
                onPress={() => handleSelectRechargeOperator('MTN')}
              >
                <MaterialIcons name="phone-android" size={20} color="#000000" />
                <Text style={styles.operatorText}>MTN (*880#)</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.operatorCard,
                  rechargeOperator === 'MOOV' && styles.operatorCardActive,
                ]}
                onPress={() => handleSelectRechargeOperator('MOOV')}
              >
                <MaterialIcons name="contactless" size={20} color="#0284c7" />
                <Text style={styles.operatorText}>Moov (*855#)</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.operatorCard,
                  rechargeOperator === 'CELTIIS' && styles.operatorCardActive,
                ]}
                onPress={() => handleSelectRechargeOperator('CELTIIS')}
              >
                <MaterialIcons name="smartphone" size={20} color="#0070ba" />
                <Text style={styles.operatorText}>Celtiis (*888#)</Text>
              </Pressable>
            </View>

            {/* 2. Saisie du numéro débité */}
            <Text style={[styles.modalLabel, { marginTop: spacing.sm }]}>
              2. Numéro de téléphone débité :
            </Text>
            <TextInput
              value={rechargePhone}
              onChangeText={setRechargePhone}
              placeholder="ex: 0197001122"
              placeholderTextColor={colors.outline}
              keyboardType="phone-pad"
              style={styles.modalInput}
            />

            {/* 3. Choix du montant */}
            <Text style={[styles.modalLabel, { marginTop: spacing.sm }]}>
              3. Montant à recharger (FCFA) :
            </Text>
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
              placeholder="Ou saisissez un montant personnalisé"
              placeholderTextColor={colors.outline}
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <PrimaryButton
              label={`Payer & Recharger ${rechargeAmount || 0} FCFA`}
              icon="account-balance-wallet"
              variant="gold"
              onPress={handleInitiateRecharge}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3 : SIMULATION DU PROMPT USSD MOBILE MONEY                          */}
      {/* ========================================================================= */}
      <Modal
        visible={ussdPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUssdPromptVisible(false)}
      >
        <View style={styles.ussdOverlay}>
          <Card style={styles.ussdBox}>
            <View style={styles.ussdHeader}>
              <MaterialIcons name="security" size={28} color={colors.primary} />
              <Text style={styles.ussdTitle}>Autorisation {rechargeOperator} Mobile Money</Text>
            </View>

            <Text style={styles.ussdPromptText}>
              CROUS-UAC Transit sollicite le débit de{' '}
              <Text style={{ fontWeight: '700', color: colors.primary }}>
                {parseInt(rechargeAmount, 10).toLocaleString('fr-FR')} FCFA
              </Text>{' '}
              sur le numéro <Text style={{ fontWeight: '700' }}>{rechargePhone}</Text>.
            </Text>

            <View style={styles.ussdCodeBox}>
              <Text style={styles.ussdCodeLabel}>Opérateur :</Text>
              <Text style={styles.ussdCodeVal}>
                {rechargeOperator === 'MTN'
                  ? 'MTN Bénin (*880#)'
                  : rechargeOperator === 'MOOV'
                  ? 'Moov Bénin (*855#)'
                  : 'Celtiis Bénin (*888#)'}
              </Text>
            </View>

            {isProcessingUssd ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.ussdProcessing}>Validation du paiement sécurisé...</Text>
              </View>
            ) : (
              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                <PrimaryButton
                  label="Confirmer avec mon Code Secret"
                  icon="check-circle"
                  onPress={handleConfirmUssdPayment}
                />
                <Pressable style={styles.ussdCancelBtn} onPress={() => setUssdPromptVisible(false)}>
                  <Text style={styles.ussdCancelText}>Annuler la transaction</Text>
                </Pressable>
              </View>
            )}
          </Card>
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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  editText: { ...typography.bodySm, color: colors.primary, fontWeight: '700' },
  rechargeMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  rechargeMiniText: { ...typography.bodySm, color: colors.primary, fontWeight: '700' },
  setDefaultBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  setDefaultBtnText: { ...typography.bodySm, color: colors.primary, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  historyRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceVariant,
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyOp: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
  historyPhone: { ...typography.bodySm, color: colors.onSurfaceVariant },
  historyAmount: { ...typography.headlineSm, fontSize: 15, color: colors.primary, fontWeight: '700' },
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
    gap: spacing.xs,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.xs },
  modalTitle: { ...typography.headlineMd, fontSize: 18, color: colors.primary },
  modalSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  modalLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  operatorRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xs },
  operatorCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    gap: 2,
  },
  operatorCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFixed,
  },
  operatorText: { ...typography.bodySm, fontWeight: '700', textAlign: 'center' },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.bodyLg,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  quickAmounts: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xs },
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
  ussdOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  ussdBox: {
    width: '100%',
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  ussdHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ussdTitle: { ...typography.headlineSm, fontSize: 16, color: colors.primary },
  ussdPromptText: { ...typography.bodyMd, color: colors.onSurface, lineHeight: 22 },
  ussdCodeBox: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ussdCodeLabel: { ...typography.bodySm, color: colors.onSurfaceVariant },
  ussdCodeVal: { ...typography.bodySm, fontWeight: '700', color: colors.onSurface },
  ussdProcessing: { ...typography.bodyMd, color: colors.primary, fontWeight: '600' },
  ussdCancelBtn: { alignItems: 'center', paddingVertical: spacing.xs },
  ussdCancelText: { ...typography.bodySm, color: colors.error, textDecorationLine: 'underline' },
});
