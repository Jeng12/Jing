export interface LearningSession {
  id: string;
  date: string; // local YYYY-MM-DD
  topic: string;
  minutes: number;
}

export interface HealthLog {
  date: string; // local YYYY-MM-DD
  waterGlasses: number;
  sleepHours: number;
  exerciseMinutes: number;
  mood: number; // 1 (bad) – 5 (great), 0 = not set
}

/** One day of data read from the watch via Health Connect. Missing fields were not shared. */
export interface WatchDay {
  date: string; // local YYYY-MM-DD
  steps?: number;
  sleepHours?: number;
  exerciseMinutes?: number;
  restingHeartRate?: number;
  /** Most recent heart-rate sample Garmin wrote to Health Connect that day. */
  latestHeartRate?: number;
  latestHeartRateAt?: string; // ISO timestamp
}

export interface WatchSync {
  enabled: boolean;
  lastSyncedAt: string | null; // ISO timestamp
}

export type WatchConnectResult = 'connected' | 'denied' | 'needs-update' | 'unavailable';

export interface TrackerGoals {
  steps: number;
  /** Used for heart-rate zones; roughly 220 minus age. */
  maxHeartRate: number;
  learningMinutes: number;
  waterGlasses: number;
  sleepHours: number;
  exerciseMinutes: number;
}

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface TrackerData {
  sessions: LearningSession[];
  health: Record<string, HealthLog>;
  goals: TrackerGoals;
  reminder: ReminderSettings;
  watch: Record<string, WatchDay>;
  watchSync: WatchSync;
}

export interface ProgressSummary {
  title: string;
  body: string;
  today: string[];
  week: string[];
}

export type MetricKey = 'steps' | 'heart' | 'sleep' | 'exercise' | 'learning' | 'water';

/** What Health Connect holds for one record type, shown on the Watch screen to explain missing data. */
export interface WatchDiagnosticsRow {
  type: string;
  count: number;
  sources: string[];
  error?: string;
}

export interface WatchDiagnostics {
  status: 'available' | 'needs-update' | 'unavailable';
  granted: string[];
  rows: WatchDiagnosticsRow[];
  checkedAt: string;
}
