import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Card from '../../components/Card';
import { colors, spacing, typography } from '../../theme/theme';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';

export interface DriverAlertItem {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  body: string;
  time: string;
  tone: string;
}

export default function AlertsScreen() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<DriverAlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(ENDPOINTS.DRIVER_ALERTS, {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      }
    } catch (e) {
      console.warn('Error fetching driver alerts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Alertes Conducteur</Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id || item.title}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={[styles.icon, { backgroundColor: item.tone || colors.surfaceContainer }]}>
                <MaterialIcons name={item.icon || 'notifications'} size={20} color={colors.onSurface} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{item.title}</Text>
                <Text style={styles.alertBody}>{item.body}</Text>
                <Text style={styles.alertTime}>{item.time}</Text>
              </View>
            </Card>
          )}
        />
      )}
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
