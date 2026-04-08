# THE GEORGE REPORT

> Canonical source of truth for Poll City system status.
> Every developer — human or AI — MUST read this file before making changes.
> Update this file after every significant build session.

**Last updated:** 2026-04-07
**Updated by:** Claude Opus 4.6 + George Hatzis

---

## HOW TO USE THIS DOCUMENT

1. **Before starting work**: Read this entire file. Check what exists, what's missing, what's blocked.
2. **After completing work**: Update the relevant section status + add a changelog entry at the bottom.
3. **If you add a feature**: Add it to the correct section with accurate status.
4. **If you find something broken**: Update its status and add a note.
5. **Never mark something ✅ unless it actually works end-to-end with real data.**

---

## STATUS KEY

| Icon | Meaning |
|------|---------|
| ✅ | Production-ready. Works end-to-end with real data. |
| 🟡 | Partially working. Core logic exists but incomplete. |
| 🔴 | Shell only. UI exists but no real functionality behind it. |
| ❌ | Missing entirely. Needs to be built from scratch. |
| 🔑 | Needs env var / API key to function. |

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

| Feature | Status | Notes |
|---------|--------|-------|
| Email/password login | ✅ | bcrypt, rate limiting, lockout after 5 fails |
| Google OAuth | 🔑 | Code ready. Needs GOOGLE_CLIENT_ID + SECRET |
| Apple OAuth | 🔑 | Code ready. Needs APPLE_CLIENT_ID + SECRET |
| 2FA (TOTP) | 🔴 | Flag architecture exists. No code generation. Needs implementation |
| Password reset | ✅ | Token-based, 1hr expiry |
| Team invites | ✅ | Token join flow with role assignment |
| Role-based access | ✅ | Admin, Manager, Volunteer, Finance, Public |

### 2. COMMUNICATIONS

| Feature | Status | Notes |
|---------|--------|-------|
| Email compose + send | ✅🔑 | Resend API. 5K recipients. CASL footer. |
| SMS compose + send | ✅🔑 | Twilio. 2K recipients. CASL footer. |
| Audience calculator | ✅ | Real-time by support level, ward, tags, DNC, volunteer, has email/phone, last contacted |
| AI Write (Adoni) | ✅🔑 | Inline AI content generation in compose. Needs ANTHROPIC_API_KEY |
| Unsubscribe page | ✅ | /unsubscribe — CASL compliant. Marks DNC + newsletter unsubscribe |
| Resend webhooks | ✅ | /api/webhooks/resend — bounces → DNC, complaints, opens, clicks |
| Newsletter subscribers | ✅ | Visible in Subscribers tab. From website signup forms |
| Questions from website | ✅ | Visible in Subscribers tab. Mailto reply link |
| Sign requests | ✅ | Visible in Subscribers tab with status |
| Saved segments | ✅ | Create, save, use in compose. Persisted to campaign JSON |
| Send history | ✅ | Real data from NotificationLog |
| Unified inbox | ✅ | Split panel. Reply navigates to Compose. Archive removes locally. |
| Templates | ✅ | Hardcoded defaults + custom templates persisted to campaign customization. Use loads into Compose. |
| Automations | 🔴 | 6 presets displayed. No trigger engine. No scheduling backend. |
| Scheduled sends | ✅ | Wired to /api/notifications/schedule. Create, list, cancel. |
| Voice broadcasts | 🔴 | Schema + CRUD. No Twilio Voice calls. |
| Social publishing | 🔴 | CRUD in DB. No Twitter/Facebook/Instagram API. |
| Social mentions | 🔴 | Schema exists. No platform API fetching. |
| Newsletter | 🟡 | CRUD works. Send not wired to Resend. |

### 3. CAMPAIGN WEBSITE

| Feature | Status | Notes |
|---------|--------|-------|
| Public candidate page | ✅ | Premium design. Hero, issues, endorsements, events, map, forms |
| Support signup → CRM | ✅ | CAPTCHA protected. Creates Contact |
| Volunteer signup → CRM | ✅ | Availability + skills. Tags contact |
| Donations (Stripe) | ✅🔑 | Checkout works. $1,200 Ontario limit |
| Lawn sign requests | ✅ | Creates SignRequest record |
| Question form | ✅ | Creates Question for campaign review |
| Event RSVP | ✅ | Going/maybe/declined status |
| Custom domain routing | ✅ | Middleware → DB lookup → serves site |
| Domain verification API | ✅ | DNS resolution + HTTPS check |
| Website builder/editor | 🟡 | Settings page with themes/fonts/content. No drag-and-drop. |
| Per-campaign GA4/Pixel | ✅ | Fields in DB. Fires on page load + form submit |
| QR code generation | ✅ | PNG/SVG download |
| SEO meta editing | ✅ | Title, description, OG tags |
| Tracking events | ✅ | Lead (volunteer/support), Purchase (donation) |

### 4. DASHBOARD

