import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HealthLog,
  ProgressSummary,
  ReminderSettings,
  TrackerData,
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
  goals: { steps: 8000, learningMinutes: 30, waterGlasses: 8, sleepHours: 8, exerciseMinutes: 30 },
  reminder: { enabled: false, hour: 20, minute: 0 },
  watch: {},
  watchSync: { enabled: false, lastSyncedAt: null },
};

const WATCH_SYNC_DAYS = 14;

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
  /** Asks for Health Connect access, then pulls the watch data in. */
  connectWatch: () => Promise<WatchConnectResult>;
  disconnectWatch: () => void;
  /** Resolves false when Health Connect could not be read. */
  syncWatch: () => Promise<boolean>;
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
    const { enabled, hour, minute } = data.reminder;
    const sync = enabled ? scheduleDailySummary(hour, minute, summary) : cancelDailySummary();
    sync.catch(() => undefined);
  }, [data, loaded, summary]);

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

  const syncWatch = useCallback(async () => {
    let days: WatchDay[];
    try {
      days = await readWatchDays(dayRange(WATCH_SYNC_DAYS));
    } catch {
      return false;
    }
    setData(prev => {
      if (!prev.watchSync.enabled) return prev;
      const watch = { ...prev.watch };
      days.forEach(day => {
        watch[day.date] = day;
      });
      return { ...prev, watch, watchSync: { enabled: true, lastSyncedAt: new Date().toISOString() } };
    });
    return true;
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
    setData(prev => ({ ...prev, watch: {}, watchSync: { enabled: false, lastSyncedAt: null } }));
  }, []);

  // Refresh watch data on launch and whenever the app returns to the foreground.
  const watchEnabled = data.watchSync.enabled;
  useEffect(() => {
    if (!loaded || !watchEnabled) return;
    syncWatch();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') syncWatch();
    });
    return () => sub.remove();
  }, [loaded, watchEnabled, syncWatch]);

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
      connectWatch,
      disconnectWatch,
      syncWatch,
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
      connectWatch,
      disconnectWatch,
      syncWatch,
    ],
  );

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

export function useTracker(): TrackerContextValue {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error('useTracker must be used inside TrackerProvider');
  return ctx;
}
