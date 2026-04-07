# Poll City Mobile App Architecture

## Version 1.0 — April 7, 2026

---

## Technology Decision

### Recommendation: React Native with Expo (Standalone Apps)

**Why not a PWA/Capacitor wrapper:**
- Apple rejects thin wrappers that replicate web content without native value
- Capacitor apps frequently fail App Store review for "not providing a native experience"
- PWA push notifications on iOS are limited (no silent push, no background sync)
- Camera and GPS APIs in Capacitor lack the reliability needed for field operations
- Offline-first with SQLite is far more robust in React Native than in a web wrapper

**Why React Native + Expo:**
- Expo SDK 52+ provides managed native modules for camera, GPS, SQLite, push notifications
- EAS Build handles code signing, provisioning profiles, and store submissions
- Shared TypeScript types and API contracts with the Next.js web app (no code duplication for models)
- React Native Maps, react-native-reanimated, and expo-camera are production-grade
- Expo Router provides file-based routing matching the mental model of Next.js App Router
- Over-the-air updates via EAS Update for non-native changes (bypasses store review cycle)
- George's team does not need Xcode or Android Studio for most development

**What is shared with the web app:**
- TypeScript type definitions (contact, campaign, turf, GOTV models)
- API endpoint contracts and response shapes
- Validation logic (Zod schemas)
- Business constants (support levels, priority tiers, donation limits)
- These live in a shared `packages/poll-city-shared` package (future monorepo extraction)

**What is NOT shared:**
- UI components (React Native uses its own component tree)
- Navigation (Expo Router, not Next.js routing)
- State management (local SQLite + React Query, not server components)
- Authentication flow (native secure storage, not browser cookies)

---

## App Phasing (from POLL-CITY-TRUTH.md Section 3)

| App | Target | Repo | Audience |
|-----|--------|------|----------|
| Poll City Canvasser | May 2026 | poll-city-canvasser | Campaign volunteers, field directors |
| Poll City Social | June 2026 | poll-city-social (split) | Citizens |
| Poll City Campaign | August 2026 | poll-city-canvasser (shared) | Campaign managers, candidates |

**Build the Canvasser app first.** It has the clearest B2B use case, the strongest App Store justification, and the most urgent field need (canvassers need offline, one-handed, GPS-enabled door-knocking).

---

## Apple App Store Requirements

### Review Guidelines Compliance

1. **Guideline 4.2 — Minimum Functionality**
   - The app must not be a repackaged website. It must use native UI components, native navigation, native gestures.
   - Offline canvassing with local SQLite storage provides clear native-only value.
   - GPS tracking, native camera for sign photos, and haptic feedback on door result buttons all demonstrate native capability.

2. **Guideline 4.2.6 — Political Apps**
   - Must select "Made for specific organization" under App Distribution.
   - App description must use: "nonpartisan civic engagement tool", "field operations for registered campaign volunteers", "community organizing".
   - Must NOT use: "win elections", "campaign targeting", "voter manipulation".
   - George's 35-year nonpartisan track record is the narrative anchor.

3. **Guideline 5.1 — Privacy**
   - Privacy Nutrition Label must declare: location (while using), contacts (campaign walk list), camera (sign photos), usage data (analytics).
   - Must declare: "Data is NOT sold to third parties."
   - Must declare: "Data is NOT used for tracking across apps."
   - Privacy policy URL required: https://www.poll.city/privacy
   - PIPEDA compliance statement included.

4. **Guideline 2.1 — App Completeness**
   - Demo account credentials provided to App Review team.
   - All features functional in review (seed data pre-loaded).
   - No placeholder screens or "coming soon" sections.

5. **Guideline 4.0 — Design**
   - Minimum iOS 16 support.
   - App icon: 1024x1024 PNG, no alpha, no rounded corners (system applies them).
   - Launch screen using native Storyboard (Expo handles this).
   - Support Dynamic Type for accessibility.
   - Support Dark Mode.
   - Safe area insets respected on all devices (notch, Dynamic Island, home indicator).

6. **Guideline 2.4 — Hardware Compatibility**
   - Must work on iPhone SE (3rd gen) through iPhone 16 Pro Max.
   - Must work on iPad (optional but recommended for field director view).

### Required App Store Assets
- App icon: 1024x1024 PNG
- Screenshots: 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 11 Pro Max), 5.5" (iPhone 8 Plus)
- iPad screenshots (if supporting iPad)
- App Preview video (30 seconds, showing canvassing flow)
- Privacy policy URL
- Support URL
- Marketing URL

