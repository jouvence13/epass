import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, shadow } from '../theme/theme';

type Variant = 'primary' | 'gold' | 'outline' | 'danger' | 'muted';

const variantStyles: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  gold: { bg: colors.tertiaryFixedDim, fg: colors.onTertiaryContainer },
  outline: { bg: 'transparent', fg: colors.primary, border: colors.primary },
  danger: { bg: colors.error, fg: colors.onError },
  muted: { bg: colors.surfaceVariant, fg: colors.primary },
};

export default function PrimaryButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  trailing,
  disabled,
  style,
  floating,
}: {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  variant?: Variant;
  trailing?: string;
  disabled?: boolean;
  style?: ViewStyle;
  floating?: boolean;
}) {
  const v = variantStyles[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border ?? 'transparent', borderWidth: v.border ? 1.5 : 0 },
        floating ? shadow.floating : null,
        disabled ? { opacity: 0.5 } : null,
        pressed ? { opacity: 0.85 } : null,
        style,
      ]}
    >
      {icon ? <MaterialIcons name={icon} size={20} color={v.fg} style={{ marginRight: spacing.sm }} /> : null}
      <Text style={[styles.label, { color: v.fg }]}>{label}</Text>
      {trailing ? <Text style={[styles.trailing, { color: v.fg }]}>{trailing}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typography.headlineSm,
    fontSize: 16,
  },
  trailing: {
    ...typography.headlineSm,
    fontSize: 16,
    marginLeft: 'auto',
    paddingLeft: spacing.md,
  },
});
