# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jing** is a React Native (Expo) health tracking app with a dark theme. It tracks daily health (steps, sleep, exercise, water, mood), learning sessions and heart rate, shows week-over-week trends, and sends a daily summary notification. It reads Garmin watch data on Android two ways: synced data through Health Connect, and live heart rate over Bluetooth. Sign-in is a local mock — there is no backend, and all data stays on the device.

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
- **expo-notifications**, **@react-native-async-storage/async-storage**
- **New Architecture** enabled (app.json)

## Project Structure

```
App.tsx              # providers + navigation: auth stack or signed-in app, tab bar
app.json             # Expo config (name: Jing, portrait, dark, health/BLE permissions via plugins)
src/
  types/
    navigation.ts    # param lists + AuthScreenProps / AppScreenProps / TabScreenProps helpers
    tracker.ts       # LearningSession, HealthLog, WatchDay, TrackerGoals, TrackerData, WatchDiagnostics, MetricKey
  theme/colors.ts    # all colors, including one accent per metric and heart-rate zone colors
  store/
    SessionContext.tsx        # mock sign-in + profile (AsyncStorage 'jing.session.v1')
    TrackerContext.tsx        # logs, goals, watch data, reminder (AsyncStorage 'jing.tracker.v1')
    LiveHeartRateContext.tsx  # Bluetooth scan/connect state, live bpm, session stats, zones
  services/
    healthConnect.android.ts  # reads Garmin data from Health Connect + diagnostics
    healthConnect.ts          # no-op fallback (iOS/web), same exports
    liveHeartRate.android.ts  # BLE Heart Rate service client (react-native-ble-plx)
    liveHeartRate.ts          # no-op fallback (iOS/web), same exports + shared types
    notifications.ts          # daily summary notification (local only)
  utils/
    trackerStats.ts  # pure stats: effectiveHealth, periodTotals, streak, dailyValue, buildSummary, ...
    metrics.ts       # METRICS table (label, unit, color, icon, goal) used by Trends
    heartRate.ts     # BLE packet parsing, base64 decode, heart-rate zones
  components/        # AuthButton, AuthInput, ScreenHeader, Stepper, ProgressRing, BarChart, Sparkline, TrendCard, IconBadge
  screens/
    auth/            # Root (welcome), Login, SignUp, Verification, ResetPassword, CreateNewPassword
    today/TodayScreen.tsx     # dashboard: rings, heart/sleep/water/mood tiles, quick water add
    live/LiveScreen.tsx       # live heart rate: find watch, bpm, zone, sparkline, time in zones
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
  Tabs (BottomTabs): Today | Live | Trends | Learn | Profile
  LogHealth, Summary, Watch, Goals, EditProfile   ← opened from any tab
```

Login and sign-up call `signIn()`; Profile's Log out calls `signOut()`. Type screens with `TabScreenProps<'Today'>`, `AppScreenProps<'Watch'>` or `AuthScreenProps<'Login'>` from `src/types/navigation.ts`. From a tab, open another tab with `navigation.navigate('Tabs', { screen: 'Live' })`.

### Data and the Garmin watch

- **Manual data** (`TrackerData.health`, `sessions`) is entered in Log health, the Today water button and Learn.
- **Watch data** (`TrackerData.watch`, one `WatchDay` per date) comes from Health Connect, where Garmin Connect writes it after each watch sync. `readWatchDays` reads raw records, prefers records whose origin matches `/garmin/i` (so phone or other-app data is not double counted), and falls back to Health Connect aggregates when no Garmin records exist. It syncs 14 days on launch, on returning to the app, every minute while open, and on "Sync now".
- **Merging:** `effectiveHealth()` uses a manual value when one is entered, otherwise the watch value. The streak counts manual logs only.
- **Diagnostics:** `diagnoseWatch()` lists, per record type, how many records Health Connect has for the last 7 days and which apps wrote them. The Watch screen turns this into a plain-language reason when data is missing (e.g. "no data from Garmin Connect").
- **Live heart rate** does not go through Health Connect. The watch's *Broadcast Heart Rate* advertises the standard BLE Heart Rate service (0x180D / 0x2A37); `LiveHeartRateContext` scans, connects, parses packets with `parseHeartRateMeasurement`, keeps ~2 minutes of samples for the chart, and tracks min/avg/max and time in zones (zones from `goals.maxHeartRate`). It retries up to 3 times after an unexpected disconnect.

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

1. **Real auth/backend** — sign-in is local only; data never leaves the phone.
2. **iOS watch support** — Health Connect and BLE are wired for Android only (iOS would need HealthKit and BLE permission strings).
3. **Real-time steps** — only heart rate is live; steps, sleep and activities arrive when Garmin Connect syncs to Health Connect. Truly live steps would need a Connect IQ watch app or Garmin's licensed Health SDK.
4. **Notification text** is fixed when scheduled; it reflects data as of the last time the app was open.
5. **Unused auth assets** — the social sign-in buttons on the welcome screen do nothing.
