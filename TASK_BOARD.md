# Task Board

Last updated: 2026-04-10
*Architecture references: SYSTEM_MAP.md | INTEGRATION_GAPS.md | CONNECTIONS.md | GEORGE_REPORT.md*

## P0 - Done
- [x] Create shared action engine foundation and expose execution endpoint.
- [x] Create shared task/assignment backbone and wire critical task creation paths.
- [x] Create shared GOTV metrics truth layer and wire summary/gap/priority-list.
- [x] Create drill-through mapping pattern and expose on key GOTV metrics.
- [x] Fix strike-off contract mismatch (`contactId` vs `name`).
- [x] Adoni: all 24 tools execute real DB operations. draft_email + draft_social_post verified.

## P1 - Done
- [x] Migrate /api/gotv/tiers + /command + /precinct-race to shared metrics-truth.
- [x] Export `MAX_CONTACT_SCAN` and `WIN_THRESHOLD_RATIO` from shared constants.
- [x] Adoni: multilingual support (14 languages, Canada-focused).
- [x] Adoni: Unicode-normalized prompt injection detection + DAN/roleplay/LLM-format patterns.
- [x] Adoni: indirect injection sanitization — `sanitizeForAI()` applied to all tool results.
- [x] Adoni: cross-session suspicious activity (last 24h DB history, not just current conversation).
- [x] Adoni: permission obfuscation — system prompt no longer reveals exact permission strings.
- [x] Adoni: full system prompt no longer stored in logs (role + length only).
- [x] Dashboard: all 8 empty data fields wired to real APIs (activity, canvassers, turfs, walk lists, call stats, donation chart, priority call list).
- [x] Security: election-night + timeline membership guards.
- [x] Security: guardCampaignRoute() utility — replaces legacy requirePermission + membership.findUnique.
- [x] Security: write-time sanitization (sanitizeUserText) on interaction notes, debrief, intelligence, donations.
- [x] Security: draft_social_post silent fallback removed. Activity log added.
- [x] GOTV: all hardcoded 0.35 win thresholds replaced with shared calculateWinThreshold.

## P2 - Next
- [ ] Migrate remaining ~145 legacy requirePermission routes to guardCampaignRoute (canvassing, analytics, finance, volunteers, communications, events, tasks, signs). Use the guardCampaignRoute pattern — one call replaces two-step pattern.
- [ ] Write-time sanitization: apply sanitizeUserText to remaining free-text fields (event notes, social post content, print job notes, volunteer notes, budget notes).
- [ ] Adoni: per-tool rate limit (separate from per-request 50/hr limit).
- [ ] Field Ops dashboard enrichment: auto-assign turf completion % from real stop data when turf stop model is populated.
- [ ] Finance: add auto-receipt email on Stripe donation, thank-you task, donor tag.
- [ ] Analytics mode: drill-through to contacts from charts.

## Known risks
- 145 remaining legacy requirePermission routes need migration. Low risk (most have membership checks) but violates enterprise RBAC principle.
- sanitizeUserText not yet applied to: event notes, social mentions, print notes, budget notes, volunteer notes.

---

# COMMUNICATIONS PLATFORM TASK BOARD — 2026-04-10

*Architecture: SYSTEM_ARCHITECTURE.md | Schema: DATA_SCHEMA.sql | APIs: API_ROUTES.md | UI: UI_FLOWS.md | Risks: EDGE_CASES.md*

## What's already built
- [x] Email blast (POST /api/communications/email — Resend, CASL footer, personalization)
- [x] SMS blast (POST /api/communications/sms — Twilio, opt-out suffix)
- [x] Audience sizing (POST /api/communications/audience — count + sample)
- [x] Social schema (SocialAccount, SocialPost, SocialMention models)
- [x] Social manager UI (social-manager-client.tsx — 853 lines)
- [x] Voice broadcast schema (VoiceBroadcast, VoiceBroadcastCall, CRTC compliance fields)
- [x] Newsletter schema (NewsletterSubscriber, NewsletterCampaign)
- [x] Phone bank schema (PhoneBankSession)
- [x] Inbox UI stub (inbox-client.tsx — needs backend wiring)
- [x] Communications hub (communications-client.tsx — 2501 lines, 11 tabs)

