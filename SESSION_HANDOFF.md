# Session Handoff — Poll City
## The Army of One Coordination File

**Last updated:** 2026-04-20
**Updated by:** Claude Sonnet 4.6 (session-close — mobile preview lab wired, mobile nav parity, SocialCommand port queued)

---

## 🚨 NEXT SESSION TASK — PORT SOCIALCOMMAND (door-to-door wizard) 🚨

**The one task queued for the next session:**

Port the full `SocialCommand.tsx` from Figma Make into the design preview lab.

- **Figma source:** `figma_design_pollcity_iosapp/pages/Social/SocialCommand.tsx` (~42K tokens — read in chunks)
- **Data/types:** `figma_design_pollcity_iosapp/pages/Social/sc-data.ts`
- **Target component:** `src/components/figma-preview/screens/social-command.tsx` (currently a 170-line stub — replace entirely)
- **Preview route:** `/design-preview/social/command`
- **Adaption rules:** `motion/react` → `framer-motion` | react-router `Link`/`useLocation` → `next/link`/`usePathname` | inline cn util → `@/lib/utils`
- **Real API to wire:** canvassing shifts from existing field ops API — check what `/api/field/shifts` returns before wiring

The screen contains: FIELD OPS / WAR ROOM tab split, gamified deployment mission cards (XP, CRITICAL/ELEVATED/STANDARD, ACCEPT), full door-by-door wizard (door → household → survey → extras → summary), theme toggle (dark/light), share drawer, QR stub, radar + area charts.

This is George's primary test screen for the Wednesday demo follow-up and the iOS app field ops tool.

**DO NOT touch any live web app pages. Preview lab only.**

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

## CURRENT PLATFORM STATE (as of 2026-04-20)

### Build
- **GREEN** — Vercel current deployment is green (5RRWk2TkD)
- DB is confirmed in sync (`npx prisma db push` ran — "already in sync")
- Google OAuth credentials: George confirmed added to Vercel this session
- `client_secret*.json` is now git-ignored

### Founder Experience — LIVE as of this session
- Super Admin (George) logs in → lands on `/ops` (not inside a campaign)
- `/ops` Clients tab → "Enter Campaign View" button → enters any client campaign
- Navy FounderBanner shows at top: "Viewing: [Campaign Name] · Exit to Ops"
- Exit to Ops clears session and returns George to `/ops`

### ⚠️ Next session MUST start with a browser walkthrough
George has a meeting Wednesday morning (2026-04-22) with councillor candidate Maleeha and the Mayor of Whitby. The platform needs to be demo-ready. No more building — next session is a page-by-page walkthrough: George navigates, flags what's broken, session fixes in real time.

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
8. **GOOGLE_MAPS_API_KEY** → Vercel. Geocoding works via Nominatim fallback (1/sec, slow). Google needed for 15k+ voter file imports.
9. **Twilio** → SMS blast and two-way SMS broken without TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
10. **Railway automated backups** — enable before first real customer.

### ℹ️ Low / When ready
11. Upstash Redis (rate limiting — gracefully degrades without it)
12. VAPID keys (push notifications)
13. Cloudflare Turnstile (spam protection)

---

## NEXT SESSION OPENER

**Situation:** Build is green. Code is correct for all recent features. The platform looks broken because the DB schema and env vars haven't been applied to production. George needs to run `npx prisma db push` and add env vars to Vercel before any session confirms features as "working in production."

**Recommended priority for next session:**
1. George runs `npx prisma db push` and adds the critical env vars above
2. Then a 30-minute browser walkthrough to identify what's actually broken vs. what just needed the migration
3. Then tackle the PENDING items in WORK_QUEUE: Print vendor portal (P0), Volunteer reimbursement → payment (P1)

**What NOT to build next:** Don't start new features until George can confirm the existing ones work in browser. The coordination problem is real — we've built a lot; we need to verify it before adding more.

---

## COORDINATION RULES (non-negotiable — read CLAUDE.md violations section for full detail)

- `npm run push:safe` is the ONLY push command. Never `git push`.
- **DONE = browser-verified by George.** Build green = minimum to push, not minimum to call done.
- Every new feature needs a sidebar entry before claiming DONE.
- Every new API route needs `apiAuth()` + `campaignId` scoping.
- Every schema change → add `[ ]` checkbox to GEORGE_TODO.md CRITICAL section immediately.
- Claim tasks in WORK_QUEUE before starting. `CLAIMED` in origin/main = locked, do not touch.
- Update CURRENT PLATFORM STATE section in place. Do NOT append another LAST SESSION block.
