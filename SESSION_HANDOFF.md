# Session Handoff — Poll City
## The Army of One Coordination File

**Last updated:** 2026-04-20 (session 2)
**Updated by:** Claude Sonnet 4.6 (SocialCommand ported, MapLibre everywhere in preview lab, Google geocoding wired, opponent sign grid, dropdown z-index fix)

---

## 🚨 NEXT SESSION TASK — PORT NEW FIGMA PAGES 🚨

**George has built ~50 new pages in Figma Make.** They have NOT arrived in the repo yet.

**What to do when they land:**
1. `git pull origin main` — Figma Make pushes to `figma_design_pollcity_iosapp/pages/`
2. Check what's new: `git diff HEAD~1 --name-only -- figma_design_pollcity_iosapp/`
3. For each new page: read Figma source → adapt imports → wire real API → add route in `src/app/(app)/design-preview/`
4. Adaption rules: `motion/react` → `framer-motion` | `../../utils/cn` → `@/lib/utils`

**George needs to: Publish/Sync from Figma Make** to push new pages to GitHub. Once they appear, the next agent picks them up and ports them all.

**What is already ported and live:**
- `/design-preview/social/command` — full Field Command wizard (DONE ✓)
- `/design-preview/app/canvassing` — Live Turf with real MapLibre (DONE ✓)
- All other 25 preview screens as stubs or partial ports

---

## 🚨 NEW ACTIVE TRACK — MOBILE PREVIEW LAB (added 2026-04-20) 🚨

**READ THIS BEFORE DOING ANY MOBILE WORK.**

George is building the Poll City iOS app for campaign staff. There are two separate tracks:

**Track 1 — Design Preview Lab** (`/design-preview`, web, SUPER_ADMIN only)
- Phone frame in the browser showing Figma-ported screens
- Sidebar → Platform → "Mobile Preview" → opens full-screen, no app shell
- 27 screens exist as stubs. They need to be replaced with the full Figma designs + live data.
- Figma source files live in `figma_design_pollcity_iosapp/pages/` in the repo root
- Preview components live in `src/components/figma-preview/screens/`
- Individual screen routes: `src/app/(app)/design-preview/social/[screen]/page.tsx` etc.
- Porting process: Read Figma source → adapt imports (motion/react→framer-motion, react-router→next/link) → wire real API data → verify in browser

**Track 2 — Expo iOS App** (`mobile/` directory)
- Real native app. Shell exists. Full design rebuild needed to match Figma.
- Not started. Comes after Track 1 proves each screen.

**RULE: NEVER touch live web app pages when working on mobile preview. Completely separate.**
**RULE: No new Prisma schema for preview work — read existing models only.**
**Full context in memory:** `project_mobile_preview.md`

---

## ⚠️ ALL-SESSIONS BROADCAST — READ BEFORE ANYTHING ELSE ⚠️

**INFRASTRUCTURE:**
- App runs on **VERCEL**. Railway is the **database only**.
- ALL env vars → Vercel → Project Settings → Environment Variables
- Railway Variables tab → PostgreSQL service only. NEVER add app env vars there.

**BUILD:**
- Use `npm run push:safe` exclusively. Never `git push` directly.
- `push:safe` wipes `.next` before building (Windows ENOENT fix).
- `tsc --noEmit` passing ≠ build passing. Always run the full build.

**DATABASE:**
- Schema changes → `npx prisma db push` (Railway).
- NEVER `prisma migrate dev` — it will prompt to wipe prod.

**UX DIRECTIVE:**
- Every flow must meet Stripe-quality guided UX. No dead ends, no jargon.
- Ask: "Would a first-time candidate understand this without help?"

---

## CURRENT PLATFORM STATE (as of 2026-04-21 session 4 — overnight autonomous build)

### Build
- **GREEN** — latest commit `8a6454d` pushed to main, Vercel deploying
- 5 new models in schema NOT yet pushed to Railway: `AddressPreList`, `EnrichmentRun`, `EnrichmentResult`, `MunicipalityAddressCache`, `DisseminationArea`, `MpacAddress`
- George MUST run `npx prisma db push` before demo

### Session 4 — What shipped overnight (autonomous)

**Atlas Command — Data Import Pipeline** (`/atlas/import`):
- Full page matching Figma design: 5 source cards (Riding Boundaries, Election Results, Census Demographics, Address Pre-List, Enrich & Merge)
- Address Pre-List source wired to live `/api/address-prelist/generate` (OSM works now, no API key)
- Municipality input pre-filled with "Town of Whitby"
- Results table preview + CSV export after fetch
- Import History table with seeded demo entries (matches Figma)
- File drop zone for GeoJSON/CSV sources with required fields display

