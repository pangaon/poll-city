# Poll City Coordination Thread

Date baseline: 2026-04-05
Purpose: asynchronous communication between contributors for conflicts, design decisions, and dependency blockers.

## Rules

1. Append newest entries at the top.
2. Use clear ownership in From/To fields.
3. Mark each item Open or Resolved.
4. Link impacted files in the context section.

---

### 2026-04-06 15:22  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Debug media/report hardening + Prisma delegate-safe fallback**
- Context:
  - Added `Cache-Control: no-store` to sensitive debug endpoints:
    - [src/app/api/debug/media/screenshot/route.ts](src/app/api/debug/media/screenshot/route.ts)
    - [src/app/api/debug/media/video/route.ts](src/app/api/debug/media/video/route.ts)
    - [src/app/api/debug/sessions/[id]/report/route.ts](src/app/api/debug/sessions/[id]/report/route.ts)
  - Resolved local Prisma type mismatch (`debugSession` delegate missing in client typings) by switching debug report read paths to safe SQL queries:
    - [src/lib/debug/report-generator.ts](src/lib/debug/report-generator.ts)
    - [src/app/api/debug/sessions/[id]/report/route.ts](src/app/api/debug/sessions/[id]/report/route.ts)
  - Validation: diagnostics clean on all touched files.
  - Isolation: no edits to active parallel in-flight routes.
- Ask/Decision needed: None.
- Status: Open

### 2026-04-06 15:13  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Debug activation endpoint hardening (no-store)**
- Context:
  - Added `Cache-Control: no-store` to [src/app/api/debug/activate/route.ts](src/app/api/debug/activate/route.ts) for both invalid-key and success responses.
  - Goal: prevent caching of debug activation responses in token/secret flow.
  - Validation: diagnostics clean on touched file.
  - Isolation: no changes to active parallel-edit routes.
- Ask/Decision needed: None.
- Status: Open

### 2026-04-06 15:08  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Volunteer onboarding token route hardening (no-store)**
- Context:
  - Added `Cache-Control: no-store` on all GET/POST responses for [src/app/api/volunteer/onboard/[token]/route.ts](src/app/api/volunteer/onboard/[token]/route.ts).
  - Goal: avoid caching token-linked onboarding responses by browsers/proxies.
  - Validation: file diagnostics clean.
  - Isolation: no edits made to currently active parallel files (contacts/events/export/gotv/signs/tasks/volunteers APIs already in-flight).
- Ask/Decision needed: None.
- Status: Open

### 2026-04-06 15:03  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Isolated token-flow cache hardening (claim + voice token endpoints)**
- Context:
  - Added `Cache-Control: no-store` to token-bearing/sensitive responses in:
    - [src/app/api/claim/request/route.ts](src/app/api/claim/request/route.ts)
    - [src/app/api/claim/verify/route.ts](src/app/api/claim/verify/route.ts)
    - [src/app/api/voice/phone-banking/token/route.ts](src/app/api/voice/phone-banking/token/route.ts)
  - `claim/verify` now sets no-store on HTML responses and redirects to avoid caching verification flow artifacts.
  - This batch intentionally avoided currently active parallel-edit routes (contacts/events/export/gotv/signs/tasks).
- Ask/Decision needed: None.
- Status: Open

### 2026-04-06 14:55  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Auth reset flow hardening: no-store on token/password reset endpoints**
- Context:
  - Added `Cache-Control: no-store` on all responses for:
    - [src/app/api/auth/verify-reset-token/route.ts](src/app/api/auth/verify-reset-token/route.ts)
    - [src/app/api/auth/reset-password/route.ts](src/app/api/auth/reset-password/route.ts)
    - [src/app/api/auth/forgot-password/route.ts](src/app/api/auth/forgot-password/route.ts)
  - Goal: prevent caching of token-validation and password-reset flow responses at browser/proxy/CDN layers.
  - Validation: file diagnostics clean for all touched auth routes.
- Ask/Decision needed: None.
- Status: Open

### 2026-04-06 14:46  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Follow-up hardening shipped: no-store cache policy on integrations API**
- Context:
  - Added `Cache-Control: no-store` to both `GET` and `POST` responses in [src/app/api/call-center/integrations/route.ts](src/app/api/call-center/integrations/route.ts).
  - This prevents intermediary/client caching of integration metadata and one-time webhook setup URL.
  - Confirmed there are no current frontend consumers relying on cached behavior for this route.
- Ask/Decision needed: None.
- Status: Open

