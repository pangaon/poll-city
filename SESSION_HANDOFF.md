# Session Handoff — Poll City
## The Army of One Coordination File

**Last updated:** 2026-04-17
**Updated by:** Claude Sonnet 4.6 (session: Finance Sprint 2 — expenses receipt upload + vendors full edit)

> Every session reads this file. Every session updates it at the end.
> This is not optional. This is how one army stays coordinated.

---

## HOW TO USE THIS FILE

**At session start (takes 30 seconds):**
1. `git pull origin main`
2. Read WORK_QUEUE.md — task registry
3. Read this file — battlefield state and context
4. Claim your task in WORK_QUEUE.md before touching anything

**At session end:**
1. Push all code (build must be green first)
2. Update the "LAST SESSION" block below
3. Update "CURRENT PLATFORM STATE" if anything changed
4. Write the next session opener in "NEXT SESSION OPENER"
5. Commit and push this file

---

## LAST SESSION (2026-04-17 — Finance Sprint 2: expenses receipt upload + vendors full edit)

**What shipped — commit 2850704:**

### New infrastructure
- **`/api/finance/assets` (POST)** — receipt/invoice upload to Vercel Blob. JPG/PNG/WebP/PDF, 10MB max, magic-byte validation. Returns `{ id, fileUrl, fileName }`. Creates `FinanceAsset` record with `campaignId` scope.

### Expenses page (`expenses-client.tsx`) — major expansion
- **Receipt upload** — file picker in Add Expense modal; uploads to `/api/finance/assets` first, attaches `receiptAssetId` to expense creation. Receipt previewed as link on expense row.
- **`missingReceipt` auto-flag** — set `true` when expense > $500 submitted without a receipt.
- **Reject flow** — "Reject" button on pending expenses opens reason modal; POSTs to `/api/finance/expenses/:id/reject`.
- **Bulk CSV import** — "Import CSV" button; parses 5-column format (description, amount, date, payment_method, notes); shows preview table with validation errors; sequential POST loop.
- **Vendor dropdown** — vendor name field replaced with `vendorId` selector populated from `/api/finance/vendors`.
- **`missingReceipt` URL filter** — page reads `?missingReceipt=true` on mount; shows amber compliance badge in filter bar; filter toggle in UI.
- **GET include fix** — `receiptAsset` + `invoiceAsset` now included in expense list API response.

### Vendors page (`vendors-client.tsx`) — major expansion
- **Full edit** — pencil icon per card opens populated modal; PATCH `/api/finance/vendors/:id` on save.
- **Deactivate** — PATCH with `{ isActive: false }`; card goes grey with "Inactive" badge.
- **Extended fields** — `address`, `website`, `paymentTerms`, `taxNumber`, `notes`, `isPreferred` all editable.
- **W-9 badge** — amber badge appears on card when `taxNumber` is set.
- **Type + preferred filters** — vendor type dropdown + "Preferred only" amber toggle in filter bar.

### Sniff notes
- No new schema changes needed — `FinanceAsset` model already existed.
- Build: `npm run build` exits 0, `tsc --noEmit` exits 0.
- `VENDOR_FIELDS` const defined outside component (JSX `as const` syntax restriction).

---

## PREV LAST SESSION (2026-04-17 — Site-wide input intelligence: write assist, spellcheck, address autocomplete)

**What shipped — commit 8f8dd18:**

### New infrastructure
- **`/api/adoni/enhance`** — new Haiku-powered text enhancement endpoint. Context-aware prompts for `email-body`, `email-subject`, `sms`, `note`, `social-post`, `general`. Sanitized, rate-limited, graceful fallback if no Anthropic key.
- **`WriteAssistTextarea` component** (`src/components/ui/write-assist-textarea.tsx`) — drop-in replacement for any `<Textarea>` on writing fields. Shows ✨ Enhance button below the field; calls enhance API; supports single-step undo. Exported from `@/components/ui` for all future use.
- **Base `Textarea` now defaults `spellCheck={true}`** — every existing and future `<Textarea>` on the platform gets browser spellcheck automatically. No per-field changes needed.

