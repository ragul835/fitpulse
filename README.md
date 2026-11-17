# FitPulse — Fitness & Activity Tracking

A full-stack mobile fitness app: log workouts, track daily steps / calories / active
minutes against Apple-style progress rings, set goals, and watch everything update live.

**Stack:** React Native (Expo SDK 51) + expo-router + TypeScript · Node + Express + Mongoose ·
MongoDB · Socket.io · JWT auth · react-native-svg charts

Runs on **web, iOS, and Android** from one codebase.

---

## Features

- **Auth** — JWT sign-up / sign-in; profile persists across sessions.
- **Home dashboard** — triple activity rings (steps / calories / active minutes), day streak,
  weekly steps bar chart, and recent workouts. Pull to refresh.
- **Workouts** — log Run / Walk / Cycle / Strength / Yoga / HIIT / Swim with duration, auto-estimated
  calories, distance, and intensity; filter by type; delete. Logging a workout rolls into that day's
  activity totals automatically.
- **Activity** — today's steps/calories/active/distance, quick "log steps", and 7- or 30-day
  bar charts per metric.
- **Goals** — create daily/weekly targets (steps, calories, workouts, distance, active minutes);
  progress is computed live from your logged data.
- **Profile** — editable body stats (age, height, weight, goal weight) with live BMI, and editable
  daily targets that drive the dashboard rings.
- **Water tracking** — daily hydration with a glasses tracker and +250 / +500 ml quick-add; shown on the
  dashboard and the Activity screen against a configurable daily goal.
- **Weight log & trend** — log body weight and see a trend line chart converging on your goal weight.
- **Achievements** — 11 unlockable badges (bronze / silver / gold) computed from your data: workout counts,
  streaks, total distance, calories, variety and more, each with live progress.
- **Leaderboard** — weekly-steps ranking across all athletes, with medals and your own rank highlighted.
- **Real-time** — Socket.io pushes live updates to the rings, charts, goals, water, and leaderboard across screens.

## Architecture / ports

| Service        | Port  | Notes                                             |
| -------------- | ----- | ------------------------------------------------- |
| Expo (web/Metro)| 8081  | React Native app — web, or Expo Go on a phone     |
| API + Socket.io| 4002  | Express + Mongoose                                |
| MongoDB        | 27018 | `mongodb-memory-server` — persistent, no Docker   |

> Ports differ from StockPilot (4001 / 27017) so both projects can run side by side.
> MongoDB runs via `mongodb-memory-server` (persists to `server/data/mongo`) — **no Docker,
> sudo, or system MongoDB install needed.**

## Quick start

Use the colored management menu:

```bash
./manage.sh
```

1. **Option 7** — First-time setup (install deps → start MongoDB → seed sample data)
2. **Option 6** — Start Web in the browser → open **http://localhost:8081**
   *(or **Option 5** to run `expo start` and scan the QR code with the Expo Go app on your phone)*

### Manual commands

```bash
# server
cd server && npm install
npm run mongo    # start MongoDB on :27018 (keep running)
npm run seed     # sample data
npm run dev      # API on :4002

# client
cd client && npm install --legacy-peer-deps
npx expo start --web   # web on :8081   (or `npx expo start` for the QR code)
```

## Demo accounts

Password for all: `password123`

| User   | Email               | Data            |
| ------ | ------------------- | --------------- |
| Alex   | alex@fitpulse.dev   | 45 days history |
| Jordan | jordan@fitpulse.dev | 30 days history |

## Running on a real phone

1. Install **Expo Go** (App Store / Play Store).
2. Run `./manage.sh` → option 5, make sure your phone is on the same Wi-Fi, and scan the QR code.
   The app auto-detects your computer's LAN IP for the API.

## Project layout

```
fitpulse/
├── manage.sh                # colored management menu
├── server/                  # Express + Mongoose + Socket.io API
│   ├── src/
│   │   ├── models/          # User, Workout, ActivityLog, Goal
│   │   ├── routes/          # auth, workouts, activity, goals, dashboard
│   │   ├── lib/             # jwt, http, dates
│   │   ├── realtime.ts
│   │   ├── seed.ts
│   │   └── index.ts
│   └── scripts/start-mongo.mjs
└── client/                  # Expo (React Native) app
    ├── app/                 # expo-router routes
    │   ├── _layout.tsx      # providers + auth-gated navigation
    │   ├── login.tsx
    │   ├── workout-new.tsx  # "log workout" modal
    │   └── (tabs)/          # Home, Workouts, Activity, Goals, Profile
    ├── components/          # ActivityRings, BarChart, ui, ProgressRing
    └── lib/                 # api, auth, socket, theme, types, toast
```
