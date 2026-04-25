# Canvasser V1 Field UX Spec (Execution Engine)

## Purpose
This spec defines the **minimum shippable field flow** for Poll City Canvasser V1.

North star:

> **Knock → Talk → Log → Move**

If this core loop is not fast and reliable in real field conditions, V1 is not done.

---

## 1) Reality-first operating constraints
The app must work when the user is:
- outdoors in bright sunlight,
- one-handed,
- interrupted mid-action,
- on unstable/mobile data,
- moving between doors quickly.

Design and engineering decisions should optimize for these constraints first.

---

## 2) Primary Day-1 flow (must be flawless)

Target: **<10 seconds** for the common-case log.

1. App opens directly to assigned turf/next stop.
2. Canvasser taps next household.
3. Canvasser selects one primary outcome:
   - Not Home
   - Support
   - Oppose
4. Optional quick actions:
   - Add note (voice or quick text)
   - Request sign
   - Mark volunteer interest
5. Auto-save and auto-advance to the next stop.

No detours through dashboards, profile pages, or deep forms in the default path.

---

## 3) Non-negotiable UX requirements

### Interaction model
- Tap-first and button-first; typing optional.
- Max 3–5 primary actions visible at once.
- One obvious next action per screen.
- No nested menus for primary logging actions.

### Visual model
- Large thumb targets.
- High contrast for sunlight readability.
- Predictable placement of primary actions across screens.

### Performance model
- User feedback must feel instant (<200ms perceived response).
- Save and queue must be optimistic by default.

---

## 4) Offline-first behavior (required)

All field actions must be resilient offline:
- Write locally first.
- Queue sync events automatically.
- Sync silently when connectivity returns.
- Avoid manual “retry” work for normal failures.
- Preserve interaction order and idempotency.

Failure UX should be visible but low-friction: user keeps canvassing while sync catches up.

---

## 5) Error-tolerance and data quality rules

To prevent garbage field data:
- Soft validation over hard blocking where possible.
- Duplicate detection for sign/volunteer capture.
- Undo or correction path for recent actions.
- Safety/high-risk notes must be explicit and elevated.

---

## 6) Adoni voice execution standard (unfair advantage)

Preferred flow:
- Long-press / voice trigger.
- Canvasser says one natural-language summary.
- System proposes structured actions.
- User confirms.
- System executes and advances.

Example utterance:

> “Spoke to John, supports, wants a sign, wife volunteers Saturdays.”

Expected structured actions:
- update support status,
- create sign request,
- create volunteer lead,
- attach note,
- optionally create follow-up task.

Adoni must reduce clicks/screens, not add complexity.

---

## 7) Acceptance gates (release criteria)

A flow only ships if all gates pass:

1. **5-second novice test**
   - First-time canvasser can complete common action in ~5 seconds with no training.
2. **Walking test**
   - Can complete while moving/outdoors and distracted.
3. **Momentum test**
   - No forced return-to-list after each house.
4. **Offline test**
   - App remains usable during signal loss; sync recovers automatically.
5. **One-action clarity test**
   - Each screen has one obvious next action.

If any gate fails, feature is not done.

---

## 8) Delivery format: “Done by agent” vs “Needs George action”

For every backend/UI task, report with this exact split:

### Done by agent (code complete)
- what was changed,
- file paths,
- commit hash,
- status: shipped in branch or not.

### Needs George action (outside code)
- exact command(s) to run,
- where to run them,
- required environment/secrets,
- expected success output.

### Example
- **Done by agent:** Added stop assignment authorization checks in stop routes/services.
- **Needs George action:** Install deps and run build/type/test gates locally or CI.

This avoids false assumptions about what is actually live.

---

## 9) Immediate implementation priorities

Priority order for V1:
1. Door outcome quick-tap flow + auto-advance
2. Voice note + Adoni parse/confirm/execute
3. Offline queue resilience + silent sync health
4. Fast quick-actions (sign + volunteer + note)
5. Undo/correction and duplicate-safe logging

Everything else is secondary until this path is elite.

---

## 10) Expert challenge: menu sprawl and product fragmentation

Poll City currently risks the common campaign-platform failure mode:
- too many top-level surfaces,
- too many “manager” controls shown in canvasser paths,
- too many ways to reach the same action.

### Required information architecture split

Keep exactly two mental modes:
1. **Canvasser mode (field execution)** — minimal, fast, repetitive.
2. **Manager mode (coordination/analytics)** — deeper controls and oversight.

