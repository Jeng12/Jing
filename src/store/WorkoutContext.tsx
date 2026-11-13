import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { SportKey, Workout } from '../types/tracker';
import { SPORTS, estimateCalories } from '../utils/sports';
import { distanceMeters, thin } from '../utils/geo';
import { heartRateZone } from '../utils/heartRate';
import { dateKey } from '../utils/trackerStats';
import { useTracker } from './TrackerContext';
import { useLiveHeartRate } from './LiveHeartRateContext';

const KEEP_AWAKE_TAG = 'jing-workout';
const MAX_ACCURACY_M = 30; // ignore GPS fixes less precise than this
const MAX_SPEED_MPS = 40; // a jump faster than this is a GPS glitch, not movement
const MIN_ROUTE_STEP_M = 5;
const HR_SERIES_EVERY_MS = 10_000;
const ROUTE_MAX_POINTS = 400;

export type GpsState = 'off' | 'searching' | 'good' | 'denied' | 'disabled';

export interface ActiveWorkout {
  id: string;
  sport: SportKey;
  startedAt: number;
  pausedAt: number | null;
  pausedMs: number;
  distanceM: number;
  route: [number, number][];
  speedMps: number | null;
  gps: GpsState;
  hrSum: number;
  hrCount: number;
  hrMax: number;
  zoneSeconds: number[];
  hrSeries: number[];
}

interface WorkoutValue {
  active: ActiveWorkout | null;
  /** A finished workout waiting to be saved or discarded. */
  draft: Workout | null;
  start: (sport: SportKey) => void;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  saveDraft: () => void;
  discardDraft: () => void;
}

const WorkoutContext = createContext<WorkoutValue | null>(null);

