import {
  aggregateRecord,
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

// ---------- reading ----------

export async function readWatchDays(dayKeys: string[]): Promise<WatchDay[]> {
  if (!dayKeys.length || !(await initialize())) return [];
  const rangeStart = dayStart(dayKeys[0]);
  const rangeEnd = dayEnd(dayKeys[dayKeys.length - 1]);
  // Sleep is filed under the day it ended, so look back one more night.
  const sleepStart = new Date(rangeStart);
  sleepStart.setDate(sleepStart.getDate() - 1);

  const [steps, exercise, sleep, resting, heart] = await Promise.all([
    attempt(() => readAll('Steps', rangeStart, rangeEnd)),
    attempt(() => readAll('ExerciseSession', rangeStart, rangeEnd)),
    attempt(() => readAll('SleepSession', sleepStart, rangeEnd)),
    attempt(() => readAll('RestingHeartRate', rangeStart, rangeEnd)),
    attempt(() => readAll('HeartRate', dayStart(dayKeys[dayKeys.length - 1]), rangeEnd)),
  ]);

  const stepsByDay: Record<string, number> = {};
  const stepPick = preferGarmin(steps ?? []);
  stepPick.records.forEach(r => addTo(stepsByDay, localKey(r.startTime), r.count));

  const exerciseByDay: Record<string, number> = {};
  const exercisePick = preferGarmin(exercise ?? []);
  exercisePick.records.forEach(r => addTo(exerciseByDay, localKey(r.startTime), ms(r.startTime, r.endTime) / 60_000));

  const sleepByDay: Record<string, number> = {};
  preferGarmin(sleep ?? []).records.forEach(s => {
    const awake = (s.stages ?? [])
      .filter(stage => AWAKE_STAGES.includes(stage.stage))
      .reduce((sum, stage) => sum + ms(stage.startTime, stage.endTime), 0);
    addTo(sleepByDay, localKey(s.endTime), Math.max(0, ms(s.startTime, s.endTime) - awake) / 3_600_000);
  });

  const restingSum: Record<string, number> = {};
  const restingCount: Record<string, number> = {};
  preferGarmin(resting ?? []).records.forEach(r => {
    addTo(restingSum, localKey(r.time), r.beatsPerMinute);
    addTo(restingCount, localKey(r.time), 1);
  });

  let latest: { bpm: number; time: string } | undefined;
  preferGarmin(heart ?? []).records.forEach(r =>
    r.samples.forEach(sample => {
      if (!latest || sample.time > latest.time) latest = { bpm: sample.beatsPerMinute, time: sample.time };
    }),
  );

  return Promise.all(
    dayKeys.map(async date => {
      const day: WatchDay = { date };
      let daySteps: number | undefined = stepsByDay[date];
      let dayExercise: number | undefined = exerciseByDay[date];
      // With no Garmin records, mixed sources would double count: let Health Connect's
      // own priority list de-duplicate them instead.
      if (!stepPick.garmin && steps?.length) {
        const agg = await attempt(() => aggregateRecord({ recordType: 'Steps', timeRangeFilter: between(dayStart(date), dayEnd(date)) }));
        daySteps = agg?.COUNT_TOTAL;
      }
      if (!exercisePick.garmin && exercise?.length) {
        const agg = await attempt(() =>
          aggregateRecord({ recordType: 'ExerciseSession', timeRangeFilter: between(dayStart(date), dayEnd(date)) }),
        );
        dayExercise = agg ? agg.EXERCISE_DURATION_TOTAL.inSeconds / 60 : undefined;
      }
      if (daySteps) day.steps = Math.round(daySteps);
      if (dayExercise) day.exerciseMinutes = Math.round(dayExercise);
      if (sleepByDay[date]) day.sleepHours = Math.round(sleepByDay[date] * 10) / 10;
      if (restingCount[date]) day.restingHeartRate = Math.round(restingSum[date] / restingCount[date]);
      if (latest && localKey(latest.time) === date) {
        day.latestHeartRate = Math.round(latest.bpm);
        day.latestHeartRateAt = latest.time;
      }
      return day;
    }),
  );
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
        return { type: label, count: 0, sources: [], error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
  return { status, granted: grantedTypes, rows, checkedAt };
}
