import { HealthLog, MetricKey, ProgressSummary, TrackerData, WatchDay } from '../types/tracker';

export function dateKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** `count` consecutive day keys, oldest first, ending `endOffset` days before today. */
export function dayRange(count: number, endOffset = 0): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - endOffset - i);
    keys.push(dateKey(d));
  }
  return keys;
}

export function emptyHealth(date: string): HealthLog {
  return { date, waterGlasses: 0, sleepHours: 0, exerciseMinutes: 0, mood: 0 };
}

/** Minutes of workouts recorded in Sport mode that day. */
export function workoutMinutesOn(data: TrackerData, date: string): number {
  const seconds = data.workouts.filter(w => w.date === date).reduce((sum, w) => sum + w.durationSec, 0);
  return Math.round(seconds / 60);
}

/**
 * Health for a day with watch data and workouts filling in whatever was not entered by hand.
 * Exercise takes the larger of watch activities and Jing workouts, since the same session is
 * often recorded on both.
 */
export function effectiveHealth(data: TrackerData, date: string): HealthLog {
  const manual = data.health[date] ?? emptyHealth(date);
  const watch = data.watchSync.enabled ? data.watch[date] : undefined;
  return {
    ...manual,
    sleepHours: manual.sleepHours || watch?.sleepHours || 0,
    exerciseMinutes: manual.exerciseMinutes || Math.max(watch?.exerciseMinutes ?? 0, workoutMinutesOn(data, date)),
  };
}

export function watchDay(data: TrackerData, date: string): WatchDay | undefined {
  return data.watchSync.enabled ? data.watch[date] : undefined;
}

export function learningMinutesOn(data: TrackerData, date: string): number {
  return data.sessions.filter(s => s.date === date).reduce((sum, s) => sum + s.minutes, 0);
}

export interface PeriodTotals {
  learningMinutes: number;
  exerciseMinutes: number;
  sleepAvg: number;
  waterAvg: number;
  stepsAvg: number;
  restingHeartRateAvg: number;
  activeDays: number;
}

export function periodTotals(data: TrackerData, days: string[]): PeriodTotals {
  const logs = days.map(d => effectiveHealth(data, d));
  const watch = days.map(d => watchDay(data, d));
  const present = (values: (number | undefined)[]) => values.filter((v): v is number => !!v);
  const slept = logs.filter(h => h.sleepHours > 0);
  const drank = logs.filter(h => h.waterGlasses > 0);
  const avg = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return {
    learningMinutes: days.reduce((sum, d) => sum + learningMinutesOn(data, d), 0),
    exerciseMinutes: logs.reduce((sum, h) => sum + h.exerciseMinutes, 0),
    sleepAvg: avg(slept.map(h => h.sleepHours)),
    waterAvg: avg(drank.map(h => h.waterGlasses)),
    stepsAvg: avg(present(watch.map(w => w?.steps))),
    restingHeartRateAvg: avg(present(watch.map(w => w?.restingHeartRate))),
    activeDays: days.filter(d => isActiveDay(data, d)).length,
  };
}

/** A day counts toward the streak when something was logged or recorded in Jing, not just synced from the watch. */
function isActiveDay(data: TrackerData, date: string): boolean {
  const h = data.health[date];
  const hasHealth = !!h && (h.waterGlasses > 0 || h.sleepHours > 0 || h.exerciseMinutes > 0 || h.mood > 0);
  return hasHealth || learningMinutesOn(data, date) > 0 || data.workouts.some(w => w.date === date);
}