### Write assist wired into
- Email compose body (`email-client.tsx`) + `spellCheck` on subject input
- SMS compose body (`sms-client.tsx`)
- Social post compose (`social-manager-client.tsx`)
- Contact edit notes (`contact-detail-client.tsx` line 326)
- Contact CRM note composer (`contact-detail-client.tsx` line 541)
- Log Interaction modal notes — switched from `register()` to `Controller` for proper react-hook-form integration

### Address autocomplete wired into
- Add Contact modal (`contacts-client.tsx`) — "Address search" field above address grid; selects auto-fills streetNumber, address1, city, province, postalCode via `setValue`

### Sniff notes
- No new DB models, no schema changes, no CONNECTIONS.md entries needed — purely UI/AI layer
- Build: `npm run build` exits 0, TypeScript clean (exit 0)
- **Untracked RCAE files present** (`src/app/api/reputation/`, `src/lib/reputation/`) — session that claimed RCAE built but didn't commit. That session should push its work.

---

## PREV LAST SESSION (2026-04-17 — Finance Sprint 2 gap close + build fixes)

**What shipped — commit 1901656:**

### Finance module — two known gaps closed
- **missingReceipt filter wired** — GET /api/finance/expenses now accepts `?missingReceipt=true` and passes `where: { missingReceipt: true }` to Prisma. Previously the param was silently ignored. The expenses page reads the URL param on mount and shows a dismissible amber "Missing receipt" badge in the filter bar when active.
- **Budget cap sub-label** — budget table footer now shows `of $X cap` under the planned total, coloured red when lines exceed the cap. Campaign manager can see at a glance whether lines are over-allocated.

### Pre-existing uncommitted work staged and committed
- `budget-command-client.tsx` — large refactor from a previous session (inline amount editing, lock/approve per line, approve-all button, delete with no-expenses guard, variance column, over-budget banner). Now committed for the first time.
- `finance-overview-client.tsx`, `budgets/route.ts`, `reports/overview/route.ts` — small polish changes from prior sessions, now committed.
- `prisma/schema.prisma`, `prisma/seed.ts` — schema and seed updates from prior sessions, now committed.
- `SESSION_HANDOFF.md`, `WORK_QUEUE.md`, `CONNECTIONS.md`, `GEORGE_TODO.md` — session docs that were uncommitted.

### Build fixes (pre-existing errors)
- Dead `flash_poll` branch removed from `/api/polls/[id]/respond/route.ts` — `PollType` enum has no `flash_poll` value; TypeScript correctly flagged the unreachable comparison.
- Build now passes clean from a full `rm -rf .next` + rebuild. Exit 0.

---

## PREV LAST SESSION (2026-04-17 — FuelOps: campaign food & vendor logistics)

**What shipped — commit 7e46815 (FuelOps) + 7b3945f (schema fix):**

### FuelOps — full enterprise module

**Schema additions** (7 new models + 3 enum extensions):
- `FoodVendor` — Ontario-wide vendor network (campaignId nullable = platform-wide)
- `FoodVendorPricingTier` — per-headcount pricing tiers with lead time
- `FoodVendorAgreement` — campaign-vendor partnership agreements
- `FoodRequest` — food/catering/beverage/volunteer meal requests
- `FoodQuote` — vendor quotes against requests
- `FoodOrder` — confirmed orders with delivery tracking
- `VendorOutreachLog` — outreach sequence tracking
- `FinanceBudgetLineCategory.food` + `FinanceVendorType.food_vendor` + `FinanceSourceType.fuel_order` added

**Core lib** (`src/lib/fuel/`):
- `ranking-engine.ts` — 6-component weighted scoring: price 30%, reliability 25%, lead time 15%, distance 10%, dietary fit 10%, partnership 10%
- `post-fuel-expense.ts` — auto-posts FinanceExpense on confirm/deliver, idempotent via `externalReference: "fuelorder:{id}"`, fallback budget line: food → events → volunteer_support
- `email-transport.ts` — production/stub adapter wrapping `src/lib/email.ts`
- `outreach-sequences.ts` — 3-step sequence builder (initial/follow_up_1/follow_up_2)