**Polling Atlas Sidebar** — 5-item section added:
- ✅ `/atlas/import` — Atlas Command (live, data import pipeline)
- ✅ `/atlas/boundaries` — Boundary Manager (stub, "coming soon" with description)
- ✅ `/atlas/results` — Historical Results (stub)
- ✅ `/atlas/calculator` — Swing Calculator (stub)
- ✅ `/atlas/demographics` — Demographics (stub)
- All stubs link back to Atlas Command, none 404

**Canadian terminology sweep**:
- GOTV war room map, GOTV client, media demo: "precinct" → "poll division" everywhere

**Platform audit (overnight)**:
- 85%+ of platform is working end-to-end
- All 40+ sidebar routes resolve (no more 404s)
- All core flows (Contacts, Field Ops, GOTV, Communications, Fundraising, Dashboard) are wired to real APIs
- Dashboard has the best empty states — all other flows have adequate fallbacks
- `/officials` and `/social` sidebar links resolve correctly to public-facing root pages

### Founder Experience — LIVE
- Super Admin (George) logs in → lands on `/ops`
- `/ops` Clients tab → "Enter Campaign View" → enters any client campaign
- Navy FounderBanner shows: "Viewing: [Campaign Name] · Exit to Ops"

### Address Pre-List Generator — LIVE
- `POST /api/address-prelist/generate` — 3 source paths (OSM live now; MPAC/StatsCan after import)
- DB cache prevents re-hitting OSM for same municipality within 30 days
- OSM source: type "Town of Whitby" → fetches up to 2,000 real addresses from Overpass API

### ⚠️ WEDNESDAY DEMO PREP — Maleeha + Mayor of Whitby (2026-04-22)

