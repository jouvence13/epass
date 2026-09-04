import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import DriverHubScreen from '../screens/driver/DriverHubScreen';
import PassengerLookupScreen from '../screens/driver/PassengerLookupScreen';
import ScanBoardingPassScreen from '../screens/driver/ScanBoardingPassScreen';
import AlertsScreen from '../screens/driver/AlertsScreen';
import TopBar from '../components/TopBar';
import { colors } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'dashboard',
  Scan: 'qr-code-scanner',
  Users: 'group',
  Alerts: 'notifications',
};

export default function DriverTabs() {
  const { user, logout } = useAuth();
  const { showToast } = useNotifications();
  const isController = user?.role === 'CONTROLLER';

  const handleLogout = () => {
    showToast({
      title: 'Déconnexion Réussie',
      message: isController ? 'Votre session Contrôleur a été fermée.' : 'Votre session Chauffeur a été fermée.',
      type: 'info',
      category: 'GENERAL',
    });
    logout();
  };

  const topBarTitle = isController ? 'CROUS-UAC Contrôle' : 'CROUS-UAC Chauffeur';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header:
          route.name === 'Scan'
            ? undefined
            : () => (
                <TopBar
                  title={topBarTitle}
                  dark
                  rightIcon="logout"
                  onRightPress={handleLogout}
                />
              ),
        tabBarActiveTintColor: colors.onSecondaryContainer,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { borderTopColor: colors.outlineVariant, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => <MaterialIcons name={ICONS[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={DriverHubScreen} options={{ tabBarLabel: 'Tableau de bord' }} />
      <Tab.Screen name="Scan" component={ScanBoardingPassScreen} options={{ headerShown: false, tabBarLabel: 'Scanner' }} />
      <Tab.Screen name="Users" component={PassengerLookupScreen} options={{ tabBarLabel: 'Passagers' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarLabel: 'Alertes' }} />
    </Tab.Navigator>
  );
}
