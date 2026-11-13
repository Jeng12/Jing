import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabScreenProps } from '../../types/navigation';
import { useTracker } from '../../store/TrackerContext';
import { useWorkout, movingSeconds } from '../../store/WorkoutContext';
import { useLiveHeartRate } from '../../store/LiveHeartRateContext';
import { dayRange } from '../../utils/trackerStats';
import { SPORTS, SPORT_ORDER, formatDistance, formatDuration } from '../../utils/sports';
import colors from '../../theme/colors';

type Props = TabScreenProps<'Sport'>;

function workoutTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

export default function SportScreen({ navigation }: Props) {
  const { data } = useTracker();
  const workout = useWorkout();
  const live = useLiveHeartRate();
  const [, setTick] = useState(0);

  // Keep the in-progress timer on the banner moving.
  useEffect(() => {
    if (!workout.active) return;
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [workout.active]);

  const week = dayRange(7);
  const thisWeek = data.workouts.filter(w => week.includes(w.date));
  const weekSeconds = thisWeek.reduce((sum, w) => sum + w.durationSec, 0);
  const weekMeters = thisWeek.reduce((sum, w) => sum + (w.distanceM ?? 0), 0);
  const recent = data.workouts.slice(0, 15);

  const startSport = (key: keyof typeof SPORTS) => {
    if (!workout.active) workout.start(key);
    navigation.navigate('Workout');
  };

  const hrLive = live.status === 'live';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Sport</Text>
        <Text style={styles.subtitle}>Record a workout with live heart rate and GPS</Text>

        {workout.active && (
          <TouchableOpacity style={[styles.banner, styles.bannerActive]} onPress={() => navigation.navigate('Workout')}>
            <MaterialCommunityIcons name={SPORTS[workout.active.sport].icon} size={26} color={colors.background} />
            <View style={styles.flex}>
              <Text style={styles.bannerTitle}>
                {SPORTS[workout.active.sport].label} {workout.active.pausedAt ? 'paused' : 'in progress'}
              </Text>
              <Text style={styles.bannerText}>{formatDuration(movingSeconds(workout.active))}</Text>
            </View>
            <Text style={styles.bannerAction}>Open</Text>
          </TouchableOpacity>
        )}

        {!workout.active && workout.draft && (
          <TouchableOpacity style={[styles.banner, styles.bannerDraft]} onPress={() => navigation.navigate('WorkoutSummary')}>
            <Ionicons name="save-outline" size={22} color={colors.white} />
            <View style={styles.flex}>
              <Text style={styles.bannerTitleLight}>Unsaved {SPORTS[workout.draft.sport].label.toLowerCase()}</Text>
              <Text style={styles.bannerTextLight}>Save or discard it</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.white} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.hrRow} onPress={() => navigation.navigate('HeartRate')}>
          <Ionicons name="heart" size={20} color={hrLive ? colors.heart : colors.gray} />
          <View style={styles.flex}>
            <Text style={styles.hrTitle}>{hrLive ? `Watch heart rate · ${live.bpm ?? '--'} bpm` : 'Watch heart rate not connected'}</Text>
            <Text style={styles.hrText}>
              {hrLive ? live.device?.name : 'Connect your Forerunner to see heart rate and zones during workouts'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.gray} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Start a workout</Text>
        <View style={styles.grid}>
          {SPORT_ORDER.map(key => {
            const sport = SPORTS[key];
            return (
              <TouchableOpacity
                key={key}
                style={[styles.sportTile, !!workout.active && workout.active.sport !== key && styles.dimmed]}
                onPress={() => startSport(key)}
                accessibilityLabel={`Start ${sport.label}`}
              >
                <View style={[styles.sportIcon, { backgroundColor: `${sport.color}26` }]}>
                  <MaterialCommunityIcons name={sport.icon} size={28} color={sport.color} />
                </View>
                <Text style={styles.sportLabel}>{sport.label}</Text>
                {sport.gps && <Text style={styles.sportTag}>GPS</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>This week</Text>
        <View style={styles.weekRow}>
          {[
            { label: 'Workouts', value: String(thisWeek.length) },
            { label: 'Time', value: formatDuration(weekSeconds) },
            { label: 'Distance', value: `${formatDistance(weekMeters)} km` },
          ].map(s => (
            <View key={s.label} style={styles.weekStat}>
              <Text style={styles.weekValue}>{s.value}</Text>
              <Text style={styles.weekLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent workouts</Text>
        {recent.length === 0 ? (
          <Text style={styles.empty}>No workouts yet. Pick a sport above to start one.</Text>
        ) : (
          recent.map(w => {
            const sport = SPORTS[w.sport];
            return (
              <TouchableOpacity
                key={w.id}
                style={styles.workoutRow}
                onPress={() => navigation.navigate('WorkoutSummary', { workoutId: w.id })}
              >
                <View style={[styles.rowIcon, { backgroundColor: `${sport.color}26` }]}>
                  <MaterialCommunityIcons name={sport.icon} size={22} color={sport.color} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{sport.label}</Text>
                  <Text style={styles.rowText}>{workoutTime(w.startedAt)}</Text>
                </View>
                <View style={styles.rowStats}>
                  <Text style={styles.rowValue}>{formatDuration(w.durationSec)}</Text>
                  <Text style={styles.rowText}>
                    {[w.distanceM ? `${formatDistance(w.distanceM)} km` : null, w.avgHeartRate ? `${w.avgHeartRate} bpm` : null]
                      .filter(Boolean)
                      .join(' · ') || `${w.calories} kcal`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  flex: { flex: 1 },
  title: { color: colors.white, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.gray, fontSize: 13, marginTop: 2, marginBottom: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14, marginBottom: 12 },
  bannerActive: { backgroundColor: colors.primary },
  bannerDraft: { backgroundColor: colors.cardRaised, borderWidth: 1, borderColor: colors.primary },
  bannerTitle: { color: colors.background, fontSize: 15, fontWeight: '700' },
  bannerText: { color: colors.background, fontSize: 13, marginTop: 2 },
  bannerAction: { color: colors.background, fontSize: 15, fontWeight: '800' },
  bannerTitleLight: { color: colors.white, fontSize: 15, fontWeight: '700' },
  bannerTextLight: { color: colors.gray, fontSize: 13, marginTop: 2 },
  hrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 22,
  },
  hrTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  hrText: { color: colors.gray, fontSize: 12, marginTop: 2 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  sportTile: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  dimmed: { opacity: 0.4 },
  sportIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  sportLabel: { color: colors.white, fontSize: 14, fontWeight: '600' },
  sportTag: { color: colors.gray, fontSize: 10, fontWeight: '700', letterSpacing: 1, position: 'absolute', top: 8, right: 10 },
  weekRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  weekStat: { flex: 1, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  weekValue: { color: colors.white, fontSize: 18, fontWeight: '700' },
  weekLabel: { color: colors.gray, fontSize: 12, marginTop: 2 },
  empty: { color: colors.gray, fontSize: 14 },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.white, fontSize: 15, fontWeight: '600' },
  rowText: { color: colors.gray, fontSize: 12, marginTop: 2 },
  rowStats: { alignItems: 'flex-end' },
  rowValue: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
