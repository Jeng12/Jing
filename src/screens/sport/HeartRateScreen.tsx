import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppScreenProps } from '../../types/navigation';
import { useLiveHeartRate } from '../../store/LiveHeartRateContext';
import { useTracker } from '../../store/TrackerContext';
import { liveHeartRateSupported } from '../../services/liveHeartRate';
import { heartRateZone, ZONE_LIST } from '../../utils/heartRate';
import Sparkline from '../../components/Sparkline';
import AuthButton from '../../components/AuthButton';
import ScreenHeader from '../../components/ScreenHeader';
import colors from '../../theme/colors';

type Props = AppScreenProps<'HeartRate'>;

const PROBLEMS: Record<string, string> = {
  permission: 'Allow Nearby devices (Bluetooth) for Jing in your phone settings, then try again.',
  'bluetooth-off': 'Turn on Bluetooth on your phone, then try again.',
  unsupported: 'This phone does not support Bluetooth Low Energy.',
  'scan-failed': 'Searching failed. Turn Bluetooth off and on, then try again.',
  'connect-failed':
    'Could not connect. Make sure Broadcast Heart Rate is on and the watch is close, then try again.',
  lost: 'The watch stopped broadcasting. Turn Broadcast Heart Rate on again to continue.',
};

const SETUP = [
  'On your Forerunner, hold UP (or open the controls menu).',
  'Go to Settings → Health & Wellness → Wrist Heart Rate (on older models: Sensors & Accessories → Wrist Heart Rate).',
  'Select Broadcast Heart Rate. The watch shows a heart icon while broadcasting.',
  'Tap Find my watch below and pick it from the list.',
];

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return h ? `${h}:${mm}:${String(sec).padStart(2, '0')}` : `${mm}:${String(sec).padStart(2, '0')}`;
}

function PulsingHeart({ bpm, color }: { bpm: number | null; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!bpm) return;
    const beat = 60000 / bpm;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: beat * 0.25, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: beat * 0.75, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bpm, scale]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name="heart" size={56} color={color} />
    </Animated.View>
  );
}