**API Routes** (9 routes under `/api/fuel`):
- Vendors: GET/POST list, GET/PATCH/DELETE detail, GET/POST pricing tiers, GET/POST agreements
- Requests: GET/POST list, GET/PATCH detail, GET/POST quotes, POST quote select (creates order)
- Orders: GET list, PATCH status pipeline
- Outreach: GET logs, POST send step or update status

**UI** (11 pages under `/fuel`):
- Dashboard: 4 stat cards, urgent requests (<48h), recent orders
- Vendors: searchable list with filters, add-vendor modal, full vendor detail with outreach panel
- Requests: status-filtered list, new request form with ranked vendor results, request detail with quote comparison
- Orders: status pipeline cards with advance/cancel
- Outreach CRM: pending alert banner, manual status updates

**Seed data:** 30 Ontario food vendors across 10 cities, `isSeeded: true`, deterministic IDs

**Tests:** 21 passing (13 ranking-engine + 6 outreach-sequences + 2 integration)

**Schema fix:** Removed orphaned RCAE back-relations from Campaign model (models never implemented).

---

## PREV LAST SESSION (2026-04-17 — Polls full stack)

**What shipped — commit d99a89c:**

### Polls — all 12 poll types now fully wired

**New vote components added to `poll-detail-client.tsx`:**
- `NpsVote` — 0–10 button grid, colour-zoned (Detractors red / Passives amber / Promoters green)
- `WordCloudVote` — add up to 3 words as chips, submits `words[]` array
- `EmojiReactVote` — emoji option grid, single-pick
- `PriorityRankVote` — drag-to-reorder, star badge on #1 priority
- `TimelineRadarVote` — per-dimension 0–10 sliders, submits `ratings[]`

**New results components:**
- `NpsResults` — large NPS score + promoters/passives/detractors with animated bars
- `WordCloudResults` — frequency-scaled word cloud + ranked list
- `EmojiReactResults` — emoji grid with progress bars + vote counts
- `TimelineRadarResults` — horizontal bar chart (avg/10) + dimension list
- `PriorityRankResults` — reuses `RankedResults` (identical data shape)

**Also confirmed:** `emoji_react` and `priority_rank` API handlers were already added by a parallel session (commit 27574b6). The public receipt verification page already existed at `/verify-vote`.

**Note for next session:** `flash_poll` was removed from PollType enum by another session — it is not a valid poll type. Dead code in the UI is harmless but can be cleaned up.

---

## PREV LAST SESSION (2026-04-17 — Candidate Intelligence Engine)

**What shipped:**

### Candidate Intelligence Engine (CIE) — full platform build

**Schema additions** (6 new models, DataSource extended):
- `CandidateLead` — raw unverified detections from any source
- `CandidateProfile` — verified canonical candidate records
- `NewsArticle` — dedicated news ingestion store (dedup by URL)
- `NewsSignal` — candidate announcement signals from articles
- `CandidateOutreachAttempt` — rich outreach tracking with cooldown logic
- `IntelSourceHealth` — per-source health check log
- `DataSource` extended with: `municipality`, `entityTypes`, `priorityTier`, `authorityScore`, `automationStatus`, `parserStrategy`, `crawlAllowed`, `rssUrl`, `candidateDetectionEnabled`

**Source Registry** (16 sources seeded via POST /api/intel/seed):
- Elections Canada, Elections Ontario (both `candidateDetectionEnabled: false` — endpoints TBD)
- Toronto Open Data (CKAN), City of Toronto News, Toronto City Council
- Brampton, Mississauga, Vaughan, Markham, Ottawa (all manual_import, endpoints TBD)
- OpenNorth Represent API, Statistics Canada boundaries
- CBC News RSS, Toronto Star RSS, NewsAPI.org, Government of Canada News

