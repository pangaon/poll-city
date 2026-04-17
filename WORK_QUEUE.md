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
| Donation pages (public-facing) | DONE — db33dc0 | /donate/[campaignSlug] public page + /api/donate/[campaignSlug]/intent + funnel advance to donor |

---

## MODULE: POLLING — FULL STACK

| Task | Status | Notes |
|---|---|---|
| Polls full stack — missing types, results, verify page | DONE — d99a89c | NPS/WordCloud/EmojiReact/PriorityRank/TimelineRadar vote+results UI; emoji_react/priority_rank API handlers (also landed via another session); /verify-vote page already existed |

---

## MODULE: FUELOPS — CAMPAIGN FOOD & VENDOR LOGISTICS

| Task | Status | Notes |
|---|---|---|
| FuelOps — full module build (schema, API, UI, seed, tests) | DONE — 7e46815 | 7 models, 10 pages, ranking engine, expense bridge, outreach CRM, 21 tests |

---

## MODULE: CANDIDATE INTELLIGENCE ENGINE (CIE)

| Task | Status | Notes |
|---|---|---|
| CIE — full platform build (schema, ingestion, detection, scoring, review, enrichment, outreach, admin UI, seed, tests) | DONE — see commit | 6 new models, 16 source registry entries, /api/intel/*, /api/cron/intel-*, /app/(app)/intel/ 6-tab command center, 29 unit tests |

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
| Phase 4 — Delivery tracking webhooks (Resend bounce, Twilio STOP) | DONE — see below | GAP-017 — /api/webhooks/resend (bounce+complaint+open+click) + /api/webhooks/twilio (STOP/START) |
| Phase 4b — Email open + click tracking (tracking pixel) | DONE — db33dc0 | 1x1 GIF pixel route + click redirect route + NotificationLog openedCount/clickCount fields + EmailTrackingEvent model — pixel embedded in every email blast |
| Phase 5 — Unified Inbox (backend + rebuild UI) | DONE — 3be7d35 | InboxThread, InboxMessage, /api/inbox, two-panel UI, Twilio + Resend webhook wiring |
| Phase 6 — Analytics (delivery funnel, attribution) | DONE — see this session | /api/communications/analytics (funnel+trend+per-blast), AnalyticsTab in communications-client.tsx |
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
| Phase 8 — Hardening + permissions | DONE — 83ca093 | Spend chart, variance %, recent txns, compliance card, quick-add modal |

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

---

## MODULE: STRIPE HARDENING (audit gaps — April 16 2026)

| Task | Status | Notes |
|---|---|---|
| Build fix — CampaignType missing "leadership" | DONE — 36a5414 | dashboard-studio.tsx:120 |
| GAP-1+2 — Print job pre-confirmed as paid + no webhook | DONE — 36a5414 | status="awarded" on intent create; payment_intent.succeeded/failed handlers added to platform webhook |
| GAP-3+4 — subscription.updated missing + hardcoded 30-day period | DONE — 36a5414 | customer.subscription.updated handler added; period dates use Stripe's actual values |
| GAP-5 — Cross-campaign donor customer sharing | DONE — 36a5414 | Code comment + architectural note added; by-design for Connect destination charges |
| GAP-6 — Orphan Stripe products/prices on abandoned flows | DONE — 36a5414 | Replaced products.create+prices.create with inline price_data (product_data inline, double-cast) |
| GAP-7 — Duplicated Stripe client instantiation in 4 files | DONE — 36a5414 | All 4 files now import { stripe } from @/lib/stripe/connect |

---

## MODULE: FIGMA UI MATCHING (new — April 16, 2026)

George has a Figma Make prototype at https://valley-revise-45442235.figma.site that is the design reference for the entire campaign staff app. The goal is to rebuild the Next.js UI to match it exactly.

**Context:** The Figma Make project is a separate Vite/react-router project on George's machine. MASTER_CLAUDE.md in the repo root is the bridge document. Detailed per-screen specs live in the Figma Make project at `src/imports/pasted_text/` (3 files: poll-city-design-spec.md, poll-city-command-center.md, poll-city-field-ops.md). Those files are NOT yet in this repo.

**Session opener for the next session that picks this up:**
"Read MASTER_CLAUDE.md and docs/FIGMA_SPEC_HANDOFF.md first. George wants the Next.js campaign app UI rebuilt to match the Figma Make prototype at https://valley-revise-45442235.figma.site. Check if George has added the 3 spec files to docs/ (poll-city-design-spec.md, poll-city-command-center.md, poll-city-field-ops.md). If yes — start building from those specs, one screen at a time, beginning with Dashboard. If no — build from MASTER_CLAUDE.md §17 build queue order: (1) Fundraising Command Centre 9-tab, (2) Finance/Budget Suite, (3) GOTV Module, (4) Election Night Dashboard, (5) Adoni global drawer, (6) Contact Profile deep view. Run npm run build before every push."

| Task | Status | Notes |
|---|---|---|
| Import Figma spec files into docs/ | PENDING — George action | George must copy 3 files from Figma Make project — see GEORGE_TODO.md item 58 |
| Set NEXT_PUBLIC_FIGMA_APP_URL in Vercel | PENDING — George action | See GEORGE_TODO.md item 57 — activates /pcapp prototype viewer |
| Rebuild Dashboard to match Figma | BLOCKED | Waiting on spec files OR start from MASTER_CLAUDE.md |
| Rebuild Contacts/CRM to match Figma | BLOCKED | Waiting on spec files |
| Rebuild Field Ops / Canvassing to match Figma | BLOCKED | Waiting on spec files |
| Field Ops full end-state Figma design brief | DONE — 2026-04-16 | docs/FIELD_OPS_FIGMA_PROMPT.md — 13 tabs, full vision, all modules, GOTV, 6 deliverables spec'd |

---

## MODULE: DEMO + MARKETING

| Task | Status | Notes |
|---|---|---|
| Demo public access + guided tour | DONE — 7494b12 | Open /demo/candidate+party+media to public (no token required), build DemoTour overlay, wire into candidate demo |
| /pcapp — Figma prototype viewer page | DONE — c394f70 | Full-screen iframe, reads NEXT_PUBLIC_FIGMA_APP_URL. George: paste URL into pcapp-client.tsx or set env var in Vercel. |
| Fundraising — public donation pages | DONE — db33dc0 | /donate/[campaignSlug] public page + /api/donate/[campaignSlug]/intent + Stripe webhook funnel advance |
| Marketing site — full build | PENDING | (marketing)/page.tsx exists but needs full content pass |

---

## MODULE: SPRINT 1 — HIGH PRIORITY (customer-facing gaps, build these first)

*These block the platform from being shown to serious prospects or used in a real campaign.*

| Task | Status | Notes |
|---|---|---|
| /billing — complete Stripe payment integration | DONE — 13965bc | Invoice history, portal button, past-due banner, cancel-at-period-end warning, success/cancel URL toasts, animated plan selector. |
| /settings — full settings page | DONE — 6eae5e2 | Profile, campaign profile, integration status dashboard (6 cards), danger zone (archive). |
| /settings/security — complete security settings | DONE — ad628fb | 2FA (TOTP QR + backup codes + disable), WebAuthn biometrics, active sessions, login history, API keys, PIPEDA data export. All API routes wired. |
| /settings/brand — complete brand customization | DONE — already built | Full colour picker, logo upload, font selector, party presets, live preview (door hanger + email header). All API routes wired. Marked DONE 2026-04-17. |
| /notifications — voter outreach full build | DONE — see this session | Full push composer + phone preview + opt-in management table + device breakdown + delivery stats tabs |
| /eday/hq — Campaign Manager election night command center | DONE — 8d96160 | Live vote totals, scrutineer roster, 30s auto-refresh, animated vote bars |
| /eday — election day ops full build | DONE — 3cd4b3f | Role-aware: CM gets 4-tab command center (GOTV gap, strike-off, rides, polls); scrutineers get OCR tool. /api/eday/ops aggregated endpoint. |
| /polls/[id]/live — live results full build | DONE — edc3316 | SSE stream + share controls were already built. Added: /api/polls/[id]/demographics (ward/riding groupBy + 30-day trend), DemographicsPanel client component with animated bar charts + trend line. |
| /briefing — daily briefing full build | DONE — c110dc2 | Adoni morning summary card + health score + priorities + canvassing pace + red flags. |
| /ai-assist — full Adoni in-app page | DONE — 108e504 | Full chat UI, 4 category groups, suggested prompts, localStorage history, copy button. |

---

## MODULE: SPRINT 2 — FINANCE UI HARDENING

*APIs mostly done. UI needs to match. All 9 sub-routes need finishing.*

| Task | Status | Notes |
|---|---|---|
| /finance — overview complete | DONE — 83ca093 | Spend chart, compliance card, recent transactions, quick-add modal. |
| /finance/budget — variance analysis + approval | DONE — 1901656 | Inline amount editing, per-line lock/approve, approve-all, delete, variance column, over-budget footer. |
| /finance/expenses — full form + receipt upload | DONE — 2850704 | Receipt upload (FinanceAsset), vendor dropdown fix, policy warning >$500, reject flow, date-range filter, CSV bulk import. |
| /finance/purchase-requests — full approval chain | PENDING | 251 lines. Add multi-level approval, auto-reject on budget overrun, email notifications. |
| /finance/vendors — full vendor profiles | DONE — 2850704 | Type filter, preferred-only toggle, edit modal (PATCH), deactivate, W-9 badge, address/website/payment terms display. |
| /finance/reimbursements — full workflow | PENDING | 253 lines. Add bank info, direct deposit status, approval chain, batch processing. |
| /finance/approvals — queue + bulk actions | PENDING | 179 lines. Add bulk approve/reject, delegation, escalation rules, audit trail. |
| /finance/reports — full report suite | PENDING | 468 lines. Add all report types: P&L, compliance, per-category breakdown, CSV/PDF export. |
| /finance/audit — full audit trail + filters | PENDING | 237 lines. Add date range, user filter, export, anomaly flags. |
| Finance Phase 8 — hardening + permissions | PENDING | Role-based access: Finance role can only see finance. Staff cannot see salaries. |

---

## MODULE: SPRINT 3 — FIELD SUB-MODULES

*Core field ops is done. Sub-pages need real depth.*

| Task | Status | Notes |
|---|---|---|
| /field/programs — full management | PENDING | 458 lines. Add program analytics, canvasser assignment, completion rate, door-knock heat map. |
| /field/programs/[programId] — full detail | PENDING | 381 lines. Add turf map, team roster, daily run stats, completion timeline. |
| /field/routes/[routeId] — full route detail | PENDING | 458 lines. Add interactive map, stop-by-stop list, canvasser GPS trail, outcomes summary. |
| /field/teams — full team management | PENDING | 421 lines. Add performance stats per team, shift scheduling, contact assignment, leaderboard. |
| /field/follow-ups — full workflow | PENDING | 273 lines. Add assignment to canvasser, bulk re-assign, outcome tracking, Adoni suggested scripts. |
| /field/mobile — full mobile dashboard | PENDING | 256 lines. Add offline sync status, GPS accuracy, battery-friendly mode, paper fallback trigger. |
| /field/audit — full audit + filters | PENDING | 215 lines. Add action type filter, date range, export, canvasser comparison. |
| /field/lit-drops — full operations | PENDING | 537 lines. Add route map, material tracking, completion photos, inventory deduction. |
| /field/materials — full inventory controls | PENDING | 296 lines. Add reorder alerts, per-team allocation, print-to-field link, barcode scan. |

---

## MODULE: SPRINT 4 — PRINT, FORMS, OPS POLISH

| Task | Status | Notes |
|---|---|---|
| /print/jobs — full job management | PENDING | 216 lines. Add status pipeline, vendor assignment, delivery tracking, cost tracking. |
| /print/jobs/[id] — full job detail | PENDING | 258 lines. Add proof approval flow, revision history, delivery status, invoice. |
| /print/jobs/new — full job creation | PENDING | 299 lines. Add product selector, quantity estimator, template picker, budget check. |
| /print/templates — full customization | PENDING | 311 lines. Add template editor link, category filter, preview, usage stats. |
| /print/packs — full pack management | PENDING | 549 lines. Add pack builder, bulk order, field distribution tracking. |
| /print/shops — full shop listing | PENDING | 169 lines. Add distance filter, capacity, turnaround time, ratings, contact. |
| /print/shops/register — full registration | PENDING | 341 lines. Add multi-step form, document upload, approval workflow. |
| /print/products/[product] — full product page | PENDING | 65 lines (near-stub). Full product spec, sizing guide, template options, order flow. |
| /forms — full form management | PENDING | 234 lines. Add form analytics, status toggle, duplicate, embed code, response export. |
| /forms/[id]/edit — full form builder | PENDING | 328 lines. Add conditional logic, field types, validation rules, multi-page. |
| /forms/[id]/results — full results analytics | PENDING | 104 lines. Add charts, filters, individual response view, CSV export. |
| /ops/security — full security monitoring | PENDING | 322 lines. Add live event stream, anomaly alerts, blocked IPs, rate limit dashboard. |
| /ops/verify — full feature verification | PENDING | 410 lines. Add per-feature test runner, screenshot capture, pass/fail log. |
| /ops/videos — full video management | PENDING | 129 lines. Add upload, tag by feature, embed in help articles, view count. |
| /ops/campaigns — full campaigns ops | PENDING | 255 lines. Add health score per campaign, last active, tier, contact info, quick actions. |
| /ops/content-review — full review workflow | PENDING | 233 lines. Add review queue, approve/reject/edit, AI safety score, publish trigger. |
| /ops/demo-tokens — full token management | PENDING | 387 lines. Add token generator, expiry, role assignment, usage analytics. |

---

## MODULE: SPRINT 5 — VOLUNTEERS, CONTACTS, INTEL POLISH

| Task | Status | Notes |
|---|---|---|
| /volunteers/shifts — full shift scheduling | PENDING | 507 lines. Add calendar view, conflict detection, bulk assign, SMS confirmation. |
| /volunteers/groups — full group management | PENDING | 355 lines. Add group messaging, bulk task assignment, export, group health score. |
| /volunteers/expenses — full expense workflow | PENDING | 381 lines. Add receipt upload, policy check, approval, direct deposit. |
| /contacts/duplicates — full merge workflow | PENDING | 351 lines. Add field-by-field merge picker, merge history, auto-merge rules. |
| /intelligence — full opponent intel | PENDING | 314 lines. Add statement tracker, vote record, approval chart, Adoni analysis. |
| /resources/ai-creator — full AI creator | DONE — 6e490f5 | All 7 content types, tone selector (4 tones), campaign context injection, localStorage generation history. |
| /communications/inbox — unified inbox full build | DONE — 3be7d35 | Two-panel thread view, reply, channel filter, status management, webhook wiring. |
| /settings/fields — full custom fields | PENDING | 488 lines. Add field reordering, conditional display, data type validation, import map. |
| /settings/recycle-bin — full soft delete management | PENDING | 295 lines. Add restore, permanent delete, filter by type, bulk actions. |

---

## MODULE: STUB ROUTES — KILL OR BUILD DECISION

*These are near-empty pages. Each needs a decision: build properly or remove the route and redirect.*

| Task | Status | Notes |
|---|---|---|
| /canvassing/walk — resolve duplicate | PENDING | 5 lines. Same purpose as /field-ops/walk. Pick one, redirect the other, or build separate mobile-first canvassing walk view. |
| /field-ops/walk — resolve duplicate | PENDING | 8 lines. If keeping this, build proper mobile walk shell. Otherwise redirect to /canvassing/walk. |
| /field-ops/scripts — kill or redirect | PENDING | 8 lines. Redirect to /canvassing/scripts or build field-specific script viewer. |
| /field-ops/print — kill or redirect | PENDING | 22 lines. Redirect to /print or build field-context print sheet. |
| /field-ops/map — build or kill | PENDING | 24 lines. Full Leaflet map of all field activity, or remove route. |
| /capture — build quick-capture | PENDING | 25 lines. Fast contact/interaction capture (one-tap from mobile). Useful for events. |
| /dashboard/widget — build or kill | PENDING | 16 lines. Embeddable widget preview, or remove. |
| /import-export/smart-import — wire up | PENDING | 20 lines. Should render the smart import flow (already built in /import-export). Redirect or embed. |
| /lookup — build voter lookup | PENDING | 16 lines. Fast single-voter search: name/address/phone → pull contact record. |
| /call-list — build or kill | PENDING | 8 lines. Phone banking list view. Build if phone banking is in scope, kill otherwise. |
| /supporters/super — build or kill | PENDING | 74 lines. Super supporter management. Build VIP supporter tier, or merge into /contacts. |
| /widgets/[widgetId] — build or kill | PENDING | 21 lines. Public embeddable widget. Build if embeds are needed for campaign websites. |
| /coalitions — full build | DONE — 7ee982f | 350+ lines. CRUD + org logos + member count + edit flow + inline delete confirm + summary stats. |

---

## MODULE: COMMUNICATIONS — REMAINING PHASES

*Already in queue above — restated here for sprint planning clarity.*

| Task | Status | Notes |
|---|---|---|
| Phase 4 — Delivery tracking webhooks | DONE — see comms module | Resend bounce+complaint+open+click + Twilio STOP/START |
| Phase 4b — Email open + click tracking pixel | DONE — db33dc0 | 1x1 GIF route, click redirect, NotificationLog fields, EmailTrackingEvent model |
| Phase 5 — Unified inbox backend + UI rebuild | PENDING | InboxThread, InboxMessage models |
| Phase 6 — Analytics (delivery funnel, attribution) | PENDING | |
| Phase 7 — Automation Engine | PENDING | Triggers, steps, enrollment cron |
| Phase 8 — Social publishing (real API calls) | PENDING | Facebook/X/LinkedIn |
| Phase 9 — Consent management (CASL) | PENDING | |
| Phase 10 — Fatigue guard | PENDING | |

---

## MODULE: REPUTATION COMMAND + ALERTS ENGINE (RCAE)

| Task | Status | Notes |
|---|---|---|
| RCAE — full platform build (schema, service layer, API, UI, tests) | CLAIMED 2026-04-17 | 8 new models, /api/reputation/*, /app/(app)/reputation/, alerts dashboard, command center, issue workspace, response page editor, onboarding, unit tests |

---

*Last updated: 2026-04-17 — RCAE module claimed. — Claude Sonnet 4.6*
*Last updated: 2026-04-15 — Full platform route audit complete (115 routes). 46 FULL BUILD, 54 PARTIAL, 15 STUB. All gaps now tracked above. Sprints 1-5 + stub decisions added. — Claude Sonnet 4.6*
*This file is the truth. Code and git are the proof. This file is the map.*