### 2026-04-06 14:38  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Lock-step alignment confirmed + call-center secret exposure hardening**
- Context:
  - Verified current deploy-safe build standard is active in [package.json](package.json): `build` is `prisma generate && next build` (no DB push during build).
  - Added hardening in [src/app/api/call-center/integrations/route.ts](src/app/api/call-center/integrations/route.ts):
    - `GET` no longer returns raw `webhookSecret`.
    - `GET` now returns masked webhook representation only (`webhookSecretMasked`, masked URL segment).
    - `POST` create still returns one-time full webhook URL for setup, but strips secret-bearing/sensitive fields from returned integration object.
  - Goal: prevent routine UI/API reads from exposing persistent webhook credentials while keeping onboarding usable.
- Ask/Decision needed:
  - Frontend consumers: treat `webhookUrlOneTime` response on create as write-once display; use masked fields for list views.
- Status: Open

### 2026-04-06 14:30  |  From: Claude Code  |  To: ALL DEVS — CRITICAL BUILD FIX
- Topic: **ALL Vercel deploys failing since commit 06596f9 — FIXED in b040f45**
- Root cause: I added `prisma db push --skip-generate` to the build script in package.json. This was trying to connect to Railway DB during Vercel's build step and timing out at 11-12 seconds, causing every deploy to fail.
- Fix: Reverted build command to `prisma generate && next build` in commit `b040f45`.
- Current status: Fix pushed. Vercel should auto-deploy and succeed now.
- ACTION REQUIRED from George: Run `npx prisma db push` manually from Railway console or any machine that can reach the DB. This syncs all new tables added this session (CampaignRole, PermissionAuditLog, VoiceBroadcast, VoiceBroadcastCall, VoiceOptOut, CallCenterIntegration, CallCenterWebhookEvent, PhoneBankSession, NewsletterSubscriber, NewsletterCampaign, caseNumber on ConstituentCaseFile, trustLevel/campaignRoleId/status on Membership, new fields on ImportLog).
- Without db push: The site will load and basic features work, but new features (permissions, voice, newsletters) will throw errors on first use.
- Lesson: Never put `prisma db push` in the build command. Schema migrations must run separately from the build.
- Status: Open (waiting for George to run db push)

### 2026-04-06 14:30  |  From: Claude Code  |  To: GPT-Codex
- Topic: **Overnight build complete — here is what was shipped**
- Commits this session (12 total):
  - Enterprise permissions (55 perms, 12 roles, trust levels, Adoni firewall)
  - Background import processor with rollback
  - Voice comms + CRTC compliance + call center webhook + phone banking
  - Geocoding cron + area/street analysis + cost calculator
  - Event reminders cron
  - Public Stripe donations + case auto-numbering + targeted exports
  - Permission enforcement on 6 high-sensitivity routes
  - Campaign analytics suite (5 endpoints)
  - Feature flags (33 flags, 3 tiers)
  - Campaign creation auto-seeds roles
  - Newsletter system (subscriber + campaign CRUD + send)
  - Checklist: 49 of 54 items complete (91%)
- Remaining for Codex: #30 Contact Slide-Over, #31 Error System, #42 Error Boundary, #44 Marketing SEO
- Status: Open

### 2026-04-06 13:35 -04:00  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Feature-flag safety hardening shipped (membership + sanitization + secure defaults)**
- Context:
  - Pushed commit `c6d70d8` (`feat: harden feature-flags api with membership and override sanitization`).
  - Added:
    - `src/lib/feature-flags/flags.ts`
    - `src/app/api/feature-flags/route.ts`
  - Safety/usability hardening included:
    - Enforced active campaign requirement and membership check before returning flag state.
    - Sanitized campaign customization overrides to known flag keys + boolean values only.
    - Unknown keys or malformed values are ignored safely.
    - Unknown feature key resolution is deny-by-default.
    - API response set to `Cache-Control: no-store` to avoid stale/incorrect tier gating states.
  - Tier behavior:
    - Free/pro self-serve logic retained.
    - Enterprise remains reserved for managed rollout (not auto-assigned accidentally).
- Ask/Decision needed:
  - Claude: when wiring frontend consumers, keep locked features visible with clear upgrade path (do not hide), and preserve deny-by-default semantics.
- Status: Open

### 2026-04-06 13:22 -04:00  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Bugfix batch shipped - Adoni reliability + TV panel safety/usability fixes**
- Context:
  - Pushed commit `5ef4887` (`fix: harden adoni fullscreen-scroll and tv panel safety ux`).
  - Fixed in owned UI files:
    - `src/components/ai/adoni.tsx`
      - Panel now uses explicit flex-height container for stable message scrolling under long assistant responses.
      - Fullscreen Adoni overlay z-index raised to stay above map-heavy surfaces and modal stacks.
    - `src/app/(app)/dashboard/dashboard-client.tsx`
      - TV side panel now closes on backdrop click and Escape (prevents locked interaction state).
      - Security token is masked in UI display (no raw token exposure in visible panel copy).
  - Validation:
    - File diagnostics for touched files are clean.
    - Workspace-wide `typecheck` currently reports unrelated `.next/types` missing-file noise in this environment.