---

## Google Play Requirements

### Policy Compliance

1. **Political Content Policy**
   - If running election-related ads, must complete Election Ads transparency requirements.
   - Poll City itself does not run ads in the app, but campaigns using it are political — disclosure in listing required.
   - Data Safety section must match Apple privacy declarations.

2. **Permissions**
   - `ACCESS_FINE_LOCATION` — GPS tracking during canvassing.
   - `ACCESS_BACKGROUND_LOCATION` — NOT requested (foreground only, avoids review friction).
   - `CAMERA` — sign photos, QR code scanning.
   - `POST_NOTIFICATIONS` — push notifications (Android 13+ requires runtime permission).
   - `INTERNET` — API communication.
   - `RECEIVE_BOOT_COMPLETED` — resume pending sync after device restart.

3. **Data Safety Section**
   - Location: collected, not shared with third parties.
   - Personal info (name, address): collected for campaign operations, not shared.
   - Photos: collected for sign documentation, stored on campaign servers.
   - App activity: collected for analytics, not shared.

4. **Target API Level**
   - Minimum: Android API 24 (Android 7.0).
   - Target: API 34 (Android 14) — required by Google Play as of 2025.

### Required Google Play Assets
- Feature graphic: 1024x500 PNG
- App icon: 512x512 PNG
- Screenshots: phone (16:9), 7" tablet, 10" tablet
- Privacy policy URL
- Short description (80 chars max)
- Full description (4000 chars max)

---

## App Structure — 5 Main Tabs

### Tab 1: Dashboard

The campaign command centre on mobile.

**Screens:**
- Campaign stats summary (contacts, doors knocked, supporters, gap)
- Quick actions: start canvass, log donation, add volunteer, view GOTV
- Recent activity feed
- Adoni pill (tap to expand, voice interface)
- Campaign switcher (top-left)

**Data:** Fetched from `/api/campaigns/current`, `/api/analytics/campaign`, `/api/activity/live-feed`

### Tab 2: Canvass

The core field operations tab. This is the primary reason the app exists.

**Screens:**
- Turf selection (assigned turfs with progress bars)
- Walk list (map + next door view, as specified in SUBJECT-MATTER-BIBLE Part 12)
- Door screen (result buttons: Supporter, Undecided, Against, Not Home)
- Script overlay (swipe up)
- More options sheet (sign request, volunteer, phone capture, opposition intel)
- Literature drop mode
- Team canvassing split view
- Canvass debrief (end of shift, 3 questions)
- Shift summary (celebration screen)

**Native features used:**
- GPS: real-time position on map, route tracking, geofencing for turf boundaries
- Camera: sign photos, property photos
- Haptics: confirmation feedback on door result buttons
- Offline SQLite: full walk list cached locally, results queued for sync

**Data:** `/api/turf`, `/api/turf/[id]`, `/api/turf/[id]/stops/[stopId]`, `/api/canvass`, `/api/canvassing/*`, `/api/canvasser/location`, `/api/contacts/[id]`

### Tab 3: GOTV

Election day command centre.

**Screens:**
- The Gap (largest element, always visible)
- Priority list (P1-P4 supporters not yet voted)
- Strike off (search + enter, sub-100ms, no confirmation)
- Upload voted list (camera scan or manual entry)
- Rides coordination (needs ride, arrange ride, confirm pickup)
- Poll reports (scrutineer data entry)

**Native features used:**
- Camera: scan printed voted lists
- Push notifications: gap updates, pace alerts
- Background sync: voted list uploads process in background

**Data:** `/api/gotv/gap`, `/api/gotv/priority-list`, `/api/gotv/strike-off`, `/api/gotv/upload-voted-list`, `/api/gotv/rides`, `/api/gotv/summary`, `/api/gotv/tiers`

### Tab 4: Social

Civic engagement for the citizen side of the user.

**Screens:**
- Civic profile
- Polls (vote, view results)
- Officials directory (find your representative)
- Petitions
- Candidate pages
- Notification preferences

**Data:** `/api/civic/profile`, `/api/polls`, `/api/officials/directory`, `/api/civic/petitions`, `/api/public/candidates/[slug]`, `/api/social/profile`

### Tab 5: More

Settings and secondary features.

**Screens:**
- Account settings
- Notification preferences
- Team management
- Help centre
- Privacy policy
- Sign out
- App version / debug info
- Offline data management (clear cache, force sync)

