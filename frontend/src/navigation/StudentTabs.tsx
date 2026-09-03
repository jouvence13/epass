import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/student/HomeScreen';
import BookTicketScreen from '../screens/student/BookTicketScreen';
import ActiveTicketScreen from '../screens/student/ActiveTicketScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import TopBar from '../components/TopBar';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'directions-bus',
  Booking: 'add-circle',
  Tickets: 'confirmation-number',
  Profile: 'person',
};

const TITLES: Record<string, string> = {
  Home: 'CROUS-UAC',
  Booking: 'Booking',
  Tickets: 'Active Ticket',
  Profile: 'Mon profil',
};

export default function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => <TopBar title={TITLES[route.name]} />,
        tabBarActiveTintColor: colors.onSecondaryContainer,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: { borderTopColor: colors.outlineVariant, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => (
          <MaterialIcons
            name={ICONS[route.name]}
            size={focused ? size + 2 : size}
            color={color}
            style={
              focused
                ? { backgroundColor: colors.secondaryContainer, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4, overflow: 'hidden' }
                : undefined
            }
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
