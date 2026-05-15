import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import AuthInput from '../../components/AuthInput';
import AuthButton from '../../components/AuthButton';
import colors from '../../theme/colors';

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign Up</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>Let's get started</Text>
        <Text style={styles.subtitle}>The latest movies and series{'\n'}are here</Text>

        <View style={styles.form}>
          <AuthInput
            label="Full Name"
            placeholder="Tiffany"
            value={name}
            onChangeText={setName}
          />
          <AuthInput
            label="Email Address"
            placeholder="Tiffanyjearsey@gmail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AuthInput
            label="Password"
            placeholder="••••••••••••••••••••••"
            value={password}
            onChangeText={setPassword}
            secureToggle
          />

          <TouchableOpacity style={styles.checkRow} onPress={() => setAgreed(a => !a)}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>
              I agree to the{' '}
              <Text style={styles.link}>Terms and Services</Text>
              {'\n'}and <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <AuthButton
          title="Sign Up"
          onPress={() => navigation.navigate('Verification', { email })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: { color: colors.white, fontSize: 22, lineHeight: 26 },
  headerTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  headerSpacer: { width: 36 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 36 },
  heading: { color: colors.white, fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.gray, fontSize: 14, lineHeight: 21, marginBottom: 32 },
  form: { marginBottom: 24 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.gray,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkmark: { color: colors.white, fontSize: 13, fontWeight: '700' },
  checkLabel: { color: colors.gray, fontSize: 13, lineHeight: 20, flex: 1 },
  link: { color: colors.primary },
});
