# Task Board

Last updated: 2026-04-08

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
