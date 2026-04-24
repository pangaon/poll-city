# Routing and Packaging Rules — Field Ops

*Created: 2026-04-10 — Chunk 6, Phase 1*
*Enforced from: Phase 2 (Turf + Route Planning)*

---

## 1. Geography Hierarchy

```
Campaign (Ward)
  └── Turf          — a named geographic zone, may span multiple polls
        └── Route   — a single walkable path within a turf
              └── FieldTarget — one door/household/sign on the route
```

A `Campaign` IS the ward. There is no ward dropdown — the campaign jurisdiction defines the operating boundary.

`Turf` is the planning unit. `Route` is the execution unit. Both live under a `FieldProgram`.

---

## 2. Route Assignment Rules

### 2.1 Eligibility
- A `Route` must belong to a `Campaign` (`campaignId` required).
- A `Route` may optionally belong to a `FieldProgram` and/or a `Turf`.
- A `Route` without a `FieldProgram` is a standalone route (valid, but not tracked against program goals).

### 2.2 Status Transitions
```
draft → published → assigned → in_progress → completed
                             ↘ locked (frozen mid-execution, cannot be re-split)
      → archived (any state, by CAMPAIGN_MANAGER)
```

- `draft`: created but not visible to volunteers
- `published`: visible to leaders, not yet assigned
- `assigned`: assigned to a shift or volunteer; `FieldShift.routeId` or `FieldShiftAssignment` record exists
- `in_progress`: first `FieldAttempt` logged against any target on this route
- `completed`: all `FieldTarget` records are in a terminal state (contacted / refused / moved / inaccessible / complete)
- `locked`: frozen mid-run; no new targets can be added; re-split is blocked

### 2.3 Locking
- A CAMPAIGN_MANAGER may lock a route at any time.
- A locked route cannot be split, merged, or have targets reordered.
- Locking is recorded in `FieldAuditLog` (action: `override`, entityType: `route`).

### 2.4 Route Completion Definition
A route is NOT complete if any `FieldTarget` has status: `pending`, `in_progress`, `revisit`.

Route completion is computed dynamically — never set manually:
```
completedTargets / totalTargets ≥ 1.0
AND no targets with status in (pending, in_progress, revisit)
```

### 2.5 Partial Route Resumption
- A partially completed route (`in_progress`) may be resumed by a different volunteer.
- The system must NOT reset prior outcomes.
- Re-entry creates new `FieldAttempt` records; it does NOT overwrite existing ones.
- The `isOfflineSynced` flag marks attempts entered from paper re-entry.

---

## 3. Target Ordering Rules

`FieldTarget.sortOrder` is the canonical walk sequence within a route.

- Sort order is set at route creation (by optimization algorithm or manual drag/drop).
- Sort order is frozen when route status = `locked` or `in_progress`.
- After first attempt is logged, sort order may only be changed by CAMPAIGN_MANAGER.

**Odd/even rules** (`Route.oddEven`):
- `all` — include both sides of the street (default)
- `odd` — north/west side only
- `even` — south/east side only

---

## 4. Packaging Rules

### 4.1 Pack Types
| Pack Type | Contents | Trigger |
|-----------|----------|---------|
| `canvass` | Script package, walk list printout, ID tally sheet | Shift type = canvassing |
| `literature` | Walk list, lit count sheet, door hangers/flyers | Shift type = literature |
| `sign_install` | Sign roster, hardware checklist, install map | Shift type = sign_install |
| `sign_remove` | Removal roster, hardware retrieval checklist | Shift type = sign_remove |
| `gotv` | Strike-off sheet, turnout target list, polling location cards | Shift type = gotv / poll_day |
| `event_outreach` | Event invite cards, supporter ask sheet | Shift type = event_field |

### 4.2 Buffer Calculation (Literature / Signs)
```
requiredQty = ceil(targetCount × (1 + bufferPct) / 50) × 50
```
Default `bufferPct` = 0.10 (10% overage, rounded to nearest 50).

For sign kits: buffer is always 0 (exact count, no overage).

### 4.3 Inventory Reservation
When a `PrintPack` transitions to `distributed`:
- `PrintInventory.availableQty` decremented atomically per item.
- `PrintInventory.reservedQty` incremented.
- On return: reserved decremented, available incremented.
- On depletion (used/wasted): `depletedQty` incremented, reserved decremented.

### 4.4 Materials Checklist
`FieldShift.materialsJson` is a JSON array of items the volunteer must bring and return:
```json
[
  { "item": "Walk list", "qty": 1, "mustReturn": true },
  { "item": "Door hangers", "qty": 50, "mustReturn": false },
  { "item": "Tally sheet", "qty": 1, "mustReturn": true },
  { "item": "Pen", "qty": 1, "mustReturn": false }
]
```
`mustReturn: true` items are tracked for return at check-out.

---

## 5. Turf Balancing Rules

Turf balancing is performed during route planning (Phase 2):

| Metric | Target |
|--------|--------|
| Doors per route | 40–80 (default; configurable) |
| Walk time per route | 60–90 min (default) |
| Supporters per route | Spread evenly across turfs |

A turf is "balanced" when all its routes are within ±20% of the campaign average door count.

Turf balancing does NOT auto-reassign in_progress routes. A human must trigger re-balance.

---

## 6. Offline + Paper Rules

### 6.1 Offline Cache
On shift check-in, the mobile app caches:
- All `FieldTarget` records for the assigned route
- The `ScriptTemplate` (contentJson)
- The `FieldShift` metadata (meeting point, materials, shift type)

Cache is invalidated on check-out or 24h timeout, whichever comes first.

### 6.2 Paper Fallback
If a volunteer completes a paper tally sheet, re-entry is via the rapid re-entry screen:
- One row per address: outcome (dropdown) + notes (optional)
- Batch import sets `isOfflineSynced = true` on all created `FieldAttempt` records
- Duplicate detection: same `contactId` + same date → prompt for override, do NOT silently merge

### 6.3 Offline Sync Conflict Resolution
If an offline attempt is synced and a later attempt on the same target already exists:
1. Keep both records in `FieldAttempt`
2. Set `FieldTarget.status` to the most recent attempt's outcome
3. Flag in `FieldAuditLog` (action: `override`, source: `offline_sync`)
4. Surface in Exceptions queue for CAMPAIGN_MANAGER review

---

## 7. Route Export Rules

Walk list exports must include:
- Address + unit (sorted by `sortOrder`)
- Contact name(s) at address (if known, masked for privacy on public exports)
- Prior outcome (from last `FieldAttempt` at this address, if any)
- Support level (only if VOLUNTEER_LEADER or above)
- Special flags: accessibility, do_not_return, skip_house
- Poll number (for GOTV routes)

Walk list exports must NOT include:
- Contact email or phone
- Full CRM notes (only the "canvass note" field)
- Donor information

---

## 8. Route Naming Convention

`[Ward/Poll] [Pass Type] [Sequence]`

Examples:
- `Ward 3 ID Pass #1`
- `Poll 042 GOTV Run`
- `Elm St Literature Drop`
- `Sign Install Batch A`

---

*This file is the routing and packaging contract for Field Ops Phase 2+.*
*Updated each phase as rules are finalized in code.*
