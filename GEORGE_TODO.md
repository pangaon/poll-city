# George's Manual Action List
## The things only YOU can do — AI sessions cannot touch production config

This file is maintained by AI sessions. When a new manual step is created, it
gets added here. When you complete a step, change `[ ]` to `[x]`.

**Format**: Steps are numbered within each section. Do them in order where noted.

---

## ⚠️ DATABASE RULE — READ THIS FIRST

**The only command to sync schema to Railway is:**
```bash
npx prisma db push
```
**NEVER run `prisma migrate dev` against Railway.** It will prompt to wipe your database.
`prisma db push` adds new tables and columns without touching existing data. It has worked every time.

---

## 🔴 CRITICAL — Platform is broken without these

- [x] **1. Run `npx prisma db push` against Railway** ✓ Done 2026-04-11 — "database already in sync"
- [x] **2. Run QR Capture migration on Railway** ✓ Done 2026-04-18 — "database already in sync" — The QR Capture feature (8 new models, 8 new enums) requires a schema migration. Until this runs, creating QR codes will return a 500 error.
  1. Open Railway → Poll City service → Connect tab → copy the `DATABASE_URL`
  2. In this repo: `DATABASE_URL="<paste>" npx prisma migrate dev --name qr-capture --skip-seed`
  3. OR if you want non-destructive: `DATABASE_URL="<paste>" npx prisma db push`
  4. Confirm: try creating a QR code at /qr — the "Network error" should disappear

---

## 🟠 STRIPE — Platform API credentials (NOT where money lands)

**READ THIS FIRST — CRITICAL:**
`STRIPE_SECRET_KEY` is Poll City's platform API credential. It is used to make
Stripe API calls. It is NOT the account that receives campaign donations.

Money flow with Stripe Connect (already wired in code):
  Donor pays $100
  → Stripe API called using George's platform key (just a credential)
  → $98.50 sent to CAMPAIGN's Express account (their bank, not George's)
  → $1.50 (1.5% platform fee) sent to George's Stripe balance
  → Stripe processing fee (~2.9% + $0.30) deducted from campaign's side

George's key is required so the server can make Stripe API calls at all.
Without it, campaigns can't even start their own Express onboarding.
George never touches the donation principal — only the 1.5% fee.

**Each campaign connects their own Stripe Express account separately.**
They do that from Fundraising → Settings inside the app.
Until they do, the donate button is hidden from their public page automatically.

### Step A — Add env vars to Railway

Go to Railway → Poll City service → Variables tab. Add each one:

| Variable | What it does |
|---|---|
| `STRIPE_SECRET_KEY` | Platform API credential — lets the server talk to Stripe. Does NOT receive donations. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side key for Stripe Elements (payment form UI) |
| `STRIPE_FUNDRAISING_WEBHOOK_SECRET` | Verifies incoming Stripe event webhooks are authentic |

- [ ] **2. Add `STRIPE_SECRET_KEY` to Vercel**
- [ ] **3. Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to Vercel**

### Step A2 — Enable Stripe Connect on YOUR Stripe account

This is a one-time platform-level setting. Campaigns cannot connect until you do this.

