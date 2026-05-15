import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../types/navigation';
import AuthInput from '../../components/AuthInput';
import AuthButton from '../../components/AuthButton';
import colors from '../../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;
};

export default function EditProfileScreen({ navigation }: Props) {
  const [name, setName] = useState('Tiffany');
  const [email, setEmail] = useState('Tiffanyjearsey@gmail.com');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+1 82120142305');
  const [nameError, setNameError] = useState(false);

  const handleSave = () => {
    if (name.trim().toLowerCase() === 'tiffany') {
      setNameError(true);
      return;
    }
    setNameError(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>T</Text>
          </View>
          <TouchableOpacity style={styles.editBadge}>
            <Text style={styles.editBadgeIcon}>✏️</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>Tiffany</Text>
        <Text style={styles.userEmail}>Tiffanyjearsey@gmail.com</Text>

        <View style={styles.form}>
          <View>
            <AuthInput
              label="Full Name"
              value={name}
              onChangeText={t => { setName(t); setNameError(false); }}
              style={nameError ? styles.inputError : undefined}
            />
            {nameError && <Text style={styles.errorText}>* Name already exist</Text>}
          </View>
          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AuthInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureToggle
            placeholder="••••••••••••••••••••••"
          />
          <AuthInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <AuthButton title="Save Changes" onPress={handleSave} />
      </ScrollView>
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
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  avatarWrapper: { alignSelf: 'center', marginBottom: 12, position: 'relative' },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.white, fontSize: 36, fontWeight: '700' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadgeIcon: { fontSize: 14 },
  userName: { color: colors.white, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  userEmail: { color: colors.gray, fontSize: 13, textAlign: 'center', marginBottom: 28 },
  form: { marginBottom: 24 },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: -10, marginBottom: 12, marginLeft: 4 },
});
