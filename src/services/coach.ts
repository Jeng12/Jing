import { CoachArea, CoachReport, CoachTone, TrackerData, Workout } from '../types/tracker';
import { AiError, ChatTurn, askAI } from './ai';
import { dateKey, dayRange, effectiveHealth, learningMinutesOn, topicTotals, watchDay } from '../utils/trackerStats';
import { SPORTS } from '../utils/sports';

const SYSTEM_PROMPT = `You are the coach inside Jing, a personal app where one person tracks their health, workouts and learning. Each request includes their recent data as JSON.

How to coach:
- Base every point on the data and quote the numbers ("6.4 h average sleep", "3 runs this week"). Compare with the previous week or with their goals when the data allows.
- Look for links between areas: sleep and workout performance, learning and late nights, hydration and energy, heart rate and recovery.
- If something is missing or not tracked, say so in a few words instead of guessing.
- Suggestions are small, specific actions for the next few days, never generic advice.
- Be encouraging and honest. Praise real progress; point out slips kindly.
- You are not a doctor and do not diagnose. If a pattern could be a health concern (for example resting heart rate rising for many days, very short sleep night after night, or unusually high heart rate at rest), mention it calmly and suggest checking with a health professional.
- Write plain, simple English with short sentences.`;

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'One sentence summing up the period.' },
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: { type: 'string', enum: ['sleep', 'activity', 'heart', 'workouts', 'learning', 'hydration', 'mood', 'overall'] },
          tone: { type: 'string', enum: ['positive', 'watch', 'neutral'] },
          title: { type: 'string', description: 'A few words.' },
          detail: { type: 'string', description: 'One to three sentences with the numbers behind it.' },
        },
        required: ['area', 'tone', 'title', 'detail'],
        additionalProperties: false,
      },
    },
    actions: { type: 'array', items: { type: 'string', description: 'One concrete action for the next few days.' } },
  },
  required: ['headline', 'insights', 'actions'],
  additionalProperties: false,
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const zoneMinutes = (seconds?: number[]) =>
  seconds ? Object.fromEntries(seconds.slice(1).map((s, i) => [`z${i + 1}`, round1(s / 60)])) : undefined;

function workoutFacts(w: Workout) {
  return {
    date: w.date,
    sport: SPORTS[w.sport].label,
    minutes: Math.round(w.durationSec / 60),
    km: w.distanceM ? round1(w.distanceM / 1000) : undefined,
    avgHr: w.avgHeartRate,
    maxHr: w.maxHeartRate,
    kcal: w.calories,
    zoneMinutes: zoneMinutes(w.zoneSeconds),
  };
}

/** A compact JSON summary of the last two weeks; fields that were not recorded are left out. */
export function buildDataContext(data: TrackerData, name: string): object {
  const days = dayRange(14);
  return {
    name: name || undefined,
    today: dateKey(),
    goals: data.goals,
    watchConnected: data.watchSync.enabled,
    days: days.map(date => {
      const h = effectiveHealth(data, date);
      const w = watchDay(data, date);
      return {
        date,
        steps: w?.steps,
        sleepHours: h.sleepHours || undefined,
        exerciseMin: h.exerciseMinutes || undefined,
        waterGlasses: h.waterGlasses || undefined,
        mood1to5: h.mood || undefined,
        restingHr: w?.restingHeartRate,
        learningMin: learningMinutesOn(data, date) || undefined,
      };
    }),
    workouts: data.workouts.filter(w => days.includes(w.date)).map(workoutFacts),
    learningTopics: topicTotals(data, days),
  };
}

const AREAS: CoachArea[] = ['sleep', 'activity', 'heart', 'workouts', 'learning', 'hydration', 'mood', 'overall'];
const TONES: CoachTone[] = ['positive', 'watch', 'neutral'];

