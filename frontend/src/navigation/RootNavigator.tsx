import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import RoleSelectScreen from '../screens/RoleSelectScreen';

// Student Screens
import KycOnboardingScreen from '../screens/student/KycOnboardingScreen';
import HistoryScreen from '../screens/student/HistoryScreen';
import PaymentMethodsScreen from '../screens/student/PaymentMethodsScreen';
import NotificationsScreen from '../screens/student/NotificationsScreen';
import SupportScreen from '../screens/student/SupportScreen';
import StudentTabs from './StudentTabs';

// Driver Screens
import DriverTabs from './DriverTabs';
import ReportDelayScreen from '../screens/driver/ReportDelayScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';

// Controller Screens
import ControllerTabs from './ControllerTabs';
import ReportFraudScreen from '../screens/controller/ReportFraudScreen';

// Admin Screens
import AdminTabs from './AdminTabs';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, isAuthenticated, isInitialLoading } = useAuth();

  if (isInitialLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          // ================================================================
          // STACK NON-AUTHENTIFIÉ (Connexion / Inscription / Choix du profil)
          // ================================================================
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          </>
        ) : user?.role === 'STUDENT' ? (
          // ================================================================
          // STACK ÉTUDIANT SÉCURISÉ (RBAC STUDENT)
          // ================================================================
          <>
            <Stack.Screen name="StudentTabs" component={StudentTabs} />
            <Stack.Screen name="KycOnboarding" component={KycOnboardingScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
          </>
        ) : user?.role === 'DRIVER' ? (
          // ================================================================
          // STACK CHAUFFEUR SÉCURISÉ (RBAC DRIVER)
          // ================================================================
          <>
            <Stack.Screen name="DriverTabs" component={DriverTabs} />
            <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
            <Stack.Screen name="ReportDelay" component={ReportDelayScreen} />
          </>
        ) : user?.role === 'CONTROLLER' ? (
          // ================================================================
          // STACK CONTRÔLEUR SÉCURISÉ (RBAC CONTROLLER)
          // ================================================================
          <>
            <Stack.Screen name="ControllerTabs" component={ControllerTabs} />
            <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
            <Stack.Screen name="ReportFraud" component={ReportFraudScreen} />
            <Stack.Screen name="ReportDelay" component={ReportDelayScreen} />
          </>
        ) : (
          // ================================================================
          // STACK DIRECTION CROUS / SUPERADMIN (RBAC ADMIN)
          // ================================================================
          <>
            <Stack.Screen name="AdminTabs" component={AdminTabs} />
            <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
            <Stack.Screen name="StudentTabs" component={StudentTabs} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