**Detection Engine** (`src/lib/intel/`):
- `phrases.ts` — configurable phrase families (strong/moderate/weak), office/jurisdiction patterns
- `detector.ts` — sentence-level candidate signal extraction
- `scorer.ts` — 0-100 confidence score (authority × type multiplier + phrase strength + entity presence + recency + corroboration)
- `resolver.ts` — Levenshtein fuzzy deduplication (85% threshold)
- `verifier.ts` — auto-verify ≥70 + all fields, pending 40-69, reject <40
- `enricher.ts` — crawl candidate website for email/phone/socials
- `outreach.ts` — eligibility check, record/mark-sent/mark-failed
- `news-pipeline.ts` — orchestrator: fetch → detect → score → resolve → persist
- `seed-sources.ts` — CIE source registry seed (16 sources)

**API Routes:**
- `GET/POST /api/intel/sources` — source registry CRUD
- `GET/POST /api/intel/leads` — candidate lead list + manual create
- `GET/PATCH /api/intel/leads/[id]` — lead detail + verify/reject/merge/flag
- `GET /api/intel/profiles` — verified candidate profiles
- `GET /api/intel/news` — articles + signals views
- `GET/POST /api/intel/outreach` — outreach tracking + initiate
- `GET /api/intel/health` — source health overview
- `POST /api/intel/seed` — seed CIE sources (SUPER_ADMIN only)
- `GET /api/cron/intel-ingest` — scheduled ingestion (CRON_SECRET protected)
- `GET /api/cron/intel-source-health` — HEAD-check all sources

**Command Center UI** (`/app/(app)/intel/`):
- 6 tabs: Live Feed, Candidates, Review Queue, Outreach, Sources, Health
- Review Queue: Verify / Flag / Reject actions with optimistic UI
- Health: 4-card status summary + per-source last-check table
- Seed Sources + Run Ingest buttons

**Tests:** 29 unit tests — scorer (8), phrases (14), verifier (7). All passing.

**What's stubbed (intentionally):**
- Outreach email send — eligibility + record created, actual Resend send call TBD
- Elections Canada/Ontario/municipal official endpoints — base URLs confirmed, specific endpoints not confirmed, `candidateDetectionEnabled: false`
- Social signal ingestion — architecture in place, adapter TBD when API keys available
- CandidateProfile → Official promotion — manual for now
- CIE alerts → ops command center — future phase

---

## PREV LAST SESSION (2026-04-17 — Finance Sprint 2 UI hardening)

**What shipped — commit 83ca093:**

### Finance — Sprint 2 DONE
- **Monthly spend chart** — recharts AreaChart on overview page. Monthly buckets from API `monthlyBurn`.
- **Recent expenses sidebar** — last 6 transactions with status badge + category + date. Fetched with overview.
- **Compliance status card** — on-track / attention / over-budget, derived from atRiskLines. No extra API call.
- **Interface bug fixed** — overview client was `categories: Record<>` but API returns `byCategory: Array<>`. Fixed.
- **Variance % column** — budget table now shows per-line variance % (red/amber/green). Footer included.
- **Over-budget banner** — red banner listing over-limit line names above budget table.
- **Quick-add expense modal** — from overview page directly, no navigation needed.
- **Railway SSL** — DATABASE_URL `?sslmode=require` added to `.env`. All Prisma commands work from bash.

---

## PREV LAST SESSION (2026-04-17 — /polls/[id]/live geographic breakdown + Sprint 1 cleanup)

**What shipped — commit edc3316:**

### /polls/[id]/live — Sprint 1 DONE
- **`/api/polls/[id]/demographics`** — new GET endpoint. Returns `byWard` (up to 12 wards, desc), `byRiding` (up to 12 ridings), and `trend` (30-day daily response buckets). Auth: public/unlisted polls open; campaign_only requires membership.
- **`demographics-panel.tsx`** — lazy-loaded client component. Fetches demographics on mount (no server-side wait). Shows ward breakdown (horizontal bar), riding breakdown (horizontal bar), response trend line chart. Hidden entirely if no geographic data exists (clean no-op for polls without ward/riding on responses).
- **`page.tsx`** — DemographicsPanel injected between LiveResultsStream and LivePageActions.

