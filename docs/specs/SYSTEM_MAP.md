# Poll City — System Map

> The definitive module inventory for Poll City.
> Read before touching anything. Update after every session that adds or removes a module.
>
> **Last updated:** 2026-04-10 — Initial creation from full platform audit
> **Updated by:** Claude Sonnet 4.6 (coordination handoff session)

---

## PRODUCT STRUCTURE

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           POLL CITY PLATFORM                                  │
│                  ONE MONOLITH · ONE DB · ONE VERCEL DEPLOY                    │
├──────────────────┬──────────────────────┬────────────────────────────────────┤
│  Poll City Admin │   Poll City Social   │       Poll City Print              │
│  /(app)/*        │   /social/*          │  Inside Admin (Phase 1)            │
│  Campaign staff  │   Public/voters      │  Print, inventory, fulfilment      │
│  Authenticated   │   Optional auth      │  Vendor portal = future            │
└──────────────────┴──────────────────────┴────────────────────────────────────┘
                              │
                   Shared backend: /api/*
                   Shared DB: PostgreSQL (Railway)
                   Shared auth: NextAuth
```

**Long-term target** (not yet built):
- `apps/admin-web` + `apps/social-web` + `apps/print-web` + `apps/hq-web`
- `packages/auth`, `packages/db`, `packages/permissions`, `packages/types`, `packages/ui`, etc.
- Stubs exist in `apps/` and `packages/` but all code is still in `src/`

---

## MODULE INVENTORY

### TIER 1 — CORE OPERATIONAL (Production-Ready)

| Module | Route(s) | API | Lib | Status | Enterprise |
|--------|----------|-----|-----|--------|-----------|
| Authentication | /login, /api/auth | NextAuth + custom | src/lib/auth/ | ✅ | 🟢 |
| Campaign Setup / Onboarding | /(app)/campaigns | /api/campaigns | src/lib/ | ✅ | 🟢 |
| Contact CRM | /(app)/contacts | /api/contacts | src/lib/ | ✅ | 🟠 |
| Dashboard (6 modes) | /(app)/dashboard | /api/dashboard | — | ✅ | 🟠 |
| GOTV | /(app)/gotv | /api/gotv | src/lib/operations/ | ✅ | 🟠 |
| Field Ops / Canvassing | /(app)/field-ops | /api/field-ops | — | ✅ | 🟠 |
| Signs Management | /(app)/signs | /api/signs | — | ✅ | 🟢 |
| Events | /(app)/events | /api/events | — | ✅ | 🟢 |
| Volunteers | /(app)/volunteers | /api/volunteers | — | ✅ | 🟠 |
| Tasks | /(app)/tasks | /api/tasks | src/lib/operations/task-backbone.ts | ✅ | 🟠 |
| Donations (thin) | /(app)/donations | /api/donations | — | ✅ | 🟠 |
| Adoni AI | /(app)/* (floating) | /api/ai | src/components/adoni/ | ✅ | 🟢 |
| Campaign Website (public) | /[slug]/* | /api/website | — | ✅ | 🟢 |

---

### TIER 2 — BUILT, NEEDS ENRICHMENT

| Module | Route(s) | API | Lib | Status | Enterprise |
|--------|----------|-----|-----|--------|-----------|
| Communications Hub | /(app)/communications | /api/communications, /api/comms | — | ✅ | 🟢 (core) |
| Analytics | /(app)/analytics | /api/analytics | — | ✅ | 🟠 |
| Finance Suite | /(app)/finance/* | /api/finance/* | src/lib/finance/ | ✅ P1-P5 | 🟠 |
| Calendar Suite | /(app)/calendar | /api/campaign-calendar | — | 🟡 | 🟠 |
| Print (Marketplace) | /(app)/print | /api/print/* | — | 🟡 | 🔴 |
| Print Inventory | /(app)/print/inventory | /api/print/inventory | — | 🟡 NEW | 🔴 |
| Print Packs | /(app)/print/packs | /api/print/packs | — | 🟡 NEW | 🔴 |
| Resource Library | /(app)/resources | /api/resources | — | ✅ | 🟢 |
| Automation Engine | /api/cron | /api/cron/* | src/lib/operations/action-engine.ts | ✅ | 🟢 |
| Action Engine | — | /api/actions/execute | src/lib/operations/ | ✅ | 🟢 |

---

### TIER 3 — SCHEMA DEFINED, UI/APIS PENDING

| Module | Route(s) | API | Schema | Status | Notes |
|--------|----------|-----|--------|--------|-------|
| Fundraising Suite | /(app)/fundraising/* | /api/fundraising/* | In progress | 🔴 SCHEMA PENDING | TASK_BOARD has full 6-phase spec |
| Communications Templates | /communications | /api/comms/templates | Not migrated | ❌ | TASK_BOARD Phase 1 |
| Saved Segments | /communications | /api/comms/segments | Not migrated | ❌ | TASK_BOARD Phase 2 |
| Scheduled Messages | /communications | /api/comms/scheduled | Not migrated | ❌ | TASK_BOARD Phase 3 |
| Delivery Webhooks | webhook endpoint | /api/webhooks/resend | Not migrated | ❌ | TASK_BOARD Phase 4 |
| Unified Inbox (backend) | /communications | /api/comms/inbox | Not migrated | ❌ | TASK_BOARD Phase 5 |
| Comms Analytics | /communications | /api/comms/analytics | Not migrated | ❌ | TASK_BOARD Phase 6 |
| Automation Engine (Comms) | /communications | /api/comms/automations | Not migrated | ❌ | TASK_BOARD Phase 7 |
| Social Publishing | /communications | /api/comms/social/publish | Not migrated | ❌ | TASK_BOARD Phase 8 |
| CASL Consent Engine | /communications | /api/comms/consent | Not migrated | ❌ | TASK_BOARD Phase 9 |
| Fatigue Guard | — | middleware | Not migrated | ❌ | TASK_BOARD Phase 10 |

---

### TIER 4 — FUTURE / PLANNED

| Module | Notes |
|--------|-------|
| Turf Management UI | Schema ready. Polygon drawing + assignment UI not built. |
| Social Publishing (FB/IG/X/LI) | OAuth + API integration needed |
| Voice Broadcast API | Schema ready. Twilio Voice integration needed. |
| Google/Outlook Calendar Sync | OAuth integration needed |
| Design Editor (Print) | Polotno/Canva integration needed |
| Brand Kit (applied everywhere) | Settings exist, not applied to outputs |
| Voter File Import | Spec in memory. UI not built. |
| Poll City Social (full) | /social/* routes exist but civic engagement features partial |
| HQ Dashboard (founder ops) | Spec in memory. Not built. |
| George's Brain (CampaignWisdom) | Spec in memory. Not built. |
| Simulation Engine | Spec in memory. Seed data is the current sim. |

---

## SHARED INFRASTRUCTURE

| System | Location | Used By | Status |
|--------|----------|---------|--------|
| Prisma ORM | prisma/schema.prisma | All modules | ✅ Active (db push, no migrations dir) |
| Authentication (apiAuth) | src/lib/auth/helpers.ts | All API routes | ✅ |
| Auth (getServerSession) | NextAuth | Server components | ✅ |
| guardCampaignRoute() | src/lib/auth/helpers.ts | New API routes | ✅ (145 old routes still use legacy pattern) |
| Action Engine | src/lib/operations/action-engine.ts | GOTV, Tasks | ✅ |
| Task Backbone | src/lib/operations/task-backbone.ts | Tasks, dispatch | ✅ |
| Metrics Truth | src/lib/operations/metrics-truth.ts | GOTV summary/gap/priority | ✅ |
| Drill-Through | src/lib/operations/drill-through.ts | GOTV | ✅ |
| sanitizeUserText | src/lib/ | Interactions, notes, donations | ✅ (partial) |
| sanitizeForAI / sanitizePrompt | src/lib/ai/ | Adoni | ✅ |
| ActivityLog | Prisma model | All modules (partially wired) | ✅ |
| Lifecycle Cron | /api/cron/lifecycle | Pledges, VIP donors, events, GOTV | ✅ |
| Weekly Report Cron | /api/cron/weekly-report | Analytics | ✅ |
| Resend (email) | env: RESEND_API_KEY | Communications | 🔑 |
| Twilio (SMS/Voice) | env: TWILIO_* | Communications, Phone Bank | 🔑 |
| Stripe | env: STRIPE_* | Donations | 🔑 |
| Anthropic (Adoni) | env: ANTHROPIC_API_KEY | AI features | 🔑 |

---

## SCHEMA STATUS

| Area | In schema.prisma | Migrated | Notes |
|------|-----------------|----------|-------|
| Core (Contact, Campaign, User, Task, etc.) | ✅ | via db push | |
| Communications (all models) | ✅ | via db push | |
| Finance (13 enums, 9 models) | ✅ | migration: finance_domain_model | |
| Calendar (8 calendars, all supporting models) | ✅ | NOT YET — schema modified but db push not confirmed | RISK |
| Fundraising | ❌ NOT IN SCHEMA | — | TASK_BOARD Phase 1 all pending |
| Field Ops Domain Model (new) | ❌ NOT IN SCHEMA | — | Chunk 6 of field ops mega-build |

**Critical:** No `prisma/migrations/` directory. Project uses `npx prisma db push`. Before production, a migration baseline must be established.

---

## MONOREPO ARCHITECTURE PLAN

Current Phase 1: Everything in `src/`
Future:
- `apps/admin-web/` — all `/(app)/*` routes
- `apps/social-web/` — all `/social/*` routes
- `apps/print-web/` — vendor portal
- `apps/hq-web/` — founder/ops console
- `packages/auth`, `packages/db`, `packages/types`, `packages/permissions`, `packages/ui`, `packages/api-contracts`, `packages/events`, `packages/config`, `packages/maps`, `packages/print-core`

**Current state:** `apps/` and `packages/` exist with README.md stubs only. Zero code has been moved.
**Trigger for split:** When George wants separate deploys per product. Not before.

---

*Updated by: Claude Sonnet 4.6 | 2026-04-10*
