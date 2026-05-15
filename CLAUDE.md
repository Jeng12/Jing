# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jing** is a React Native (Expo) movie streaming app (CINEMAX theme).

## Commands

```bash
npm install          # install dependencies
npm start            # start Expo dev server
npm run android      # run on Android
npm run ios          # run on iOS (macOS only)
npm run web          # run in browser
npm run typecheck    # run TypeScript type check (tsc --noEmit)
```

## Project Structure

```
App.tsx              # root component — navigation wiring only
index.ts             # Expo entry point
src/
  types/
    navigation.ts    # all stack/tab param list types + shared interfaces (Movie, Review, CastMember)
  theme/
    colors.ts        # color constants (dark navy background, teal accent)
  data/
    movies.ts        # mock movie/review/cast data
  components/
    AuthButton.tsx   # full-width teal pill button
    AuthInput.tsx    # labelled text input with optional secure-text toggle
  screens/
    auth/            # RootScreen, LoginScreen, SignUpScreen, VerificationScreen,
                     # ResetPasswordScreen, CreateNewPasswordScreen
    home/            # HomeScreen (movie grid + category tabs), DetailScreen (About/Reviews/Cast tabs)
    search/          # SearchScreen (live filter + empty state)
    profile/         # ProfileScreen (settings menu + logout modal), EditProfileScreen
assets/              # app icons and splash images
```

## Architecture

- Entry: `index.ts` → `App.tsx`
- Navigation: React Navigation with a top-level `AuthStack` (native-stack). The `MainTabs` bottom-tab navigator (Home, Search, Watch list, Profile) lives inside `App.tsx` but is not yet connected to the auth flow — wire it in after login.
- Nested navigators: `HomeNavigator` (HomeStack) and `ProfileNavigator` (ProfileStack) are nested inside their respective bottom tabs to support pushing `DetailScreen` and `EditProfileScreen`.
- All navigation param types are defined in `src/types/navigation.ts` and used with `NativeStackNavigationProp` / `RouteProp` throughout.
- Shared theme: `src/theme/colors.ts` — background `#1C1C2E`, card `#252545`, primary teal `#00D4D4`.
- Expo SDK ~54, React Native 0.81, React 19, TypeScript 6.
