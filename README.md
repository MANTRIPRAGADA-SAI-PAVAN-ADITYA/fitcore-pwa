# LooP — India's Freight Network

LooP is a **Progressive Web App (PWA)** connecting truck drivers and load owners across India.

## What it is

- Drivers post available truck routes; load owners post cargo that needs moving
- Real-time matching, in-app chat, GPS trip tracking, and a credit-based contact unlock system
- KYC verification, trust scoring (LooP Score), and managed vs. ad-mode listings
- Installable as a PWA on Android and iOS (Add to Home Screen)

## Tech stack

- **Frontend**: Expo Router (React Native Web), React Native Paper
- **Backend**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **State**: Zustand
- **Deployment**: Vercel (PWA static export)

## Local development

```bash
cp .env.example .env   # fill in your Supabase credentials
npm install
npm run web            # Expo dev server with web
```

## Build & deploy

```bash
npm run build:web      # outputs to dist/
```

PWA assets (manifest, service worker, icons) live in `public/` and are copied into `dist/` at build time.

## Environment variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon (publishable) key |