## Phase 1 — Templates
- [ ] Prisma: `MessageTemplate` model (channel, name, subject, bodyHtml, bodyText, tokensUsed, deletedAt)
- [ ] Prisma migrate: `npx prisma migrate dev --name comms_message_templates --skip-seed`
- [ ] API: GET/POST /api/comms/templates
- [ ] API: GET/PUT/DELETE /api/comms/templates/[templateId]
- [ ] UI: Templates tab in communications-client.tsx
- [ ] Component: src/components/comms/template-editor.tsx (token picker, rich text, SMS char counter)

## Phase 2 — Saved Segments
- [ ] Prisma: `SavedSegment` model (filterDefinition JSONB, isDynamic, lastCount)
- [ ] Prisma migrate: `npx prisma migrate dev --name comms_saved_segments --skip-seed`
- [ ] API: GET/POST /api/comms/segments + count endpoint
- [ ] API: PUT/DELETE /api/comms/segments/[segmentId]
- [ ] Component: src/components/comms/segment-builder.tsx (replaces inline audience filters in Compose)
- [ ] UI: Audiences tab — segment library with live counts

## Phase 3 — Scheduled Messages + Idempotency
- [ ] Prisma: `ScheduledMessage` model (channel, segmentId, sendAt, timezone, status, atomic lock)
- [ ] Prisma migrate: `npx prisma migrate dev --name comms_scheduled_messages --skip-seed`
- [ ] API: GET/POST /api/comms/scheduled + PUT/DELETE
- [ ] Cron: GET /api/cron/send-scheduled (5min, atomic status lock, audience re-resolved at send time)
- [ ] Add sendKey idempotency to existing email + SMS blast endpoints (EDGE_CASES.md E-001)
- [ ] Fix: return 400 (not silent 200) when Resend not configured (E-007)
- [ ] Fix: return 400 (not silent 200) when Twilio not configured (E-008)
- [ ] UI: Scheduled tab — list with edit/cancel

## Phase 4 — Delivery Tracking Webhooks
- [ ] Prisma: `MessageDeliveryEvent` model
- [ ] Prisma migrate: `npx prisma migrate dev --name comms_delivery_events --skip-seed`
- [ ] Webhook: POST /api/webhooks/resend (svix signature, dedup by external_event_id)
- [ ] On bounce → contact.emailBounced = true + ConsentRecord
- [ ] On unsubscribe → contact.doNotContact = true + ConsentRecord (fix existing PARTIAL)
- [ ] SMS STOP webhook → contact.smsOptOut = true + ConsentRecord
- [ ] Add to vercel.json: resend webhook route

## Phase 5 — Unified Inbox (Backend)
- [ ] Prisma: `InboxThread` + `InboxMessage` models
- [ ] Prisma migrate: `npx prisma migrate dev --name comms_unified_inbox --skip-seed`
- [ ] API: GET /api/comms/inbox (paginated threads)
- [ ] API: GET /api/comms/inbox/[threadId] (messages + mark read)
- [ ] API: POST /api/comms/inbox/[threadId]/reply (send via channel)
- [ ] API: PATCH /api/comms/inbox/[threadId] (assign, tag, resolve, priority)
- [ ] API: GET /api/comms/inbox/stats (unread counts for nav badge)
- [ ] Wire Twilio inbound SMS → InboxThread + InboxMessage + contact update
- [ ] Rebuild inbox-client.tsx — split panel, real backend, quick reply templates
- [ ] Component: src/components/comms/inbox-thread.tsx

## Phase 6 — Analytics
- [ ] API: GET /api/comms/analytics (summary + by-channel + by-date + attribution)
- [ ] API: GET /api/comms/analytics/[messageId] (per-message drill-down)
- [ ] Cron: GET /api/cron/delivery-attribution (hourly, 72h conversion window)
- [ ] Component: src/components/comms/analytics-funnel.tsx
- [ ] UI: Analytics tab — delivery funnel, message table, drill-through