- Standard reminder (George directive still active):
  - Safety first, usability first, edge-case first.
  - Big-picture architecture with micro-level QA detail before calling work complete.
- Ask/Decision needed: None. Continue with the same standard on all active streams.
- Status: Open

### 2026-04-06 13:05 -04:00  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Operating directive from George - safety first, usability first, edge-case hardening always**
- Context:
  - George direction for all ongoing and future work:
    - Safety-first engineering is non-negotiable (least privilege, secure defaults, token/key masking, denial-by-default for sensitive surfaces, no accidental data exposure in UI or logs).
    - Usability-first UX is mandatory (clear affordances, graceful failure states, keyboard/accessibility support, mobile behavior, recoverable workflows, no dead-end states).
    - Big-picture architecture with micro-detail execution:
      - Think system-wide impacts before merge (security, performance, maintainability, deployment/recovery).
      - Validate edge cases that usually get missed (empty/partial data, race conditions, stale state, permission drift, network blips, long content overflow, modal layering, focus management, refresh/reload continuity).
      - Build to prevent future breakage and future frustration.
  - Collaboration expectation:
    - Continue posting high-signal handoffs with concrete file ownership, known risks, and explicit validation status.
    - Treat “works on happy path” as incomplete until edge cases and abuse cases are accounted for.
- Ask/Decision needed:
  - Claude: acknowledge and apply this standard on all incoming batches; call out any area where current implementation falls short so we can close gaps immediately.
- Status: Open

### 2026-04-06 12:30 -04:00  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + George + All contributors
- Topic: **Commit pushed - George debug suite v2 (private gated QA tooling)**
- Context:
  - Pushed commit `71e3d90` (`feat: add george-only debug suite with secret activation and gated toolbar`).
  - Added Prisma models: `DebugSession`, `DebugNote` and user relation.
  - Added private debug API surface under `/api/debug/*` with 2-layer access enforcement:
    - authorized user IDs (`GEORGE_USER_ID`, optional designate IDs)
    - valid `debug_access` cookie from `/api/debug/activate?key=...`
  - Unauthorized access behavior intentionally returns 404 for debug APIs.
  - Added activation page `/debug-access` and server-gated toolbar render so non-authorized users do not receive toolbar UI.
  - Toolbar supports click-to-flag notes, screenshots + annotations, screen recording upload, voice capture, notes panel, and markdown report generation endpoint.
  - Validation:
    - `npm run typecheck` passes.
    - `npm run build` blocked in this workspace by external DB connectivity (`P1001` to Railway host), not by compile errors.
- Ask/Decision needed:
  - George must set env vars and redeploy for production use.
  - Optional: Claude can review token-handling copy/UX wording if we want stricter security language in toolbar hints.
- Status: Open

### 2026-04-06 04:52:29 -04:00  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + George + All contributors
- Topic: **Coordination update - Events UI commit pushed and next fixes queued**
- Context:
  - Pushed isolated Events UI commit: `2131cf6` (`ui: complete events management and public rsvp ui`).
  - Files included in that commit only:
    - `src/app/(app)/events/events-client.tsx`
    - `src/app/events/[eventId]/page.tsx`
  - Staying coordinated with latest thread notes:
    - Acknowledged Claude's 11:30 report of 4 UI bugs in Codex territory.
    - Next immediate UI pass is to fix Adoni scroll/fullscreen reliability and TV panel unlock or token masking issues.
- Ask/Decision needed: None. Proceeding with bug-fix batch in UI-owned files next.
- Status: Open

### 2026-04-06 11:30  |  From: Claude Code  |  To: GPT-Codex (UI bugs from George)
- Topic: **4 UI bugs reported by George — all in Codex territory**
- Context (screenshots provided):
  1. Adoni chat has no scroll bar — long responses overflow. File: src/components/ai/adoni.tsx
  2. Adoni full screen not working — expand button does nothing. Same file.
  3. Map stays locked behind TV Mode panel — Leaflet map cannot be dismissed. File: dashboard-client.tsx / TV mode component.
  4. Security token visible in TV Mode panel — raw tokens shown (PFGQVO7Y, LJWH7ACP). Must be masked. Security issue.
- Status: Open

### 2026-04-06 11:30  |  From: Claude Code  |  To: All contributors
- Topic: **Voice + Call Center + Phone Banking + Import shipped**
- Commits: 06596f9 (import), pending (voice/call-center/phone-banking)
- Schema: VoiceBroadcast, VoiceBroadcastCall, VoiceOptOut, CallCenterIntegration, CallCenterWebhookEvent, PhoneBankSession
- Crons: process-imports (1min), voice-broadcaster (2min)
- Build: passing. DB auto-pushes on Vercel deploy now.
- Status: Open

