import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import RootScreen from './src/screens/auth/RootScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import VerificationScreen from './src/screens/auth/VerificationScreen';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';
import CreateNewPasswordScreen from './src/screens/auth/CreateNewPasswordScreen';

import TodayScreen from './src/screens/today/TodayScreen';
import LiveScreen from './src/screens/live/LiveScreen';
import TrendsScreen from './src/screens/trends/TrendsScreen';
import LearnScreen from './src/screens/learn/LearnScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import EditProfileScreen from './src/screens/profile/EditProfileScreen';
import GoalsScreen from './src/screens/profile/GoalsScreen';
import LogHealthScreen from './src/screens/tracker/LogHealthScreen';
import SummaryScreen from './src/screens/tracker/SummaryScreen';
import WatchScreen from './src/screens/tracker/WatchScreen';

import { TrackerProvider } from './src/store/TrackerContext';
import { LiveHeartRateProvider, useLiveHeartRate } from './src/store/LiveHeartRateContext';
import { SessionProvider, useSession } from './src/store/SessionContext';
import { AuthStackParamList, AppStackParamList, MainTabParamList } from './src/types/navigation';
import type { IconName } from './src/utils/metrics';
import colors from './src/theme/colors';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.card, primary: colors.primary },
};

const TAB_ICONS: Record<keyof MainTabParamList, [IconName, IconName]> = {
  Today: ['today', 'today-outline'],
  Live: ['pulse', 'pulse-outline'],
  Trends: ['stats-chart', 'stats-chart-outline'],
  Learn: ['book', 'book-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

function MainTabs() {
  const live = useLiveHeartRate();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen
        name="Live"
        component={LiveScreen}
        options={{
          tabBarBadge: live.status === 'live' && live.bpm ? live.bpm : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tab.Screen name="Trends" component={TrendsScreen} />
      <Tab.Screen name="Learn" component={LearnScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function SignedInApp() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs" component={MainTabs} />
      <AppStack.Screen name="LogHealth" component={LogHealthScreen} />
      <AppStack.Screen name="Summary" component={SummaryScreen} />
      <AppStack.Screen name="Watch" component={WatchScreen} />
      <AppStack.Screen name="Goals" component={GoalsScreen} />
      <AppStack.Screen name="EditProfile" component={EditProfileScreen} />
    </AppStack.Navigator>
  );
}

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Root" component={RootScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="Verification" component={VerificationScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen name="CreateNewPassword" component={CreateNewPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function Root() {
  const { ready, signedIn } = useSession();
  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <NavigationContainer theme={navTheme}>
      {signedIn ? <SignedInApp /> : <AuthFlow />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SessionProvider>
        <TrackerProvider>
          <LiveHeartRateProvider>
            <Root />
          </LiveHeartRateProvider>
        </TrackerProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  tabBar: { backgroundColor: colors.card, borderTopColor: colors.card },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  badge: { backgroundColor: colors.heart, color: colors.white, fontSize: 10 },
});
