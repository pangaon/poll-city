# DOCUMENTATION_INDEX.md — Poll City

Complete map of every doc file in this project and when to use it.

---

## Start Here (Every Session)

| File | Purpose | Read when |
|---|---|---|
| FIGMA.md | Master context — tech stack, routes, design system, sidebar | Always first |
| CLAUDE.md | Agent standing orders, quality gates, build cycle | Every session — non-negotiable |
| QUICK_START.md | Fast orientation, commands, active build queue | Starting a new task |

---

## Reference Docs (Root)

| File | Purpose | Read when |
|---|---|---|
| COMPONENTS.md | Every component in src/components/ with purpose + import patterns | Building UI or looking for an existing component |
| ROUTES.md | All 100+ routes extracted from the App Router filesystem | Adding/changing routes or finding a page |
| DEPENDENCIES.md | All packages with real versions from package.json | Before npm install; choosing a package |
| SPECIFICATIONS.md | Index of spec docs — architecture + module specs + Figma Make specs | Understanding what a feature should do |

---

## Coordination Files (Root)

| File | Purpose | Read when |
|---|---|---|
| CONNECTIONS.md | Module connection map — what's wired, what's not | Before any feature touching Contact/Donation/Task/Event/Sign |
| WORK_QUEUE.md | Session coordination — claimed/done/pending tasks | Start of every session — claim your task |
| GEORGE_TODO.md | Manual steps only George can do (Railway, Stripe, Vercel, OAuth) | When your work creates a step George must take |

---

## Architecture Docs — docs/architecture/

| File | Contents |
|---|---|
| PLATFORM_ARCHITECTURE.md | Overall platform structure, products, tenant model |
| APP_SPLIT_PLAN.md | Future app split plan: hq-web, admin-web, social-web, print-web |
| ROUTE_MAP.md | Canonical route map |
| DOMAIN_MAP.md | Domain → product mapping |
| PERMISSION_MATRIX.md | Full RBAC matrix |
| DATA_CLASSIFICATION_MATRIX.md | Data sensitivity handling |
| DATA_FLOW_DIAGRAM.md | Request → API → DB → response |
| API_AND_INTEGRATION_CONTRACTS.md | API contracts |
| AUDIT_AND_LOGGING_SPEC.md | Audit trail spec |
| ABUSE_AND_RISK_CONTROLS.md | Rate limiting, fraud controls |
| MIGRATION_PLAN.md | DB migration strategy |
| DEPLOYMENT_PLAN.md | Vercel + Railway deployment |

---

## App Documentation

| File | Contents |
|---|---|
| apps/hq-web/README.md | HQ web app |
| apps/admin-web/README.md | Admin web app |
| apps/social-web/README.md | Social web app |
| apps/print-web/README.md | Print web app |
| packages/db/README.md | DB package |
| packages/ui/README.md | Shared UI package |
| packages/auth/README.md | Auth package |
| packages/types/README.md | Shared types |
| packages/maps/README.md | Maps package |
| packages/permissions/README.md | Permissions package |
| packages/api-contracts/README.md | API contracts |
| packages/events/README.md | Events package |
| packages/print-core/README.md | Print core |
| packages/config/README.md | Config package |

---

## Master Specs (Figma Make — not yet ported)

These live in the Figma Make project, not this codebase:

| File | Contents |
|---|---|
| poll-city-design-spec.md | Full platform — every module |
| poll-city-command-center.md | Field Ops 13-tab Figma brief |
| poll-city-field-ops.md | Field Ops marketing + product design |

---

## By Task

| Task | Read these docs |
|---|---|
| Build a new feature | CONNECTIONS.md → SPECIFICATIONS.md → CLAUDE.md → COMPONENTS.md |
| Add a route | ROUTES.md → CLAUDE.md (dynamic route naming rules) → sidebar.tsx |
| Build UI | COMPONENTS.md → FIGMA.md §6 (design system) |
| Install a package | DEPENDENCIES.md → package.json |
| Touch the database | prisma/schema.prisma → CLAUDE.md (Prisma rules) |
| Write an API route | CLAUDE.md (security rules) → src/lib/auth/helpers.ts |
| Add a sidebar item | FIGMA.md §8 → src/components/layout/sidebar.tsx |
| Deploy | GEORGE_TODO.md → CLAUDE.md (build checklist) |
| Fix an auth bug | src/lib/auth/helpers.ts → docs/architecture/PERMISSION_MATRIX.md |
| Touch Adoni | CLAUDE.md (Adoni Laws) → src/components/adoni/adoni-chat.tsx |

---

## Session Checklist

Before starting any task:
- [ ] `git pull origin main`
- [ ] Read WORK_QUEUE.md — is the task PENDING?
- [ ] Claim it: change PENDING → CLAIMED [date], commit + push
- [ ] Read FIGMA.md and CLAUDE.md for context
- [ ] Read CONNECTIONS.md if touching shared data

Before pushing:
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
- [ ] CONNECTIONS.md updated if connections changed
- [ ] GEORGE_TODO.md updated if George needs to do anything
