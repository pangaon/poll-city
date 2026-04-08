# THE GEORGE REPORT

> Canonical source of truth for Poll City system status.
> Every developer — human or AI — MUST read this file before making changes.
> Update this file after every significant build session.

**Last updated:** 2026-04-08
**Updated by:** Claude Opus 4.6 + George Hatzis

---

## HOW TO USE THIS DOCUMENT

1. **Before starting work**: Read this entire file. Check what exists, what's missing, what's blocked.
2. **After completing work**: Update the relevant section status + add a changelog entry at the bottom.
3. **If you add a feature**: Add it to the correct section with accurate status.
4. **If you find something broken**: Update its status and add a note.
5. **Never mark something ✅ unless it actually works end-to-end with real data.**
6. **Never mark Enterprise as 🟢 unless the feature has gone through the ENRICHMENT PROCESS below.**

---

## STATUS KEY

| Icon | Meaning |
|------|---------|
| ✅ | Production-ready. Works end-to-end with real data. |
| 🟡 | Partially working. Core logic exists but incomplete. |
| 🔴 | Shell only. UI exists but no real functionality behind it. |
| ❌ | Missing entirely. Needs to be built from scratch. |
| 🔑 | Needs env var / API key to function. |

## ENTERPRISE LEVEL KEY

| Icon | Meaning |
|------|---------|
| 🟢 | Enterprise-grade. Fully enriched. Passed the enrichment process. |
| 🟠 | Functional but not enriched. Works but missing intelligence, automation, or data connections. |
| 🔴 | Not enterprise-grade. Basic implementation only. |

---

## THE ENRICHMENT PROCESS (MANDATORY FOR 🟢)

> This is how Communications went from basic to enterprise. Every module MUST go through this process before it can be marked 🟢. No exceptions.

### Step 1: AUDIT
- What exists? What's a shell? What's real?
- What data flows in and out of this module?
- What touches this module from other parts of the system?

### Step 2: USER JOURNEY
- Walk through every user action in this module
- Ask: what should happen AFTER each action?
- Ask: what data is being LOST or SILOED?
- Ask: what would a campaign manager EXPECT to see?

### Step 3: DATA CONNECTION
- Every inbound touchpoint → creates or matches a Contact
- Every form submission → tagged, scored, logged
- Every action → visible in the right places (not just where it was created)
- No data silos. No orphaned records.

### Step 4: INTELLIGENCE
- Adoni AI integrated where content is created or decisions are made
- Sentiment classification on inbound messages
- Auto-classification (media inquiry, negative, positive, spam)
- Smart suggestions based on data patterns

### Step 5: AUTOMATION
- Auto-task creation on key events
- Auto-notification to campaign team when action needed
- Auto-escalation based on priority/sentiment
- Lifecycle triggers (time-based follow-ups, milestones, reminders)
- Engagement scoring that auto-updates support levels

### Step 6: SURFACE EVERYTHING
- All data visible in the right module (no hidden tables)
- Dashboard metrics reflect this module's activity
- Campaign manager never has to ask "where did that go?"

### Step 7: HARDEN
- Error handling on every path
- No dead buttons, no broken links
- Loading states, empty states, success states
- Mobile-friendly
- Verify TypeScript compiles clean

**Only after ALL 7 steps → mark Enterprise as 🟢**

---

## ENVIRONMENT VARIABLES

> These must be set in Vercel (production) and .env (local).
> Features gracefully degrade if optional vars are missing.

### REQUIRED
```
DATABASE_URL                    # PostgreSQL connection string (Railway)
NEXTAUTH_SECRET                 # openssl rand -base64 32
NEXTAUTH_URL                    # https://www.poll.city (or localhost:3000)
```

### COMMUNICATIONS 🔑
```
RESEND_API_KEY                  # resend.com — email sending
RESEND_FROM_EMAIL               # optional (default: Poll City <noreply@poll.city>)
RESEND_REPLY_TO                 # optional (default: support@poll.city)
TWILIO_ACCOUNT_SID              # twilio.com — SMS sending
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER             # or TWILIO_FROM
```

### PAYMENTS 🔑
```
STRIPE_SECRET_KEY               # stripe.com — donations + print marketplace
STRIPE_WEBHOOK_SECRET           # stripe webhook endpoint signing secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### AI 🔑
```
ANTHROPIC_API_KEY               # console.anthropic.com — powers Adoni assistant
```

### OAUTH (optional)
```
GOOGLE_CLIENT_ID                # Google sign-in
GOOGLE_CLIENT_SECRET
APPLE_CLIENT_ID                 # Apple sign-in
APPLE_CLIENT_SECRET
```

### CAPTCHA (optional)
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY  # cloudflare.com/turnstile
TURNSTILE_SECRET_KEY
```

