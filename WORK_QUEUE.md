# Poll City — Work Queue
## Session Coordination File

**Every AI session MUST read this file before touching any code.**
**Every AI session MUST claim a task before starting it.**
**Every AI session MUST mark tasks done when finished.**

---

## HOW TO USE THIS FILE

1. `git pull origin main`
2. Read this file
3. Pick ONE unclaimed PENDING task
4. Edit: `PENDING` → `CLAIMED [YYYY-MM-DD]`
5. Commit + push immediately
6. Build it
7. `npm run build` exits 0
8. Edit: `CLAIMED` → `DONE — commit [hash]`
9. Commit + push

If two sessions conflict: first claim commit on `origin/main` wins.

---

## WHAT "DONE" MEANS

A feature is DONE when:
- `npm run build` exits 0 with it included
- A user can navigate to it from the sidebar and use it end-to-end
- Empty states, loading states, and error states all render without crash

---

## PLATFORM STATUS — WHAT IS LIVE

Everything below is built, pushed, and accessible in the app.

| Module | What's live |
|---|---|
| **Dashboard** | KPI cards, health score, all 8 data fields wired |
| **Daily Briefing** | Adoni morning summary, priorities, canvassing pace, red flags |
| **Contacts / CRM** | Full CRUD, filters, soft delete, funnel stage, households, duplicate detection + merge UI |
| **Volunteers** | Profile management, shift scheduling (calendar view), group management, expense workflow |
| **Tasks** | Full task management with assignment |
| **Coalitions** | CRUD, member count, org logos, edit flow |
| **Field Ops** | Unified command center, programs, routes, mobile GPS, lit-drops, materials, teams, audit, follow-ups |
| **Field Ops sub-routes** | `/field-ops/walk`, `/field-ops/scripts`, `/field-ops/map`, `/field-ops/print` — all live via delegate components |
| **GOTV** | Shared metrics truth layer, ride coordination |
| **Election Day** | Role-aware 4-tab command center (CM + scrutineer), `/eday/hq` election night command center |
| **Signs** | Full sign management |
| **Events** | Full event management |
| **QR Capture** | Landing flow, intent capture, admin hub, batch creation, prospect funnel, analytics |
| **Communications** | Email blast, SMS blast, social manager, automation engine (Phase 7), unified inbox, delivery tracking, analytics, scheduled messages, templates |
| **Calendar** | 4-view command center, candidate schedule, cross-system wiring, reminders cron |
| **Polls** | All vote types (NPS/WordCloud/Emoji/Priority/Timeline), live results SSE, demographics panel |
| **Forms** | Form list, create from templates, embed links, drag-drop builder (`/forms/[id]/edit`), results table (`/forms/[id]/results`) |
| **Fundraising** | Full donation CRM, Stripe integration, compliance engine, receipt emails, donor pages |
| **Finance** | Full 9-tab suite: budget, expenses, purchase requests, vendors, reimbursements, approvals, reports, audit, role-based access |
| **Print** | Dashboard, templates browser, packs, shops listing, shop registration, product pages, design engine, job management (create/track/detail) |
| **Analytics** | Approval ratings, sentiment, signal tracking |
| **Candidate Intel (CIE)** | Lead ingestion, detection, scoring, outreach, admin command center |
| **Reputation (RCAE)** | Alert engine, issue engine, rule engine, command center, onboarding |
| **Notifications** | Voter outreach composer, opt-in management, delivery stats |
| **Fuel / Logistics** | Vendor management, orders, requests, expense bridge |
| **AI Assist** | Full Adoni chat page, 4 category groups, suggested prompts |
| **Import / Export** | Smart import wizard, voter file handling |
| **Address / Voter Lookup** | `/lookup` — instant search by name/address/phone |
| **Quick Capture** | `/capture` — fast contact/interaction capture for events |
| **Call List** | `/call-list` — phone banking list view |
| **Super Supporters** | `/supporters/super` — VIP supporter tier |
| **Settings** | Profile, campaign, brand, security (2FA/WebAuthn/sessions/API keys), custom fields, recycle bin |
| **Billing** | Stripe integration, invoice history, portal, plan selector |
| **Ops** | Platform overview, campaigns, security monitor, feature verify, video docs, content review, demo tokens |
| **Design Preview** | `/design-preview/*` — Figma prototype screens (internal use) |

---

## REMAINING WORK

### P0 — CRITICAL: Blocks First Real Customer

