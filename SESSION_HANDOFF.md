# Session Handoff — Poll City
## The Army of One Coordination File

**Last updated:** 2026-04-17
**Updated by:** Claude Sonnet 4.6 (session: platform isolation audit + fixes)

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

## LAST SESSION (2026-04-17 — Platform isolation audit + George invisibility)

**What shipped — commit d27336f:**

### SUPER_ADMIN isolation — George is now invisible to campaign users
10-gap audit of the platform. All gaps closed. George's identity no longer surfaces in any campaign-facing view.

- **seed.ts** — all `admin.id` references in ActivityLog, Tasks, Interactions, FinanceExpenses reassigned to campaign team members. Only two Membership entries remain (required for demo login; both commented explaining why).
- **Team list** — `prisma.membership.findMany` in both `settings/team/page.tsx` and `api/team/route.ts` now filters `user: { role: { not: "SUPER_ADMIN" } }`. George never appears in team lists even if memberships exist.
- **Activity feed** — `api/activity/live-feed/route.ts` filters `visibleActivities` by excluding SUPER_ADMIN role. George's actions never appear in the war room dashboard feed.
- **Team UI** — `SUPER_ADMIN` removed from the `ROLES` array in `team-client.tsx`. Campaign managers can no longer see or assign the platform operator role.
- **Build fixes (pre-existing, now resolved):**
  - `CampaignType` in `dashboard-studio.tsx` — added `"nomination"` and `"leadership"` to the union
  - `import-pipeline.ts` — `ParseAndMapResult.mappedRows` interface updated to match actual `{ mapped, rawRow, idx }` structure
  - `stripe/subscription/route.ts` — `items` array cast moved to outer level to fix Stripe SDK discriminated union error
  - `next.config.js` — `workerThreads: false, cpus: 1` added to kill Windows NTFS race condition during build. **This is permanent — Vercel builds are now stable.**

**Vercel:** `d27336f` is green and Current.

---

## PREVIOUS SESSION (2026-04-16 — Security settings + Import hardening)

**What shipped — commits c5a4a51, ad628fb, b106236, 36a5414, 685f8c3:**

### /settings/security — DONE (Sprint 1 complete)
- **2FA (TOTP)** — QR code setup, backup codes (10 single-use), disable flow. `src/lib/auth/totp.ts`
- **WebAuthn / biometrics** — register + delete passkeys. `/api/auth/webauthn/register`
- **Active sessions** — list all devices with last-seen, revoke individual or all others. `/api/auth/sessions`
- **Login history** — last 20 events with IP + device + success/failure flag. `/api/auth/security-events`
- **API keys** — generate (shown once), revoke, list with last-used. `/api/auth/api-keys`
- **PIPEDA data export** — full JSON export of everything Prisma has on the user. `/api/auth/data-export`

### Import hardening — all 4 items done
- **Data Cleaning panel** (transforms) — collapsible Step 2 panel in Smart Import Wizard. Auto-clean toggles (trim, upper, title case, phone/postal format), split rules, merge-column rules, find-replace rules, before/after live preview. Pipeline in `src/lib/import/import-pipeline.ts`.
- **Download failed rows as CSV** — `/api/import/failed-rows?importLogId=&campaignId=` returns attachment CSV with row_number + error + all raw columns. Import history table now shows count + download icon.
- **Merge strategy enforcement** — previously a UI choice that was silently ignored. All 4 modes now enforced in `src/lib/import/background-processor.ts`: `skip` (no write), `update` (overwrite), `update_empty` (fill nulls only), `create_all` (always insert).
- **Merge conflict preview** — Step 3 of wizard shows up to 10 field-by-field diffs between incoming row and existing contact, with amber badges for changed fields and green values for what will be updated.

### Pre-existing Stripe SDK v22 type fixes
- `subscription/route.ts` — `product_data` inline cast → `as unknown as Stripe.SubscriptionCreateParams["items"]`
- `stripe/webhook/route.ts` — `SubWithPeriod` cast → `as unknown as SubWithPeriod`

**The session before this (2026-04-16 — /eday full build):**
Commit `3cd4b3f` — /eday role-aware command center (CM: Command/Strike-Off/Rides/Polls tabs) + scrutineer OCR.

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
| /settings/security — 2FA, WebAuthn, sessions, API keys, PIPEDA export | ✓ LIVE | c5a4a51 |
| Import hardening — transforms, failed-rows CSV, merge strategy, conflict preview | ✓ LIVE | c5a4a51 |
| /briefing — daily AI briefing | ✓ LIVE | c110dc2 |
| /ai-assist — Adoni in-app page | ✓ LIVE | 108e504 |
| Demo + guided tour | ✓ LIVE | 7494b12 |
| /coalitions | ✓ LIVE | 7ee982f |

### Sprint 1 — still PENDING (customer-facing, do these first)

| Route | What's missing |
|---|---|
| `/settings/security` | ✓ DONE — 2FA, WebAuthn, sessions, API keys, PIPEDA export |
| `/settings/brand` | Full colour picker, logo upload, font selector, preview |
| `/eday` | ✓ DONE — CM command center + scrutineer OCR |
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
Platform isolation audit complete (2026-04-17). George (SUPER_ADMIN) is now invisible
to campaign users — team lists, activity feeds, task records, finance records all clean.
Build stable on Windows: workerThreads: false + cpus: 1 in next.config.js. Vercel green.

Read WORK_QUEUE.md. Next Sprint 1 priority:

1. /settings/brand — 377 lines, incomplete. Full colour picker (primary/secondary/accent),
   logo upload (store URL), font selector (system fonts), live preview of campaign brand.
   Writes to Campaign model fields. Auth: apiAuth + membership guard. Build it fully.

2. /polls/[id]/live — 99 lines only. Real-time result stream, party breakdown,
   demographic splits, share controls. Claim it in WORK_QUEUE.md first.

Pick one, claim it, run npm run build before pushing.
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