### PUSH NOTIFICATIONS (optional)
```
VAPID_PUBLIC_KEY                # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
```

### TRACKING (optional — set per deployment)
```
NEXT_PUBLIC_GA_ID               # Google Analytics 4 (G-XXXXXXXXXX)
NEXT_PUBLIC_META_PIXEL_ID       # Meta/Facebook Pixel
NEXT_PUBLIC_GOOGLE_ADS_ID       # Google Ads (AW-XXXXXXXXXX)
NEXT_PUBLIC_CLARITY_ID          # Microsoft Clarity
```

### APPLICATION
```
NEXT_PUBLIC_ROOT_DOMAIN         # poll.city
NEXT_PUBLIC_APP_URL             # https://www.poll.city
CRON_SECRET                     # auth header for /api/cron/* endpoints
IP_HASH_SALT                    # random string for rate limiting
```

---

## FEATURE STATUS

### 1. AUTHENTICATION

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Email/password login | ✅ | 🟢 | bcrypt, rate limiting, lockout after 5 fails | — | |
| Google OAuth | 🔑 | 🟠 | Code ready. Needs GOOGLE_CLIENT_ID + SECRET | Provide API keys | |
| Apple OAuth | 🔑 | 🟠 | Code ready. Needs APPLE_CLIENT_ID + SECRET | Provide API keys | |
| 2FA (TOTP) | ✅ | 🟢 | Full TOTP with QR codes, backup codes, enable/disable flow | — | |
| Password reset | ✅ | 🟢 | Token-based, 1hr expiry | — | |
| Team invites | ✅ | 🟢 | Token join flow with role assignment | — | |
| Role-based access | ✅ | 🟢 | Admin, Manager, Volunteer, Finance, Public | — | |

### 2. COMMUNICATIONS

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Email compose + send | ✅🔑 | 🟢 | Resend API. 5K recipients. CASL footer. AI Write. Merge fields. Templates. | — | |
| SMS compose + send | ✅🔑 | 🟢 | Twilio. 2K recipients. CASL footer. AI Write. Merge fields. | — | |
| Audience calculator | ✅ | 🟢 | Real-time by support level, ward, tags, DNC, volunteer, has email/phone, last contacted | — | |
| AI Write (Adoni) | ✅🔑 | 🟢 | Inline AI content generation in compose | — | |
| Unsubscribe page | ✅ | 🟢 | /unsubscribe — CASL compliant. Marks DNC + newsletter unsubscribe | — | |
| Resend webhooks | ✅ | 🟢 | Bounces → DNC, complaints → unsubscribe, opens/clicks → lastContactedAt | — | |
| Newsletter subscribers | ✅ | 🟢 | Visible in Subscribers tab. Linked to Contact. Tagged. | — | |
| Questions from website | ✅ | 🟢 | Visible. Linked to Contact. Sentiment classified. Auto-task. Mailto reply. | — | |
| Sign requests | ✅ | 🟢 | Visible. Linked to Contact. Tagged. Auto-task for deployment. | — | |
| Saved segments | ✅ | 🟢 | Create, save, live count preview, use in compose. Persisted. | — | |
| Send history | ✅ | 🟢 | Real data. Paginated. Delivery metrics. | — | |
| Unified inbox | ✅ | 🟢 | Split panel. Reply → Compose. Archive. Cross-tab navigation. | — | |
| Templates | ✅ | 🟢 | Defaults + custom. Save from Compose. Use loads content. | — | |
| Automations | ✅ | 🟢 | Toggle on/off. Persisted. Lifecycle cron executes daily. | — | |
| Scheduled sends | ✅ | 🟢 | Create, list, cancel. Save Draft wires here. | — | |
| Voice broadcasts | 🔑 | 🟠 | Schema + CRUD ready. | Wire Twilio Voice API (same account as SMS) | |
| Social publishing | 🔑 | 🔴 | CRUD + approval in DB. | Needs Twitter/Meta/LinkedIn OAuth + API integration | |
| Social mentions | 🔑 | 🔴 | Schema ready. | Needs platform API keys + fetch integration | |
| Newsletter send | 🟡 | 🟠 | CRUD works. | Wire send to Resend API (template exists) | |

