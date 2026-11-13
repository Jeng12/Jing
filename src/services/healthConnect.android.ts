import {
  aggregateGroupByDuration,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  SleepStageType,
} from 'react-native-health-connect';
import type { Permission, RecordResult, RecordType } from 'react-native-health-connect';
import { WatchDay, WatchDiagnostics, WatchDiagnosticsRow } from '../types/tracker';
import type { WatchAvailability } from './healthConnect';

// Garmin Connect copies the watch's data into Health Connect after each watch sync; this reads it back.
// Health Connect only exists in an installed build, not in Expo Go.

const READ_TYPES = ['Steps', 'SleepSession', 'ExerciseSession', 'RestingHeartRate', 'HeartRate'] as const;
type ReadType = (typeof READ_TYPES)[number];

const READ_PERMISSIONS: Permission[] = READ_TYPES.map(recordType => ({ accessType: 'read', recordType }));

const AWAKE_STAGES: number[] = [SleepStageType.AWAKE, SleepStageType.OUT_OF_BED];
const MAX_PAGES = 20;

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

// ---------- helpers ----------

type WithOrigin = { metadata?: { dataOrigin?: string } };

const originOf = (r: WithOrigin) => r.metadata?.dataOrigin ?? 'unknown app';
const isGarmin = (r: WithOrigin) => /garmin/i.test(originOf(r));

function localKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayStart(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dayEnd(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d + 1);
}

const ms = (start: string, end: string) => new Date(end).getTime() - new Date(start).getTime();

function between(start: Date, end: Date) {
  return { operator: 'between' as const, startTime: start.toISOString(), endTime: end.toISOString() };
}

/** Reads every page of a record type in the range (Garmin writes steps in many small records). */
async function readAll<T extends RecordType>(recordType: T, start: Date, end: Date): Promise<RecordResult<T>[]> {
  const all: RecordResult<T>[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await readRecords(recordType, {
      timeRangeFilter: between(start, end),
      pageSize: 1000,
      pageToken,
    });
    all.push(...result.records);
    if (!result.pageToken) break;
    pageToken = result.pageToken;
  }
  return all;
}

/** Garmin's records when there are any, so data from the phone or other apps is not counted twice. */
function preferGarmin<T extends WithOrigin>(records: T[]): { records: T[]; garmin: boolean } {
  const garmin = records.filter(isGarmin);
  return garmin.length ? { records: garmin, garmin: true } : { records, garmin: false };
}

async function attempt<T>(read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read();
  } catch {
    return undefined; // type not granted, or nothing stored
  }
}

function addTo(map: Record<string, number>, key: string, value: number) {
  map[key] = (map[key] ?? 0) + value;
}

function message(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e);
  if (/rate.?limit/i.test(text)) return 'Health Connect is limiting requests; it will retry shortly';
  if (/SecurityException|permission/i.test(text)) return 'Not allowed in Health Connect';
  return text.split('\n')[0].slice(0, 160);
}

/**
 * Totals per local day from Health Connect's own de-duplicated aggregate, in one call.
 * Used when Garmin has no records of that type, so mixed sources are not double counted.
 */
async function dailyAggregate(
  recordType: 'Steps' | 'ExerciseSession',
  start: Date,
  end: Date,
): Promise<Record<string, number>> {
  const groups = await aggregateGroupByDuration({
    recordType,
    timeRangeFilter: between(start, end),
    timeRangeSlicer: { duration: 'DAYS', length: 1 },
  });
  const byDay: Record<string, number> = {};
  groups.forEach(g => {
    const result = g.result as { COUNT_TOTAL?: number; EXERCISE_DURATION_TOTAL?: { inSeconds?: number } };
    const value =
      recordType === 'Steps' ? result.COUNT_TOTAL ?? 0 : (result.EXERCISE_DURATION_TOTAL?.inSeconds ?? 0) / 60;
    if (value) byDay[localKey(g.startTime)] = value;
  });
  return byDay;
}

// ---------- reading ----------

export interface WatchReadResult {
  days: WatchDay[];
  /** One line per data type that could not be read, e.g. "Sleep: Not allowed in Health Connect". */
  errors: string[];
}

