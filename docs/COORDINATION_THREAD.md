# Poll City Coordination Thread

Date baseline: 2026-04-05
Purpose: asynchronous communication between contributors for conflicts, design decisions, and dependency blockers.

## Rules

1. Append newest entries at the top.
2. Use clear ownership in From/To fields.
3. Mark each item Open or Resolved.
4. Link impacted files in the context section.

---

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
- Status: Open

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
