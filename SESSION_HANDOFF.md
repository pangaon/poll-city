# Session Handoff — Poll City
## The Army of One Coordination File

**Last updated:** 2026-04-16
**Updated by:** Claude Sonnet 4.6 (session: /eday full build)

> Every session reads this file. Every session updates it at the end.
> This is not optional. This is how one army stays coordinated.

---

## HOW TO USE THIS FILE

**At session start (takes 30 seconds):**
1. `git pull origin main`
2. Read WORK_QUEUE.md — task registry
3. Read this file — battlefield state and context
4. Claim your task in WORK_QUEUE.md before touching anything

**At session end:**
1. Push all code (build must be green first)
2. Update the "LAST SESSION" block below
3. Update "CURRENT PLATFORM STATE" if anything changed
4. Write the next session opener in "NEXT SESSION OPENER"
5. Commit and push this file

---

## LAST SESSION (2026-04-16 — /eday full build)

**What shipped — commit 3cd4b3f:**

`/eday` — full election day ops rebuild (role-aware)

- **Campaign Managers** (ADMIN/CAMPAIGN_MANAGER/SUPER_ADMIN) now see a 4-tab election day command center:
  - **Command tab** — The Gap hero number, voted count, hourly vote rate chart (last 6h), win threshold progress bar, projection to poll close, scrutineer quick-status, results pulse. 30s auto-refresh.
  - **Strike-Off tab** — Top 25 P1 (strong support) contacts not yet voted. One-tap mark-voted with optimistic gap decrement. Click-to-call.
  - **Rides tab** — Accessibility + ride-flagged supporters. Arrange Ride + Mark Voted in same card.
  - **Polls tab** — Scrutineer deployment grid (credential status + submission status) + live results feed with running candidate totals.

- **All other roles** — unchanged scrutineer OCR result-entry tool (byte-for-byte original).

- **New API: `/api/eday/ops`** — single round-trip returning all four panels. Requires ADMIN|CAMPAIGN_MANAGER|SUPER_ADMIN. `no-store` cache. Pulls from: `getGotvSummaryMetrics`, `ScrutineerAssignment`, `LiveResult`, `Contact` (priority + rides).

**Connection chain verified:**
- Mark Voted → `POST /api/gotv/mark-voted` → `Contact.voted = true` + `ActivityLog` via `executeAction` → gap returned in response → UI updates optimistically
- Arrange Ride → `POST /api/gotv/rides/[id]/arranged` → contact notes + `ActivityLog`

**The session before this (2026-04-15):**
Commit `5a13f4c` — Comms Analytics tab (funnel + trend + per-blast) + /notifications full rebuild (composer + subscribers + stats).

---

## CURRENT PLATFORM STATE (as of 2026-04-16)

### What is live and working

| Module | Status | Key commit |
|---|---|---|
| Auth (email/password) | ✓ LIVE | — |
| Dashboard (all 8 data fields) | ✓ LIVE | — |
| CRM (contacts, households, duplicates) | ✓ LIVE | 730833e |
| Field Ops — full 16-chunk build | ✓ LIVE | d8e7314 |
| GOTV (gap, mark-voted, rides, priority list) | ✓ LIVE | — |
| Finance Suite (budget→audit, 9 tabs) | ✓ LIVE | 0a8d74b |
| Fundraising Suite (Phases 1-7 + public donate pages) | ✓ LIVE | db33dc0 |
| Communications (email, SMS, social, inbox, analytics) | ✓ LIVE | 5a13f4c |
| /notifications (push composer, subscribers, stats) | ✓ LIVE | 5a13f4c |
| Print (enterprise rebuild, 15 templates, packs, inventory) | ✓ LIVE | 0a8d74b |
| Calendar (full 4-view UI, APIs, candidate schedule) | ✓ LIVE | b5170f0 |
| /eday — CM command center + scrutineer OCR | ✓ LIVE | 3cd4b3f |
| /eday/hq — election night results | ✓ LIVE | 8d96160 |
| /billing — Stripe integration | ✓ LIVE | 13965bc |
| /settings — profile, campaign, integrations, danger zone | ✓ LIVE | 6eae5e2 |
| /briefing — daily AI briefing | ✓ LIVE | c110dc2 |
| /ai-assist — Adoni in-app page | ✓ LIVE | 108e504 |
| Demo + guided tour | ✓ LIVE | 7494b12 |
| /coalitions | ✓ LIVE | 7ee982f |

