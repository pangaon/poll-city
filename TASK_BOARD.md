# Task Board

Last updated: 2026-04-07

## P0 - In progress
- [x] Create shared action engine foundation and expose execution endpoint.
- [x] Create shared task/assignment backbone and wire critical task creation paths.
- [x] Create shared GOTV metrics truth layer and wire summary/gap/priority-list.
- [x] Create drill-through mapping pattern and expose on key GOTV metrics.
- [x] Fix strike-off contract mismatch (`contactId` vs `name`).

## P1 - Next
- [ ] Migrate remaining GOTV endpoints (`/tiers`, `/command`, `/precinct-race`) to shared metrics truth to remove remaining divergence.
- [ ] Add shared action telemetry (action duration, failure code taxonomy) to improve auditability.
- [ ] Migrate command center widgets to action endpoint contracts (`/api/actions/execute`) and consume drill-through descriptors directly.
- [ ] Connect alerts trigger actions to task backbone + assignment ownership.

## P2 - Planned
- [ ] Permission convergence: migrate critical APIs from legacy `requirePermission` to resolved campaign-role permission checks.
- [ ] Report engine convergence: move from local-state/report mocks to persistent, query-backed report definitions.
- [ ] Calendar convergence: connect shift/event/task actions to unified action/task APIs.

## Known blockers / risks
- Missing required env vars (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`) remain a deployment-readiness blocker.
- Some surfaces still operate with fallback/mock behavior and need backend contract migration.
