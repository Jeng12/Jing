# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jing** is a React Native (Expo) bot/app project.

## Commands

```bash
npm install          # install dependencies
npm start            # start Expo dev server
npm run android      # run on Android
npm run ios          # run on iOS (macOS only)
npm run web          # run in browser
```

## Project Structure

```
App.js               # root component
src/
  screens/
    auth/            # login, registration screens
    home/            # main home screen
    search/          # search screen
    profile/         # user profile screen
  components/        # shared/reusable components
assets/              # images, fonts, and other static files
```

## Architecture

- Entry point is `index.js` → `App.js`
- Screens live under `src/screens/` grouped by feature area
- Shared UI components go in `src/components/`
- Expo SDK ~54 with React Native 0.81 and React 19
