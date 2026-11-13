import {
  aggregateRecord,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  SleepStageType,
} from 'react-native-health-connect';
import type { Permission } from 'react-native-health-connect';
import { WatchDay } from '../types/tracker';
import type { WatchAvailability } from './healthConnect';

// Garmin Connect writes the watch's data into Health Connect; this reads it back out.
// Health Connect only exists in a development/production build, not in Expo Go.

const GARMIN_PACKAGE = 'com.garmin.android.apps.connectmobile';

const READ_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
];

const AWAKE_STAGES: number[] = [SleepStageType.AWAKE, SleepStageType.OUT_OF_BED];

export const watchSupported: boolean = true;

export async function getWatchAvailability(): Promise<WatchAvailability> {
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-update';
    return 'unavailable';
  } catch {
    return 'unavailable'; // native module missing, e.g. running in Expo Go
  }
}

export async function requestWatchAccess(): Promise<boolean> {
  if (!(await initialize())) return false;
  const granted = await requestPermission(READ_PERMISSIONS);
  return granted.some(p => 'accessType' in p && p.accessType === 'read');
}

export function openWatchSettings(): void {
  openHealthConnectSettings();
}

function dayBounds(key: string): { start: Date; end: Date } {
  const [y, m, d] = key.split('-').map(Number);
  return { start: new Date(y, m - 1, d), end: new Date(y, m - 1, d + 1) };
}

function localKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ms = (start: string, end: string) => new Date(end).getTime() - new Date(start).getTime();

/** A record type the user did not grant (or that has no data) resolves to undefined. */
async function optional<T>(read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read();
  } catch {
    return undefined;
  }
}

/** Hours asleep per local day, keyed by the day the sleep ended (i.e. "last night"). */
async function readSleep(dayKeys: string[]): Promise<Record<string, number>> {
  // Start a day early so a night that began before the first day is still included.
  const start = dayBounds(dayKeys[0]).start;
  start.setDate(start.getDate() - 1);
  const end = dayBounds(dayKeys[dayKeys.length - 1]).end;
  const { records } = await readRecords('SleepSession', {
    timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
    pageSize: 1000,
  });
  // If Garmin wrote sleep, ignore other apps so the same night is not counted twice.
  const fromGarmin = records.filter(r => r.metadata?.dataOrigin === GARMIN_PACKAGE);
  const sessions = fromGarmin.length ? fromGarmin : records;

  const hours: Record<string, number> = {};
  for (const s of sessions) {
    const awake = (s.stages ?? [])
      .filter(stage => AWAKE_STAGES.includes(stage.stage))
      .reduce((sum, stage) => sum + ms(stage.startTime, stage.endTime), 0);
    const key = localKey(s.endTime);
    hours[key] = (hours[key] ?? 0) + Math.max(0, ms(s.startTime, s.endTime) - awake) / 3_600_000;
  }
  return hours;
}

export async function readWatchDays(dayKeys: string[]): Promise<WatchDay[]> {
  if (!dayKeys.length || !(await initialize())) return [];
  const sleep = (await optional(() => readSleep(dayKeys))) ?? {};

  return Promise.all(
    dayKeys.map(async date => {
      const { start, end } = dayBounds(date);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      };
      const [steps, exercise, heart] = await Promise.all([
        optional(() => aggregateRecord({ recordType: 'Steps', timeRangeFilter })),
        optional(() => aggregateRecord({ recordType: 'ExerciseSession', timeRangeFilter })),
        optional(() => aggregateRecord({ recordType: 'RestingHeartRate', timeRangeFilter })),
      ]);
      const day: WatchDay = { date };
      if (steps?.COUNT_TOTAL) day.steps = Math.round(steps.COUNT_TOTAL);
      if (exercise?.EXERCISE_DURATION_TOTAL?.inSeconds) {
        day.exerciseMinutes = Math.round(exercise.EXERCISE_DURATION_TOTAL.inSeconds / 60);
      }
      if (heart?.BPM_AVG) day.restingHeartRate = Math.round(heart.BPM_AVG);
      if (sleep[date]) day.sleepHours = Math.round(sleep[date] * 10) / 10;
      return day;
    }),
  );
}
