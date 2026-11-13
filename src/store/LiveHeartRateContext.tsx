import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  connectHeartRate,
  HeartRateDevice,
  LiveProblem,
  prepareBluetooth,
  scanForHeartRateDevices,
} from '../services/liveHeartRate';
import { heartRateZone } from '../utils/heartRate';
import { useTracker } from './TrackerContext';

const STORAGE_KEY = 'jing.live.v1';
const SAMPLE_WINDOW = 120; // samples kept for the chart, about 2 minutes
const SCAN_MS = 20000;
const RECONNECT_TRIES = 3;

export type LiveStatus = 'idle' | 'scanning' | 'connecting' | 'live' | 'reconnecting';

export interface LiveSession {
  startedAt: number;
  min: number;
  max: number;
  sum: number;
  count: number;
  zoneSeconds: number[]; // index 0–5, 0 = below zone 1
}

interface LiveValue {
  status: LiveStatus;
  problem: LiveProblem | 'lost' | null;
  devices: HeartRateDevice[];
  device: { id: string; name: string } | null;
  lastDevice: { id: string; name: string } | null;
  bpm: number | null;
  samples: number[];
  session: LiveSession | null;
  startScan: () => Promise<void>;
  stopScan: () => void;
  connect: (device: { id: string; name: string }) => Promise<void>;
  disconnect: () => void;
}

const LiveContext = createContext<LiveValue | null>(null);

const newSession = (): LiveSession => ({
  startedAt: Date.now(),
  min: Infinity,
  max: 0,
  sum: 0,
  count: 0,
  zoneSeconds: [0, 0, 0, 0, 0, 0],
});

export function LiveHeartRateProvider({ children }: { children: React.ReactNode }) {
  const { data } = useTracker();
  const maxHeartRate = data.goals.maxHeartRate;
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [problem, setProblem] = useState<LiveValue['problem']>(null);
  const [devices, setDevices] = useState<HeartRateDevice[]>([]);
  const [device, setDevice] = useState<LiveValue['device']>(null);
  const [lastDevice, setLastDevice] = useState<LiveValue['lastDevice']>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [samples, setSamples] = useState<number[]>([]);
  const [session, setSession] = useState<LiveSession | null>(null);

  const stopScanRef = useRef<(() => void) | null>(null);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef<(() => void) | null>(null);
  const lastSampleAt = useRef<number | null>(null);
  const maxHrRef = useRef(maxHeartRate);
  maxHrRef.current = maxHeartRate;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => raw && setLastDevice(JSON.parse(raw)))
      .catch(() => undefined);
  }, []);

  const stopScan = useCallback(() => {
    stopScanRef.current?.();
    stopScanRef.current = null;
    if (scanTimer.current) clearTimeout(scanTimer.current);
    scanTimer.current = null;
    setStatus(s => (s === 'scanning' ? 'idle' : s));
  }, []);

  const startScan = useCallback(async () => {
    setProblem(null);
    setDevices([]);
    const issue = await prepareBluetooth();
    if (issue) return setProblem(issue);
    setStatus('scanning');
    stopScanRef.current = scanForHeartRateDevices(
      found =>
        setDevices(prev => {
          const rest = prev.filter(d => d.id !== found.id);
          // Devices that advertise heart rate first, then by signal strength.
          return [...rest, found].sort(
            (a, b) => Number(b.advertisesHr) - Number(a.advertisesHr) || (b.rssi ?? -999) - (a.rssi ?? -999),
          );
        }),
      scanProblem => {
        setProblem(scanProblem);
        stopScan();
      },
    );
    scanTimer.current = setTimeout(stopScan, SCAN_MS);
  }, [stopScan]);

  const onBpm = useCallback((value: number) => {
    const now = Date.now();
    const elapsed = lastSampleAt.current ? Math.min((now - lastSampleAt.current) / 1000, 5) : 1;
    lastSampleAt.current = now;
    const zone = heartRateZone(value, maxHrRef.current).zone;
    setBpm(value);
    setSamples(prev => [...prev.slice(-(SAMPLE_WINDOW - 1)), value]);
    setSession(prev => {
      const s = prev ?? newSession();
      const zoneSeconds = [...s.zoneSeconds];
      zoneSeconds[zone] += elapsed;
      return {
        ...s,
        min: Math.min(s.min, value),
        max: Math.max(s.max, value),
        sum: s.sum + value,
        count: s.count + 1,
        zoneSeconds,
      };
    });
  }, []);

  /** The device the user asked for; reconnect attempts stop as soon as this changes. */
  const wantedRef = useRef<{ id: string; name: string } | null>(null);

  const open = useCallback(
    async (target: { id: string; name: string }, attempt: number): Promise<void> => {
      const stillWanted = () => wantedRef.current?.id === target.id;
      if (!stillWanted()) return;
      try {
        const close = await connectHeartRate(target.id, onBpm, () => {
          closeRef.current = null;
          setBpm(null);
          if (!stillWanted()) return;
          setStatus('reconnecting');
          setTimeout(() => open(target, 1), 2000);
        });
        if (!stillWanted()) return close();
        closeRef.current = close;
        setStatus('live');
        setProblem(null);
      } catch {
        if (!stillWanted()) return;
        if (attempt > 0 && attempt < RECONNECT_TRIES) {
          setTimeout(() => open(target, attempt + 1), 3000);
          return;
        }
        wantedRef.current = null;
        setStatus('idle');
        setDevice(null);
        setBpm(null);
        setProblem(attempt > 0 ? 'lost' : 'connect-failed');
      }
    },
    [onBpm],
  );

  const connect = useCallback(
    async (target: { id: string; name: string }) => {
      stopScan();
      const issue = await prepareBluetooth();
      if (issue) return setProblem(issue);
      closeRef.current?.();
      closeRef.current = null;
      wantedRef.current = target;
      setProblem(null);
      setStatus('connecting');
      setDevice(target);
      setSamples([]);
      setSession(newSession());
      lastSampleAt.current = null;
      setLastDevice(target);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(target)).catch(() => undefined);
      await open(target, 0);
    },
    [stopScan, open],
  );

  const disconnect = useCallback(() => {
    wantedRef.current = null;
    closeRef.current?.();
    closeRef.current = null;
    setStatus('idle');
    setDevice(null);
    setBpm(null);
  }, []);

  useEffect(() => () => closeRef.current?.(), []);

  const value = useMemo(
    () => ({
      status,
      problem,
      devices,
      device,
      lastDevice,
      bpm,
      samples,
      session,
      startScan,
      stopScan,
      connect,
      disconnect,
    }),
    [status, problem, devices, device, lastDevice, bpm, samples, session, startScan, stopScan, connect, disconnect],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLiveHeartRate(): LiveValue {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLiveHeartRate must be used inside LiveHeartRateProvider');
  return ctx;
}
