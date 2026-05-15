import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import AuthInput from '../../components/AuthInput';
import AuthButton from '../../components/AuthButton';
import colors from '../../theme/colors';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'CreateNewPassword'> };

export default function CreateNewPasswordScreen({ navigation }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrow}>‹</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.heading}>Create New Password</Text>
        <Text style={styles.subtitle}>Enter your new password</Text>

        <View style={styles.form}>
          <AuthInput
            label="New Password"
            placeholder="••••••••••••••••••••••"
            value={password}
            onChangeText={setPassword}
            secureToggle
          />
          <AuthInput
            label="Confirm Password"
            placeholder="••••••••••••••••••••••"
            value={confirm}
            onChangeText={setConfirm}
            secureToggle
          />
        </View>

        <AuthButton title="Reset" onPress={() => navigation.navigate('Login')} />
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
  content: { paddingHorizontal: 24, paddingTop: 24 },
  heading: { color: colors.white, fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.gray, fontSize: 14, marginBottom: 40 },
  form: { marginBottom: 32 },
});
