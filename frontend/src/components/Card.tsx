import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadow } from '../theme/theme';

export default function Card({ style, floating, ...props }: ViewProps & { floating?: boolean }) {
  return <View style={[styles.card, floating ? shadow.floating : shadow.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