/** Percent change from prev to cur; null when there is no previous value to compare with. */
export function pctChange(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Consecutive active days ending today (or yesterday, if nothing is logged yet today). */
export function currentStreak(data: TrackerData): number {
  let streak = 0;
  const d = new Date();
  if (!isActiveDay(data, dateKey(d))) d.setDate(d.getDate() - 1);
  while (isActiveDay(data, dateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export interface GoalProgress {
  key: 'learning' | 'water' | 'sleep' | 'exercise' | 'steps';
  label: string;
  icon: string;
  value: number;
  goal: number;
  unit: string;
  ratio: number; // 0–1
}

export function todayProgress(data: TrackerData): GoalProgress[] {
  const today = dateKey();
  const h = effectiveHealth(data, today);
  const row = (
    key: GoalProgress['key'],
    label: string,
    icon: string,
    value: number,
    goal: number,
    unit: string,
  ): GoalProgress => ({
    key,
    label,
    icon,
    value,
    goal,
    unit,
    ratio: goal > 0 ? Math.min(value / goal, 1) : 0,
  });
  const rows = [
    row('learning', 'Learning', '📚', learningMinutesOn(data, today), data.goals.learningMinutes, 'min'),
    row('exercise', 'Exercise', '🏃', h.exerciseMinutes, data.goals.exerciseMinutes, 'min'),
    row('sleep', 'Sleep', '😴', h.sleepHours, data.goals.sleepHours, 'h'),
    row('water', 'Water', '💧', h.waterGlasses, data.goals.waterGlasses, 'glasses'),
  ];
  if (data.watchSync.enabled) {
    rows.push(row('steps', 'Steps', '👟', data.watch[today]?.steps ?? 0, data.goals.steps, 'steps'));
  }
  return rows;
}

export function todayScore(data: TrackerData): number {
  const rows = todayProgress(data);
  return Math.round((rows.reduce((sum, r) => sum + r.ratio, 0) / rows.length) * 100);
}

export function formatChange(change: number | null): string {
  if (change === null) return 'no data last week';
  if (change === 0) return 'same as last week';
  return `${change > 0 ? '+' : ''}${change}% vs last week`;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildSummary(data: TrackerData): ProgressSummary {
  const rows = todayProgress(data);
  const score = todayScore(data);
  const streak = currentStreak(data);
  const thisWeek = periodTotals(data, dayRange(7));
  const lastWeek = periodTotals(data, dayRange(7, 7));

  const today = rows.map(r => `${r.icon} ${r.label}: ${round1(r.value)}/${r.goal} ${r.unit}`);
  const week = [
    `📚 Learning: ${thisWeek.learningMinutes} min (${formatChange(pctChange(thisWeek.learningMinutes, lastWeek.learningMinutes))})`,
    `🏃 Exercise: ${thisWeek.exerciseMinutes} min (${formatChange(pctChange(thisWeek.exerciseMinutes, lastWeek.exerciseMinutes))})`,
    `😴 Sleep: ${round1(thisWeek.sleepAvg)} h avg (${formatChange(pctChange(thisWeek.sleepAvg, lastWeek.sleepAvg))})`,
    `💧 Water: ${round1(thisWeek.waterAvg)} glasses avg (${formatChange(pctChange(thisWeek.waterAvg, lastWeek.waterAvg))})`,
    ...(data.watchSync.enabled
      ? [
          `👟 Steps: ${Math.round(thisWeek.stepsAvg)} avg (${formatChange(pctChange(thisWeek.stepsAvg, lastWeek.stepsAvg))})`,
          ...(thisWeek.restingHeartRateAvg
            ? [`❤️ Resting heart rate: ${Math.round(thisWeek.restingHeartRateAvg)} bpm avg`]
            : []),
        ]
      : []),
    `🔥 Streak: ${streak} day${streak === 1 ? '' : 's'} · active ${thisWeek.activeDays}/7 days`,
  ];

  return {
    title: `Your progress summary — ${score}% of daily goals`,
    body: `Last 7 days: ${thisWeek.learningMinutes} min learning, ${thisWeek.exerciseMinutes} min exercise, ${streak}-day streak. Open to log today.`,
    today,
    week,
  };
}

/** One metric's value for one day, or null when nothing was recorded. Used by the Trends charts. */
export function dailyValue(data: TrackerData, metric: MetricKey, date: string): number | null {
  const h = effectiveHealth(data, date);
  const w = watchDay(data, date);
  const nonZero = (n: number | undefined) => (n ? n : null);
  switch (metric) {
    case 'steps':
      return nonZero(w?.steps);
    case 'heart':
      return nonZero(w?.restingHeartRate);
    case 'sleep':
      return nonZero(h.sleepHours);
    case 'exercise':
      return nonZero(h.exerciseMinutes);
    case 'learning':
      return nonZero(learningMinutesOn(data, date));
    case 'water':
      return nonZero(h.waterGlasses);
  }
}

/** Average of the recorded days (totals would punish days the watch was off). */
export function averageOf(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
}

/** Newest heart rate the app knows about from Health Connect today, if any. */
export function latestSyncedHeartRate(data: TrackerData): { bpm: number; at: string } | null {
  const w = watchDay(data, dateKey());
  return w?.latestHeartRate && w.latestHeartRateAt ? { bpm: w.latestHeartRate, at: w.latestHeartRateAt } : null;
}

/** Topic → minutes for the given days, largest first. */
export function topicTotals(data: TrackerData, days: string[]): { topic: string; minutes: number }[] {
  const totals: Record<string, number> = {};
  data.sessions
    .filter(s => days.includes(s.date))
    .forEach(s => {
      const key = s.topic.trim();
      totals[key] = (totals[key] ?? 0) + s.minutes;
    });
  return Object.entries(totals)
    .map(([topic, minutes]) => ({ topic, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
