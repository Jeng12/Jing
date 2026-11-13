import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppScreenProps } from '../../types/navigation';
import { useWorkout, movingSeconds, GpsState } from '../../store/WorkoutContext';
import { useLiveHeartRate } from '../../store/LiveHeartRateContext';
import { useTracker } from '../../store/TrackerContext';
import { SPORTS, estimateCalories, formatDistance, formatDuration, formatPace, formatSpeed } from '../../utils/sports';
import { heartRateZone, ZONE_LIST } from '../../utils/heartRate';
import colors from '../../theme/colors';

type Props = AppScreenProps<'Workout'>;

const GPS_LABELS: Record<GpsState, { text: string; color: string }> = {
  off: { text: 'GPS starting', color: colors.gray },
  searching: { text: 'Finding GPS', color: colors.learning },
  good: { text: 'GPS ready', color: colors.success },
  denied: { text: 'Location not allowed', color: colors.danger },
  disabled: { text: 'Location is off', color: colors.danger },
};

function Metric({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : null]}>
        {value}
        {!!unit && <Text style={styles.metricUnit}> {unit}</Text>}
      </Text>
    </View>
  );
}

export default function WorkoutScreen({ navigation }: Props) {
  const { active, draft, pause, resume, finish } = useWorkout();
  const live = useLiveHeartRate();
  const { data } = useTracker();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Once finished, the summary replaces this screen so Back goes to the tabs.
  useEffect(() => {
    if (!active && draft) navigation.replace('WorkoutSummary');
    else if (!active) navigation.goBack();
  }, [active, draft, navigation]);

  if (!active) return <View style={styles.container} />;

  const sport = SPORTS[active.sport];
  const seconds = movingSeconds(active);
  const paused = !!active.pausedAt;
  const hrLive = live.status === 'live' && !!live.bpm;
  const zone = hrLive && live.bpm ? heartRateZone(live.bpm, data.goals.maxHeartRate) : null;
  const calories = estimateCalories(active.sport, seconds, data.goals.weightKg);
  const avgHr = active.hrCount ? Math.round(active.hrSum / active.hrCount) : null;
  const gps = GPS_LABELS[active.gps];
  const currentPace =
    active.speedMps && active.speedMps > 0.5
      ? sport.showSpeed
        ? (active.speedMps * 3.6).toFixed(1)
        : formatPace(1000 / active.speedMps, 1000)
      : '--';

  return (
    <SafeAreaView style={[styles.container, paused && styles.pausedBg]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Minimise workout">
          <Ionicons name="chevron-down" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name={sport.icon} size={20} color={sport.color} />
          <Text style={styles.headerTitle}>{sport.label}</Text>
        </View>
        <View style={styles.iconBtnSpacer} />
      </View>

      {sport.gps && (
        <View style={styles.gpsChip}>
          <View style={[styles.gpsDot, { backgroundColor: gps.color }]} />
          <Text style={styles.gpsText}>{gps.text}</Text>
        </View>
      )}

      <View style={styles.timerBlock}>
        <Text style={styles.timer}>{formatDuration(seconds)}</Text>
        <Text style={[styles.timerLabel, paused && styles.pausedLabel]}>{paused ? 'PAUSED' : 'Moving time'}</Text>
      </View>

      <View style={styles.hrCard}>
        <Ionicons name="heart" size={28} color={zone?.color ?? colors.heart} />
        <View style={styles.flex}>
          <Text style={styles.hrValue}>
            {hrLive ? live.bpm : '--'}
            <Text style={styles.metricUnit}> bpm</Text>
          </Text>
          {hrLive ? (
            <Text style={[styles.zoneText, { color: zone?.color }]}>
              {zone?.zone ? `Zone ${zone.zone} · ${zone.label}` : zone?.label}
            </Text>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('HeartRate')}>
              <Text style={styles.link}>Connect watch heart rate</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.zoneBars}>
          {ZONE_LIST.map(z => (
            <View
              key={z.zone}
              style={[
                styles.zoneBar,
                { height: 10 + z.zone * 6, backgroundColor: zone?.zone === z.zone ? z.color : colors.ringTrack },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.grid}>
        {sport.gps ? (
          <>
            <Metric label="Distance" value={formatDistance(active.distanceM)} unit="km" />
            <Metric
              label={sport.showSpeed ? 'Avg speed' : 'Avg pace'}
              value={sport.showSpeed ? formatSpeed(seconds, active.distanceM) : formatPace(seconds, active.distanceM)}
              unit={sport.showSpeed ? 'km/h' : '/km'}
            />
            <Metric label={sport.showSpeed ? 'Speed now' : 'Pace now'} value={currentPace} unit={sport.showSpeed ? 'km/h' : '/km'} />
            <Metric label="Calories" value={String(calories)} unit="kcal" color={colors.exercise} />
          </>
        ) : (
          <>
            <Metric label="Calories" value={String(calories)} unit="kcal" color={colors.exercise} />
            <Metric label="Avg heart rate" value={avgHr ? String(avgHr) : '--'} unit="bpm" />
            <Metric label="Max heart rate" value={active.hrMax ? String(active.hrMax) : '--'} unit="bpm" />
            <Metric label="Started" value={new Date(active.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} />
          </>
        )}
      </View>

      <View style={styles.controls}>
        {paused ? (
          <>
            <TouchableOpacity style={[styles.roundBtn, styles.finishBtn]} onPress={finish} accessibilityLabel="Finish workout">
              <Ionicons name="stop" size={30} color={colors.white} />
              <Text style={styles.roundLabel}>Finish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roundBtn, styles.resumeBtn]} onPress={resume} accessibilityLabel="Resume workout">
              <Ionicons name="play" size={30} color={colors.background} />
              <Text style={[styles.roundLabel, styles.roundLabelDark]}>Resume</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.roundBtn, styles.pauseBtn]} onPress={pause} accessibilityLabel="Pause workout">
            <Ionicons name="pause" size={32} color={colors.background} />
            <Text style={[styles.roundLabel, styles.roundLabelDark]}>Pause</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.footnote}>
        {paused ? 'Tap Finish to end and see your summary.' : 'The screen stays on during a workout. Keep Jing open so GPS keeps counting.'}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  pausedBg: { backgroundColor: colors.card },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSpacer: { width: 40 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  gpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: colors.cardRaised,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  timerBlock: { alignItems: 'center', marginTop: 18, marginBottom: 18 },
  timer: { color: colors.white, fontSize: 72, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timerLabel: { color: colors.gray, fontSize: 13, letterSpacing: 1 },
  pausedLabel: { color: colors.learning, fontWeight: '800' },
  hrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.cardRaised,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  hrValue: { color: colors.white, fontSize: 34, fontWeight: '800' },
  zoneText: { fontSize: 13, fontWeight: '700' },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  zoneBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  zoneBar: { width: 8, borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.cardRaised, borderRadius: 18, padding: 14 },
  metricLabel: { color: colors.gray, fontSize: 12 },
  metricValue: { color: colors.white, fontSize: 26, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
  metricUnit: { color: colors.gray, fontSize: 13, fontWeight: '500' },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 'auto', paddingTop: 20 },
  roundBtn: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  pauseBtn: { backgroundColor: colors.learning },
  resumeBtn: { backgroundColor: colors.success },
  finishBtn: { backgroundColor: colors.danger },
  roundLabel: { color: colors.white, fontSize: 12, fontWeight: '700', marginTop: 2 },
  roundLabelDark: { color: colors.background },
  footnote: { color: colors.gray, fontSize: 12, textAlign: 'center', marginTop: 14, marginBottom: 12 },
});
