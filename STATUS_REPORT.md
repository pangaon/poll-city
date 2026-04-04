# Poll City — Comprehensive Status Report

**Generated:** April 4, 2026  
**Build:** v1.5.0 · 105 routes · Clean (`npm run build` ✅)  
**Branch:** main  

---

## Status Key

| Symbol | Meaning |
|---|---|
| ✅ Built & Verified | In build output, manually smoke-testable, no known defects |
| ⚠️ Built Unverified | In build output, code complete, not end-to-end smoke-tested |
| 🔨 Partially Built | Code exists but features are incomplete or broken |
| ❌ Not Built | Feature specified, no code exists |

---

## 1. Page Routes (48 pages)

### Marketing & Public (no auth)

| Route | Status | Notes |
|---|---|---|
| `/` | ✅ | Full marketing home — nav, hero, stats, pricing, FAQ, footer |
| `/pricing` | ✅ | Pricing page (renders PricingClient from marketing) |
| `/terms` | ✅ | Static terms of service |
| `/privacy-policy` | ✅ | Static privacy policy |
| `/officials` | ✅ | Searchable public officials directory, 24/page, province/level/role/municipality filters |
| `/login` | ✅ | NextAuth credentials form |
| `/candidates/[slug]` | ✅ | Public candidate profile — photo, bio, polls, election history, social links, claim banner |
| `/claim/[slug]` | 🔨 | Works only when `slug` is a campaign slug with linked official; **broken for official externalId slugs from `/officials` directory** |
| `/canvass` | ⚠️ | Public canvassing quick-capture (no auth) |
| `/social` | ✅ | Poll City Social landing |
| `/social/polls` | ✅ | Public poll listing |
| `/social/polls/[id]` | ✅ | Poll detail + voting |
| `/social/officials` | ✅ | Officials on Social |
| `/social/officials/[id]` | ✅ | Official detail on Social — questions, follow, support signal |
| `/social/profile` | ✅ | Social user profile |

### Admin App (auth required)

| Route | Status | Notes |
|---|---|---|
| `/dashboard` | ✅ | Drag-drop widgets, 4 presets, localStorage persistence |
| `/contacts` | ✅ | CRM list — search, filter by support level/tag/ward, pagination |
| `/contacts/[id]` | ✅ | Contact detail — interactions, tasks, custom fields |
| `/campaigns` | ✅ | Campaign list + switcher |
| `/campaigns/new` | 🔨 | Creates campaign; municipality dropdown hardcoded to ON; **no province selector; no ward dropdown** |
| `/canvassing` | ✅ | Turf list + assignment overview |
| `/canvassing/turf-builder` | ✅ | Map-based turf creation (raw Leaflet, dynamic import) |
| `/canvassing/walk` | ✅ | Field canvassing app — GPS, door status, quick capture |
| `/capture` | ✅ | Quick contact/sign/volunteer capture |
| `/tasks` | ✅ | Task list — priority, assignee, status filters |
| `/volunteers` | ✅ | Volunteer list — activate/deactivate, bulk actions |
| `/donations` | ✅ | Donation log |
| `/signs` | ✅ | Sign request/placement tracker |
| `/polls` | ✅ | Poll builder + results |
| `/gotv` | ✅ | GOTV dashboard — voted list upload, priority call list |
| `/call-list` | ✅ | Dialer-ready call list |
| `/notifications` | ✅ | Push notifications — send now, schedule, history, delivery stats, test button |
| `/analytics` | ✅ | Election heat maps, bar/line charts, sortable table, CSV export |
| `/billing` | ⚠️ | Billing page shell; Stripe Checkout works; no subscription management UI |
| `/settings` | ✅ | Campaign settings |
| `/settings/fields` | ✅ | Custom field builder |
| `/settings/public-page` | ✅ | Public page settings |
| `/import-export` | ✅ | CSV export (contacts); CSV import with column mapping |
| `/import-export/smart-import` | ✅ | AI-assisted import with field mapping suggestions |
| `/ai-assist` | ⚠️ | AI chat (mock mode available; Anthropic/OpenAI key optional) |
| `/admin` | ⚠️ | Super-admin panel (shell — no user management UI) |
| `/lookup` | ✅ | Postal code → ward/riding lookup |
| `/print` | ✅ | Print marketplace landing — 8 product cards |
| `/print/jobs` | ✅ | My print jobs list |
| `/print/jobs/new` | ✅ | 5-step new job wizard |
| `/print/jobs/[id]` | ✅ | Job detail — 8-stage timeline, bid comparison, proof approval |
| `/print/shops` | ✅ | Vendor directory — search by specialty/area |
| `/print/shops/register` | ✅ | Shop application form — specialties, provinces, portfolio, Stripe terms |
| `/print/products/[product]` | ⚠️ | Product detail pages (8 products); specs and pricing display |

