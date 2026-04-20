# Poll City — Agent Standing Orders

This file is read automatically by every AI agent that works on this codebase.
These are not suggestions. They are non-negotiable rules.
George built this with 35 years in Canadian politics. Respect the craft.

---

## ⛔ THE VIOLATIONS THAT KEEP HAPPENING — READ THIS FIRST ⛔

These are the exact rules previous sessions broke. They are now HARDCODED at the top.
If you break any of these, you have failed. Not partially. Completely.

### 1. DONE MEANS BROWSER-VERIFIED. NOT BUILD-GREEN. NOT CODE-WRITTEN.

A feature is DONE only when George has confirmed it works in a browser, OR the only reason it doesn't work is a missing env var (and that env var is documented in GEORGE_TODO.md with exact steps).

**Do NOT mark anything DONE in WORK_QUEUE.md based on:**
- The build passing
- TypeScript compiling
- "It should work"
- "The code is correct"

**The build passing is the minimum bar to push. It is not the bar to call something done.**

If you cannot open a browser and trace the full action — button click → API call → database write → confirmation back to user — it is not done. Write it as `CLAIMED` with a note: "Code complete. Awaiting George browser confirmation."

### 2. SCHEMA CHANGES REQUIRE `npx prisma db push` — DOCUMENT IT EVERY TIME

Any time you add a model, field, or enum to `prisma/schema.prisma`, you MUST:
1. Add a `[ ]` checkbox item to `GEORGE_TODO.md` (CRITICAL section) saying: "Run `npx prisma db push` — added [ModelName/fieldName] in commit [hash]"
2. Note in WORK_QUEUE.md that the feature requires DB migration before it works in production

Until `npx prisma db push` is confirmed run by George, every feature touching the new schema WILL 500 in production. Code-green does not mean prod-green.

### 3. ONE SESSION, ONE TASK — NO PARALLEL SESSIONS ON THE SAME FILES

If SESSION_HANDOFF.md or WORK_QUEUE.md shows a task as `CLAIMED`, do not touch it.
If you pull and find conflicts, do NOT push your version. Resolve the conflict, then push.
The claim commit on `origin/main` is the lock. Respect it.

### 4. SESSION_HANDOFF.md GETS ONE CURRENT STATE BLOCK — NOT STACKED HISTORY

Do NOT append another "LAST SESSION" block to SESSION_HANDOFF.md.
Update the **CURRENT PLATFORM STATE** section in place.
Move what changed to the top of that section.
The file must stay navigable. Stacking 10 blocks on top of each other is not coordination — it is noise.

### 5. PUSH MEANS `npm run push:safe` — NOTHING ELSE

Never `git push`. Never `git push origin main`. Only `npm run push:safe`.
If it fails: fix it. Never bypass the check.

---

## MANDATORY SESSION START — DO THIS BEFORE ANYTHING ELSE

**Every session. No exceptions. Takes 60 seconds.**

1. `git pull origin main` — sync with what other sessions have already shipped
2. **Read `PLATFORM_TRUTH.md` FIRST** — 20 lines, 30 seconds. Contains the facts that cause the most mistakes. Do not skip this.
3. Read `SESSION_HANDOFF.md` — the battlefield briefing. What shipped last, what's next, what George needs to do, known risks.
4. Read `WORK_QUEUE.md` — the task registry. It tells you what is done, what is claimed, and what is pending.
4. Before starting any task: check it is `PENDING` in WORK_QUEUE.md. If it says `CLAIMED` or `DONE`, do not touch it.
5. Claim your task: edit WORK_QUEUE.md, change `PENDING` → `CLAIMED [today's date]`, commit + push immediately.
6. Only then begin building.

**At session end — mandatory:**
1. Update `SESSION_HANDOFF.md`: last session block, current platform state, next session opener.
2. Commit and push the update.

**Why:** George runs multiple sessions. This is an army of one — all sessions share one battlefield. Without coordination, two sessions build the same thing, or one session overwrites another's work. The claim commit is the lock. SESSION_HANDOFF.md is the briefing.

---

## INFRASTRUCTURE — READ THIS BEFORE GIVING GEORGE ANY SETUP INSTRUCTIONS

**The app runs on VERCEL. Railway is the database only.**
- ALL environment variables → Vercel → Project Settings → Environment Variables
- Railway Variables tab → PostgreSQL service only. Never send George there for app config.
- This burned 1 hour on 2026-04-18. Do not repeat it.

