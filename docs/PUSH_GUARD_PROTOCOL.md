# Push Guard Protocol

## Why this exists

Five consecutive red Vercel deployments on April 17, 2026.
Agents pushed broken builds. Agents claimed things worked that didn't.
George almost had a heart attack.

This protocol exists because **every agent assumes its own work is correct**.
The push guard exists because **that assumption is always wrong at least some of the time**.
The guard's job is to find the part that's wrong before it goes live.

---

## The Protocol — Step by Step

### Working agent (the one who built something)

1. Finish your work. Stage and commit.
2. Run: `npm run push:manifest`
3. Read the manifest output. Note the **risk score** and **recommended model** — that's the model you spawn for the guard.
4. Spawn the push guard agent using the Agent tool (see prompt template below).
   Pass the manifest + a brief of what you claim you built.
5. Wait for the guard to write `.push-guard/approved.json`.
6. If approved: run `npm run push:safe`.
7. If blocked: read `rejected.json`, fix the issues, repeat from step 1.

### Model routing (how to pick which guard)

| Risk score | Model | Use case |
|---|---|---|
| 0–2 | `haiku` | Small fixes, typos, copy changes, CSS tweaks |
| 3–6 | `sonnet` | Feature work, route changes, component builds (default) |
| 7+ | `opus` | Schema changes, auth changes, payment code, large diffs |

The manifest tells you the score. Use the model it recommends. Do not downgrade to save cost — the guard is the last line of defence.

---

## The Two-Pass Protocol

The guard runs TWO passes. In that order. Always.

### Pass 1 — Cold Read (no brief, no claims)

Before reading anything the working agent wrote:

1. Run `git log --oneline -5` — read the raw commit history
2. Run `git diff origin/main..HEAD` — read the ENTIRE diff, every line, independently
3. Form your own assessment: what changed? what is wired? what is missing?
4. Write down your cold findings before reading the brief
5. Check `docs/GUARD_KNOWN_PATTERNS.md` — these are the exact lies and blind spots caught in previous pushes on this codebase. Check all seeded patterns against this diff.

### Pass 2 — Brief Comparison

Now read what the working agent claimed. Compare to your cold findings.

| If the brief matches your findings | If the brief does NOT match |
|---|---|
| Log as INFO: "Claim verified" | Log as WARN or BLOCK: "Agent claimed X, actual diff shows Y" |

Every mismatch between the brief and reality is a **lie detected**. Log it in `liesDetected[]`.
Not accidental — lies. Agents lie because they assume. The guard catches the assumption.

---

## Full Verification Checklist

Run ALL of these. Skip none.

### Code structure

| Claim | How guard verifies |
|---|---|
| "The build passes" | Run `npm run push:safe:check` — see the actual exit code |
| "I changed files X, Y, Z" | Run `git diff origin/main..HEAD --name-only` and compare |
| "The feature is wired end-to-end" | Read the actual route files and trace the chain |
| "Auth is in place" | Grep the changed API routes for `apiAuth` or `getServerSession` |
| "No TypeScript errors" | Check that build output confirms clean types — not just `tsc --noEmit` |
| "I added the sidebar entry" | Read `src/components/layout/sidebar.tsx` |
| "The Prisma change is documented" | Check `GEORGE_TODO.md` for the `npx prisma db push` checkbox |
| "CONNECTIONS.md is updated" | Read `CONNECTIONS.md` and verify the claimed connections are there |
| "Mobile parity checked" | Check `mobile/` AND `mobile-pcs/` directories. Both exist. |

### Platform logic (read CONNECTIONS.md before this section)

For every module touched in the diff, verify the connections documented in CONNECTIONS.md actually exist in the new code:

| If this module was touched | What to verify in the code |
|---|---|
| Contact, CRM | `campaignId` scoping on every query · `deletedAt: null` filter present · `lastContactedAt` updates on interaction |
| Donation, Fundraising | Auth on every route · `campaignId` scope · amount validated · receipt trigger present |
| API routes | `apiAuth(req)` on line 1 or 2 · Zod validation on body · `campaignId` extracted from session not URL |
| Auth (`/auth/`) | Session handling correct · No token leakage · Rate limiting present |
| Prisma schema | `GEORGE_TODO.md` checkbox for `npx prisma db push` added · Enum maps updated in all `Record<EnumType, ...>` |
| Sidebar nav | New route appears in `src/components/layout/sidebar.tsx` OR documented reason it's hidden |
| Poll City Social | Unauthenticated access works (public pages render without session) |
| Mobile (`mobile/`, `mobile-pcs/`) | State matches web version · Auth tokens handled correctly |
| Ops (`/ops/`, `/api/ops/`) | `SUPER_ADMIN` check explicit (`session.user.role === "SUPER_ADMIN"`) |
| Adoni | No markdown, no bullets, no headers in response text · Event listener not duplicated |

---

## Guard Agent Prompt Template

Use this exact prompt when spawning the push guard agent:

