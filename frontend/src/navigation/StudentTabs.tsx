import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/student/HomeScreen';
import BookTicketScreen from '../screens/student/BookTicketScreen';
import ActiveTicketScreen from '../screens/student/ActiveTicketScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import TopBar from '../components/TopBar';
import { colors, typography } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'directions-bus',
  Tickets: 'confirmation-number',
  Booking: 'qr-code-scanner',
  Profile: 'person',
};

const LABELS: Record<string, string> = {
  Home: 'Accueil',
  Tickets: 'Mes Tickets',
  Booking: 'Payer (QR)',
  Profile: 'Profil',
};

const TITLES: Record<string, string> = {
  Home: 'CROUS-UAC',
  Tickets: 'Mes Tickets Actifs',
  Booking: 'Payer & Réserver (Scan QR)',
  Profile: 'Mon Profil Étudiant',
};

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StudentTabs({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { unreadCount, showToast } = useNotifications();

  const handleLogout = () => {
    showToast({
      title: 'Déconnexion Réussie',
      message: 'Votre session a été fermée en toute sécurité.',
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
        header: () => (
          <TopBar
            title={TITLES[route.name]}
            unreadCount={unreadCount}
            onNotificationPress={() => navigation.navigate('Notifications')}
            onProfilePress={() => navigation.navigate('Profile')}
            userInitial={user?.first_name ? user.first_name[0].toUpperCase() : 'E'}
            rightIcon="logout"
            onRightPress={handleLogout}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarLabel: LABELS[route.name],
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIcon: ({ color, size, focused }) => (
          <MaterialIcons
            name={ICONS[route.name]}
            size={focused ? 24 : 22}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tickets" component={ActiveTicketScreen} />
      <Tab.Screen name="Booking" component={BookTicketScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