## Phase 7 — Automation Engine
- [ ] Prisma: `Automation` + `AutomationStep` + `AutomationEnrollment` models
- [ ] Prisma migrate: `npx prisma migrate dev --name comms_automation_engine --skip-seed`
- [ ] API: GET/POST /api/comms/automations + activate/deactivate/enrollments
- [ ] Cron: GET /api/cron/automation-runner (5min, step execution with fatigue guard)
- [ ] Trigger hooks: contact.supportLevel changes, funnel advances, tag adds, form submissions, donations
- [ ] Edge case guards: deleted template (E-024), deleted contact (E-025), loop guard E-026, election date E-027
- [ ] Component: src/components/comms/automation-builder.tsx (drag-and-drop steps)
- [ ] UI: Automations tab — list, status indicators, enrollment counts

## Phase 8 — Social Publishing (Real API Calls)
- [ ] Prisma: `SocialPublishJob` + `MediaLibraryItem` models
- [ ] Prisma migrate: `npx prisma migrate dev --name comms_social_publish --skip-seed`
- [ ] API: POST /api/comms/social/publish (queue job per account)
- [ ] Facebook/Instagram Graph API publisher
- [ ] X API v2 publisher
- [ ] LinkedIn API publisher
- [ ] Approval workflow: pending_approval → approved → publish
- [ ] Token expiry detection + alerts (E-018)
- [ ] Exponential backoff on rate limits (E-019)
- [ ] Per-platform char limit enforcement in Compose UI (E-022)
- [ ] Media library: upload + browse

## Phase 9 — Consent Management (CASL Engine)
- [ ] Prisma: `ConsentRecord` model (append-only audit log)
- [ ] Prisma migrate: `npx prisma migrate dev --name comms_consent_records --skip-seed`
- [ ] API: GET/POST /api/comms/consent + audit export
- [ ] Wire form submissions → ConsentRecord
- [ ] Consent conflict resolution: explicit opt-in wins over DNC (E-030)
- [ ] Soft opt-in expiry check — 3-year CASL rule (E-028)
- [ ] CASL compliance section in Settings tab

## Phase 10 — Fatigue Guard
- [ ] Prisma: `ContactMessageFrequency` model
- [ ] Prisma migrate: `npx prisma migrate dev --name comms_fatigue_guard --skip-seed`
- [ ] Update frequency counter on every send
- [ ] Check frequency before send: configurable per-campaign limits
- [ ] Settings UI: fatigue limits (max N emails / SMS per 7 days per contact)

## Cross-Phase Fixes (from CONNECTIONS.md)
- [ ] Email unsubscribe → contact.doNotContact not always set (⚠ PARTIAL → ✓)
- [ ] Newsletter unsubscribe → ActivityLog entry missing (✗ → ✓)
- [ ] SMS failed delivery → not flagged on contact (✗ → ✓)
- [ ] Phone number normalization to E.164 at import

---

# FINANCE SUITE TASK BOARD — 2026-04-10

## Phase 1 — Financial Domain Model
- [x] CampaignBudget, BudgetLine, FinanceVendor, FinanceExpense models
- [x] FinancePurchaseRequest, FinancePurchaseOrder, FinanceVendorBill
- [x] FinanceReimbursement, BudgetTransfer, FinanceAuditLog, FinanceAsset
- [x] All new enums (13 total)
- [x] User + Campaign model relations updated
- [x] Migration: finance_domain_model

## Phase 2 — Budget Builder
- [x] POST/GET /api/finance/budgets
- [x] POST/GET /api/finance/budget-lines
- [x] Budget Command Center UI

## Phase 3 — Expense Capture
- [x] POST/GET/PATCH /api/finance/expenses
- [x] Approve/reject/submit actions
- [x] Expense quick-add UI (desktop + mobile)

## Phase 4 — Procurement
- [x] Vendors CRUD
- [x] Purchase requests with approval workflow
- [x] Purchase orders

## Phase 5 — Reimbursements + Approvals
- [x] Reimbursements CRUD + approval flow
- [x] Unified approval queue UI

## Phase 6-10 — Pending
- [ ] Print/sign/event integration
- [ ] Reporting + variance
- [ ] CSV import/export
- [ ] AI assist
- [ ] Hardening + permissions

## Finance UI Surfaces
- [x] /finance — overview dashboard
- [x] /finance/budget — budget management
- [x] /finance/expenses — expense list
- [x] /finance/vendors — vendor registry
- [x] /finance/purchase-requests — PR workflow
- [x] /finance/reimbursements — reimbursements
- [x] /finance/approvals — approval queue
- [ ] /finance/reports — reporting
- [ ] /finance/imports — import/export
- [ ] /finance/audit — audit trail