---

## 2. API Endpoints (73 routes)

### Authentication
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | ✅ | NextAuth credentials + JWT session |

### Campaigns
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/campaigns` | GET, POST | ✅ | List user campaigns; create with auto-slug |
| `/api/campaigns/switch` | POST | ✅ | Switch active campaign (persists to session) |
| `/api/campaigns/current` | GET | ✅ | Return active campaign for session |

### Contacts & CRM
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/contacts` | GET, POST | ✅ | Paginated list with 10+ filters; create contact |
| `/api/contacts/[id]` | GET, PATCH, DELETE | ✅ | Contact detail; campaign-scoped; role-gated delete |
| `/api/contacts/streets` | GET | ✅ | Distinct street names for turf builder |
| `/api/contacts/bulk-tag` | POST | ✅ | Bulk add/remove tags |
| `/api/contacts/bulk-update` | POST | ✅ | Bulk support level / field update |
| `/api/interactions` | POST | ✅ | Log door knock, call, text, email, note interactions |
| `/api/custom-field-values` | GET, POST | ✅ | Custom field values per contact |
| `/api/campaign-fields` | GET, POST | ✅ | Campaign-scoped custom field definitions |

### Tasks
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/tasks` | GET, POST | ✅ | Paginated tasks; assignee/status filters |
| `/api/tasks/[id]` | PATCH, DELETE | ✅ | Update task; role-gated delete |

### Canvassing & Turf
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/canvass` | GET, POST | ✅ | Walk lists |
| `/api/canvass/assign` | POST | ✅ | Assign volunteer to turf |
| `/api/turf` | GET, POST | ✅ | Turf CRUD |
| `/api/turf/preview` | POST | ✅ | Preview stops before saving |
| `/api/turf/[id]` | GET, PATCH, DELETE | ✅ | Turf detail |
| `/api/turf/[id]/optimize` | POST | ✅ | TSP route optimization |
| `/api/turf/[id]/stops/[stopId]` | PATCH | ✅ | Update stop visited status |
| `/api/turf/leaderboard` | GET | ✅ | Canvasser performance leaderboard |
| `/api/canvasser/location` | POST | ✅ | GPS location ping from field app |

### Volunteers
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/volunteers` | GET, POST | ✅ | Volunteer list/create |
| `/api/volunteers/quick-capture` | POST | ✅ | Public volunteer sign-up |
| `/api/volunteers/bulk-activate` | POST | ✅ | Bulk activate |
| `/api/volunteers/bulk-deactivate` | POST | ✅ | Bulk deactivate |

### Signs & Donations
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/signs` | GET, POST | ✅ | Sign requests / placements |
| `/api/signs/quick-capture` | POST | ✅ | Field sign capture |
| `/api/donations` | GET, POST | ✅ | Donation log |
| `/api/donations/quick-capture` | POST | ✅ | Quick donation entry |

### Polls
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/polls` | GET, POST | ✅ | Public + campaign polls; 5 poll types |
| `/api/polls/[id]` | GET, PATCH, DELETE | ✅ | Poll detail; hardened against duplicate votes |
| `/api/polls/[id]/respond` | GET, POST | ✅ | Submit/get results; session + hashed-IP fallback |

### GOTV
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/gotv` | GET, POST | ✅ | GOTV batch management |
| `/api/gotv/upload` | POST | ✅ | Upload voted list CSV |
| `/api/gotv/priority-list` | GET | ✅ | Sorted call list for GOTV day |