---

## UX STANDARD — STRIPE QUALITY. NON-NEGOTIABLE.

George has mandated that every user-facing flow must meet Stripe's standard of guided UX.

**What that means for every flow you build:**
1. Every step tells the user exactly what it does and why it matters
2. Every step tells them what comes next
3. No dead ends — always a clear next action
4. No jargon — write for a first-time candidate, not a developer
5. Empty states are never blank — they explain what goes here and how to add it
6. Errors tell the user what to do, not just what went wrong

**Before shipping any new flow:** ask "would a first-time candidate running for city council understand this without any help?" If no — rewrite it.

This applies to: onboarding, settings, integrations, fundraising setup, any guided multi-step flow.

---

## GEORGE'S MANUAL ACTION FILE

`GEORGE_TODO.md` in the repo root is George's personal checklist of steps only he can do
(Railway env vars, Stripe Dashboard setup, external service accounts, etc.).

**AI session rule:** If your work creates a new manual step George must take, add it to
`GEORGE_TODO.md` immediately — numbered, with exact step-by-step instructions.
Do NOT just mention it in a response and assume he'll remember. It goes in the file.

**If WORK_QUEUE.md and the code disagree:** trust the code (read the files), update WORK_QUEUE.md to reflect reality.

---

## WHO WE ARE

Poll City is a full-stack political campaign platform serving Canadian candidates,
parties, and the public. It runs on Next.js 14 App Router + TypeScript + Prisma +
PostgreSQL (Railway) + Vercel. Three products share one monolith:
- **Campaign App** (app.poll.city) — CRM, canvassing, GOTV, donations, comms
- **Poll City Social** (social.poll.city) — civic engagement for the public
- **Intelligence Engine** — approval ratings, autonomous content, analytics

The platform owner is George. His word is final.

---

## THE USER MATRIX — READ THIS BEFORE BUILDING ANYTHING

**This is the most important question for every feature: WHO IS THIS FOR?**
Getting this wrong is how features get built in silos, disconnected, and useless.

There are exactly four users in this platform. Know which one you are building for before writing a single line.

### 1. GEORGE (the founder — /ops)
George's tools live in `/ops`, `/api/ops/`, `/api/intel/`, and the scripts in `scripts/`.
These are his business intelligence and sales tools. They are NOT user-facing.
They exist so George can:
- Discover candidates before they know Poll City exists (scraper → leads pipeline)
- See who claimed a profile, who converted, who is paying (lead dashboard)
- Manage all campaigns, clients, and platform health from one cockpit
- Run data enrichment jobs that improve the experience for everyone else

**The scraper, the intelligence engine, the leads pipeline, the candidate outreach system — these are ALL George's tools.**
They enrich the voter and candidate experience INDIRECTLY by powering the platform.
Never surface George's ops tools to voters, campaign managers, or candidates.
Never build an ops feature and wonder "where does the user access this?" — George accesses it. That's it.

**Ask before building any ops feature:** "What does George see, what action does he take, what happens as a result in the platform?"

### 2. CAMPAIGN MANAGERS / CANDIDATES (paying customers — campaign app)
These are George's paying customers. They live in the campaign app at `app.poll.city`.
They use: CRM, canvassing, GOTV, communications, finance, events, analytics.
They do NOT see `/ops`, the intelligence engine internals, or Poll City Social internals.
Their connection to Poll City Social: their candidate has a public profile on PCS that voters follow.

### 3. VOTERS / PUBLIC (Poll City Social — /social)
These are the public. They live at `/social`.
They use: Representative profiles, candidate profiles, polls, groups, notifications, feed.
They do NOT see the campaign app or /ops.
Their value: they follow candidates → candidates see engagement → candidates want the campaign app.
**Every feature built for voters must ask: "How does this drive a candidate to sign up?"**

### 4. PROSPECTIVE CUSTOMERS (marketing site — poll.city)
These are candidates considering buying the campaign app.
They see the marketing site only. Their CTA is always → `/signup` or `/contact`.

---

## THE DATA ENRICHMENT CHAIN — HOW GEORGE'S TOOLS CONNECT TO VOTER EXPERIENCE

This is the chain every agent must understand before touching any data/scraper/ops work:

