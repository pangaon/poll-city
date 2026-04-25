# CANVASSER BACKEND RELEASE REPORT

Date: 2026-04-25
Status: Backend foundation implemented (v1 baseline), not full product completion.

## 1. Summary of implementation
Implemented a tenant-safe canvasser backend foundation including:
- new canvasser domain models for candidate ping, PCS invites, Adoni transcript lifecycle, offline sync events, volunteer leads, lit drop logs, and safety flags;
- new canvasser service layer for missions/doors/voter outcomes/sign requests/volunteer leads/lit drops/candidate pings/PCS invites/Adoni/offline sync;
- new `/api/canvasser/*` route set for mission and door workflow, action logging, and sync ingest.

## 2. Files changed
- `prisma/schema.prisma`
- `src/lib/canvasser/context.ts`
- `src/lib/canvasser/service.ts`
- `src/app/api/canvasser/missions/route.ts`
- `src/app/api/canvasser/missions/[missionId]/route.ts`
- `src/app/api/canvasser/missions/[missionId]/start/route.ts`
- `src/app/api/canvasser/missions/[missionId]/complete/route.ts`
- `src/app/api/canvasser/missions/[missionId]/current-stop/route.ts`
- `src/app/api/canvasser/stops/[stopId]/complete/route.ts`
- `src/app/api/canvasser/stops/[stopId]/skip/route.ts`
- `src/app/api/canvasser/stops/[stopId]/note/route.ts`
- `src/app/api/canvasser/voters/[personId]/outcome/route.ts`
- `src/app/api/canvasser/custom-fields/value/route.ts`
- `src/app/api/canvasser/sign-requests/route.ts`
- `src/app/api/canvasser/sign-requests/[signRequestId]/route.ts`
- `src/app/api/canvasser/volunteer-leads/route.ts`
- `src/app/api/canvasser/lit-drops/route.ts`
- `src/app/api/canvasser/lit-drops/batch/route.ts`
- `src/app/api/canvasser/candidate-pings/route.ts`
- `src/app/api/canvasser/candidate-pings/[candidatePingId]/route.ts`
- `src/app/api/canvasser/pcs-invites/route.ts`
- `src/app/api/canvasser/adoni/transcripts/route.ts`
- `src/app/api/canvasser/adoni/parse/route.ts`
- `src/app/api/canvasser/adoni/execute/route.ts`
- `src/app/api/canvasser/sync/route.ts`
- `src/app/api/canvasser/sync/status/route.ts`
- `docs/CANVASSER_BACKEND_AUDIT.md`

## 3. Models added/changed
Added enums:
- MissionType, MissionStatus, DoorOutcome, VoterOutcome, SignRequestStatusV2, OfflineSyncStatus, AdoniActionStatus

Added models:
- CandidatePing
- PCSInvite
- SafetyFlag
- LitPiece
- LitDropLog
- VolunteerLead
- AdoniTranscript
- AdoniParsedAction
- AdoniExecutionLog
- OfflineSyncEvent

## 4. API routes added
- `GET /api/canvasser/missions`
- `GET /api/canvasser/missions/[missionId]`
- `POST /api/canvasser/missions/[missionId]/start`
- `POST /api/canvasser/missions/[missionId]/complete`
- `GET /api/canvasser/missions/[missionId]/current-stop`
- `POST /api/canvasser/stops/[stopId]/complete`
- `POST /api/canvasser/stops/[stopId]/skip`
- `POST /api/canvasser/stops/[stopId]/note`
- `POST /api/canvasser/voters/[personId]/outcome`
- `POST /api/canvasser/custom-fields/value`
- `POST /api/canvasser/sign-requests`
- `PATCH /api/canvasser/sign-requests/[signRequestId]`
- `POST /api/canvasser/volunteer-leads`
- `POST /api/canvasser/lit-drops`
- `POST /api/canvasser/lit-drops/batch`
- `POST /api/canvasser/candidate-pings`
- `PATCH /api/canvasser/candidate-pings/[candidatePingId]`
- `POST /api/canvasser/pcs-invites`
- `POST /api/canvasser/adoni/transcripts`
- `POST /api/canvasser/adoni/parse`
- `POST /api/canvasser/adoni/execute`
- `POST /api/canvasser/sync`
- `GET /api/canvasser/sync/status`

## 5. Permission rules added
- Standardized context resolver uses `mobileApiAuth` + `guardCampaignRoute`.
- Route permission requirements use existing permission strings (`canvassing:*`, `signs:write`, `volunteers:write`).
- Mission access enforces assignment checks for non-manager roles.

## 6. Tests added
- Added parser/support-mapping unit tests:
  - `src/lib/canvasser/__tests__/service.test.ts`
- Environment note: test execution in this sandbox still fails because `jest` is not installed in the runtime image.

## 7. How to run migration
1. `npx prisma format`
2. `npx prisma migrate dev -n canvasser_backend_foundation`
3. `npx prisma generate`

## 8. How to seed
- Existing global seed file remains (`prisma/seed.ts`).
- Canvasser-specific seed extension is still pending.

## 9. How to test
- Hit new routes with authenticated user and campaign-scoped payloads.
- Validate assignment and permission failures on unauthorized access.
- Validate Adoni parse returns preview only, execute requires explicit action IDs.
- Validate sync endpoint is idempotent by `clientEventId`.

## 10. Known blockers
- Full repo typecheck/build baseline already has broad pre-existing issues.
- Prisma migration/generate not executed in this environment during this patch.
- Route-level integration tests not yet authored.

## 11. What is NOT done
- Frontend mobile canvasser UI integration.
- Advanced conflict-resolution UX policies (backend now stores conflict payload skeleton).
- Deep manager dashboards / analytics.
- External AI provider integration (deterministic parser scaffold used).

## 12. Next frontend integration steps
1. Wire mobile mission list to `/api/canvasser/missions`.
2. Wire active mission screen to `current-stop` + stop action routes.
3. Implement Adoni overlay calling transcript -> parse -> execute flow.
4. Implement offline queue sender calling `/api/canvasser/sync`.
