import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import AuthButton from '../../components/AuthButton';
import ProgressRing from '../../components/ProgressRing';
import colors from '../../theme/colors';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Root'> };

export default function RootScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoWrapper}>
          <ProgressRing
            size={132}
            stroke={12}
            rings={[
              { progress: 0.82, color: colors.steps },
              { progress: 0.62, color: colors.exercise },
              { progress: 0.74, color: colors.learning },
            ]}
          >
            <Ionicons name="heart" size={34} color={colors.heart} />
          </ProgressRing>
          <Text style={styles.brand}>JING</Text>
          <Text style={styles.subtitle}>
            Health, learning and your Garmin watch,{'\n'}all in one place
          </Text>
        </View>

        <View style={styles.actions}>
          <AuthButton title="Sign Up" onPress={() => navigation.navigate('SignUp')} />

          <Text style={styles.loginRow}>
            I already have an account?{' '}
            <Text style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
              Login
            </Text>
          </Text>

          <Text style={styles.orText}>Or Sign up with</Text>

          <View style={styles.socialRow}>
            <TouchableOpacity style={[styles.socialBtn, styles.googleBtn]}>
              <Ionicons name="logo-google" size={24} color={colors.background} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, styles.appleBtn]}>
              <Ionicons name="logo-apple" size={24} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, styles.fbBtn]}>
              <Ionicons name="logo-facebook" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 48 },
  logoWrapper: { alignItems: 'center', marginTop: 40 },
  brand: { color: colors.white, fontSize: 34, fontWeight: '800', letterSpacing: 6, marginTop: 28 },
  subtitle: { color: colors.gray, fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  actions: { gap: 20 },
  loginRow: { color: colors.gray, textAlign: 'center', fontSize: 14 },
  loginLink: { color: colors.primary, fontWeight: '600' },
  orText: { color: colors.gray, textAlign: 'center', fontSize: 13 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleBtn: { backgroundColor: colors.white },
  appleBtn: { backgroundColor: '#2C2C3E' },
  fbBtn: { backgroundColor: '#3B5998' },
});