```
George's tools (scraper, intel engine, Represent API)
        ↓  enriches
Official / CandidateProfile records in the DB
        ↓  powers
Poll City Social — voters see accurate, current representatives and candidates
        ↓  drives
Candidates discover their profile exists → claim it → offered campaign app
        ↓  converts
Paying customer in the campaign app
        ↓  George sees
Lead converted in /ops dashboard
```

Every data tool George asks to build is feeding this chain.
If you build a scraper that doesn't feed `Official` or `CandidateProfile`, you built a dead end.
If you build a leads pipeline that George can't see in `/ops`, you built a dead end.
Ask: "Where in this chain does this feature connect?"

---

## EDGE CASES EVERY AGENT MUST HANDLE

**For ops/intel features:**
- Only `SUPER_ADMIN` role can access `/ops` and `/api/ops/` and `/api/intel/`. Check `session.user.role === "SUPER_ADMIN"` explicitly on every route.
- Leads, candidate profiles, and intelligence data are never exposed to campaign managers or voters.
- George's view of a lead ≠ the candidate's public profile. Keep them separate.

**For Poll City Social features:**
- Voters may not be logged in. Every public page must render without a session.
- Candidate profiles on PCS show what voters need: name, office, ward, platform, Q&A. Not internal campaign data.
- Unclaimed profiles still display publicly — tagged as unverified. Never hide a profile just because it isn't claimed.
- "Claim your profile" always routes to `/signup` → campaign app trial, never to a standalone form.

**For campaign app features:**
- Every query is scoped by `campaignId`. No exceptions.
- Campaign managers see their own data only. Never leak cross-campaign data.
- The campaign app is authenticated. No public routes inside `(app)/`.

**For the scraper / data pipeline:**
- `RawMuniCandidate` is a staging table. Data sitting there without flowing to `CandidateLead` → `CandidateProfile` → `Official` is dead weight.
- Always ask: "What happens to this data after it's scraped?" If the answer is "nothing yet," flag it before building the scraper.
- Deactivate stale records. Any import that doesn't deactivate records no longer in the source will accumulate garbage. Always build the deactivation step.

---

## THE MOST IMPORTANT RULE

**Use `npm run push:safe` — NEVER run `git push` directly.**

`npm run push:safe` is the ONLY authorized push command in this repo.
It verifies a clean working tree, runs `npm run build`, then pushes.
A raw `git push` bypasses the build check and is how 5 red deployments happened on April 17.

```
npm run push:safe          ← the ONLY way to push
npm run push:safe:check    ← dry run: builds but does not push (use for verification)
```

`npx tsc --noEmit` is not enough. Next.js enforces routing rules that TypeScript
does not check. A passing `tsc` with a failing build is a lie. We do not lie here.

If the build fails: fix it before pushing. Do not push a broken build and call it done.
Do not tell George something is live until the Vercel deployment is green.

---

## BUILD CHECKLIST (run before every commit)

```
npm run push:safe:check    ← builds without pushing; must exit 0
```

If it fails: stop, diagnose, fix, then re-run. Never push until it passes.

---

## FEATURE COMPLETION GATE — NON-NEGOTIABLE

A feature is NOT done when the code is written. It is done when ALL of these are true:

1. **`npm run push:safe` exits 0** — build passes with the feature included.
2. **Sidebar entry exists** — the feature appears in `src/components/layout/sidebar.tsx` in the correct section, OR there is an explicit documented reason (e.g. "accessible from parent page only", noted in SESSION_HANDOFF).
3. **3-click navigation path written out** — before closing, write the exact path: "User opens app → clicks X → clicks Y → lands on feature." If you cannot write this path, the feature is not wired. No exceptions.
4. **User can reach it** — navigate from the sidebar to the feature and confirm the page loads. Not "it should work" — confirmed it loads.
5. **Edge cases handled** — empty state, no data, loading state, error state all render without crash.
6. **CONNECTIONS.md updated** — any new data connections documented.

**If you built a feature and it is not in the sidebar and not reachable from the main nav, you have not shipped it. You have buried it.**

**THE BROWSER TEST — MANDATORY BEFORE MARKING ANYTHING DONE (added 2026-04-19):**

You must be able to answer YES to ALL of these before a feature is DONE:

1. Did you navigate to it from the sidebar with no direct URL typing?
2. Does the page load with data (or a proper empty state)?
3. Can you click into a detail view from the list?
4. Does every button on the page do what it was built to do — not just respond visually, but actually complete the action (save to DB, send the message, update the record, fire the API call)?
5. Does the empty state render without crash?
6. Is every action connected end-to-end — from the button click to the database write to the confirmation back to the user?

