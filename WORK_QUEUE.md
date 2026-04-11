# Poll City — Work Queue
## Session Coordination File

**Every AI session MUST read this file before touching any code.**
**Every AI session MUST claim a task before starting it.**
**Every AI session MUST mark tasks done when finished.**

This is the single source of truth for what is built, what is in progress, and what needs to be done.
No session may start a task already marked CLAIMED or DONE.

---

## HOW TO USE THIS FILE

### At session start (mandatory):
1. `git pull origin main` — get the latest state
2. Read this entire file
3. Pick ONE unclaimed task that matches your scope
4. Edit this file: change `PENDING` to `CLAIMED [YYYY-MM-DD]`
5. Commit immediately: `git commit -m "chore: claim [task name]"` + `git push`
6. Build the thing
7. `npm run build` must exit 0 before marking done
8. Edit this file: change `CLAIMED` to `DONE — commit [hash]`
9. Commit: `git commit -m "chore: mark [task name] done"` + `git push`

### If two sessions conflict on the same task:
- The one whose claim commit landed on `origin/main` first wins
- The other session must `git pull` and pick a different task

---

## STATUS KEY

| Status | Meaning |
|---|---|
| `DONE` | Built, TypeScript-clean, pushed. Do not touch. |
| `CLAIMED [date]` | Another session is actively working this. Pick something else. |
| `PENDING` | Ready to start. Claim it before beginning. |
| `BLOCKED` | Cannot start — depends on something not yet done. |

---

## MODULE: FIELD OPS

| Task | Status | Notes |
|---|---|---|
| Chunk 1 — Assignment detail page | DONE — 3ba6328 | |
| Chunk 2 — Print Walk List Phase 1 | DONE — 1bcf0ad | |
| Chunk 3 — Field Ops / Canvassing unification | DONE — 55f00c3 | |
| Chunk 4 — Unified Command Centre | DONE — e130ea7 | |
| Chunk 5 — Seed expansion (voter file simulation) | DONE — 03e6f6a | |
| Chunk 6 — Field Domain Model schema + planning docs | DONE — 350a392 | |
| Field Programs API + UI | DONE — 730833e | /api/field/programs, /field/programs |
| Field Routes API + UI | DONE — 730833e | /api/field/routes, /field/routes |
| Chunk 7 — Turf + Geography + Route Planning (APIs + UI full) | DONE — dca20be | /field/turf, /api/field/turf, nearest-neighbor optimizer |
| Chunk 8 — Canvassing Runs + Scripts + Outcomes | DONE — a4435be | /field/runs UI, /api/field/shifts+scripts+attempts+follow-ups |
| Chunk 9 — Literature Drop Operations | CLAIMED 2026-04-11 | |
| Chunk 10 — Sign Ops inside Field | CLAIMED 2026-04-11 | |
| Chunk 11 — Volunteer + Team + Shift Execution | PENDING | |
| Chunk 12 — Inventory + Print + Materials Packaging | PENDING | Connects GAP-011 |
| Chunk 13 — Mobile + Offline + Paper Fallback | PENDING | |
| Chunk 14 — Follow-Up Logic + GOTV + Cross-System Automations | PENDING | |
| Chunk 15 — AI Assist (Adoni) + Hardening + Audit | PENDING | |

---

## MODULE: FUNDRAISING SUITE

| Task | Status | Notes |
|---|---|---|
| Phase 1 — Full domain model (14 enums, 10 models) | DONE — d0a9c81 | FundraisingCampaign, DonorProfile, Pledge, Refund, Receipt, etc |
| Phase 2 — Core donation APIs (donations, donors, receipts, refunds, recurring, pledges) | DONE — d0a9c81 | All CRUD + compliance evaluation |
| Phase 3 — Fundraising Command Center UI | DONE — d0a9c81 | /fundraising tabbed UI, 9 tabs |
| Compliance engine (evaluateCompliance, refreshDonorProfile) | DONE — d0a9c81 | src/lib/fundraising/compliance.ts |
| Phase 4 — Stripe integration | PENDING | PaymentIntent, webhooks, Stripe Billing recurring |
| Phase 5 — Full compliance wiring (configurable limits per campaign) | CLAIMED 2026-04-11 | Partially done; per-campaign config UI needed |
| Phase 6 — Reports + CSV export + Adoni fundraising tools | CLAIMED 2026-04-11 | |
| Phase 7 — Comms integration (receipt email, donor segments, automation triggers) | PENDING | |
| Donation pages (public-facing) | PENDING | /api/fundraising/pages not built |

