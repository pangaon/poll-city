# SPECIFICATIONS.md — Poll City Spec Index

> This file indexes the authoritative spec documents for Poll City.
> MASTER_CLAUDE.md referenced three files at `/src/imports/pasted_text/*.md` — those paths
> do not exist in this Next.js codebase. They are Figma Make prototype assets.
> The actual specs are the architecture documents in `docs/architecture/` and the
> module specs embedded in FIGMA.md + this codebase itself.

---

## Architecture Docs — docs/architecture/

These are the authoritative technical specs for the production platform.

| File | Contents |
|---|---|
| PLATFORM_ARCHITECTURE.md | Overall platform architecture — monolith structure, products, tenant model |
| APP_SPLIT_PLAN.md | Plan for splitting apps: hq-web, admin-web, social-web, print-web |
| ROUTE_MAP.md | Canonical route map (authoritative, may differ from ROUTES.md) |
| DOMAIN_MAP.md | Domain → product mapping |
| PERMISSION_MATRIX.md | Full role-based access control matrix |
| DATA_CLASSIFICATION_MATRIX.md | Data sensitivity tiers and handling rules |
| DATA_FLOW_DIAGRAM.md | Data flow: user → API → DB → response |
| API_AND_INTEGRATION_CONTRACTS.md | API contracts between apps and external services |
| AUDIT_AND_LOGGING_SPEC.md | Audit trail and activity logging specification |
| ABUSE_AND_RISK_CONTROLS.md | Rate limiting, abuse prevention, fraud controls |
| MIGRATION_PLAN.md | Database migration strategy |
| DEPLOYMENT_PLAN.md | Vercel + Railway deployment strategy |

---

## Module Specs (from FIGMA.md Section 10)

These are embedded in FIGMA.md and define behaviour for each module.

| Module | Location | Key Details |
|---|---|---|
| Field Ops | FIGMA.md §10 | Tab hub + sub-routes; Pipeline: Programs→Routes→Turf→Runs→GOTV |
| Polls | FIGMA.md §10 | Types: Yes/No, MC, Scale 1-5, Open Text, Ranked Choice; live at /polls/[id]/live |
| Communications | FIGMA.md §10 | Email/SMS/Social; Adoni drawer available |
| Finance | FIGMA.md §10 | 9-sub-routes: Budget, Expenses, PRs, Vendors, Reimbursements, Approvals, Reports, Audit |
| Print | FIGMA.md §10 | Templates, Design editor, Jobs, Products, Inventory, Packs, Shops |
| Adoni AI | FIGMA.md §10 | Male persona; no markdown; max 8 sentences; pollcity:open-adoni event |
| GOTV | FIGMA.md §10 | War room, engine, map at src/components/gotv/ |
| Social | FIGMA.md §11 | Mobile-first 390px; swipe voting; dark glassmorphic |

---

## Figma Make Prototype Specs (PLANNED — not yet ported to this codebase)

These spec files are referenced in MASTER_CLAUDE.md but live only in the Figma Make project.
They have NOT been imported into this Next.js repository.

| File | Contents | Status |
|---|---|---|
| poll-city-design-spec.md | Full platform spec — every module: Auth, Setup Wizard, Dashboard, CRM, Canvassing, Field Ops, Polls, Comms, Calendar, Volunteers, Donations, Finance, Signs, Print, Tasks, Events, Analytics, GOTV, Election Night, Adoni AI, Settings, Ops Console, Multi-tenant UX, RBAC. Also: Marketing site, Social app, Print portal. | PLANNED — not in this repo |
| poll-city-command-center.md | 13-tab Field Ops Command Centre Figma brief. Every tab fully specced with columns, states, sample data. Tabs: Dashboard, Programs, Routes, Turf, Runs, Lit Drops, Signs, Teams, Materials, Follow-Ups, GOTV, Mobile, Audit. Side drawer + modal patterns. Mobile viewport spec. | PLANNED — not in this repo |
| poll-city-field-ops.md | Field Ops marketing + product design. Layer A: Marketing hero/showcase assets. Layer B: Product UI/UX — Turf Builder, Walk List, Mobile Canvassing, Lit Drop, Sign Crew, Volunteer, Comms, Calendar, Reporting, Offline/Paper mode. Required functional states: empty, loading, active, completed, paused, error, conflict, offline. | PLANNED — not in this repo |

To use these specs: import them from the Figma Make project into this codebase at `src/imports/pasted_text/` (path expected by MASTER_CLAUDE.md).

---

## Spec Priority

When building features:
1. Architecture docs in docs/architecture/ — structure and contracts
2. FIGMA.md — visual, UX, and module behaviour
3. CLAUDE.md — implementation rules and quality gates
4. Prisma schema (prisma/schema.prisma) — source of truth for data models

---

## Quick Reference by Feature

| Feature | Primary Spec |
|---|---|
| Dashboard | FIGMA.md §4 + docs/architecture/PLATFORM_ARCHITECTURE.md |
| Field Ops | FIGMA.md §10 + docs/architecture/ROUTE_MAP.md |
| Canvassing | ROUTES.md + src/components/canvassing/ |
| Signs | FIGMA.md §10 + /signs route |
| Fundraising | FIGMA.md §10 + /fundraising route |
| Finance | FIGMA.md §10 + /finance/* routes |
| GOTV | FIGMA.md §10 + src/components/gotv/ |
| Social App | FIGMA.md §11 + /social/* routes |
| Print Portal | FIGMA.md §10 + /print/* routes |
| Ops Console | FIGMA.md §4 + /ops/* routes (SUPER_ADMIN only) |
| Adoni AI | FIGMA.md §10 + src/components/adoni/ + src/lib/adoni/ |
| Auth & Roles | docs/architecture/PERMISSION_MATRIX.md + src/lib/auth/ |
| API Security | CLAUDE.md §Security Rules + src/lib/api/errors.ts |

---

## Connections Map

`CONNECTIONS.md` in the repo root tracks every module's data connections:
- Which actions trigger which downstream effects
- What is ✓ CONNECTED vs ✗ NOT CONNECTED
- Read before building any feature that touches Contact, Interaction, Donation, Task, Event, VolunteerProfile, Sign, or ActivityLog