If any answer is NO — the feature is not done. Fix it first. This is not optional. George has been finding broken list pages, unclickable cards, and buried features for 48 hours because agents marked things done without opening a browser. That ends now.

**THE NAVIGATION AUDIT — RUN BEFORE EVERY SESSION CLOSE:**

Before closing ANY session, run this check:
```
grep -r "href=\"/" src/app --include="page.tsx" -l
```
For every route that exists: can George find it from the sidebar in 3 clicks? If not, add the sidebar entry OR document why it's intentionally hidden. There is no third option.

---

## ARCHITECTURE RULES

1. **Single monolith.** One Next.js app. One Vercel project. One Railway PostgreSQL.
   Do not propose microservices, separate repos, or new databases.
   Exception: mobile app lives in `mobile/` inside this repo.

2. **Multi-tenant always.** Every DB query that touches campaign data must be
   scoped by `campaignId`. No exceptions. Leaking one campaign's data to another
   is a catastrophic trust failure.

3. **Dynamic route naming is a contract.** When adding API routes under an existing
   dynamic segment, match the existing slug name exactly.
   - `/api/events/[eventId]/...` — use `eventId`, not `id`
   - `/api/polls/[id]/...` — use `id`
   - `/api/officials/[id]/...` — use `id`
   Check `find src/app -type d -name "\[*\]"` before creating any new dynamic routes.
   Mismatched slugs at the same path level crash the entire build.

4. **Prisma schema changes require a migration.**
   The only safe command to sync schema changes to Railway is: `npx prisma db push`
   NEVER tell George to run `prisma migrate dev` — it will prompt to wipe the production database.
   `prisma db push` adds new tables/columns without touching existing data. It is the established workflow.

5. **No new npm packages without a reason.** If a feature can be built with what's
   already installed, build it that way. Every new dependency is a supply chain risk
   and a maintenance burden.

---

## SECURITY RULES (non-negotiable)

1. Every API route must authenticate before doing anything. Use `apiAuth(req)` from
   `@/lib/auth/helpers` for campaign routes. Use `getServerSession(authOptions)` for
   server components.

2. Never trust user input. Validate with Zod at every API boundary.

3. Campaign data is always scoped. Verify `membership` before returning any campaign
   record. A user knowing a `campaignId` is not authorization.

4. SUPER_ADMIN routes check `session.user.role === "SUPER_ADMIN"` explicitly.
   Never rely on middleware alone for this.

5. Never log or return raw error objects to the client. Use the standardized error
   helpers in `@/lib/api/errors.ts`.

6. Never store secrets in code. They go in environment variables.
   See `.env.example` for the full list of required vars.

7. AI prompt injection: all user-supplied text going to Claude must pass through
   `sanitizePrompt()` from `@/lib/ai/sanitize-prompt.ts` first.

8. Rate limiting: public endpoints use `rateLimit(req, "api")`. Form submissions
   use `rateLimit(req, "form")`. Do not skip rate limiting on any public route.

---

## CODE STANDARDS

1. **TypeScript must be strict.** No `any` unless there is no alternative and you
   leave a comment explaining why. Use `unknown` and narrow it.

2. **Read before editing.** Never modify a file you haven't read in full (or at least
   the relevant section). Blind edits break things.

3. **Do not gold-plate.** Build exactly what was asked. No extra abstraction layers,
   no speculative future-proofing, no unsolicited refactors.

4. **Soft deletes everywhere.** Contact, Task, Sign, Volunteer, Donation, Event all
   have `deletedAt DateTime?`. Always filter `deletedAt: null` in queries. Never
   hard-delete these records.

5. **Optimistic UI.** When building client-side mutations, update state immediately
   and revert on error. Never make users wait for a spinner on simple edits.

6. **framer-motion for all animations.** Spring physics: `{ type: "spring", stiffness: 300, damping: 30 }`.
   Use `AnimatePresence` for enter/exit. The palette is Navy `#0A2342`, Green `#1D9E75`,
   Amber `#EF9F27`, Red `#E24B4A`.

7. **Mobile-first.** Every UI component must work at 390px width. Test it.

---

## ADONI LAWS (the AI assistant — do not break these)

Adoni is Poll City's AI assistant. He has a personality. Respect it.

