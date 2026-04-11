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
| Chunk 9 — Literature Drop Operations | DONE — c7f9f51 | /field/lit-drops, /api/field/lit-drops |
| Chunk 10 — Sign Ops inside Field | DONE — 0188808 | /api/field/signs, /field-ops/signs UI |
| Chunk 11 — Volunteer + Team + Shift Execution | DONE — c7f9f51 | /field/teams, /api/field/teams, check-in flow |
| Chunk 12 — Inventory + Print + Materials Packaging | DONE — c7f9f51 | /field/materials, /api/field/materials, GAP-011 |
| Chunk 13 — Mobile + Offline + Paper Fallback | DONE — c7f9f51 | /field/mobile, /api/field/paper-export |
| Chunk 14 — Follow-Up Logic + GOTV + Cross-System Automations | DONE — c7f9f51 | /field/follow-ups, /api/field/gotv-targets |
| Chunk 15 — AI Assist (Adoni) + Hardening + Audit | DONE — c7f9f51 | Adoni field tools, /field/audit |
| Chunk 16 — Field Ops enrichment: stop completion, route detail, program detail | DONE — d8e7314 | Turf stop visited rollup, /field/routes/[routeId], /field/programs/[programId] |

---

## MODULE: FUNDRAISING SUITE

| Task | Status | Notes |
|---|---|---|
| Phase 1 — Full domain model (14 enums, 10 models) | DONE — d0a9c81 | FundraisingCampaign, DonorProfile, Pledge, Refund, Receipt, etc |
| Phase 2 — Core donation APIs (donations, donors, receipts, refunds, recurring, pledges) | DONE — d0a9c81 | All CRUD + compliance evaluation |
| Phase 3 — Fundraising Command Center UI | DONE — d0a9c81 | /fundraising tabbed UI, 9 tabs |
| Compliance engine (evaluateCompliance, refreshDonorProfile) | DONE — d0a9c81 | src/lib/fundraising/compliance.ts |
| Phase 4 — Stripe integration | DONE — 021a61095aac3100e12f773b6a455983a9fd8039 | /api/fundraising/stripe/payment-intent, /subscription, /webhook — PaymentIntent + Stripe Billing recurring + 6-event webhook handler |
| Phase 5 — Full compliance wiring (configurable limits per campaign) | DONE — d71673f | /api/fundraising/compliance-config + Limits UI tab |
| Phase 6 — Reports + CSV export + Adoni fundraising tools | DONE — d71673f | /api/fundraising/reports + Reports UI tab + CSV export |
| Phase 7 — Comms integration (receipt email, donor segments, automation triggers) | DONE — 7e05da5 | receipt email (Stripe webhook + manual), CRM funnel advance to donor, ActivityLog, "Donors" SavedSegment auto-create |
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
| Phase 1 — Message Templates | DONE — 57b4177 | MessageTemplate model + API + UI |
| Phase 2 — Segment builder UI + Audiences tab | DONE — 730833e | AudiencesTab in communications-client.tsx — full segment builder inline |
| Phase 3 — Scheduled messages + cron | DONE — 57b4177 | ScheduledMessage model, /api/comms/scheduled, /api/cron/send-scheduled |
| Phase 4 — Delivery tracking webhooks (Resend bounce, Twilio STOP) | PENDING | GAP-017 |
| Phase 4b — Email open + click tracking (tracking pixel) | PENDING | 1x1 GIF pixel route + click redirect route + NotificationLog openedCount/clickCount fields + EmailTrackingEvent model — embed pixel in every email blast |
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
| Phase 6 — Finance ↔ Fundraising reconciliation | DONE — 0188808 | GAP-005; /api/finance/reconciliation |
| Phase 6 — Audit trail UI | DONE — 0a8d74b | /finance/audit |
| Phase 7 — AI assist | DONE — 64d5dcc | get_finance_summary + get_budget_alerts (budget:read) |
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
| Phase 4 — Cross-system wiring (events, comms, print, field) | DONE — 0188808 | GAP-006, GAP-007, GAP-008 |
| Phase 5 — Reminders + notifications cron | DONE — c7f9f51 | /api/cron/calendar-reminders + /api/campaign-calendar/items/[itemId]/reminders CRUD |
| Phase 6 — Google/Outlook real OAuth sync | PENDING | GAP-024 |

