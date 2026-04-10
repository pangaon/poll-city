# Integration Gaps

> Every gap where systems exist but are NOT properly connected.
> Priority-ordered. Honest about status. Updated every session.
>
> **Last updated:** 2026-04-10 — Initial creation from full platform audit
> **Updated by:** Claude Sonnet 4.6

---

## PRIORITY LEGEND

| P | Meaning |
|---|---------|
| P0 | Blocks a campaign from running properly today |
| P1 | Material gap — campaigns lose real value without this |
| P2 | Enrichment — makes the platform genuinely enterprise |
| P3 | Future power feature — not urgent, but architecturally important |

---

## P0 — BLOCKS REAL OPERATIONS

### GAP-001: Fundraising schema not in database
- **What:** `src/app/api/fundraising/*` API routes exist. `src/lib/fundraising/` exists. But `prisma/schema.prisma` does NOT yet contain the Fundraising domain models (FundraisingCampaign, DonorProfile, DonationPage, RecurrencePlan, Pledge, Refund, DonationReceipt, etc.)
- **Risk:** All fundraising API routes will fail at runtime — Prisma will throw "Model not found" errors.
- **Fix:** Complete TASK_BOARD Fundraising Phase 1 — add all models to schema.prisma and run `npx prisma db push`
- **Blocks:** Every fundraising API endpoint currently live in the codebase

### GAP-002: Calendar schema in schema.prisma but db push not confirmed
- **What:** `prisma/schema.prisma` is modified to include Calendar models. No `prisma/migrations/` directory exists to verify state. `prisma db push` may or may not have been run.
- **Risk:** calendar-client.tsx and `/api/campaign-calendar/*` will fail at runtime if db push hasn't been run.
- **Fix:** Run `npx prisma db push` to sync schema to DB
- **Blocks:** Calendar module

### GAP-003: No migration baseline before production
- **What:** `prisma/migrations/` directory does not exist. Project uses `db push` only.
- **Risk:** Cannot do safe zero-downtime production schema changes. A broken db push on production corrupts live data with no rollback.
- **Fix:** Run `npx prisma migrate dev --name initial_baseline` before first production customer.
- **Blocks:** Production readiness

---

## P1 — MATERIAL VALUE GAPS

### GAP-004: Finance ↔ Print / Signs / Events not connected
- **What:** Finance Suite (Phases 1-5) tracks expenses, budgets, vendors, purchase requests. Print orders, sign installs, and events all have costs — but none of these create FinanceExpense records.
- **Risk:** Campaign manager has a finance module that shows blank spending while real money is being spent on signs, print, events.
- **Fix:** Finance Phase 6 — wire print orders, sign jobs, and event costs to FinanceExpense at creation
- **Missing connections:**
  - Print order created → FinanceExpense (status=committed)
  - Sign install job → FinanceExpense (labour + materials)
  - Event created → FinanceExpense (venue/catering)

### GAP-005: Fundraising ↔ Finance — no bridge
- **What:** Donations come in via Fundraising. The Finance budget shows "raised vs. limit" as a separate widget. These two systems do not share a reconciliation layer.
- **Risk:** Campaign finance officer has to reconcile two systems manually.
- **Fix:** When FundraisingCampaign totals update → write a read-only FinanceSummary line to the budget (revenue side). Reconciliation should be a single report.

### GAP-006: Calendar ↔ Communications — send dates not visible
- **What:** Email blasts, SMS blasts, and social posts are scheduled in the Communications module. The Calendar module has `CalendarItemType.email_blast_item`, `sms_blast_item`, `social_post_item` — but scheduled messages do NOT auto-create CalendarItems.
- **Risk:** Campaign manager's calendar is missing all comms activity. Blackout dates and send conflicts are invisible.
- **Fix:** When a ScheduledMessage is created → create a CalendarItem of matching type. On cancel → update CalendarItem status to cancelled.

### GAP-007: Calendar ↔ Events — events not in calendar
- **What:** Events (RSVP system) are a separate module. Calendar has `campaign_event` item type. Events do NOT auto-create CalendarItems.
- **Risk:** Two separate places to see the campaign schedule. Conflicts not caught.
- **Fix:** When an Event is created → create a CalendarItem (type=campaign_event, linked via eventId). When Event updated/cancelled → update CalendarItem.

### GAP-008: Calendar ↔ Print/Inventory — deadlines not in calendar
- **What:** Print orders have delivery windows. Inventory has fulfillment dates. Calendar has `print_deadline` and `delivery_window` item types — but nothing auto-creates these.
- **Risk:** Print deadlines missed because they're not visible in campaign scheduling.
- **Fix:** When a print order is confirmed → create a CalendarItem (type=print_deadline). When delivery confirmed → type=delivery_window.

### GAP-009: Field Ops domain model not built
- **What:** The Field Ops mega-build (10-phase directive) defines core entities: TURF, ROUTE, FIELD_TARGET, FIELD_SHIFT, SCRIPT_TEMPLATE, FIELD_ATTEMPT, FOLLOW_UP_ACTION, etc. These are NOT in schema.prisma.
- **Risk:** The unified field execution system — the platform's most operationally critical surface for October 2026 — has no data model.
- **Fix:** Chunk 6 of the build sequence — complete Field Domain Model schema
- **Context:** George's full spec in memory: `project_field_ops_directive.md`

### GAP-010: 145 API routes still use legacy requirePermission pattern
- **What:** `guardCampaignRoute()` was built and used on new routes. 145 older routes in canvassing, analytics, finance, volunteers, communications, events, tasks, signs still use the two-step `requirePermission + membership.findUnique` pattern.
- **Risk:** Inconsistent RBAC enforcement. Enterprise RBAC principle violated.
- **Fix:** TASK_BOARD P2 — migrate remaining routes to guardCampaignRoute