---

## MODULE: COMMUNICATIONS PLATFORM

| Task | Status | Notes |
|---|---|---|
| Email blast | DONE | /api/communications/email |
| SMS blast | DONE | /api/communications/sms |
| Audience sizing | DONE | /api/communications/audience |
| Social schema + social manager UI | DONE | SocialAccount, SocialPost, SocialMention |
| Voice broadcast schema | DONE | VoiceBroadcast, VoiceBroadcastCall |
| Newsletter schema | DONE | NewsletterSubscriber, NewsletterCampaign |
| Saved Segments API | DONE — 730833e | /api/comms/segments + count endpoint |
| Saved Segment model (SavedSegment) | DONE — 730833e | In schema.prisma |
| Phase 1 — Message Templates | CLAIMED 2026-04-11 | MessageTemplate model + API + UI |
| Phase 2 — Segment builder UI + Audiences tab | PENDING | Component: segment-builder.tsx |
| Phase 3 — Scheduled messages + cron | DONE — 57b4177 | ScheduledMessage model, /api/comms/scheduled, /api/cron/send-scheduled |
| Phase 4 — Delivery tracking webhooks (Resend bounce, Twilio STOP) | PENDING | GAP-017 |
| Phase 5 — Unified Inbox (backend + rebuild UI) | PENDING | InboxThread, InboxMessage models |
| Phase 6 — Analytics (delivery funnel, attribution) | PENDING | |
| Phase 7 — Automation Engine (triggers, steps, enrollment cron) | PENDING | |
| Phase 8 — Social Publishing (real API calls to Facebook/X/LinkedIn) | PENDING | |
| Phase 9 — Consent Management (CASL engine) | PENDING | |
| Phase 10 — Fatigue Guard | PENDING | |

---

## MODULE: FINANCE SUITE

| Task | Status | Notes |
|---|---|---|
| Phase 1 — Domain model (13 enums, 11 models) | DONE | CampaignBudget, FinanceExpense, Vendor, etc |
| Phase 2 — Budget builder API + UI | DONE | /finance/budget |
| Phase 3 — Expense capture | DONE | /finance/expenses |
| Phase 4 — Procurement (vendors, purchase requests, purchase orders) | DONE | |
| Phase 5 — Reimbursements + approval queue | DONE | |
| Print → Finance expense bridge | DONE — 730833e | src/lib/finance/post-print-expense.ts |
| Phase 6 — Reports + variance analysis | DONE — 0a8d74b | /finance/reports |
| Phase 6 — CSV export | DONE — 0a8d74b | /api/finance/exports/expenses |
| Phase 6 — Finance ↔ Fundraising reconciliation | CLAIMED 2026-04-11 | GAP-005 |
| Phase 6 — Audit trail UI | DONE — 0a8d74b | /finance/audit |
| Phase 7 — AI assist | CLAIMED 2026-04-11 | |
| Phase 8 — Hardening + permissions | PENDING | |

---

## MODULE: CALENDAR SUITE

