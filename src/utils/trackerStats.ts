import { HealthLog, ProgressSummary, TrackerData, WatchDay } from '../types/tracker';

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

/** Health for a day with watch data filling in whatever was not entered by hand. */
export function effectiveHealth(data: TrackerData, date: string): HealthLog {
  const manual = data.health[date] ?? emptyHealth(date);
  const watch = data.watchSync.enabled ? data.watch[date] : undefined;
  return {
    ...manual,
    sleepHours: manual.sleepHours || watch?.sleepHours || 0,
    exerciseMinutes: manual.exerciseMinutes || watch?.exerciseMinutes || 0,
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

/** A day counts toward the streak only when something was logged by hand, not from the watch. */
function isActiveDay(data: TrackerData, date: string): boolean {
  const h = data.health[date];
  const hasHealth = !!h && (h.waterGlasses > 0 || h.sleepHours > 0 || h.exerciseMinutes > 0 || h.mood > 0);
  return hasHealth || learningMinutesOn(data, date) > 0;
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
