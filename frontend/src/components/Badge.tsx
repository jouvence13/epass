import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

type Tone = 'success' | 'warning' | 'error' | 'neutral' | 'primary';

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
  warning: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer },
  error: { bg: colors.errorContainer, fg: colors.onErrorContainer },
  neutral: { bg: colors.surfaceVariant, fg: colors.onSurfaceVariant },
  primary: { bg: colors.primaryFixed, fg: colors.primary },
};

export default function Badge({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: Tone;
  icon?: keyof typeof MaterialIcons.glyphMap;
}) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon ? <MaterialIcons name={icon} size={14} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  label: {
    ...typography.labelCaps,
    textTransform: 'uppercase',
  },
});