If a screen/action does not help the canvasser complete the next 10 seconds of field work,
it should not appear in canvasser mode navigation.

### Canvasser navigation cap (hard limit)

Canvasser bottom/nav should expose only:
- Home
- Turf (Map/List)
- Next Door (primary CTA)
- Sync
- Help

Everything else is secondary and should live behind contextual actions on the Door screen.

### Manager controls must be separated

These belong in manager surfaces, not canvasser primary navigation:
- productivity dashboards,
- reassignment tools,
- exports,
- conflict resolution admin panels,
- Adoni audit review queues.

This separation is mandatory to avoid in-field cognitive overload.

---

## 11) Manual QA script (field reality test)

Run this exact script before calling V1 “ready”:

1. Login as canvasser
2. Open assigned turf
3. Go offline
4. Mark 10 doors
5. Add 3 notes
6. Request 2 signs
7. Add 1 volunteer lead
8. Use Adoni long-press
9. Close app
10. Reopen app
11. Confirm data still exists locally
12. Go online
13. Confirm sync completes
14. Login as field manager
15. Confirm canvasser activity appears correctly
16. Confirm cross-campaign access is blocked

If any step fails, V1 is not done.

---

## 12) Communication contract (always explicit)

For every update, always report this way:

### Done by agent
- What was changed in code/docs
- Exact files
- Commit hash
- Whether pushed/deployed or only committed locally

### Needs George action
- Exact command(s)
- Exact place to run (local terminal, CI, Vercel)
- Env vars/secrets needed
- What success looks like

This avoids assumptions and makes “done” operationally unambiguous.
For a strict reusable format, follow `docs/CANVASSER_NON_FORGET_CHECKLIST.md`.

---

## 13) Adoni outage fallback (mandatory, zero-drama failover)

Adoni is a performance multiplier, not a dependency for core canvassing.

If Adoni is degraded or unavailable, canvassing must continue at full speed through:
- one-tap primary outcomes,
- one-tap quick actions (sign, volunteer, follow-up),
- optional plain note capture,
- background queue + sync recovery.

### Fallback trigger rules

Automatically switch to “Manual Fast Mode” when any of these occur:
- parse/execute latency over threshold for multiple attempts,
- parse/execute endpoint health-check failure,
- explicit server “degraded” flag for Adoni services.

### Manual Fast Mode requirements

- No blocking modals for Adoni failures.
- No dead-end errors.
- Show small status badge: “Voice assist unavailable — manual fast mode active.”
- Keep all core actions visible and one-tap.
- Retry Adoni silently in background and re-enable automatically when healthy.

### Reliability SLO (field-safe)

- 0% data loss for logged actions.
- 100% availability of manual logging path during Adoni outage.
- < 1 tap of extra friction vs normal flow for common outcomes.

---

## 14) Scale and performance guardrails (weekend surge readiness)

Target scenario: 30 campaigns, 4k–5k concurrent users, weekend peak load.

### Client performance budget (iOS-first)

- Cold start perceived ready state: target < 2.0s on modern devices.
- Primary action latency (tap result → local confirmation): target < 200ms perceived.
- Next-door transition: target < 300ms perceived.
- Keep app bundle lean: no non-essential heavy libraries in canvasser runtime path.

### Network and backend strategy

- Write locally first, then sync (never block field logging on network round-trips).
- Batch sync events with idempotent event IDs.
- Backoff + retry with jitter on transient failures.
- Server endpoints must support horizontal scale and avoid per-request heavy joins in hot paths.

### Operational safeguards

- Real-time service health flags for:
  - Adoni parse/execute,
  - sync ingest,
  - mission fetch.
- Degradation policy:
  - green: full experience,
  - yellow: manual fast mode + reduced non-critical features,
  - red: core logging only + deferred sync.

---

## 15) Instant transition between maps and walk lists

The user must be able to switch between map and list with no cognitive or performance penalty.

### UX requirements

- Preserve selection state (current household) between modes.
- Preserve scroll/position when switching back.
- Keep “Next Door” action consistent in both modes.
- Never require re-loading entire assignment on each toggle.

### Data requirements

- One shared in-memory assignment model powering both views.
- Derived view adapters:
  - map markers from assignment store,
  - ordered walk-list rows from assignment store.
- Offline parity: both views operate from same local data snapshot.