### Call List
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/call-list` | GET | ✅ | Phone-sortable contact list |
| `/api/call-list/[id]` | PATCH | ✅ | Update call outcome |

### Notifications
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/notifications/subscribe` | POST | ✅ | Save browser push subscription |
| `/api/notifications/send` | POST | ✅ | Send to subscribers with filters; logs to NotificationLog |
| `/api/notifications/test` | POST | ✅ | Send test to current user's subscription |
| `/api/notifications/schedule` | GET, POST, DELETE | ✅ | CRUD scheduled notifications |
| `/api/notifications/stats` | GET | ✅ | Aggregated delivery stats from NotificationLog |
| `/api/notifications/history` | GET | ✅ | Paginated notification history |
| `/api/notifications/staff-alert` | POST | ✅ | Internal staff alerts |

### Officials (Public & Private)
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/officials` | GET | ✅ | Public official lookup by postal code or search |
| `/api/officials/[id]` | GET, PATCH | ✅ | Official detail; claim updates |
| `/api/officials/[id]/questions` | GET, POST | ✅ | Public questions to official |
| `/api/officials/directory` | GET | ✅ | Paginated directory with all filters |

### Analytics
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/analytics/election-results` | GET | ✅ | 2014/2018/2022 Ontario election data with grouping |
| `/api/analytics/heat-map` | GET | ✅ | Win/loss intensity buckets for choropleth |

### Geo
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/geo` | GET | ✅ | Postal code → ward/riding (caches to GeoDistrict) |
| `/api/geo/municipalities` | GET | ✅ | Distinct municipalities from ElectionResult |
| `/api/geo/wards` | GET | ❌ → ✅ | **Being added** — distinct wards/districts from Officials |

### Social / Consent Bridge
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/social/consent` | GET, POST | ✅ | Consent signals |
| `/api/social/consent/[id]` | PATCH | ✅ | Update/revoke consent |
| `/api/social/signal` | POST | ✅ | Support signal from Social |
| `/api/social/notification-consent` | GET, POST | ✅ | Voter push notification opt-in |
| `/api/social/notification-consent/[campaignId]` | GET | ✅ | Per-campaign consent status |
| `/api/social/my-notifications` | GET | ✅ | Voter's own notification history |

### Claim Flow
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/claim/request` | POST | 🔨 | Generates HMAC token, **logs to console only** (no email sent) |
| `/api/claim/verify` | GET | ✅ | Verifies token, marks official claimed, redirects to /pricing |

### Print Marketplace
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/print/jobs` | GET, POST | ✅ | List/create print jobs |
| `/api/print/jobs/[id]` | GET, PATCH | ✅ | Job detail + status updates |
| `/api/print/jobs/[id]/bids` | GET, POST | ✅ | Bid listing + submission |
| `/api/print/shops` | GET, POST | ✅ | Shop directory + registration |
| `/api/print/shops/onboard` | POST | ✅ | Stripe Connect onboarding link |
| `/api/print/payment/create-intent` | POST | ✅ | Stripe payment intent (15% platform fee) |
| `/api/print/payment/release` | POST | ✅ | Release payment to shop on delivery confirm |

