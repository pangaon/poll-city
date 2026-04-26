# Session Handoff — Poll City
## The Army of One Coordination File

**Last updated:** 2026-04-26 (Atlas geographic layers batch 2 + address import endpoints)
**Updated by:** Claude Sonnet 4.6

## CURRENT PLATFORM STATE

### Build
`npm run build` exits 0. TypeScript clean. 908 tests passing. All commits on `origin/main`.

### What shipped (2026-04-26 — Atlas layers batch 2 + ArcGIS import)

| Commit | What changed |
|---|---|
| `140debd` | ON municipal, address points, BC ridings + BC municipal layers (schema + import scripts + API routes + Atlas UI) |
| `30149e6` | GEORGE_TODO doc fix — `--file` flag in import-address-points command |
| `0bc6df6` | Map height fix — break out of layout padding, set `calc(100dvh - 3.5rem)` |
| `507997e` | fitBounds guard (`hasFitBoundsRef`) + ArcGIS address-prelist endpoints |

**What is live (code deployed, data pending George's import runs):**
- 4 new Prisma models: `OntarioMunicipalBoundaryLayer`, `AddressPointLayer`, `BCRidingLayer`, `BCMunicipalBoundaryLayer`
- 4 new API routes (all auth-gated with getServerSession/apiAuth):
  - `GET /api/atlas/ontario-municipal?tier=lower_and_single` — 444 ON municipalities
  - `GET /api/atlas/address-points?municipality=Toronto[&ward=X]` — Toronto civic address points (525K, per-ward)
  - `GET /api/atlas/bc-ridings` — BC provincial electoral districts
  - `GET /api/atlas/bc-municipal` — BC municipal boundaries
  - `POST /api/address-prelist/upload` — multipart GeoJSON → AddressPreList records (campaignId-scoped)
  - `POST /api/address-prelist/fetch-url` — ArcGIS Hub URL → fetches + imports GeoJSON
- 3 import scripts: `import-ontario-municipal-boundaries.ts`, `import-address-points.ts`, `import-bc-boundaries.ts`
- **Atlas map** — "Reference Layers" section in left sidebar (7 toggles total):
  - 🏛️ ON Ridings (blue) · 📍 Polling Divs (purple) · 🏙️ ON Municipal (amber)
  - 🌲 BC Ridings (green) · 🏔️ BC Municipal (sky) · 📌 Address Points (orange clusters)
- Map ResizeObserver loop fixed — map no longer moves continuously on load

**Guard warning resolved:** `atlas-import-client.tsx` dead UI buttons (fetch-url, upload) now backed by real endpoints (`507997e`). No more 404s.

**George needs to do before new layers show data (GEORGE_TODO 89–92):**
1. `npx prisma db push` (item 89) — creates 4 new tables on Railway. Until this runs, all new Atlas layer toggles return 500.
2. `npx tsx scripts/import-ontario-municipal-boundaries.ts --lower "C:/Users/14168/Downloads/MUNICIPAL_BOUNDARY_LOWER_AND_SINGLE_TIER/MUNICIPAL_BOUNDARY_LOWER_AND_SINGLE_TIER.shp"` (item 90)
3. `npx tsx scripts/import-address-points.ts --file "C:/Users/14168/Downloads/ADDRESS_POINT_TORONTO.geojson" --municipality Toronto` (item 91)
4. Download BC shapefiles from browser + run import (item 92 — BC Data Catalogue + Elections BC)

**Existing layers already working (no action needed):**
- 🏛️ ON Ridings + 📍 Polling Divs — data already imported from previous session

### What shipped (2026-04-26 — Elections Ontario provincial boundary layers)

| Commit | What changed |
|---|---|
| `9480114` | Ontario provincial ridings + polling divisions as Atlas map layers |

### What shipped (2026-04-25 — Canvasser backend + mobile wiring)

| Commit | What changed |
|---|---|
| `6c75930` | Full canvasser backend (14 new `/api/canvasser/*` routes) + mobile wiring. No schema changes. |

**What is live:**
- `GET /api/canvasser/missions` — load turfs as missions list (mobile canvassing tab)
- `GET /api/canvasser/missions/[missionId]` — mission detail with stop counts
- `GET /api/canvasser/missions/[missionId]/current-stop` — next unvisited door
- `POST /api/canvasser/stops/[stopId]/complete` — mark door done (support level, notes, issues, flags)
- `POST /api/canvasser/stops/[stopId]/skip` — skip door with reason
- `POST /api/canvasser/stops/[stopId]/note` — append note
- `POST /api/canvasser/voters/[personId]/outcome` — update contact support level
- `POST /api/canvasser/sign-requests` — create sign request + flag Contact.signRequested
- `POST /api/canvasser/volunteer-leads` — flag Contact.volunteerInterest
- `POST /api/canvasser/adoni/transcripts` — store voice transcript
- `POST /api/canvasser/adoni/parse` — rule-based NLP → structured actions (no Claude API)
- `POST /api/canvasser/adoni/execute` — execute confirmed Adoni actions (7 action types)
- `POST /api/canvasser/sync` — batch offline mutations → forwarded internally with auth
- `GET /api/canvasser/sync/status` — day stats: doors knocked, supporters, signs, volunteers

**Mobile wired:**
- `mobile/lib/types.ts` — 7 new canvasser types
- `mobile/lib/api.ts` — 14 new typed API functions
- `mobile/app/(tabs)/canvassing/index.tsx` — now calls `fetchMissions` (was `fetchTurfs`), passes `stopId` through nav params
- `mobile/app/(app)/door/[id].tsx` — calls `completeStop` + `submitSignRequest` + `submitVolunteerLead` on submit

**George needs to do:** Nothing for this commit. No schema changes, no new env vars.

**Navigation (mobile):** Expo Go → Canvassing tab → select mission → door wizard → submit = live data.

### Previous session (2026-04-25 — Apple Sign-In)

| Commit | What changed |
|---|---|
| `53dfdeb` | Apple Sign-In: `/api/auth/mobile/social` backend (JWKS verification, user find/create by appleUserId + email), `expo-apple-authentication` installed, iOS login button, auth context `signInWithResponse()`, `appleUserId` schema field, GEORGE_TODO items 83–85 |

**George needs to do before TestFlight:**
- `npx prisma db push` — GEORGE_TODO item 83 — adds `appleUserId` column (without it, returning Apple users get APPLE_NO_EMAIL error)
- Enable "Sign In with Apple" in Apple Developer → Identifiers → `ca.pollcity.canvasser` — item 84
- `npx prisma db push` — GEORGE_TODO item 82 — Comms Phase 10 (ContactCommsLog), still outstanding

**Navigation (Apple Sign-In):** Opens automatically on iOS login screen when running on device. Uses `expo-apple-authentication` — works only in EAS dev builds or TestFlight, not Expo Go.

### Previous session (2026-04-25 — overnight Comms Phase 10 session)

| Commit | What changed |
|---|---|
| `5d48eba` | Comms Phase 10: email/SMS routes (configurable cooldown, frequency caps), comms-settings API, /settings/comms-limits UI, settings-client card |
| `1f366e4` | Phase 10 schema: ContactCommsLog model + 3 Campaign comms fields + GEORGE_TODO item 82 |

**Navigation:** Settings → Comms Limits → configure cooldown and weekly/monthly caps.

### Previous session (2026-04-24 — billing move + ops fix session)

| Commit | What changed |
|---|---|
| `prev` | Billing moved to /settings/billing; /billing redirects there; sidebar cleaned up |
| `prev` | All 8 ops pages fixed — SUPER_ADMIN check uses session.user.role not resolveActiveCampaign |

### Previous session (2026-04-24 — Import/Export overhaul session)

| Commit | What changed |
|---|---|
| `6a5c3a3` | Import/Export: Fix 10 + Stripe UX + Adoni integration — detailed error breakdown, caslIssueCount + missingNameCount tracked and surfaced, step headings/descriptions, Adoni tip in mapping step, post-import Adoni dispatch, Ask Adoni buttons on both hub and wizard |

### Previous session (2026-04-24 — parallel agent session)

| Commit | What changed |
|---|---|
| `367be11` | Atlas turf drawing now saves to DB — GET/POST/DELETE + loads saved turfs on mount |
| `46b1c33` | Health-monitor enhanced — stuck import sweep (marks stuck >2h as failed), ward staleness check |
| `46905be` | Settings/permissions page — was written but never committed. Now live at /settings/permissions |
| `af64558` | SUPER_ADMIN sidebar: "Seed Data" entry → /ops/data-management |
| `b9e13ce` | Sidebar restructured 57 → 35 items — collapsed atlas/eday/ops sub-pages, removed duplicates |
| `43e40a6` | Voter import: 9 of 10 breakpoints fixed (cron trigger, counters, CASL dates, Unknown names, geocode timeout, ward assignment) |
| `3a16790` | /ops/data-management — seeding console with ward coverage dashboard, ward seeding UI, client provisioning form |

### Previous session (2026-04-24 — platform reset)
- `npx prisma db seed` ✓ — full ecosystem seeded
- `npx tsx scripts/provision-whitby-clients.ts` ✓ — Maleeha + Elizabeth created as paid clients
- `npx tsx scripts/seed-whitby-boundaries.ts` ✓ — ward boundaries loaded
- `middleware.ts` — `/api/atlas/seed-wards` added to PUBLIC_PATHS
- `GEORGE_TODO.md` — items 3, 3b, 3c, 3d, 3f, 48, 74, 78, 79, 90, 91, 92 marked done
- Ontario Map — 238 wards, 28 municipalities seeded

### Ontario Map — SEEDED ✓ (2026-04-24)
238 wards across 28 municipalities live in DB.
3 municipalities failed (need ArcGIS source): Niagara Falls, Sudbury, Sarnia.
Daily 3am cron keeps this current.

---

## LIVE CLIENT CREDENTIALS

**Maleeha Shahid**
- Login: app.poll.city → shahidm@whitby.ca / MaleehaWhitby2026!
- Public profile: poll.city/candidates/maleeha-shahid

**Elizabeth Roy**
- Login: app.poll.city → elizabeth.roy@whitby.ca / ElizabethWhitby2026!
- Public profile: poll.city/candidates/elizabeth-roy-whitby

---

## WHAT IS ACTUALLY LIVE IN PRODUCTION

| Module | Status | Notes |
|---|---|---|
| Auth (email/password) | ✓ Live | |
| Auth (Google) | ✓ Live | |
| Auth (Facebook) | ✓ Live | |
| Dashboard | ✓ Live | |
| Contacts / CRM | ✓ Live | Full CRUD, soft delete, households |
| Volunteers | ✓ Live | Profiles, shifts, groups, expenses |
| Tasks V2 | ✓ Code complete | Not browser-verified by George |
| Field Ops | ✓ Live | |
| GOTV | ✓ Live | |
| Election Day | ✓ Live | |
| Signs | ✓ Live | |
| Communications | ✓ Live | Email/SMS need Resend/Twilio keys |
| CASL Compliance | ✓ Code complete | |
| Analytics | ✓ Code complete | |
| Finance (9 tabs) | ✓ Live | |
| Fundraising | ✓ Code complete | Needs STRIPE keys |
| Forms | ✓ Live | |
| Polls | ✓ Live | |
| Print | ✓ Live | |
| Adoni chat | ✓ Live | |
| Adoni Training (/ops/adoni) | ✓ Code complete | |
| Poll City Social | ✓ Live | |
| Officials directory | ✓ Code complete | |
| Vendor Network (/vendors) | ✓ Live | |
| Ontario Map (/atlas) | ✓ Live | 238 wards, 28 municipalities. Turf drawing now saves to DB. |
| Atlas Turf Drawing | ✓ Code complete | Connected to DB. Awaiting George browser-verify. |
| Voter File Import | ✓ Code complete | All 10 fixes shipped. Awaiting George browser-verify. Detailed error breakdown now shows imported/updated/skipped/CASL/missing-name/geocoding separately. |
| /ops/data-management | ✓ Code complete | Seeding console. Awaiting George browser-verify. |
| Settings / Permissions | ✓ Code complete | Was uncommitted — now committed. Awaiting George browser-verify. |
| Q&A Inbox | ✓ Code complete | |
| Ops (/ops) | ✓ Live | SUPER_ADMIN only |
| Mobile (Expo) | ✓ Built | Not published to App Store |

---

## WHAT IS NOT WORKING IN PROD (env vars missing)

| Feature | Blocker |
|---|---|
| Email sending | `RESEND_API_KEY` not in Vercel |
| SMS sending | Twilio keys not in Vercel |
| Stripe payments | `STRIPE_SECRET_KEY` not in Vercel |

---

## WHAT STILL NEEDS GEORGE'S EYES

These shipped but George has not browser-verified them:

1. **Voter file import (UPDATED)** — upload a real CSV with a consentGiven column. After import, the done screen should show the detailed breakdown: imported / updated / skipped / CASL issues / missing name. Check the "Ask Adoni" button dispatches Adoni. Adoni should auto-open after import completes with a prefill message.
2. **Atlas turf drawing** — draw a turf on the map, close the page, reopen, confirm it's still there.
3. **/ops/data-management** — navigate via sidebar "Seed Data" link → confirm ward coverage table loads → try seeding one municipality → try provisioning a test client.
4. **Settings/permissions** — navigate Settings → Permissions card → confirm role matrix loads, role-change dropdown works.

---

## ITEMS STILL BROKEN / PARTIAL

| Item | What's missing |
|---|---|
| Atlas sub-page tabs | /atlas/map, /atlas/layers, /atlas/boundaries etc. removed from sidebar but tabs on /atlas not yet wired |
| /eday sub-page tabs | /eday/capture, /eday/war-room, /eday/hq removed from sidebar but tabs on /eday not yet wired |
| /reputation tabs | /reputation/command, /reputation/pages removed from sidebar but tabs not wired |
| Import ward assignment | Ward auto-assign uses simple municipality match — point-in-polygon needs PostGIS or turf.js enhancement |

---

## GEORGE'S OPEN ACTIONS

Critical blocking:
- [ ] Set up Resend — items 10–16 (email is silent without it)
- [ ] Set up Stripe — items 2, 3, 4–9 (fundraising is broken without it)
- [ ] Set up Twilio — items 17–21 (SMS is silent without it)

Lower priority:
- [ ] Upstash Redis — items 31–34 (rate limiting falls back to in-memory)
- [ ] Facebook redirect URI confirm — item 90
- [ ] Twitter/X OAuth — items 93–94
- [ ] iOS TestFlight — items 60–63

Browser-verify queue (new today):
- [ ] Voter file import end-to-end
- [ ] Atlas turf save/load
- [ ] /ops/data-management all 3 sections
- [ ] Settings/permissions page

---

## NEXT SESSION OPENER

Platform is clean. Build pending green. All parallel agent work merged to main.

Before starting any task:
1. `git pull origin main`
2. Check `WORK_QUEUE.md` for next PENDING task
3. Claim it: `PENDING` → `CLAIMED [date]`, commit + push
4. Build it complete

Next meaningful tasks (priority order):
1. **Wire /atlas tabs** — map, layers, boundaries, results, calculator as tabs on the /atlas page (sidebar now points to /atlas only)
2. **Wire /eday tabs** — capture, war-room, hq as tabs on /eday
3. **Wire /reputation tabs** — command, pages tabs not wired
4. **iOS TestFlight submission** — Expo app is built, needs eas.json + App Store Connect record

---

## COORDINATION RULES

- `npm run push:safe` is the ONLY push command. Never `git push`.
- DONE = browser-verified by George. Build green = minimum to push.
- Every new feature needs a sidebar entry before claiming DONE.
- Every schema change → add checkbox to GEORGE_TODO.md immediately.
- Update this file IN PLACE. Never append another block on top.