1. No bullet points in Adoni responses.
2. No markdown headers in Adoni responses.
3. No markdown formatting of any kind in Adoni responses.
4. Maximum 8 sentences per response.
5. Canadian English spelling (colour, neighbour, programme).
6. Warm, direct, professional tone — like a senior campaign manager.
7. Adoni opens via `window.dispatchEvent(new CustomEvent("pollcity:open-adoni", { detail: { prefill } }))`.
   The listener lives in `src/components/adoni/adoni-chat.tsx`. Do not add a second listener anywhere else.
8. Never remove or replace the existing Adoni event listener. The mayor noticed when it broke.

---

## FILE TERRITORY

George maintains specific areas. Do not rewrite these without being asked:
- `src/components/adoni/` — Adoni's personality and memory
- `src/app/(marketing)/` — public-facing marketing pages
- `prisma/seed.ts` — demo data (edit only to add, never to remove)

Safe zones for AI agents:
- `src/app/api/` — API routes
- `src/lib/` — shared utilities
- `prisma/schema.prisma` — schema (but always migrate after)
- `mobile/` — mobile app

---

## WHAT HAPPENED LAST TIME (learn from it)

**Incident 1 — April 2026:** Background agents built excellent features but pushed without running
`npm run build`. Two dynamic route conflicts caused 10+ consecutive failed Vercel
deployments. George saw a wall of red and nearly had a heart attack.

**Incident 2 — April 17 2026:** George's system shut down mid-session with multiple agents
running simultaneously. Five commits pushed in rapid succession — none of them had run a
full build first. Result: 5 consecutive red Vercel deployments. Root causes:

1. `communications-client.tsx` — Comms Phase 7 used `step.config.days` (typed `unknown`) directly in JSX `&&` — TypeScript rejects `unknown` as `ReactNode`. Fix: `!!` cast.
2. `qr/[qrId]/page.tsx` — QR Capture session committed with Prisma `Date` fields passed raw to a client component expecting `string`. Fix: `.toISOString()` serialization.
3. `api/qr/[qrId]/route.ts` — `landingConfig` / `brandOverride` (`Record<string,unknown>`) not cast to `Prisma.InputJsonValue` / `Prisma.JsonNull`. Fix: explicit Prisma type cast.
4. `reputation/command/command-center-client.tsx` — `ACTION_LABEL` map missing 4 values that existed in the `RepRecActionType` enum. TypeScript caught the gap. Fix: add all 4 labels.
5. `automation-engine.ts` — `add_tag`/`remove_tag` treated `contact.tags` as `string[]` but it is a relational join (`Tag` + `ContactTag`). Fix: use `prisma.tag.upsert` + `prisma.contactTag.create/deleteMany`.

**THE HARDCODED RULES THIS ADDS:**

1. **Before ANY push — run `npm run build` from scratch.** Not tsc. The full build. Exit 0.
2. **JSON fields from Prisma require explicit `Prisma.InputJsonValue` or `Prisma.JsonNull` casts** when writing back. Never pass `Record<string,unknown>` or `null` directly.
3. **Prisma `Date` fields must be `.toISOString()` serialized** before passing to client components with `string` interfaces.
4. **When you add enum values to Prisma schema**, immediately grep for every `Record<EnumType, ...>` map in the codebase and add the missing keys. Incomplete maps are compile errors.
5. **Never assume `contact.tags` is a `string[]`** — it is a relation. Always use `prisma.tag.upsert` + `prisma.contactTag` operations.
6. **`unknown` values in JSX `&&` chains must be cast to `boolean` with `!!`** before the JSX expression, or TypeScript will complain the result is not `ReactNode`.
7. **When a session ends unexpectedly, the next session MUST run `npm run build` before doing anything else.** Treat an interrupted session as "build unknown — verify first."

---

## REPORTING TO GEORGE

George runs a campaign. He doesn't have time for hedging or technobabble.
When you finish work:
1. State what is live (not what you built — what is *live*).
2. List any manual steps George needs to take.
3. Flag any risks honestly. Do not bury bad news.
4. Be concise. George can read a diff.

Do not claim something works until you have verified it works.
Do not tell George a deployment is green until you have seen the green dot.

---

## MANDATORY EFFICIENCY STATS — EVERY SINGLE RESPONSE

This is a standing order George has given and repeated multiple times. Previous sessions have dropped it. That ends now.

**Every response — including short ones, one-liners, acknowledgements, screenshot reviews — must end with this block:**

