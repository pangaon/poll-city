# George's Manual Action List
## The things only YOU can do — AI sessions cannot touch production config

This file is maintained by AI sessions. When a new manual step is created, it
gets added here. When you complete a step, change `[ ]` to `[x]`.

**Format**: Steps are numbered within each section. Do them in order where noted.

---

## 🔴 CRITICAL — Platform is broken without these

- [x] **1. Run `npx prisma db push` against Railway** ✓ Done 2026-04-11 — "database already in sync"

---

## 🟠 STRIPE — Fundraising donations won't process without these

**ARCHITECTURE NOTE (2026-04-16):** Stripe Connect is now fully wired.
Each campaign connects their own Stripe Express account. Donations flow directly
to the campaign's bank. Poll City automatically takes 1.5% of each donation.
Print shop marketplace fee is 15% (unchanged). Your SaaS subscriptions go direct to you.

### Step A — Add env vars to Railway

Go to Railway → Poll City service → Variables tab. Add each one:

| Variable | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key (`sk_live_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys → Publishable key (`pk_live_...`) |
| `STRIPE_FUNDRAISING_WEBHOOK_SECRET` | See Step B below — get this AFTER registering the webhook |

- [ ] **2. Add `STRIPE_SECRET_KEY` to Railway**
- [ ] **3. Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to Railway**
- [ ] **3b. Also add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to Vercel** (the public donation page `/donate/[slug]` runs on Vercel — `NEXT_PUBLIC_` vars are baked into the build and MUST be set in Vercel Project Settings, not just Railway)

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

- [ ] **5. Add `STRIPE_FUNDRAISING_WEBHOOK_SECRET` to Railway** (value from Step B)

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
- [ ] **7. Add `STRIPE_WEBHOOK_SECRET` to Railway**
- [ ] **8. Add `STRIPE_STARTER_PRICE_ID` to Railway**
- [ ] **9. Add `STRIPE_PRO_PRICE_ID` to Railway`**

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

- [ ] **14. Add `RESEND_API_KEY` to Railway**
- [ ] **15. Add `RESEND_FROM_EMAIL` to Railway** (value: `Poll City <noreply@poll.city>`)
- [ ] **16. Add `RESEND_REPLY_TO` to Railway** (value: `support@poll.city`)

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

- [ ] **19. Add `TWILIO_ACCOUNT_SID` to Railway**
- [ ] **20. Add `TWILIO_AUTH_TOKEN` to Railway**
- [ ] **21. Add `TWILIO_PHONE_NUMBER` to Railway**
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

- [ ] **22. Add `ANTHROPIC_API_KEY` to Railway**
  - Get from [console.anthropic.com](https://console.anthropic.com) → API Keys
  - Value: `sk-ant-...`

---

## 🔵 SECURITY SALTS — Required before first real voter/donor data

Without these, anonymous voting and guest civic passports are broken in production.
Generate each with: `openssl rand -base64 32`

- [ ] **23. Add `IP_HASH_SALT` to Railway** (`openssl rand -base64 32`)
- [ ] **24. Add `POLL_ANONYMITY_SALT` to Railway** (`openssl rand -base64 32`)
- [ ] **25. Add `GUEST_TOKEN_SECRET` to Railway** (`openssl rand -base64 32`)
- [ ] **26. Add `CRON_SECRET` to Vercel** (NOT Railway — your app runs on Vercel, not Railway)
  1. Run in terminal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  2. Copy the output
  3. Go to Vercel → your project → Settings → Environment Variables
  4. Add: `CRON_SECRET` = the value you copied
  5. Save — Vercel will redeploy automatically
- [ ] **27. Generate `DATABASE_ENCRYPTION_KEY`**: run `openssl rand -hex 32` in your terminal
  - This activates at-rest encryption for sensitive database fields
  - Without it the platform still works, but sensitive data is stored unencrypted
- [ ] **28. Add `DATABASE_ENCRYPTION_KEY` to Railway** (the 64-char hex string from step 27)
- [ ] **29. Generate `HEALTH_CHECK_SECRET`**: run `openssl rand -base64 32` in your terminal
  - Used to authenticate requests to `/api/health` for detailed system status
- [ ] **30. Add `HEALTH_CHECK_SECRET` to Railway**

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

- [ ] **33. Add `UPSTASH_REDIS_REST_URL` to Railway**
- [ ] **34. Add `UPSTASH_REDIS_REST_TOKEN` to Railway**

---

## 🔵 PUSH NOTIFICATIONS — Browser push for alerts

- [ ] **35. Generate VAPID keys**:
  ```
  npx web-push generate-vapid-keys
  ```
  This outputs a public and private key pair.
- [ ] **36. Add to Railway**:

| Variable | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | The public key from the command above |
| `VAPID_PRIVATE_KEY` | The private key from the command above |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same as `VAPID_PUBLIC_KEY` |

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

- [ ] **39. Add `DEBUG_SECRET_KEY` to Railway** (value: `pollcity2026george`)
- [ ] **40. Add `NEXT_PUBLIC_DEBUG_SECRET_KEY` to Railway** (value: `pollcity2026george`)
- [ ] **41. Find your `GEORGE_USER_ID`**:
  1. Log in to [app.poll.city](https://app.poll.city) as yourself
  2. Go to `https://app.poll.city/api/auth/session` in the same browser
  3. You'll see JSON — find the `"id"` field inside `"user"` and copy it
- [ ] **42. Add `GEORGE_USER_ID` to Railway** (the ID you found in step 41)
- [ ] **43. Activate your debug suite**:
  1. Log in to [app.poll.city](https://app.poll.city)
  2. Go to `https://app.poll.city/debug-access?key=pollcity2026george`
  3. You should see a confirmation screen
  4. Debug toolbar now appears when you are logged in

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
- [ ] **48. Add to Railway**:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID from Google Console |
| `GOOGLE_CLIENT_SECRET` | Client secret from Google Console |

---

## 🔵 INFRASTRUCTURE — Required before first real customer

- [ ] **49. Enable Railway daily backups**:
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

- [ ] **57. Activate the Figma prototype viewer inside the app**
  1. Go to [vercel.com](https://vercel.com) → click your Poll City project
  2. Click **Settings** (top nav)
  3. Click **Environment Variables** (left sidebar)
  4. Click **Add New**
  5. Name: `NEXT_PUBLIC_FIGMA_APP_URL`
  6. Value: `https://valley-revise-45442235.figma.site`
  7. Click **Save**
  8. Go to **Deployments** tab → click **Redeploy** on the latest deployment
  9. Done — you can now visit `app.poll.city/pcapp` to see your Figma prototype inside the app

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

- [ ] **65. Run baseline migration** (critical before first real customer):
  ```
  npx prisma migrate dev --name initial_baseline
  ```
  Run this in your poll-city project folder. One time only.

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

- [ ] **60. Run schema migration when Railway DB is reachable**
  The `nomination` and `leadership` ElectionType enum values are in the schema but not yet in the DB.
  Connect to Railway and run:
  ```
  npx prisma migrate dev --name add_nomination_leadership_election_types --skip-seed
  ```
  Until this runs, campaigns of type nomination/leadership will fail to save.

- [ ] **61. Run security schema migration when Railway DB is reachable**
  Two new models added: `UserSession` (active session tracking) and `ApiKey` (API key management).
  Prisma client regenerated locally but Railway DB has not been migrated.
  Connect to Railway and run:
  ```
  npx prisma migrate dev --name security_sessions_apikeys --skip-seed
  ```
  Until this runs: the Active Sessions and API Keys sections of /settings/security will fail silently
  (writes to those tables will error). 2FA, WebAuthn, and login history work fine — they use existing models.

---

*This file is maintained by AI sessions. Last updated: 2026-04-17*
*Format: [ ] = todo, [x] = done. AI sessions add steps here when new manual work is identified.*
*`docs/GEORGE-ACTION-LIST.md` has been superseded by this file and can be deleted.*