### 3. CAMPAIGN WEBSITE

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Public candidate page | ✅ | 🟢 | Premium design. Hero, issues, endorsements, events, map, forms | — | |
| Support signup → CRM | ✅ | 🟢 | CAPTCHA. Contact created. Tagged. Engagement scored. Welcome task. | — | |
| Volunteer signup → CRM | ✅ | 🟢 | Contact created. Tagged. Engagement auto-escalates. | — | |
| Donations (Stripe) | ✅🔑 | 🟢 | Checkout works. Contact created. Engagement scored. | — | |
| Lawn sign requests | ✅ | 🟢 | Contact created. signRequested=true. Tagged. Deploy task. Notify on install. | — | |
| Question form | ✅ | 🟢 | Contact created. Sentiment classified. Media → URGENT. Negative → HIGH. Reply task. | — | |
| Newsletter subscribe | ✅ | 🟢 | Contact created. Tagged "newsletter-subscriber". Engagement scored. | — | |
| Event RSVP | ✅ | 🟢 | Contact created. RSVP linked. Tagged "event-rsvp". Interaction logged. | — | |
| Custom domain routing | ✅ | 🟢 | Middleware → DB lookup → serves site. DNS verification API. | — | |
| Website builder/editor | 🟡 | 🟠 | Settings page with themes/fonts/content. | Needs drag-and-drop section reordering | |
| Per-campaign tracking | ✅ | 🟢 | GA4 + Meta Pixel per campaign. Fires on page load + form submit. | — | |
| Sign installed → notify | ✅ | 🟢 | Supporter notified when sign marked installed | — | |

### 4. DASHBOARD

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Overview mode | ✅ | 🟢 | Health, gap, stats, map, activity, quick actions | — | |
| Field Ops mode | ✅ | 🟠 | Canvassers, turfs, walk lists, calls | Enrich: connect canvass data to comms, auto-task on follow-ups | |
| Finance mode | ✅ | 🟠 | Donations, chart, donors, spending | Enrich: receipt generation, donor communication history | |
| GOTV mode | ✅ | 🟠 | Countdown, voted, P1-P4, support pie, calls | Enrich: auto-SMS to P1 not voted, ride request automation | |
| War Room mode | ✅ | 🟠 | Dark theme, giant gap, grid, ticker | Enrich: real-time comms integration, team alerts | |
| Election Night mode | ✅ | 🟠 | CNN-style results, map, poll table | Enrich: needs live data feed, auto-posting results | |
| Custom widget builder | ✅ | 🟢 | 5 types, 22 sources, 8 colors, persisted | — | |
| Widget reflow | ✅ | 🟢 | No blank gaps when widgets hidden | — | |

### 5. CANVASSING & FIELD

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Campaign map (Leaflet) | ✅ | 🟠 | Doors, turfs, signs, volunteers, routes | Enrich: auto-suggest next turf, heat map by engagement | |
| Walk list | ✅ | 🟠 | Household + person, support badges, follow-ups | Enrich: auto-create follow-up tasks from canvass, connect to comms | |
| GPS tracking | ✅ | 🟢 | 30s interval. Offline via IndexedDB | — | |
| Door-knock logging | ✅ | 🟠 | Result codes, support update, interaction record | Enrich: auto-tag based on result, trigger comms follow-up | |
| Turf management | 🟡 | 🔴 | Data model ready. | Build polygon drawing + assignment UI | |
| Signs management | ✅ | 🟢 | Map markers, request → schedule → install → notify flow | — | |

### 6. GOTV

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Priority list | ✅ | 🟠 | Auto-generated by support + voted status | Enrich: auto-assign to phone bank, connect to comms for auto-dial | |
| Mark voted | ✅ | 🟢 | Individual + batch upload. Stops outreach. | — | |
| Strike-off | ✅ | 🟢 | By contactId or name | — | |
| Rides coordination | ✅ | 🟠 | Request + dispatch | Enrich: auto-assign to driver volunteers, SMS confirmation | |
| Gap calculation | ✅ | 🟢 | Shared metrics: ceil(total * 0.35) | — | |
| Phone banking | ✅🔑 | 🟠 | Twilio token for browser calling | Enrich: auto-log call results, connect to contact timeline | |

