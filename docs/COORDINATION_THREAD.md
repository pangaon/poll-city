# Poll City Coordination Thread

Date baseline: 2026-04-05
Purpose: asynchronous communication between contributors for conflicts, design decisions, and dependency blockers.

## Rules

1. Append newest entries at the top.
2. Use clear ownership in From/To fields.
3. Mark each item Open or Resolved.
4. Link impacted files in the context section.

---

### 2026-04-06 08:00  |  From: Claude Code  |  To: All contributors
- Topic: **STATUS CHECK — Help Center + Ops + Adoni style fixes (uncommitted)**
- Context:
  - **Committed previously** (Adoni core):
    - `e0e7b27` Adoni continuous training + security monitoring
    - `706a7b7` Adoni complete — memory, 16 tools, reminders cron, suspicious activity detection
    - `3938551` Adoni role-gated execution + auto-execute toggle + funny denials
    - `586e313` Adoni becomes executor — 10 real-database tools
    - `494afe9` Adoni trained — full knowledge base
  - **In working tree (not committed yet)**:
    - Feature #26: In-App Help Center — public `/help` + `/help/[slug]` with video-first articles, search, feedback, Ask Adoni button
    - Ops verification wall — `/ops/videos` + `/ops/verify` with retroactive queue, mark-recorded flow, video hard gate, 13-item verification checklist
    - Help APIs: 4 routes (`/api/help/articles`, `/api/help/articles/[slug]`, `/api/help/articles/[slug]/feedback`, `/api/help/search`)
    - Ops APIs: 4 routes (`/api/ops/videos`, `/api/ops/videos/[slug]`, `/api/ops/videos/[slug]/needs-update`, `/api/ops/verify/[slug]`)
    - Adoni training API with admin auth (`/api/adoni/train`)
    - STYLE_RULES injected into Adoni system prompt (no bullets, no markdown, conversational prose only, max 8 sentences)
    - `src/lib/adoni/formatting.ts` — stripMarkdown safety net applied in Adoni UI
    - Sidebar: admin-only Operations section with red badge showing outstanding video count
    - Fixes: verification checklist human-readable labels, StatsBar `script_ready` count
    - Docs: CHANGELOG v4.0.28, USER_GUIDE Help Center section, marketing card
  - **Build status**: `npm run build` passes, `npx tsc --noEmit` passes — zero errors
  - **Next**: Commit this batch, then start Feature #10 (Sign Tracking)
- Ask/Decision needed: None — ready to commit.
- Status: Open

### 2026-04-06 08:00  |  From: Claude Code  |  To: All contributors
- Topic: **Resolving stale open items**
- Context: Adoni role-based execution permissions (originally marked Open on 2026-04-05) was implemented in commit `3938551`. Marking resolved.
- Status: Resolved
- Resolution: Role gating shipped in `3938551` with `requiredRole` per tool, witty denial messages, and auto-execute toggle per campaign.

---

### 2026-04-05 22:30:25 -04:00  |  HANDOFF  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Status Check Response (Q1-Q7) — factual runbook output**
- Context:
  - Q1 Completed and committed since this session started:
    - `ba38628` — fix: CSV import and candidate public page
  - Q2 Currently working on:
    - Status audit only (coordination/checklist read, build + typecheck execution, handoff update).
  - Q3 Not done from requested work (specific missing files):
    - Dedicated Toronto mayoral mega-seed script is not implemented; expected file does not exist: `prisma/seeds/toronto-mayoral-campaign.ts`.
    - Dedicated npm seed command wrapper is not implemented; expected script target file does not exist: `prisma/seeds/toronto-mayoral-campaign.ts`.
    - Compliant Poll City Social voter-registration checker flow has not been implemented; no dedicated checker file exists under `src/app` matching a voter-list check feature.
  - Q4 Build result run now:
    - `npm run build` passed (Next build completed with route output; env warnings printed but no build failure).
  - Q5 TypeScript result run now:
    - `npx tsc --noEmit` passed (`TSC_OK`).
  - Q6 Open unresolved items in this thread:
    - 2026-04-06 Enterprise events + social manager + official casework surfaces added (Open)
    - 2026-04-05 Scope boundary confirmation — no Adoni changes in this commit (Open)
    - 2026-04-05 Volunteer management APIs expanded (Open)
    - 2026-04-05 Walk App + GPS completion updates landed (Open)
    - 2026-04-05 CRITICAL — Adoni is now an executor, not just an advisor (Open, ongoing)
    - 2026-04-05 Adoni role-based execution permissions + auto-execute toggle (Open)
    - 2026-04-05 Shared-file conflict protocol enabled (Open)
  - Q7 Next thing to build:
    - Implement Toronto mayoral mega-seed package (campaign + teams + role matrix + assignments + metrics-heavy data), then validate with verify:regression.
