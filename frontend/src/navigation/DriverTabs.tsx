import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import DriverHubScreen from '../screens/driver/DriverHubScreen';
import PassengerLookupScreen from '../screens/driver/PassengerLookupScreen';
import ScanBoardingPassScreen from '../screens/driver/ScanBoardingPassScreen';
import AlertsScreen from '../screens/driver/AlertsScreen';
import TopBar from '../components/TopBar';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'dashboard',
  Scan: 'qr-code-scanner',
  Users: 'group',
  Alerts: 'notifications',
};

export default function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header:
          route.name === 'Scan'
            ? undefined
            : () => <TopBar title="CROUS-UAC Driver" dark rightBadge="OPERATIONAL" />,
        tabBarActiveTintColor: colors.onSecondaryContainer,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { borderTopColor: colors.outlineVariant, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => <MaterialIcons name={ICONS[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={DriverHubScreen} />
      <Tab.Screen name="Scan" component={ScanBoardingPassScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Users" component={PassengerLookupScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
    </Tab.Navigator>
  );
}
