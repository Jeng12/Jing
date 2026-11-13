import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenProps } from '../../types/navigation';
import { useTracker } from '../../store/TrackerContext';
import { dateKey, dayRange, learningMinutesOn, topicTotals } from '../../utils/trackerStats';
import AuthInput from '../../components/AuthInput';
import AuthButton from '../../components/AuthButton';
import ProgressRing from '../../components/ProgressRing';
import colors from '../../theme/colors';

type Props = TabScreenProps<'Learn'>;

const QUICK_MINUTES = [15, 30, 45, 60];

export default function LearnScreen(_props: Props) {
  const { data, addSession, removeSession } = useTracker();
  const [topic, setTopic] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [error, setError] = useState('');

  const today = dateKey();
  const week = dayRange(7);
  const todayMinutes = learningMinutesOn(data, today);
  const weekMinutes = week.reduce((sum, d) => sum + learningMinutesOn(data, d), 0);
  const weekGoal = data.goals.learningMinutes * 7;
  const todaySessions = data.sessions.filter(s => s.date === today);
  const topics = topicTotals(data, week);
  const topMinutes = topics[0]?.minutes ?? 1;
  const recentTopics = [...new Set(data.sessions.map(s => s.topic))].slice(0, 4);

  const save = () => {
    const mins = Number(minutes);
    if (!topic.trim()) return setError('Enter what you studied.');
    if (!Number.isInteger(mins) || mins <= 0 || mins > 1440) return setError('Enter minutes between 1 and 1440.');
    addSession(topic.trim(), mins);
    setTopic('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Learning</Text>
        <Text style={styles.subtitle}>Track study time like a workout</Text>

        <View style={styles.summary}>
          <ProgressRing
            size={104}
            stroke={12}
            rings={[{ progress: data.goals.learningMinutes ? todayMinutes / data.goals.learningMinutes : 0, color: colors.learning }]}
          >
            <Text style={styles.ringValue}>{todayMinutes}</Text>
            <Text style={styles.ringUnit}>min today</Text>
          </ProgressRing>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>This week</Text>
            <Text style={styles.summaryValue}>
              {weekMinutes}
              <Text style={styles.summaryUnit}> / {weekGoal} min</Text>
            </Text>
            <Text style={styles.summaryLabel}>Daily goal {data.goals.learningMinutes} min</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Add a session</Text>
        <View style={styles.card}>
          <AuthInput label="What did you learn?" placeholder="e.g. Spanish vocabulary" value={topic} onChangeText={setTopic} />
          {recentTopics.length > 0 && (
            <View style={styles.chips}>
              {recentTopics.map(t => (
                <TouchableOpacity key={t} style={styles.topicChip} onPress={() => setTopic(t)}>
                  <Text style={styles.topicChipText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <AuthInput label="Minutes" placeholder="30" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
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
        </View>

        <Text style={styles.sectionTitle}>Today</Text>
        {todaySessions.length === 0 ? (
          <Text style={styles.empty}>Nothing logged yet today.</Text>
        ) : (
          <View style={styles.sessions}>
            {todaySessions.map(s => (
              <View key={s.id} style={styles.sessionRow}>
                <Ionicons name="book" size={18} color={colors.learning} />
                <View style={styles.sessionText}>
                  <Text style={styles.sessionTopic}>{s.topic}</Text>
                  <Text style={styles.sessionMinutes}>{s.minutes} min</Text>
                </View>
                <TouchableOpacity onPress={() => removeSession(s.id)} accessibilityLabel={`Delete ${s.topic}`}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {topics.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Topics this week</Text>
            <View style={styles.card}>
              {topics.map(t => (
                <View key={t.topic} style={styles.topicRow}>
                  <View style={styles.topicHead}>
                    <Text style={styles.topicName}>{t.topic}</Text>
                    <Text style={styles.topicMinutes}>{t.minutes} min</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${(t.minutes / topMinutes) * 100}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  title: { color: colors.white, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.gray, fontSize: 13, marginTop: 2, marginBottom: 16 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
  },
  ringValue: { color: colors.white, fontSize: 24, fontWeight: '800' },
  ringUnit: { color: colors.gray, fontSize: 10 },
  summaryText: { flex: 1, gap: 4 },
  summaryLabel: { color: colors.gray, fontSize: 13 },
  summaryValue: { color: colors.learning, fontSize: 26, fontWeight: '800' },
  summaryUnit: { color: colors.gray, fontSize: 14, fontWeight: '500' },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 16, marginBottom: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: 16 },
  topicChip: { backgroundColor: colors.background, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  topicChipText: { color: colors.white, fontSize: 12 },
  chip: {
    flexGrow: 1,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: 'center',
  },
  chipActive: { borderColor: colors.learning, backgroundColor: colors.background },
  chipText: { color: colors.gray, fontSize: 13 },
  chipTextActive: { color: colors.learning, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  empty: { color: colors.gray, fontSize: 14, marginBottom: 24 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  sessions: { marginBottom: 14 },
  sessionText: { flex: 1 },
  sessionTopic: { color: colors.white, fontSize: 15, fontWeight: '600' },
  sessionMinutes: { color: colors.gray, fontSize: 13, marginTop: 2 },
  topicRow: { marginBottom: 12 },
  topicHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  topicName: { color: colors.white, fontSize: 14 },
  topicMinutes: { color: colors.gray, fontSize: 13 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.ringTrack, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.learning },
});