- [ ] **3c. Enable Stripe Connect** in your Stripe Dashboard:
  1. Go to [stripe.com](https://stripe.com) → **Connect** (left sidebar)
  2. Click **Get started** (or it may already be enabled if you've used it before)
  3. Under **Platform settings**, set:
     - Business type: **Platform** (not marketplace)
     - Onboarding: **Express** (recommended — Stripe handles the hosted form)
  4. Under **Branding**, add Poll City logo/name so campaigns see it during onboarding
  5. Save

- [ ] **3d. Set Connect return/refresh URLs in Stripe Dashboard**:
  1. Go to Connect → Settings → OAuth
  2. Add `https://app.poll.city` to **Redirect URIs**
  3. Save

### Step B — Register the fundraising webhook in Stripe Dashboard

- [ ] **4. Register fundraising webhook in Stripe**
  1. Go to [stripe.com](https://stripe.com) → Developers → Webhooks
  2. Click **+ Add endpoint**
  3. URL: `https://app.poll.city/api/fundraising/stripe/webhook`
  4. Select these events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`
     - `charge.refunded`
  5. Click **Add endpoint**
  6. Click **Reveal signing secret** → copy the `whsec_...` value

- [ ] **5. Add `STRIPE_FUNDRAISING_WEBHOOK_SECRET` to Vercel** (value from Step B)

### Step C — Platform billing Stripe (Poll City subscriptions)

These power the pricing page and client subscription management.

| Variable | Where to get it |
|---|---|
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → `/api/stripe/webhook` endpoint → Signing secret |
| `STRIPE_STARTER_PRICE_ID` | Stripe → Products → your Starter plan → Price ID (`price_...`) |
| `STRIPE_PRO_PRICE_ID` | Stripe → Products → your Pro plan → Price ID (`price_...`) |

- [ ] **6. Register platform webhook in Stripe**:
  1. Go to [stripe.com](https://stripe.com) → Developers → Webhooks
  2. Click **+ Add endpoint**
  3. URL: `https://app.poll.city/api/stripe/webhook`
  4. Select these events:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`
     - `customer.subscription.updated`
     - `payment_intent.succeeded` ← **required for print shop payments to advance to "in production"**
     - `payment_intent.payment_failed` ← **required to reset print jobs on failed payment**
  5. Click **Add endpoint**
  6. Click **Reveal signing secret** → copy the `whsec_...` value → that's `STRIPE_WEBHOOK_SECRET`
- [ ] **7. Add `STRIPE_WEBHOOK_SECRET` to Vercel**
- [ ] **8. Add `STRIPE_STARTER_PRICE_ID` to Vercel**
- [ ] **9. Add `STRIPE_PRO_PRICE_ID` to Vercel**

### Step D — How campaigns connect their Stripe (your clients do this, not you)

Once your platform is live, each campaign connects their account by:
1. Going to **Fundraising → Settings** inside app.poll.city
2. Clicking **Connect Stripe** (triggers the `/api/campaigns/[id]/stripe/onboard` endpoint you just shipped)
3. Completing Stripe's hosted Express onboarding form (~5 minutes, needs bank account + ID)
4. Redirected back to app.poll.city — campaign is now ready to accept donations

Until a campaign completes this, the donation page shows: *"This campaign is not yet accepting online donations."*

---

## 🟡 EMAIL — Receipt emails + comms blasts won't send without these

Email (Resend) powers: donation receipt emails, event reminders, volunteer invites, password resets, comms blasts.

- [ ] **10. Create account at [resend.com](https://resend.com)** (if not done)
- [ ] **11. Add and verify your sending domain** in Resend → Domains → Add domain → `poll.city`
  - Add the DNS records Resend gives you to your domain registrar
  - Wait for green checkmark before proceeding
- [ ] **12. Create an API key** in Resend → API Keys → Create API Key (name: "Poll City Production")
- [ ] **13. Add these to Railway**:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | The `re_...` key from Resend |
| `RESEND_FROM_EMAIL` | `Poll City <noreply@poll.city>` |
| `RESEND_REPLY_TO` | `support@poll.city` |

- [ ] **14. Add `RESEND_API_KEY` to Vercel**
- [ ] **15. Add `RESEND_FROM_EMAIL` to Vercel** (value: `Poll City <noreply@poll.city>`)
- [ ] **16. Add `RESEND_REPLY_TO` to Vercel** (value: `support@poll.city`)

### Unified Inbox — receive email replies from contacts

The Unified Inbox (built Session 3, April 15) shows inbound SMS automatically via the Twilio webhook. For inbound **email** replies to appear in the inbox, you need Resend to forward replies to the app.

- [ ] **59. Set up Resend inbound email for each campaign**
  1. Go to [resend.com](https://resend.com) → **Inbound** (left sidebar)
  2. Click **Create endpoint** → set the URL to: `https://app.poll.city/api/webhooks/resend`
  3. In each campaign's settings (`/settings`), set **Reply-to email** to the inbound address Resend gives you (e.g. `campaign@inbound.poll.city`)
  4. When a contact replies to a campaign email, it will flow into the Unified Inbox automatically.
  *Note: Requires a Resend-managed inbound domain with MX records — see Resend docs.*

---

## 🟡 SMS — Comms SMS blasts won't send without these

- [ ] **17. Get Twilio credentials** from [console.twilio.com](https://console.twilio.com)
  - Account SID and Auth Token are on the main console page
  - Buy a Canadian phone number if you don't have one (needed for CASL compliance)
- [ ] **18. Add to Railway**:

| Variable | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | `AC...` from Twilio console |
| `TWILIO_AUTH_TOKEN` | Auth token from Twilio console |
| `TWILIO_PHONE_NUMBER` | Your Twilio number in E.164 format (e.g. `+16135551234`) |

- [ ] **19. Add `TWILIO_ACCOUNT_SID` to Vercel**
- [ ] **20. Add `TWILIO_AUTH_TOKEN` to Vercel**
- [ ] **21. Add `TWILIO_PHONE_NUMBER` to Vercel**
- [ ] **21b. Wire Twilio inbound webhook** (needed for STOP/START to work):
  1. Go to [console.twilio.com](https://console.twilio.com) → Phone Numbers → Manage → your number
  2. Under "Messaging" → "A message comes in" → set to **Webhook**
  3. URL: `https://app.poll.city/api/webhooks/twilio`
  4. Method: **HTTP POST**
  5. Save. Now when anyone replies STOP to your campaign SMS, they're automatically unsubscribed (CASL compliant).

---

## 🟡 AI (ADONI) — Adoni won't respond without this

Without this key, the following degrade to static fallback text (they still work, just no AI):
- `/briefing` — Adoni morning summary card
- `/resources/ai-creator` — all 7 content types
- `/ai-assist` — full Adoni chat

- [x] **22. Add `ANTHROPIC_API_KEY` to Vercel** ✓ Done (was already set Apr 5)
  - Get from [console.anthropic.com](https://console.anthropic.com) → API Keys
  - Value: `sk-ant-...`

---

## 🔵 SECURITY SALTS — Required before first real voter/donor data

Without these, anonymous voting and guest civic passports are broken in production.
Generate each with: `openssl rand -base64 32`

- [x] **23. Add `IP_HASH_SALT` to Vercel** ✓ Done 2026-04-18
- [x] **24. Add `POLL_ANONYMITY_SALT` to Vercel** ✓ Done 2026-04-18
- [x] **25. Add `GUEST_TOKEN_SECRET` to Vercel** ✓ Done 2026-04-18
- [x] **26. Add `CRON_SECRET` to Vercel** ✓ Done (was already set Apr 9)
- [x] **27/28. Add `DATABASE_ENCRYPTION_KEY` to Vercel** ✓ Done 2026-04-18
- [x] **29/30. Add `HEALTH_CHECK_SECRET` to Vercel** ✓ Done 2026-04-18

---

## 🔵 RATE LIMITING — Required before public launch

Without Upstash, rate limiting falls back to in-memory (not safe under load, resets on restart).

- [ ] **31. Create Upstash Redis database** at [upstash.com](https://upstash.com) → Redis → Create Database
  - Region: closest to Railway (us-east-1 or ca-central-1)
  - Plan: Free tier is fine to start
- [ ] **32. Add to Railway**:

| Variable | Where |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash dashboard → your database → REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash dashboard → your database → REST Token |

- [ ] **33. Add `UPSTASH_REDIS_REST_URL` to Vercel**
- [ ] **34. Add `UPSTASH_REDIS_REST_TOKEN` to Vercel**

---

## 🔵 PUSH NOTIFICATIONS — Browser push for alerts

- [x] **35/36. VAPID keys** ✓ Done — already in Vercel (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)

---

## 🔵 SPAM PROTECTION (Cloudflare Turnstile)

Protects public forms from bot submissions.

- [ ] **37. Create Turnstile widget** at [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile → Add site
  - Domain: `poll.city` and `app.poll.city`
  - Widget type: Managed
- [ ] **38. Add to Railway**:

| Variable | Value |
|---|---|
| `TURNSTILE_SECRET_KEY` | From Cloudflare Turnstile → your widget → Secret key |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | From Cloudflare Turnstile → your widget → Site key |

---

## 🔵 DEBUG SUITE — George's admin debug toolbar

These activate your personal debug toolbar when you're logged in as yourself.

- [x] **39. Add `DEBUG_SECRET_KEY` to Vercel** ✓ Done 2026-04-18
- [x] **40. Add `NEXT_PUBLIC_DEBUG_SECRET_KEY` to Vercel** ✓ Done 2026-04-18
- [x] **41. Find your `GEORGE_USER_ID`**: ✓ Done 2026-04-18
  1. Log in to [app.poll.city](https://app.poll.city) as yourself
  2. Go to `https://app.poll.city/api/auth/session` in the same browser
  3. You'll see JSON — find the `"id"` field inside `"user"` and copy it
- [x] **42. Add `GEORGE_USER_ID` to Vercel** ✓ Done 2026-04-18 (the ID you found in step 41)
- [x] **43. Activate your debug suite** ✓ Done 2026-04-18

---

## 🔵 DATABASE SEEDING — Demo data for beta

- [ ] **44. Run calendar seed against Railway**:
  ```
  DATABASE_URL="<railway-db-url>" npm run db:seed:calendar
  ```
  Populates Ward 20 demo data — 37 calendar items, 12 appearances, 2 calendars.

- [ ] **45. Run Ward 20 voter file seed**:
  ```
  DATABASE_URL="<railway-db-url>" npm run db:seed:ward20
  ```
  Populates ~5,000 realistic Toronto contacts. Your maps and canvassing will look real.

- [ ] **46. Run help content seed**:
  ```
  DATABASE_URL="<railway-db-url>" npm run db:seed:help
  ```
  Populates help articles in the system.

---

## 🔵 GOOGLE OAUTH — Social login + future calendar sync

- [ ] **47. Create OAuth credentials** at [console.cloud.google.com](https://console.cloud.google.com)
  1. New project (or use existing)
  2. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
  3. Application type: Web application
  4. Authorized redirect URIs: `https://app.poll.city/api/auth/callback/google`
- [ ] **48. Add to Vercel**:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID from Google Console |
| `GOOGLE_CLIENT_SECRET` | Client secret from Google Console |

---

## 🔵 INFRASTRUCTURE — Required before first real customer

- [x] **49. Enable Railway daily backups** ✓ Already running — daily schedule confirmed, 5 days of history:
  1. Go to [railway.app](https://railway.app)
  2. Click your database project
  3. Click Settings
  4. Find Backups → turn on daily backups
  This is the single most important infrastructure step — 2 minutes, do it now.

- [ ] **50. Install Poll City as a PWA on your phone**:
  - iPhone: open [app.poll.city](https://app.poll.city) in Safari → tap Share → Add to Home Screen
  - Android: open in Chrome → tap three dots → Add to Home Screen
  - Open it from your home screen and allow notifications

---

## 🔵 STRATEGIC (this week — not tonight)

- [ ] **51. Contact Anthropic for Zero Data Retention**:
  - Go to [console.anthropic.com](https://console.anthropic.com) → Support or Enterprise contact
  - Message: "We process Canadian political data under PIPEDA and need Zero Data Retention for all API calls."
  - This makes Adoni legally bulletproof for party and union customers.

- [ ] **52. Create the private intelligence repo**:
  1. Go to [github.com](https://github.com) → New repository
  2. Name: `poll-city-intelligence`
  3. Make it: **Private**
  4. Do not add anything yet — just create the empty repo
  This is where ATLAS (the proprietary approval-rating algorithm) will live.

---

## 🎨 FIGMA → NEXT.JS UI MATCHING (new — from April 16 session)

The goal: AI sessions will rebuild the Next.js app screens to match your Figma design exactly.
Two steps: wire up the prototype viewer, then get the design specs into this repo.

- [x] **57. Figma prototype viewer** ✓ Done — NEXT_PUBLIC_FIGMA_APP_URL already in Vercel

- [x] **58. SKIP — spec files do not exist in Figma Make project** (confirmed April 16)
  Those 3 files (`poll-city-design-spec.md` etc.) were never created. AI sessions build
  from MASTER_CLAUDE.md + the build queue in `docs/FIGMA_SPEC_HANDOFF.md` instead.
  No action needed. AI is unblocked.

---

## 🟠 AI SESSIONS TO START — Track B (Customer Readiness)

*Sessions 2 and 3 are already running. These are the additional sessions needed before first real customer. Start one at a time after confirming the previous one pushed clean.*

- [ ] **53. Session B1 — Billing + Settings full build**
  Paste this opener: "Build Session B1: Wire Stripe checkout on /billing (currently display-only, 186 lines). Full settings page on /settings (profile, campaign details, integrations, notifications, danger zone). Full /settings/security (2FA management, active sessions, login history, API keys). Run npm run build before pushing."

- [ ] **54. Session B2 — CASL consent engine + Election Day ops**
  Paste this opener: "Build Session B2: CASL consent management engine (Phase 9 in comms module — per-contact consent tracking, opt-in/opt-out enforcement on all email+SMS sends, consent audit log). Full /eday election night ops (live poll tracker, voter contact dashboard, returns by poll, volunteer check-ins). Run npm run build before pushing."

- [ ] **55. Session B3 — Finance UI hardening (Sprint 2)**
  Paste this opener: "Build Session B3: Finance UI Sprint 2 from WORK_QUEUE.md. All 9 finance sub-routes need depth: /finance overview (live chart), /finance/budget (variance analysis), /finance/expenses (receipt upload), /finance/purchase-requests (approval chain), /finance/vendors, /finance/reimbursements, /finance/approvals (bulk actions), /finance/reports (full suite), /finance/audit (filters + export). APIs are all done — UI catch-up only. Run npm run build before pushing."

- [ ] **56. Session B4 — Platform hardening pass**
  Paste this opener: "Build Session B4: Platform hardening. Adoni per-tool rate limit (PENDING in platform module). Migration baseline — run npx prisma migrate dev --name initial_baseline against Railway. Marketing site full content pass (/marketing/page.tsx needs full content). Stub route kill/build decisions from WORK_QUEUE.md stub routes module — for each: redirect or stub-fill. Run npm run build before pushing."

---

---

## 🟠 iOS TESTFLIGHT — Submit canvasser app to Apple

The mobile app is built and the dark-theme redesign is done. To submit:

- [ ] **60. Fill in `mobile/eas.json`** — open the file and replace the three placeholders:
  - `YOUR_APPLE_ID` → your Apple ID email (e.g. `george@poll.city`)
  - `YOUR_APP_STORE_CONNECT_APP_ID` → the numeric App ID from App Store Connect (see step 61)
  - `YOUR_TEAM_ID` → your 10-character Apple Developer Team ID (found at developer.apple.com → Account → top right)

- [ ] **61. Create the app record in App Store Connect**:
  1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
  2. Click `+` → New App → iOS
  3. Name: `Poll City Canvasser`
  4. Bundle ID: `ca.pollcity.canvasser`
  5. Note the App ID from the URL — that's `YOUR_APP_STORE_CONNECT_APP_ID`

- [ ] **62. Submit TestFlight build** (after steps 60–61 are done):
  ```
  cd mobile
  npm install
  eas build --platform ios --profile preview
  ```
  Then when the build finishes:
  ```
  eas submit --platform ios
  ```
  Apple TestFlight review takes 1–2 business days.

- [ ] **63. Add demo reviewer credentials** to App Store Connect review notes before submission:
  - Create a test canvasser account at `www.poll.city/signup`
  - Add those credentials in App Store Connect → your app → App Review Information → Demo Account

---

## 🟠 VOTER FILE — Activate map-based turf drawing

Map-based turf drawing is built but needs real geocoded contacts to work.

- [ ] **64. Upload a real voter file** at `www.poll.city/import-export`
  - The tool has AI column mapping — it will auto-detect ward, poll number, address fields
  - Contacts need `ward` + `municipalPoll` for dropdown turf mode
  - Contacts need household lat/lng for map polygon turf mode
  - If your voter file has addresses but no coordinates, run the geocoding cron: it runs hourly automatically once contacts are imported

- [x] **65. Schema is managed via `prisma db push`** — that's your workflow. No baseline migration needed. `db push` has run successfully 6+ times and is the right approach for this setup.

---

## ✅ COMPLETED

- #1 `npx prisma db push` — 2026-04-11 — "database already in sync"
- #58 SKIP — Figma spec files don't exist, AI builds from MASTER_CLAUDE.md

---

## 🟡 ONBOARDING — Backfill existing campaigns

The new onboarding wizard only triggers for campaigns created after 2026-04-16.
Run this once on Railway to ensure existing campaigns aren't accidentally sent to the wizard.

- [ ] **59. Backfill existing campaigns as onboarded**
  1. SSH into Railway or run locally with prod DATABASE_URL set:
     ```
     npx ts-node --project tsconfig.json scripts/mark-campaigns-onboarded.ts
     ```
  2. Output will say `✓ Marked X existing campaign(s) as onboarding complete.`
  3. Verify by opening /dashboard — it should not redirect to /onboarding.

- [ ] **60. Sync schema to Railway** — run `npx prisma db push` to apply any pending schema changes including nomination/leadership enum values.

- [x] **61. Run security schema migration when Railway DB is reachable** ✓ DONE 2026-04-17
  Ran `prisma db push --skip-generate` with `?sslmode=require` appended to DATABASE_URL.
  Both `user_sessions` and `api_keys` tables created in Railway. Sessions + API Keys sections live.
  `.env` updated to include `?sslmode=require` permanently — fixes all future Prisma commands.
  (writes to those tables will error). 2FA, WebAuthn, and login history work fine — they use existing models.

---

- [x] **62. Run `npx prisma db push` — CRITICAL, do this before anything else** — covers CIE + RCAE + Finance Phase 8 schema in one shot ✓ DONE 2026-04-17 — "Your database is now in sync with your Prisma schema." All tables live on Railway.

  **Why only you:** AI agents can write code but cannot connect to your Railway PostgreSQL instance. The DATABASE_URL contains your DB password — it lives in your `.env` which is gitignored. Without running this, `/intel`, `/reputation`, and Finance role-gating will all 500 in production.

  **What it creates:**
  - 6 CIE tables: `candidate_leads`, `candidate_profiles`, `news_articles`, `news_signals`, `candidate_outreach_attempts`, `intel_source_health`
  - 8 RCAE tables: `reputation_alerts`, `reputation_issues`, `issue_alert_links`, `reputation_recommendations`, `reputation_response_actions`, `reputation_response_pages`, `amplification_actions`, `amplification_participations`
  - Finance: adds `FINANCE` enum value to the `Role` enum (additive — zero data risk)
  - Also extends `DataSource` with 9 new CIE fields

  **Steps:**
  1. Make sure Vercel deployment is green first (wait for the green dot on the latest push)
  2. On your local machine with Railway DB accessible, run from the project root:
     ```
     npx prisma db push
     ```
  3. You should see: `Your database is now in sync with your Prisma schema.`
  4. If it says "can't reach database" — open Railway → your project → connect tab → copy the connection string into your local `.env` as `DATABASE_URL` then retry

  **Zero risk:** `db push` is additive-only for these changes — new tables, new enum value. No existing data is touched.

---

- [ ] **63. Run CIE source seed — do this immediately after item 62**

  **Why only you:** This calls a SUPER_ADMIN-gated endpoint. You need to be logged into the live site as George (the SUPER_ADMIN account) to hit it. AI agents can't log in as you.

  **What it does:** Populates the `DataSource` table with 16 pre-configured Canadian election monitoring sources (Elections Canada, Elections Ontario, Toronto/Brampton/Mississauga/Vaughan/Markham/Ottawa open data, CBC News RSS, Toronto Star RSS, OpenNorth, StatsCan boundaries, Government of Canada News). Without this, the CIE has no sources to ingest from.

  **Steps — pick one:**

  Option A (easiest) — browser:
  1. Go to `https://app.poll.city/intel` (log in as SUPER_ADMIN)
  2. Click **"Seed Sources"** button in the top-right of the command center
  3. You should see a toast: "16 sources seeded"

  Option B — curl from terminal:
  ```bash
  # First grab your session cookie from browser DevTools → Application → Cookies → next-auth.session-token
  curl -X POST https://app.poll.city/api/intel/seed \
    -H "Cookie: next-auth.session-token=<your-token-here>"
  ```

---

- [ ] **64. Add NEWS_API_KEY to Railway** — optional but recommended (enables live news ingestion)

  **Why only you:** Railway environment variables require Railway admin access. AI agents can only edit code files — they can't set secrets on a remote platform.

  **What it unlocks:** The NewsAPI.org source in the CIE registry becomes active. Without it, that one source logs a skip warning and the other 15 RSS/open-data sources still run fine.

  **Steps:**
  1. Get a free API key at newsapi.org/register (100 requests/day free, $449/mo for production)
  2. Go to Railway → your Poll City project → **Variables** tab
  3. Click **New Variable**
  4. Name: `NEWS_API_KEY` — Value: your key from step 1
  5. Railway will auto-redeploy. No code change needed.

  **Cost note:** Free tier is fine for testing. If you go live with hourly ingestion across 16 sources you'll want the paid plan (~$449 USD/mo). Alternatively leave it disabled — CBC + Toronto Star RSS feeds are free and cover Ontario municipal news well.

---

---

- [x] **66. Run `npx prisma db push` for Automation Engine tables** ✓ DONE 2026-04-17 — covered by item 62 push — do this after item 62 if you haven't already, OR re-run item 62 which covers everything

  **Why only you:** The automation engine (Communications Phase 7) added 4 new tables and 3 new enums to the schema. AI agents can write the schema file but can't connect to your Railway PostgreSQL database (the `DATABASE_URL` with the password is in `.env.local` which is gitignored).

  **Tables added:** `AutomationRule`, `AutomationStep`, `AutomationEnrollment`, `AutomationStepCompletion`

  **Enums added:** `AutomationTrigger`, `AutomationStepType`, `AutomationEnrollmentStatus`

  **What breaks without it:** The Automations tab in Communications will load but show empty. Any trigger calls (donation made, contact created, etc.) will throw Prisma errors.

  **Steps:**
  1. Make sure your `.env.local` has `DATABASE_URL` pointing to Railway
  2. In your terminal at the project root:
     ```bash
     npx prisma db push
     ```
  3. You should see: "Your database is now in sync with your Prisma schema"
  4. That's it — no seed needed for automations. Rules are created by campaign managers in the UI.

  **Note:** If item 62 is already done and showed "database already in sync" it means the schema was already pushed — skip this item.

---

---

## 🖥️ DESKTOP APP — Poll City for Mac + Windows

Electron app lives in `desktop/`. It loads `app.poll.city` in a native window with dock icon, auto-updates, system tray, and deep links.

### Step 1 — Add icon files (required before building the installer)

Place these files in `desktop/assets/`:

| File | Size | Format | Use |
|---|---|---|---|
| `icon.icns` | 512×512 | Apple Icon | Mac app icon (dock, Finder, installer) |
| `icon.ico` | 256×256 | Windows Icon | Windows app icon (taskbar, Start menu) |
| `icon.png` | 512×512 | PNG | Linux + system tray fallback |
| `tray-icon.png` | 32×32 | PNG | System tray (top bar on Mac, taskbar on Windows) |
| `dmg-background.png` | 540×380 | PNG | Optional — Mac DMG installer background |

**Quickest path:** Export your Poll City logo from Figma as a 512×512 PNG, then:
- Mac `.icns`: use [iconutil](https://developer.apple.com/library/archive/documentation/GraphicsImaging/Conceptual/OpenWithURLs/OpenWithURLs.html) or online converter
- Windows `.ico`: use [icoconvert.com](https://icoconvert.com)

### Step 2 — Install Electron dependencies

```bash
cd desktop
npm install
```

### Step 3 — Test locally before signing

```bash
cd desktop
npm start
```

Poll City should open in a native window loading `app.poll.city`.

### Step 4 — Code signing (required for distribution — no "unknown publisher" warning)

**Mac:** Requires Apple Developer Program membership ($99 USD/yr)
1. Go to [developer.apple.com](https://developer.apple.com) → Certificates → create a **Developer ID Application** certificate
2. Download and install it in Keychain Access
3. `electron-builder` will pick it up automatically via `CSC_NAME` env var:
   ```bash
   export CSC_NAME="Developer ID Application: Your Name (TEAMID)"
   npm run build:mac
   ```

**Windows:** Requires a code signing certificate (~$200 USD/yr from DigiCert or Sectigo)
1. Purchase and download your `.pfx` certificate file
2. Build with:
   ```bash
   export CSC_LINK="/path/to/your-cert.pfx"
   export CSC_KEY_PASSWORD="your-cert-password"
   npm run build:win
   ```

### Step 5 — Build the installer

```bash
# Mac only (from a Mac)
cd desktop && npm run build:mac
# Output: desktop/dist/Poll City-1.0.0.dmg  (Intel)
#         desktop/dist/Poll City-1.0.0-arm64.dmg  (Apple Silicon)

# Windows only (from Windows or CI)
cd desktop && npm run build:win
# Output: desktop/dist/Poll City Setup 1.0.0.exe
```

### Step 6 — Auto-updates via GitHub Releases

`electron-updater` is configured to check `github.com/pangaon/poll-city` releases.
When you want to ship a new desktop version:
1. Bump the version in `desktop/package.json`
2. Build the installer (Step 5)
3. Create a GitHub release tagged `v1.x.x`
4. Upload the `.dmg` and `.exe` files to the release
5. All installed apps will auto-update within 30 seconds of next launch

### Step 7 — Add download links to the marketing site

Once `desktop/dist/` has your signed installers, add download buttons to the marketing landing page pointing to your GitHub release assets.

- [ ] **67. Add icon files to `desktop/assets/`** (see Step 1 above)
- [ ] **68. Run `cd desktop && npm install && npm start`** — verify the app opens locally
- [ ] **69. Purchase Apple Developer membership** (if not already — $99/yr at developer.apple.com)
- [ ] **70. Create Developer ID Application certificate** and install in Keychain
- [ ] **71. Purchase Windows code signing cert** (~$200/yr — DigiCert recommended)
- [ ] **72. Run `npm run build:mac` and `npm run build:win`** to produce signed installers
- [ ] **73. Create GitHub release and upload installers** — auto-updates go live automatically

---

## Municipal Election Scraper — Phase 1 Setup

### Step 1 — Add scraper tables to Railway
The scraper needs two new tables (`muni_scrape_runs`, `raw_muni_candidates`).

```bash
npx prisma db push
```

This is the same command that has worked every time. It adds new tables without touching existing data.

### Step 2 — Install Playwright browser
Playwright needs its Chromium binary. Run once:

```bash
npm run scrape:install-browsers
```

### Step 3 — Dry-run test (no DB writes)
Verify the scraper reaches Toronto Open Data and parses candidates:

```bash
npm run scrape:toronto:dry
```

You should see candidate count in console. If it passes, the scraper is working.

### Step 4 — Full live scrape
Once migration is done and dry-run passes:

```bash
npm run scrape:toronto
```

Candidates insert into `raw_muni_candidates`. Verify via `npm run db:studio` or:
- `GET /api/scraper/municipalities` — list scraped municipalities
- `GET /api/scraper/candidates?municipality=toronto` — list candidates

- [ ] **74. Run `npx prisma db push`** — add scraper tables + any other pending schema changes to Railway
- [ ] **75. Run `npm run scrape:install-browsers`** — install Playwright Chromium
- [ ] **76. Run `npm run scrape:toronto:dry`** — verify scraper reaches Toronto Open Data
- [ ] **77. Run `npm run scrape:toronto`** — first full live scrape into DB

---

*This file is maintained by AI sessions. Last updated: 2026-04-18*
*Format: [ ] = todo, [x] = done. AI sessions add steps here when new manual work is identified.*
*`docs/GEORGE-ACTION-LIST.md` has been superseded by this file and can be deleted.*
