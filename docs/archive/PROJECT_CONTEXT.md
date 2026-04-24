# Poll City Ecosystem - Project Context

Last updated: 2026-04-07

## Mission
Build a unified campaign operating system where Poll City, Poll City Social, Poll City Print, and the professional dashboard share a common backend truth for actions, tasks, metrics, and auditability.

## System Direction
- Direction is system-first convergence, not surface-first UI work.
- Critical layers must be shared: action execution, task/assignment backbone, drill-through mapping, unified metrics, and memory coordination.
- Surfaces can remain distinct, but operational logic must converge.

## Products in Scope
- Poll City: campaign operations (canvassing, contacts, GOTV, assignments, execution).
- Poll City Social: public engagement and consent-based supporter conversion.
- Poll City Print: print/logistics/vendor workflows and marketplace pathways.
- Shared dashboard/control center: command center, alerts, reporting, tasking, calendar, operator support.

## Current Technical Stack
- Next.js 14 (App Router), TypeScript
- Prisma + PostgreSQL
- NextAuth
- npm workspaces (`src`, `packages/*`, `apps/*`, `mobile/`)

## Foundation Status (Phase 1)
- Shared action execution foundation: now real (`src/lib/operations/action-engine.ts` + `/api/actions/execute`).
- Shared task/assignment backbone: now real for API task creation and GOTV dispatch (`src/lib/operations/task-backbone.ts`).
- Unified GOTV metrics truth for summary/gap/priority list: now real (`src/lib/operations/metrics-truth.ts`).
- Drill-through mapping pattern for GOTV critical metrics: now real (`src/lib/operations/drill-through.ts`).

## Known Limits
- Enterprise permission convergence is still mixed (legacy `requirePermission` and campaign-role permission engine both exist).
- Command Center remains partially passive at UI level despite backend improvements.
- Alerts and reporting still include local/simulated patterns in parts of UI.
