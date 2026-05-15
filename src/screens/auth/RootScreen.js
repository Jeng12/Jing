import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import AuthButton from '../../components/AuthButton';
import colors from '../../theme/colors';

export default function RootScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoWrapper}>
          <View style={styles.tv}>
            <View style={styles.antennaLeft} />
            <View style={styles.antennaRight} />
            <View style={styles.screen}>
              <Text style={styles.logoText}>CN</Text>
            </View>
          </View>
          <Text style={styles.brand}>CINEMAX</Text>
          <Text style={styles.subtitle}>
            Enter your registered{'\n'}Phone Number to Sign Up
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
              <Text style={styles.socialLabel}>G</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, styles.appleBtn]}>
              <Text style={styles.socialLabel}></Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, styles.fbBtn]}>
              <Text style={styles.socialLabel}>f</Text>
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
  tv: { alignItems: 'center', marginBottom: 24 },
  antennaLeft: {
    position: 'absolute',
    top: -20,
    left: 30,
    width: 3,
    height: 22,
    backgroundColor: colors.primary,
    transform: [{ rotate: '-20deg' }],
  },
  antennaRight: {
    position: 'absolute',
    top: -20,
    right: 30,
    width: 3,
    height: 22,
    backgroundColor: colors.primary,
    transform: [{ rotate: '20deg' }],
  },
  screen: {
    width: 90,
    height: 72,
    borderWidth: 3,
    borderColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { color: colors.primary, fontSize: 22, fontWeight: '800' },
  brand: { color: colors.white, fontSize: 32, fontWeight: '800', letterSpacing: 4, marginTop: 16 },
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
  socialLabel: { fontSize: 20, fontWeight: '700' },
});
