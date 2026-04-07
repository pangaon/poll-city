# Decisions Log

## 2026-04-07 - Establish shared operations foundation in code
Decision:
- Implement and wire shared backend foundation modules before additional surface features.

Why:
- Audit showed duplicate execution patterns, inconsistent metric math, and route-level one-off logic.

Implemented:
- `src/lib/operations/action-engine.ts`
- `src/lib/operations/task-backbone.ts`
- `src/lib/operations/metrics-truth.ts`
- `src/lib/operations/drill-through.ts`
- `POST /api/actions/execute`

---

## 2026-04-07 - Canonical GOTV threshold for shared metrics layer
Decision:
- Use one win-threshold formula inside the shared metrics layer:
  - `ceil(totalContacts * 0.35)`

Why:
- Audit found conflicting formulas across endpoints (0.35 vs 0.38 * 0.51), causing dashboard/list/command mismatch.

Impact:
- `summary`, `gap`, and `priority-list` now align through one source of truth.

---

## 2026-04-07 - Backward-compatible priority list response during convergence
Decision:
- Return both `data` and `contacts` in `GET /api/gotv/priority-list`.

Why:
- Existing clients are inconsistent in expected payload key.

Impact:
- Prevents immediate regressions while preserving a converged backend data path.

---

## 2026-04-07 - Strike-off API contract correction
Decision:
- Support both `{ contactId }` and `{ name }` in strike-off POST body.

Why:
- Existing clients call strike-off by `contactId`; previous route required `name`, creating broken operation paths.

Impact:
- Critical GOTV action path now operational and consistent with mark-voted flow.