### /settings/brand — already built (WORK_QUEUE corrected)
- Audited brand page: `brand-client.tsx` (377 lines), `/api/campaigns/brand` PATCH route, `src/lib/brand/brand-kit.ts`, `/api/upload/logo` — all fully wired. WORK_QUEUE was outdated. Marked DONE without code changes.

**Sprint 1 is now fully complete.** All 9 items DONE.

---

## PREV LAST SESSION (2026-04-17 — Edge cases, UX gaps, compliance engine hardening)

**What shipped (all confirmed in HEAD):**

### Edge case fixes
- **Email/SMS blast skip count** — `POST /api/communications/audience` now returns `skipped` + `totalInSegment`. Email + SMS composers show amber warning when contacts in the selected segment have no email/phone. Previously silent skip.
- **Canvassing empty states** — turf list now says "draw a boundary on the map to create your first turf"; walk list empty state points to the New Walk List button.
- **Recurring failed plans** — failed plans now show Contact (mailto pre-written) + Cancel buttons. Previously no action was available for failed plans.
- **Receipts tab** — filter bar (All / Needs Attention / Sent / Voided), failed receipts show red badge + row highlight + "Retry Send" CTA. Previously failed receipts looked identical to pending.

### Compliance engine hardening — accountant/auditor experience
- **Auto-apply election-type rules on setup** — setup wizard completion now upserts `FundraisingComplianceConfig` with correct limits: federal=$1,675, provincial=$3,425, municipal=$1,200. Previously all campaigns defaulted to Ontario municipal regardless of type.
- **Legal framework banner** — compliance tab now shows applicable law (Canada Elections Act / Ontario Election Finances Act), contribution limit, anonymous cap, corporate/union status for the campaign's election type.
- **Fundraising page** now passes `electionType` + `jurisdiction` to client.

---

## PREV LAST SESSION (2026-04-17 — Platform isolation audit + George invisibility)

**What shipped — commit d27336f:**

### SUPER_ADMIN isolation — George is now invisible to campaign users
10-gap audit of the platform. All gaps closed. George's identity no longer surfaces in any campaign-facing view.

- **seed.ts** — all `admin.id` references in ActivityLog, Tasks, Interactions, FinanceExpenses reassigned to campaign team members. Only two Membership entries remain (required for demo login; both commented explaining why).
- **Team list** — `prisma.membership.findMany` in both `settings/team/page.tsx` and `api/team/route.ts` now filters `user: { role: { not: "SUPER_ADMIN" } }`. George never appears in team lists even if memberships exist.
- **Activity feed** — `api/activity/live-feed/route.ts` filters `visibleActivities` by excluding SUPER_ADMIN role. George's actions never appear in the war room dashboard feed.
- **Team UI** — `SUPER_ADMIN` removed from the `ROLES` array in `team-client.tsx`. Campaign managers can no longer see or assign the platform operator role.
- **Build fixes (pre-existing, now resolved):**
  - `CampaignType` in `dashboard-studio.tsx` — added `"nomination"` and `"leadership"` to the union
  - `import-pipeline.ts` — `ParseAndMapResult.mappedRows` interface updated to match actual `{ mapped, rawRow, idx }` structure
  - `stripe/subscription/route.ts` — `items` array cast moved to outer level to fix Stripe SDK discriminated union error
  - `next.config.js` — `workerThreads: false, cpus: 1` added to kill Windows NTFS race condition during build. **This is permanent — Vercel builds are now stable.**

**Vercel:** `d27336f` is green and Current.

---

## PREVIOUS SESSION (2026-04-16 — Security settings + Import hardening)

**What shipped — commits c5a4a51, ad628fb, b106236, 36a5414, 685f8c3:**

