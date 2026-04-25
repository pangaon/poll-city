# Agent Environment Bootstrap (Claude/Codex Never-Forget Startup)

Purpose: ensure any agent session reads the right project context before making claims.

## Required startup sequence (every session)

1. Open repo root and read:
   - `CLAUDE.md`
   - `docs/CANVASSER_NON_FORGET_CHECKLIST.md`
   - `docs/PUSH_DEPLOY_AUTOPILOT.md`
   - `docs/CANVASSER_TYPING_TASK_STATUS.md`
   - `docs/CLAIM_VERIFICATION_LOG.md`
2. Confirm current branch + last 5 commits.
3. Confirm working tree is clean or report modified files.
4. Report status in this template before coding:
   - Done by agent (from prior session)
   - Needs George action
   - Live status
   - Active risks

## Guardrail

If any of the files above were not read, the session is considered uninitialized.
Do not claim completion or deployment from an uninitialized session.

## End-of-session check

Before finishing:
- update task status docs if scope changed,
- commit changes,
- run push/deploy autopilot protocol,
- publish explicit live status.
