# Poll City Print Platform — SYSTEM ARCHITECTURE
*Enterprise-grade print + design + ordering + inventory + distribution*
*Last updated: 2026-04-10*

---

## OVERVIEW

The Print Platform is a fully integrated subsystem of the Poll City Campaign App.
It provides campaigns with end-to-end control over their printed materials —
from design to print to distribution to depletion tracking.

It matches or exceeds the feature set of Vistaprint, Canva Print, Moo, and UPrinting,
with a critical differentiator: deep integration into campaign operations.

---

## SYSTEM LAYERS

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAMPAIGN APP (app.poll.city)                  │
│                                                                  │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Design  │  │  Orders  │  │Inventory │  │  Print Packs     │ │
│  │ Engine  │  │ & Catalog│  │ Tracker  │  │  (Automation)    │ │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│       │            │             │                  │           │
│  ┌────▼────────────▼─────────────▼──────────────────▼─────────┐ │
│  │                     PRINT API LAYER                        │ │
│  │  /api/print/{templates,jobs,inventory,packs,orders,...}    │ │
│  └────────────────────────────┬───────────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────────┘
                                │
              ┌─────────────────▼──────────────────┐
              │         PRISMA + POSTGRESQL         │
              │  (Railway — single multi-tenant DB) │
              └─────────────────┬──────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
   ┌─────▼──────┐         ┌─────▼──────┐        ┌─────▼──────┐
   │  Vercel    │         │   Stripe   │        │   Resend   │
   │  Blob      │         │  Payments  │        │   Emails   │
   │  (files)   │         │  + Connect │        │ (receipts) │
   └────────────┘         └────────────┘        └────────────┘
