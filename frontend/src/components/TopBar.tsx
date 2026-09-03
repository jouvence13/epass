import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';

export default function TopBar({
  title,
  subtitle,
  dark = false,
  onBack,
  rightIcon,
  onRightPress,
  rightBadge,
}: {
  title: string;
  subtitle?: string;
  dark?: boolean;
  onBack?: () => void;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
  rightBadge?: string;
}) {
  const insets = useSafeAreaInsets();
  const bg = dark ? colors.primary : colors.surface;
  const fg = dark ? colors.onPrimary : colors.primary;

  return (
    <View style={[styles.wrap, { backgroundColor: bg, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={22} color={fg} />
            </Pressable>
          ) : (
            <MaterialIcons name="directions-bus" size={20} color={fg} style={{ marginRight: 8 }} />
          )}
          <View>
            <Text style={[styles.title, { color: fg }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: dark ? colors.primaryFixedDim : colors.onSurfaceVariant }]}>{subtitle}</Text> : null}
          </View>
        </View>
        {rightBadge ? (
          <View style={[styles.pill, { backgroundColor: dark ? colors.secondaryContainer : colors.secondaryContainer }]}>
            <MaterialIcons name="check-circle" size={14} color={colors.onSecondaryContainer} />
            <Text style={styles.pillText}>{rightBadge}</Text>
          </View>
        ) : rightIcon ? (
          <Pressable onPress={onRightPress} hitSlop={10}>
            <MaterialIcons name={rightIcon} size={22} color={fg} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  backBtn: { marginRight: 8, padding: 2 },
  title: { ...typography.headlineSm, fontSize: 18 },
  subtitle: { ...typography.bodyMd, fontSize: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    ...typography.labelCaps,
    color: colors.onSecondaryContainer,
    marginLeft: 4,
  },
});