**Data:** `/api/users/[id]`, `/api/notifications/subscribe`, `/api/team`, `/api/help/articles`

---

## Offline Architecture

### Local Database: expo-sqlite (SQLite)

The canvassing app must work with zero network connectivity. This is non-negotiable.

**Tables cached locally:**

| Table | Source API | Sync Direction | Priority |
|-------|-----------|----------------|----------|
| turfs | `/api/turf` | server -> local | Pre-canvass download |
| walk_list_stops | `/api/turf/[id]` | server -> local | Pre-canvass download |
| contacts | `/api/contacts` (turf-scoped) | bidirectional | Pre-canvass download |
| canvass_results | `/api/canvass` | local -> server | Queue for upload |
| sign_intel | `/api/canvassing/intelligence` | local -> server | Queue for upload |
| literature_drops | `/api/canvassing/literature-drop` | local -> server | Queue for upload |
| scripts | `/api/canvassing/scripts` | server -> local | Pre-canvass download |
| campaign_fields | `/api/campaign-fields` | server -> local | Pre-canvass download |

### Mutation Queue

All writes go to a local `pending_mutations` table first:

```
pending_mutations {
  id: uuid
  endpoint: string        -- e.g. "POST /api/canvass"
  payload: json           -- the request body
  created_at: timestamp   -- for ordering
  retry_count: integer    -- max 5 retries
  status: enum            -- pending | syncing | synced | failed
}
```

**Sync process:**
1. On any network connectivity change (offline -> online), trigger sync.
2. Process mutations in FIFO order (created_at ascending).
3. Each mutation is sent to the server API as a normal HTTP request.
4. On 200: mark synced, delete after 24 hours.
5. On 4xx: mark failed, surface to user (data conflict).
6. On 5xx: increment retry_count, retry with exponential backoff.
7. Show sync status indicator in app header (green checkmark = synced, orange spinner = syncing, red dot = pending).

### Conflict Resolution

**Strategy: Last Write Wins with audit trail.**

- Each contact record has a `lastModifiedAt` timestamp (local and server).
- When syncing, if server `lastModifiedAt` > local mutation `created_at`, the server version wins.
- The local mutation is preserved in a `conflicts` table for manual review.
- Field director can review conflicts in the web dashboard.
- For canvass results specifically: both versions are kept (two canvassers may have legitimately contacted the same person).

### Background Sync

- Use `expo-background-fetch` for periodic sync (minimum 15-minute intervals, OS-controlled).
- Use `expo-task-manager` for location-triggered sync (when entering/leaving a turf geofence).
- Silent push notifications trigger immediate sync attempt (useful for GOTV day voted list updates).

### Pre-Canvass Download

Before starting a canvass session:
1. App checks network connectivity.
2. Downloads full turf data (stops, contacts, scripts, custom fields).
3. Stores in SQLite.
4. Shows download progress bar.
5. Canvasser cannot start until download is complete OR data is already cached.
6. Cached data shows "Last synced: 2 hours ago" indicator.

---

## Push Notification Architecture

### iOS: Apple Push Notification service (APNs)

- Use `expo-notifications` managed module.
- APNs auth key (`.p8` file) configured in EAS.
- Device token registered on app launch, sent to `/api/notifications/subscribe`.
- Token refresh handled automatically by Expo.

### Android: Firebase Cloud Messaging (FCM)

- Use `expo-notifications` managed module (handles FCM under the hood).
- FCM server key configured in EAS.
- Same `/api/notifications/subscribe` endpoint, different token format.

### Server-Side: Unified Send

The existing `/api/notifications/send` endpoint is extended to support native push:

```
POST /api/notifications/send
{
  userId: string,
  title: string,
  body: string,
  category: "results" | "polls" | "reminders" | "emergency" | "gotv" | "sync",
  data: { screen: string, params: object },  // deep link target
  priority: "high" | "normal",
  silent: boolean  // for background sync triggers
}
```

### Notification Categories

| Category | Examples | Priority | Sound | Badge |
|----------|----------|----------|-------|-------|
| results | "Election results are in for Ward 20" | high | default | yes |
| polls | "New poll: Transit priorities" | normal | default | yes |
| reminders | "Canvass shift starts in 1 hour" | high | default | yes |
| emergency | "Campaign alert from field director" | high | critical | yes |
| gotv | "Gap update: 23 more votes needed" | high | default | yes |
| sync | Silent data sync trigger | normal | none | no |

### Quiet Hours

