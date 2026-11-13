# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jing** is a React Native (Expo) health tracking app with a dark theme. It tracks daily health (steps, sleep, exercise, water, mood), learning sessions and heart rate, records workouts in Sport mode (timer, GPS distance and pace, live heart rate and zones), shows week-over-week trends, sends a daily summary notification, and has an AI Coach (Gemini or Claude, chosen with the user's API key) that analyses the last two weeks, single workouts, and answers questions. It reads Garmin watch data on Android two ways: synced data through Health Connect, and live heart rate over Bluetooth. Sign-in is a local mock and there is no backend: all data stays on the device, except the data summary sent to Gemini or Claude when the user runs the AI Coach with their own API key.

## Commands

```bash
npm install          # install dependencies (versions are pinned to Expo SDK 54 — add packages with `npx expo install`)
npm start            # start Expo dev server
npm run android      # run on Android
npm run ios          # run on iOS (macOS only)
npm run web          # run in browser
npm run typecheck    # run TypeScript type check (tsc --noEmit)
```

Health Connect and Bluetooth need native code, so watch features do not run in Expo Go or on web. Build an APK with `npx expo run:android`, or use the **Build Android app** GitHub Action (`.github/workflows/android-build.yml`), which uploads `jing-android-apk` as a run artifact.

If the web dev server keeps serving old code after edits, restart it with `npx expo start --web --clear`.

## Tech Stack

- **Expo SDK** ~54.0.33
- **React** 19.1.0 / **React Native** 0.81.5
- **TypeScript** 6.0.3 (strict mode, path alias `@/*` → `./src/*`)
- **React Navigation** 7.x — `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`
- **react-native-svg** (rings, sparkline), **@expo/vector-icons** (Ionicons)
- **react-native-health-connect** (Garmin data via Health Connect), **react-native-ble-plx** (live heart rate)
- **expo-location** (workout GPS, foreground only), **expo-keep-awake** (screen stays on during a workout)
- **AI Coach**: **Gemini API** (`gemini-3.8-flash`, falling back to `gemini-flash-latest`) or **Claude API** (`claude-opus-5-5`), both over `fetch` — the Anthropic TypeScript SDK states React Native is not supported; **expo-secure-store** holds the user's API key
- **expo-notifications**, **@react-native-async-storage/async-storage**
- **New Architecture** enabled (app.json)

## Project Structure

```
App.tsx              # providers + navigation: auth stack or signed-in app, tab bar
app.json             # Expo config (name: Jing, portrait, dark, health/BLE permissions via plugins)
src/
  types/
    navigation.ts    # param lists + AuthScreenProps / AppScreenProps / TabScreenProps helpers
    tracker.ts       # LearningSession, HealthLog, WatchDay, TrackerGoals, TrackerData, Workout, SportKey, WatchDiagnostics, MetricKey
  theme/colors.ts    # all colors, including one accent per metric and heart-rate zone colors
  store/
    SessionContext.tsx        # mock sign-in + profile (AsyncStorage 'jing.session.v1')
    TrackerContext.tsx        # logs, goals, watch data, reminder (AsyncStorage 'jing.tracker.v1')
    LiveHeartRateContext.tsx  # Bluetooth scan/connect state, live bpm, session stats, zones
    WorkoutContext.tsx        # active workout (timer, pauses, GPS, heart rate) and the unsaved draft
  services/
    healthConnect.android.ts  # reads Garmin data from Health Connect + diagnostics
    healthConnect.ts          # no-op fallback (iOS/web), same exports
    liveHeartRate.android.ts  # BLE Heart Rate service client (react-native-ble-plx)
    liveHeartRate.ts          # no-op fallback (iOS/web), same exports + shared types
    notifications.ts          # daily summary notification (local only)
    ai.ts                     # askAI(credentials, request) routes to Gemini or Claude; describeAiError
    aiTypes.ts                # ChatTurn, AiError, AiCredentials, detectProvider (key prefix guess), shared POST with timeout + retries
    gemini.ts                 # Gemini generateContent client: model fallback, JSON schema, safety/finish checks, thought parts filtered
    claude.ts                 # Claude Messages API client: refusal fallbacks, structured outputs, stop_reason checks
    coach.ts                  # AI Coach: data summary, system prompt, report schema + validation, analyze/ask functions
    apiKeyStore.ts            # { provider, key } in SecureStore (apiKeyStore.web.ts: localStorage); bare keys from older versions still load
  utils/
    trackerStats.ts  # pure stats: effectiveHealth, periodTotals, streak, dailyValue, buildSummary, ...
    metrics.ts       # METRICS table (label, unit, color, icon, goal) used by Trends
    heartRate.ts     # BLE packet parsing, base64 decode, heart-rate zones
    sports.ts        # SPORTS table (icon, GPS?, MET), calorie estimate, duration/distance/pace formatting
    geo.ts           # haversine distance, route thinning, route → SVG points
  components/        # AuthButton, AuthInput, ScreenHeader, Stepper, ProgressRing, BarChart, Sparkline, TrendCard, IconBadge
  screens/
    auth/            # Root (welcome), Login, SignUp, Verification, ResetPassword, CreateNewPassword
    today/TodayScreen.tsx     # dashboard: rings, heart/sleep/water/mood tiles, quick water add
    sport/SportScreen.tsx         # Sport tab: sport picker, in-progress/unsaved banner, week totals, history
    sport/WorkoutScreen.tsx       # recording: timer, heart rate + zone, distance, pace/speed, calories, pause/finish
    sport/WorkoutSummaryScreen.tsx # results, route shape, heart-rate chart, zones; save/discard or delete
    sport/HeartRateScreen.tsx     # connect the watch's Broadcast Heart Rate, live bpm, zones
    coach/CoachScreen.tsx         # API key setup, two-week analysis, chat with the coach
    trends/TrendsScreen.tsx   # 7-day chart per metric + all-metric comparison cards
    learn/LearnScreen.tsx     # add learning sessions, today's list, topics this week
    profile/                  # ProfileScreen, EditProfileScreen, GoalsScreen
    tracker/                  # LogHealthScreen, SummaryScreen, WatchScreen (pushed over the tabs)
```