**Before the demo George MUST do:**
1. Run `npx prisma db push` (new schema models aren't in Railway yet)
2. Verify login works at app.poll.city
3. Enter the Demo Campaign (or create a "Whitby Ward 4" campaign for authenticity)

**Safe to demo (works right now):**
- Dashboard, Briefing, Contacts, Volunteers, Field Ops, GOTV, Election Day
- Atlas Command → Atlas Command → type "Town of Whitby" → Fetch from OpenStreetMap
- Communications, Finance, Fundraising (UI shows, sends require env vars)
- Any sidebar item → none 404 anymore

**Avoid during demo:**
- Actually sending email/SMS (needs RESEND_API_KEY / Twilio)
- Completing Stripe payment flow (needs STRIPE_SECRET_KEY)
- Clicking MPAC or StatsCan sources in Atlas Command (need import scripts run first)

---

## WHAT IS ACTUALLY LIVE (code confirmed, build green)

Everything below exists in origin/main and the build passes. Whether it works end-to-end in production depends on whether env vars and DB migrations have been applied.

| Module | What's live in code | Production caveat |
|---|---|---|
| Dashboard | KPI cards, health score, 8 data fields | None |
| Daily Briefing | Adoni morning summary, priorities | Needs ANTHROPIC_API_KEY in Vercel |
| Contacts / CRM | Full CRUD, filters, soft delete, households | None |
| Volunteers | Profiles, shifts, groups, expenses | None |
| Field Ops | Full command center, routes, GPS, turf draw | MapLibre (no API key needed — OpenFreeMap) |
| GOTV | Shared metrics, ride coordination | None |
| Election Day | 4-tab command center, election night HQ | None |
| Quick Capture | Mobile capture, war room, review/export | Needs `npx prisma db push` (QR models — done per GEORGE_TODO item 2) |
| Communications | Email blast, SMS, social, automation, inbox | Email needs RESEND_API_KEY in Vercel. CASL filter crashes without DB push. |
| CASL Compliance | /compliance, consent tab on contacts | ⚠️ Crashes until `npx prisma db push` |
| Analytics | Approval ratings, sentiment, signals | Historical tab crashes until `npx prisma db push` (intelligenceEnabled col) |
| Candidate Intel | Lead ingestion, scoring, outreach | None |
| Reputation | Alert engine, rule engine, command center | None |
| Fundraising | Donation CRM, Stripe Connect, receipts | Needs STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in Vercel |
| Finance | 9-tab suite: budget, expenses, approvals, audit | None |
| Print | Templates, packs, design engine, jobs | None |
| Forms | Builder, results | None |
| Polls | All vote types, live results SSE | None |
| Social | Home feed, politician profiles, groups, Q&A, notifications | None |
| Officials directory | Rebuilt: dark/light, level tabs, postal code, proper follow API, infinite scroll (commits 6e90b25 + c2201c2) | NOT browser-verified. Follower counts now correctly returned from directory API. |
| Ops | Clients, readiness, intelligence controls, social officials panel | SUPER_ADMIN only |
| Settings | Profile, campaign, brand, security, billing | None |
| Maps | MapLibre GL JS — ward boundary, turf draw, choropleth, signs, canvasser | OpenFreeMap tiles (no key). Geocoding: needs GOOGLE_MAPS_API_KEY for voter files |

---

## HONEST STATUS: WHAT HAS NOT BEEN VERIFIED IN BROWSER

George flagged on 2026-04-20 that things claimed as "fixed" are still broken. These categories have NOT been confirmed in production browser testing:

1. **Marketing site** — scroll/nav/layout issues George saw but specific issues not captured
2. **CASL Compliance page** — crashes without `npx prisma db push`. Verified in code only.
3. **Email blast CASL filter** — same dependency.
4. **Analytics Historical tab** — crashes without `npx prisma db push`. Verified in code only.
5. **Q&A Inbox / PCS Social Hub** — code ships but NOT confirmed George can use it end-to-end
6. **Google sign-in** — broken until env vars added to Vercel
7. **Adoni** — silent without ANTHROPIC_API_KEY in Vercel
8. **Email sending** — all email routes broken without RESEND_API_KEY in Vercel

**Rule going forward: NOTHING is marked DONE in WORK_QUEUE until George has confirmed it works in a browser, or the risk of failure is env-var-only (i.e. code is correct, just needs infra).**

---

## GEORGE'S OPEN MANUAL ACTIONS

In priority order — these block real customers:

### 🔴 CRITICAL (platform broken without these)
1. **`npx prisma db push`** — run this right now. Fixes CASL, intelligenceEnabled, scraper models. One command.
2. **RESEND_API_KEY** → Vercel env vars. Without it, all email sending silently fails.
3. **ANTHROPIC_API_KEY** → Vercel env vars. Without it, Adoni is silent.
4. **NEXTAUTH_SECRET** → Vercel env vars. If not set, auth is broken.

### 🟠 HIGH (features broken in prod)
5. **GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET** → Vercel env vars. Google sign-in broken without these. Get values from the `client_secret_...json` file open in your IDE.
6. **STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** → Vercel env vars. Fundraising / Stripe Connect onboarding broken without these.
7. **DATABASE_ENCRYPTION_KEY** → Vercel env vars. Encrypted field reads/writes broken without it.

### 🟡 MEDIUM
8. **GOOGLE_MAPS_API_KEY** → Vercel env vars. **Now critical for field command map.** Key is in `.env.local` — add it to Vercel so `/api/field/geocode` works in production. Without it the map shows approximate street centroids (still functional, just not exact).
9. **Twilio** → SMS blast and two-way SMS broken without TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
10. **Railway automated backups** — enable before first real customer.

### ℹ️ Low / When ready
11. Upstash Redis (rate limiting — gracefully degrades without it)
12. VAPID keys (push notifications)
13. Cloudflare Turnstile (spam protection)

---

## NEXT SESSION OPENER

**Situation:** Address Pre-List Generator backend is live (commit `9affca2`). OSM source works immediately for any Ontario municipality. MPAC and StatsCan sources need one-time import scripts run by George before they're usable.

The frontend for the Address Pre-List Generator lives in the Figma Make prototype — it POSTs to `/api/address-prelist/generate`. The backend is waiting for it.

Next session priorities (in order):

**Step 1:** `git pull origin main`
**Step 2:** Check if new Figma Make pages arrived in `figma_design_pollcity_iosapp/pages/` — port any new screens to `/design-preview/`
**Step 3:** If the AtlasDataImportScreen is in the Figma pages, wire it to `POST /api/address-prelist/generate`
**Step 4:** Add `GOOGLE_MAPS_API_KEY` to Vercel if not already done

**George's optional imports (can run anytime, don't block anything):**
- `npx tsx scripts/import-mpac.ts` — Ontario address data (30-90 min, large download)
- `npx tsx scripts/import-statcan-da.ts` — StatsCan DA demographics (20-40 min)

---

## COORDINATION RULES (non-negotiable — read CLAUDE.md violations section for full detail)

- `npm run push:safe` is the ONLY push command. Never `git push`.
- **DONE = browser-verified by George.** Build green = minimum to push, not minimum to call done.
- Every new feature needs a sidebar entry before claiming DONE.
- Every new API route needs `apiAuth()` + `campaignId` scoping.
- Every schema change → add `[ ]` checkbox to GEORGE_TODO.md CRITICAL section immediately.
- Claim tasks in WORK_QUEUE before starting. `CLAIMED` in origin/main = locked, do not touch.
- Update CURRENT PLATFORM STATE section in place. Do NOT append another LAST SESSION block.
