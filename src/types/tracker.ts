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
}

export interface WatchSync {
  enabled: boolean;
  lastSyncedAt: string | null; // ISO timestamp
}

export type WatchConnectResult = 'connected' | 'denied' | 'needs-update' | 'unavailable';

export interface TrackerGoals {
  steps: number;
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