## Architecture

### Navigation

`App.tsx` renders the auth stack or the signed-in app depending on `useSession().signedIn`:

```
AuthStack (NativeStack)       ← when signed out
  Root → Login | SignUp → Verification → (signup: signed in) | (reset: CreateNewPassword → Login)

AppStack (NativeStack)        ← when signed in
  Tabs (BottomTabs): Today | Sport | Trends | Learn | Profile
  LogHealth, Summary, Watch, Goals, EditProfile, HeartRate, Coach, Workout, WorkoutSummary   ← opened from any tab
```

Login and sign-up call `signIn()`; Profile's Log out calls `signOut()`. Type screens with `TabScreenProps<'Today'>`, `AppScreenProps<'Watch'>` or `AuthScreenProps<'Login'>` from `src/types/navigation.ts`. From a tab, open another tab with `navigation.navigate('Tabs', { screen: 'Sport' })`. Finishing a workout replaces `Workout` with `WorkoutSummary`, so Back returns to the tabs.

### Data and the Garmin watch

- **Manual data** (`TrackerData.health`, `sessions`) is entered in Log health, the Today water button and Learn.
- **Watch data** (`TrackerData.watch`, one `WatchDay` per date) comes from Health Connect, where Garmin Connect writes it after each watch sync. `readWatchDays` reads raw records, prefers records whose origin matches `/garmin/i` (so phone or other-app data is not double counted), and falls back to Health Connect aggregates when no Garmin records exist. It syncs 14 days on launch, on returning to the app, every minute while open, and on "Sync now".
- **Merging:** `effectiveHealth()` uses a manual value when one is entered, otherwise the watch value; for exercise, the larger of watch activities and Jing workouts (the same session is often on both). The streak counts days with something logged or recorded in Jing, not watch-only days.
- **Diagnostics:** `diagnoseWatch()` lists, per record type, how many records Health Connect has for the last 7 days and which apps wrote them. The Watch screen turns this into a plain-language reason when data is missing (e.g. "no data from Garmin Connect").
- **Live heart rate** does not go through Health Connect. The watch's *Broadcast Heart Rate* advertises the standard BLE Heart Rate service (0x180D / 0x2A37); `LiveHeartRateContext` scans, connects, parses packets with `parseHeartRateMeasurement`, keeps ~2 minutes of samples for the chart, and tracks min/avg/max and time in zones (zones from `goals.maxHeartRate`). It retries up to 3 times after an unexpected disconnect.

### Sport mode

- `WorkoutContext` holds one active workout. Moving time is computed from timestamps (`startedAt`, `pausedMs`, `pausedAt`), not a ticking counter, so it stays exact.
- GPS sports use `expo-location` `watchPositionAsync` while the app is open (no background location). Fixes worse than 30 m accuracy and jumps faster than 40 m/s are ignored; distance is not added while paused. The route is thinned to ≤400 points when saved.
- Heart rate comes from `LiveHeartRateContext` when the watch is broadcasting; each new sample adds to avg/max, zone seconds and a 10-second series for the summary chart.
- Calories are an estimate: MET (per sport, in `SPORTS`) × `goals.weightKg` × hours.
- **Finish** stores a `draft`; the summary screen saves it to `TrackerData.workouts` or discards it. If the user leaves without choosing, the Sport tab shows an "Unsaved" banner.

### AI Coach

