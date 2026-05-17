# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jing** is a React Native (Expo) movie streaming app styled with a CINEMAX dark theme. It includes a complete authentication flow, movie browsing with category tabs, a search screen, movie detail pages, and a user profile section. All data is currently mocked locally — no backend is connected.

## Commands

```bash
npm install          # install dependencies
npm start            # start Expo dev server
npm run android      # run on Android
npm run ios          # run on iOS (macOS only)
npm run web          # run in browser
npm run typecheck    # run TypeScript type check (tsc --noEmit)
```

## Tech Stack

- **Expo SDK** ~54.0.33
- **React** 19.1.0 / **React Native** 0.81.5
- **TypeScript** 6.0.3 (strict mode, path alias `@/*` → `./src/*`)
- **React Navigation** 7.x — `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`
- **New Architecture** enabled (app.json)

## Project Structure

```
App.tsx              # root component — all navigator definitions + wiring
index.ts             # Expo entry point (registerRootComponent)
app.json             # Expo config (name: JingTemp, portrait, new arch on)
tsconfig.json        # strict TS, extends expo/tsconfig.base, @/* alias
assets/              # icon.png, adaptive-icon.png, splash-icon.png, favicon.png
src/
  types/
    navigation.ts    # param lists for all stacks/tabs + Movie, Review, CastMember interfaces
  theme/
    colors.ts        # all color constants (see Theme section below)
  data/
    movies.ts        # mock arrays: FEATURED_MOVIES, NOW_PLAYING, MOVIE_REVIEWS, MOVIE_CAST
  components/
    AuthButton.tsx   # full-width teal pill button (title, onPress, style?)
    AuthInput.tsx    # labelled TextInput with optional password-visibility toggle
  screens/
    auth/
      RootScreen.tsx              # landing page — CINEMAX logo, Sign Up, Login, social buttons
      LoginScreen.tsx             # email + password form, forgot password link
      SignUpScreen.tsx            # name + email + password, terms checkbox → Verification
      VerificationScreen.tsx      # 4-digit OTP, auto-focus between fields, resend link
      ResetPasswordScreen.tsx     # email input → Verification
      CreateNewPasswordScreen.tsx # new + confirm password → Login
    home/
      HomeScreen.tsx    # search bar, featured carousel, category tabs, 3-col poster grid
      DetailScreen.tsx  # hero image, About/Reviews/Cast tabs, driven by movie route param
    search/
      SearchScreen.tsx  # live case-insensitive filter of NOW_PLAYING, empty state, → Detail
    profile/
      ProfileScreen.tsx     # avatar, premium banner, settings sections, logout modal
      EditProfileScreen.tsx # edit name/email/password/phone, name validation
```

## Architecture

### Navigation

All navigators are defined and composed in `App.tsx`:

```
AuthStack (NativeStack)           ← currently the only rendered navigator
  Root → Login → SignUp → Verification → ResetPassword → CreateNewPassword

MainTabs (BottomTabs)             ← defined but NOT yet wired into AuthStack
  Home tab   → HomeNavigator (NativeStack)
                  HomeMain → Detail
  Search tab → SearchScreen
  WatchList  → (placeholder, no screen yet)
  Profile    → ProfileNavigator (NativeStack)
                  ProfileMain → EditProfile
```

**Key gap:** After a successful login, nothing navigates to `MainTabs`. Wiring this is the next critical step — replace the `AuthStack` root with a conditional render based on auth state, or add a `navigate('MainTabs')` call from `LoginScreen`/`SignUpScreen`.

All param lists are in `src/types/navigation.ts` and typed with `NativeStackNavigationProp` / `RouteProp` throughout screens.

### Theme

All colors come from `src/theme/colors.ts` — import the `Colors` object, never use raw hex strings inline:

| Token | Hex | Usage |
|---|---|---|
| `Colors.background` | `#1C1C2E` | screen backgrounds |
| `Colors.card` | `#252545` | card / input backgrounds |
| `Colors.primary` | `#00D4D4` | buttons, active tabs, accents |
| `Colors.white` | `#FFFFFF` | primary text |
| `Colors.gray` | `#9E9E9E` | secondary text |
| `Colors.placeholder` | `#6B6B8A` | input placeholder text |
| `Colors.inputBorder` | `#3A3A5C` | text input borders |

### Data Layer

`src/data/movies.ts` exports four arrays used across screens:

- `FEATURED_MOVIES` — 2 items, shown in HomeScreen horizontal carousel
- `NOW_PLAYING` — 4 items, shown in HomeScreen grid and filtered by SearchScreen
- `MOVIE_REVIEWS` — 2 review objects consumed by DetailScreen Reviews tab
- `MOVIE_CAST` — 4 cast members consumed by DetailScreen Cast tab

The `Movie` / `Review` / `CastMember` interfaces are defined in `src/types/navigation.ts` (not a separate file).

### Shared Components

**`AuthButton`** — use for any full-width action button. Props: `title`, `onPress`, optional `style` override.

**`AuthInput`** — use for any form text field. Accepts all `TextInputProps` plus `label` (displayed above), `secureToggle` (boolean, shows eye icon for password visibility).

## Conventions

- **No inline colors** — always use `Colors.*` from `src/theme/colors.ts`.
- **Type every navigation prop** — use the param lists from `src/types/navigation.ts`; never use `any` or untyped `useNavigation()`.
- **Route params are the data source** — DetailScreen receives the full `Movie` object via route params; screens do not fetch or import mock arrays directly when they can receive data through navigation.
- **StyleSheet.create** — define styles with `StyleSheet.create` at the bottom of each file, not inline style objects.
- **Mock data only** — there is no API or auth service. Forms navigate forward unconditionally (except EditProfileScreen's name check).
- **Portrait only** — the app is locked to portrait orientation in `app.json`.

## Known Gaps / Next Steps

1. **Auth → Main navigation not wired** — `MainTabs` is never rendered; add conditional navigation from `LoginScreen` after "sign in".
2. **WatchList tab** — exists in `MainTabParamList` but has no screen component.
3. **Category tabs (HomeScreen)** — the 4 tabs (Now Playing, Upcoming, Top Rated, Popular) are rendered but all show the same `NOW_PLAYING` data; each needs its own dataset.
4. **Real auth/backend** — all auth screens are UI-only shells.
5. **Search scope** — `SearchScreen` only filters `NOW_PLAYING`; `HomeScreen` search bar is a local state that does not navigate to `SearchScreen`.