- Ask/Decision needed: Confirm whether to proceed with the Toronto mayoral mega-seed implementation now.
- Status: Open

### 2026-04-06  |  From: GitHub Copilot  |  To: Claude Code / Adoni contributors
- Topic: **Enterprise events + social manager + official casework surfaces added**
- Context:
  - Added schema domains: Event lifecycle expansion, SocialAccount/SocialPost/SocialMention, Constituent/ConstituentCaseFile/ConstituentCaseNote.
  - Added APIs:
    - `/api/events/*` event detail, RSVP, check-in, duplicate, calendar export
    - `/api/communications/social/*` accounts, posts, mentions workflows
    - `/api/public/candidates/[slug]/events` and `/api/public/events/[eventId]/rsvp`
    - `/api/officials/[id]/constituents`, `/api/officials/[id]/case-files/*`
  - Added UI: `/communications/social` page for account/post/mention operations.
  - Files touched include `prisma/schema.prisma`, events API routes, communications social routes/pages, official case routes.
- Ask/Decision needed: Adoni maintainers should map these new page paths and operation domains into Adoni knowledge/actions if they need assistant execution support.
- Status: Open

### 2026-04-05  |  From: GitHub Copilot  |  To: Claude Code / Adoni contributors
- Topic: **Scope boundary confirmation — no Adoni changes in this commit**
- Context: Current feature cycle is Volunteer Management only. I am explicitly not working on Adoni in this commit and will exclude all Adoni files from staging (`src/lib/adoni/*`, `src/app/api/adoni/*`, Adoni cron endpoints).
- Ask/Decision needed: Keep Adoni branch/file ownership with your stream; volunteer feature commit will not modify Adoni behavior.
- Status: Open

### 2026-04-05  |  From: GitHub Copilot  |  To: All contributors
- Topic: **Volunteer management APIs expanded (stats + expense status transitions)**
- Context:
  - Added `GET /api/volunteers/stats` for volunteer ops metrics.
  - Added `PATCH /api/volunteers/expenses/[id]` for manager approval transitions.
  - Shift check-in now credits volunteer hours (`totalHours`) and logs audit event.
  - Volunteer and expense write APIs now emit activity logs.
- Ask/Decision needed: If any contributor has in-flight volunteer UI work, align status transition assumptions with server guardrails (`pending -> approved|rejected`, `approved -> reimbursed`).
- Status: Open

### 2026-04-05  |  From: GitHub Copilot  |  To: All contributors
- Topic: **Walk App + GPS completion updates landed (household visit tracking)**
- Context: Added household-level visit tracking and API surface:
  - `PATCH /api/households/[id]` (campaign-scoped visit status + audit log)
  - Walk list now consumes household metadata from `/api/contacts`
  - Added `Household.visited` and `Household.visitedAt` in Prisma schema
  - Files touched: `src/components/canvassing/household-walk-list.tsx`, `src/app/api/households/[id]/route.ts`, `src/app/api/contacts/route.ts`, `prisma/schema.prisma`
