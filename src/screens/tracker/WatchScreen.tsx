import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TrackerStackParamList } from '../../types/navigation';
import { WatchConnectResult } from '../../types/tracker';
import { useTracker } from '../../store/TrackerContext';
import { openWatchSettings, watchSupported } from '../../services/healthConnect';
import { dateKey } from '../../utils/trackerStats';
import AuthButton from '../../components/AuthButton';
import ScreenHeader from '../../components/ScreenHeader';
import colors from '../../theme/colors';

type Props = { navigation: NativeStackNavigationProp<TrackerStackParamList, 'Watch'> };

const CONNECT_MESSAGES: Record<WatchConnectResult, string> = {
  connected: 'Connected. Your watch data is now on the dashboard.',
  denied: 'Access was not granted. Tap Connect and allow Jing to read your data in Health Connect.',
  'needs-update': 'Health Connect needs to be installed or updated from the Play Store first.',
  unavailable:
    'Health Connect is not available here. It needs Android 8 or newer and an installed build of the app — it does not work in Expo Go.',
};

const SETUP_STEPS = [
  'Sync your watch in the Garmin Connect app.',
  'In the Garmin Connect menu, find Health Connect and allow it to share steps, sleep, heart rate and activities.',
  'Tap Connect below and allow Jing to read steps, sleep, exercise and resting heart rate.',
];

export default function WatchScreen({ navigation }: Props) {
  const { data, connectWatch, disconnectWatch, syncWatch } = useTracker();
  const { enabled, lastSyncedAt } = data.watchSync;
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const today = data.watch[dateKey()];
  const hasAnyData = Object.values(data.watch).some(
    d => d.steps || d.sleepHours || d.exerciseMinutes || d.restingHeartRate,
  );

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage('');
    try {
      setMessage(await action());
    } finally {
      setBusy(false);
    }
  };

  const connect = () => run(async () => CONNECT_MESSAGES[await connectWatch()]);
  const sync = () =>
    run(async () => ((await syncWatch()) ? 'Synced.' : 'Could not read Health Connect. Check that access is still allowed.'));

  const stat = (icon: string, label: string, value: string | undefined) => (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>
        {icon} {label}
      </Text>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Garmin Watch" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {!watchSupported ? (
          <Text style={styles.body}>
            Watch sync is available in the Android app, where Garmin Connect shares your data through Health Connect.
          </Text>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{enabled ? '⌚ Connected' : '⌚ Not connected'}</Text>
              <Text style={styles.cardHint}>
                {enabled
                  ? lastSyncedAt
                    ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
                    : 'Not synced yet'
                  : 'Sleep, exercise, steps and resting heart rate can be filled in from your watch.'}
              </Text>
              {enabled && (
                <>
                  <Text style={styles.groupTitle}>Today from your watch</Text>
                  {stat('👟', 'Steps', today?.steps?.toLocaleString())}
                  {stat('😴', 'Sleep', today?.sleepHours ? `${today.sleepHours} h` : undefined)}
                  {stat('🏃', 'Exercise', today?.exerciseMinutes ? `${today.exerciseMinutes} min` : undefined)}
                  {stat('❤️', 'Resting heart rate', today?.restingHeartRate ? `${today.restingHeartRate} bpm` : undefined)}
                </>
              )}
            </View>

            {enabled && lastSyncedAt && !hasAnyData && (
              <Text style={styles.warning}>
                No data came back. Check that Garmin Connect is sharing to Health Connect and that Jing is allowed to
                read it.
              </Text>
            )}

            {!enabled && (
              <>
                <Text style={styles.sectionTitle}>How to set it up</Text>
                {SETUP_STEPS.map((step, i) => (
                  <Text key={step} style={styles.step}>
                    {i + 1}. {step}
                  </Text>
                ))}
              </>
            )}

            <AuthButton
              title={busy ? 'Working…' : enabled ? 'Sync now' : 'Connect'}
              onPress={busy ? () => undefined : enabled ? sync : connect}
              style={styles.primaryBtn}
            />
            <TouchableOpacity style={styles.secondaryBtn} onPress={openWatchSettings}>
              <Text style={styles.secondaryText}>Open Health Connect</Text>
            </TouchableOpacity>
            {enabled && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={disconnectWatch}>
                <Text style={styles.disconnectText}>Disconnect and remove watch data</Text>
              </TouchableOpacity>
            )}
            {!!message && <Text style={styles.message}>{message}</Text>}

            <Text style={styles.footnote}>
              Values you enter by hand in Log health always override the watch. Water, mood and learning stay manual.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24 },
  body: { color: colors.gray, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 18, marginBottom: 20 },
  cardTitle: { color: colors.white, fontSize: 17, fontWeight: '700' },
  cardHint: { color: colors.gray, fontSize: 13, marginTop: 6, lineHeight: 19 },
  groupTitle: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  statLabel: { color: colors.white, fontSize: 14 },
  statValue: { color: colors.white, fontSize: 14, fontWeight: '600' },
  warning: { color: colors.danger, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: '600', marginBottom: 10 },
  step: { color: colors.gray, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  primaryBtn: { marginTop: 12 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 14 },
  secondaryText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  disconnectText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  message: { color: colors.white, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 4 },
  footnote: { color: colors.gray, fontSize: 12, lineHeight: 18, marginTop: 20, textAlign: 'center' },
});