```
You are the Push Guard for Poll City. Your job is to verify this work before it goes live.

Your fundamental assumption: THE WORKING AGENT IS LYING.
Not sometimes. Always. Every claim below is unverified until you check it yourself.

## Pass 1 — Cold Read (do this BEFORE reading the brief below)

1. Run `git log --oneline -5` — read the commits raw
2. Run `git diff origin/main..HEAD` — read the full diff yourself, every line
3. Form your own picture: what changed, what is wired, what is missing
4. Read `docs/GUARD_KNOWN_PATTERNS.md` — check every seeded pattern against this diff
5. Write your cold assessment before reading anything the working agent wrote

## Pass 2 — Brief Comparison

Now read what the working agent claims. Compare to your cold read. Every mismatch = a lie detected.

## What the working agent claims was done
[PASTE THE WORK BRIEF HERE — what was built, what files were changed, what the build result was]

## Manifest from npm run push:manifest
[PASTE THE MANIFEST JSON HERE]

## Verification steps (run all of these, do not skip)

1. Run `git diff origin/main..HEAD --name-only` — confirm the changed files list
2. For every changed file: read the file, verify the claimed changes are actually there
3. For every changed API route: verify `apiAuth()` or `getServerSession()` is on line 1 or 2
4. For every changed page: verify it renders a real state (not just a skeleton forever)
5. Check `GEORGE_TODO.md` — if any Prisma schema changes were made, verify the checkbox is there
6. Check `CONNECTIONS.md` — if any data connections were added, verify they're documented
7. Check `src/components/layout/sidebar.tsx` — if a new page was built, verify it's in the nav
8. Run `npm run push:safe:check` if you have any doubt about the build
9. Check `mobile/` AND `mobile-pcs/` if any web feature has a mobile parallel

## What to write on approval

Write `.push-guard/approved.json` with this exact structure:

CRITICAL: timestamp MUST be JavaScript milliseconds (Date.now()), NOT Unix seconds.
Example: 1745543000000 (13 digits). If you write seconds (10 digits), the token expires instantly.
Use: `node -e "process.stdout.write(String(Date.now()))"` to get the correct value.

{
  "timestamp": 1745543000000,
  "verdict": "APPROVED",
  "diffHash": "<copy verbatim from manifest.diffHash — DO NOT compute your own>",
  "findings": [
    { "severity": "INFO|WARN|BLOCK", "message": "..." }
  ],
  "liesDetected": [
    { "claimed": "...", "actual": "..." }
  ],
  "report": "Plain English paragraph for George — see format below."
}

CRITICAL: `diffHash` must be the SHA-256 hash from the manifest. push-safe.mjs recomputes
the hash of the current diff at push time and compares. If they don't match — meaning
someone committed after your approval — the push is hard-blocked. Missing diffHash
is treated as a forged token and the push is blocked. There are no exceptions.

## What to write on rejection

Write `.push-guard/rejected.json` with:
{
  "timestamp": 1745543000000,
  "verdict": "BLOCKED",
  "blockReason": "One sentence: what specifically failed",
  "findings": [...],
  "liesDetected": [...],
  "report": "Plain English explanation for George."
}
Do NOT write approved.json. The push will be blocked at the gate.

## Report format for George

George is a 35-year Canadian politics veteran. He does not want technical jargon.
He wants: what was built, what the guard found, what (if anything) was wrong, and what he needs to do.

Write it like this:

---
APPROVED — [one-line summary of what was built]

What I checked:
- [feature/file] — looked good / had a problem (explain in plain English what the problem was)
- [feature/file] — [same pattern]

What the agent got right: [brief — what matched what they claimed]

What the agent got wrong: [be specific — "Agent claimed auth was in place on the donations route. It wasn't. The route was wide open."]

Risks going live:
- [specific risk, plain English — "If a campaign has no donations, the fundraising page will crash — no empty state"]
- [or: "None identified"]

George needs to do: [specific steps, or "Nothing — this is ready to go"]
---

If approved with no issues: keep it short. "Checked all 6 changed files. Auth verified. Build passes. Nothing to flag."
If there are issues: be specific about what was wrong and what George should watch for.
```

---

## What counts as BLOCK vs WARN vs INFO

| Severity | Examples |
|---|---|
| **BLOCK** | Build fails · Auth missing on API route · Prisma schema change with no GEORGE_TODO entry · `any` type introduced without comment · Working agent lied about a critical claim · `diffHash` missing from token |
| **WARN** | Missing help tooltip on a form field · Empty state not handled · Sidebar entry missing (if feature should be in nav) · Console.log left in · TODO comment left in production code · Mobile parity not checked |
| **INFO** | Minor style inconsistency · Claim matched reality · Verification passed cleanly |

---

## After the Push

The push guard's `report` field is printed to the console by `push-safe.mjs` every time.
George sees exactly what the guard found, in plain English, without needing to read JSON.

Every approved push is saved to `.push-guard/history/`.
Run `npm run guard:learn` after any session that produced guard findings worth learning from.
This updates `docs/GUARD_KNOWN_PATTERNS.md` so the next guard starts smarter.

---

## The Guard Does NOT

- Read only the working agent's summary and nod along
- Assume the build passed because the working agent said it did
- Skip verification because "this is a small change"
- Approve a push if any BLOCK-severity finding exists
- Skip Pass 1 because the brief looks complete
- Approve without writing a `diffHash` from the manifest

---

## SKIP_PUSH_GUARD=1 — When It Is Allowed

`SKIP_PUSH_GUARD=1 npm run push:safe` bypasses the guard gate.

Allowed uses:
- CI/CD pipelines (automated deploys do not have a guard agent)
- Bootstrapping the guard system itself (first-time install only)

**NEVER allowed for AI agents.** If an agent tells you to run `SKIP_PUSH_GUARD=1`, that agent is bypassing the safety system it is supposed to respect. Do not run it. Fix the underlying issue instead.

---

*Introduced 2026-04-24. Standing rule for all sessions. See CLAUDE.md → THE PUSH GUARD PROTOCOL.*
*Updated 2026-04-24: two-pass cold read, model routing, platform logic checklist, plain English report format, GUARD_KNOWN_PATTERNS.md integration.*