- Default: 10pm-7am local time.
- Emergency category bypasses quiet hours.
- User can customize quiet hours in Settings.
- Server checks user timezone before sending.

### Deep Linking

Every notification includes a `data.screen` field that maps to an Expo Router path:

```
"gotv"     -> /(tabs)/gotv
"canvass"  -> /(tabs)/canvass
"poll"     -> /(tabs)/social/polls/[id]
"results"  -> /(tabs)/social/results
"contact"  -> /(tabs)/canvass/contact/[id]
```

---

## API Endpoint Inventory

### Endpoints the Mobile App Uses (Existing)

**Auth:**
- `POST /api/auth/[...nextauth]` — login/signup (needs mobile OAuth flow adaptation)

**Campaign:**
- `GET /api/campaigns/current` — active campaign
- `POST /api/campaigns/switch` — switch campaign
- `GET /api/analytics/campaign` — campaign stats

**Canvassing:**
- `GET /api/turf` — list turfs
- `GET /api/turf/[id]` — turf detail with stops
- `PUT /api/turf/[id]/stops/[stopId]` — update stop result
- `POST /api/canvass` — submit canvass result
- `POST /api/canvass/assign` — assign turf to canvasser
- `POST /api/canvasser/location` — report GPS position
- `GET /api/canvassing/scripts` — get scripts for turf
- `POST /api/canvassing/intelligence` — submit opposition intel
- `POST /api/canvassing/literature-drop` — record literature drop
- `POST /api/canvassing/debrief` — submit end-of-shift debrief
- `GET /api/canvassing/shift-summary` — shift completion data
- `GET /api/canvassing/smart-plan` — AI-optimized route
- `GET /api/canvassing/street-priority` — street priority scores
- `GET /api/campaign-fields` — custom field definitions
- `POST /api/custom-field-values` — submit custom field values

**Contacts:**
- `GET /api/contacts` — list contacts (turf-scoped for canvasser)
- `GET /api/contacts/[id]` — contact detail
- `PUT /api/contacts/[id]` — update contact
- `GET /api/contacts/streets` — street listing

**GOTV:**
- `GET /api/gotv/gap` — the gap number
- `GET /api/gotv/priority-list` — P1-P4 supporters
- `POST /api/gotv/strike-off` — mark voter as voted
- `POST /api/gotv/mark-voted` — mark voted
- `POST /api/gotv/upload-voted-list` — upload voted list
- `GET /api/gotv/rides` — rides needing arrangement
- `PUT /api/gotv/rides/[contactId]/arranged` — confirm ride
- `GET /api/gotv/summary` — GOTV summary stats
- `GET /api/gotv/tiers` — tier breakdown
- `POST /api/gotv/dispatch` — dispatch volunteer

**Social/Civic:**
- `GET /api/civic/profile` — civic profile
- `GET /api/polls` — list polls
- `POST /api/polls/[id]/respond` — vote on poll
- `GET /api/officials/directory` — find representatives
- `GET /api/civic/petitions` — petitions
- `POST /api/civic/petitions/[id]/sign` — sign petition
- `GET /api/public/candidates/[slug]` — candidate page

**Notifications:**
- `POST /api/notifications/subscribe` — register device token
- `GET /api/notifications/history` — notification history
- `GET /api/social/my-notifications` — user notifications

**Signs:**
- `POST /api/signs/quick-capture` — quick sign request
- `GET /api/signs` — sign inventory

**Activity:**
- `GET /api/activity/live-feed` — live activity stream

**Maps:**
- `GET /api/maps/contacts-geojson` — contact map data
- `GET /api/maps/signs-geojson` — sign locations
- `GET /api/maps/turfs-geojson` — turf boundaries
- `GET /api/maps/live-pins` — real-time canvasser positions
- `GET /api/maps/volunteer-locations` — volunteer GPS positions
- `GET /api/maps/heat-data` — support heat map
- `GET /api/maps/ward-boundary` — ward boundary polygon

**Team:**
- `GET /api/team` — team members
- `GET /api/volunteers/shifts` — available shifts
- `POST /api/volunteers/shifts/[id]/signup` — sign up for shift
- `POST /api/volunteers/shifts/[id]/checkin` — check in to shift

**Help:**
- `GET /api/help/articles` — help articles
- `GET /api/help/search` — search help

**Adoni:**
- `POST /api/adoni/chat` — Adoni conversation (voice transcription -> text -> response)
- `GET /api/adoni/suggestions` — contextual suggestions