### GAP-011: Print Inventory ↔ Field Ops — not connected
- **What:** Print inventory module exists (`/api/print/inventory`, `/print/inventory`). Field Ops mega-build Phase 7 requires materials issued to shifts to be traceable. These two systems are not connected.
- **Risk:** When Field Ops Phase 7 is built, inventory tracking will need to be retrofitted rather than designed in.
- **Fix:** When building Field Ops Phase 7, ensure InventoryItem records and issuance events reference the same print/inventory models already in place.

---

## P2 — ENRICHMENT GAPS

### GAP-012: Contact support level change → funnel stage not advancing
- **What:** CONNECTIONS.md: `Contact.supportLevel updated → Funnel stage advances: ✗ NOT CONNECTED`
- **Fix:** On supportLevel change via API → check funnel threshold, auto-advance funnelStage

### GAP-013: ActivityLog for doNotContact not written
- **What:** CONNECTIONS.md: `Mark Do Not Contact → ActivityLog entry: ✗ NOT CONNECTED`
- **Fix:** One-line audit write in the DNC handler

### GAP-014: Contact lastContactedAt not set on CSV import
- **What:** CONNECTIONS.md: `Import Contacts → lastContactedAt: ✗ NOT CONNECTED`
- **Fix:** Set `lastContactedAt` to the import date when importing contacts with interaction history

### GAP-015: sanitizeUserText not applied to all free-text fields
- **What:** Applied to: interaction notes, debrief, intelligence, donation notes. Missing: event notes, social post content, print job notes, volunteer notes, budget notes.
- **Fix:** TASK_BOARD P2 — apply sanitizeUserText to remaining free-text fields

### GAP-016: Brand Kit not applied to outputs
- **What:** Brand Kit settings (colours, logo, fonts) are saved but not applied to email templates, SMS footers, print materials, or social post previews.
- **Risk:** Campaign comms don't look consistent. Brand kit feature has no visible effect.
- **Fix:** Phase after Communications hardening — wire brandKit.primaryColor/logo/fontPrimary into email templates, print templates, social post previews

### GAP-017: Comms delivery webhooks not wired
- **What:** TASK_BOARD Phase 4 — Resend bounce/complaint webhooks, SMS STOP webhook. On bounce → contact.emailBounced = true. On SMS STOP → contact.smsOptOut = true. Currently partial (unsubscribe page exists but webhook-triggered DNC is incomplete).
- **Fix:** TASK_BOARD Comms Phase 4

### GAP-018: Canvass outcome → auto-tag + comms follow-up not wired
- **What:** GEORGE_REPORT: Door-knock logging = 🟠. Auto-tag based on result and trigger comms follow-up not built.
- **Fix:** Field Ops Phase 9 — follow-up logic and cross-system automations

### GAP-019: GOTV priority list → auto-assign to phone bank not wired
- **What:** GEORGE_REPORT: Priority list = 🟠. "Auto-assign to phone bank, connect to comms for auto-dial" not built.
- **Fix:** GOTV enrichment pass — part of Field Ops Phase 9

### GAP-020: Turf management UI missing
- **What:** Turf data model exists. UI for polygon drawing and assignment not built. GEORGE_REPORT: Turf management = 🔴.
- **Fix:** Field Ops Phase 2 (Chunk 7) — turf + geography + route planning UI

---

## P3 — FUTURE ARCHITECTURE GAPS

### GAP-021: Social publishing OAuth not wired
- **What:** SocialPost, SocialAccount models exist. Publish queue designed. No actual Facebook/Instagram/X/LinkedIn OAuth or API calls.
- **Fix:** TASK_BOARD Comms Phase 8 — social publishing

### GAP-022: Voice broadcast Twilio Voice not wired
- **What:** VoiceBroadcast, VoiceBroadcastCall schema ready. No Twilio Voice API integration.
- **Fix:** After SMS is hardened — voice broadcast API integration

### GAP-023: apps/packages monorepo split not executed
- **What:** `apps/` and `packages/` directories have README stubs only. All code is in `src/`.
- **Risk:** Docs describe an architecture that doesn't match reality. Confusion for new developers.
- **Fix:** When George wants separate deploys per product. Not before. Update README stubs to note "planned, not yet migrated."

### GAP-024: Google/Outlook calendar sync not built
- **What:** GEORGE_REPORT: Google/Outlook sync = 🔴. OAuth integration not done.
- **Fix:** After Calendar suite APIs are fully built — Google Calendar API + Microsoft Graph OAuth

### GAP-025: Voter file import UI not built
- **What:** Voter file = source of truth for polls, boundaries, households. Import spec in memory. No upload UI or parser.
- **Fix:** Separate build after Field Ops Phase 1 is done

---

## CROSS-CUTTING RISKS

### RISK-001: db push only — no migration safety net
See GAP-003. Production deployment risk.

### RISK-002: Finance and Fundraising are conceptually adjacent but architecturally separate
Finance Suite = budget, expenses, procurement, reimbursements (outgoing money)
Fundraising Suite = donations, donors, receipts, compliance (incoming money)
These must reconcile at the reporting layer. No reconciliation bridge exists yet.
Address in Finance Phase 6 / Fundraising Phase 6.

### RISK-003: Calendar suite uses `prisma/calendar_schema_additions.prisma` as a reference doc
This file is untracked (git) and is NOT the source of truth — the models are in schema.prisma.
The reference file should either be committed as documentation or deleted to avoid confusion.

---

*Updated by: Claude Sonnet 4.6 | 2026-04-10*
