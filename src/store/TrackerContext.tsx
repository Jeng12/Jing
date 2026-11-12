import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthLog, ProgressSummary, ReminderSettings, TrackerData } from '../types/tracker';
import { buildSummary, dateKey, emptyHealth } from '../utils/trackerStats';
import {
  cancelDailySummary,
  ensureNotificationPermission,
  scheduleDailySummary,
} from '../services/notifications';

const STORAGE_KEY = 'jing.tracker.v1';

const DEFAULT_DATA: TrackerData = {
  sessions: [],
  health: {},
  goals: { learningMinutes: 30, waterGlasses: 8, sleepHours: 8, exerciseMinutes: 30 },
  reminder: { enabled: false, hour: 20, minute: 0 },
};

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
}

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<TrackerData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) setData({ ...DEFAULT_DATA, ...(JSON.parse(raw) as Partial<TrackerData>) });
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

  const value = useMemo(
    () => ({ data, loaded, summary, addSession, removeSession, saveHealth, healthFor, setReminder }),
    [data, loaded, summary, addSession, removeSession, saveHealth, healthFor, setReminder],
  );

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

export function useTracker(): TrackerContextValue {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error('useTracker must be used inside TrackerProvider');
  return ctx;
}
