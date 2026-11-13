import React, { useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppScreenProps } from '../../types/navigation';
import { useSession } from '../../store/SessionContext';
import AuthInput from '../../components/AuthInput';
import AuthButton from '../../components/AuthButton';
import ScreenHeader from '../../components/ScreenHeader';
import colors from '../../theme/colors';

type Props = AppScreenProps<'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { profile, updateProfile } = useSession();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim()) return setError('Enter your name.');
    updateProfile({ name: name.trim(), email: email.trim() });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Edit Profile" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AuthInput label="Name" value={name} onChangeText={t => { setName(t); setError(''); }} />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <AuthInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <AuthButton title="Save" onPress={save} style={styles.save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24 },
  error: { color: colors.danger, fontSize: 13, marginTop: -8, marginBottom: 12 },
  save: { marginTop: 8 },
});
