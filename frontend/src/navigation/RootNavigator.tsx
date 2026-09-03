import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoleSelectScreen from '../screens/RoleSelectScreen';
import KycOnboardingScreen from '../screens/student/KycOnboardingScreen';
import StudentTabs from './StudentTabs';
import DriverTabs from './DriverTabs';
import ReportDelayScreen from '../screens/driver/ReportDelayScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <Stack.Screen name="KycOnboarding" component={KycOnboardingScreen} />
        <Stack.Screen name="StudentTabs" component={StudentTabs} />
        <Stack.Screen name="DriverTabs" component={DriverTabs} />
        <Stack.Screen name="ReportDelay" component={ReportDelayScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
