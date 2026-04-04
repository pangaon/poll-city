# Platform Architecture

## Products

Poll City is a multi-product platform. Three products share one backend, one database, and one identity provider.

```
┌─────────────────────────────────────────────────────────────────┐
│                        POLL CITY PLATFORM                        │
├──────────────────┬──────────────────┬───────────────────────────┤
│  Poll City Admin │  Poll City Social│   Poll City Print         │
│  (private ops)   │  (public civic)  │   (print/logistics)        │
├──────────────────┴──────────────────┴───────────────────────────┤
│                    Shared Backend Services                        │
│  Auth · CRM · Polling Engine · GIS · Notifications · Audit      │
├─────────────────────────────────────────────────────────────────┤
│                    PostgreSQL (single DB)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Product Definitions

### Poll City Admin
- **Who:** Campaign staff, campaign managers, elected-official staff, GOTV teams
- **Nature:** Private. Requires authenticated membership in a specific campaign.
- **Purpose:** Campaign operations — CRM, canvassing, tasks, GOTV, volunteer management, sign tracking, analytics, donor/pledge capture, AI assist
- **Domain (long-term):** admin.pollcity.com or app.pollcity.com
- **Phase 1:** Current `/` and `/(app)/*` routes in the monorepo

### Poll City Social
- **Who:** Voters, residents, the general public
- **Nature:** Public. Browsing requires no login. Voting and following require login.
- **Purpose:** Civic engagement — discover local officials, vote on public polls, ask questions, express support, opt into campaign contact
- **Domain (long-term):** pollcity.com or social.pollcity.com
- **Phase 1:** Current `/social/*` routes in the monorepo

### Poll City Print
- **Who:** Campaign operations staff, print vendors (future)
- **Nature:** Private. Campaign-scoped. Vendor portal is future phase.
- **Purpose:** Print materials ordering, sign request fulfilment, distribution tracking, template management
- **Domain (long-term):** print.pollcity.com (separate vendor portal eventually)
- **Phase 1:** Embedded inside Admin/HQ. No separate deploy.

---

## Boundaries

### What Admin can do
- Read and write all campaign-private data
- Publish content to Social (public polls, public official profiles)
- Receive consent-gated signals from Social (with audit log)
- Manage print orders and sign requests
- Access analytics for their campaign only

### What Social can do
- Display public data: officials, public polls, public events
- Accept consent-gated signals from authenticated users
- Never access campaign-private data directly
- Never expose one campaign's data to another campaign's users

### What Print can do (Phase 1 — inside Admin)
- Create and track print orders scoped to a campaign
- Receive sign requests from Social (via consent bridge)
- Track sign installation and removal
- Generate distribution reports

### What the Shared Backend does
- Authenticate users via NextAuth (single identity provider)
- Enforce campaign isolation on every query
- Route consent-gated bridge data from Social to CRM with audit logging
- Serve public data (officials, public polls, geo) without authentication

---

## Phase 1 Deployment Model

```
ONE REPO → ONE NEXT.JS APP → ONE VERCEL DEPLOYMENT → ONE POSTGRES DB

Routes:
  /(app)/*      → Poll City Admin
  /social/*     → Poll City Social
  /api/*        → Shared backend (enforces isolation per route)

Print:
  Embedded in /(app)/print/* (not yet built — placeholder in admin nav)
```

**No separate deploys yet.** The product boundary is enforced by:
- Route grouping in Next.js App Router
- Middleware protecting `/(app)/*` routes
- API routes enforcing membership checks for campaign data
- No cross-product data leakage in any API response

---

## Long-Term Deployment Model

```
THREE REPOS (or monorepo with workspaces):

  apps/admin-web   → admin.pollcity.com
  apps/social-web  → pollcity.com
  apps/print-web   → print.pollcity.com (future)

Shared packages (published internally or via npm workspace):
  packages/auth           → NextAuth config, session types
  packages/db             → Prisma client singleton, schema types
  packages/types          → Shared TypeScript types and DTOs
  packages/permissions    → Policy-check helpers per app context
  packages/api-contracts  → Public vs private DTO definitions
  packages/ui             → Shared UI primitives (mobile-first)
  packages/events         → Internal event bus for bridge signals
  packages/maps           → GIS utilities
  packages/print-core     → Print order logic
  packages/config         → Shared env validation, constants

Identity:
  Shared NextAuth instance or OAuth provider
  Session tokens valid across all three apps
  Role determines which app a user can access

Database:
  Single PostgreSQL instance (Phase 1 and 2)
  Optional: dedicated instance per campaign (future enterprise tier)
```

---

## Shared Subscriber Dashboard (HQ)

Campaigns and elected officials who are paying subscribers get access to a shared control center (HQ). This is not a separate app — it is an elevated view within Poll City Admin.

HQ surfaces:
- Cross-channel analytics (Admin + Social engagement)
- Subscriber-tier features (advanced AI, bulk operations)
- Billing and account management
- Campaign settings and team management

Phase 1: HQ is `/(app)/settings` and the dashboard in Admin.
Long-term: HQ may become `hq.pollcity.com` or remain integrated in Admin.

---

## Identity Model

| User type | Can access Admin | Can access Social | Role |
|-----------|-----------------|-------------------|------|
| SUPER_ADMIN | All campaigns | As public user | System operator |
| ADMIN | Own campaigns (Membership) | As public user | Campaign admin |
| CAMPAIGN_MANAGER | Own campaigns | As public user | Ops |
| VOLUNTEER | Own campaigns (limited) | As public user | Field |
| PUBLIC_USER | No | Yes | Voter/resident |

Membership.role governs Admin access within a campaign.
User.role governs system-level access only.
Social access requires only a valid session (PUBLIC_USER is sufficient).