---

# FUNDRAISING SUITE TASK BOARD — 2026-04-10

*Architecture: SYSTEM_ARCHITECTURE.md | Schema: DATA_SCHEMA.sql | APIs: API_ROUTES.md | UI: UI_FLOWS.md | Risks: EDGE_CASES.md*
*Compliance: COMPLIANCE_RULES.md | Permissions: PERMISSIONS_MATRIX.md*

## Phase 1 — Donation Domain Model
- [ ] New enums: FundraisingCampaignStatus, DonationType, DonationPaymentMethod, DonorStatus, DonorTier, ReceiptStatus, DonationComplianceStatus, DonationSourceType, DonationPageStatus, RecurrenceFrequency, RecurrenceStatus, PledgeStatus, RefundStatus, ReconciliationStatus
- [ ] Expand Donation model: donationType, feeAmount, netAmount, currency, donationDate, receiptStatus, complianceStatus, isRecurring, fundraisingCampaignId, eventId, sourceId, pageId, paymentIntentId, externalTransactionId, recurrencePlanId, refundedAmount, metadataJson, approvedByUserId
- [ ] New model: FundraisingCampaign
- [ ] New model: DonorProfile
- [ ] New model: DonationSource
- [ ] New model: DonationPage
- [ ] New model: RecurrencePlan
- [ ] New model: Pledge
- [ ] New model: Refund
- [ ] New model: DonationReceipt
- [ ] New model: PaymentReconciliation
- [ ] New model: DonorAuditLog
- [ ] Update Campaign + User model relations
- [ ] Migration: fundraising_domain_model

## Phase 2 — Donation Intake + Core APIs
- [ ] POST /api/fundraising/donations — create donation (online + offline)
- [ ] GET /api/fundraising/donations — list with filters + pagination
- [ ] GET /api/fundraising/donations/[donationId] — single donation detail
- [ ] PATCH /api/fundraising/donations/[donationId] — update status/notes
- [ ] DELETE /api/fundraising/donations/[donationId] — soft delete
- [ ] POST /api/fundraising/campaigns — create fundraising campaign
- [ ] GET /api/fundraising/campaigns — list
- [ ] GET /api/fundraising/campaigns/[fcId] — detail + stats
- [ ] PATCH /api/fundraising/campaigns/[fcId] — update
- [ ] POST /api/fundraising/sources — CRUD donation sources
- [ ] GET /api/fundraising/sources
- [ ] POST /api/fundraising/pages — CRUD donation pages
- [ ] GET /api/fundraising/pages
- [ ] GET /api/fundraising/pages/[pageId]
- [ ] POST /api/fundraising/donors — upsert donor profile
- [ ] GET /api/fundraising/donors — list with search
- [ ] GET /api/fundraising/donors/[donorId] — full profile + history
- [ ] POST /api/fundraising/pledges — create pledge
- [ ] GET /api/fundraising/pledges — list
- [ ] PATCH /api/fundraising/pledges/[pledgeId] — update/fulfil
- [ ] POST /api/fundraising/recurring — create recurrence plan
- [ ] GET /api/fundraising/recurring — list plans
- [ ] PATCH /api/fundraising/recurring/[planId] — update/pause/cancel
- [ ] POST /api/fundraising/refunds — initiate refund
- [ ] GET /api/fundraising/refunds — list
- [ ] PATCH /api/fundraising/refunds/[refundId] — approve/reject
- [ ] POST /api/fundraising/receipts/generate — generate receipt
- [ ] POST /api/fundraising/receipts/[receiptId]/resend — resend receipt
- [ ] GET /api/fundraising/receipts — list
- [ ] POST /api/fundraising/reconciliation — reconcile batch
- [ ] GET /api/fundraising/reconciliation — list
- [ ] GET /api/fundraising/stats — summary dashboard stats
- [ ] POST /api/webhooks/stripe — Stripe payment + subscription webhooks