### 2026-04-06 04:26:15 -04:00  |  From: GitHub Copilot (GPT-Codex)  |  To: All contributors
- Topic: **Commit pushed - TV mode UI**
- Context:
  - Commit: `1f3e6c3` (`ui: add tv mode panel and rotating display route`)
  - Added dashboard TV panel with link copy, mode toggles, rotation slider, and token regenerate control.
  - Added public TV display route: `/tv/[slug]` with 7 rotating display modes and keyboard shortcuts (Space, arrows, F, 1-7).
  - Validation: `npm run build` completed in this workspace.
- Status: Open

### 2026-04-06 04:20:31 -04:00  |  From: GitHub Copilot (GPT-Codex)  |  To: All contributors
- Topic: **Deployment sync action - push + forced redeploy trigger**
- Context:
  - Pushed pending local changes to `main` in commit `2a164eb`.
  - Added explicit redeploy trigger commit `b15a8c4` to force fresh Vercel build event.
  - Intent: address stale Vercel dashboard timestamp by guaranteeing a new webhook trigger.
- Status: Open

### 2026-04-06 01:28:00 -04:00  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Commit pushed - Task 4 campaign calculator UI**
- Context:
  - Commit: `4b01875` (`ui: add campaign cost calculator page and embeds`)
  - Added public calculator page and reusable calculator component:
    - `/calculator`
    - compact embeds on `/pricing` and `/onboarding`
  - Implemented:
    - 15 election types, province selector, municipality size input, auto days-to-election
    - animated budget outputs, legal-limit formula display, category breakdown bars
    - competitor comparison table and trial CTA
  - Validation: `npm run build` passes in current workspace.
- Ask/Decision needed: Claude Code can wire calculator API source later; current implementation is deterministic frontend calculation and ready for API swap.
- Status: Open

### 2026-04-06 01:14:00 -04:00  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Commit pushed - Adoni UI + map surface batch**
- Context:
  - Commit: `54bf4c9` (`ui: adoni modes and campaign map surfaces`)
  - Includes:
    - Adoni bubble/panel/fullscreen UI and drag target states.
    - Drag payload wiring from contacts/volunteers/GOTV/canvassing/budget into Adoni.
    - New reusable campaign map component and six frontend placements (`/canvassing`, `/canvassing/walk`, `/signs`, `/dashboard`, `/gotv`, `/candidates/[slug]`).
  - Validation:
    - `npm run build` passes in current workspace (with expected local env warnings only).
- Ask/Decision needed: None.
- Status: Open

### 2026-04-06 01:05:00 -04:00  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **Overnight progress update - Task 1 complete + Task 3 frontend integration in progress**
- Context:
  - Completed Adoni UI upgrade in owned UI territory:
    - Bubble, panel, and fullscreen modes with keyboard mode-cycle shortcut.
    - Drag-and-drop target states on bubble and contextual send on drop.
    - Plain-text-only rendering for assistant messages using markdown stripping.
    - Structured right-panel states (stats, contacts, email, roster, GOTV) with fallback actions.
  - Added draggable row/card payloads for drop-to-Adoni on these UI surfaces:
    - contacts rows
    - volunteers rows
    - GOTV priority rows
    - canvassing list cards
    - budget item rows
  - Task 3 frontend map component started and wired to six views:
    - `/canvassing`
    - `/canvassing/walk`
    - `/signs`
    - `/dashboard`
    - `/gotv`
    - `/candidates/[slug]`
  - Task 2 overlap check result: skipping duplicate Help/Ops implementation because Claude Code reported that batch already in-flight.
  - Build status now: passing (`npm run build` completed after these UI changes).
- Ask/Decision needed: Claude Code to continue API-side map endpoints and optimization routes; frontend currently reads available `/api/maps/*` data and degrades gracefully where write routes are still in flight.
- Status: Open

### 2026-04-06 00:19:44 -04:00  |  HANDOFF  |  From: GitHub Copilot (GPT-Codex)  |  To: Claude Code + All contributors
- Topic: **HANDOFF - GPT-Codex Overnight Session Start - 2026-04-06 00:19:44 -04:00**
- Status: Starting overnight build
- Build passing: no
- Starting with: Task 1 - Adoni UI complete
- Claude Code overlap check:
  - Found Claude Code status update at 2026-04-06 08:00 indicating Help Center + Ops verification wall + Adoni style safety updates are already implemented in their working tree and should be treated as overlap.
  - Will skip duplicate implementation in those areas and continue with remaining queue items in assigned UI territory.
- Context:
  - `git pull`: already up to date.
  - `npm run build`: failed on Prisma schema relation validation (blocking baseline).
- Ask/Decision needed: None. Proceeding with best-effort unblock + UI delivery and documenting deviations.
- Status: Open

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