---

## MODULE: CRM HARDENING

| Task | Status | Notes |
|---|---|---|
| Duplicate detection API | DONE — d0a9c81 | /api/crm/duplicates |
| Duplicate Review UI | DONE — 730833e | /contacts/duplicates |
| Household CRM APIs | DONE — 730833e | /api/crm/households (CRUD + members) |
| guardCampaignRoute migration (145 routes) | DONE — 0188808 | GAP-010 — 91 routes migrated in batch |
| sanitizeUserText on remaining fields | DONE — 0188808 | GAP-015 — event/social/print/volunteer/budget notes |
| Contact → funnel advance on donation | DONE — 7e05da5 | funnelStage → donor if ≤ volunteer; lastContactedAt updated |
| ActivityLog on donation create | DONE — 7e05da5 | audit() writes to ActivityLog on donation.create |

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
| Print order → CalendarItem wiring | DONE — 0188808 | GAP-008 |

---

## MODULE: PLATFORM HARDENING

| Task | Status | Notes |
|---|---|---|
| guardCampaignRoute utility | DONE | src/lib/auth/helpers.ts |
| Adoni — 24 tools, multilingual, injection defense | DONE | |
| Dashboard — all 8 data fields wired | DONE | |
| GOTV — shared metrics truth layer | DONE | |
| Election Night — membership guards | DONE | |
| **145 legacy requirePermission → guardCampaignRoute** | DONE — 0188808 | GAP-010. Canvassing, analytics, finance, volunteers, comms, events, tasks, signs |
| sanitizeUserText on event/social/print/volunteer/budget notes | DONE — 0188808 | GAP-015 |
| Adoni: per-tool rate limit | PENDING | |
| Migration baseline before first real customer | PENDING — CRITICAL | GAP-003 — run `npx prisma migrate dev --name initial_baseline` |

---

## GEORGE'S MANUAL ACTIONS NEEDED

**Full checklist lives in `GEORGE_TODO.md` in the repo root.**
AI sessions add new steps there. George checks them off.

Quick summary of open items (see GEORGE_TODO.md for step-by-step instructions):

| # | Action | Priority |
|---|---|---|
| ~~1~~ | ~~`npx prisma db push` against Railway~~ | ✅ DONE 2026-04-11 |
| 2-3 | Add Stripe secret + publishable keys to Railway | High |
| 4-5 | Register fundraising webhook in Stripe Dashboard + add signing secret | High |
| 6-9 | Platform billing Stripe webhook + Price IDs | Medium |
| 10-16 | Resend setup (domain verify + API key + env vars) | High |
| 17-21 | Twilio setup (SMS) | Medium |
| 22 | `ANTHROPIC_API_KEY` to Railway (Adoni) | High |
| 23-30 | Security salts + `DATABASE_ENCRYPTION_KEY` + `HEALTH_CHECK_SECRET` | High |
| 31-34 | Upstash Redis (rate limiting) | Medium |
| 35-36 | VAPID keys (push notifications) | Low |
| 37-38 | Cloudflare Turnstile (spam protection) | Low |
| 39-43 | Debug suite + `GEORGE_USER_ID` | Medium |
| 44-46 | DB seeding (calendar, Ward 20 voters, help articles) | Medium |
| 47-48 | Google OAuth credentials | Low |
| 49-50 | Infrastructure: Railway backups + PWA install | High |
| 51-52 | Strategic: Anthropic ZDR + private intelligence repo | Medium |

---

*Last updated: 2026-04-11 (GEORGE_TODO.md consolidated — 52 items, all manual actions unified from docs/GEORGE-ACTION-LIST.md) by Claude Sonnet 4.6*
*This file is the truth. Code and git are the proof. This file is the map.*