| Feature | Status | Notes |
|---------|--------|-------|
| Overview mode | ✅ | Health, gap, stats, map, activity, quick actions |
| Field Ops mode | ✅ | Canvassers, turfs, walk lists, calls |
| Finance mode | ✅ | Donations, chart, donors, spending |
| GOTV mode | ✅ | Countdown, voted, P1-P4, support pie, calls |
| War Room mode | ✅ | Dark theme, giant gap, grid, ticker |
| Election Night mode | ✅ | CNN-style results, map, poll table |
| Custom widget builder | ✅ | 5 types, 22 sources, 8 colors, persisted |
| Customize panel | ✅ | Toggle 27 widgets, set default mode |
| Live Leaflet map | ✅ | Contact pins, heat circles, viewport loading |
| Auto-refresh | ✅ | 10-second polling |
| Widget reflow | ✅ | No blank gaps when widgets hidden |

### 5. CANVASSING & FIELD

| Feature | Status | Notes |
|---------|--------|-------|
| Campaign map (Leaflet) | ✅ | Doors, turfs, signs, volunteers, routes |
| Walk list | ✅ | Household + person, support badges, follow-ups |
| GPS tracking | ✅ | 30s interval. Offline via IndexedDB |
| Door-knock logging | ✅ | Result codes, support update, interaction record |
| Turf management | 🟡 | Data model ready. Polygon drawing not implemented |
| Signs management | ✅ | Map markers, request → schedule → install flow |

### 6. GOTV

| Feature | Status | Notes |
|---------|--------|-------|
| Priority list | ✅ | Auto-generated by support + voted status |
| Mark voted | ✅ | Individual + batch upload |
| Strike-off | ✅ | By contactId or name |
| Rides coordination | ✅ | Request + dispatch |
| Gap calculation | ✅ | Shared metrics: ceil(total * 0.35) |
| P1-P4 breakdown | ✅ | From support levels |
| Phone banking | ✅🔑 | Twilio token for browser calling |

### 7. FINANCE

| Feature | Status | Notes |
|---------|--------|-------|
| Donation logging | ✅ | Full CRUD. Contact linking |
| Budget import (CSV) | ✅ | Validation + dry-run |
| Expense tracking | 🟡 | CRUD exists. No dashboard chart |
| Stripe donations | ✅🔑 | Checkout works. No receipt email |
| Spending vs limit | ✅ | Dashboard widget |

### 8. EVENTS & CALENDAR

| Feature | Status | Notes |
|---------|--------|-------|
| Event CRUD | ✅ | Name, date, location, capacity, virtual |
| RSVP system | ✅ | Going/maybe/declined/checked_in |
| Check-in | ✅ | In-person tracking |
| Email reminders | ✅ | Cron job |
| Recurrence | ✅ | iCal rules |
| Calendar export | ✅ | iCal download |
| Google/Outlook sync | ❌ | Not implemented |

### 9. AI / ADONI

| Feature | Status | Notes |
|---------|--------|-------|
| Chat interface | ✅ | Streaming, conversation UI |
| Tool use (24 tools) | ✅ | Contacts, tasks, donations, stats, tags |
| Campaign context | ✅ | Name, days to election, counts |
| Memory | ✅ | Preferences, decisions, open items |
| Content generation | ✅ | 7 types: press, scripts, social, email, video, pamphlet, calendar |
| Prompt injection defense | ✅ | Detection + deflection |

### 10. RESOURCE LIBRARY

| Feature | Status | Notes |
|---------|--------|-------|
| Template catalog (18) | ✅ | 7 categories. Preview + download |
| Preview drawer | ✅ | HTML iframe. Escape-to-close |
| Download with branding | ✅ | Campaign brand kit applied |
| AI content generator | ✅🔑 | Needs ANTHROPIC_API_KEY |
| Upload resource | 🔴 | Button exists. No file storage |
| My Resources | 🔴 | Empty state. Needs model |

### 11. PRINT MARKETPLACE

| Feature | Status | Notes |
|---------|--------|-------|
| Product catalog | ✅ | 15 categories with pricing |
| Job creation | ✅ | Specs + requirements |
| Shop directory | ✅ | Browse + filter |
| Payment | 🟡🔑 | Stripe intent. 15% platform fee |
| Design editor | 🔴 | Shell only |
| Order tracking | 🔴 | Schema exists. No fulfillment |
| Proof approval | ❌ | Not built |

### 12. ANALYTICS

| Feature | Status | Notes |
|---------|--------|-------|
| 8-tab dashboard | ✅ | Campaign, canvassing, supporters, volunteers, GOTV, finance, events, historical |
| Charts (Recharts) | ✅ | Pie, bar, line, area |
| Choropleth map | ✅ | Needs GIS seed data |
| Export (PNG) | ✅ | Chart image export |
| Scheduled reports | ❌ | Not built |

### 13. TV MODE

| Feature | Status | Notes |
|---------|--------|-------|
| Public results display | ✅ | /tv/[slug] — no auth |
| Live stats API | ✅ | Feed, results, stats, volunteers |
| Auto-rotation | ✅ | Cycles panels |
| Real election data | 🔴 | DB only. No live election API |

### 14. ELECTION NIGHT

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard mode | ✅ | CNN-style candidate vs opponent |
| Results map | ✅ | Leaflet integration |
| Poll-by-poll table | 🟡 | Table exists. Needs data feed |
| Live data source | 🔴 | No election results API connected |

