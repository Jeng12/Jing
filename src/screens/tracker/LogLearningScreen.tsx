import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TrackerStackParamList } from '../../types/navigation';
import { useTracker } from '../../store/TrackerContext';
import { dateKey } from '../../utils/trackerStats';
import AuthInput from '../../components/AuthInput';
import AuthButton from '../../components/AuthButton';
import ScreenHeader from '../../components/ScreenHeader';
import colors from '../../theme/colors';

type Props = { navigation: NativeStackNavigationProp<TrackerStackParamList, 'LogLearning'> };

const QUICK_MINUTES = [15, 30, 45, 60];

export default function LogLearningScreen({ navigation }: Props) {
  const { data, addSession, removeSession } = useTracker();
  const [topic, setTopic] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [error, setError] = useState('');

  const today = dateKey();
  const todaySessions = data.sessions.filter(s => s.date === today);

  const save = () => {
    const mins = Number(minutes);
    if (!topic.trim()) return setError('Enter what you studied.');
    if (!Number.isInteger(mins) || mins <= 0 || mins > 1440) return setError('Enter minutes between 1 and 1440.');
    addSession(topic.trim(), mins);
    setTopic('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Log Learning" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AuthInput label="What did you learn?" placeholder="e.g. Spanish vocabulary" value={topic} onChangeText={setTopic} />
        <AuthInput
          label="Minutes"
          placeholder="30"
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
        />
        <View style={styles.chips}>
          {QUICK_MINUTES.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, minutes === String(m) && styles.chipActive]}
              onPress={() => setMinutes(String(m))}
            >
              <Text style={[styles.chipText, minutes === String(m) && styles.chipTextActive]}>{m} min</Text>
            </TouchableOpacity>
          ))}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <AuthButton title="Add session" onPress={save} />

        <Text style={styles.sectionTitle}>Today's sessions</Text>
        {todaySessions.length === 0 ? (
          <Text style={styles.empty}>Nothing logged yet today.</Text>
        ) : (
          todaySessions.map(s => (
            <View key={s.id} style={styles.sessionRow}>
              <View style={styles.sessionText}>
                <Text style={styles.sessionTopic}>{s.topic}</Text>
                <Text style={styles.sessionMinutes}>{s.minutes} min</Text>
              </View>
              <TouchableOpacity onPress={() => removeSession(s.id)} accessibilityLabel={`Delete ${s.topic}`}>
                <Text style={styles.delete}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.card },
  chipText: { color: colors.gray, fontSize: 13 },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: '600', marginTop: 32, marginBottom: 12 },
  empty: { color: colors.gray, fontSize: 14 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  sessionText: { flex: 1 },
  sessionTopic: { color: colors.white, fontSize: 15, fontWeight: '600' },
  sessionMinutes: { color: colors.gray, fontSize: 13, marginTop: 2 },
  delete: { color: colors.danger, fontSize: 13, fontWeight: '600', padding: 6 },
});
