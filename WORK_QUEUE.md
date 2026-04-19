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

### ACTIVE BUILD (2026-04-18)

| Task | Status | Notes |
|---|---|---|
| Municipal Election Scraper — Phase 1 (Ontario): municipality discovery, Toronto CKAN scraper, raw data storage, GET /api/scraper/municipalities + /candidates | DONE — commit 20f8e22 | MuniScrapeRun + RawMuniCandidate schema, Toronto CKAN scraper (Playwright), CLI runner, 2 API routes, 19 unit tests. George must run `npx prisma db push` + `npm run scrape:install-browsers` + `npm run scrape:toronto:dry`. |
| Quick Capture System — full election results capture (advance vote + election day) | DONE — commit 9cff9eb | Schema (7 models), 18 API routes, admin setup, mobile capture, war room, review/export. P0 hardening: atomic double-entry, dedup totals, location reset on revision. George must run `npx prisma db push` against Railway. |
| Poll City Social — Phase 1 rebuild: home feed, unified politician profile, interest groups, notification engine | DONE — commit 0e5ff04 | PoliticianPost + SocialNotification + CivicInterestGroup schema, home feed, /social/politicians/[id], /social/groups, /social/notifications |
| Visual Website Builder — template gallery + 4 distinct hero layouts + split-screen editor rebuild | DONE — commit b805fc4 | Rebuilt settings/public-page: InlineGallery (24 templates), 4 distinct LivePreview heroes, showGallery state wired. 4 layout variants in candidates/[slug] and candidate-page-client.tsx. |
| Electron Desktop App — Mac (.dmg) + Windows (.exe) installer, system tray, auto-updates, deep links | DONE — commit pending push | desktop/ folder: Electron shell → app.poll.city, electron-builder, electron-updater, system tray, deep links (pollcity://), offline page, macOS entitlements. George needs icon files + code signing certs — see GEORGE_TODO.md items 67–73. |

---

### P0 — CRITICAL: Blocks First Real Customer

| Task | Status | Notes |
|---|---|---|
| Migration baseline | PENDING | Run `npx prisma db push` before first real customer. GAP-003. George's action. |
| CASL consent management | DONE — commit cc97b33 | ConsentRecord schema (3 enums + model), POST/GET /api/compliance/consent, email blast consent filter (skips unconsented, surfaces count), Smart Import consent column mapper + processor, Contact detail CASL Consent tab, /compliance overview page, sidebar entry. George must run `npx prisma db push` to apply schema. |
| Print vendor portal | PENDING | Vendors can register via Stripe Connect but have no login, no job view, no status updates. Print marketplace is broken without this. |

---

### P1 — Connection Gaps (platforms exist but don't talk to each other)

These are coherence failures — things that should connect but don't.

| Gap | Status | What's missing | User impact |
|---|---|---|---|
| Brand Kit → applied to outputs | CLAIMED 2026-04-19 | `/settings/brand` saves colours/logo/fonts but they are NOT applied to email templates, print designs, or the candidate public page. Settings page that sets nothing. | Every campaign looks generic |
| Social → Campaign consent bridge | DONE a17a74f | Voters on Poll City Social who follow/vote can't consent to being contacted by a specific campaign. The link between the two platforms is missing. | Key monetization gap |
| Candidate Q&A responses | CLAIMED 2026-04-19 | Voters ask questions on /candidates/[slug] but candidates cannot reply publicly from within the platform | Engagement dead end |
| Volunteer reimbursement → payment | PENDING | Approval chain is complete but actual payment (Stripe or bank transfer) is not automated | Finance officers manually process outside the platform |
| Voter file import → enrichment | PENDING | Smart import handles general CSVs but does NOT parse ward/poll/riding/household from voter files. Every campaign starts with a voter file. | Campaign setup requires manual data work |

---

### P2 — Feature Gaps (pages work, specific actions are incomplete)

| Task | Status | What a user can do TODAY | What's missing |
|---|---|---|---|
| Geographic maps (CNN-level) | PENDING | None | Leaflet choropleth — support by poll, door knock completion, sign density, heat maps. Campaign strategy depends on geography. |
| Canvassing script branching | PENDING | View static scripts | Conditional logic: if voter says X, go to branch Y |
| `/print/shops` — vendor depth | PENDING | Browse shops, search | Distance filter, capacity/turnaround display, direct quote button |
| `/forms/[id]/results` — analytics | PENDING | See raw submission table | Aggregated charts per field (bar/pie/average), CSV export |
| Social feed | DONE — commit 0e5ff04 | Discover officials, vote on polls | Phase 1 live: home feed, politician profiles, groups, notifications, fan-out engine |
| Politician profile — full councillor-website standard | DONE — commit 19a595f | Full profile: events, promises tracker, newsletter subscribe, share button, claim CTA, approval rating fix, ward info, campaign site link | — |
| Weather integration | PENDING | None | Simple weather API for canvassing day planning |
| Marketing site content | DONE — commit 8aed4ad | Full content pass: copy, social proof, pricing, CTAs, About page, /contact, email capture, Poll City Social section, Officials vertical | — |
| Adoni per-tool rate limit | PENDING | Adoni works | Per-tool rate limiting to prevent runaway API cost |

---

### P2 — Planned Phases (comms, calendar, social)

| Task | Status | Notes |
|---|---|---|
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
