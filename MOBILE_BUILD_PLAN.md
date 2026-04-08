# Poll City — iOS & Android Mobile Build Plan

**Target:** App Store + Google Play live before May 1, 2026 (Canadian campaign season)
**Current date:** April 8, 2026 — 23 days to deadline

---

## 1. Technology Choice: React Native + Expo

**Recommendation: Expo SDK 51+ with EAS Build.** This is the right call. Here is why.

### Why Expo / React Native wins

| Factor | Expo | Flutter | Native Swift/Kotlin |
|---|---|---|---|
| Shares TypeScript with web app | Yes — same types, validators, zod schemas | No — Dart | No |
| Calls existing `/api/*` directly | Yes — same fetch() | Yes | Yes |
| Time to first TestFlight build | 1–2 days | 3–5 days | 2–3 weeks |
| OTA updates (no re-review) | Yes — EAS Update | Partial (Shorebird) | No |
| Team already knows the stack | Yes | No | No |
| Map support (Leaflet equivalent) | react-native-maps (MapKit/Google) | flutter_map | MapKit/Google Maps SDK |

The decisive factor is shared types. The web app has rich Zod validators in `src/lib/validators/index.ts` — `createInteractionSchema`, `createContactSchema`, `loginSchema` — that can be imported directly into the mobile package. The RBAC types in `src/lib/permissions/types.ts` (`ResolvedPermissions`, `TRUST_LEVELS`) also port cleanly.

### Alternatives considered and ruled out

- **Capacitor (Ionic):** Wraps the web app in a WebView. Performance is poor for walk lists with 1,000+ contacts, and offline IndexedDB patterns already in the web app (`src/lib/db/indexeddb.ts`) do not map cleanly to native. Ruled out.
- **Flutter:** Strong performance, but Dart means a full rewrite of all types and validators. No shared code with the existing TypeScript codebase. Ruled out.
- **Native Swift + Kotlin (two separate apps):** Fastest runtime, but 3–4x the development cost, two codebases to maintain, and does not hit the May 1 window. Ruled out.

---

## 2. Architecture

### 2.1 Authentication — NextAuth JWT from a native app

The web app uses `strategy: "jwt"` in `src/lib/auth/auth-options.ts`. This is the best case for mobile: the JWT lives in the session cookie, and NextAuth exposes REST endpoints that return JSON.

**Flow:**

```
Mobile app
  └─ POST https://poll-city.vercel.app/api/auth/callback/credentials
       { email, password }
  └─ NextAuth sets session cookie (HttpOnly, SameSite=None, Secure)
  └─ Mobile stores cookie string in SecureStore (expo-secure-store)
  └─ All subsequent API calls pass Cookie header manually
```

**Implementation details:**

1. Use `expo-secure-store` to persist the raw `Set-Cookie` header value from the NextAuth callback response.
2. Create a shared `apiClient.ts` in the mobile package that injects `Cookie: <stored-value>` on every request.
3. The 2FA flow (`requires2FA: true` in JWT) requires an additional `POST /api/auth/2fa-verify` step before any protected route is reachable — handle this in the auth state machine.
4. Session refresh: poll `GET /api/auth/session` every 15 minutes while the app is foregrounded to detect `invalidSession: true` (the web app checks `sessionVersion` against the DB on every JWT callback).

**Why not a dedicated mobile JWT endpoint?** The existing NextAuth setup does not issue separate API tokens. Adding a `/api/mobile/token` endpoint that returns a Bearer token is a clean alternative if cookie handling proves brittle, but it requires backend changes. Start with cookies — it works and needs zero backend changes.

### 2.2 API calls

All mobile API calls hit the same `https://poll-city.vercel.app/api/*` endpoints. No separate mobile backend is needed.

Key endpoints the canvasser app will use:

| Action | Endpoint |
|---|---|
| Fetch contacts / walk list | `GET /api/contacts?campaignId=x` |
| Record door knock | `POST /api/interactions` |
| Get GOTV stats | `GET /api/gotv?campaignId=x` |
| Download walk list | `GET /api/export/walklist?campaignId=x` |
| Volunteer onboard (QR) | `GET /api/volunteer/onboard/[token]` |
| Current campaign | `GET /api/campaigns/current` |
| Adoni AI | `POST /api/adoni/generate` |

