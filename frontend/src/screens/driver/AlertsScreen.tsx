import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { colors, spacing, typography } from '../../theme/theme';

const ALERTS: { icon: keyof typeof MaterialIcons.glyphMap; title: string; body: string; time: string; tone: string }[] = [
  { icon: 'warning', title: 'Delay broadcasted', body: '+30 min sent to 50 passengers on Route 42.', time: '5 min ago', tone: colors.errorContainer },
  { icon: 'local-gas-station', title: 'Refuel reminder', body: 'Bus #402 fuel level below 20%.', time: '1 h ago', tone: colors.tertiaryFixed },
  { icon: 'chat', title: 'Dispatch message', body: '"Please confirm arrival at Science Block."', time: '2 h ago', tone: colors.surfaceContainerHigh },
];

export default function AlertsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
      </View>
      <FlatList
        data={ALERTS}
        keyExtractor={(item, i) => item.title + i}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={[styles.icon, { backgroundColor: item.tone }]}>
              <MaterialIcons name={item.icon} size={20} color={colors.onSurface} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{item.title}</Text>
              <Text style={styles.alertBody}>{item.body}</Text>
              <Text style={styles.alertTime}>{item.time}</Text>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.containerMargin },
  title: { ...typography.headlineMd, color: colors.primary },
  list: { paddingHorizontal: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  card: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { ...typography.headlineSm, fontSize: 15, color: colors.onSurface },
  alertBody: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  alertTime: { ...typography.labelCaps, color: colors.outline, marginTop: 4 },
});