/** Seconds of moving time so far: wall-clock time minus pauses. */
export function movingSeconds(w: ActiveWorkout, now: number = Date.now()): number {
  const pausedNow = w.pausedAt ? now - w.pausedAt : 0;
  return Math.max(0, (now - w.startedAt - w.pausedMs - pausedNow) / 1000);
}

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { data, addWorkout } = useTracker();
  const live = useLiveHeartRate();
  const [active, setActive] = useState<ActiveWorkout | null>(null);
  const [draft, setDraft] = useState<Workout | null>(null);

  const gpsSub = useRef<Location.LocationSubscription | null>(null);
  const lastFix = useRef<{ point: [number, number]; at: number } | null>(null);
  const lastHrAt = useRef<number | null>(null);
  const lastSeriesAt = useRef<number | null>(null);
  const maxHrRef = useRef(data.goals.maxHeartRate);
  maxHrRef.current = data.goals.maxHeartRate;

  const stopGps = useCallback(() => {
    try {
      gpsSub.current?.remove();
    } catch {
      // expo-location's web build throws here; a failed cleanup must never lose the workout.
    }
    gpsSub.current = null;
    lastFix.current = null;
  }, []);

  const startGps = useCallback(async () => {
    const setGps = (gps: GpsState) => setActive(w => (w ? { ...w, gps } : w));
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return setGps('denied');
      if (!(await Location.hasServicesEnabledAsync())) return setGps('disabled');
      setGps('searching');
      gpsSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
        loc => {
          const { latitude, longitude, accuracy, speed } = loc.coords;
          if (accuracy !== null && accuracy > MAX_ACCURACY_M) return setGps('searching');
          const point: [number, number] = [latitude, longitude];
          const prev = lastFix.current;
          lastFix.current = { point, at: loc.timestamp };
          setActive(w => {
            if (!w) return w;
            const next = { ...w, gps: 'good' as const, speedMps: speed !== null && speed >= 0 ? speed : null };
            // The first fix marks the start of the route.
            if (!prev) return { ...next, route: w.route.length ? w.route : [point] };
            // While paused, keep following the position so resuming does not add a jump.
            if (w.pausedAt) return next;
            const d = distanceMeters(prev.point, point);
            const seconds = Math.max((loc.timestamp - prev.at) / 1000, 0.5);
            if (d / seconds > MAX_SPEED_MPS) return next;
            const lastRoute = w.route[w.route.length - 1];
            const route = !lastRoute || distanceMeters(lastRoute, point) >= MIN_ROUTE_STEP_M ? [...w.route, point] : w.route;
            return { ...next, distanceM: w.distanceM + d, route };
          });
        },
      );
    } catch {
      setGps('disabled');
    }
  }, []);

  const start = useCallback(
    (sport: SportKey) => {
      if (active) return;
      lastHrAt.current = null;
      lastSeriesAt.current = null;
      setDraft(null);
      setActive({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sport,
        startedAt: Date.now(),
        pausedAt: null,
        pausedMs: 0,
        distanceM: 0,
        route: [],
        speedMps: null,
        gps: 'off',
        hrSum: 0,
        hrCount: 0,
        hrMax: 0,
        zoneSeconds: [0, 0, 0, 0, 0, 0],
        hrSeries: [],
      });
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
      if (SPORTS[sport].gps) startGps();
    },
    [active, startGps],
  );

  const pause = useCallback(() => {
    lastHrAt.current = null;
    setActive(w => (w && !w.pausedAt ? { ...w, pausedAt: Date.now() } : w));
  }, []);

  const resume = useCallback(() => {
    setActive(w => (w && w.pausedAt ? { ...w, pausedMs: w.pausedMs + (Date.now() - w.pausedAt), pausedAt: null } : w));
  }, []);

  const finish = useCallback(() => {
    if (!active) return;
    const end = Date.now();
    const durationSec = Math.round(movingSeconds(active, end));
    const hasHr = active.hrCount > 0;
    setDraft({
      id: active.id,
      sport: active.sport,
      date: dateKey(new Date(active.startedAt)),
      startedAt: new Date(active.startedAt).toISOString(),
      endedAt: new Date(end).toISOString(),
      durationSec,
      distanceM: SPORTS[active.sport].gps && active.distanceM > 0 ? Math.round(active.distanceM) : undefined,
      calories: estimateCalories(active.sport, durationSec, data.goals.weightKg),
      avgHeartRate: hasHr ? Math.round(active.hrSum / active.hrCount) : undefined,
      maxHeartRate: hasHr ? active.hrMax : undefined,
      zoneSeconds: hasHr ? active.zoneSeconds.map(Math.round) : undefined,
      heartRateSeries: active.hrSeries.length > 1 ? active.hrSeries : undefined,
      route: active.route.length > 1 ? thin(active.route, ROUTE_MAX_POINTS) : undefined,
    });
    setActive(null);
    stopGps();
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
  }, [active, stopGps, data.goals.weightKg]);

  const saveDraft = useCallback(() => {
    if (draft) addWorkout(draft);
    setDraft(null);
  }, [draft, addWorkout]);

  const discardDraft = useCallback(() => setDraft(null), []);

  // Each new heart-rate sample from the watch (a new samples array) counts toward the running workout.
  useEffect(() => {
    if (!active || active.pausedAt || live.status !== 'live' || !live.bpm) {
      lastHrAt.current = null;
      return;
    }
    const bpm = live.bpm;
    const now = Date.now();
    const elapsed = lastHrAt.current ? Math.min((now - lastHrAt.current) / 1000, 5) : 1;
    lastHrAt.current = now;
    const zone = heartRateZone(bpm, maxHrRef.current).zone;
    const addSeries = !lastSeriesAt.current || now - lastSeriesAt.current >= HR_SERIES_EVERY_MS;
    if (addSeries) lastSeriesAt.current = now;
    setActive(w => {
      if (!w) return w;
      const zoneSeconds = [...w.zoneSeconds];
      zoneSeconds[zone] += elapsed;
      return {
        ...w,
        hrSum: w.hrSum + bpm,
        hrCount: w.hrCount + 1,
        hrMax: Math.max(w.hrMax, bpm),
        zoneSeconds,
        hrSeries: addSeries ? [...w.hrSeries, bpm] : w.hrSeries,
      };
    });
    // Run once per sample, not on every workout state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.samples]);

  useEffect(
    () => () => {
      stopGps();
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    },
    [stopGps],
  );

  const value = useMemo(
    () => ({ active, draft, start, pause, resume, finish, saveDraft, discardDraft }),
    [active, draft, start, pause, resume, finish, saveDraft, discardDraft],
  );
  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout(): WorkoutValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used inside WorkoutProvider');
  return ctx;
}