Create a typed API layer (`packages/api-client/`) that wraps these with proper TypeScript return types inferred from Zod schemas. This is the main shared-code dividend.

### 2.3 Offline Support — What Must Work Without a Network

Canvassers will be in basements, rural routes, and dead zones. These operations must work offline:

**Must work offline:**
- View the assigned walk list (contacts, addresses, support levels)
- Record a door knock result (outcome, notes, support level change)
- View a contact's profile
- Mark a contact as not home / moved / deceased

**Sync strategy (mirrors what `src/lib/db/indexeddb.ts` does on web):**

Use `@react-native-async-storage/async-storage` as the persistence layer (MMKV is faster but adds native module complexity). For the sync queue, implement a simple table structure equivalent to `SyncQueueItem` from the web:

```typescript
// packages/shared/offline/types.ts
export interface MobileSyncQueueItem {
  id: string;        // uuid
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body: unknown;
  createdAt: number;
  retries: number;
  label: string;
}
```

Use `expo-background-fetch` + `expo-task-manager` to attempt sync when the app is backgrounded and connectivity is restored. Show a pending-sync badge (count of unsynced records) in the header.

**Walk list cache:** Download the full walk list when the canvasser presses "Start Canvassing." Store it locally. Contacts are read from local cache; interactions are written to sync queue. On reconnect, flush the queue.

