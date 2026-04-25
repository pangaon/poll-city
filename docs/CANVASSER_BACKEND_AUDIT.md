# CANVASSER BACKEND AUDIT

Date: 2026-04-25
Scope: Backend foundation for Poll City Canvasser App v1

## 1) Current auth pattern
- Web/API session auth is primarily NextAuth JWT sessions (`apiAuth`) in `src/lib/auth/helpers.ts`.
- Mobile API supports Bearer JWT tokens via `mobileApiAuth` in the same helper.
- Mobile token issuance already exists at `/api/auth/mobile/token` with refresh/social companion routes.

## 2) Current campaign guard pattern
- Canonical guard helper: `guardCampaignRoute(userId, campaignId, ...permissions)` in `src/lib/permissions/engine.ts`.
- Permission resolution is membership + campaign role aware via `resolvePermissions`.
- Existing routes usually require both auth + guard before data access.

## 3) Current Prisma campaign models
- Campaign, Membership, CampaignRole, Contact, Household, Turf, TurfStop, FieldAssignment, AssignmentStop, FieldAttempt, FollowUpAction all exist.
- Existing models already include campaign-scoped IDs on core field entities.

## 4) Existing voter/supporter/person/household models
- `Contact` is the voter/person record.
- `Household` groups address-level context.
- `Interaction` stores contact attempt history.
- `CustomFieldValue` + `CampaignField` provide dynamic campaign fields.

## 5) Existing task/sign/volunteer models
- `Task` exists and is campaign-scoped.
- `Sign` exists with lifecycle statuses.
- `VolunteerProfile` exists but no dedicated canvasser lead capture ledger for transient field leads.

## 6) Existing audit log model
- `ActivityLog` exists and is used by `src/lib/audit.ts` helper.
- No dedicated canvasser-specific execution/audit chain for Adoni parse/execute yet.

## 7) Existing API route structure
- Next.js App Router handlers under `src/app/api/**/route.ts`.
- Route conventions: request payload validation (often zod), guard with auth + permission helper, then prisma operations.

## 8) Missing backend pieces (pre-implementation)
- No dedicated canvasser mission API surface under `/api/canvasser/*` beyond location tracking.
- No explicit models for:
  - candidate pings
  - PCS invites from door
  - adoni transcript/action/execution chain
  - offline sync event queue ledger
  - canvasser volunteer lead capture ledger
  - lit drop logs/pieces
  - safety flags
- No shared canvasser service layer with door-flow operations.

## 9) Recommended implementation path
1. Add missing canvasser foundation models and enums in Prisma (tenant-scoped).
2. Build canvasser service layer (`src/lib/canvasser/`) with campaign and assignment checks.
3. Add tenant-safe `/api/canvasser/*` routes with zod payload validation.
4. Add deterministic Adoni parser/preview/execute scaffold (safe default, confirmation required).
5. Add offline sync ingestion endpoint with idempotency by `clientEventId`.
6. Ensure all mutations write `ActivityLog` via `audit()` helper.