## Phase 3 — Unified Fundraising Command Center UI
- [ ] /fundraising — overview dashboard with KPI widgets
- [ ] /fundraising/donations — full donation ledger
- [ ] /fundraising/donors — donor CRM list + profiles
- [ ] /fundraising/campaigns — fundraising initiative list
- [ ] /fundraising/pages — donation page builder
- [ ] /fundraising/events — event-linked fundraising
- [ ] /fundraising/recurring — recurring plan manager
- [ ] /fundraising/pledges — pledge tracker
- [ ] /fundraising/receipts — receipt queue
- [ ] /fundraising/refunds — refund management
- [ ] /fundraising/reconciliation — reconciliation workspace
- [ ] /fundraising/reports — analytics + attribution
- [ ] /fundraising/compliance — compliance review queue
- [ ] fundraising-client.tsx — unified client (tabbed)
- [ ] Drawer: DonorDetailDrawer — full donor profile side panel
- [ ] Drawer: DonationDetailDrawer — donation detail + actions
- [ ] Drawer: AddDonationDrawer — quick-add form (online + offline)
- [ ] Widget: KPI summary bar (raised, net, recurring MRR, donor count)
- [ ] Widget: Fundraising progress thermometer per initiative

## Phase 4 — Stripe Integration + Receipts
- [ ] Stripe Payment Intent creation (POST /api/fundraising/stripe/intent)
- [ ] Stripe Checkout Session for donation pages
- [ ] Stripe webhook handler (payment_intent.succeeded, charge.refunded, etc.)
- [ ] Recurring subscription via Stripe Billing
- [ ] Receipt PDF generation (or HTML email)
- [ ] Receipt auto-send on successful payment
- [ ] Thank-you automation trigger on first donation

## Phase 5 — Compliance Engine
- [ ] Configurable contribution limits per campaign (Ontario municipal defaults)
- [ ] Per-donor annual aggregation check
- [ ] Corporate/union ineligibility detection
- [ ] Over-limit review queue
- [ ] Anonymous donation cap enforcement
- [ ] Compliance status auto-set on donation creation

## Phase 6 — Reports + AI Assist
- [ ] GET /api/fundraising/reports — revenue by period/source/event
- [ ] Export: CSV donation ledger
- [ ] Dashboard widgets wired to real data
- [ ] Adoni: fundraising summary + ask-amount suggestion

## What's already built
- [x] Donation model (thin — pledged/processed/receipted/cancelled/refunded)
- [x] GET/PATCH /api/donations — basic list + status update
- [x] donations-client.tsx — basic ledger with compliance flags
- [x] POST /api/donations/quick-capture — canvasser quick capture
- [x] /api/donations/receipt — receipt number generation stub

## Fundraising UI Surfaces
- [ ] /fundraising — command center
- [ ] /fundraising/donations — ledger
- [ ] /fundraising/donors — donor CRM
- [ ] /fundraising/campaigns — initiatives
- [ ] /fundraising/pages — page builder
- [ ] /fundraising/recurring — recurring plans
- [ ] /fundraising/pledges — pledges
- [ ] /fundraising/receipts — receipt queue
- [ ] /fundraising/refunds — refunds
- [ ] /fundraising/reconciliation — reconciliation
- [ ] /fundraising/reports — reports
- [ ] /fundraising/compliance — compliance review

---

# CALENDAR SUITE TASK BOARD — 2026-04-10

*Schema: prisma/schema.prisma (Calendar models added) | Reference: prisma/calendar_schema_additions.prisma*
*GAP-002: db push required to sync calendar schema to DB*
*GAP-006: Calendar ↔ Communications (send dates) | GAP-007: Calendar ↔ Events | GAP-008: Calendar ↔ Print*

## What's already built
- [x] Full Calendar domain model in schema.prisma (Calendar, CalendarItem, CalendarItemAssignment, CalendarItemResource, AvailabilityBlock, CalendarReminder, CalendarDependency, ScheduleConflict, ChecklistTemplate, CalendarItemChecklist, CalendarAuditLog)
- [x] 8 CalendarType enums, 35 CalendarItemType enums, conflict detection models
- [x] calendar-client.tsx updated (UI exists)

## Phase 1 — Core APIs (next)
- [ ] Run `npx prisma db push` to sync schema (REQUIRED before any API work)
- [ ] GET/POST /api/campaign-calendar/calendars
- [ ] GET/POST /api/campaign-calendar/items
- [ ] GET/PUT/DELETE /api/campaign-calendar/items/[itemId]
- [ ] POST /api/campaign-calendar/items/[itemId]/assign
- [ ] POST /api/campaign-calendar/items/[itemId]/resource
- [ ] GET /api/campaign-calendar/conflicts (detect + list)
- [ ] GET /api/campaign-calendar/availability

