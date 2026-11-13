import type { NavigatorScreenParams, CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  Root: undefined;
  Login: undefined;
  SignUp: undefined;
  Verification: { email: string; name?: string; mode: 'signup' | 'reset' };
  ResetPassword: undefined;
  CreateNewPassword: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  Live: undefined;
  Trends: undefined;
  Learn: undefined;
  Profile: undefined;
};

/** Signed-in app: the tabs plus screens any tab can open on top of them. */
export type AppStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;
  LogHealth: undefined;
  Summary: undefined;
  Watch: undefined;
  Goals: undefined;
  EditProfile: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;

export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;

export type TabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<AppStackParamList>
>;
