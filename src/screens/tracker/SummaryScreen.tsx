import React, { useState } from 'react';
import { View, Text, Switch, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TrackerStackParamList } from '../../types/navigation';
import { useTracker } from '../../store/TrackerContext';
import {
  ensureNotificationPermission,
  notificationsSupported,
  sendSummaryNow,
} from '../../services/notifications';
import AuthButton from '../../components/AuthButton';
import ScreenHeader from '../../components/ScreenHeader';
import Stepper from '../../components/Stepper';
import colors from '../../theme/colors';

type Props = { navigation: NativeStackNavigationProp<TrackerStackParamList, 'Summary'> };

const pad = (n: number) => String(n).padStart(2, '0');

export default function SummaryScreen({ navigation }: Props) {
  const { data, summary, setReminder } = useTracker();
  const { reminder } = data;
  const [message, setMessage] = useState('');

  const update = async (next: typeof reminder) => {
    const ok = await setReminder(next);
    setMessage(ok ? '' : 'Notifications are blocked. Allow them for this app in your device settings.');
  };

  const sendNow = async () => {
    if (!(await ensureNotificationPermission())) {
      setMessage('Notifications are blocked. Allow them for this app in your device settings.');
      return;
    }
    await sendSummaryNow(summary);
    setMessage('Summary sent — check your notifications.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Notification Summary" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{summary.title}</Text>
          <Text style={styles.groupTitle}>Today</Text>
          {summary.today.map(line => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))}
          <Text style={styles.groupTitle}>Last 7 days</Text>
          {summary.week.map(line => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Daily reminder</Text>
        {notificationsSupported ? (
          <>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={styles.switchLabel}>Send my summary every day</Text>
                <Text style={styles.switchHint}>
                  {reminder.enabled ? `Scheduled for ${pad(reminder.hour)}:${pad(reminder.minute)}` : 'Off'}
                </Text>
              </View>
              <Switch
                value={reminder.enabled}
                onValueChange={enabled => update({ ...reminder, enabled })}
                trackColor={{ true: colors.primary, false: colors.inputBorder }}
                thumbColor={colors.white}
              />
            </View>
            <Stepper
              label="Hour"
              unit="24-hour clock"
              value={reminder.hour}
              step={1}
              max={23}
              format={pad}
              onChange={hour => update({ ...reminder, hour })}
            />
            <Stepper
              label="Minute"
              unit="15-minute steps"
              value={reminder.minute}
              step={15}
              max={45}
              format={pad}
              onChange={minute => update({ ...reminder, minute })}
            />
            <AuthButton title="Send summary now" onPress={sendNow} style={styles.sendBtn} />
          </>
        ) : (
          <Text style={styles.unsupported}>
            Scheduled notifications need the Android or iOS app. The summary above always shows your latest numbers.
          </Text>
        )}
        {!!message && <Text style={styles.message}>{message}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 18, marginBottom: 28 },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  groupTitle: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  line: { color: colors.white, fontSize: 14, lineHeight: 24 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  switchText: { flex: 1 },
  switchLabel: { color: colors.white, fontSize: 15, fontWeight: '600' },
  switchHint: { color: colors.gray, fontSize: 12, marginTop: 2 },
  sendBtn: { marginTop: 8 },
  unsupported: { color: colors.gray, fontSize: 14, lineHeight: 21 },
  message: { color: colors.gray, fontSize: 13, marginTop: 14, textAlign: 'center' },
});
