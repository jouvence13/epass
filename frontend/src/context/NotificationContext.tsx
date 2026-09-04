import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

export interface GlobalNotification {
  id: string;
  category: 'TRAFFIC' | 'KYC' | 'PAYMENT' | 'WALLET' | 'GENERAL';
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'success' | 'warning' | 'info' | 'error';
  icon: keyof typeof MaterialIcons.glyphMap;
}

interface NotificationContextType {
  notifications: GlobalNotification[];
  unreadCount: number;
  showToast: (params: {
    title: string;
    message: string;
    category?: 'TRAFFIC' | 'KYC' | 'PAYMENT' | 'WALLET' | 'GENERAL';
    type?: 'success' | 'warning' | 'info' | 'error';
  }) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

import { ENDPOINTS } from '../config/api';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(ENDPOINTS.NOTIFICATIONS, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const mapped: GlobalNotification[] = data.map((item: any) => ({
              id: item.id,
              category: item.category || 'GENERAL',
              title: item.title,
              message: item.message,
              time: item.time,
              read: item.read ?? false,
              type: item.tone === 'success' ? 'success' : item.tone === 'warning' ? 'warning' : 'info',
              icon: item.icon || 'notifications',
            }));
            setNotifications(mapped);
          }
        }
      } catch (e) {
        console.warn('Fetch notifications error:', e);
      }
    };

    fetchNotifications();
  }, []);

  // Toast actif pour affichage global en haut de l'écran
  const [activeToast, setActiveToast] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info' | 'error';
    icon: keyof typeof MaterialIcons.glyphMap;
  } | null>(null);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<any>(null);

  const showToast = ({
    title,
    message,
    category = 'GENERAL',
    type = 'info',
  }: {
    title: string;
    message: string;
    category?: 'TRAFFIC' | 'KYC' | 'PAYMENT' | 'WALLET' | 'GENERAL';
    type?: 'success' | 'warning' | 'info' | 'error';
  }) => {
    const icon: keyof typeof MaterialIcons.glyphMap =
      type === 'success'
        ? 'check-circle'
        : type === 'warning'
        ? 'warning'
        : type === 'error'
        ? 'error'
        : 'notifications-active';

    const newNotif: GlobalNotification = {
      id: Date.now().toString(),
      category,
      title,
      message,
      time: "À l'instant",
      read: false,
      type,
      icon,
    };

    setNotifications((prev) => [newNotif, ...prev]);

    // Affichage de la bannière toast animée en haut
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveToast({ id: newNotif.id, title, message, type, icon });

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: Platform.OS === 'web' ? 16 : 48,
        useNativeDriver: true,
        bounciness: 6,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Disparition automatique après 4.5 secondes
    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, 4500);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveToast(null);
    });
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch(ENDPOINTS.MARK_NOTIFICATIONS_READ, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.warn('Mark all read error:', e);
    }
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showToast,
        markAllAsRead,
        clearNotification,
      }}
    >
      {children}

      {/* BANNIÈRE TOAST GLOBALE FLOTTANTE (Visible sur tout l'écran) */}
      {activeToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY }],
              opacity,
              backgroundColor:
                activeToast.type === 'success'
                  ? '#064e3b'
                  : activeToast.type === 'warning'
                  ? '#78350f'
                  : activeToast.type === 'error'
                  ? '#7f1d1d'
                  : '#0f172a',
            },
          ]}
        >
          <View style={styles.toastContent}>
            <View
              style={[
                styles.toastIconBox,
                {
                  backgroundColor:
                    activeToast.type === 'success'
                      ? '#059669'
                      : activeToast.type === 'warning'
                      ? '#d97706'
                      : activeToast.type === 'error'
                      ? '#dc2626'
                      : colors.primary,
                },
              ]}
            >
              <MaterialIcons name={activeToast.icon} size={22} color="#ffffff" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.toastTitle}>{activeToast.title}</Text>
              <Text style={styles.toastMessage}>{activeToast.message}</Text>
            </View>

            <Pressable onPress={hideToast} hitSlop={12} style={styles.toastCloseBtn}>
              <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 999999,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toastIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTitle: {
    ...typography.headlineSm,
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '700',
  },
  toastMessage: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    lineHeight: 18,
  },
  toastCloseBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },
});