/** Parses and checks a report, so a reply in the wrong shape shows an error instead of a broken screen. */
function parseReport(text: string): CoachReport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AiError('bad_request', 'The reply was not valid JSON');
  }
  const r = raw as Partial<Record<keyof CoachReport, unknown>>;
  const insights = Array.isArray(r.insights) ? r.insights : [];
  const report: CoachReport = {
    headline: typeof r.headline === 'string' ? r.headline : '',
    insights: insights
      .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
      .map(i => ({
        area: AREAS.includes(i.area as CoachArea) ? (i.area as CoachArea) : 'overall',
        tone: TONES.includes(i.tone as CoachTone) ? (i.tone as CoachTone) : 'neutral',
        title: String(i.title ?? ''),
        detail: String(i.detail ?? ''),
      }))
      .filter(i => i.title || i.detail),
    actions: Array.isArray(r.actions) ? r.actions.map(String).filter(Boolean) : [],
    generatedAt: new Date().toISOString(),
  };
  if (!report.headline && !report.insights.length) throw new AiError('bad_request', 'The reply was empty');
  return report;
}

/** Two-week review across health, workouts and learning. */
export async function analyzeRecent(apiKey: string, data: TrackerData, name: string): Promise<CoachReport> {
  const text = await askAI({
    apiKey,
    system: SYSTEM_PROMPT,
    schema: REPORT_SCHEMA,
    messages: [
      {
        role: 'user',
        content: `Here is my data for the last 14 days:\n${JSON.stringify(buildDataContext(data, name))}\n\nReview how I am doing. Give 3 to 6 insights covering the areas that matter most in this data, and 2 to 4 actions for the coming days.`,
      },
    ],
  });
  return parseReport(text);
}

/** Review of one workout, compared with earlier workouts of the same sport. */
export async function analyzeWorkout(apiKey: string, workout: Workout, data: TrackerData): Promise<CoachReport> {
  const earlier = data.workouts
    .filter(w => w.sport === workout.sport && w.id !== workout.id && w.startedAt < workout.startedAt)
    .slice(0, 5)
    .map(workoutFacts);
  const facts = {
    workout: {
      ...workoutFacts(workout),
      startedAt: workout.startedAt,
      heartRateEvery10s: workout.heartRateSeries,
    },
    earlierSameSport: earlier,
    maxHeartRateSetting: data.goals.maxHeartRate,
    sleepLastNight: effectiveHealth(data, workout.date).sleepHours || undefined,
  };
  const text = await askAI({
    apiKey,
    system: SYSTEM_PROMPT,
    schema: REPORT_SCHEMA,
    messages: [
      {
        role: 'user',
        content: `Here is a workout I just did, with earlier ones of the same sport:\n${JSON.stringify(facts)}\n\nAnalyse it: effort and heart-rate zones, pacing, how it compares with my earlier ones, and recovery. Give 2 to 4 insights and 1 to 3 actions.`,
      },
    ],
  });
  return parseReport(text);
}

/**
 * Free question about the user's data. The first turn carries the data; follow-up turns in the
 * same conversation reuse it from the history. Returns the turn as sent, to keep in the history.
 */
export async function askCoach(
  apiKey: string,
  history: ChatTurn[],
  question: string,
  data: TrackerData,
  name: string,
): Promise<{ answer: string; userTurn: ChatTurn }> {
  const content =
    history.length === 0
      ? `My data for the last 14 days:\n${JSON.stringify(buildDataContext(data, name))}\n\nMy question: ${question}`
      : question;
  const userTurn: ChatTurn = { role: 'user', content };
  const answer = await askAI({
    apiKey,
    system: `${SYSTEM_PROMPT}\n- Answer the question directly in a short reply (a few sentences or a short list). Use plain text without Markdown headings or tables.`,
    messages: [...history, userTurn],
  });
  return { answer, userTurn };
}

/** The user-visible question, without the data block the first turn carries. */
export function questionOnly(turn: ChatTurn): string {
  const marker = '\n\nMy question: ';
  const i = turn.content.indexOf(marker);
  return i >= 0 ? turn.content.slice(i + marker.length) : turn.content;
}