**Does not need offline support (v1):**
- Adoni AI (requires network, that's fine)
- Donation tracking
- Event management
- Communications

---

## 3. Feature Prioritization

### v1 — App Store Submission (target: April 14–16)

This is the minimum viable app to clear review. Keep it small and unambiguous in purpose.

**Screens:**
1. Login screen (email + password)
2. 2FA screen (if `requires2FA: true`)
3. Campaign selector (if user belongs to multiple campaigns)
4. Walk list (list of contacts sorted by address)
5. Contact detail (name, address, phone, support level, last contact date)
6. Record door knock (outcome picker: Home/Not Home/Moved/Refused, notes field, support level, submit)
7. Sync status indicator (pending items count)

**What is intentionally excluded from v1:**
- Adoni AI
- Maps / GPS routing
- Volunteer management
- Event check-in
- QR onboarding
- Push notifications

**v1 submission description for Apple:** "Poll City is a campaign management tool for political campaign volunteers and staff. The canvassing module allows volunteers to manage walk lists and record voter contact results in the field."

### v2 — Ship via OTA / TestFlight During Review Window

These features ship via `eas update` (JavaScript-only OTA push) after the v1 binary is in review. No re-review needed for JS-only changes.

- Interactive map with contact pins (`react-native-maps`)
- GPS-assisted routing (nearest door next)
- Adoni AI assistant (chat interface calling `POST /api/adoni/generate`)
- Volunteer management (view team, assign turf)
- Event check-in (QR scanner via `expo-camera`)
- QR code volunteer onboarding (scan token → `GET /api/volunteer/onboard/[token]`)
- Push notifications (`expo-notifications` + existing `/api/notifications/subscribe`)

---

## 4. Project Structure

### Monorepo layout

```
poll-city/                        ← existing Next.js app
poll-city-mobile/                 ← new Expo project (sibling directory)
  app/
    (auth)/
      login.tsx
      two-factor.tsx
    (app)/
      _layout.tsx                 ← tab navigator, auth guard
      index.tsx                   ← walk list
      contact/[id].tsx            ← contact detail
      record-knock.tsx            ← door knock form
      sync-status.tsx
  components/
    ContactCard.tsx
    KnockOutcomePicker.tsx
    SyncBadge.tsx
    OfflineBanner.tsx
  lib/
    api-client.ts                 ← typed fetch wrapper with cookie injection
    auth-store.ts                 ← zustand store for session state
    offline-queue.ts              ← AsyncStorage sync queue
    background-sync.ts            ← expo-background-fetch task
  assets/
  app.json
  eas.json
  package.json
  tsconfig.json

packages/                         ← shared code (optional, add when needed)
  shared/
    types/
      permissions.ts              ← copied from src/lib/permissions/types.ts
      interactions.ts
    validators/
      interactions.ts             ← subset of src/lib/validators/index.ts
    constants/
      gotv.ts                     ← WIN_THRESHOLD_RATIO, support levels
```

**What can be shared directly:**
- `src/lib/validators/index.ts` — Zod schemas for `createInteractionSchema`, `createContactSchema`, `loginSchema`. These have zero Node.js dependencies and work in React Native.
- `src/lib/permissions/types.ts` — Pure TypeScript types, no dependencies.
- `src/lib/gotv/constants.ts` — Single constant file.

**What cannot be shared:**
- Anything importing from `next/*`, `@prisma/client`, or Node built-ins.
- `src/lib/db/indexeddb.ts` — browser API, must rewrite with AsyncStorage.
- `src/lib/auth/auth-options.ts` — server-side NextAuth config.

**Recommended approach for v1:** Copy the three shareable files into `poll-city-mobile/lib/shared/`. Do not set up a full monorepo workspace for v1 — it adds tooling complexity. Introduce a proper `packages/shared` Yarn/pnpm workspace only when the mobile app stabilises.

### tsconfig.json for mobile

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@shared/*": ["./lib/shared/*"],
      "@components/*": ["./components/*"],
      "@lib/*": ["./lib/*"]
    }
  }
}
```

---

## 5. App Store Submission Checklist

### Account requirements
- [ ] Apple Developer Program membership ($99 USD/year) — enroll at developer.apple.com
- [ ] Verify account is not restricted (political content is allowed, but account must be in good standing)
- [ ] Create App ID in Provisioning Portal: `com.pollcity.campaign` (or your bundle ID)

### Privacy policy (REQUIRED — Apple will reject without it)
- Must be a live URL, not a file. Host at `https://poll-city.vercel.app/privacy` or a static page.
- Must cover: data collected (email, location if used), how it is stored, whether it is shared with third parties, user deletion rights.
- Political apps in Canada must also reference PIPEDA / applicable provincial privacy law.
- **Do this first — it is the most common cause of rejection.**

### App Store Connect metadata

**App name:** Poll City

**Subtitle** (30 chars max): Campaign Canvassing Tool

**Description** (4,000 chars max, key points):
- What the app does: enables campaign volunteers to manage walk lists and record door-to-door contact results
- Who uses it: political campaign staff and volunteers in Canada
- Key features: offline walk list access, door knock recording, sync when back online
- Do NOT claim it manages voter data for any specific party; keep it neutral and functional

**Keywords** (100 chars): campaign,canvassing,volunteer,walklist,gotv,political,election,canada

**Category:** Business (primary), Productivity (secondary)

**Age rating:** 4+ (no objectionable content)

**App Privacy (Data Safety):**
- Data collected: Email address, Name (from login), Location (if map feature enabled — omit for v1)
- Data linked to identity: Yes (login is required)
- Data used for tracking: No

### Screenshots required

Apple requires screenshots for each device type you support. Minimum viable set:

| Device | Size | Count |
|---|---|---|
| iPhone 6.7" (iPhone 15 Pro Max) | 1290 × 2796 px | 3 minimum, 10 max |
| iPhone 6.5" (iPhone 14 Plus) | 1284 × 2778 px | 3 minimum |
| iPad Pro 12.9" (if supporting iPad) | 2048 × 2732 px | 3 minimum |

**Screens to screenshot:**
1. Login screen
2. Walk list (populated with example contacts)
3. Contact detail
4. Door knock recording form
5. Sync status

Use `react-native-screenshot-test` or simply run on a simulator and take screenshots. Fastest option: use Expo's simulator, screenshot manually, add a simple frame overlay in Figma or AppLaunchpad.

**Do not use real voter data in screenshots.**

### Review notes for Apple (crucial for political apps)

Include in the "Notes for App Review" field:

```
Poll City is a campaign management and field operations tool for Canadian political campaigns.

This app is used by campaign volunteers and paid staff to:
1. Access their assigned walk list (list of addresses to visit)
2. Record the result of each door knock (home, not home, support level)
3. Sync results back to the campaign database when connectivity is available

Login credentials for review:
  Email: review@pollcity.demo
  Password: [set up a demo account]
  Campaign: Demo Campaign 2026

The app does not:
- Store voter personal data on device beyond the active session
- Share data with third parties
- Enable in-app purchases or subscriptions
- Use location services in v1
```

**Set up the demo account before submission.** Apple reviewers will test it.

### Common rejection reasons for this category and mitigations

| Rejection reason | Mitigation |
|---|---|
| Missing privacy policy URL | Host it at a live URL before submission |
| App is not functional (reviewer can't log in) | Create and document demo credentials in review notes |
| "The app collects sensitive personal information" warning | Clearly describe data handling in App Privacy section |
| Guideline 5.2.1: Intellectual property (political party logos) | Do not include any party logos or branding; keep it neutral |
| Guideline 1.1.6: Political content requiring additional documentation | If rejected under this, respond citing it is a campaign management tool, not political advertising. Provide campaign registration number if available. |
| App crashes on launch (reviewer device) | Test on physical device before submission, not just simulator |
| Missing required device permissions description | Add all `NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription` strings to Info.plist even if the feature is v2 |

### Timeline estimate

| Day | Milestone |
|---|---|
| April 8 | Project scaffolded, auth flow working |
| April 10 | Walk list + contact detail screens complete |
| April 12 | Door knock recording + offline sync working |
| April 13 | Privacy policy live, demo account created |
| April 14 | EAS Build produces IPA, screenshots taken |
| April 15 | Submit to App Store review |
| April 22–24 | Expected review completion (Apple averages 1–3 days, political apps sometimes 5–7) |
| April 26 | Buffer for rejection/resubmission |
| May 1 | Hard deadline — app must be live |

**The timeline is tight but achievable if v1 stays minimal.**

---

## 6. Google Play Submission

Google Play review is faster (hours to 2 days vs. Apple's days) and less strict for business/utility apps.

### Key differences from App Store

| Factor | App Store | Google Play |
|---|---|---|
| Review time | 1–7 days | 1–3 hours (first submission) to 2 days |
| Political content policy | Guideline 1.1.6 can trigger extra review | "Sensitive content" flag; must declare in Data Safety |
| Privacy policy | Required | Required (same URL works) |
| Screenshots | Device-specific sizes required | One set of phone screenshots (minimum 2) |
| Internal testing track | TestFlight (separate) | Internal testing track (immediate, no review) |
| OTA updates | EAS Update (JS only) | EAS Update (JS only) — same mechanism |
| Bundle format | IPA | AAB (Android App Bundle) — EAS produces this |

### Google Play setup steps

```bash
# EAS produces AAB automatically
eas build --platform android --profile production
```

1. Create a Google Play Console account ($25 USD one-time fee).
2. Create app: Package name `com.pollcity.campaign` (must match exactly what EAS builds).
3. Complete Data Safety section (equivalent to Apple's App Privacy).
4. Add privacy policy URL.
5. Set content rating: complete the questionnaire. Select "Politics" as a content category. This does NOT mean the app will be restricted; it just categorises it correctly.
6. Target API level: must be Android 14 (API 34) or higher for new apps in 2026.
7. Upload AAB to internal testing first, test on a physical Android device, then promote to production.

### What is easier on Android
- Sideloading for internal testers (no TestFlight setup needed; just share the APK)
- First submission goes through faster
- No device-specific screenshot sizes required

### What is harder on Android
- Play Console setup takes longer (address verification, developer policy agreement)
- Targeting API 34 requires testing against Android 14 behaviours
- `expo-notifications` requires `POST_NOTIFICATIONS` runtime permission on Android 13+

---

## 7. TestFlight Strategy

TestFlight is the primary mechanism for shipping v2 features during the App Store review window.

### Internal testing (immediate — no review required)

Up to 100 testers, no review delay. Use this from day 1.

```bash
eas build --platform ios --profile preview
# Share the TestFlight link to internal team immediately
```

Add testers in App Store Connect under TestFlight → Internal Testing. Add their Apple IDs. They receive a build within minutes of upload.

**Use internal TestFlight for:**
- QA of each feature before OTA push
- Campaign staff testing walk lists with real data
- Testing 2FA and session edge cases

### External testing (requires Apple review — ~1–2 days)

Up to 10,000 testers. Requires a review of the build (not the full App Store review, but a beta review). This review typically takes 1–2 business days.

Submit external TestFlight build on April 14 simultaneously with the App Store submission. By the time the App Store build is approved, you will already have external testers trained.

### EAS Update (OTA) during review

Once the v1 binary is live on the App Store, all JavaScript and asset changes can be shipped instantly without a new App Store submission:

```bash
eas update --branch production --message "Add map view + Adoni AI"
```

**What EAS Update can change without re-review:**
- All React Native JavaScript
- Assets (images, fonts)
- New screens and components
- API endpoint calls
- Feature flags

**What requires a new binary (App Store re-review):**
- New native modules (e.g., adding `expo-camera` for QR scanning)
- Changes to `app.json` (bundle ID, permissions, version)
- Expo SDK version bump

**Strategy:**
- v1 binary: include ALL native modules that v2 will need (`react-native-maps`, `expo-camera`, `expo-location`) even if they are not surfaced in the UI. This way, all v2 features can be shipped via OTA.
- Gate features with a simple feature flag (check against `GET /api/feature-flags` from the web app — this endpoint already exists).

---

## 8. Development Environment

### Prerequisites

```bash
# Install Expo CLI and EAS CLI
npm install -g expo-cli eas-cli

# Create the Expo project (sibling to poll-city/)
cd /path/to/projects
npx create-expo-app poll-city-mobile --template tabs
cd poll-city-mobile

# Log in to EAS
eas login
eas build:configure
```

### eas.json (three profiles)

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      },
      "android": {
        "buildType": "app-bundle",
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID@email.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### Development client (recommended over Expo Go)

Expo Go does not support all native modules (`react-native-maps`, custom native code). Use a development build from day 1:

```bash
# Build dev client for iOS simulator
eas build --profile development --platform ios

# Run against the dev client
npx expo start --dev-client
```

### Environment variables

```bash
# poll-city-mobile/.env
API_BASE_URL=https://poll-city.vercel.app
# For local dev against local Next.js server:
# API_BASE_URL=http://localhost:3000
```

Use `expo-constants` to access `process.env.API_BASE_URL` in the app. Never hardcode the base URL.

### OTA update branches

```bash
# Push an OTA update to production channel
eas update --branch production --message "v2: add map view"

# Push to a preview channel for internal testing before promoting
eas update --branch preview --message "WIP: Adoni AI integration"
```

Configure update channels in `app.json`:

```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/YOUR_PROJECT_ID"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

---

## 9. Risk Register

### Risk 1: App Store rejection for political content (Guideline 1.1.6)
**Likelihood:** Medium. Apple has rejected apps that distribute "political messages" — but campaign management tools for internal staff are different from voter-facing propaganda apps.
**Mitigation:** Frame the app as a "campaign operations and field management tool." Require login (no public access). Do not show any candidate names or party affiliations in screenshots. Include clear review notes. If rejected, respond immediately with an appeal citing the business utility purpose; Apple often reverses on appeal within 24 hours.

### Risk 2: Apple review takes longer than expected (>7 days)
**Likelihood:** Medium for a first submission in this category.
**Mitigation:** Submit by April 15 at the latest to have a 16-day buffer. Simultaneously launch on Google Play (faster review) so at least one platform is live May 1. Use TestFlight external testing so campaign staff are operational even if App Store approval is delayed.

### Risk 3: NextAuth cookie auth does not work from React Native fetch
**Likelihood:** Medium. React Native's `fetch` does not handle cookies automatically like a browser.
**Mitigation:** Use `react-native-cookies` (`@react-native-cookies/cookies`) or manually capture the `Set-Cookie` response header and inject it on subsequent requests. Alternatively, add a `/api/mobile/token` endpoint (2–3 hours of backend work) that issues a short-lived JWT from a valid session — this completely sidesteps cookie handling.

### Risk 4: Offline sync data loss or double-submission
**Likelihood:** Low with proper implementation, but catastrophic if it happens (volunteer records a hundred door knocks, all lost).
**Mitigation:** Write interactions to the sync queue atomically. Show a persistent "X records pending sync" badge. On sync, use server-side idempotency keys (the interaction `id` generated client-side as a UUID, sent as `X-Idempotency-Key` header). The `POST /api/interactions` endpoint should ignore duplicate keys rather than creating duplicate records. This requires a small backend change — add it now, before mobile launch.

### Risk 5: EAS Build certificate / provisioning issues blocking submission
**Likelihood:** Medium for first-time App Store submission. Apple provisioning is notoriously fiddly.
**Mitigation:** Use EAS Managed Credentials (EAS handles the certificates automatically). Do not attempt manual certificate management for v1. Run `eas credentials` and let EAS generate and manage everything. Allow 2–4 hours for the first successful build as credentials are set up.

---

## 10. Immediate Next Steps (Do These Today)

### Step 1: Scaffold the Expo project and verify API connectivity (Today, ~2 hours)

```bash
cd /path/to/projects  # sibling to poll-city/
npx create-expo-app poll-city-mobile --template blank-typescript
cd poll-city-mobile
npx expo install expo-secure-store expo-router react-native-safe-area-context
npx expo install react-native-screens expo-status-bar
npm install zustand zod

# Create the API client pointing at production
mkdir -p lib
cat > lib/api-client.ts << 'EOF'
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://poll-city.vercel.app';
const COOKIE_KEY = 'auth_cookie';

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const cookie = await SecureStore.getItemAsync(COOKIE_KEY);
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const cookie = await SecureStore.getItemAsync(COOKIE_KEY);
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...(cookie ? { Cookie: cookie } : {}) },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function signIn(email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password, csrfToken: '', callbackUrl: '/' }),
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) await SecureStore.setItemAsync(COOKIE_KEY, setCookie);
}
EOF
```

### Step 2: Host the privacy policy (Today, ~30 minutes)

Create `/app/privacy/page.tsx` in the Next.js app (the web app, not mobile). This is the fastest way to get a live URL before Apple asks for it.

The page needs to cover at minimum:
- What data the app collects (email, name, interaction records)
- How it is stored (Railway PostgreSQL, Vercel infrastructure, Canada or US data centres)
- Who has access (campaign staff only, no third-party sharing)
- User rights under PIPEDA
- Contact email for deletion requests

Deploy to Vercel. The URL `https://poll-city.vercel.app/privacy` is then ready to paste into App Store Connect.

### Step 3: Set up EAS and run the first development build (Today, ~1 hour)

```bash
cd poll-city-mobile

# Authenticate and initialize
eas login
eas build:configure
# Accept defaults; EAS Managed Credentials = yes

# Run first simulator build to confirm the pipeline works
eas build --profile development --platform ios --local
# (--local skips the remote queue; faster for first test)

# If that succeeds, trigger a real EAS build for TestFlight
eas build --profile preview --platform ios
```

Once the preview build is on TestFlight, add yourself and the core team as internal testers immediately. This gives you the feedback loop to iterate quickly.

---

## Appendix: Key File References (Existing Web App)

These files in the web app contain logic that directly informs or is reusable in the mobile app:

| File | Relevance |
|---|---|
| `src/lib/auth/auth-options.ts` | JWT strategy, 2FA flags, sessionVersion invalidation |
| `src/lib/validators/index.ts` | Zod schemas for interactions, contacts, login — copy to mobile |
| `src/lib/permissions/types.ts` | `ResolvedPermissions`, `TRUST_LEVELS` — copy to mobile |
| `src/lib/gotv/constants.ts` | `WIN_THRESHOLD_RATIO` — copy to mobile |
| `src/lib/db/indexeddb.ts` | Offline queue and walk list cache design — reimplement with AsyncStorage |
| `src/app/api/export/walklist/route.ts` | Shape of walk list data returned by the API |
| `src/app/api/gotv/route.ts` | GOTV stats shape — use for the command centre screen in v2 |
| `src/lib/operations/metrics-truth.ts` | `calculateWinThreshold` — pure function, reuse in mobile if showing GOTV progress |
