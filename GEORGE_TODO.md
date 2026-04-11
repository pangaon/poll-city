# George's Manual Action List
## The things only YOU can do — AI sessions cannot touch production config

This file is maintained by AI sessions. When a new manual step is created, it
gets added here. When you complete a step, change `[ ]` to `[x]`.

**Format**: Steps are numbered within each section. Do them in order where noted.

---

## 🔴 CRITICAL — Platform is broken without these

- [ ] **1. Run `npx prisma db push` against Railway**
  - Why: Calendar models, ScheduledMessage, ScheduledMessageStatus enum,
    NotificationLog.sendKey — comms scheduling + calendar UI both 500 until this runs
  - How:
    1. Open your Railway project → Poll City service
    2. Go to the Variables tab — copy `DATABASE_URL`
    3. In your terminal: `DATABASE_URL="<paste>" npx prisma db push`
    4. Confirm output shows "Your database is now in sync with your Prisma schema"
  - Risk: Safe — `db push` never drops existing data, only adds new tables/columns

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
- [ ] **26. Add `CRON_SECRET` to Railway** (`openssl rand -base64 32`)
  - Also add this same value to Vercel → Environment Variables → `CRON_SECRET`
  - Vercel cron jobs use it to authenticate against the app

---

## 🔵 RATE LIMITING — Required before public launch

Without Upstash, rate limiting falls back to in-memory (not safe under load, resets on restart).

- [ ] **27. Create Upstash Redis database** at [upstash.com](https://upstash.com) → Redis → Create Database
  - Region: closest to Railway (us-east-1 or ca-central-1)
  - Plan: Free tier is fine to start
- [ ] **28. Add to Railway**:

| Variable | Where |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash dashboard → your database → REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash dashboard → your database → REST Token |

- [ ] **29. Add `UPSTASH_REDIS_REST_URL` to Railway**
- [ ] **30. Add `UPSTASH_REDIS_REST_TOKEN` to Railway**

---

## 🔵 PUSH NOTIFICATIONS — Browser push for alerts

- [ ] **31. Generate VAPID keys**:
  ```
  npx web-push generate-vapid-keys
  ```
  This outputs a public and private key pair.
- [ ] **32. Add to Railway**:

| Variable | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | The public key from the command above |
| `VAPID_PRIVATE_KEY` | The private key from the command above |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same as `VAPID_PUBLIC_KEY` |

---

## 🔵 SPAM PROTECTION (Cloudflare Turnstile)

Protects public forms from bot submissions.

- [ ] **33. Create Turnstile widget** at [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile → Add site
  - Domain: `poll.city` and `app.poll.city`
  - Widget type: Managed
- [ ] **34. Add to Railway**:

| Variable | Value |
|---|---|
| `TURNSTILE_SECRET_KEY` | From Cloudflare Turnstile → your widget → Secret key |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | From Cloudflare Turnstile → your widget → Site key |

---

## 🔵 DATABASE SEEDING — Demo data for beta

- [ ] **35. Run calendar seed against Railway**:
  ```
  DATABASE_URL="<railway-db-url>" npm run db:seed:calendar
  ```
  Populates Ward 20 demo data — 37 calendar items, 12 appearances, 2 calendars.

---

## 🔵 GOOGLE OAUTH — Social login + future calendar sync

- [ ] **36. Create OAuth credentials** at [console.cloud.google.com](https://console.cloud.google.com)
  1. New project (or use existing)
  2. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
  3. Application type: Web application
  4. Authorized redirect URIs: `https://app.poll.city/api/auth/callback/google`
- [ ] **37. Add to Railway**:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID from Google Console |
| `GOOGLE_CLIENT_SECRET` | Client secret from Google Console |

---

## ✅ COMPLETED

*(Move items here when done — one line each with date)*

---

*This file is maintained by AI sessions. Last updated: 2026-04-11*
*Format: [ ] = todo, [x] = done. AI sessions add steps here when new manual work is identified.*