### /settings/security — DONE (Sprint 1 complete)
- **2FA (TOTP)** — QR code setup, backup codes (10 single-use), disable flow. `src/lib/auth/totp.ts`
- **WebAuthn / biometrics** — register + delete passkeys. `/api/auth/webauthn/register`
- **Active sessions** — list all devices with last-seen, revoke individual or all others. `/api/auth/sessions`
- **Login history** — last 20 events with IP + device + success/failure flag. `/api/auth/security-events`
- **API keys** — generate (shown once), revoke, list with last-used. `/api/auth/api-keys`
- **PIPEDA data export** — full JSON export of everything Prisma has on the user. `/api/auth/data-export`

### Import hardening — all 4 items done
- **Data Cleaning panel** (transforms) — collapsible Step 2 panel in Smart Import Wizard. Auto-clean toggles (trim, upper, title case, phone/postal format), split rules, merge-column rules, find-replace rules, before/after live preview. Pipeline in `src/lib/import/import-pipeline.ts`.
- **Download failed rows as CSV** — `/api/import/failed-rows?importLogId=&campaignId=` returns attachment CSV with row_number + error + all raw columns. Import history table now shows count + download icon.
- **Merge strategy enforcement** — previously a UI choice that was silently ignored. All 4 modes now enforced in `src/lib/import/background-processor.ts`: `skip` (no write), `update` (overwrite), `update_empty` (fill nulls only), `create_all` (always insert).
- **Merge conflict preview** — Step 3 of wizard shows up to 10 field-by-field diffs between incoming row and existing contact, with amber badges for changed fields and green values for what will be updated.

### Pre-existing Stripe SDK v22 type fixes
- `subscription/route.ts` — `product_data` inline cast → `as unknown as Stripe.SubscriptionCreateParams["items"]`
- `stripe/webhook/route.ts` — `SubWithPeriod` cast → `as unknown as SubWithPeriod`

**The session before this (2026-04-16 — /eday full build):**
Commit `3cd4b3f` — /eday role-aware command center (CM: Command/Strike-Off/Rides/Polls tabs) + scrutineer OCR.

---

## CURRENT PLATFORM STATE (as of 2026-04-16)

### What is live and working

| Module | Status | Key commit |
|---|---|---|
| Auth (email/password) | ✓ LIVE | — |
| Dashboard (all 8 data fields) | ✓ LIVE | — |
| CRM (contacts, households, duplicates) | ✓ LIVE | 730833e |
| Field Ops — full 16-chunk build | ✓ LIVE | d8e7314 |
| GOTV (gap, mark-voted, rides, priority list) | ✓ LIVE | — |
| Finance Suite (budget→audit, 9 tabs) | ✓ LIVE | 0a8d74b |
| Fundraising Suite (Phases 1-7 + public donate pages) | ✓ LIVE | db33dc0 |
| Communications (email, SMS, social, inbox, analytics) | ✓ LIVE | 5a13f4c |
| /notifications (push composer, subscribers, stats) | ✓ LIVE | 5a13f4c |
| Print (enterprise rebuild, 15 templates, packs, inventory) | ✓ LIVE | 0a8d74b |
| Calendar (full 4-view UI, APIs, candidate schedule) | ✓ LIVE | b5170f0 |
| /eday — CM command center + scrutineer OCR | ✓ LIVE | 3cd4b3f |
| /eday/hq — election night results | ✓ LIVE | 8d96160 |
| /billing — Stripe integration | ✓ LIVE | 13965bc |
| /settings — profile, campaign, integrations, danger zone | ✓ LIVE | 6eae5e2 |
| /settings/security — 2FA, WebAuthn, sessions, API keys, PIPEDA export | ✓ LIVE | c5a4a51 |
| Import hardening — transforms, failed-rows CSV, merge strategy, conflict preview | ✓ LIVE | c5a4a51 |
| /briefing — daily AI briefing | ✓ LIVE | c110dc2 |
| /ai-assist — Adoni in-app page | ✓ LIVE | 108e504 |
| Demo + guided tour | ✓ LIVE | 7494b12 |
| /coalitions | ✓ LIVE | 7ee982f |

### Sprint 1 — ALL DONE ✓

