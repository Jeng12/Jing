import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import AuthInput from '../../components/AuthInput';
import AuthButton from '../../components/AuthButton';
import colors from '../../theme/colors';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Login</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.greeting}>Hi, Tiffany</Text>
        <Text style={styles.subtitle}>Welcome back! Please enter{'\n'}your details.</Text>

        <View style={styles.form}>
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
          <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <AuthButton title="Login" onPress={() => {}} style={styles.btn} />
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
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  greeting: { color: colors.white, fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.gray, fontSize: 14, lineHeight: 21, marginBottom: 36 },
  form: { marginBottom: 24 },
  forgotText: { color: colors.primary, textAlign: 'right', fontSize: 13, marginTop: 8 },
  btn: { marginTop: 8 },
});
