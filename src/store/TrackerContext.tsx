import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HealthLog,
  ProgressSummary,
  ReminderSettings,
  TrackerData,
  TrackerGoals,
  Workout,
  WatchConnectResult,
  WatchDay,
} from '../types/tracker';
import { AppState } from 'react-native';
import { buildSummary, dateKey, dayRange, emptyHealth } from '../utils/trackerStats';
import { getWatchAvailability, readWatchDays, requestWatchAccess } from '../services/healthConnect';
import {
  cancelDailySummary,
  ensureNotificationPermission,
  scheduleDailySummary,
} from '../services/notifications';

const STORAGE_KEY = 'jing.tracker.v1';

const DEFAULT_DATA: TrackerData = {
  sessions: [],
  health: {},
  goals: { steps: 8000, maxHeartRate: 190, weightKg: 70, learningMinutes: 30, waterGlasses: 8, sleepHours: 8, exerciseMinutes: 30 },
  reminder: { enabled: false, hour: 20, minute: 0 },
  watch: {},
  watchSync: { enabled: false, lastSyncedAt: null },
  workouts: [],
};

const WATCH_SYNC_DAYS = 14;
/** Garmin Connect pushes new watch data to Health Connect every few minutes; check this often while open. */
const WATCH_POLL_MS = 60_000;
/** Minute-by-minute checks only re-read today and last night, to stay well inside Health Connect's rate limits. */
const WATCH_POLL_DAYS = 2;

interface TrackerContextValue {
  data: TrackerData;
  loaded: boolean;
  summary: ProgressSummary;
  addSession: (topic: string, minutes: number) => void;
  removeSession: (id: string) => void;
  saveHealth: (log: HealthLog) => void;
  healthFor: (date?: string) => HealthLog;
  /** Resolves false when turning on fails because notification permission was not granted. */
  setReminder: (reminder: ReminderSettings) => Promise<boolean>;
  updateGoals: (goals: TrackerGoals) => void;
  addWorkout: (workout: Workout) => void;
  removeWorkout: (id: string) => void;
  /** Asks for Health Connect access, then pulls the watch data in. */
  connectWatch: () => Promise<WatchConnectResult>;
  disconnectWatch: () => void;
  /** Reads the last `days` days from Health Connect (default 14); `ok` is false when nothing could be read. */
  syncWatch: (days?: number) => Promise<{ ok: boolean; errors: string[] }>;
  /** Problems from the most recent sync, one line per data type; empty when everything was read. */
  watchErrors: string[];
}

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<TrackerData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<TrackerData>;
        setData({ ...DEFAULT_DATA, ...saved, goals: { ...DEFAULT_DATA.goals, ...saved.goals } });
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const summary = useMemo(() => buildSummary(data), [data]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => undefined);
  }, [data, loaded]);

  // Reschedule only when the notification's text or time changes, not on every watch poll.
  const { enabled: reminderOn, hour, minute } = data.reminder;
  useEffect(() => {
    if (!loaded) return;
    const sync = reminderOn
      ? scheduleDailySummary(hour, minute, summary)
      : cancelDailySummary();
    sync.catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, reminderOn, hour, minute, summary.title, summary.body]);

  const addSession = useCallback((topic: string, minutes: number) => {
    const session = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: dateKey(), topic, minutes };
    setData(prev => ({ ...prev, sessions: [session, ...prev.sessions] }));
  }, []);

  const removeSession = useCallback((id: string) => {
    setData(prev => ({ ...prev, sessions: prev.sessions.filter(s => s.id !== id) }));
  }, []);

  const saveHealth = useCallback((log: HealthLog) => {
    setData(prev => ({ ...prev, health: { ...prev.health, [log.date]: log } }));
  }, []);

  const healthFor = useCallback(
    (date: string = dateKey()) => data.health[date] ?? emptyHealth(date),
    [data.health],
  );

  const setReminder = useCallback(async (reminder: ReminderSettings) => {
    if (reminder.enabled && !(await ensureNotificationPermission())) return false;
    setData(prev => ({ ...prev, reminder }));
    return true;
  }, []);

  const [watchErrors, setWatchErrors] = useState<string[]>([]);

  const syncWatch = useCallback(async (dayCount: number = WATCH_SYNC_DAYS) => {
    let days: WatchDay[];
    let errors: string[];
    try {
      ({ days, errors } = await readWatchDays(dayRange(dayCount)));
    } catch (e) {
      const errorList = [e instanceof Error ? e.message : String(e)];
      setWatchErrors(errorList);
      return { ok: false, errors: errorList };
    }
    setWatchErrors(errors);
    setData(prev => {
      if (!prev.watchSync.enabled) return prev;
      const watch = { ...prev.watch };
      days.forEach(day => {
        // If a type failed this time, keep what was read for it before.
        watch[day.date] = errors.length ? { ...prev.watch[day.date], ...day } : day;
      });
      return { ...prev, watch, watchSync: { enabled: true, lastSyncedAt: new Date().toISOString() } };
    });
    return { ok: errors.length < 5, errors };
  }, []);

  const connectWatch = useCallback(async (): Promise<WatchConnectResult> => {
    const availability = await getWatchAvailability();
    if (availability !== 'available') return availability;
    let granted = false;
    try {
      granted = await requestWatchAccess();
    } catch {
      granted = false;
    }
    if (!granted) return 'denied';
    setData(prev => ({ ...prev, watchSync: { ...prev.watchSync, enabled: true } }));
    await syncWatch();
    return 'connected';
  }, [syncWatch]);

  const disconnectWatch = useCallback(() => {
    setWatchErrors([]);
    setData(prev => ({ ...prev, watch: {}, watchSync: { enabled: false, lastSyncedAt: null } }));
  }, []);

  // Refresh watch data on launch, on returning to the app, and every minute while it is open.
  const watchEnabled = data.watchSync.enabled;
  useEffect(() => {
    if (!loaded || !watchEnabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      syncWatch();
      timer ??= setInterval(() => syncWatch(WATCH_POLL_DAYS), WATCH_POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', state => (state === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
    };
  }, [loaded, watchEnabled, syncWatch]);

  const updateGoals = useCallback((goals: TrackerGoals) => {
    setData(prev => ({ ...prev, goals }));
  }, []);

  const addWorkout = useCallback((workout: Workout) => {
    setData(prev => ({ ...prev, workouts: [workout, ...prev.workouts.filter(w => w.id !== workout.id)] }));
  }, []);

  const removeWorkout = useCallback((id: string) => {
    setData(prev => ({ ...prev, workouts: prev.workouts.filter(w => w.id !== id) }));
  }, []);

  const value = useMemo(
    () => ({
      data,
      loaded,
      summary,
      addSession,
      removeSession,
      saveHealth,
      healthFor,
      setReminder,
      updateGoals,
      addWorkout,
      removeWorkout,
      connectWatch,
      disconnectWatch,
      syncWatch,
      watchErrors,
    }),
    [
      data,
      loaded,
      summary,
      addSession,
      removeSession,
      saveHealth,
      healthFor,
      setReminder,
      updateGoals,
      addWorkout,
      removeWorkout,
      connectWatch,
      disconnectWatch,
      syncWatch,
      watchErrors,
    ],
  );

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

export function useTracker(): TrackerContextValue {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error('useTracker must be used inside TrackerProvider');
  return ctx;
}
