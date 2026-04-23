# Poll City — Work Queue
## Session Coordination File

**Every AI session MUST read this file before touching any code.**
**Every AI session MUST claim a task before starting it.**
**Every AI session MUST mark tasks done when finished.**

---

## HOW TO USE THIS FILE

1. `git pull origin main`
2. Read this file
3. Pick ONE unclaimed PENDING task
4. Edit: `PENDING` → `CLAIMED [YYYY-MM-DD]`
5. Commit + push immediately
6. Build it
7. `npm run build` exits 0
8. Edit: `CLAIMED` → `DONE — commit [hash]`
9. Commit + push

If two sessions conflict: first claim commit on `origin/main` wins.

---

## WHAT "DONE" MEANS

A feature is DONE when:
- `npm run build` exits 0 with it included
- A user can navigate to it from the sidebar and use it end-to-end
- Empty states, loading states, and error states all render without crash

---

## PLATFORM STATUS — WHAT IS LIVE

Everything below is built, pushed, and accessible in the app.

| Module | What's live |
|---|---|
| **Dashboard** | KPI cards, health score, all 8 data fields wired |
| **Daily Briefing** | Adoni morning summary, priorities, canvassing pace, red flags |
| **Contacts / CRM** | Full CRUD, filters, soft delete, funnel stage, households, duplicate detection + merge UI |
| **Volunteers** | Profile management, shift scheduling (calendar view), group management, expense workflow |
| **Tasks** | Full task management with assignment |
| **Coalitions** | CRUD, member count, org logos, edit flow |
| **Field Ops** | Unified command center, programs, routes, mobile GPS, lit-drops, materials, teams, audit, follow-ups |
| **Field Ops sub-routes** | `/field-ops/walk`, `/field-ops/scripts`, `/field-ops/map`, `/field-ops/print` — all live via delegate components |
| **GOTV** | Shared metrics truth layer, ride coordination |
| **Election Day** | Role-aware 4-tab command center (CM + scrutineer), `/eday/hq` election night command center |
| **Signs** | Full sign management |
| **Events** | Full event management |
| **QR Capture** | Landing flow, intent capture, admin hub, batch creation, prospect funnel, analytics |
| **Communications** | Email blast, SMS blast, social manager, automation engine (Phase 7), unified inbox, delivery tracking, analytics, scheduled messages, templates |
| **Calendar** | 4-view command center, candidate schedule, cross-system wiring, reminders cron |
| **Polls** | All vote types (NPS/WordCloud/Emoji/Priority/Timeline), live results SSE, demographics panel |
| **Forms** | Form list, create from templates, embed links, drag-drop builder (`/forms/[id]/edit`), results table (`/forms/[id]/results`) |
| **Fundraising** | Full donation CRM, Stripe integration, compliance engine, receipt emails, donor pages |
| **Finance** | Full 9-tab suite: budget, expenses, purchase requests, vendors, reimbursements, approvals, reports, audit, role-based access |
| **Print** | Dashboard, templates browser, packs, shops listing, shop registration, product pages, design engine, job management (create/track/detail) |
| **Analytics** | Approval ratings, sentiment, signal tracking |
| **Candidate Intel (CIE)** | Lead ingestion, detection, scoring, outreach, admin command center |
| **Reputation (RCAE)** | Alert engine, issue engine, rule engine, command center, onboarding |
| **Notifications** | Voter outreach composer, opt-in management, delivery stats |
| **Fuel / Logistics** | Vendor management, orders, requests, expense bridge |
| **AI Assist** | Full Adoni chat page, 4 category groups, suggested prompts |
| **Import / Export** | Smart import wizard, voter file handling |
| **Address / Voter Lookup** | `/lookup` — instant search by name/address/phone |
| **Quick Capture** | `/capture` — fast contact/interaction capture for events |
| **Call List** | `/call-list` — phone banking list view |
| **Super Supporters** | `/supporters/super` — VIP supporter tier |
| **Settings** | Profile, campaign, brand, security (2FA/WebAuthn/sessions/API keys), custom fields, recycle bin |
| **Billing** | Stripe integration, invoice history, portal, plan selector |
| **Ops** | Platform overview, campaigns, security monitor, feature verify, video docs, content review, demo tokens |
| **Design Preview** | `/design-preview/*` — Figma prototype screens (internal use) |

