import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';
import { SportKey } from '../types/tracker';
import colors from '../theme/colors';

export type SportIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface SportInfo {
  key: SportKey;
  label: string;
  icon: SportIconName;
  /** Uses phone GPS for distance and pace. */
  gps: boolean;
  /** Show speed (km/h) instead of pace (min/km). */
  showSpeed: boolean;
  /** Metabolic equivalent, for the calorie estimate. */
  met: number;
  color: string;
}

export const SPORTS: Record<SportKey, SportInfo> = {
  run: { key: 'run', label: 'Run', icon: 'run', gps: true, showSpeed: false, met: 9.8, color: colors.steps },
  walk: { key: 'walk', label: 'Walk', icon: 'walk', gps: true, showSpeed: false, met: 3.5, color: colors.water },
  cycle: { key: 'cycle', label: 'Cycle', icon: 'bike', gps: true, showSpeed: true, met: 7.5, color: colors.exercise },
  hike: { key: 'hike', label: 'Hike', icon: 'hiking', gps: true, showSpeed: false, met: 6, color: colors.learning },
  gym: { key: 'gym', label: 'Gym', icon: 'dumbbell', gps: false, showSpeed: false, met: 5, color: colors.heart },
  yoga: { key: 'yoga', label: 'Yoga', icon: 'yoga', gps: false, showSpeed: false, met: 2.5, color: colors.sleep },
  football: { key: 'football', label: 'Football', icon: 'soccer', gps: false, showSpeed: false, met: 7, color: colors.steps },
  basketball: { key: 'basketball', label: 'Basketball', icon: 'basketball', gps: false, showSpeed: false, met: 6.5, color: colors.exercise },
  other: { key: 'other', label: 'Other', icon: 'lightning-bolt', gps: false, showSpeed: false, met: 5, color: colors.primary },
};

export const SPORT_ORDER: SportKey[] = ['run', 'walk', 'cycle', 'hike', 'gym', 'yoga', 'football', 'basketball', 'other'];

/** kcal = MET × body weight (kg) × hours. A rough estimate, labelled as such in the UI. */
export function estimateCalories(sport: SportKey, durationSec: number, weightKg: number): number {
  return Math.round(SPORTS[sport].met * weightKg * (durationSec / 3600));
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(meters < 10000 ? 2 : 1);
}

/** Minutes per km as m:ss, or "--" when there is not enough distance yet. */
export function formatPace(seconds: number, meters: number): string {
  if (meters < 20 || seconds <= 0) return '--';
  const perKm = seconds / (meters / 1000);
  if (perKm > 60 * 60) return '--';
  return `${Math.floor(perKm / 60)}:${String(Math.round(perKm % 60)).padStart(2, '0')}`;
}

export function formatSpeed(seconds: number, meters: number): string {
  if (meters < 20 || seconds <= 0) return '--';
  return ((meters / seconds) * 3.6).toFixed(1);
}