### 15. OTHER

| Feature | Status | Notes |
|---------|--------|-------|
| Contact import (CSV) | ✅ | Auto-format, fuzzy match, batch |
| Contact export | ✅ | Filtered CSV |
| Brand kit | 🟡 | Settings save. Not applied everywhere |
| Push notifications | 🔴🔑 | Subscribe works. Sending not built |
| Opponent intelligence | 🔴 | Page shell only |
| Coalitions | 🔴 | Page shell only |
| Media tracking | 🔴 | Page shell only |
| Sentiment dashboard | ✅ | Public page with official approval ratings |
| Officials directory | ✅ | 1,100+ searchable officials |
| Help center | ✅ | Articles + categories |

---

## MARKETING / PUBLIC PAGES

| Page | Status | Notes |
|------|--------|-------|
| Homepage (/) | ✅ | Guided experience. Product visuals. Website showcase. |
| Pricing (/pricing) | ✅ | 3-step: role → location → plan. Ontario data. |
| Demo (/demo) | ✅ | Working credentials. Role selector. Website showcase. |
| Login (/login) | ✅ | Email/password + Google + Apple |
| Help (/help) | ✅ | Articles + search |
| Officials (/officials) | ✅ | Directory with search |
| Terms (/terms) | ✅ | Legal text |
| Privacy (/privacy-policy) | ✅ | PIPEDA reference |
| Calculator (/calculator) | ✅ | Campaign cost estimator |

---

## TRACKING & ANALYTICS

| System | Status | Notes |
|--------|--------|-------|
| Google Analytics 4 | ✅🔑 | Next.js Script. Needs NEXT_PUBLIC_GA_ID |
| Meta Pixel | ✅🔑 | afterInteractive. Needs NEXT_PUBLIC_META_PIXEL_ID |
| Google Ads | ✅🔑 | Piggybacks on GA4 loader. Needs NEXT_PUBLIC_GOOGLE_ADS_ID |
| Microsoft Clarity | ✅🔑 | Heatmaps + recordings. Needs NEXT_PUBLIC_CLARITY_ID |
| Per-campaign GA4 | ✅ | Campaign gaId field. Fires on candidate page |
| Per-campaign Pixel | ✅ | Campaign metaPixelId. Fires Lead + Purchase events |
| Page view counter | ✅ | Increments on every candidate page load |

---

## WHAT GEORGE NEEDS TO PROVIDE

| Item | Why | Priority |
|------|-----|----------|
| RESEND_API_KEY | Email sending won't work without it | HIGH |
| TWILIO_ACCOUNT_SID + AUTH_TOKEN + PHONE_NUMBER | SMS won't work without it | HIGH |
| STRIPE_SECRET_KEY + WEBHOOK_SECRET | Donations won't process | HIGH |
| ANTHROPIC_API_KEY | Adoni AI won't respond | HIGH |
| NEXTAUTH_SECRET | Required for production auth | CRITICAL |
| GOOGLE_CLIENT_ID + SECRET | For Google sign-in | MEDIUM |
| NEXT_PUBLIC_GA_ID | For Google Analytics tracking | MEDIUM |
| NEXT_PUBLIC_META_PIXEL_ID | For Meta ad tracking | MEDIUM |
| NEXT_PUBLIC_CLARITY_ID | For heatmaps/session recordings | LOW |
| TURNSTILE keys | For form spam protection | MEDIUM |
| VAPID keys | For push notifications | LOW |

---

## CHANGELOG

| Date | Author | Changes |
|------|--------|---------|
| 2026-04-07 | Claude Opus 4.6 | Initial George Report created. Full system audit. |
| 2026-04-07 | Claude Opus 4.6 | Resource Library enterprise rebuild |
| 2026-04-07 | Claude Opus 4.6 | Communications 10-tab command center |
| 2026-04-07 | Claude Opus 4.6 | Dashboard: live maps, CNN election night, custom widget builder |
| 2026-04-07 | Claude Opus 4.6 | Homepage rebuilt as guided experience |
| 2026-04-07 | Claude Opus 4.6 | Pricing: 3-step role → location → plan wizard |
| 2026-04-07 | Claude Opus 4.6 | Demo page with working credentials + website showcase |
| 2026-04-07 | Claude Opus 4.6 | Tracking: GA4, Meta Pixel, Clarity, Google Ads + per-campaign |
| 2026-04-07 | Claude Opus 4.6 | Domain verification API + per-campaign tracking fields |
| 2026-04-07 | Claude Opus 4.6 | Campaign website premium rebuild |
| 2026-04-07 | Claude Opus 4.6 | Communications suite — all tabs fully wired (overview stats, inbox reply, templates CRUD, scheduled CRUD, compose save draft/template, history pagination, cross-tab navigation) |
| 2026-04-07 | Claude Opus 4.6 | Communications enterprise upgrade — Adoni AI Write in compose, enriched audience filters (volunteer/email/phone/last contacted), segment builder in Audiences tab, removed AI Assistant from nav |
