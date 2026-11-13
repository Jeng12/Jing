import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { AppScreenProps } from '../../types/navigation';
import { useWorkout } from '../../store/WorkoutContext';
import { useTracker } from '../../store/TrackerContext';
import { SPORTS, formatDistance, formatDuration, formatPace, formatSpeed } from '../../utils/sports';
import { ZONE_LIST } from '../../utils/heartRate';
import { routeToPoints } from '../../utils/geo';
import AuthButton from '../../components/AuthButton';
import ScreenHeader from '../../components/ScreenHeader';
import Sparkline from '../../components/Sparkline';
import CoachReportView from '../../components/CoachReportView';
import { getApiKey } from '../../services/apiKeyStore';
import { describeClaudeError } from '../../services/claude';
import { analyzeWorkout } from '../../services/coach';
import colors from '../../theme/colors';

type Props = AppScreenProps<'WorkoutSummary'>;

const ROUTE_HEIGHT = 200;

export default function WorkoutSummaryScreen({ navigation, route }: Props) {
  const workoutId = route.params?.workoutId;
  const { data, removeWorkout, addWorkout } = useTracker();
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const { draft, saveDraft, discardDraft } = useWorkout();
  const [width, setWidth] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const workout = workoutId ? data.workouts.find(w => w.id === workoutId) : draft;
  const isDraft = !workoutId;

  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Workout" onBack={() => navigation.goBack()} />
        <Text style={styles.empty}>This workout is no longer available.</Text>
      </SafeAreaView>
    );
  }

  const runAnalysis = async () => {
    const apiKey = await getApiKey();
    if (!apiKey) return navigation.navigate('Coach');
    setAnalyzing(true);
    setAiError('');
    try {
      const coachReport = await analyzeWorkout(apiKey, workout, data);
      addWorkout({ ...workout, coachReport });
    } catch (e) {
      setAiError(describeClaudeError(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const sport = SPORTS[workout.sport];
  const start = new Date(workout.startedAt);
  const end = new Date(workout.endedAt);
  const zoneTotal = workout.zoneSeconds?.reduce((a, b) => a + b, 0) ?? 0;
  const distance = workout.distanceM ?? 0;

  const stats = [
    { label: 'Time', value: formatDuration(workout.durationSec) },
    ...(distance
      ? [
          { label: 'Distance', value: `${formatDistance(distance)} km` },
          sport.showSpeed
            ? { label: 'Avg speed', value: `${formatSpeed(workout.durationSec, distance)} km/h` }
            : { label: 'Avg pace', value: `${formatPace(workout.durationSec, distance)} /km` },
        ]
      : []),
    { label: 'Calories', value: `${workout.calories} kcal` },
    ...(workout.avgHeartRate
      ? [
          { label: 'Avg heart rate', value: `${workout.avgHeartRate} bpm` },
          { label: 'Max heart rate', value: `${workout.maxHeartRate} bpm` },
        ]
      : []),
  ];

  const routePoints = workout.route && width ? routeToPoints(workout.route, width, ROUTE_HEIGHT) : '';
  const [first, last] = routePoints ? [routePoints.split(' ')[0], routePoints.split(' ').slice(-1)[0]] : ['', ''];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={isDraft ? 'Workout Finished' : 'Workout'} onBack={isDraft ? undefined : () => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={[styles.sportIcon, { backgroundColor: `${sport.color}26` }]}>
            <MaterialCommunityIcons name={sport.icon} size={30} color={sport.color} />
          </View>
          <View>
            <Text style={styles.sportName}>{sport.label}</Text>
            <Text style={styles.when}>
              {start.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
              {start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}–
              {end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          {stats.map(s => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        {workout.route && workout.route.length > 1 && (
          <View style={styles.card} onLayout={e => setWidth(e.nativeEvent.layout.width - 32)}>
            <Text style={styles.cardTitle}>Route</Text>
            {width > 0 && (
              <Svg width={width} height={ROUTE_HEIGHT}>
                <Polyline points={routePoints} fill="none" stroke={sport.color} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
                {!!first && <Circle cx={first.split(',')[0]} cy={first.split(',')[1]} r={6} fill={colors.success} />}
                {!!last && <Circle cx={last.split(',')[0]} cy={last.split(',')[1]} r={6} fill={colors.danger} />}
              </Svg>
            )}
            <Text style={styles.footnote}>Green is the start, red is the finish.</Text>
          </View>
        )}

        {workout.heartRateSeries && workout.heartRateSeries.length > 1 && (
          <View style={styles.card} onLayout={e => !width && setWidth(e.nativeEvent.layout.width - 32)}>
            <Text style={styles.cardTitle}>Heart rate</Text>
            {width > 0 && <Sparkline values={workout.heartRateSeries} width={width} height={100} color={colors.heart} />}
          </View>
        )}

        {workout.zoneSeconds && zoneTotal > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Time in zones</Text>
            {ZONE_LIST.slice()
              .reverse()
              .map(z => {
                const seconds = workout.zoneSeconds?.[z.zone] ?? 0;
                return (
                  <View key={z.zone} style={styles.zoneRow}>
                    <Text style={styles.zoneLabel}>Z{z.zone}</Text>
                    <View style={styles.zoneTrack}>
                      <View style={[styles.zoneFill, { width: `${(seconds / zoneTotal) * 100}%`, backgroundColor: z.color }]} />
                    </View>
                    <Text style={styles.zoneTime}>{formatDuration(seconds)}</Text>
                  </View>
                );
              })}
          </View>
        )}

        {!isDraft && (
          <View style={styles.aiSection}>
            <Text style={styles.cardTitle}>AI analysis</Text>
            {workout.coachReport ? (
              <CoachReportView report={workout.coachReport} />
            ) : analyzing ? (
              <View style={styles.aiLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.footnote}>Claude is looking at this workout…</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.aiButton} onPress={runAnalysis}>
                <Text style={styles.aiButtonText}>✨ Analyse with AI Coach</Text>
              </TouchableOpacity>
            )}
            {!!aiError && <Text style={styles.aiError}>{aiError}</Text>}
          </View>
        )}
        {isDraft && <Text style={styles.footnote}>Save the workout to get an AI analysis of it.</Text>}

        {!workout.avgHeartRate && (
          <Text style={styles.footnote}>No heart rate was recorded. Connect your watch in Sport → Watch heart rate before your next workout.</Text>
        )}
        <Text style={styles.footnote}>Calories are an estimate from the sport and your body weight (set in Goals).</Text>

        {isDraft ? (
          <>
            <AuthButton
              title="Save workout"
              onPress={() => {
                saveDraft();
                navigation.goBack();
              }}
              style={styles.save}
            />
            <TouchableOpacity
              style={styles.secondary}
              onPress={() => {
                if (!confirmDiscard) return setConfirmDiscard(true);
                discardDraft();
                navigation.goBack();
              }}
            >
              <Text style={styles.danger}>{confirmDiscard ? 'Tap again to discard' : 'Discard'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              removeWorkout(workout.id);
              navigation.goBack();
            }}
          >
            <Text style={styles.danger}>{confirmDelete ? 'Tap again to delete' : 'Delete workout'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  empty: { color: colors.gray, fontSize: 14, padding: 24 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  sportIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  sportName: { color: colors.white, fontSize: 22, fontWeight: '800' },
  when: { color: colors.gray, fontSize: 13, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 18, padding: 14 },
  statLabel: { color: colors.gray, fontSize: 12 },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '800', marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 16 },
  cardTitle: { color: colors.white, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  zoneLabel: { color: colors.white, fontSize: 13, fontWeight: '700', width: 24 },
  zoneTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.ringTrack, overflow: 'hidden' },
  zoneFill: { height: 10, borderRadius: 5 },
  zoneTime: { color: colors.gray, fontSize: 12, width: 52, textAlign: 'right' },
  footnote: { color: colors.gray, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  aiSection: { marginBottom: 8 },
  aiLoading: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  aiButton: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 30, paddingVertical: 14, alignItems: 'center' },
  aiButtonText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  aiError: { color: colors.danger, fontSize: 13, textAlign: 'center', marginTop: 8 },
  save: { marginTop: 20 },
  secondary: { alignItems: 'center', paddingVertical: 16 },
  danger: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
