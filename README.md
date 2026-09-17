# FitJourney

FitJourney is a private, offline-first Progressive Web App for tracking weight, nutrition,
exercise, hydration, sleep, and adherence to a doctor-prescribed semaglutide plan. It is a
tracking and coaching tool — it never recommends, changes, or infers medication dosing.

> Your medication plan should always follow your doctor's prescription. This app tracks
> information and reminders; it does not prescribe, diagnose, or modify treatment.

## Tech stack

- React 19 + TypeScript (strict) + Vite 8
- Tailwind CSS v4 for styling, Radix UI primitives (Dialog/Tabs/Switch) for accessible components
- Dexie.js over IndexedDB for local-first storage (`src/db/db.ts`)
- Recharts for charts, `date-fns` for date handling
- `vite-plugin-pwa` (Workbox) for the service worker, app manifest, and offline caching
- Browser Notifications API for reminders (foreground-only — see Known limitations)
- Vitest + fake-indexeddb for unit tests

No backend is required or used. All data lives in the browser's IndexedDB on the user's device.

## Project structure

```
src/
  components/     Shared UI (components/ui = design-system primitives)
  layouts/        AppLayout (sidebar + bottom nav), nav config
  pages/          One file per route/screen
  hooks/          useOnlineStatus, useTheme
  db/             Dexie database definition (single source of schema truth)
  services/       All read/write business logic against Dexie (no React here)
  analytics/      Rule-based insights engine (no LLM — pure functions over local data)
  utils/          Pure calculation helpers (rolling averages, streaks, BMI, CSV, backup, ids)
  types/          Shared TypeScript interfaces for every entity
```

Business logic lives in `services/` and `utils/`, not in components — this is what makes the
calculation and backup logic unit-testable without a browser.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev          # start Vite dev server with HMR
npm run test         # run the vitest suite once
npm run test:watch   # watch mode
npm run lint         # oxlint
```

## Production build

```bash
npm run build         # tsc -b && vite build -> dist/
npm run preview       # serve the production build locally to sanity-check the PWA
```

## Installing as a PWA

1. Build and serve the app over HTTPS (or `npm run preview` locally over HTTP for testing —
   installability requires a secure context in real deployments).
2. **Android/Chrome**: open the site, then use the browser's "Install app" / "Add to Home
   Screen" prompt (or the install icon in the address bar). The app installs with its own
   icon, splash screen, and runs standalone (no browser chrome).
3. **iOS/Safari**: Share → "Add to Home Screen".
4. **Desktop (Chrome/Edge)**: an install icon appears in the address bar.

Once installed, the app shell, all routes, and previously-visited pages work fully offline —
Workbox precaches the built assets and IndexedDB holds all user data locally.

## Database / storage architecture

Everything is stored in a single IndexedDB database (`fitjourney`) managed by Dexie, with one
object store per entity: `users`, `weightEntries`, `foods`, `meals`, `nutritionEntries`,
`waterEntries`, `exerciseEntries`, `sleepEntries`, `medications`, `medicationLogs`,
`symptomEntries`, `measurements`, `progressPhotos` (blobs), `dailyCheckins`, `habits`,
`habitLogs`, `reminderSettings`, `appSettings`. Every record carries `createdAt`/`updatedAt`.
See `src/types/models.ts` for the full schema and `src/db/db.ts` for the Dexie definition.

The app is single-profile-per-device (profile id `"me"`) but every service function is
written against a plain Dexie table, so adding multi-profile or a sync backend later mainly
means changing how records are keyed and adding a sync layer — not rewriting the UI.

## Testing

```bash
npm run test
```

55 tests cover: BMI/rolling-average/progress-percent/streak calculations and their edge cases
(no history, multiple same-day entries, all-zero targets), nutrition total aggregation and
serving-size scaling, medication schedule generation and dose-status logic (including that a
missed dose never changes future schedule dates), habit streak accumulation and resets, and
full backup export → wipe → import round-tripping plus corrupt-file rejection. Dexie is
backed by `fake-indexeddb` in tests so they run in Node without a real browser.

## Implemented features

- Onboarding (profile, goals, units, activity level, diet, allergies) + editable Profile page
- Dashboard: weight + 7-/30-day trend, progress %, nutrition/water/medication/exercise/sleep
  summary, best active habit streak
- Weight: multiple entries/day, daily/7-day/30-day average charts, start-vs-current-vs-target
  chart, CSV export
- Nutrition: reusable foods, meals, quick-add, per-macro progress bars, configurable targets,
  gentle low-calorie-target nudge (never auto-adjusted)
- Water: quick-add buttons, custom amount, configurable goal, animated bottle visual
- Exercise: categorized logging, weekly summary (sessions/minutes/active days/strength vs
  cardio)
- Sleep: bedtime/wake/quality logging, plain-language pattern summaries vs weight/exercise/
  nutrition (explicitly correlation-worded, never causal)
- Medication: user-entered prescription details, visual schedule (taken/upcoming/missed),
  dose logging (site/actual dose/notes), configurable reminders, persistent safety disclaimer
- Symptoms: severity-scored log, optional link to a medication entry with "recorded after"
  (not "caused by") wording
- Safety & medical help: emergency-care guidance, configurable emergency/doctor/clinic/
  hospital contacts
- Measurements (waist/chest/hips/neck/arms/thighs/body-fat/custom) with trend charts
- Progress: weight lost/percent lost, start→target bar, latest measurements, local-only
  progress photos
- Daily check-in (fast 10-question form), Habits (streaks, "start again today" framing, not
  punitive), Weekly review (auto-computed 7-day summary across every domain), Insights
  (rule-based, no LLM, explicitly non-diagnostic)
- Settings: full JSON backup export/import (validated, confirmation required before
  overwrite), weight CSV export, delete-all-data, per-reminder-type notification toggles
- Dark mode, responsive sidebar (desktop) / bottom nav (mobile), online/offline indicator

## Known limitations

- **Reminders are foreground-only.** There is no push server, so notifications only fire
  while the installed app/tab is open in the browser; there is no way to wake a fully closed
  app on a schedule without a backend and the Push API. This is disclosed in-app (Settings).
- **Single profile per device**, by design for the MVP — no accounts, no cloud sync.
- **CSV export** is provided for weight history from the Weight and Settings pages; other
  domains export via the full JSON backup rather than per-table CSVs.
- **No automated end-to-end/UI test suite** — the 55 Vitest tests cover calculation and
  service-layer logic; page components were manually smoke-tested in a real Chromium browser
  (onboarding → dashboard → logging flows → dark mode) rather than covered by automated
  component tests, given the scope of this MVP.
- Body-fat percentage and custom measurements are user-entered values, not measured by the
  app.

## Future backend/cloud-sync architecture

The service layer (`src/services/*.ts`) is the seam for this. Each function currently talks
directly to Dexie; introducing sync would mean:

1. Add a `syncStatus`/`remoteId` field to each entity (types already carry `updatedAt` for
   last-write-wins or vector-clock style conflict resolution).
2. Introduce an authentication step (the app already assumes no auth exists yet — see
   `src/services/profile.ts`'s single `PROFILE_ID` — this would become the multi-user key).
3. Add a sync service that reads/writes the same Dexie tables and pushes/pulls deltas to a
   backend (REST or a sync engine), keeping IndexedDB as the local cache/offline queue so the
   app keeps working offline exactly as it does today.
4. Swap the foreground reminder scheduler for real Web Push, registered through the existing
   service worker (`vite-plugin-pwa` already manages the SW lifecycle).

None of the UI or business logic in `pages/` would need to change for this — they only ever
call into `services/`.
