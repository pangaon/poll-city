# Poll City Canvasser — Mobile App

React Native + Expo app for field canvassing operations.

## Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- iOS: Xcode 15+ (Mac only, for local builds)
- Android: Android Studio with API 34 SDK

## Setup

```bash
cd mobile
npm install
npx expo start
```

## Development

```bash
# Start dev server with Expo Go
npx expo start

# Run on iOS simulator (Mac only)
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

## Environment

Create `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://app.poll.city
EXPO_PUBLIC_WS_URL=wss://app.poll.city
```

For local development against the Next.js web app:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

Use your machine's local IP (not localhost) so the phone/emulator can reach it.

## Building for Stores

```bash
# Login to EAS
eas login

# Configure project (first time only)
eas build:configure

# Build for iOS App Store
eas build --platform ios --profile production

# Build for Google Play
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Project Structure

```
mobile/
  app/                    # Expo Router screens
    (tabs)/               # Tab navigator
      index.tsx           # Dashboard tab
      canvass/            # Canvass tab screens
        index.tsx         # Turf selection
        [turfId].tsx      # Walk list + door screen
      gotv/               # GOTV tab screens
        index.tsx         # Gap + priority list
      social/             # Social tab screens
        index.tsx         # Civic profile
      more/               # Settings tab
        index.tsx         # Settings menu
    _layout.tsx           # Root layout
    login.tsx             # Auth screen
  components/             # Shared UI components
    door-result-buttons.tsx
    gap-display.tsx
    map-view.tsx
    offline-indicator.tsx
    sync-status.tsx
  lib/
    api.ts                # API client with auth headers
    auth.ts               # JWT storage and refresh
    db.ts                 # SQLite schema and queries
    sync.ts               # Offline mutation queue + sync engine
    notifications.ts      # Push notification registration
  hooks/
    use-offline-contacts.ts
    use-sync-status.ts
    use-location.ts
    use-canvass-session.ts
  assets/
    icon.png              # 1024x1024 app icon
    adaptive-icon.png     # Android adaptive icon foreground
    splash.png            # Splash screen image
```

## Architecture

See `docs/MOBILE_APP_ARCHITECTURE.md` for the complete architecture document covering:
- Technology decisions and App Store compliance
- Offline-first SQLite architecture
- Push notification setup (APNs + FCM)
- API endpoint inventory
- Security considerations

## Key Design Principles

1. **One hand, one thumb.** Every canvassing interaction works one-handed with 56px+ touch targets.
2. **Offline first.** All canvass data cached in SQLite. Mutations queued and synced when online.
3. **Sub-100ms interactions.** Door results and strike-offs are instant local writes.
4. **No data loss.** Every tap is persisted locally before any network call.
