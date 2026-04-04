# App Split Plan

## Current State (Phase 1 — Monolith)

One Next.js app. All products live in route groups.

```
src/
  app/
    (app)/          ← Poll City Admin (authenticated, campaign-scoped)
    social/         ← Poll City Social (public, optional auth)
    api/            ← Shared backend (enforces isolation per endpoint)
    login/          ← Shared auth entry point
    page.tsx        ← Root redirect
    layout.tsx      ← Root layout
```

Print is not yet a route group. It is embedded in the Admin feature set (signs, volunteers, print orders are admin-side only in Phase 1).

---

## What Stays Together Now (Phase 1)

| Feature area | Location | Justification |
|---|---|---|
| Auth (login, session) | Shared — `/login`, `/api/auth` | One identity provider for both products |
| Admin CRM, canvassing, tasks | `/(app)/*` | Campaign-private — correct placement |
| Admin GOTV, call list, quick capture | `/(app)/*` | Campaign-private |
| Social discover, polls, officials | `/social/*` | Public-facing — correct placement |
| Sign request intake (Social side) | `/social/*` → consent bridge → Admin | User-initiated, consent-gated |
| Print (Phase 1) | `/(app)/*` — admin sidebar | No vendor-facing portal yet |
| API routes | `/api/*` — all shared | Backend enforces product boundary |
| Shared UI primitives | `src/components/ui/` | Used by both products |
| Auth helpers | `src/lib/auth/` | Shared identity logic |
| DB layer | `src/lib/db/` | Single Prisma client |

---

## What Becomes Separate Apps (Long-Term)

### Poll City Admin → `apps/admin-web`
- All `/(app)/*` routes
- All admin-only API calls (contacts, canvassing, GOTV, tasks, campaign management)
- Auth via shared `packages/auth`
- Uses `packages/db` for Prisma access
- Uses `packages/permissions` for authorization checks

### Poll City Social → `apps/social-web`
- All `/social/*` routes
- Public API calls (officials, public polls, geo)
- Consent-bridge submissions (support signals, volunteer opt-in, sign requests, contact permission)
- Auth via shared `packages/auth`
- Does NOT directly import or access `packages/db` for campaign-private models
- Calls the shared API layer for all data

### Poll City Print → `apps/print-web` (future)
- Vendor portal for print suppliers
- Campaign-facing print order management (moves out of Admin)
- Uses `packages/print-core` for shared order logic
- Auth: print vendors get a separate VENDOR role

### HQ Dashboard → stays inside `apps/admin-web` (Phase 1 and 2)
- Subscriber-level analytics and account management
- Elevated view within Admin — not a separate app

---

## Shared Package Ownership

| Package | Owned by | Consumed by | Contains |
|---|---|---|---|
| `packages/auth` | Platform team | All apps | NextAuth config, session types, JWT helpers |
| `packages/db` | Platform team | Admin (direct), Social (via API layer only) | Prisma client, schema types |
| `packages/types` | Platform team | All apps | Shared TypeScript interfaces, enums, DTOs |
| `packages/permissions` | Platform team | All apps | Policy-check helpers, role constants |
| `packages/api-contracts` | Platform team | All apps | Public vs private DTO shapes, request/response types |
| `packages/ui` | Platform team | Admin, Social | Shared mobile-first UI components |
| `packages/events` | Platform team | Admin, Social | Consent bridge event types, internal event bus |
| `packages/config` | Platform team | All apps | Env validation, shared constants |
| `packages/maps` | Platform team | Admin, Social | GIS utilities, postal code lookup |
| `packages/print-core` | Print team | Admin, Print | Order logic, template management |

---

## Rules for the Split (When It Happens)

1. `apps/social-web` must never import directly from campaign-private Prisma models. All data access goes through the API layer.
2. `apps/admin-web` must never expose campaign-private data to a Social user context.
3. The consent bridge is the only authorized channel for Social → Admin data flow.
4. Any data crossing the bridge must be logged in `ActivityLog` with `action: "consent_bridge_transfer"`.
5. Shared packages must have no app-specific business logic. They provide primitives only.
6. Each app has its own `.env` and its own Vercel deployment. They share DATABASE_URL pointing to the same Postgres instance.

---

## Migration Trigger Conditions

Do not split into separate apps until:
- [ ] Phase 1 is deployed and smoke-tested
- [ ] Phase 2 core operations features are complete
- [ ] The consent bridge is fully implemented and audited
- [ ] At least one paying campaign is onboarded
- [ ] The team has capacity to maintain separate CI/CD pipelines

Splitting before these conditions creates operational overhead without business benefit.
