import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { PASSENGERS, Passenger } from '../../data/passengers';

type Filter = 'all' | 'pending' | 'checked';

export default function PassengerLookupScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [passengers, setPassengers] = useState(PASSENGERS);

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

  const validate = (id: string) => {
    setPassengers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'checked', checkedAt: 'Just now' } : p))
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CURRENT MANIFEST</Text>
        <Text style={styles.title}>Trip #4022 - Campus to Cotonou</Text>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={colors.outline} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by Matricule or Phone"
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
                {f === 'all' ? `All (${counts.all})` : f === 'pending' ? `Pending (${counts.pending})` : `Checked-in (${counts.checked})`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <PassengerCard passenger={item} onValidate={() => validate(item.id)} />}
      />
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
          label={checked ? 'Checked-in' : 'Pending'}
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
        <Text style={styles.infoText}>{checked ? `Checked in at ${passenger.checkedAt}` : `Stop: ${passenger.stop}`}</Text>
      </View>

      <Pressable
        disabled={checked}
        onPress={onValidate}
        style={[styles.validateBtn, checked && styles.validateBtnDisabled]}
      >
        {!checked && <MaterialIcons name="check-circle" size={18} color={colors.onPrimary} />}
        <Text style={[styles.validateText, checked && styles.validateTextDisabled]}>
          {checked ? 'Validated' : 'Manual Validate'}
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
});