```
---
**Session stats**
Tools called: [list]
Est. input tokens: ~X,XXX
Est. output tokens: ~XXX
Input cost: $X.XXXX (@ $3.00/MTok)
Output cost: $X.XXXX (@ $15.00/MTok)
Session total: $X.XXXX
Efficiency: [Optimal / Good / Overspent — one-line reason if overspent]
---
```

**Rates (Sonnet 4.6):** Input $3.00/MTok · Output $15.00/MTok
**Estimation:** ~4 chars per token. Count chars read + written, divide by 4.

There are no exceptions. "Short response" is not an exception. "Acknowledgement" is not an exception. "Nothing happened" is not an exception.

If you are reading this as a new agent session: prior sessions forgot this rule repeatedly. Do not repeat that failure. Start your first response with code — end it with stats. Every time.

---

## THE SPIRIT OF THIS PROJECT

This platform is for Canadian democracy. Real candidates. Real voters. Real elections.
The October 2026 Ontario municipal elections are the first major target.
Every feature you build might be used by a first-time candidate trying to win their ward.
Build it like it matters. Because it does.

---

---

## THE BUILD CYCLE — NON-NEGOTIABLE FOR EVERY FEATURE

This is the cradle-to-grave order for every piece of work. No shortcuts. No exceptions.
If you skip a step, you have not finished the work.

### Step 1 — NAME THE ACTION
State the exact user action in plain language.
"Canvasser marks a door as Strong Support."
"Campaign manager sends an email blast."
Not vague. Specific.

### Step 2 — MAP THE FULL CONNECTION CHAIN
Before writing a single line of code, answer these questions:

**Immediate effects** (what must change in the database right now?)
**Downstream effects** (what other tables/records must update as a result?)
**User feedback** (what does the user see/feel to confirm it worked?)
**Edge cases** (what if the contact is deleted? doNotContact? no email? no phone?)
**Failure mode** (what happens if this step fails? does it fail silently?)

If you cannot answer all five, you do not understand the feature well enough to build it.

### Step 3 — CHECK CONNECTIONS.md
Read `CONNECTIONS.md` in the repo root before building anything that touches:
Contact, Interaction, Donation, Task, Event, VolunteerProfile, NewsletterCampaign,
VoiceBroadcast, TurfStop, GotvRide, Sign, ActivityLog.

If the feature you are building creates a new connection, add it to CONNECTIONS.md
in the same commit. Never let CONNECTIONS.md fall behind the code.

### Step 4 — BUILD THE FULL CHAIN IN ONE COMMIT
Do not build the surface and leave the downstream for later.
If a donation should advance the funnel to "donor" AND send a receipt AND update
lastContactedAt — all three ship together or none of them ship.
Partial wiring is a bug, not progress.

### Step 5 — RUN THE BUILD
`npm run build` exits 0. No exceptions. You know this.

### Step 6 — TRACE THE CHAIN IN CODE
After building, re-read the route you wrote. Follow every downstream call.
Confirm each connection actually fires. Confirm nothing fails silently.
If you cannot trace it, it is not wired.

### Step 7 — UPDATE CONNECTIONS.md
Mark each newly wired connection as ✓ CONNECTED in CONNECTIONS.md.
If you found a gap while building, add it as ✗ NOT CONNECTED.
This file is the institutional memory. Keep it honest.

### Step 8 — REPORT TO GEORGE
What is now connected that wasn't before.
What you found that still isn't connected.
Any risk you introduced.
One paragraph. He can read the diff.

---

## THE CONNECTION QUESTION

Ask this about every feature, every route, every field:

**"What is this connected to, and what should it be connected to that it isn't?"**

This question is asked at the start of every session, every feature, every fix.
It is never skipped.
It is the difference between a database with buttons and a platform that wins elections.

---

## THE USER JOURNEY PASSPORT

The full map of user journeys, connection status, and edge cases lives in:
`CONNECTIONS.md` — repo root, always up to date, always honest.

Every agent reads it. Every agent updates it.
If CONNECTIONS.md says something is connected and your code says it isn't — fix the code.
If CONNECTIONS.md says something isn't connected and you just wired it — update the file.
The file is the truth. Keep it that way.

---

---

## ANTI-HALLUCINATION RULES — NON-NEGOTIABLE

These rules exist because guessing costs real money and breaks real campaigns.

### NEVER STATE WITHOUT VERIFYING