### 7. FINANCE

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Donation logging | ✅ | 🟢 | Full CRUD. Contact linking. Major donor → VIP task. | — | |
| Budget import (CSV) | ✅ | 🟢 | Validation + dry-run | — | |
| Expense tracking | 🟡 | 🔴 | CRUD exists. | Build dashboard chart, receipt upload, approval workflow | |
| Stripe donations | ✅🔑 | 🟠 | Checkout works. | Add auto-receipt email, thank-you task, donor tag | |
| Spending vs limit | ✅ | 🟠 | Dashboard widget | Enrich: alert at 80%/90%/100%, auto-freeze if over | |
| Stale pledge follow-up | ✅ | 🟢 | 30+ day pledges → auto-create collection task (lifecycle cron) | — | |

### 8. EVENTS & CALENDAR

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Event CRUD | ✅ | 🟢 | Name, date, location, capacity, virtual | — | |
| RSVP system | ✅ | 🟢 | Going/maybe/declined/checked_in. Linked to Contact. | — | |
| Check-in | ✅ | 🟢 | In-person tracking | — | |
| Email reminders | ✅ | 🟢 | Cron job | — | |
| Post-event follow-up | ✅ | 🟢 | Auto-task created 2 days after (lifecycle cron) | — | |
| Google/Outlook sync | 🔑 | 🔴 | Not implemented | Needs Google Calendar API + Microsoft Graph OAuth | |

### 9. AI / ADONI

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Chat interface | ✅ | 🟢 | Streaming, conversation UI | — | |
| Tool use (24 tools) | ✅ | 🟢 | Contacts, tasks, donations, stats, tags | — | |
| Content generation | ✅ | 🟢 | 7 types: press, scripts, social, email, video, pamphlet, calendar | — | |
| Sentiment classification | ✅ | 🟢 | Classifies inbound as positive/negative/media-inquiry | — | |
| Prompt injection defense | ✅ | 🟢 | Detection + deflection | — | |

### 10. RESOURCE LIBRARY

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Template catalog (18) | ✅ | 🟢 | 7 categories. Preview + download | — | |
| Upload resource | ✅ | 🟠 | Base64 storage. 5MB limit. | Migrate to S3/Vercel Blob for production scale | |
| AI content generator | ✅🔑 | 🟢 | Adoni writes press releases, scripts, emails, calendars | — | |

### 11. PRINT MARKETPLACE

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Product catalog | ✅ | 🟠 | 15 categories with pricing | Enrich: connect to brand kit auto-apply, preview with campaign colors | |
| Design editor | 🔑 | 🔴 | Preview only | Needs canvas tool (Polotno/Canva API) | |
| Order tracking | 🔑 | 🔴 | Schema ready | Needs fulfillment partner API | |

### 12. ANALYTICS

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| 8-tab dashboard | ✅ | 🟠 | All tabs with real data | Enrich: drill-through to contacts, actionable insights not just charts | |
| Scheduled reports | ✅ | 🟢 | Weekly cron. Full campaign summary. Team notified. | — | |

### 13. TV MODE

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Public results display | ✅ | 🟠 | /tv/[slug] — no auth | Enrich: auto-update from GOTV data, team celebration triggers | |
| Real election data | 🔑 | 🔴 | Internal DB working | No public Elections Ontario API exists | |

### 14. ELECTION NIGHT

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Dashboard mode | ✅ | 🟠 | CNN-style results | Enrich: auto-post to social, live team notifications per poll | |
| Live data source | 🔑 | 🔴 | Internal data working | External election API not publicly available | |

### 15. AUTOMATION ENGINE

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Inbound engine | ✅ | 🟢 | Every form → Contact + tag + task + engagement | — | |
| Sentiment classification | ✅ | 🟢 | Media → URGENT, Negative → HIGH, auto-task + team alert | — | |
| Engagement scoring | ✅ | 🟢 | Auto-escalates support levels based on interactions | — | |
| Lifecycle cron (daily) | ✅ | 🟢 | Pledges, VIP donors, milestones, post-event, overdue, countdown, no-shows | — | |
| Weekly report (Monday) | ✅ | 🟢 | Full summary. Stored in history. Team notified. | — | |

### 16. OTHER

| Feature | Status | Enterprise | Notes | What's Needed for 🟢 | Your Notes |
|---------|--------|-----------|-------|----------------------|------------|
| Contact import (CSV) | ✅ | 🟢 | Auto-format, fuzzy match, batch | — | |
| Contact export | ✅ | 🟢 | Filtered CSV | — | |
| Brand kit | 🟡 | 🔴 | Settings save | Apply to all surfaces: emails, SMS footer, print, social posts | |
| Push notifications | ✅🔑 | 🟠 | Full send/schedule/history | Enrich: trigger from automation engine events | |
| Opponent intelligence | ✅ | 🟠 | Full CRUD | Enrich: auto-alert on opponent sign clusters, competitive scoring | |
| Coalitions | ✅ | 🟠 | Full CRUD | Enrich: endorsement → campaign website auto-publish | |
| Media tracking | ✅ | 🟠 | Outlets, ticker, results | Enrich: auto-alert on media mentions, press list integration | |

