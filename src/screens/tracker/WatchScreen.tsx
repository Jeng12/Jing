import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppScreenProps } from '../../types/navigation';
import { WatchConnectResult, WatchDiagnostics } from '../../types/tracker';
import { useTracker } from '../../store/TrackerContext';
import { diagnoseWatch, openWatchSettings, watchSupported } from '../../services/healthConnect';
import { dateKey, timeAgo } from '../../utils/trackerStats';
import AuthButton from '../../components/AuthButton';
import ScreenHeader from '../../components/ScreenHeader';
import colors from '../../theme/colors';

type Props = AppScreenProps<'Watch'>;

const CONNECT_MESSAGES: Record<WatchConnectResult, string> = {
  connected: 'Connected. Your watch data is now on the dashboard.',
  denied: 'Access was not granted. Tap Connect and allow Jing to read your data in Health Connect.',
  'needs-update': 'Health Connect needs to be installed or updated from the Play Store first.',
  unavailable:
    'Health Connect is not available here. It needs Android 8 or newer and an installed build of the app — it does not work in Expo Go.',
};

const SETUP_STEPS = [
  'Open the Garmin Connect app and sync your watch.',
  'In Garmin Connect, open the menu, find Health Connect, and allow it to share steps, sleep, heart rate and activities.',
  'Tap Connect below and allow Jing to read the same data.',
];

const isGarminSource = (source: string) => /garmin/i.test(source);

/** Plain-text summary the user can send when asking for help. */
function buildReport(d: WatchDiagnostics | null, errors: string[], lastSyncedAt: string | null): string {
  const lines = [
    'Jing watch report',
    `Android ${Platform.Version} · ${new Date().toISOString()}`,
    `Last sync: ${lastSyncedAt ?? 'never'}`,
    `Sync problems: ${errors.length ? errors.join('; ') : 'none'}`,
  ];
  if (d) {
    lines.push(`Health Connect: ${d.status}`, `Allowed: ${d.granted.join(', ') || 'nothing'}`);
    d.rows.forEach(r =>
      lines.push(`- ${r.type}: ${r.error ?? `${r.count} records`}${r.sources.length ? ` from ${r.sources.join(', ')}` : ''}`),
    );
  }
  return lines.join('\n');
}

/** Plain-language reason for missing data, worked out from what Health Connect holds. */
function explain(d: WatchDiagnostics): { ok: boolean; text: string } {
  if (d.status !== 'available') return { ok: false, text: 'Health Connect is not available on this phone.' };
  if (!d.granted.length) {
    return { ok: false, text: 'Jing is not allowed to read anything yet. Tap Open Health Connect → App permissions → Jing, and allow all.' };
  }
  const blocked = d.rows.filter(r => r.error && /not allowed/i.test(r.error)).map(r => r.type);
  if (blocked.length) {
    return {
      ok: false,
      text: `Jing cannot read ${blocked.join(', ')}. Tap Open Health Connect → App permissions → Jing, and turn on all data types.`,
    };
  }
  const failed = d.rows.filter(r => r.error);
  if (failed.length) {
    return { ok: false, text: `Health Connect returned an error for ${failed.map(r => r.type).join(', ')}. Wait a minute and tap Check again.` };
  }
  const anyData = d.rows.some(r => r.count > 0);
  const garmin = d.rows.some(r => r.sources.some(isGarminSource));
  if (garmin) return { ok: true, text: 'Garmin data is reaching Health Connect and Jing can read it.' };
  if (anyData) {
    return {
      ok: false,
      text: 'Health Connect has data, but none from Garmin Connect. In Garmin Connect, turn on Health Connect sharing, then sync your watch.',
    };
  }
  return {
    ok: false,
    text: 'Health Connect has no data from the last 7 days. In Garmin Connect, turn on Health Connect sharing and sync your watch, then check again.',
  };
}