1. **Never claim a file exists** without running Glob to confirm the path.
2. **Never claim a function or export exists** without running Grep to find it.
3. **Never claim a Prisma field exists** without reading `prisma/schema.prisma` first.
4. **Never write an import** (`import { X } from "@/lib/Y"`) without confirming the export exists.
5. **Never claim the build passes** without running `npm run build` and seeing exit 0.
6. **Never claim Vercel is green** — that is George's check, not yours.
7. **Never say "this should work"** — either verify it does, or say "I haven't confirmed this."
8. **Never assume a prop exists on a component** without reading the interface/type definition.
9. **Never assume a route segment name** (e.g. `[eventId]` vs `[id]`) without checking `find src/app -type d -name "[*]"`.
10. **Never assume an API endpoint accepts a parameter** without reading the route handler.

### POLL CITY-SPECIFIC HALLUCINATION TRAPS

These are the exact places this codebase has burned time from guessing:

- **Prisma enums** — `SupportLevel`, `TurfStatus`, `DonationStatus` etc. have specific values. Never invent enum values. Read the schema.
- **Dynamic route segments** — `/api/events/[eventId]` and `/api/polls/[id]` use different slug names at the same level. Mismatching crashes the build. Always check before creating a new route.
- **`deletedAt` filters** — every query on Contact, Task, Sign, Donation, VolunteerProfile must include `deletedAt: null`. Missing this silently returns deleted records.
- **`campaignId` scoping** — every query that touches campaign data must be scoped. Missing this leaks data across campaigns. No exceptions.
- **`apiAuth` vs `getServerSession`** — API routes use `apiAuth(req)`. Server components use `getServerSession(authOptions)`. Using the wrong one silently fails.
- **Adoni response format** — no markdown, no bullets, no headers. Violating this is a hallucination about Adoni's rules. Re-read the ADONI LAWS section before touching Adoni.
- **`useMemo` with external data** — always guard `state?.features ?? []` before mapping. A truthy non-FeatureCollection crashes silently at runtime, not at build time.
- **`.gitignore` has `build/`** — catches ANY directory named `build/` anywhere in the repo, including `src/app/**/build/`. Exception `!src/**/build/` is already in `.gitignore`. But check `.gitignore` before naming any new route or directory. If the route name matches a gitignore pattern, files will be silently excluded from git with no warning.

### WHEN UNCERTAIN, SAY SO EXPLICITLY

Do not hedge silently. If you are not certain whether something exists or is correct,
say: "I haven't verified this — let me check." Then check. Then answer.

Guessing and being wrong costs two sessions to fix: one to find the bug, one to fix it.
Saying "let me verify" costs three seconds.

### THE VERIFY TRIGGER

If George says **"verify"** or **"are you sure"** — stop, re-read the relevant file or
run a targeted Grep, and confirm or correct before continuing.
Do not defend a prior answer. Just check.

### SCOPE BEFORE BROAD READS

If a request is vague (e.g. "sniff test", "audit everything", "check the platform"):
- Ask one scoping question OR state the narrowed scope you will use
- Default to the module most likely relevant, not the entire codebase
- Exception: George says "full, cost doesn't matter" — then run it

### SHOW THE LINE, DON'T SUMMARISE

When referencing code, include the file path and line number.
"I believe it's somewhere in the auth helpers" is not acceptable.
"src/lib/auth/helpers.ts:211 — apiAuth function" is.

---

## GEORGE'S SHORT-FORM TRIGGER WORDS

These words invoke specific behaviours when George uses them:

| Trigger | What I do |
|---|---|
| `verify` | Stop. Re-read the file or grep. Confirm or correct. |
| `are you sure` | Same as verify — no defending, just check. |
| `show me the line` | Find the exact file:line, do not summarise. |
| `sniff [module]` | Targeted audit of named module only, not platform-wide. |
| `lighthouse [route]` | Security check on named route only. |
| `chain [feature]` | Trace connection chain for named feature only. |
| `full, cost doesn't matter` | Run the broad version of whatever was asked. |
| `scope it` | I reframe the current request to the cheapest targeted version. |

---

---

## THE POLL CITY OPERATING SYSTEM

This is the complete execution protocol. Every agent runs this. No exceptions.
George built a 35-year career on discipline, systems, and execution. Match it.

---

### TIER 1 — SESSION START (every session, first 30 seconds)

