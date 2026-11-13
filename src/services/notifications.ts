import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ProgressSummary } from '../types/tracker';

const CHANNEL_ID = 'progress-summary';
const SUMMARY_ID = 'daily-progress-summary';

export const notificationsSupported = Platform.OS !== 'web';

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Progress summary',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelDailySummary(): Promise<void> {
  if (!notificationsSupported) return;
  await Notifications.cancelScheduledNotificationAsync(SUMMARY_ID);
}

/**
 * (Re)schedules the repeating daily summary. Local notifications carry fixed text, so this is
 * called again whenever tracked data changes to keep the summary current.
 */
export async function scheduleDailySummary(
  hour: number,
  minute: number,
  summary: ProgressSummary,
): Promise<void> {
  if (!notificationsSupported) return;
  await Notifications.scheduleNotificationAsync({
    identifier: SUMMARY_ID,
    content: { title: summary.title, body: summary.body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
}

export async function sendSummaryNow(summary: ProgressSummary): Promise<void> {
  if (!notificationsSupported) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: summary.title, body: [...summary.today, ...summary.week].join('\n') },
    trigger: null,
  });
}