| Task | Status | Notes |
|---|---|---|
| Migration baseline | PENDING | Run `npx prisma migrate dev --name initial_baseline` before first real customer. GAP-003. Without this, any schema change in production could lose data. George's action. |

---

### P1 — Feature Gaps (pages exist, specific user actions are incomplete)

These pages work and are accessible. The gap is a specific user journey that isn't fully wired.

| Task | Status | What a user can do TODAY | What's missing | User impact |
|---|---|---|---|---|
| `/print/shops` — depth pass | PENDING | Browse shops, search by name, see basic info | Distance filter, capacity/turnaround display, direct contact/quote button | Campaign manager can't efficiently find the right vendor for a deadline |
| `/forms/[id]/results` — analytics | PENDING | See all submissions in a table, scroll through raw responses | Aggregated charts per field (bar chart for select, average for number), CSV export | Campaign manager can't see "how many people said X" at a glance |
| Marketing site content | PENDING | Landing page exists | Needs full content pass — copy, social proof, pricing clarity, CTAs | Affects conversion of new campaigns signing up |
| Adoni per-tool rate limit | PENDING | Adoni works | No per-tool rate limiting — a runaway call could drain API budget | Low risk now, required before high-traffic production |

---

### P2 — Planned Phases (won't block campaigns, build when ready)

| Task | Status | Notes |
|---|---|---|
| Comms Phase 8 — Social publishing | PENDING | Real Facebook/X/LinkedIn API calls. UI is built, API stubs exist. Needs real OAuth tokens + post API calls. |
| Comms Phase 9 — CASL consent management | PENDING | Canadian anti-spam law engine. Track consent basis, consent date, withdrawal. Required before mass email to cold lists. |
| Comms Phase 10 — Fatigue guard | PENDING | Prevent over-messaging. Max contact frequency rules across channels. |
| Calendar Phase 6 — Google/Outlook OAuth sync | PENDING | Real two-way sync. Stub exists at `/api/campaign-calendar/sync`. Needs Google/Outlook OAuth app registration. |
| Figma UI matching | BLOCKED | Waiting on George to copy 3 spec files from Figma Make project into `docs/`. See GEORGE_TODO item 58. Once files are there: rebuild screens one by one starting with Dashboard. |

---

### P3 — Deferred (decided not to build now)

| Feature | Decision | Reason |
|---|---|---|
| `/dashboard/widget` popout | DEFERRED | Works as dashboard-studio delegate. No user need identified. |
| `/widgets/[widgetId]` public embed | DEFERRED | Public campaign website widgets — future product feature, not sprint priority. |
| Phone banking (`/call-list`) full build | DEFERRED | Page works as a CandidateCallList component. Full phone banking dialer is a V2 feature. |

---

## GEORGE'S MANUAL ACTIONS

**Full checklist with step-by-step instructions lives in `GEORGE_TODO.md`.**

Quick summary of open items:

| Priority | Action |
|---|---|
| **CRITICAL** | Migration baseline — `npx prisma migrate dev --name initial_baseline` (GAP-003) |
| **HIGH** | Stripe keys (Stripe Dashboard → Railway env vars) |
| **HIGH** | Resend domain verification + API key → Railway |
| **HIGH** | `ANTHROPIC_API_KEY` → Railway (Adoni is silent without it) |
| **HIGH** | Security salts + `DATABASE_ENCRYPTION_KEY` → Railway |
| **HIGH** | Railway automated backups — enable before first customer |
| **MEDIUM** | Twilio SMS setup |
| **MEDIUM** | Upstash Redis (rate limiting) |
| **MEDIUM** | Google OAuth credentials (for Google Calendar sync) |
| **MEDIUM** | Copy 3 Figma spec files into `docs/` (see GEORGE_TODO item 58) |
| **LOW** | VAPID keys (push notifications) |
| **LOW** | Cloudflare Turnstile (spam protection) |

---

## COORDINATION RULES

- `npm run push:safe` is the ONLY push command. Never `git push` directly.
- Build must be green before marking DONE. `tsc --noEmit` is not enough.
- Every new feature needs a sidebar entry before claiming DONE.
- Every new API route needs `apiAuth()` + `campaignId` scoping before claiming DONE.

---

*Rewritten 2026-04-17 — previous sprint-based queue replaced with feature-lifecycle format. All "stub routes" audited: every route confirmed functional via delegate components. All Sprint 4/5 items audited: all are real implementations, not stubs. Remaining work is accurately scoped above. — Claude Sonnet 4.6*