| Task | Status | Notes |
|---|---|---|
| Full calendar domain model (13 models + Phase 3 enums) | DONE — 730833e + 73f9017 | schema.prisma — includes CandidateAppearance, CalendarSyncAccount, CalendarSyncLog |
| calendar-client.tsx UI (4-view command centre) | DONE — 0bf659f | month/week/agenda/dashboard views |
| Phase 1+2 — Calendar item CRUD + assignment + conflict + reminder APIs | DONE — 730833e | /api/campaign-calendar/items, /assignments, /conflicts, /reminders, /calendars |
| Phase 3 — Candidate schedule view + appearances API | DONE — b5170f0 | /calendar/candidate, /api/campaign-calendar/appearances, /candidate-schedule |
| Phase 3 — Calendar sync stub (connect + trigger) | DONE — b5170f0 | /api/campaign-calendar/sync — stub only, no real OAuth |
| Calendar demo seed (Ward 20, 37 items, 12 appearances) | DONE — 9981bc4 | npm run db:seed:calendar |
| **REQUIRED: npx prisma db push** | DONE — George confirmed | Run against Railway to activate all calendar models in prod |
| Phase 4 — Cross-system wiring (events, comms, print, field) | CLAIMED 2026-04-11 | GAP-006, GAP-007, GAP-008 |
| Phase 5 — Reminders + notifications cron | PENDING | |
| Phase 6 — Google/Outlook real OAuth sync | PENDING | GAP-024 |

---

## MODULE: CRM HARDENING

| Task | Status | Notes |
|---|---|---|
| Duplicate detection API | DONE — d0a9c81 | /api/crm/duplicates |
| Duplicate Review UI | DONE — 730833e | /contacts/duplicates |
| Household CRM APIs | DONE — 730833e | /api/crm/households (CRUD + members) |
| guardCampaignRoute migration (145 routes) | CLAIMED 2026-04-11 | GAP-010 — replace requirePermission |
| sanitizeUserText on remaining fields | CLAIMED 2026-04-11 | GAP-015 — event/social/print/volunteer/budget notes |
| Contact → funnel advance on donation | PENDING | GAP — lastContactedAt + funnelStage not updated |
| ActivityLog on donation create | PENDING | Missing audit trail |

---

## MODULE: PRINT

| Task | Status | Notes |
|---|---|---|
| Print Walk List (full enrichment, print bug fix) | DONE | |
| Print Packs (API + UI) | DONE | /api/print/packs, /print/packs |
| Print Inventory (API + UI) | DONE | /api/print/inventory, /print/inventory |
| Print → Finance auto-post on order | DONE — 730833e | post-print-expense.ts |
| Print Design Engine Phase 2 | DONE | Canvas editor, template thumbnails, asset upload — see commit |
| **Print Enterprise Rebuild** | DONE — 0a8d74b | 15 responsive templates (vw/vh/clamp), print dashboard API, design-client refresh |
| Print order → CalendarItem wiring | PENDING | GAP-008 |

---

## MODULE: PLATFORM HARDENING

| Task | Status | Notes |
|---|---|---|
| guardCampaignRoute utility | DONE | src/lib/auth/helpers.ts |
| Adoni — 24 tools, multilingual, injection defense | DONE | |
| Dashboard — all 8 data fields wired | DONE | |
| GOTV — shared metrics truth layer | DONE | |
| Election Night — membership guards | DONE | |
| **145 legacy requirePermission → guardCampaignRoute** | CLAIMED 2026-04-11 | GAP-010. Canvassing, analytics, finance, volunteers, comms, events, tasks, signs |
| sanitizeUserText on event/social/print/volunteer/budget notes | CLAIMED 2026-04-11 | GAP-015 |
| Adoni: per-tool rate limit | PENDING | |
| Migration baseline before first real customer | PENDING — CRITICAL | GAP-003 — run `npx prisma migrate dev --name initial_baseline` |

---

## GEORGE'S MANUAL ACTIONS NEEDED (do these yourself)

These cannot be done by AI sessions:

| Action | Priority | Why |
|---|---|---|
| `npx prisma db push` against Railway | **CRITICAL** | Calendar models + ScheduledMessage + ScheduledMessageStatus enum + NotificationLog.sendKey — comms scheduling + calendar UI both 500 until this runs |
| `npm run db:seed:calendar` (against Railway) | High | Populates Ward 20 beta demo data — 37 items, 12 appearances, 2 calendars |
| Confirm Stripe keys in Railway env vars | Medium | Phase 4 fundraising needs STRIPE_SECRET_KEY |

---

*Last updated: 2026-04-11 (Chunk 8 a4435be + Comms Phase 3 57b4177 live on Vercel) by Claude Sonnet 4.6*
*This file is the truth. Code and git are the proof. This file is the map.*
