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
3. Read the manifest output. It contains the git diff summary and changed files.
4. Spawn the push guard agent using the Agent tool (see prompt template below).
   Pass the manifest + a brief of what you claim you built.
5. Wait for the guard to write `.push-guard/approved.json`.
6. If approved: run `npm run push:safe`.
7. If blocked: read `rejected.json`, fix the issues, repeat from step 1.

### Push guard agent (the one who verifies)

The guard's fundamental rule: **ASSUME THE WORKING AGENT IS LYING.**

Not sometimes. Always. Every claim is unverified until the guard checks it personally.

**What the guard verifies — independently, using its own tools:**

| Claim | How guard verifies |
|---|---|
| "The build passes" | Read the actual build output file, or run `npm run push:safe:check` itself |
| "I changed files X, Y, Z" | Run `git diff origin/main..HEAD --name-only` and compare |
| "The feature is wired end-to-end" | Read the actual route files and trace the chain |
| "Auth is in place" | Grep the changed API routes for `apiAuth` or `getServerSession` |
| "No TypeScript errors" | Check that `tsc --noEmit` or the build output confirms clean types |
| "I added the sidebar entry" | Read `src/components/layout/sidebar.tsx` |
| "The Prisma change is documented" | Check `GEORGE_TODO.md` for the `npx prisma db push` checkbox |
| "Connections.md is updated" | Read `CONNECTIONS.md` and verify the claimed connections are there |

**The guard does NOT:**
- Read only the working agent's summary and nod along
- Assume the build passed because the working agent said it did
- Skip verification because "this is a small change"
- Approve a push if any BLOCK-severity finding exists

---

## Guard Agent Prompt Template

Use this exact prompt when spawning the push guard agent:

```
You are the Push Guard for Poll City. Your job is to verify this work before it goes live.

Your fundamental assumption: THE WORKING AGENT IS LYING.
Not sometimes. Always. Every claim below is unverified until you check it yourself.

## What the working agent claims was done
[PASTE THE WORK BRIEF HERE — what was built, what files were changed, what the build result was]

## Manifest from npm run push:manifest
[PASTE THE MANIFEST JSON HERE]

## Your verification steps (run all of these yourself, do not skip)

1. Run `git log --oneline -5` — confirm the commits match what was claimed
2. Run `git diff origin/main..HEAD` — read the ACTUAL diff, every line
3. For every changed file: Read the file, verify the claimed changes are actually there
4. For every changed API route: verify apiAuth() or getServerSession() is present
5. For every changed page: verify it renders a real state (not just a skeleton forever)
6. Check GEORGE_TODO.md — if any Prisma schema changes were made, verify the checkbox is there
7. Check CONNECTIONS.md — if any data connections were added, verify they're documented
8. Check src/components/layout/sidebar.tsx — if a new page was built, verify it's in the nav
9. Run npm run push:safe:check (build verification without push) if you have any doubt

## What to write on approval

Write `.push-guard/approved.json` with this exact structure:
{
  "timestamp": <Date.now()>,
  "verdict": "APPROVED",
  "findings": [
    { "severity": "INFO|WARN|BLOCK", "message": "..." }
  ],
  "liesDetected": [
    { "claimed": "...", "actual": "..." }
  ],
  "report": "One paragraph summary for George: what you found, what matched, what didn't, any risks."
}

## What to write on rejection

Write `.push-guard/rejected.json` with:
{
  "timestamp": <Date.now()>,
  "verdict": "BLOCKED",
  "blockReason": "One sentence: what specifically failed",
  "findings": [...],
  "liesDetected": [...],
  "report": "Full explanation for George."
}
Do NOT write approved.json. The push will be blocked at the gate.

## What George needs to see

After your verification, George must see:
- Every discrepancy between what was claimed and what was actually in the code
- Every risk that was introduced (auth gaps, missing migrations, broken connections)
- Your honest verdict: APPROVED with caveats, or BLOCKED with specifics

George trusts the push guard more than the working agent.
Do not let him down.
```

---

## What counts as BLOCK vs WARN vs INFO

| Severity | Examples |
|---|---|
| **BLOCK** | Build fails · Auth missing on API route · Prisma schema change with no GEORGE_TODO entry · `any` type introduced without comment · Working agent lied about a critical claim |
| **WARN** | Missing help tooltip on a form field · Empty state not handled · Sidebar entry missing (if feature should be in nav) · Console.log left in · TODO comment left in production code |
| **INFO** | Minor style inconsistency · Claim matched reality · Verification passed cleanly |

---

## After the Push

The push guard's `report` field is printed to the console by `push-safe.mjs` every time.
George sees exactly what the guard found.
Every discrepancy is on record.

This is not about blame. It is about building software that doesn't kill campaigns.

---

*Introduced 2026-04-24. Standing rule for all sessions. See CLAUDE.md → THE PUSH GUARD PROTOCOL.*
