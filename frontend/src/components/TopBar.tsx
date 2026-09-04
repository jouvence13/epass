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
  unreadCount = 0,
  onNotificationPress,
  onProfilePress,
  userInitial,
}: {
  title: string;
  subtitle?: string;
  dark?: boolean;
  onBack?: () => void;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
  rightBadge?: string;
  unreadCount?: number;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  userInitial?: string;
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
            <MaterialIcons name="directions-bus" size={22} color={fg} style={{ marginRight: 8 }} />
          )}
          <View>
            <Text style={[styles.title, { color: fg }]}>{title}</Text>
            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  { color: dark ? colors.primaryFixedDim : colors.onSurfaceVariant },
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Actions à droite : Notifications + Profil + Autres */}
        <View style={styles.rightActions}>
          {onNotificationPress && (
            <Pressable
              onPress={onNotificationPress}
              hitSlop={10}
              style={styles.notifBtn}
              accessibilityLabel="Notifications"
            >
              <MaterialIcons
                name={unreadCount > 0 ? 'notifications-active' : 'notifications-none'}
                size={24}
                color={fg}
              />
              {unreadCount > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          )}

          {onProfilePress && (
            <Pressable
              onPress={onProfilePress}
              hitSlop={10}
              style={styles.profileBtn}
              accessibilityLabel="Mon Profil"
            >
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {userInitial || 'U'}
                </Text>
              </View>
            </Pressable>
          )}

          {rightBadge ? (
            <View style={styles.pill}>
              <MaterialIcons name="check-circle" size={14} color={colors.onSecondaryContainer} />
              <Text style={styles.pillText}>{rightBadge}</Text>
            </View>
          ) : rightIcon ? (
            <Pressable onPress={onRightPress} hitSlop={10} style={styles.iconActionBtn}>
              <MaterialIcons name={rightIcon} size={22} color={fg} />
            </Pressable>
          ) : null}
        </View>
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
    minHeight: 42,
  },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 4 },
  backBtn: { marginRight: 8, padding: 2 },
  title: { ...typography.headlineSm, fontSize: 18 },
  subtitle: { ...typography.bodyMd, fontSize: 12 },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notifBtn: {
    position: 'relative',
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCount: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  profileBtn: {
    padding: 2,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  iconActionBtn: {
    padding: 6,
  },
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
