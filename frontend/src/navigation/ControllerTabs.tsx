import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import ControllerHubScreen from '../screens/controller/ControllerHubScreen';
import PassengerLookupScreen from '../screens/driver/PassengerLookupScreen';
import ScanBoardingPassScreen from '../screens/driver/ScanBoardingPassScreen';
import AlertsScreen from '../screens/driver/AlertsScreen';
import TopBar from '../components/TopBar';
import { colors } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'security',
  Scan: 'qr-code-scanner',
  Users: 'group',
  Alerts: 'notifications',
};

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ControllerTabs() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { showToast } = useNotifications();

  const handleLogout = () => {
    showToast({
      title: 'Déconnexion Réussie',
      message: 'Votre session Contrôleur CROUS a été fermée.',
      type: 'info',
      category: 'GENERAL',
    });
    logout();
  };

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const tabHeight = 56 + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header:
          route.name === 'Scan'
            ? undefined
            : () => (
                <TopBar
                  title="CROUS-UAC Contrôle"
                  dark
                  rightIcon="logout"
                  onRightPress={handleLogout}
                />
              ),
        tabBarActiveTintColor: '#0284c7',
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
      <Tab.Screen name="Home" component={ControllerHubScreen} options={{ tabBarLabel: 'Contrôle' }} />
      <Tab.Screen name="Scan" component={ScanBoardingPassScreen} options={{ headerShown: false, tabBarLabel: 'Scanner' }} />
      <Tab.Screen name="Users" component={PassengerLookupScreen} options={{ tabBarLabel: 'Manifeste' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarLabel: 'Alertes' }} />
    </Tab.Navigator>
  );
}
