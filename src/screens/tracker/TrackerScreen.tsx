import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TrackerStackParamList } from '../../types/navigation';
import { useTracker } from '../../store/TrackerContext';
import {
  currentStreak,
  GoalProgress,
  watchDay,
  dayRange,
  learningMinutesOn,
  pctChange,
  periodTotals,
  todayProgress,
  todayScore,
} from '../../utils/trackerStats';
import colors from '../../theme/colors';

type Props = { navigation: NativeStackNavigationProp<TrackerStackParamList, 'TrackerMain'> };

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CHART_HEIGHT = 96;

function weekdayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

interface TrendCardProps {
  icon: string;
  label: string;
  value: string;
  change: number | null;
  /** For measures where a rise is not simply "better" (e.g. heart rate): no green/red. */
  neutral?: boolean;
}

function TrendCard({ icon, label, value, change, neutral }: TrendCardProps) {
  const trendStyle = neutral || change === null || change === 0 ? styles.trendFlat : change > 0 ? styles.trendUp : styles.trendDown;
  const trendText =
    change === null ? 'No data last week' : change === 0 ? 'Same as last week' : `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}% vs last week`;
  return (
    <View style={styles.trendCard}>
      <Text style={styles.trendLabel}>
        {icon} {label}
      </Text>
      <Text style={styles.trendValue}>{value}</Text>
      <Text style={[styles.trendChange, trendStyle]}>{trendText}</Text>
    </View>
  );
}

export default function TrackerScreen({ navigation }: Props) {
  const { data } = useTracker();
  const rows = todayProgress(data);
  const score = todayScore(data);
  const streak = currentStreak(data);
  const days = dayRange(7);
  const thisWeek = periodTotals(data, days);
  const lastWeek = periodTotals(data, dayRange(7, 7));
  const dailyLearning = days.map(d => learningMinutesOn(data, d));
  const chartMax = Math.max(data.goals.learningMinutes, ...dailyLearning);
  const round1 = (n: number) => String(Math.round(n * 10) / 10);
  const today = days[days.length - 1];
  const manualToday = data.health[today];
  const watchToday = watchDay(data, today);
  const isFromWatch = (key: GoalProgress['key']) =>
    key === 'steps' ||
    (key === 'sleep' && !manualToday?.sleepHours && !!watchToday?.sleepHours) ||
    (key === 'exercise' && !manualToday?.exerciseMinutes && !!watchToday?.exerciseMinutes);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>My Progress</Text>
            <Text style={styles.subtitle}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bellBtn, styles.watchBtn]}
            onPress={() => navigation.navigate('Watch')}
            accessibilityLabel="Garmin watch"
          >
            <Text style={styles.bellIcon}>⌚</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Summary')}
            accessibilityLabel="Notification summary"
          >
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.cardLabel}>Today's goals</Text>
              <Text style={styles.score}>{score}%</Text>
            </View>
            <View style={styles.streakPill}>
              <Text style={styles.streakText}>
                🔥 {streak} day{streak === 1 ? '' : 's'} streak
              </Text>
            </View>
          </View>
          {rows.map(r => (
            <View key={r.key} style={styles.goalRow}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalLabel}>
                  {r.icon} {r.label}
                </Text>
                <Text style={styles.goalValue}>
                  {round1(r.value)} / {r.goal} {r.unit}
                  {isFromWatch(r.key) ? ' ⌚' : ''}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(r.ratio * 100)}%` }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('LogLearning')}>
            <Text style={styles.actionText}>📚 Log learning</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('LogHealth')}>
            <Text style={styles.actionText}>❤️ Log health</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Improvement · last 7 days</Text>
        <View style={styles.trendGrid}>
          <TrendCard
            icon="📚"
            label="Learning"
            value={`${thisWeek.learningMinutes} min`}
            change={pctChange(thisWeek.learningMinutes, lastWeek.learningMinutes)}
          />
          <TrendCard
            icon="🏃"
            label="Exercise"
            value={`${thisWeek.exerciseMinutes} min`}
            change={pctChange(thisWeek.exerciseMinutes, lastWeek.exerciseMinutes)}
          />
          <TrendCard
            icon="😴"
            label="Sleep avg"
            value={`${round1(thisWeek.sleepAvg)} h`}
            change={pctChange(thisWeek.sleepAvg, lastWeek.sleepAvg)}
          />
          <TrendCard
            icon="💧"
            label="Water avg"
            value={`${round1(thisWeek.waterAvg)} glasses`}
            change={pctChange(thisWeek.waterAvg, lastWeek.waterAvg)}
          />
          {data.watchSync.enabled && (
            <>
              <TrendCard
                icon="👟"
                label="Steps avg"
                value={`${Math.round(thisWeek.stepsAvg)}`}
                change={pctChange(thisWeek.stepsAvg, lastWeek.stepsAvg)}
              />
              <TrendCard
                icon="❤️"
                label="Resting HR avg"
                value={thisWeek.restingHeartRateAvg ? `${Math.round(thisWeek.restingHeartRateAvg)} bpm` : '—'}
                change={pctChange(thisWeek.restingHeartRateAvg, lastWeek.restingHeartRateAvg)}
                neutral
              />
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Learning minutes per day</Text>
        <View style={styles.card}>
          <View style={styles.chart}>
            {days.map((d, i) => (
              <View key={d} style={styles.barCol}>
                <Text style={styles.barValue}>{dailyLearning[i] || ''}</Text>
                <View
                  style={[
                    styles.bar,
                    i === days.length - 1 && styles.barToday,
                    { height: Math.max(3, (dailyLearning[i] / chartMax) * CHART_HEIGHT) },
                  ]}
                />
                <Text style={styles.barLabel}>{weekdayLabel(d)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerText: { flex: 1 },
  title: { color: colors.white, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.gray, fontSize: 13, marginTop: 4 },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchBtn: { marginRight: 10 },
  bellIcon: { fontSize: 20 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardLabel: { color: colors.gray, fontSize: 13 },
  score: { color: colors.primary, fontSize: 40, fontWeight: '700' },
  streakPill: { backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  streakText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  goalRow: { marginTop: 12 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalLabel: { color: colors.white, fontSize: 14 },
  goalValue: { color: colors.gray, fontSize: 13 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.background, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  trendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  trendCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14 },
  trendLabel: { color: colors.gray, fontSize: 13 },
  trendValue: { color: colors.white, fontSize: 20, fontWeight: '700', marginVertical: 6 },
  trendChange: { fontSize: 12, fontWeight: '600' },
  trendUp: { color: colors.success },
  trendDown: { color: colors.danger },
  trendFlat: { color: colors.gray },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 40 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { color: colors.gray, fontSize: 11, marginBottom: 4 },
  bar: { width: 18, borderRadius: 6, backgroundColor: colors.inputBorder },
  barToday: { backgroundColor: colors.primary },
  barLabel: { color: colors.gray, fontSize: 12, marginTop: 6 },
});
