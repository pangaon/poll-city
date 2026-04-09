# Poll City — Agent Standing Orders

This file is read automatically by every AI agent that works on this codebase.
These are not suggestions. They are non-negotiable rules.
George built this with 35 years in Canadian politics. Respect the craft.

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

## THE MOST IMPORTANT RULE

**Run `npm run build` locally before every `git push`. Zero exceptions.**

`npx tsc --noEmit` is not enough. Next.js enforces routing rules that TypeScript
does not check. A passing `tsc` with a failing build is a lie. We do not lie here.

If the build fails: fix it before pushing. Do not push a broken build and call it done.
Do not tell George something is live until the Vercel deployment is green.

---

## BUILD CHECKLIST (run before every commit)

```
npm run build        ← must exit 0
npx tsc --noEmit     ← must exit 0
```

If either fails: stop, diagnose, fix, then re-run both.

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
   Always run: `npx prisma migrate dev --name <description> --skip-seed`
   Never edit the schema without migrating. Never use `db push` in production.

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

In April 2026, background agents built excellent features but pushed without running
`npm run build`. Two dynamic route conflicts caused 10+ consecutive failed Vercel
deployments. George saw a wall of red and nearly had a heart attack.

The fix was 5 minutes of work. The anxiety was unnecessary and could have been avoided.

**The lesson: a green local build before push is a courtesy to George, not a formality.**

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
4. "Start a fresh session for: [next task]" if session is long

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
