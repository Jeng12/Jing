import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { MetricKey, TrackerGoals } from '../types/tracker';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface MetricInfo {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  icon: IconName;
  decimals: number;
  goal: (goals: TrackerGoals) => number | null;
  /** False for resting heart rate, where a rise is not simply "better". */
  higherIsBetter: boolean;
  fromWatch: boolean;
}

export const METRICS: Record<MetricKey, MetricInfo> = {
  steps: {
    key: 'steps',
    label: 'Steps',
    unit: 'steps',
    color: colors.steps,
    icon: 'footsteps',
    decimals: 0,
    goal: g => g.steps,
    higherIsBetter: true,
    fromWatch: true,
  },
  heart: {
    key: 'heart',
    label: 'Resting HR',
    unit: 'bpm',
    color: colors.heart,
    icon: 'heart',
    decimals: 0,
    goal: () => null,
    higherIsBetter: false,
    fromWatch: true,
  },
  sleep: {
    key: 'sleep',
    label: 'Sleep',
    unit: 'h',
    color: colors.sleep,
    icon: 'moon',
    decimals: 1,
    goal: g => g.sleepHours,
    higherIsBetter: true,
    fromWatch: false,
  },
  exercise: {
    key: 'exercise',
    label: 'Exercise',
    unit: 'min',
    color: colors.exercise,
    icon: 'flame',
    decimals: 0,
    goal: g => g.exerciseMinutes,
    higherIsBetter: true,
    fromWatch: false,
  },
  learning: {
    key: 'learning',
    label: 'Learning',
    unit: 'min',
    color: colors.learning,
    icon: 'book',
    decimals: 0,
    goal: g => g.learningMinutes,
    higherIsBetter: true,
    fromWatch: false,
  },
  water: {
    key: 'water',
    label: 'Water',
    unit: 'glasses',
    color: colors.water,
    icon: 'water',
    decimals: 0,
    goal: g => g.waterGlasses,
    higherIsBetter: true,
    fromWatch: false,
  },
};

export const METRIC_ORDER: MetricKey[] = ['steps', 'sleep', 'exercise', 'heart', 'learning', 'water'];

export function formatValue(value: number, decimals: number): string {
  return decimals ? (Math.round(value * 10 ** decimals) / 10 ** decimals).toString() : Math.round(value).toLocaleString();
}