## Phase 2 — Calendar UI (full)
- [ ] Monthly/weekly/daily views in calendar-client.tsx
- [ ] Drag-and-drop reschedule
- [ ] Item type filtering (show only candidate / field / comms / print items)
- [ ] CalendarItem detail drawer
- [ ] Conflict badge + resolution UI
- [ ] Availability blocking UI

## Phase 3 — Cross-System Wiring (Integration)
- [ ] Event created → CalendarItem (type=campaign_event, eventId linked) [GAP-007]
- [ ] ScheduledMessage created → CalendarItem (type=email_blast_item / sms_blast_item) [GAP-006]
- [ ] Print order confirmed → CalendarItem (type=print_deadline) [GAP-008]
- [ ] Inventory delivery → CalendarItem (type=delivery_window) [GAP-008]
- [ ] Field shift created → CalendarItem (type=canvassing_run / sign_install_item) [Field Ops Phase 6]

## Phase 4 — Reminders + Notifications
- [ ] Cron: /api/cron/calendar-reminders (every 5min, check pending CalendarReminder records)
- [ ] Send via email/SMS/push per CalendarReminder.deliveryChannel
- [ ] Mark reminder sent/failed

## Phase 5 — Google/Outlook Sync (future)
- [ ] Google Calendar API OAuth
- [ ] Microsoft Graph OAuth
- [ ] Bidirectional sync for candidate CalendarItems

---

# FIELD OPS MEGA-BUILD — CHUNK SEQUENCE

*Full spec: memory/project_field_ops_directive.md | Chunk history: memory/project_chunk_sequence.md*

## Completed Chunks
- [x] Chunk 1 — Assignment detail page (3ba6328)
- [x] Chunk 2 — Print Walk List Phase 1 (1bcf0ad)
- [x] Chunk 3 — Field Ops / Canvassing unification (1b9cff3, 55f00c3)
- [x] Chunk 4 — Unified Command Centre (e130ea7)
- [x] Chunk 5 — Seed expansion: voter file simulation (03e6f6a)

## Upcoming Chunks
- [x] **Chunk 6** — Phase 1: Field Domain Model schema + all planning docs ✓ 2026-04-10
- [ ] **Chunk 7** — Phase 2: Turf + Geography + Route Planning (APIs + UI)
- [ ] **Chunk 8** — Phase 3: Canvassing Runs + Scripts + Outcomes (APIs + UI)
- [ ] **Chunk 9** — Phase 4: Literature Drop Operations (APIs + UI)
- [ ] **Chunk 10** — Phase 5: Sign Ops inside Field (APIs + UI)
- [ ] **Chunk 11** — Phase 6: Volunteer + Team + Shift Execution (APIs + UI)
- [ ] **Chunk 12** — Phase 7: Inventory + Print + Materials Packaging [connects to GAP-011]
- [ ] **Chunk 13** — Phase 8: Mobile + Offline + Paper Fallback + Fast Re-Entry
- [ ] **Chunk 14** — Phase 9: Follow-Up Logic + GOTV + Cross-System Automations
- [ ] **Chunk 15** — Phase 10: AI Assist (Adoni) + Hardening + Audit

---

# PLATFORM HARDENING — ONGOING

## P2 Queue (next major pass)
- [ ] Migrate remaining 145 legacy `requirePermission` routes to `guardCampaignRoute` [GAP-010]
- [ ] Apply `sanitizeUserText` to: event notes, social post content, print job notes, volunteer notes, budget notes [GAP-015]
- [ ] Adoni: per-tool rate limit (separate from per-request 50/hr)
- [ ] Finance Phase 6: wire print/sign/event costs to FinanceExpense [GAP-004]
- [ ] Finance Phase 6: Finance ↔ Fundraising reconciliation bridge [GAP-005]
- [ ] Comms Phase 4: delivery tracking webhooks (bounce → DNC, SMS STOP → smsOptOut) [GAP-017]
- [ ] Migration baseline: `npx prisma migrate dev --name initial_baseline` before first production customer [GAP-003]
