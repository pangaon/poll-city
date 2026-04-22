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

---

## 2026-04-22 - Ward boundary infrastructure: 3-layer cache with DB as source of truth

Decision:
- Ward boundaries are served from DB (`WardBoundary` table) as the primary layer, with Edge CDN cache on top (`Cache-Control: public, max-age=3600, stale-while-revalidate=86400`).
- Live external fetches (ArcGIS / Represent / CKAN) are background-only via daily 3am cron and the one-time seed endpoint.
- The `all-wards` GET route must NEVER block on a full 28-municipality live fetch.

Why:
- Ward boundaries change at most once every 4 years (municipal election redistricting). Fetching them live on every map load is unnecessary and creates a single point of failure. On election night with 10,000+ concurrent users, one ArcGIS outage would blank every map simultaneously.

Impact:
- `GET /api/atlas/all-wards` serves sub-10ms responses from DB once seeded.
- Lazy seed on empty DB is scoped to verified municipalities only (`ingestVerifiedMunicipalities`) — safe within Vercel's 60s limit.
- Full 28-municipality ingest only runs via `/api/atlas/seed-wards` (maxDuration=300) or the nightly cron.

---

## 2026-04-22 - wardIndex uses stable registry-position × 200 offset, not accumulated count

Decision:
- `wardIndex` (MapLibre promoteId) for each ward is `registryPosition × 200 + localIndex` within the municipality.
- Registry position is the index in `WARD_ASSET_REGISTRY` which is stable (committed to git, append-only).

Why:
- Prior implementation accumulated offsets dynamically during batch processing with `j * 20` spacing. A municipality with > 20 wards (Toronto has 25, Ottawa has more) would cause wardIndex collisions with the next municipality in the same batch. MapLibre uses wardIndex as a unique feature identifier for hover state — collisions cause the wrong polygon to highlight.
- Static registry-position offsets are deterministic across all runs: same municipality always gets the same index range.

Impact:
- No Ontario city has close to 200 wards, so 200-slot spacing is permanently safe.
- Re-seeding the DB produces identical wardIndex values — no drift over time.

---

## 2026-04-22 - Elite engineering standard adopted as session protocol

Decision:
- All AI agent sessions on this codebase operate at senior/staff production engineer standard: audit before code, full chain builds, mandatory session exit updates.
- The 10-step READ→MAP→AUDIT→IDENTIFY RISKS→PLAN→IMPLEMENT→VERIFY→HARDEN→DOCUMENT→HANDOFF sequence is the default protocol.
- DECISIONS.md, SESSION_HANDOFF.md, and CLAUDE.md are mandatory session exit artifacts.

Why:
- George's directive: the platform affects real candidates in real elections. Every session must leave the codebase stronger and the next session better informed.

Impact:
- SESSION EXIT RULE block added to top of CLAUDE.md.
- Every significant architectural or product-structure decision must be recorded here, not in chat memory.