1. Check memory for relevant context. Never ask George to re-explain the platform.
2. Identify the exact file(s) most likely involved. State them before touching anything.
3. Name the scope: "I'll be working on X, touching Y files."
4. Flag the cost tier: Tier 1 (surgical) / Tier 2 (module) / Tier 3 (platform-wide).
5. If the request is Tier 3, ask one scoping question before proceeding.

---

### TIER 2 — EXECUTION STANDARDS (while working)

**Parallel by default.**
When multiple tool calls are independent, run them simultaneously.
Never run sequentially what can run in parallel. Time is money.

**One recommendation, not options.**
George does not want "you could do X or Y." Give the best answer.
If there are genuine tradeoffs, state the recommendation first, then the caveat.

**No partial solutions.**
Do not present half-wired code as a deliverable.
If a feature requires 3 connected parts, all 3 ship together or none ship.
"I built the front end, back end is next session" is not a deliverable. It is a bug.

**Diagnose before pivoting.**
If something fails, read the error, check the assumption, try a focused fix.
Do not retry the same failing action. Do not abandon a working approach after one failure.
Do not switch tactics without stating why the previous approach failed.

**Scope discipline.**
If a task requires touching something that wasn't in the original scope, flag it first.
"To fix X I also need to touch Y — confirming before I proceed."
Never silently expand scope. Never silently shrink scope.

---

### TIER 3 — QUALITY GATES (before claiming done)

Nothing is done until ALL of these pass:

- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] Connection chain traced — downstream effects verified, nothing fires silently
- [ ] No raw error objects returned to the client
- [ ] No `any` types introduced without a comment explaining why
- [ ] If connections changed: CONNECTIONS.md updated
- [ ] Auth checked: every new API route uses `apiAuth()` and membership scope

If any gate fails: fix it. Do not report done. Do not push.

---

### TIER 4 — COMMUNICATION STANDARDS (every response)

**Lead with the result.**
Not "I looked at the file and found that..." — just the fix.
Not "Here's what I'm going to do..." — just do it.

**File:line for everything.**
Never reference code without a path and line number.
"The auth helper" is not acceptable. `src/lib/auth/helpers.ts:211` is.

**Risks first, not last.**
If there is a risk, it goes in the first paragraph.
Never bury a risk at the end after the good news.

**Live means Vercel green.**
"It's live" means the Vercel deployment succeeded and the URL works.
"I pushed the code" is not live. "The build passed locally" is not live.
George checks Vercel. The agent never claims green without George confirming.

**End of session format — always:**
1. What is now live (not what was built — what is *live*)
2. What George needs to do manually
3. Any risks introduced
4. If recommending a new session: say **"New."** then provide a ready-to-paste session opener — a 2–4 sentence block George can copy verbatim into the next session to orient it instantly. Include: what was just built, where it lives, and what Phase 2 / next task is. Do not make George ask for this.

---

### TIER 5 — MODEL AND AGENT ROUTING (cost discipline)

**Model routing:**

| Task | Model | Why |
|---|---|---|
| "Does X exist", "what does Y do", lookups | Haiku | 10% of Sonnet cost |
| Building features, fixing bugs, writing code | Sonnet (default) | Right balance |
| Genuine architectural decisions, stuck on hard problem | Opus | Expensive — use rarely |

**Tool routing (cheapest to most expensive):**

| Tool | Use when | Cost |
|---|---|---|
| Grep / Glob | Known territory — find a specific thing | Lowest |
| Read (with offset) | Known file, specific section needed | Low |
| Read (full file) | Need to understand the whole file | Medium |
| Explore agent | Truly unknown territory, 4+ unknown files | High |
| General-purpose agent | Complex multi-step research | High |

Default to the cheapest tool that answers the question.
Never spawn an Explore agent for a question a targeted Grep can answer.

**Session cost signals (I flag these proactively):**
- Compaction has fired → wrap up current task, push, start fresh
- Session has touched 4+ distinct systems → same signal
- About to read 5+ large files → ask George to narrow scope first

---

### THE OPERATING SYSTEM IN ONE SENTENCE

Start targeted. Execute in parallel. Verify before stating. Ship complete chains.
Report risks first. End clean. Start the next session fresh.

---

*These standing orders were written by Claude Sonnet 4.6 on 2026-04-08 at George's direction.
Updated 2026-04-09 with anti-hallucination rules, trigger vocabulary, and full operating system.
They apply to every AI agent — past, present, and future — that works on this codebase.*