export default function WatchScreen({ navigation }: Props) {
  const { data, connectWatch, disconnectWatch, syncWatch, watchErrors } = useTracker();
  const { enabled, lastSyncedAt } = data.watchSync;
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [diagnostics, setDiagnostics] = useState<WatchDiagnostics | null>(null);
  const [checking, setChecking] = useState(false);

  const today = data.watch[dateKey()];

  const check = useCallback(async () => {
    setChecking(true);
    try {
      setDiagnostics(await diagnoseWatch());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && watchSupported) check();
  }, [enabled, check]);

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
    run(async () => {
      const result = await syncWatch();
      await check();
      if (!result.errors.length) return 'Synced.';
      return result.ok
        ? 'Synced, but some data could not be read. Details are at the top.'
        : 'Could not read Health Connect. Details are at the top.';
    });

  const stat = (icon: React.ComponentProps<typeof Ionicons>['name'], color: string, label: string, value?: string) => (
    <View style={styles.statRow}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
    </View>
  );

  const verdict = diagnostics ? explain(diagnostics) : null;

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
              <View style={styles.statusRow}>
                <Ionicons name="watch" size={26} color={enabled ? colors.primary : colors.gray} />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{enabled ? 'Connected' : 'Not connected'}</Text>
                  <Text style={styles.cardHint}>
                    {enabled
                      ? lastSyncedAt
                        ? `Checked ${timeAgo(lastSyncedAt)} · refreshes every minute while open`
                        : 'Not synced yet'
                      : 'Steps, sleep, activities and heart rate from Garmin Connect.'}
                  </Text>
                </View>
              </View>
              {enabled && (
                <>
                  <Text style={styles.groupTitle}>Today from your watch</Text>
                  {stat('footsteps', colors.steps, 'Steps', today?.steps?.toLocaleString())}
                  {stat('moon', colors.sleep, 'Sleep', today?.sleepHours ? `${today.sleepHours} h` : undefined)}
                  {stat('flame', colors.exercise, 'Activities', today?.exerciseMinutes ? `${today.exerciseMinutes} min` : undefined)}
                  {stat('heart', colors.heart, 'Resting heart rate', today?.restingHeartRate ? `${today.restingHeartRate} bpm` : undefined)}
                  {stat(
                    'pulse',
                    colors.heart,
                    'Latest heart rate',
                    today?.latestHeartRate && today.latestHeartRateAt
                      ? `${today.latestHeartRate} bpm · ${timeAgo(today.latestHeartRateAt)}`
                      : undefined,
                  )}
                </>
              )}
            </View>

            {enabled && watchErrors.length > 0 && (
              <View style={[styles.card, styles.errorCard]}>
                <View style={styles.errorHead}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={styles.cardTitle}>Could not read</Text>
                </View>
                {watchErrors.map(e => (
                  <Text key={e} style={styles.errorLine}>
                    {e}
                  </Text>
                ))}
              </View>
            )}

            {enabled && (
              <View style={styles.card}>
                <View style={styles.diagHead}>
                  <Text style={styles.cardTitle}>What Health Connect has</Text>
                  {checking ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <TouchableOpacity onPress={check}>
                      <Text style={styles.link}>Check again</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {verdict && (
                  <View style={styles.verdict}>
                    <Ionicons
                      name={verdict.ok ? 'checkmark-circle' : 'alert-circle'}
                      size={18}
                      color={verdict.ok ? colors.success : colors.danger}
                    />
                    <Text style={styles.verdictText}>{verdict.text}</Text>
                  </View>
                )}
                {diagnostics?.rows.map(row => (
                  <View key={row.type} style={styles.diagRow}>
                    <View style={styles.diagTop}>
                      <Text style={styles.diagType}>{row.type}</Text>
                      <Text style={[styles.diagCount, row.error ? styles.bad : row.count ? styles.good : null]}>
                        {row.error ?? `${row.count} records`}
                      </Text>
                    </View>
                    {row.sources.length > 0 && (
                      <Text style={styles.diagSources}>
                        From: {row.sources.map(s => (isGarminSource(s) ? 'Garmin Connect' : s)).join(', ')}
                      </Text>
                    )}
                  </View>
                ))}
                <Text style={styles.footnote}>Last 7 days. Garmin only shares new data after the watch syncs with Garmin Connect.</Text>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => Share.share({ message: buildReport(diagnostics, watchErrors, lastSyncedAt) })}
                >
                  <Ionicons name="share-outline" size={16} color={colors.primary} />
                  <Text style={styles.link}>Share report</Text>
                </TouchableOpacity>
              </View>
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
              <Text style={styles.link}>Open Health Connect</Text>
            </TouchableOpacity>
            {enabled && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={disconnectWatch}>
                <Text style={styles.disconnectText}>Disconnect and remove watch data</Text>
              </TouchableOpacity>
            )}
            {!!message && <Text style={styles.message}>{message}</Text>}

            <Text style={styles.footnote}>
              For second-by-second heart rate, use the Live tab. Values you enter in Log health always override the watch.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  flex: { flex: 1 },
  body: { color: colors.gray, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 18, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cardHint: { color: colors.gray, fontSize: 12, marginTop: 3, lineHeight: 17 },
  groupTitle: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 18, marginBottom: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  statLabel: { color: colors.white, fontSize: 14, flex: 1 },
  statValue: { color: colors.white, fontSize: 14, fontWeight: '600' },
  errorCard: { borderWidth: 1, borderColor: colors.danger },
  errorHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  errorLine: { color: colors.white, fontSize: 13, lineHeight: 19, marginTop: 4 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  diagHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  verdict: { flexDirection: 'row', gap: 8, backgroundColor: colors.background, borderRadius: 12, padding: 12, marginBottom: 10 },
  verdictText: { color: colors.white, fontSize: 13, lineHeight: 19, flex: 1 },
  diagRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.inputBorder },
  diagTop: { flexDirection: 'row', justifyContent: 'space-between' },
  diagType: { color: colors.white, fontSize: 14 },
  diagCount: { color: colors.gray, fontSize: 13 },
  good: { color: colors.success },
  bad: { color: colors.danger },
  diagSources: { color: colors.gray, fontSize: 12, marginTop: 3 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: '600', marginBottom: 10 },
  step: { color: colors.gray, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  primaryBtn: { marginTop: 8 },
  secondaryBtn: { alignItems: 'center', paddingVertical: 14 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  disconnectText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  message: { color: colors.white, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 4 },
  footnote: { color: colors.gray, fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
});