```

---

## MODULE BREAKDOWN

### Module 1 — Design Engine

**Technology:** Client-side canvas editor using `@dnd-kit/core` (already installed)
**Location:** `src/app/(app)/print/design/[slug]/`

```
DesignCanvas
├── LayerPanel          (layer list + z-index control)
├── ElementToolbar      (add text, image, shape)
├── PropertiesPanel     (selected element properties)
├── BleedGuideOverlay   (0.125" bleed + safe zone visualization)
├── BrandKitApplicator  (auto-fills campaign colors/fonts/logo)
└── ExportManager       (PDF/PNG generation)
```

**State management:** Local React state + `designData` JSON persisted to `PrintOrder.designData`
**DPI validation:** Client-side: warn at < 300 DPI for uploaded images
**Version lock:** On order submit, snapshot `designData` — immutable after that

### Module 2 — Product + Print Catalog

**Technology:** Static catalog in `src/lib/print/catalog.ts` + dynamic pricing from DB
**Location:** `src/app/(app)/print/products/[product]/`

```
ProductCatalog
├── PRINT_PRODUCTS[]    (static specs: sizes, materials, turnaround)
├── ProductVariant[]    (DB: dynamic pricing per qty tier)
└── PricingEngine       (quantity breaks + rush fees + vendor overrides)
```

### Module 3 — Ordering System

**Technology:** Multi-step form → Stripe payment → order lifecycle
**Flow:**
```
Design → Select Product → Configure Qty → Shipping → Payment → Confirmation
   ↓                                                      ↓
PrintOrder.status = draft                    PrintOrder.status = printing
   ↓                                                      ↓
Designer approves proof                      Fulfilled → PrintInventory created
```

### Module 4 — Inventory System

**Technology:** `PrintInventory` model + `PrintInventoryLog` for full audit trail
**Key principle:** Every quantity change goes through a log entry — no direct mutations

```
PrintInventory
├── totalQty        (set at receive time, never decreases)
├── availableQty    (totalQty - reservedQty - depletedQty - wastedQty)
├── reservedQty     (assigned to packs/volunteers but not yet used)
├── depletedQty     (confirmed used/distributed)
└── wastedQty       (damaged/discarded)
```

**Inventory lifecycle:**
```
PrintOrder (fulfilled) → PrintInventory.receive()
PrintInventory → PrintPack.allocate()  → reservedQty++
PrintPack (distributed) → depletedQty += actually_used
PrintPack (returned) → depletedQty += used; reservedQty -= returned
```

### Module 5 — Print Pack Automation

**Technology:** Server-side calculation from turf/poll data
**Formula:**
```
targetCount = households in turf OR voters in poll
buffer = targetCount × bufferPct (default 20%)
packQty = targetCount + buffer (rounded up to nearest 50)
```

**Pack types:**
- `walk_kit`: flyers × packQty, door_hangers × packQty
- `sign_install_kit`: lawn_signs × requested_count
- `lit_drop_kit`: flyers × packQty
- `event_kit`: palm_cards × expected_attendance + buffer
- `gotv_kit`: palm_cards × target_voters

### Module 6 — Campaign Integration

**Integration points:**
```
Turf ──────────────→ PrintPack (walk_kit)
  └── turfId stored on PrintPack
  └── totalDoors used as targetCount

Sign (requested) ──→ PrintPack (sign_install_kit)
  └── count of Sign{status: requested} in area

FieldAssignment ───→ PrintPack (any type)
  └── fieldAssignmentId stored on PrintPack
  └── pack distributed with assignment

Event ─────────────→ PrintPack (event_kit)
  └── eventId stored on PrintPack
  └── estimatedAttendance as targetCount
```

### Module 7 — Vendor Network (Print Marketplace)

**Technology:** Existing `PrintShop` + `PrintJob` + `PrintBid` models + Stripe Connect
**Flow:**
```
Campaign creates PrintJob → shops notified (email/push)
Shops submit PrintBid → campaign reviews
Campaign awards bid → PaymentIntent held in escrow
Production completes → delivery confirmed
PaymentIntent released → PrintInventory created
```

### Module 8 — Logistics

**Technology:** Carrier API integration (Phase 7)
**Tracking stored on:** `PrintJob.trackingNumber` + `PrintJob.carrier`

### Module 9 — AI Assist (Adoni)

**Integration:** Adoni reads `PrintInventory` aggregates + campaign data to generate suggestions
**Prompts go through:** `sanitizePrompt()` (CLAUDE.md security rule)
**Response format:** No markdown, no bullets, max 8 sentences (Adoni laws)

---

## DATA FLOW DIAGRAM

```
User Action → Next.js API Route → Zod Validation → apiAuth() check
    → Membership scope check (campaignId)
    → Prisma transaction
    → ActivityLog entry
    → Downstream effects (inventory, notifications)
    → Response
```

---

## SECURITY MODEL

| Layer | Rule |
|-------|------|
| Authentication | `apiAuth(req)` on every print API route |
| Authorization | `membership` check with `campaignId` scope |
| Campaign isolation | Every query filtered by `campaignId` — no cross-campaign reads |
| File uploads | Vercel Blob with signed URLs — no direct public access |
| Payment | Stripe handles all card data — Poll City never sees card numbers |
| AI prompts | `sanitizePrompt()` on all user text to Claude |

---

## ROLE PERMISSIONS

| Action | VOLUNTEER | CAMPAIGN_MANAGER | ADMIN | SUPER_ADMIN |
|--------|-----------|-----------------|-------|-------------|
| View inventory | ✓ | ✓ | ✓ | ✓ |
| Create inventory | ✗ | ✓ | ✓ | ✓ |
| Assign inventory | ✗ | ✓ | ✓ | ✓ |
| Create print pack | ✗ | ✓ | ✓ | ✓ |
| Post print job | ✗ | ✓ | ✓ | ✓ |
| Award print bid | ✗ | ✓ | ✓ | ✓ |
| Register as shop | ✗ | ✗ | ✗ | ✓ |
| View all campaigns | ✗ | ✗ | ✗ | ✓ |

---

## TECHNOLOGY CHOICES

| Component | Technology | Reason |
|-----------|------------|--------|
| Framework | Next.js 14 App Router | Existing stack |
| Database | PostgreSQL via Prisma | Existing stack |
| Payments | Stripe + Stripe Connect | Already integrated |
| File storage | Vercel Blob | Already integrated |
| Email | Resend | Already integrated |
| Canvas (design) | @dnd-kit/core + html-to-image | Already installed |
| Animations | framer-motion | Platform standard |
| PDF generation | Browser print API + sharp | Already installed |
| No new deps | — | CLAUDE.md rule |

---

## MULTI-TENANCY

Every `PrintInventory`, `PrintPack`, `PrintJob`, `PrintOrder`, `PrintTemplate` record
is scoped by `campaignId`. No cross-campaign reads are permitted at any layer.

Exception: `PrintShop` and `PrintTemplate` records are platform-wide (no campaignId).
These are read-only for campaigns — only SUPER_ADMIN can modify them.

---

*Architecture reflects state as of Phase 1. Updated each phase.*
