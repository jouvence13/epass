import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminKycModerationScreen from '../screens/admin/AdminKycModerationScreen';
import AdminFleetScreen from '../screens/admin/AdminFleetScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import TopBar from '../components/TopBar';
import { colors } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'dashboard',
  Moderation: 'folder-shared',
  Fleet: 'directions-bus',
  Users: 'badge',
};

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminTabs() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { showToast } = useNotifications();

  const handleLogout = () => {
    showToast({
      title: 'Déconnexion Réussie',
      message: 'Votre session Administration CROUS a été fermée.',
      type: 'info',
      category: 'GENERAL',
    });
    logout();
  };

  const title = user?.role === 'SUPERADMIN' ? 'Direction SuperAdmin' : 'Direction CROUS-UAC';
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const tabHeight = 56 + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => (
          <TopBar
            title={title}
            dark
            rightIcon="logout"
            onRightPress={handleLogout}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => <MaterialIcons name={ICONS[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={AdminDashboardScreen} options={{ tabBarLabel: 'Audit & KPIs' }} />
      <Tab.Screen name="Moderation" component={AdminKycModerationScreen} options={{ tabBarLabel: 'Modération' }} />
      <Tab.Screen name="Fleet" component={AdminFleetScreen} options={{ tabBarLabel: 'Flotte' }} />
      <Tab.Screen name="Users" component={AdminUsersScreen} options={{ tabBarLabel: 'Personnel' }} />
    </Tab.Navigator>
  );
}