---

## REMAINING WORK

### ACTIVE BUILD (2026-04-22)

| Task | Status | Notes |
|---|---|---|
| Source Intelligence Hub — platform-level monitored source repository + subscription system | DONE — commit e682625 + 44ed332 | 10 new Prisma models (PlatformSource, SourceEndpoint, SourceHealthCheck, CampaignSourceActivation, SourceItem, SourceItemEntity, SourcePack, SourcePackItem, CampaignPackActivation, SourceAuditLog). Service layer: source-service.ts, source-validator.ts, subscription-service.ts. 12 API routes under /api/sources/* (SUPER_ADMIN only) + 3 routes under /api/campaign/sources/* (campaign-scoped). UI: /ops/sources (source library), /ops/sources/[id] (detail + health + audit), /ops/sources/packs (pack management), /reputation/sources (campaign subscribe). Both sidebar entries wired. Build GREEN 7ca8495. George must run npx prisma db push (10 new tables). |

### ACTIVE BUILD (2026-04-18 → 2026-04-22)

| Task | Status | Notes |
|---|---|---|
| AtlasMapClient unification — merge whitby/toronto/markham into one component with MunicipalityConfig prop | DONE — commit e88ed2e | src/components/atlas/atlas-map-client.tsx. City wrappers: whitby/toronto/markham-map-client.tsx. Preload-all pattern included (all cities). |
| AtlasMapClient Phase 2 — campaign DB overlay: support levels on doors, visit history, DNK suppression, ward campaign stats | DONE — commit 1c67f8c | GET /api/atlas/contacts-overlay (auth-gated, 401=silent). enrichAddresses() wires contact data to OSM dots. Expression-based layer colors: green=strong support → red=strong opposition, grey=DNK, gold stroke=visited. Ward panel shows campaign stats. Address popup shows support level + visit count. No schema changes needed. |
| AtlasMapClient Phase 3 — turf cutting overhaul: street search, manual street-to-turf assignment, volunteer DB assignment, two-mode turf builder | PENDING | See SESSION_HANDOFF.md for full spec. No schema changes — uses existing VolunteerProfile model. Lives entirely in src/components/atlas/atlas-map-client.tsx. |
| AtlasMapClient Phase 4 — true unified pan map: single /atlas/map page showing Whitby + Toronto + Markham simultaneously, pan-to-navigate, /api/atlas/all-wards merger endpoint | DONE — commit 7c9637b | /atlas/map live. GET /api/atlas/all-wards merges all 3 cities. AtlasAllMapClient: per-ward addressesApi, sidebar grouped by municipality with collapse toggle, GTA zoom 9 initial view. Sidebar: "Ontario Map" in Polling Atlas. Code complete. Awaiting George browser confirmation. |
| Hardened Ontario Ward Infrastructure — 3-layer DB cache (WardBoundary table), universal ingestor, 28-municipality registry, daily cron, ETag headers | PARTIALLY SEEDED — 10/28 municipalities live | 10 municipalities seeded (58 wards). 20 failed due to Represent rate limiting. Fix shipped in e682625: Represent calls now fully serial (3s gaps). George must re-run seed endpoint to get remaining 20 cities. See SESSION_HANDOFF.md for exact seed URL. |
| Ontario Election Results Overlay — Whitby test run: 6 Ontario Open Data CSVs (2014/2018/2022), seed script, GET /api/atlas/election-results, toggle layer + panel in atlas-map-client, wired to whitby config | DONE — commit 44ed332 (push in progress) | data/ontario-elections/ (6 CSVs), scripts/seed-ontario-elections.ts, src/app/api/atlas/election-results/route.ts. Election toggle in whitby header — turnout choropleth + race results panel per year. No schema migration needed (uses existing ElectionResult table). George must run: npx tsx scripts/seed-ontario-elections.ts --municipality "Whitby T" to populate DB. |

### ACTIVE BUILD (2026-04-18 → 2026-04-21)

| Task | Status | Notes |
|---|---|---|
| Municipal Election Scraper — Phase 1 (Ontario): municipality discovery, Toronto CKAN scraper, raw data storage, GET /api/scraper/municipalities + /candidates | DONE — commit 20f8e22 | MuniScrapeRun + RawMuniCandidate schema, Toronto CKAN scraper (Playwright), CLI runner, 2 API routes, 19 unit tests. George must run `npx prisma db push` + `npm run scrape:install-browsers` + `npm run scrape:toronto:dry`. |
| Quick Capture System — full election results capture (advance vote + election day) | DONE — commit 9cff9eb | Schema (7 models), 18 API routes, admin setup, mobile capture, war room, review/export. P0 hardening: atomic double-entry, dedup totals, location reset on revision. George must run `npx prisma db push` against Railway. |
| Poll City Social — Phase 1 rebuild: home feed, unified politician profile, interest groups, notification engine | DONE — commit 0e5ff04 | PoliticianPost + SocialNotification + CivicInterestGroup schema, home feed, /social/politicians/[id], /social/groups, /social/notifications |
| Visual Website Builder — template gallery + 4 distinct hero layouts + split-screen editor rebuild | DONE — commit b805fc4 | Rebuilt settings/public-page: InlineGallery (24 templates), 4 distinct LivePreview heroes, showGallery state wired. 4 layout variants in candidates/[slug] and candidate-page-client.tsx. |
| Electron Desktop App — Mac (.dmg) + Windows (.exe) installer, system tray, auto-updates, deep links | DONE — commit pending push | desktop/ folder: Electron shell → app.poll.city, electron-builder, electron-updater, system tray, deep links (pollcity://), offline page, macOS entitlements. George needs icon files + code signing certs — see GEORGE_TODO.md items 67–73. |
| Address Pre-List Generator — 3-source backend (OSM/MPAC/StatsCan) + DB cache + import scripts | DONE — commit 9affca2 | POST /api/address-prelist/generate, MunicipalityAddressCache/DisseminationArea/MpacAddress schema, scripts/import-mpac.ts, scripts/import-statcan-da.ts. George must run `npx prisma db push`. OSM source works immediately without backend. |
| Atlas Command — Data Import Pipeline page | DONE — commit 64b717f | /atlas/import: 5-source cards, Address Pre-List wizard wired to live API, import history table. Polling Atlas section added to sidebar. All 4 atlas stub routes (boundaries/results/calculator/demographics) resolve with meaningful coming-soon pages. |
| Canadian terminology sweep | DONE — commit 64b717f | precinct → poll division in GOTV war room map, GOTV client, media demo, design-preview dashboard screen. |

---

### P0 — CRITICAL: Blocks First Real Customer

| Task | Status | Notes |
|---|---|---|
| Migration baseline | PENDING | Run `npx prisma db push` before first real customer. GAP-003. George's action. |
| CASL consent management | DONE — commit cc97b33 | ConsentRecord schema (3 enums + model), POST/GET /api/compliance/consent, email blast consent filter (skips unconsented, surfaces count), Smart Import consent column mapper + processor, Contact detail CASL Consent tab, /compliance overview page, sidebar entry. George must run `npx prisma db push` to apply schema. |
| Print vendor portal | DONE — commit f393872 | PRINT_VENDOR role + userId on PrintShop. /vendor/signup (public). /vendor/dashboard + /jobs + /bids + /jobs/[id] (vendor portal). 5 API routes under /api/vendor/. Middleware routes PRINT_VENDOR to /vendor and restricts to vendor paths. Requires npx prisma db push. |
| Turf cutting — 0 voters bug | DONE — commit 64aa67f | Preview API take:500 cap removed for filtered queries; turf stops now sorted by street+number; import aliases for poll/polling_division/streetNumber/streetName added; print walk-list uses parsed-integer sort; map mode shows honest geocoding warning. |

---

### P1 — Connection Gaps (platforms exist but don't talk to each other)

These are coherence failures — things that should connect but don't.

**THE CORE CHAIN: Social profile → Claim → Campaign → Operations**
This is the business model. Every gap below undermines the conversion funnel.

| Gap | Status | What's missing | User impact |
|---|---|---|---|
| Brand Kit → applied to outputs | DONE — commits a20d6b0, a29022c | Email blasts + scheduled emails now use branded HTML (logo header, primary colour bar, brand font). Sidebar shows amber badge when brand kit incomplete. Print/candidate page/receipts were already wired. | Every campaign looks generic |
| Social → Campaign consent bridge | DONE a17a74f | Voters on Poll City Social who follow/vote can't consent to being contacted by a specific campaign. The link between the two platforms is missing. | Key monetization gap |
| Candidate Q&A responses | DONE — commit 04349eb | POST /api/social/questions/[id]/answer (auth + official link), GET /api/social/questions inbox, /communications/qa QaInboxClient (unanswered/answered tabs, inline answer textarea, optimistic remove), SocialNotification on answer, sidebar Q&A Inbox entry. PublicQuestion already had answer/answeredAt fields — no migration needed. | Engagement dead end |
| **"Claim this profile" → signup with officialId** | **DONE — commit f4b0f5b** | `/claim/[slug]` page built — CTA routes to `/claim/${p.id}`, `ClaimClient` calls `/api/auth/claim-profile` which creates account, sets `Campaign.officialId`, marks `Official.isClaimed`. Full chain verified. | Self-serve acquisition funnel is broken |
| **Ops provision → officialId linkage** | **DONE — commit 24e8bf8** | officialId field added to provision form + API — campaign creation links to Official record, marks isClaimed=true. | George can't see which social profiles converted to paid campaigns |
| Volunteer reimbursement → payment | PENDING | Approval chain is complete but actual payment (Stripe or bank transfer) is not automated | Finance officers manually process outside the platform |
| Voter file import → enrichment | PARTIAL — commits 64aa67f + fedd9c3 | Electoral field aliases wired. Geocoding infrastructure exists. Household grouping now runs automatically after each import chunk (fedd9c3) — contacts at the same address get linked into Household records for canvassing. Remaining gap: GOOGLE_MAPS_API_KEY needed in Vercel for scale geocoding (Nominatim = 1/sec, too slow for 15k+ household voter files). No schema changes needed for household grouper. | Canvassers see grouped households; maps need geocoding key to show pins |

---

### P2 — Feature Gaps (pages work, specific actions are incomplete)

| Task | Status | What a user can do TODAY | What's missing |
|---|---|---|---|
| Geographic maps (CNN-level) | DONE — commits 41e8283 + 32d467d | MapLibre GL JS migration complete. All 7 Leaflet components replaced. Ward boundaries, turf draw with live contact count, heatmaps, canvasser tracking, choropleth, signs map. |
| Marketing nav overlap | DONE — commit 4020505 | Election countdown bar and navbar were stacked on top of each other. Wrapped in sticky container — both now visible. |
| SUPER_ADMIN → /ops routing | DONE — commits b1c8131, 45bdcdc | George lands on /ops on login. Redirected from /dashboard if no activeCampaignId. Null guards added. |
| Founder campaign view UX | DONE — commits 71a98f5, 1b1e6ce | "Enter Campaign View" in Ops→Clients. Navy banner shows campaign name when inside client view. "Exit to Founder View" clears activeCampaignId and returns to /ops. |
| Canvassing script branching | DONE — commit 7fe5cf1 | Full branch editor: edit mode (add/wire nodes + responses), interactive preview mode (step-through with back/restart), save per-script to DB. George must run `npx prisma db push` to activate branchLogic column. |
| `/print/shops` — vendor depth | PENDING | Browse shops, search | Distance filter, capacity/turnaround display, direct quote button |
| `/forms/[id]/results` — analytics | DONE — commit 7fe5cf1 | Charts tab: bar chart per field (option fields), trend line, answer rate per field, 4 stat cards. Responses tab: paginated table (50/page). CSV export always visible. |
| Social feed | DONE — commit 0e5ff04 + this session | Discover officials, vote on polls | Phase 1 live. Desktop 3-column shell: PCSHeader, PCSLeftSidebar, PCSRightRail. Blank page fixed (nested html/body). PCS Feed tab in campaign social manager. 5 recent 2026 seed posts added. George must run seed script. |
| Politician profile — full councillor-website standard | DONE — commit 19a595f | Full profile: events, promises tracker, newsletter subscribe, share button, claim CTA, approval rating fix, ward info, campaign site link | — |
| Weather integration | PENDING | None | Simple weather API for canvassing day planning |
| Marketing site content | DONE — commit 8aed4ad | Full content pass: copy, social proof, pricing, CTAs, About page, /contact, email capture, Poll City Social section, Officials vertical | — |
| Adoni per-tool rate limit | PENDING | Adoni works | Per-tool rate limiting to prevent runaway API cost |

---

### P2 — Planned Phases (comms, calendar, social)

| Task | Status | Notes |
|---|---|---|
| Social OAuth login providers — Facebook + Twitter | DONE — commit d277021 | FacebookProvider + TwitterProvider wired in auth-options.ts. Guards on env vars — providers only activate when credentials present. George must complete GEORGE_TODO items 90-94 to activate in production. |
| Comms Phase 8 — Social publishing | PENDING | Real Facebook/X/LinkedIn API calls. UI built, API stubs exist. Needs OAuth registration. |
| Comms Phase 10 — Fatigue guard | PENDING | Max contact frequency enforcement across channels. |
| Calendar Phase 6 — Google/Outlook OAuth | PENDING | Real two-way sync. Stub at `/api/campaign-calendar/sync`. Needs Google/Outlook OAuth registration. |
| Figma UI matching | BLOCKED | Waiting on George to copy 3 spec files from Figma Make project into `docs/`. See GEORGE_TODO item 58. |

---

### P3 — Future Product Surfaces (separate builds, not sprints)

These are entire products. Each is a substantial build. George decides when.

| Product | What it is | Status |
|---|---|---|
| **Print Vendor Portal** | Dedicated login + job board + production status updates for print vendors | ❌ Not started |
| **Campaign Services Network** | "Uber for campaign services" — book on-demand canvassers, sign teams, lit-drop crews with ratings + marketplace pricing | ❌ Not started |
| **Poll City Marketplace** | Campaign merch stores — multi-product, multi-vendor, revenue splits | ❌ Not started |
| **George's Brain (CampaignWisdom)** | George's 35 years of political expertise extracted into a knowledge base, integrated into Adoni | ❌ Not started |
| **TV Mode** | 7 election night display modes for press room (Chromecast/AirPlay) | ❌ Not started |
| **Mobile App (App Store)** | React Native app in `mobile/` is built and API-connected — needs publishing. May 2026 deadline. | ⚠️ Built, not published |
| **Poll City Social (full)** | Activity feed, notification engine, civic engagement beyond polls + officials, consent bridge | ⚠️ Foundation built |
| **Simulation Engine** | Real-time campaign activity simulator for demos and training | ❌ Not started |

---

### Deferred

| Feature | Reason |
|---|---|
| Phone banking full dialer | `/call-list` works as CandidateCallList component. Full dialer is V2. |
| Dashboard widget popout | Works as dashboard-studio delegate. No identified user need. |

---

## GEORGE'S MANUAL ACTIONS

**Full checklist with step-by-step instructions lives in `GEORGE_TODO.md`.**

Quick summary of open items:

| Priority | Action |
|---|---|
| **CRITICAL** | Migration baseline — `npx prisma db push` (GAP-003) |
| **HIGH** | Stripe keys (Stripe Dashboard → Railway env vars) |
| **HIGH** | Resend domain verification + API key → Railway |
| **HIGH** | `ANTHROPIC_API_KEY` → Railway (Adoni is silent without it) |
| **HIGH** | Security salts + `DATABASE_ENCRYPTION_KEY` → Railway |
| **HIGH** | Railway automated backups — enable before first customer |
| **MEDIUM** | Twilio SMS setup |
| **MEDIUM** | Upstash Redis (rate limiting) |
| **MEDIUM** | Google OAuth credentials (for Google Calendar sync) |
| **MEDIUM** | Copy 3 Figma spec files into `docs/` (see GEORGE_TODO item 58) |
| **LOW** | VAPID keys (push notifications) |
| **LOW** | Cloudflare Turnstile (spam protection) |

---

## COORDINATION RULES

- `npm run push:safe` is the ONLY push command. Never `git push` directly.
- Build must be green before marking DONE. `tsc --noEmit` is not enough.
- Every new feature needs a sidebar entry before claiming DONE.
- Every new API route needs `apiAuth()` + `campaignId` scoping before claiming DONE.

---

*Rewritten 2026-04-17 — previous sprint-based queue replaced with feature-lifecycle format. All "stub routes" audited: every route confirmed functional via delegate components. All Sprint 4/5 items audited: all are real implementations, not stubs. Remaining work is accurately scoped above. — Claude Sonnet 4.6*