- The user picks the service (Gemini or Claude) when saving a key; `detectProvider` preselects it from the prefix (`AQ.` or `AIza` → Gemini, `sk-ant-` → Claude) but never blocks an unknown format, since Google changed its key format in 2026. `services/ai.ts` routes each request by the saved provider; `coach.ts` only calls `askAI` and stays provider-neutral. Replies are validated in `parseReport`, so a reply in the wrong shape becomes an error message rather than a broken screen.
- `services/gemini.ts` posts to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with `x-goog-api-key`, `systemInstruction`, `contents` (assistant → `model` role) and, for reports, `responseMimeType: application/json` + `responseJsonSchema` (with `additionalProperties` removed). A 404 moves on to the next model in `GEMINI_MODELS`; `promptFeedback.blockReason` or a safety-type `finishReason` is a refusal; `MAX_TOKENS` is truncation; an "API key" 400 and 401/403 are auth errors, shown with Google's own reason. Both key formats go in the `x-goog-api-key` header (not a Bearer token).
- `services/claude.ts` posts to `https://api.anthropic.com/v1/messages` with `anthropic-version: 2026-10-21`, model `claude-opus-5-5`, `output_config.effort: "medium"`, and server-side refusal fallbacks (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). It checks `stop_reason` (`refusal`, `max_tokens`) before reading text blocks. On web it adds `anthropic-dangerous-direct-browser-access`.
- Both clients share `postJson` in `aiTypes.ts` (120 s timeout, two retries for network errors, 429 and 5xx/529) and throw `AiError`; `describeAiError` in `ai.ts` turns its kind into user-facing text.
- `services/coach.ts` builds a compact JSON of the last 14 days (`buildDataContext`; unrecorded fields are left out) and has one system prompt. Reports use structured outputs (`output_config.format` JSON schema → `CoachReport`); the chat is plain text, and the first user turn carries the data so follow-ups keep it.
- Two-week reports are cached in AsyncStorage (`jing.coach.v1`); workout reports are saved on the workout (`Workout.coachReport`) so they are not requested twice. Nothing is sent until the user taps Analyse or Ask.

### Theme

All colors come from `src/theme/colors.ts` — import the `Colors` object, never use raw hex strings inline:

| Token | Usage |
|---|---|
| `background`, `card`, `cardRaised`, `ringTrack` | surfaces, ring/bar tracks |
| `primary` | buttons, active tab, links |
| `white`, `gray`, `placeholder`, `inputBorder` | text and inputs |
| `success`, `danger`, `overlay` | trend up/down, destructive actions, modal backdrop |
| `steps`, `heart`, `sleep`, `water`, `exercise`, `learning`, `mood` | one accent per metric — use the same one for its icon, ring and chart |
| `zone1`–`zone5` | heart-rate zones |

### Shared Components

- **`AuthButton`** — full-width primary pill button (`title`, `onPress`, `style?`).
- **`AuthInput`** — labelled text field; all `TextInputProps` plus `label`, `secureToggle`.
- **`ScreenHeader`** — back arrow + centered title for pushed screens.
- **`Stepper`** — label + −/+ number row (`step`, `min`, `max`, `format`).
- **`ProgressRing`** — one or more concentric SVG rings (`rings: { progress, color }[]`), children render in the center.
- **`BarChart`**, **`Sparkline`**, **`TrendCard`**, **`IconBadge`** — charts and metric cards.

## Conventions

- **No inline colors** — always use `Colors.*` from `src/theme/colors.ts`.
- **Type every navigation prop** with the helpers in `src/types/navigation.ts`; never use `any` or untyped `useNavigation()`.
- **StyleSheet.create** at the bottom of each file; inline style objects only for computed values (widths, per-metric colors).
- **Platform-specific services** use `name.android.ts` + a `name.ts` fallback with identical exports, so web/iOS keep compiling and rendering.
- **Mock auth only** — there is no API or auth service; forms navigate forward without checking credentials.
- **Portrait only** — locked in `app.json`.

## Known Gaps / Next Steps

1. **Real auth/backend** — sign-in is local only. The AI Coach uses the user's own API key from the phone, which suits a personal app; a published app should call the AI provider through its own server instead.
2. **iOS watch support** — Health Connect and BLE are wired for Android only (iOS would need HealthKit and BLE permission strings).
3. **Background workouts** — GPS only counts while Jing is open (the screen is kept on); recording with the screen locked would need a location foreground service.
4. **Real-time steps** — only heart rate is live; steps, sleep and activities arrive when Garmin Connect syncs to Health Connect. Truly live steps would need a Connect IQ watch app or Garmin's licensed Health SDK.
5. **Notification text** is fixed when scheduled; it reflects data as of the last time the app was open.
6. **Unused auth assets** — the social sign-in buttons on the welcome screen do nothing.