---

## MARKETING / PUBLIC PAGES

| Page | Status | Enterprise | Notes | Your Notes |
|------|--------|-----------|-------|------------|
| Homepage (/) | ✅ | 🟢 | Guided experience. Product visuals. Website showcase. | |
| Pricing (/pricing) | ✅ | 🟢 | 3-step: role → location → plan. Monthly + one-time. Add-ons. | |
| Demo (/demo) | ✅ | 🟢 | Working credentials. Role selector. Campaign website showcase. | |
| Login (/login) | ✅ | 🟢 | Email/password + Google + Apple. Demo creds displayed. | |
| Unsubscribe | ✅ | 🟢 | CASL compliant. DNC + newsletter unsubscribe. | |

---

## TRACKING & ANALYTICS

| System | Status | Enterprise | Notes | Your Notes |
|--------|--------|-----------|-------|------------|
| Google Analytics 4 | ✅🔑 | 🟢 | Global + per-campaign | |
| Meta Pixel | ✅🔑 | 🟢 | Global + per-campaign. Lead + Purchase events. | |
| Resend webhooks | ✅ | 🟢 | Bounces → DNC. Opens/clicks → engagement. | |
| Page view counter | ✅ | 🟢 | Every candidate page load counted. | |

---

## WHAT GEORGE NEEDS TO PROVIDE

| Item | Why | Priority | Your Notes |
|------|-----|----------|------------|
| RESEND_API_KEY | Email sending | HIGH | |
| TWILIO_ACCOUNT_SID + AUTH_TOKEN + PHONE | SMS sending | HIGH | |
| STRIPE_SECRET_KEY + WEBHOOK_SECRET | Donations | HIGH | |
| ANTHROPIC_API_KEY | Adoni AI | HIGH | |
| NEXTAUTH_SECRET | Production auth | CRITICAL | |
| GOOGLE_CLIENT_ID + SECRET | Google sign-in | MEDIUM | |
| NEXT_PUBLIC_GA_ID | Analytics tracking | MEDIUM | |
| NEXT_PUBLIC_META_PIXEL_ID | Ad tracking | MEDIUM | |
| NEXT_PUBLIC_CLARITY_ID | Heatmaps | LOW | |
| TURNSTILE keys | Form spam protection | MEDIUM | |
| VAPID keys | Push notifications | LOW | |

---

## CHANGELOG

| Date | Author | Changes |
|------|--------|---------|
| 2026-04-07 | Claude Opus 4.6 | Initial George Report. Full system audit. |
| 2026-04-07 | Claude Opus 4.6 | Resource Library enterprise rebuild |
| 2026-04-07 | Claude Opus 4.6 | Communications 10-tab command center |
| 2026-04-07 | Claude Opus 4.6 | Dashboard: live maps, CNN election night, custom widget builder |
| 2026-04-07 | Claude Opus 4.6 | Homepage rebuilt as guided experience |
| 2026-04-07 | Claude Opus 4.6 | Pricing: 3-step role → location → plan wizard |
| 2026-04-07 | Claude Opus 4.6 | Demo page with working credentials + website showcase |
| 2026-04-07 | Claude Opus 4.6 | Tracking: GA4, Meta Pixel, Clarity, Google Ads + per-campaign |
| 2026-04-07 | Claude Opus 4.6 | Domain verification API + per-campaign tracking fields |
| 2026-04-07 | Claude Opus 4.6 | Campaign website premium rebuild |
| 2026-04-07 | Claude Opus 4.6 | Communications suite — all tabs fully wired |
| 2026-04-07 | Claude Opus 4.6 | Communications enterprise upgrade — Adoni AI, segments, audiences |
| 2026-04-08 | Claude Opus 4.6 | CASL: /unsubscribe page + API. Resend webhook. Subscribers tab. |
| 2026-04-08 | Claude Opus 4.6 | 4-tier automation engine: inbound → Contact + tag + task + scoring. Lifecycle cron. |
| 2026-04-08 | Claude Opus 4.6 | All green: Automations wired. Weekly report cron. Resource upload. |
| 2026-04-08 | Claude Opus 4.6 | George Report v2: Added Enterprise column + Enrichment Process. Defined what 🟢 means. |