### Sprint 1 — still PENDING (customer-facing, do these first)

| Route | What's missing |
|---|---|
| `/settings/security` | 2FA management, active sessions, login history, API keys |
| `/settings/brand` | Full colour picker, logo upload, font selector, preview |
| `/eday` | ✓ DONE this session |
| `/polls/[id]/live` | 99 lines only — real-time result stream, party breakdown |

### George's manual actions outstanding (full list in GEORGE_TODO.md)

Critical blockers:
- Items 2-3: Stripe keys to Railway
- Items 10-16: Resend email setup
- Item 22: `ANTHROPIC_API_KEY` to Railway (Adoni is dead without this in prod)
- Items 49-50: Railway backups + PWA install

---

## NEXT SESSION OPENER

**Copy this verbatim into the next session:**

```
Commit 3cd4b3f shipped: /eday full election day ops rebuild — role-aware CM command center
(Command/Strike-Off/Rides/Polls tabs + GOTV gap, mark-voted, rides, scrutineer deployment)
+ scrutineer OCR tool unchanged for non-manager roles.

Read WORK_QUEUE.md. Sprint 1 PENDING priority:

1. /settings/security — 501 lines, incomplete. Add: 2FA enable/disable with QR code flow,
   active sessions list (device + last seen + revoke button), login history (last 10 logins
   with IP + device), API keys management (generate/revoke). Auth: apiAuth + membership guard.
   This is customer-facing security — build it fully.

2. /settings/brand — 377 lines, incomplete. Full colour picker (primary/secondary/accent),
   logo upload (store URL), font selector (system fonts), live preview of how the campaign
   brand looks. Writes to Campaign model fields.

Pick one, claim it in WORK_QUEUE.md, build it fully. Run npm run build before pushing.
Report what is live, what George needs to do, any risks.
```

---

## DEPENDENCY MAP — what blocks what

Build these in order:
1. `/settings/security` — standalone, no blockers
2. `/settings/brand` — standalone, no blockers
3. `/polls/[id]/live` — standalone, no blockers
4. `Comms Phase 7` (automation engine) — needs Phase 6 done ✓
5. `Calendar Phase 6` (Google/Outlook OAuth) — needs George to set up credentials
6. `Migration baseline` (GAP-003) — run before first real customer, CRITICAL

Safe to build in any order (no dependencies):
- Any Sprint 2 Finance UI hardening items
- Any Sprint 3 Field sub-module items
- Any Sprint 4 Print/Forms items

---

## ARMY OF ONE — SESSION DISCIPLINE

We are one army running as multiple sessions. The rules:

1. **One task at a time per session.** Claim in WORK_QUEUE.md before starting. Push the claim commit immediately.
2. **Build passes before push.** `npm run build` exits 0. No exceptions. No "I'll fix it next session."
3. **End of session: update this file.** The next session is reading it cold. Treat it like a war room brief.
4. **Never assume another session's work is done.** Check WORK_QUEUE.md. If it says CLAIMED, leave it.
5. **George's manual actions go in GEORGE_TODO.md.** Not in chat. Not in this file. In that file.
6. **If you're the current running session** reading this mid-session: your job is to finish what you claimed, update this file, and close cleanly.

---

## KNOWN RISKS (carry until resolved)

| Risk | Severity | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` not in Railway | HIGH | Adoni returns 500 in prod — George must add it |
| No Resend config | HIGH | All emails fail silently in prod |
| No Stripe keys in Railway | HIGH | Donations/billing broken in prod |
| Migration baseline (GAP-003) not run | CRITICAL | Must run before first real customer |
| No Redis (rate limiting) | MEDIUM | Rate limits disabled — stub passes through |

---

*Updated end-of-session every time. If this file is stale: the session that shipped last forgot to update it. Check git log for the latest commit.*
