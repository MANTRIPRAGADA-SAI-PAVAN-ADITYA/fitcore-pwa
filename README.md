# LooP — Your Personal Cut & Strength Trainer

## Why This App Was Built

LooP was built out of a simple frustration: every fitness app out there either locks the good stuff behind a paywall, drowns you in ads, or requires an internet connection just to see your workout. When you're mid-session and your data disappears because the server hiccuped — that's not acceptable.

The app was built specifically for a **cutting phase** (losing fat while preserving muscle mass). Most apps treat weight loss and strength training as separate goals. LooP treats them as one: you track your lifts to protect your muscle, and you track your weight to stay on course with your cut. Everything in one place, offline, always fast.

There's also a deeper reason: understanding *why* you're doing each exercise matters. Generic stick figures don't teach you anything. LooP shows you exactly which muscles you're targeting — in colour, on a body silhouette — so you can feel the right muscles working instead of guessing.

---

## What LooP Does

**LooP is a zero-dependency, offline-first Progressive Web App (PWA)** for people who want to cut body fat and build strength simultaneously. Install it on any phone like a native app — no App Store required.

### Core Features

- **Smart Workout Planner** — A weekly Push / Pull / Legs / Full Body schedule with 69 pre-loaded exercises covering every muscle group from calves to traps to rear delts.

- **Muscle-Highlight Body Cards** — Every exercise card shows a geometric body silhouette with the targeted muscles lit up in colour. Primary muscles glow at full brightness; secondary muscles at half. Back-side muscles are labelled so you always know which view you're looking at.

- **Active Workout Mode** — Step-by-step set tracking with weight & rep logging, a rest timer, skip-exercise control, and a full workout summary sheet at the end (total minutes, sets completed, exercises done, PRs hit, muscles worked).

- **Progress Dashboard** — A clean KPI strip (current weight, streak, workouts, PRs), a 6-week weight bar chart, a full-month workout calendar colour-coded by type, a body heat map showing which muscles got the most volume this month, and per-exercise PR sparklines showing your weight progression over time.

- **Exercise Detail** — Four-tab deep-dive per exercise: Guide (instructions, form cues, common mistakes, breathing pattern, similar exercises), Stats (sets/reps/rest, PR with weight progression chart), History (last 5 sessions logged for that exercise), and Notes.

- **Personal Records** — Automatically tracked per exercise. Every new PR is logged with date and weight, so sparklines show your actual progression curve over time.

- **Fully Offline (PWA)** — Registered service worker caches all assets on first load. Works with zero internet after that. Installable on iOS and Android from the browser.

- **100% Local Storage** — No accounts, no servers, no tracking. All your data stays on your device.

### Muscle Groups Covered

Chest · Back · Lats · Shoulders · Rear Delts · Traps · Neck · Biceps · Triceps · Forearms · Core · Glutes · Quads · Hamstrings · Calves

---

## Tech Stack

- Vanilla JS + CSS — zero frameworks, zero build steps
- Single HTML file (`index.html`) — the entire app
- PWA: `manifest.json` + `sw.js` (cache-first service worker)
- `localStorage` for all persistence

## Install as PWA

1. Open `index.html` in Chrome or Safari on your phone
2. Tap **Share → Add to Home Screen** (iOS) or the install prompt (Android/Chrome)
3. Done — it runs like a native app, offline, forever
