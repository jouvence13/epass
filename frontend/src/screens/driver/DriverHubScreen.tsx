import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { colors, radius, spacing, typography } from '../../theme/theme';

export default function DriverHubScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <View>
              <Text style={styles.routeTitle}>Campus Express Route 4</Text>
              <View style={styles.rowCenter}>
                <MaterialIcons name="schedule" size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.hint}> Next stop in 5 mins: Science Block</Text>
              </View>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          <View style={styles.mapPreview}>
            <View style={[StyleSheet.absoluteFill, styles.mapGrid]}>
              {Array.from({ length: 18 }).map((_, i) => (
                <View key={i} style={styles.mapCell} />
              ))}
            </View>
            <View style={styles.mapRouteLine} />
          </View>
        </Card>

        <View style={styles.bento}>
          <Card style={styles.capacityCard} floating>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Capacity</Text>
              <MaterialIcons name="group" size={20} color={colors.outline} />
            </View>
            <View style={styles.capacityRow}>
              <Text style={styles.capacityNum}>32</Text>
              <Text style={styles.capacityTotal}>/50</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '64%' }]} />
            </View>
            <Pressable style={styles.boardBtn} onPress={() => navigation.navigate('Scan')}>
              <MaterialIcons name="qr-code-scanner" size={20} color={colors.onTertiaryContainer} />
              <Text style={styles.boardBtnText}>Start Boarding</Text>
            </Pressable>
          </Card>

          <View style={styles.actionsCol}>
            <Pressable style={styles.reportBtn} onPress={() => navigation.navigate('ReportDelay')}>
              <MaterialIcons name="warning" size={30} color={colors.onError} />
              <Text style={styles.reportBtnText}>Report Delay / Incident</Text>
            </Pressable>
            <View style={styles.smallRow}>
              <Pressable style={styles.smallBtn}>
                <MaterialIcons name="chat" size={26} color={colors.onSurfaceVariant} />
                <Text style={styles.smallBtnLabel}>Dispatch</Text>
              </Pressable>
              <Pressable style={styles.smallBtn}>
                <MaterialIcons name="local-gas-station" size={26} color={colors.onSurfaceVariant} />
                <Text style={styles.smallBtnLabel}>Refuel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.containerMargin, paddingBottom: spacing.xl, gap: spacing.md },
  routeCard: { gap: spacing.md, borderWidth: 1, borderColor: 'rgba(115,119,128,0.3)' },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeTitle: { ...typography.headlineMd, fontSize: 20, color: colors.primary },
  rowCenter: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  hint: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  liveText: { ...typography.labelCaps, color: colors.onSurfaceVariant },
  mapPreview: { height: 160, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceContainerHigh },
  mapGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  mapCell: { width: '25%', height: '33.3%', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.surfaceDim },
  mapRouteLine: {
    position: 'absolute', left: '10%', right: '10%', top: '50%', height: 4,
    backgroundColor: colors.primaryFixedDim, borderRadius: 2, transform: [{ rotate: '4deg' }],
  },
  bento: { gap: spacing.md },
  capacityCard: { alignItems: 'stretch', borderWidth: 1, borderColor: 'rgba(115,119,128,0.3)' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...typography.headlineSm, color: colors.primary },
  capacityRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingVertical: spacing.md },
  capacityNum: { ...typography.displayLg, color: colors.primary },
  capacityTotal: { ...typography.headlineMd, color: colors.outline, marginBottom: 4 },
  progressTrack: { height: 10, backgroundColor: colors.surfaceContainer, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.secondary, borderRadius: 5 },
  boardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.tertiaryFixedDim, borderRadius: radius.md, height: 52, marginTop: spacing.md,
  },
  boardBtnText: { ...typography.headlineSm, fontSize: 16, color: colors.onTertiaryContainer },
  actionsCol: { gap: spacing.md },
  reportBtn: {
    backgroundColor: colors.error, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.lg,
  },
  reportBtnText: { ...typography.headlineSm, fontSize: 16, color: colors.onError },
  smallRow: { flexDirection: 'row', gap: spacing.md },
  smallBtn: {
    flex: 1, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant,
    borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md,
  },
  smallBtnLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant },
});
