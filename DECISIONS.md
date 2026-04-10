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

## 2026-04-10 - Monorepo structure: stub only, no code moved yet
Decision:
- `apps/` and `packages/` directories contain README.md stubs only. Zero code has been moved out of `src/`.

Why:
- Platform is still Phase 1 (single monolith). Split trigger = when George wants separate Vercel deployments per product.

Impact:
- All architecture docs reference the future monorepo structure. Current reality is everything lives in `src/`. Do not move code until George explicitly triggers the split.

---

## 2026-04-10 - Calendar schema: canonical source is schema.prisma, not calendar_schema_additions.prisma
Decision:
- Calendar models live in `prisma/schema.prisma` (modified). `prisma/calendar_schema_additions.prisma` is a reference/planning document, not a migration target.

Why:
- Only one source of truth for schema. The additions file was a design artefact from the session that added calendar models.

Impact:
- Run `npx prisma db push` to sync calendar models to DB before calendar routes can function.
- `prisma/calendar_schema_additions.prisma` should be committed as documentation or deleted.

---

## 2026-04-10 - Finance and Fundraising are separate suites, must reconcile at reporting layer
Decision:
- Finance Suite = outgoing money (budget, expenses, vendors, procurement, reimbursements)
- Fundraising Suite = incoming money (donations, donors, receipts, compliance)
- These are NOT merged into one module. They reconcile via reporting only.

Why:
- Different permissions (Finance Officer vs. Fundraising Manager), different workflows, different compliance rules.

Impact:
- A reconciliation bridge must be built in Finance Phase 6 / Fundraising Phase 6 so campaign finance reports show both revenue and expenditure in one view. See INTEGRATION_GAPS.md GAP-005.

---

## 2026-04-10 - db push (no migrations) for development; migrations required before production
Decision:
- Development continues with `npx prisma db push` (no `prisma/migrations/` directory).
- Before first production customer: run `npx prisma migrate dev --name initial_baseline` to establish migration history.

Why:
- db push is faster for rapid development. But db push on production with live data is unsafe — no rollback.

Impact:
- All schema changes during development use db push. Add a milestone in the launch checklist to create the migration baseline. See INTEGRATION_GAPS.md GAP-003.

---

## 2026-04-07 - Strike-off API contract correction
Decision:
- Support both `{ contactId }` and `{ name }` in strike-off POST body.

Why:
- Existing clients call strike-off by `contactId`; previous route required `name`, creating broken operation paths.

Impact:
- Critical GOTV action path now operational and consistent with mark-voted flow.