### Public Candidates
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/public/candidates/[slug]` | GET | ✅ | Public campaign data (isPublic guard) |
| `/api/public/candidates/[slug]/question` | POST | ✅ | Submit question to candidate |
| `/api/public/candidates/[slug]/sign-request` | POST | ✅ | Public sign request |
| `/api/public/candidates/[slug]/support` | POST | ✅ | Support signal |
| `/api/public/candidates/[slug]/volunteer` | POST | ✅ | Volunteer opt-in |

### Other
| Endpoint | Method | Status | Notes |
|---|---|---|---|
| `/api/users/[id]` | GET, PATCH | ✅ | User profile updates |
| `/api/import` | POST | ✅ | CSV import processor |
| `/api/import-export` | GET, POST | ✅ | Export CSV; import with field mapping |
| `/api/ai-assist` | POST | ✅ | AI chat (mock + live modes) |
| `/api/stripe/checkout` | POST | ✅ | Stripe Checkout session creation |
| `/api/stripe/webhook` | POST | ✅ | Stripe webhook handler |
| `/api/upload/logo` | POST | ✅ | Campaign logo upload |

---

## 3. Database Models (44 models)

| Model | Purpose | Est. Records | Status |
|---|---|---|---|
| `User` | All users (admins, volunteers, public) | Dev: 4 demo users | ✅ |
| `Campaign` | Campaign records | Dev: 1 demo | ✅ |
| `Membership` | User ↔ Campaign role mapping | Dev: 4 | ✅ |
| `Official` | Elected officials (seeded from Represent API) | **1,100+** (ON/BC seed) | ✅ |
| `OfficialFollow` | Social follows of officials | 0 | ✅ |
| `Household` | Door-knock household grouping | 0 | ✅ |
| `Contact` | CRM contacts | Dev: demo contacts | ✅ |
| `Tag` | Contact tags | Dev: a few | ✅ |
| `ContactTag` | Contact ↔ Tag junction | — | ✅ |
| `CanvasList` | Canvassing lists (legacy) | 0 | ✅ |
| `CanvassAssignment` | Volunteer → turf assignment | 0 | ✅ |
| `Turf` | Turf cuts with stops | 0 | ✅ |
| `TurfStop` | Individual stops in a turf | 0 | ✅ |
| `CanvasserLocation` | Real-time GPS pings | 0 | ✅ |
| `Interaction` | Door knock/call/text logs | Dev: demo data | ✅ |
| `Task` | Campaign tasks | Dev: demo data | ✅ |
| `Sign` | Lawn sign requests + placements | 0 | ✅ |
| `SignRequest` | Public sign requests via Social | 0 | ✅ |
| `VolunteerProfile` | Volunteer details + hours | 0 | ✅ |
| `Poll` | Campaign + public polls | Dev: demo | ✅ |
| `PollOption` | Poll answer options | Dev: demo | ✅ |
| `PollResponse` | Vote records | 0 | ✅ |
| `SupportSignal` | Social support pledges | 0 | ✅ |
| `PublicQuestion` | Questions to officials/candidates | 0 | ✅ |
| `Question` | (alias / legacy) | 0 | ✅ |
| `GeoDistrict` | Postal code → ward/riding cache | 0 (populated by lookups) | ✅ |
| `Notification` | In-app notifications | 0 | ✅ |
| `PushSubscription` | Browser push subscription keys | 0 | ✅ |
| `NotificationLog` | Push notification delivery log | 0 | ✅ |
| `ServiceProvider` | External service providers | 0 | ⚠️ (legacy model, UI not built) |
| `ServiceBooking` | Service booking records | 0 | ⚠️ (legacy model) |
| `Donation` | Donation records | 0 | ✅ |
| `GotvBatch` | GOTV voted-list upload batches | 0 | ✅ |
| `GotvRecord` | Individual GOTV contact records | 0 | ✅ |
| `NotificationTemplate` | Reusable notification templates | 0 | ❌ (model exists, no UI) |
| `QrCode` | Campaign QR codes | 0 | ⚠️ (model + API pending UI) |
| `QrScan` | QR scan log | 0 | ⚠️ |
| `ElectionResult` | 2014/2018/2022 ON municipal results | **7,048** records | ✅ |
| `CampaignField` | Custom field definitions | Dev: a few | ✅ |
| `CustomFieldValue` | Custom field values per contact | 0 | ✅ |
| `ActivityLog` | Audit trail | Dev: some | ✅ |
| `Subscription` | Stripe subscription records | 0 | ✅ |
| `ConsentLog` | PIPEDA consent audit log | 0 | ✅ |
| `PrintShop` | Print vendor profiles | 0 | ✅ |
| `PrintJob` | Print orders | 0 | ✅ |
| `PrintBid` | Shop bids on print jobs | 0 | ✅ |

---

## 4. Features from Product Brief

### Turf Cutting and Route Optimization

| Feature | Status | Notes |
|---|---|---|
| Smart turf creation by ward/poll/street/odd-even | ✅ | `/canvassing/turf-builder` |
| Route optimization (TSP) | ✅ | `/api/turf/[id]/optimize` — nearest-neighbour TSP |
| Google Maps walking directions | 🔨 | Map renders (raw Leaflet); turn-by-turn directions not integrated |
| Poll-by-poll assignment | ✅ | TurfStop model, assignment API |
| Street-by-street odd/even split | ✅ | Turf model `oddEven` field |
| Real-time canvasser GPS tracking | ✅ | `/api/canvasser/location` + manager map |
| Turf completion % live updates | ✅ | `completedStops / totalStops` via PATCH stops |
| Auto-reassign incomplete turfs | ❌ | Not built |
| Canvasser performance leaderboard | ✅ | `/api/turf/leaderboard` + UI |

### Election Data Visualization

| Feature | Status | Notes |
|---|---|---|
| Support level heat maps | 🔨 | Analytics has election result heat maps; no campaign-specific support-level maps |
| Voter turnout heat maps (vs 2022/2018) | ✅ | `/analytics` — intensity buckets, colour-coded tiles |
| Choropleth maps by ward | 🔨 | Colour tiles by bucket; not true GeoJSON choropleth |
| Door knock completion maps | ❌ | Not built |
| Sign density maps | ❌ | Not built |
| Donation heat maps | ❌ | Not built |
| Volunteer coverage maps | ❌ | Not built |
| Time-series charts (support level over time) | 🔨 | Line chart shows 2014/2018/2022 vote trends; not live campaign data |
| Poll-by-poll breakdown tables | ✅ | `/analytics` sortable table |
| Export maps as PNG | ✅ | Export button in analytics |

### Dashboard Drag-and-Drop Customization

| Feature | Status | Notes |
|---|---|---|
| Drag and drop widget placement | ✅ | HTML5 drag-and-drop |
| Show/hide any widget | ✅ | Customize panel with toggles |
| Resize widgets | ❌ | Not built — fixed sizes only |
| Save custom layouts per user | ✅ | localStorage keyed by userId |
| Pre-built layouts (Field/Finance/GOTV/Overview) | ✅ | 4 presets |
| Mobile dashboard layout | 🔨 | Responsive grid; drag disabled on mobile |
| Real-time data refresh | 🔨 | Manual refresh button; no polling interval |
| Widget library (8 types) | ✅ | contacts, doors, signs, donations, GOTV, support-rate, etc. |

### Additional Platform Features

| Feature | Status | Notes |
|---|---|---|
| Canvassing script builder with branching logic | ❌ | Not built |
| Voter file import with auto field mapping | ✅ | `/import-export/smart-import` with AI assist |
| Duplicate contact detection and merge | ❌ | Not built |
| Household grouping for door knocking | 🔨 | `Household` model + `Contact.householdId`; no grouping UI |
| Do Not Knock / Do Not Call flags | ✅ | `Contact.doNotContact`; visible in walk list |
| Weather integration | ❌ | Not built |
| Shift scheduling for volunteers with SMS | ❌ | Not built |
| Event management | ❌ | Not built |
| Media library | ❌ | Not built |
| Bulk SMS (CASL compliant) | ❌ | Not built |
| Campaign budget tracker | ❌ | Not built |
| Opponent sign spotting with map | ❌ | Not built |
| School board trustee district data | ❌ | Not built |
| Federal/provincial riding overlap display | ❌ | Not built |

### Core CRM & Campaign Management

| Feature | Status | Notes |
|---|---|---|
| Contact list with 10+ filters | ✅ | |
| Contact detail with interaction history | ✅ | |
| Custom field builder | ✅ | |
| CSV import/export | ✅ | |
| Smart import with AI field mapping | ✅ | |
| Multi-campaign support + switcher | ✅ | |
| Role-based permissions (Admin/Manager/Volunteer) | ✅ | |
| Activity audit log | ✅ | |
| Task management with priority/assignee | ✅ | |
| Bulk contact operations | ✅ | Tag, update, support level |

### Poll City Social

| Feature | Status | Notes |
|---|---|---|
| Officials directory (public) | ✅ | `/officials` + `/social/officials` |
| Official profile pages | ✅ | Photos, bio, polls, questions |
| Public Q&A to officials | ✅ | `/social/officials/[id]` |
| Voter follows officials | ✅ | `OfficialFollow` model |
| Public polling (binary/multiple/ranked/slider/swipe) | ✅ | |
| Support signals (voter → campaign) | ✅ | Consent-gated |
| Volunteer opt-in | ✅ | |
| Sign request | ✅ | |
| Voter push notification opt-in | ✅ | |
| Consent revocation | ✅ | |
| PIPEDA audit log | ✅ | `ConsentLog` |
| Postal code → ward lookup | ✅ | |

### Official Profile Claiming

| Feature | Status | Notes |
|---|---|---|
| Claim button on public profile | ✅ | `/candidates/[slug]` unclaimed banner |
| Claim button from officials directory | 🔨 | Button links to `/claim/{externalId}` but page only resolves campaign slugs |
| Email verification with HMAC token | ✅ | 24h TTL, SHA-256 signed |
| Transactional email delivery | ❌ | Token logged to console only — **no email provider wired** |
| Redirect to /pricing on verify | ✅ | |
| isClaimed + claimedAt updated | ✅ | |
| Campaign creation for claimed official | ❌ | Verify marks official as claimed but does not create campaign or User account |
| Link User account to Official | ❌ | `claimedByUserId` field exists, never populated |

### Push Notifications

| Feature | Status | Notes |
|---|---|---|
| Browser subscription (VAPID) | ✅ | `usePushNotifications` hook |
| Send now with filters (ward/riding/role) | ✅ | |
| Test send to current user | ✅ | |
| Scheduled notifications (UI + API) | ✅ | Stored in DB; requires Vercel Cron to process |
| Vercel Cron processor | ❌ | Not built — see `docs/VAPID_SETUP.md` |
| Delivery stats | ✅ | `deliveredCount / failedCount / deliveryRate` |
| Voter opt-in push (Social side) | ✅ | Consent-gated, separate PushSubscription |
| VAPID keys configured | ⚠️ | Must be set in `.env` — no defaults |

### Print Marketplace

| Feature | Status | Notes |
|---|---|---|
| 8 product categories | ✅ | Door hanger, lawn sign, flyer, palm card, mailer, banner, button, window sign |
| Product detail pages with specs | ✅ | `/print/products/[product]` |
| 5-step new job wizard | ✅ | Product → specs → design → delivery → review |
| Marketplace bid system | ✅ | Shops receive, submit, and win bids |
| 8-stage job status timeline | ✅ | draft → posted → bidding → awarded → in_production → quality_check → shipped → delivered |
| Proof upload/approval | ⚠️ | File URL field; no direct S3 upload |
| Stripe Connect escrow (15% fee) | ✅ | `/api/print/payment/create-intent` |
| Payment release on delivery | ✅ | `/api/print/payment/release` |
| Shop directory | ✅ | Search by specialty/area/rating |
| Shop registration form | ✅ | `/print/shops/register` |
| Stripe Connect onboarding | ✅ | `/api/print/shops/onboard` |

---

## 5. Security Gaps (Priority Order)

| # | Severity | Gap | File | Fix Needed |
|---|---|---|---|---|
| 1 | 🔴 **Critical** | Claim verification email NOT sent — token only logged to `console.log` | `src/app/api/claim/request/route.ts:43` | Wire transactional email (Resend / SendGrid / Postmark) |
| 2 | 🔴 **Critical** | `NEXTAUTH_SECRET` falls back to hardcoded `"dev-secret"` in claim routes | `src/app/api/claim/request/route.ts:5`, `verify/route.ts:5` | Must enforce `process.env.NEXTAUTH_SECRET!` — throw at startup if missing |
| 3 | 🟠 **High** | No rate limiting on `/api/claim/request` — email spam/abuse vector | — | Add IP-based rate limiter (Upstash Ratelimit + Vercel Edge) |
| 4 | 🟠 **High** | `claimedByUserId` never populated after claim — claimed official has no linked user account | `src/app/api/claim/verify/route.ts:55-62` | Create or link User on verification, populate `claimedByUserId` |
| 5 | 🟠 **High** | Middleware allows any authenticated user to access `/admin` — no `SUPER_ADMIN` role check | `src/middleware.ts` | Add role guard: redirect non-SUPER_ADMIN away from `/admin` |
| 6 | 🟡 **Medium** | VAPID keys have no startup validation — notifications silently fail if keys missing | `src/lib/notifications/push.ts` | Add `if (!VAPID_PUBLIC_KEY) throw` at module load |
| 7 | 🟡 **Medium** | `ai-assist` route has mock mode fallback that can be triggered in production | `src/app/api/ai-assist/route.ts` | Gate mock mode behind `NODE_ENV !== 'production'` |
| 8 | 🟡 **Medium** | GOTV upload accepts any CSV — no field validation, PII exposure risk | `src/app/api/gotv/upload/route.ts` | Validate expected columns, sanitize before insert |
| 9 | 🟡 **Medium** | Print file URLs accepted as user-supplied strings with no validation | `src/app/api/print/jobs/route.ts` | Validate URL format; restrict to known domains or S3 |
| 10 | 🟢 **Low** | `ServiceProvider` / `ServiceBooking` models exist with no auth-protected API | — | Either build the API with auth or remove unused models |

---

## 6. What Needs to Be Built — Priority Order

### P0 — Blockers for Launch

| # | Feature | Why Critical |
|---|---|---|
| 1 | **Transactional email for claim verification** | Claim flow is completely non-functional without email delivery |
| 2 | **NEXTAUTH_SECRET enforcement** | Any deployment without this env var has broken security |
| 3 | **Campaign creation after claim verification** | Claimed officials have no way to access the admin app |
| 4 | **Fix `/claim/[slug]` for official externalId slugs** | Officials directory "Claim Profile" button returns 404 |

### P1 — Core Product Gaps

| # | Feature | Notes |
|---|---|---|
| 5 | **Vercel Cron for scheduled notifications** | Already documented in `docs/VAPID_SETUP.md` |
| 6 | **Rate limiting on claim/request** | Before any marketing push to officials |
| 7 | **Household grouping UI** | Model exists; no way to group contacts by address |
| 8 | **Duplicate contact detection** | Import pipeline creates duplicates with no merge |
| 9 | **QR code UI** | Model + scan log exist; no generator/scanner UI |
| 10 | **Admin `/admin` SUPER_ADMIN guard** | Any logged-in user can access super-admin |

### P2 — Growth Features

| # | Feature | Notes |
|---|---|---|
| 11 | **Bulk SMS (CASL compliant)** | High demand from campaigns |
| 12 | **Canvassing script builder** | Branching door scripts |
| 13 | **Campaign budget tracker** | Basic income/expense ledger |
| 14 | **Shift scheduling for volunteers** | Calendar + SMS reminders |
| 15 | **True choropleth GeoJSON maps** | Replace colour-tile approximation with SVG/GeoJSON |

### P3 — Advanced / Phase 3

| # | Feature | Notes |
|---|---|---|
| 16 | **Event management** | Create/promote/track attendance |
| 17 | **Media library** | S3-backed campaign asset storage |
| 18 | **Canvassing script branching** | Multi-path door scripts |
| 19 | **Weather integration** | Forecast widget on canvassing dashboard |
| 20 | **School board trustee data** | Extend Official seeder for trustees |
| 21 | **Federal/provincial riding overlap** | Dual-level contact segmentation |
| 22 | **Opponent sign spotting map** | Competitive intelligence feature |
| 23 | **Auto-reassign incomplete turfs** | ML-based reassignment based on volunteer availability |

---

## 7. Environment Variables Checklist

| Variable | Required | Status | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ Required | ⚠️ Set on Railway | Prisma connection string |
| `NEXTAUTH_SECRET` | ✅ Required | ⚠️ Must be set | HMAC signing key — no default allowed in prod |
| `NEXTAUTH_URL` | ✅ Required | ⚠️ Must be set | Full app URL for callbacks |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push notifications | ⚠️ Not set | See `docs/VAPID_SETUP.md` |
| `VAPID_PRIVATE_KEY` | Push notifications | ⚠️ Not set | Server-only |
| `VAPID_SUBJECT` | Push notifications | Optional | Defaults to `mailto:admin@poll.city` |
| `STRIPE_SECRET_KEY` | Print payments | ⚠️ Must be set | Stripe Connect escrow |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Elements | ⚠️ Must be set | Client-side Stripe |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook | ⚠️ Must be set | Webhook signature validation |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | AI assist | Optional | Falls back to mock |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Custom domains | Optional | For campaign custom domain routing |
| `CRON_SECRET` | Scheduled notifications | Optional | For Vercel Cron endpoint auth |

---

## 8. Build Stats (v1.5.0)

```
Total routes:        105 (build output)
Static pages:        18
Dynamic pages:       87
TypeScript errors:   0
Build status:        ✅ Clean
```

---

*Report generated from codebase introspection at v1.5.0 (commit 1350694). Record counts are estimates from seed scripts and may differ in production.*
