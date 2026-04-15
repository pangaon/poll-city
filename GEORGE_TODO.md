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

Phase 4 (Stripe integration) is built and deployed. These env vars make it live.

### Step A — Add env vars to Railway

Go to Railway → Poll City service → Variables tab. Add each one:

| Variable | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key (`sk_live_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys → Publishable key (`pk_live_...`) |
| `STRIPE_FUNDRAISING_WEBHOOK_SECRET` | See Step B below — get this AFTER registering the webhook |

- [ ] **2. Add `STRIPE_SECRET_KEY` to Railway**
- [ ] **3. Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to Railway**

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

- [ ] **6. Register platform webhook in Stripe**: URL `https://app.poll.city/api/stripe/webhook`
- [ ] **7. Add `STRIPE_WEBHOOK_SECRET` to Railway**
- [ ] **8. Add `STRIPE_STARTER_PRICE_ID` to Railway**
- [ ] **9. Add `STRIPE_PRO_PRICE_ID` to Railway**

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

---

## 🟡 AI (ADONI) — Adoni won't respond without this

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

## ✅ COMPLETED

- #1 `npx prisma db push` — 2026-04-11 — "database already in sync"

---

*This file is maintained by AI sessions. Last updated: 2026-04-11*
*Format: [ ] = todo, [x] = done. AI sessions add steps here when new manual work is identified.*
*`docs/GEORGE-ACTION-LIST.md` has been superseded by this file and can be deleted.*
