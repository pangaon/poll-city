# Push + Deploy Autopilot Protocol (Never Forgotten)

This file is the single runbook for coordinated push/deploy safety.

## Goal

Never forget push/deploy coordination steps.
Never mark work as live unless guard + push + deploy status are explicit.

## Required sequence

1. Commit local changes.
2. Run: `npm run guard:ops` (writes `.push-guard/ops-readiness.json`).
3. Run: `npm run push:manifest`
4. Run push guard protocol and get `.push-guard/approved.json`.
5. Run: `npm run push:safe`
6. Confirm remote branch contains commit.
7. Confirm deployment status (Vercel) for target branch/environment.
8. Report final state using:
   - Done by agent
   - Needs George action
   - Live status (`Not deployed` / `Pushed` / `Deployed`)

## Non-negotiable reporting sentence

Every delivery update must include this exact line:

`Live status: Not deployed / Pushed / Deployed (choose one and include branch + commit hash).`

## Failure handling

If any step fails:
- Stop the sequence.
- Report exact failed command and output summary.
- Do not claim the work is live.

## Optional operational cadence

At end of each session:
- verify current HEAD hash
- verify push guard token freshness (if pending push)
- verify whether deployment has completed
- post one-line final status with timestamp