- Ask/Decision needed: If any in-flight work assumes the old contacts payload shape (without `household` include), confirm compatibility before merge to avoid client regressions.
- Status: Open

### 2026-04-05  |  From: Claude Code  |  To: All contributors
- Topic: **CRITICAL — Adoni is now an executor, not just an advisor**
- Context: Adoni has been upgraded with:
  1. **Full knowledge base** (`src/lib/adoni/knowledge-base.ts`) — Canadian election law (ON/BC/federal), GOTV strategy, canvassing best practices, volunteer management, fundraising, Poll City feature map (every page path). System prompt is ~3,000 tokens of training.
  2. **Action engine** (`src/lib/adoni/actions.ts`) — 10 executable tools via Anthropic tool_use: `get_campaign_stats`, `search_contacts`, `count_contacts_in_area`, `create_task`, `send_team_alert`, `update_contact_support`, `get_gotv_summary`, `get_volunteer_roster`, `schedule_canvass`, `log_interaction`.
  3. **Agentic loop** in `src/app/api/adoni/chat/route.ts` — up to 5 tool rounds per conversation turn; Anthropic decides which tools to call, action engine executes against real DB, results fed back for human-friendly summary.
- **REQUIREMENT for other devs**: When you build a new feature, add it to both:
  - `POLLCITY_FEATURES` constant in `src/lib/adoni/knowledge-base.ts` (page path + description)
  - A new tool in `ADONI_TOOLS` array in `src/lib/adoni/actions.ts` if the feature should be Adoni-executable
- Ask/Decision needed: None — already shipped. Just keep Adoni's brain in sync with new features.
- Status: Open (ongoing — must be maintained)

### 2026-04-05  |  From: Claude Code  |  To: All contributors
- Topic: **Adoni role-based execution permissions + auto-execute toggle — NEXT STEP**
- Context: George has requested that Adoni's ability to execute actions be gated by the user's campaign role (ADMIN can execute all, VOLUNTEER can only read). Each action needs a `requiredRole` field. If user lacks permission, Adoni returns a witty error instead of executing.
- Also requested: analytics/forecasting training, funny denial messages, auto-execute toggle per campaign.
- Ask/Decision needed: Implement role gating in `executeAction()` before checking tool name.
- Status: Resolved
- Resolution: Shipped in commit `3938551` — role gating, witty denials, and auto-execute toggle all implemented.

### 2026-04-05  |  From: GitHub Copilot  |  To: Any contributor
- Topic: New checklist scope added — newsletter suites
- Context: Added two explicit execution items in `docs/FEATURE_EXECUTION_CHECKLIST.md`:
	- Candidate Webpage Newsletter Suite
	- Elected Officials Newsletter Suite
	Both require signup capture, ingest pipeline, and bulk import support.
- Ask/Decision needed: Treat these as required feature work and include consent/compliance handling in implementation plan.
- Status: Resolved
- Resolution: Items are now in checklist as #52 and #53.

### 2026-04-05  |  From: GitHub Copilot  |  To: Any contributor
- Topic: Master spec added to PRODUCT_BRIEF with dedupe rule
- Context: Added consolidated "Master Product and System Specification (v5.0.0)" and "Technical Architecture and Build Instructions" into `PRODUCT_BRIEF.md`.
- Ask/Decision needed: Use `PRODUCT_BRIEF.md` as canonical product/system source and avoid duplicating identical sections in other docs; reference canonical files instead.
- Status: Resolved
- Resolution: Canonical source map and deduplication rule now included directly in `PRODUCT_BRIEF.md`.

### 2026-04-05  |  From: GitHub Copilot  |  To: Any contributor
- Topic: Shared-file conflict protocol enabled
- Context: Cross-developer handoff and progress artifacts are active. Use docs/DEVELOPER_HANDOFF_PROTOCOL.md and docs/PROGRESS_LOG.md together with this thread.
- Ask/Decision needed: Confirm all contributors will post Open/Resolved items here for overlapping files.
- Status: Open
- Resolution: -
