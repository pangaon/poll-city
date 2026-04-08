# Poll City Mobile

React Native + Expo app for campaign management field operations.

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- iOS: Xcode 15+ (Mac only, for local builds)
- Android: Android Studio with API 34 SDK

## Setup

```bash
cd mobile
npm install
```

Copy the env example and set your API URL:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
EXPO_PUBLIC_API_URL=https://your-app.vercel.app
```

For local development against the Next.js web app, use your machine's local IP (not localhost):

```
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

## Run

```bash
npx expo start
```

Then press `i` for iOS simulator or `a` for Android emulator. Or scan the QR code with Expo Go on a physical device.

## EAS Builds

First time: log in and configure the project.

```bash
eas login
eas build:configure
```

Development build (for simulator, unlocks native modules):

```bash
eas build --platform ios --profile development
```

Production build:

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

## Note on lucide-react-native

If you get icon errors, ensure lucide-react-native and react-native-svg are installed:

```bash
npm install lucide-react-native react-native-svg
```

## Project Structure

```
mobile/
  app/
    (auth)/
      login.tsx             — Email + password login
    (app)/
      _layout.tsx           — Stack navigator (legacy canvassing screens)
      walk-list.tsx         — Detailed walk list with progress tracking
      door/[id].tsx         — Door knock result entry with undo
      campaigns.tsx         — Campaign selector
      shift-summary.tsx     — End-of-shift stats
    (tabs)/
      _layout.tsx           — Tab navigator (Canvassing, Contacts, Alerts, Settings)
      canvassing/index.tsx  — Walk list + inline visit recording modal
      contacts/index.tsx    — Contact search + detail sheet
      alerts/index.tsx      — Campaign alerts with web app deep links
      settings/index.tsx    — User info, campaign, sync, sign out
    _layout.tsx             — Root layout with auth guard
    index.tsx               — Redirects to canvassing tab
  components/
    offline-indicator.tsx   — Network status banner
  lib/
    api.ts                  — Typed API client with JWT auth + refresh
    auth.ts                 — Auth context (signIn, signOut, user state)
    store.ts                — AsyncStorage walk list cache + pending interactions
    sync.ts                 — Offline mutation queue with NetInfo + retry
    types.ts                — Shared TypeScript types
  hooks/
    use-sync-status.ts      — Sync queue status hook
```

## Key Design Principles

1. **Offline first.** Walk list cached in AsyncStorage. Interactions queued when offline and synced when connectivity returns.
2. **56px+ touch targets.** Every interactive element meets minimum accessible touch target size.
3. **Navy branding.** `#0A2342` navy, `#1D9E75` green, `#EF9F27` amber throughout.
4. **No data loss.** Every tap is persisted locally before any network call.
