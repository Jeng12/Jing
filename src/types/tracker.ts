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

export interface TrackerGoals {
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
}

export interface ProgressSummary {
  title: string;
  body: string;
  today: string[];
  week: string[];
}
