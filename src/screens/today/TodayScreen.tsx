import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenProps } from '../../types/navigation';
import { useTracker } from '../../store/TrackerContext';
import { useSession } from '../../store/SessionContext';
import { useLiveHeartRate } from '../../store/LiveHeartRateContext';
import {
  currentStreak,
  dateKey,
  effectiveHealth,
  latestSyncedHeartRate,
  learningMinutesOn,
  timeAgo,
  todayScore,
  watchDay,
} from '../../utils/trackerStats';
import { heartRateZone } from '../../utils/heartRate';
import ProgressRing from '../../components/ProgressRing';
import IconBadge from '../../components/IconBadge';
import colors from '../../theme/colors';

type Props = TabScreenProps<'Today'>;

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const ratio = (value: number, goal: number) => (goal > 0 ? value / goal : 0);

export default function TodayScreen({ navigation }: Props) {
  const { data, healthFor, saveHealth } = useTracker();
  const { profile } = useSession();
  const live = useLiveHeartRate();
  const today = dateKey();
  const health = effectiveHealth(data, today);
  const watch = watchDay(data, today);
  const goals = data.goals;
  const steps = watch?.steps ?? 0;
  const learning = learningMinutesOn(data, today);
  const score = todayScore(data);
  const streak = currentStreak(data);
  const synced = latestSyncedHeartRate(data);
  const firstName = profile.name.split(' ')[0];

  const legend = [
    { label: 'Steps', value: steps.toLocaleString(), goal: goals.steps.toLocaleString(), color: colors.steps, icon: 'footsteps' as const },
    { label: 'Exercise', value: `${health.exerciseMinutes}`, goal: `${goals.exerciseMinutes} min`, color: colors.exercise, icon: 'flame' as const },
    { label: 'Learning', value: `${learning}`, goal: `${goals.learningMinutes} min`, color: colors.learning, icon: 'book' as const },
  ];

  const addWater = () => {
    const log = healthFor(today);
    saveHealth({ ...log, waterGlasses: log.waterGlasses + 1 });
  };

  const liveZone = live.bpm ? heartRateZone(live.bpm, goals.maxHeartRate) : null;
  const heart = live.bpm
    ? { value: `${live.bpm}`, note: `Live · ${liveZone?.label}` }
    : synced
      ? { value: `${synced.bpm}`, note: `From watch · ${timeAgo(synced.at)}` }
      : watch?.restingHeartRate
        ? { value: `${watch.restingHeartRate}`, note: 'Resting today' }
        : { value: '--', note: 'Tap to go live' };

  const sleepFromWatch = !data.health[today]?.sleepHours && !!watch?.sleepHours;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.date}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={styles.title}>
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Summary')}
            accessibilityLabel="Notification summary"
          >
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.watchPill} onPress={() => navigation.navigate('Watch')}>
          <Ionicons name="watch-outline" size={16} color={data.watchSync.enabled ? colors.primary : colors.gray} />
          <Text style={styles.watchText}>
            {data.watchSync.enabled
              ? data.watchSync.lastSyncedAt
                ? `Garmin synced ${timeAgo(data.watchSync.lastSyncedAt)}`
                : 'Garmin connected'
              : 'Connect your Garmin watch'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.gray} />
        </TouchableOpacity>

        <View style={styles.hero}>
          <ProgressRing
            size={176}
            stroke={13}
            gap={3}
            rings={[
              { progress: ratio(steps, goals.steps), color: colors.steps },
              { progress: ratio(health.exerciseMinutes, goals.exerciseMinutes), color: colors.exercise },
              { progress: ratio(learning, goals.learningMinutes), color: colors.learning },
            ]}
          >
            <Text style={styles.score}>{score}%</Text>
            <Text style={styles.scoreLabel}>of goals</Text>
          </ProgressRing>
          <View style={styles.legend}>
            {legend.map(item => (
              <View key={item.label} style={styles.legendRow}>
                <Ionicons name={item.icon} size={16} color={item.color} />
                <View>
                  <Text style={styles.legendLabel}>{item.label}</Text>
                  <Text style={styles.legendValue}>
                    <Text style={{ color: item.color }}>{item.value}</Text>
                    <Text style={styles.legendGoal}> / {item.goal}</Text>
                  </Text>
                </View>
              </View>
            ))}
            <View style={styles.streak}>
              <Text style={styles.streakText}>🔥 {streak} day streak</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('HeartRate')}>
            <View style={styles.tileHead}>
              <IconBadge name="heart" color={colors.heart} />
              <Text style={styles.tileLabel}>Heart rate</Text>
              {live.bpm !== null && <View style={styles.liveDot} />}
            </View>
            <Text style={styles.tileValue}>
              {heart.value}
              <Text style={styles.tileUnit}> bpm</Text>
            </Text>
            <Text style={styles.tileNote}>{heart.note}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('LogHealth')}>
            <View style={styles.tileHead}>
              <IconBadge name="moon" color={colors.sleep} />
              <Text style={styles.tileLabel}>Sleep</Text>
            </View>
            <Text style={styles.tileValue}>
              {health.sleepHours || '--'}
              <Text style={styles.tileUnit}> h</Text>
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: colors.sleep, width: `${Math.min(100, ratio(health.sleepHours, goals.sleepHours) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.tileNote}>{sleepFromWatch ? 'From watch' : `Goal ${goals.sleepHours} h`}</Text>
          </TouchableOpacity>

          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <IconBadge name="water" color={colors.water} />
              <Text style={styles.tileLabel}>Water</Text>
            </View>
            <View style={styles.waterRow}>
              <Text style={styles.tileValue}>
                {health.waterGlasses}
                <Text style={styles.tileUnit}> / {goals.waterGlasses}</Text>
              </Text>
              <TouchableOpacity style={styles.addBtn} onPress={addWater} accessibilityLabel="Add a glass of water">
                <Ionicons name="add" size={22} color={colors.background} />
              </TouchableOpacity>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: colors.water, width: `${Math.min(100, ratio(health.waterGlasses, goals.waterGlasses) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.tileNote}>glasses today</Text>
          </View>

          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('LogHealth')}>
            <View style={styles.tileHead}>
              <IconBadge name="happy" color={colors.mood} />
              <Text style={styles.tileLabel}>Mood</Text>
            </View>
            <Text style={styles.moodEmoji}>{health.mood ? MOODS[health.mood - 1] : '—'}</Text>
            <Text style={styles.tileNote}>{health.mood ? 'Tap to change' : 'How do you feel?'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.workoutBtn} onPress={() => navigation.navigate('Tabs', { screen: 'Sport' })}>
            <Ionicons name="fitness" size={20} color={colors.primary} />
            <Text style={styles.workoutText}>Start workout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logBtn} onPress={() => navigation.navigate('LogHealth')}>
            <Ionicons name="add-circle" size={20} color={colors.background} />
            <Text style={styles.logText}>Log health</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerText: { flex: 1 },
  date: { color: colors.gray, fontSize: 13 },
  title: { color: colors.white, fontSize: 26, fontWeight: '700', marginTop: 2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
  },
  watchText: { color: colors.white, fontSize: 13 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  score: { color: colors.white, fontSize: 24, fontWeight: '800' },
  scoreLabel: { color: colors.gray, fontSize: 11 },
  legend: { flex: 1, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendLabel: { color: colors.gray, fontSize: 12 },
  legendValue: { fontSize: 15, fontWeight: '700' },
  legendGoal: { color: colors.gray, fontSize: 12, fontWeight: '400' },
  streak: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  streakText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 20, padding: 14, minHeight: 138 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tileLabel: { color: colors.white, fontSize: 14, fontWeight: '600', flex: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.heart },
  tileValue: { color: colors.white, fontSize: 28, fontWeight: '800' },
  tileUnit: { color: colors.gray, fontSize: 13, fontWeight: '500' },
  tileNote: { color: colors.gray, fontSize: 12, marginTop: 6 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.ringTrack, overflow: 'hidden', marginTop: 8 },
  fill: { height: 6, borderRadius: 3 },
  waterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.water,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: { fontSize: 34 },
  actions: { flexDirection: 'row', gap: 12 },
  workoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 14,
  },
  workoutText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  logBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 15,
  },
  logText: { color: colors.background, fontSize: 16, fontWeight: '700' },
});
