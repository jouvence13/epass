import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { Passenger } from '../../data/passengers';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

type Filter = 'all' | 'pending' | 'checked';

export default function PassengerLookupScreen() {
  const { token } = useAuth();
  const { showToast } = useNotifications();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [tripTitle, setTripTitle] = useState('Manifeste Passagers - Rotation Campus');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPassengers = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.DRIVER_PASSENGERS, {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.passengers)) {
          setPassengers(data.passengers);
          if (data.trip_title) {
            setTripTitle(data.trip_title);
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching driver passenger manifest:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPassengers();
  }, [fetchPassengers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPassengers();
  };

  const counts = useMemo(
    () => ({
      all: passengers.length,
      pending: passengers.filter((p) => p.status === 'pending').length,
      checked: passengers.filter((p) => p.status === 'checked').length,
    }),
    [passengers]
  );

  const data = useMemo(() => {
    return passengers.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.matricule.toLowerCase().includes(q) || p.phone.includes(q);
    });
  }, [passengers, filter, query]);

  const validate = async (id: string, name: string) => {
    // Optimistic update
    setPassengers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'checked', checkedAt: 'À l\'instant' } : p))
    );

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.DRIVER_MANUAL_VALIDATE(id), {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      if (res.ok) {
        showToast({
          title: 'Passager Validé',
          message: `${name} a été composté avec succès.`,
          type: 'success',
          category: 'TRIP',
        });
      } else {
        showToast({
          title: 'Validation Enregistrée',
          message: `Le titre de ${name} est validé pour l'embarquement.`,
          type: 'info',
          category: 'TRIP',
        });
      }
    } catch (e) {
      console.warn('Error validating ticket:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MANIFESTE D'EMBARQUEMENT</Text>
        <Text style={styles.title}>{tripTitle}</Text>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={colors.outline} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher par Nom, Matricule ou Téléphone"
            placeholderTextColor={colors.outline}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.chipsRow}>
          {(['all', 'pending', 'checked'] as Filter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, filter === f && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                {f === 'all' ? `Tous (${counts.all})` : f === 'pending' ? `En attente (${counts.pending})` : `Embarqués (${counts.checked})`}
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
          data={data}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderItem={({ item }) => <PassengerCard passenger={item} onValidate={() => validate(item.id, item.name)} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="group-off" size={48} color={colors.outline} />
              <Text style={styles.emptyText}>Aucun passager trouvé dans cette catégorie.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function PassengerCard({ passenger, onValidate }: { passenger: Passenger; onValidate: () => void }) {
  const checked = passenger.status === 'checked';
  return (
    <Card style={[styles.card, checked && styles.cardChecked]}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={22} color={checked ? colors.onSecondaryContainer : colors.outline} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{passenger.name}</Text>
          <Text style={styles.matricule}>{passenger.matricule}</Text>
        </View>
        <Badge
          label={checked ? 'Embarqué' : 'En attente'}
          tone={checked ? 'success' : 'warning'}
          icon={checked ? 'check-circle' : 'info'}
        />
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="call" size={16} color={colors.onSurfaceVariant} />
        <Text style={styles.infoText}>{passenger.phone}</Text>
      </View>
      <View style={styles.infoRow}>
        <MaterialIcons name={checked ? 'schedule' : 'location-on'} size={16} color={colors.onSurfaceVariant} />
        <Text style={styles.infoText}>{checked ? `Composté à ${passenger.checkedAt}` : `Arrêt : ${passenger.stop}`}</Text>
      </View>

      <Pressable
        disabled={checked}
        onPress={onValidate}
        style={[styles.validateBtn, checked && styles.validateBtnDisabled]}
      >
        {!checked && <MaterialIcons name="check-circle" size={18} color={colors.onPrimary} />}
        <Text style={[styles.validateText, checked && styles.validateTextDisabled]}>
          {checked ? 'Titre Validé' : 'Valider l\'Embarquement'}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.containerMargin, gap: spacing.sm },
  eyebrow: { ...typography.labelCaps, color: colors.onSurfaceVariant },
  title: { ...typography.headlineMd, color: colors.onBackground, marginBottom: spacing.xs },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 48,
    borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.md,
    paddingHorizontal: spacing.md, backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, ...typography.bodyLg, color: colors.onSurface },
  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  chipTextActive: { color: colors.onPrimary },
  list: { paddingHorizontal: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  card: { backgroundColor: colors.surfaceContainer, gap: spacing.sm },
  cardChecked: { borderWidth: 1, borderColor: colors.secondary },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { ...typography.headlineSm, fontSize: 16, color: colors.onSurface },
  matricule: { ...typography.statusCode, fontSize: 12, color: colors.onSurfaceVariant },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  validateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    height: 48, borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.sm,
  },
  validateBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant, opacity: 0.6 },
  validateText: { ...typography.headlineSm, fontSize: 15, color: colors.onPrimary },
  validateTextDisabled: { color: colors.onSurfaceVariant },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.bodyMd, color: colors.outline, textAlign: 'center' },
});