export default function HeartRateScreen({ navigation }: Props) {
  const live = useLiveHeartRate();
  const { data } = useTracker();
  const [chartWidth, setChartWidth] = useState(0);
  const [, setTick] = useState(0);

  // Re-render each second so the session timer moves even between samples.
  useEffect(() => {
    if (live.status !== 'live') return;
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [live.status]);

  const zone = live.bpm ? heartRateZone(live.bpm, data.goals.maxHeartRate) : null;
  const session = live.session;
  const avg = session && session.count ? Math.round(session.sum / session.count) : null;
  const elapsed = session ? (Date.now() - session.startedAt) / 1000 : 0;
  const zoneTotal = session ? session.zoneSeconds.reduce((a, b) => a + b, 0) : 0;
  const connected = live.status === 'live' || live.status === 'reconnecting' || live.status === 'connecting';

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Heart Rate Monitor" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Real-time heart rate from your Garmin. Workouts in Sport use it automatically.</Text>

        {!liveHeartRateSupported ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              Live heart rate uses Bluetooth and works in the Android app. Install the app on your phone to use it.
            </Text>
          </View>
        ) : connected ? (
          <>
            <View style={[styles.card, styles.liveCard]}>
              <View style={styles.liveHead}>
                <View style={styles.liveBadge}>
                  <View style={[styles.dot, live.status !== 'live' && styles.dotWaiting]} />
                  <Text style={styles.liveBadgeText}>
                    {live.status === 'live' ? 'LIVE' : live.status === 'connecting' ? 'CONNECTING' : 'RECONNECTING'}
                  </Text>
                </View>
                <Text style={styles.deviceName}>{live.device?.name}</Text>
              </View>

              <View style={styles.bpmRow}>
                <PulsingHeart bpm={live.bpm} color={zone?.color ?? colors.heart} />
                <View>
                  <Text style={styles.bpm}>{live.bpm ?? '--'}</Text>
                  <Text style={styles.bpmUnit}>beats per minute</Text>
                </View>
              </View>

              {zone && (
                <View style={[styles.zonePill, { backgroundColor: `${zone.color}33` }]}>
                  <Text style={[styles.zoneText, { color: zone.color }]}>
                    {zone.zone ? `Zone ${zone.zone} · ${zone.label}` : zone.label}
                  </Text>
                </View>
              )}

              <View style={styles.chart} onLayout={e => setChartWidth(e.nativeEvent.layout.width)}>
                {chartWidth > 0 && (
                  <Sparkline values={live.samples} width={chartWidth} height={90} color={zone?.color ?? colors.heart} />
                )}
              </View>
              <Text style={styles.chartLabel}>Last 2 minutes</Text>
            </View>

            <View style={styles.statsRow}>
              {[
                { label: 'Time', value: formatDuration(elapsed) },
                { label: 'Min', value: session && session.count ? String(session.min) : '--' },
                { label: 'Avg', value: avg ? String(avg) : '--' },
                { label: 'Max', value: session && session.count ? String(session.max) : '--' },
              ].map(s => (
                <View key={s.label} style={styles.stat}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Time in zones</Text>
            <View style={styles.card}>
              {ZONE_LIST.slice()
                .reverse()
                .map(z => {
                  const seconds = session?.zoneSeconds[z.zone] ?? 0;
                  const pct = zoneTotal ? seconds / zoneTotal : 0;
                  return (
                    <View key={z.zone} style={styles.zoneRow}>
                      <Text style={styles.zoneLabel}>Z{z.zone}</Text>
                      <View style={styles.zoneTrack}>
                        <View style={[styles.zoneFill, { width: `${pct * 100}%`, backgroundColor: z.color }]} />
                      </View>
                      <Text style={styles.zoneTime}>{formatDuration(seconds)}</Text>
                    </View>
                  );
                })}
              <Text style={styles.footnote}>Zones use a max heart rate of {data.goals.maxHeartRate} bpm (change it in Goals).</Text>
            </View>

            <TouchableOpacity style={styles.stopBtn} onPress={live.disconnect}>
              <Ionicons name="stop-circle-outline" size={20} color={colors.danger} />
              <Text style={styles.stopText}>Stop live heart rate</Text>
            </TouchableOpacity>
            <Text style={styles.footnote}>Turn Broadcast Heart Rate off on the watch when you finish; it uses extra battery.</Text>
          </>
        ) : (
          <>
            <View style={[styles.card, styles.idleCard]}>
              <Ionicons name="pulse" size={44} color={colors.heart} />
              <Text style={styles.idleTitle}>See your heart rate live</Text>
              <Text style={styles.body}>
                Your Forerunner can broadcast heart rate over Bluetooth. Jing shows it second by second, with zones.
              </Text>
            </View>

            {!!live.problem && (
              <View style={styles.problem}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.problemText}>{PROBLEMS[live.problem]}</Text>
              </View>
            )}

            {live.lastDevice && live.status === 'idle' && (
              <AuthButton
                title={`Reconnect to ${live.lastDevice.name}`}
                onPress={() => live.lastDevice && live.connect(live.lastDevice)}
                style={styles.primaryBtn}
              />
            )}

            {live.status === 'scanning' ? (
              <View style={styles.scanning}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.scanningText}>Looking for your watch…</Text>
                <TouchableOpacity onPress={live.stopScan}>
                  <Text style={styles.link}>Stop</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.findBtn} onPress={live.startScan}>
                <Ionicons name="bluetooth" size={18} color={colors.primary} />
                <Text style={styles.findText}>Find my watch</Text>
              </TouchableOpacity>
            )}

            {live.devices.length > 0 && (
              <View style={styles.card}>
                {live.devices.map(d => (
                  <TouchableOpacity key={d.id} style={styles.deviceRow} onPress={() => live.connect(d)}>
                    <Ionicons name="watch" size={22} color={colors.white} />
                    <View style={styles.deviceText}>
                      <Text style={styles.deviceRowName}>{d.name}</Text>
                      <Text style={styles.deviceRowNote}>
                        {d.advertisesHr ? 'Broadcasting heart rate' : 'Not broadcasting yet'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.gray} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Turn on Broadcast Heart Rate</Text>
            {SETUP.map((step, i) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
            <Text style={styles.footnote}>
              Steps, sleep and activities still come through Garmin Connect, which the app checks every minute while it
              is open.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  subtitle: { color: colors.gray, fontSize: 13, lineHeight: 19, marginBottom: 18 },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 18, marginBottom: 14 },
  body: { color: colors.gray, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  liveCard: { alignItems: 'center' },
  liveHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.heart },
  dotWaiting: { backgroundColor: colors.gray },
  liveBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  deviceName: { color: colors.gray, fontSize: 13 },
  bpmRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 },
  bpm: { color: colors.white, fontSize: 72, fontWeight: '800', lineHeight: 80 },
  bpmUnit: { color: colors.gray, fontSize: 13 },
  zonePill: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, marginTop: 12 },
  zoneText: { fontSize: 13, fontWeight: '700' },
  chart: { alignSelf: 'stretch', height: 90, marginTop: 18 },
  chartLabel: { color: colors.gray, fontSize: 11, marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  statValue: { color: colors.white, fontSize: 18, fontWeight: '700' },
  statLabel: { color: colors.gray, fontSize: 12, marginTop: 2 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  zoneLabel: { color: colors.white, fontSize: 13, fontWeight: '700', width: 24 },
  zoneTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.ringTrack, overflow: 'hidden' },
  zoneFill: { height: 10, borderRadius: 5 },
  zoneTime: { color: colors.gray, fontSize: 12, width: 48, textAlign: 'right' },
  footnote: { color: colors.gray, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  stopText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  idleCard: { alignItems: 'center', gap: 10, paddingVertical: 26 },
  idleTitle: { color: colors.white, fontSize: 19, fontWeight: '700' },
  problem: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  problemText: { color: colors.white, fontSize: 13, lineHeight: 19, flex: 1 },
  primaryBtn: { marginBottom: 12 },
  findBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 14,
    marginBottom: 16,
  },
  findText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  scanning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, marginBottom: 16 },
  scanningText: { color: colors.white, fontSize: 14 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  deviceText: { flex: 1 },
  deviceRowName: { color: colors.white, fontSize: 15, fontWeight: '600' },
  deviceRowNote: { color: colors.gray, fontSize: 12, marginTop: 2 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  stepText: { color: colors.gray, fontSize: 14, lineHeight: 21, flex: 1 },
});