### Missing Endpoints (Must Build for Mobile)

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `POST /api/auth/mobile/token` | Issue JWT for mobile sessions (current auth uses browser cookies) | **Critical** |
| `POST /api/auth/mobile/refresh` | Refresh expired JWT | **Critical** |
| `POST /api/sync/batch` | Accept batched offline mutations in one request | **High** |
| `GET /api/sync/changes?since=timestamp` | Delta sync — return all changes since last sync | **High** |
| `POST /api/canvassing/photo` | Upload sign/property photo from camera | **High** |
| `GET /api/turf/[id]/offline-bundle` | Single endpoint returning all data needed for offline canvassing (stops, contacts, scripts, fields) | **High** |
| `POST /api/gotv/scan-voted-list` | OCR processing of photographed voted list | **Medium** |
| `GET /api/app/config` | App feature flags, minimum version, force update flag | **Medium** |
| `POST /api/adoni/voice` | Accept audio blob, transcribe, respond (for field voice interface) | **Medium** |
| `GET /api/notifications/preferences` | Get user notification preferences for mobile settings screen | **Low** |
| `PUT /api/notifications/preferences` | Update notification preferences | **Low** |

---

## Authentication for Mobile

### JWT-Based Auth (not cookies)

The web app uses NextAuth with HTTP-only cookies. Mobile apps cannot use cookies reliably.

**Flow:**
1. User logs in via email/password or OAuth (Google, Apple Sign-In).
2. Server issues a JWT access token (15-minute expiry) and a refresh token (30-day expiry).
3. Access token stored in `expo-secure-store` (Keychain on iOS, Keystore on Android).
4. Refresh token stored in `expo-secure-store`.
5. Every API request includes `Authorization: Bearer <access_token>`.
6. On 401, attempt refresh. On refresh failure, redirect to login.

**Apple Sign-In is required** if the app offers any third-party login (App Store guideline 4.8).

---

## Security Considerations

- All API communication over HTTPS (certificate pinning optional, recommended for production).
- SQLite database encrypted with `better-sqlite3` encryption or SQLCipher via `expo-sqlite`.
- Sensitive data (tokens, credentials) in Secure Store only, never in AsyncStorage.
- Walk list data wiped from device when canvasser is removed from campaign.
- Session timeout: 30 days inactive = forced re-login.
- Jailbreak/root detection: warn user, do not block (avoids false positives).
- Screenshot prevention on sensitive screens (GOTV gap, contact details) via `FLAG_SECURE` on Android.

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| App cold start | < 2 seconds | Splash screen during load |
| Door result tap | < 50ms | Local SQLite write, no network |
| Walk list render | < 200ms | Pre-loaded from SQLite |
| Map pan/zoom | 60fps | React Native Maps with clustering |
| Strike off | < 100ms | Optimistic update, background sync |
| Sync batch upload | < 3 seconds | For 100 mutations |
| Photo upload | < 5 seconds | Compressed to 500KB max |
| Push notification delivery | < 5 seconds | APNs/FCM standard |

---

## Testing Strategy

- **Unit tests:** Jest + React Native Testing Library for components and hooks.
- **Integration tests:** Detox for end-to-end flows (canvass session, GOTV strike-off).
- **Offline tests:** Mock network conditions, verify SQLite operations.
- **Device testing matrix:** iPhone SE (smallest), iPhone 15 Pro Max (largest), Pixel 7a (Android baseline).
- **Beta distribution:** EAS internal distribution for team testing, TestFlight for iOS beta, Google Play internal testing track.

---

## Accessibility

- VoiceOver (iOS) and TalkBack (Android) support on all screens.
- Minimum 44x44pt touch targets (56px for canvass result buttons).
- Dynamic Type support (up to xxxLarge).
- High contrast mode support.
- Screen reader labels on all interactive elements.
- No colour-only indicators (always paired with text or icon shape).

---

## Release Strategy

### Phase 1: Canvasser App (May 2026)
- Tabs: Dashboard (simplified), Canvass, GOTV, More
- No Social tab yet
- Internal testing via TestFlight + Google Play internal track
- App Store submission targeting May 15, allow 2 weeks for review

### Phase 2: Social Tab Addition (June 2026)
- Add Social tab with civic profile, polls, officials
- OTA update if no native module changes, otherwise store update

### Phase 3: Campaign Manager Features (August 2026)
- Enhanced dashboard with full analytics
- Team management, volunteer coordination
- Budget/finance quick entry
- This may be a separate app or role-based feature gating in same app