export async function readWatchDays(dayKeys: string[]): Promise<WatchReadResult> {
  if (!dayKeys.length) return { days: [], errors: [] };
  if (!(await initialize())) throw new Error('Health Connect could not start on this phone');

  const rangeStart = dayStart(dayKeys[0]);
  const rangeEnd = dayEnd(dayKeys[dayKeys.length - 1]);
  // Sleep is filed under the day it ended, so look back one more night.
  const sleepStart = new Date(rangeStart);
  sleepStart.setDate(sleepStart.getDate() - 1);
  const errors: string[] = [];

  /** Runs one data type's read; a failure is recorded and leaves the other types untouched. */
  async function part<T>(label: string, read: () => Promise<T>, empty: T): Promise<T> {
    try {
      return await read();
    } catch (e) {
      errors.push(`${label}: ${message(e)}`);
      return empty;
    }
  }

  const [stepsByDay, exerciseByDay, sleepByDay, resting, latest] = await Promise.all([
    part('Steps', async () => {
      const pick = preferGarmin(await readAll('Steps', rangeStart, rangeEnd));
      if (!pick.garmin && pick.records.length) return dailyAggregate('Steps', rangeStart, rangeEnd);
      const byDay: Record<string, number> = {};
      pick.records.forEach(r => addTo(byDay, localKey(r.startTime), r.count));
      return byDay;
    }, {} as Record<string, number>),

    part('Activities', async () => {
      const pick = preferGarmin(await readAll('ExerciseSession', rangeStart, rangeEnd));
      if (!pick.garmin && pick.records.length) return dailyAggregate('ExerciseSession', rangeStart, rangeEnd);
      const byDay: Record<string, number> = {};
      pick.records.forEach(r => addTo(byDay, localKey(r.startTime), ms(r.startTime, r.endTime) / 60_000));
      return byDay;
    }, {} as Record<string, number>),

    part('Sleep', async () => {
      const byDay: Record<string, number> = {};
      preferGarmin(await readAll('SleepSession', sleepStart, rangeEnd)).records.forEach(s => {
        const awake = (s.stages ?? [])
          .filter(stage => AWAKE_STAGES.includes(stage.stage))
          .reduce((sum, stage) => sum + ms(stage.startTime, stage.endTime), 0);
        addTo(byDay, localKey(s.endTime), Math.max(0, ms(s.startTime, s.endTime) - awake) / 3_600_000);
      });
      return byDay;
    }, {} as Record<string, number>),

    part('Resting heart rate', async () => {
      const sum: Record<string, number> = {};
      const count: Record<string, number> = {};
      preferGarmin(await readAll('RestingHeartRate', rangeStart, rangeEnd)).records.forEach(r => {
        addTo(sum, localKey(r.time), r.beatsPerMinute);
        addTo(count, localKey(r.time), 1);
      });
      return { sum, count };
    }, { sum: {} as Record<string, number>, count: {} as Record<string, number> }),

    part('Heart rate', async () => {
      let newest: { bpm: number; time: string } | undefined;
      const todayStart = dayStart(dayKeys[dayKeys.length - 1]);
      preferGarmin(await readAll('HeartRate', todayStart, rangeEnd)).records.forEach(r =>
        (r.samples ?? []).forEach(sample => {
          if (!newest || sample.time > newest.time) newest = { bpm: sample.beatsPerMinute, time: sample.time };
        }),
      );
      return newest;
    }, undefined as { bpm: number; time: string } | undefined),
  ]);

  const days = dayKeys.map(date => {
    const day: WatchDay = { date };
    if (stepsByDay[date]) day.steps = Math.round(stepsByDay[date]);
    if (exerciseByDay[date]) day.exerciseMinutes = Math.round(exerciseByDay[date]);
    if (sleepByDay[date]) day.sleepHours = Math.round(sleepByDay[date] * 10) / 10;
    if (resting.count[date]) day.restingHeartRate = Math.round(resting.sum[date] / resting.count[date]);
    if (latest && localKey(latest.time) === date) {
      day.latestHeartRate = Math.round(latest.bpm);
      day.latestHeartRateAt = latest.time;
    }
    return day;
  });
  return { days, errors };
}

// ---------- diagnostics ----------

const TYPE_LABELS: Record<ReadType, string> = {
  Steps: 'Steps',
  SleepSession: 'Sleep',
  ExerciseSession: 'Activities',
  RestingHeartRate: 'Resting heart rate',
  HeartRate: 'Heart rate',
};

/** What Health Connect holds for the last 7 days, per type and per app that wrote it. */
export async function diagnoseWatch(): Promise<WatchDiagnostics> {
  const status = await getWatchAvailability();
  const checkedAt = new Date().toISOString();
  if (status !== 'available' || !(await initialize())) {
    return { status, granted: [], rows: [], checkedAt };
  }
  const granted = (await attempt(getGrantedPermissions)) ?? [];
  const grantedTypes = granted.flatMap(p =>
    'accessType' in p && p.accessType === 'read' && 'recordType' in p ? [p.recordType as string] : [],
  );
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const rows: WatchDiagnosticsRow[] = await Promise.all(
    READ_TYPES.map(async type => {
      const label = TYPE_LABELS[type];
      if (!grantedTypes.includes(type)) return { type: label, count: 0, sources: [], error: 'Not allowed' };
      try {
        const records = (await readAll(type, start, end)) as WithOrigin[];
        return { type: label, count: records.length, sources: [...new Set(records.map(originOf))] };
      } catch (e) {
        return { type: label, count: 0, sources: [], error: message(e) };
      }
    }),
  );
  return { status, granted: grantedTypes, rows, checkedAt };
}
