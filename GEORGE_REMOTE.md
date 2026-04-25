# George's Remote Instructions

This file is checked every 20 minutes by an autonomous agent running on George's machine.

Write one instruction block below. The agent picks up the first `[PENDING]` block it finds,
executes the full task, pushes the result, and marks it done.

## How to write an instruction (from your phone)

```
## [PENDING] YYYY-MM-DD HH:MM — brief title
Your full instructions. Can span multiple lines.
Include file paths, code snippets, anything the agent needs.

Example code:
  src/app/(app)/ops/candidates/page.tsx — add a filter dropdown for province

The agent will read CLAUDE.md, SESSION_HANDOFF.md, and all mandatory files
before executing. It follows all push guard rules. It will push when done.
```

Rules:
- One PENDING block at a time. The agent processes the first one it finds.
- Be specific. Include file paths if you know them.
- Include code if you have it — the agent will use it.
- The agent will mark it [DONE] or [FAILED] when finished, with a summary.

---

## Status key

| Status | Meaning |
|---|---|
| `[PENDING]` | Waiting to be picked up |
| `[IN_PROGRESS HH:MM]` | Agent is executing right now |
| `[DONE HH:MM]` | Completed — see summary below |
| `[FAILED HH:MM]` | Failed — see error below |

---

<!-- Add your instructions below this line -->

## [DONE 08:50] 2026-04-25 — Canvasser backend + mobile demo wiring

Built 14 new `/api/canvasser/*` routes (missions, stops, voters, sign-requests, volunteer-leads, adoni parse/execute/transcripts, sync upload + status). No Prisma schema changes — used existing models. Mobile app wired: `mobile/lib/api.ts` + types, canvassing tab now calls `fetchMissions`, door wizard calls `completeStop` + `submitSignRequest` + `submitVolunteerLead`. Adoni parse uses rule-based NLP (no Claude API). Push guard approved. Build green. Nothing manual needed from George.
