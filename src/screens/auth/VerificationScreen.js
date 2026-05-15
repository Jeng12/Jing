import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import AuthButton from '../../components/AuthButton';
import colors from '../../theme/colors';

export default function VerificationScreen({ navigation, route }) {
  const email = route?.params?.email ?? 'example@gmail.com';
  const [code, setCode] = useState(['', '', '', '']);
  const inputs = useRef([]);

  const handleChange = (text, index) => {
    const updated = [...code];
    updated[index] = text;
    setCode(updated);
    if (text && index < 3) inputs.current[index + 1]?.focus();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.heading}>Verifying Your Account</Text>
        <Text style={styles.subtitle}>
          We have just sent you 4 digit code via your{'\n'}email{' '}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        <View style={styles.otpRow}>
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={el => (inputs.current[i] = el)}
              style={[styles.otpBox, digit ? styles.otpBoxActive : null]}
              value={digit}
              onChangeText={text => handleChange(text.slice(-1), i)}
              keyboardType="number-pad"
              maxLength={1}
            />
          ))}
        </View>

        <AuthButton title="Continue" onPress={() => {}} style={styles.btn} />

        <Text style={styles.resendRow}>
          Didn't receive code?{' '}
          <Text style={styles.resendLink}>Resend</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: {
    margin: 20,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: { color: colors.white, fontSize: 22, lineHeight: 26 },
  content: { paddingHorizontal: 24, paddingTop: 16 },
  heading: { color: colors.white, fontSize: 24, fontWeight: '700', marginBottom: 12 },
  subtitle: { color: colors.gray, fontSize: 14, lineHeight: 22, marginBottom: 40 },
  emailHighlight: { color: colors.white, fontWeight: '600' },
  otpRow: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  otpBox: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpBoxActive: { borderColor: colors.primary },
  btn: { marginBottom: 24 },
  resendRow: { color: colors.gray, textAlign: 'center', fontSize: 14 },
  resendLink: { color: colors.primary, fontWeight: '600' },
});
