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
- **Trust but verify:** if the brief claims something is \"already built,\" the agent must first verify it exists in the repo before proceeding. If the claim is stale/false, the agent must explicitly note the mismatch in the DONE/FAILED summary.
- Before implementing, the agent must run a quick existence check (`git grep`, file reads, route checks) for all claimed baseline components.
- DONE summaries must include a short **Claim Verification** block (claim → command used → verdict). No unsupported \"already built\" claims.

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

## [PENDING] 2026-04-25 07:33 — Sync Codex canvasser backend + Expo Go handoff
Read and execute this exactly:

1) First, read these files to understand exactly what Codex built in the latest backend pass:
- `docs/CANVASSER_BACKEND_AUDIT.md`
- `docs/CANVASSER_BACKEND_RELEASE_REPORT.md`
- `src/lib/canvasser/context.ts`
- `src/lib/canvasser/service.ts`
- all routes under `src/app/api/canvasser/**`
- new enums/models in `prisma/schema.prisma` under the `CANVASSER APP V1 — BACKEND FOUNDATION` section

2) Validate backend locally (use your normal environment with package access):
- `npx prisma format`
- `npx prisma migrate dev -n canvasser_backend_foundation`
- `npx prisma generate`
- run tests/type/build gates per push-guard

3) Then wire mobile app screens to these backend endpoints so George can run in Expo Go:
- Mission list -> `GET /api/canvasser/missions`
- Mission detail/current stop -> `GET /api/canvasser/missions/[missionId]` + `/current-stop`
- Door actions -> stop complete/skip/note routes
- Voter outcome -> `/api/canvasser/voters/[personId]/outcome`
- Sign request -> `/api/canvasser/sign-requests`
- Volunteer lead -> `/api/canvasser/volunteer-leads`
- Adoni flow -> transcript -> parse -> execute
- Offline queue upload -> `POST /api/canvasser/sync` and status route

4) Expo Go goal for this handoff:
- George should be able to open the canvasser app in Expo Go
- Start mission
- complete/skip/note a door
- submit sign request + volunteer lead
- run Adoni parse/confirm flow
- see offline queue status + sync results

5) Keep strict tenant/security behavior:
- campaign scope on every request
- no cross-campaign leakage
- no Adoni execute without explicit confirmation IDs

6) When done, update this block to `[DONE HH:MM]` and include:
- commit hashes
- what mobile screens were wired
- exact Expo command George should run
- any blockers still preventing full demo path