| Route | Status |
|---|---|
| `/settings/security` | ✓ DONE — 2FA, WebAuthn, sessions, API keys, PIPEDA export |
| `/settings/brand` | ✓ DONE — colour picker, logo upload, font selector, live preview, party presets |
| `/eday` | ✓ DONE — CM command center + scrutineer OCR |
| `/polls/[id]/live` | ✓ DONE — SSE stream, geographic breakdown (ward/riding), trend chart, share controls |

### George's manual actions outstanding (full list in GEORGE_TODO.md)

Critical blockers:
- Items 2-3: Stripe keys to Railway
- Items 10-16: Resend email setup
- Item 22: `ANTHROPIC_API_KEY` to Railway (Adoni is dead without this in prod)
- Items 49-50: Railway backups + PWA install

---

## NEXT SESSION OPENER

**Copy this verbatim into the next session:**

```
Finance Sprint 2 DONE (2026-04-17) — commit 2850704. Build is green.

What's live in finance:
- /finance/expenses — receipt upload (Vercel Blob), reject flow, bulk CSV import, vendor dropdown, missingReceipt auto-flag
- /finance/vendors — full edit modal, deactivate, W-9 badge, preferred filter, type filter
- /api/finance/assets — new receipt/invoice upload endpoint (magic-byte validated, campaignId scoped)
- /finance/purchase-requests — full approval chain DONE (commit e900943)
- /finance/budget — full inline editing, lock/approve, cap sub-label, variance column
- /finance/reimbursements — CLAIMED 2026-04-17 (in progress by another session)

Next recommended tasks (in priority order):
1. /finance/reimbursements — CLAIMED — continue or claim if abandoned (bank info, approval chain, batch)
2. /finance/approvals — bulk approve/reject, delegation, escalation rules, audit trail
3. /finance/reports — spend by category, period comparison, export CSV/PDF
4. Communications Phase 7 — Automation Engine (triggers, steps, enrollment cron)

KNOWN: reputation module files untracked (`src/app/api/reputation/`, `src/lib/reputation/`) — another session built but didn't commit. Do not git add blindly.

Read WORK_QUEUE.md. Pick one unclaimed task, claim it, run npm run build before pushing.
```

---

## DEPENDENCY MAP — what blocks what

Build these in order:
1. `/settings/security` — standalone, no blockers
2. `/settings/brand` — standalone, no blockers
3. `/polls/[id]/live` — standalone, no blockers
4. `Comms Phase 7` (automation engine) — needs Phase 6 done ✓
5. `Calendar Phase 6` (Google/Outlook OAuth) — needs George to set up credentials
6. `Migration baseline` (GAP-003) — run before first real customer, CRITICAL

Safe to build in any order (no dependencies):
- Any Sprint 2 Finance UI hardening items
- Any Sprint 3 Field sub-module items
- Any Sprint 4 Print/Forms items

---

## ARMY OF ONE — SESSION DISCIPLINE

We are one army running as multiple sessions. The rules:

1. **One task at a time per session.** Claim in WORK_QUEUE.md before starting. Push the claim commit immediately.
2. **Build passes before push.** `npm run build` exits 0. No exceptions. No "I'll fix it next session."
3. **End of session: update this file.** The next session is reading it cold. Treat it like a war room brief.
4. **Never assume another session's work is done.** Check WORK_QUEUE.md. If it says CLAIMED, leave it.
5. **George's manual actions go in GEORGE_TODO.md.** Not in chat. Not in this file. In that file.
6. **If you're the current running session** reading this mid-session: your job is to finish what you claimed, update this file, and close cleanly.

---

## KNOWN RISKS (carry until resolved)

| Risk | Severity | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` not in Railway | HIGH | Adoni returns 500 in prod — George must add it |
| No Resend config | HIGH | All emails fail silently in prod |
| No Stripe keys in Railway | HIGH | Donations/billing broken in prod |
| Migration baseline (GAP-003) not run | CRITICAL | Must run before first real customer |
| No Redis (rate limiting) | MEDIUM | Rate limits disabled — stub passes through |

---

*Updated end-of-session every time. If this file is stale: the session that shipped last forgot to update it. Check git log for the latest commit.*
