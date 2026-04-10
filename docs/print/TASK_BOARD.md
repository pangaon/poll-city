# Poll City Print Platform — TASK BOARD
*Production-grade print + design + ordering + inventory + distribution system*
*Last updated: 2026-04-10*

---

## PHASE STATUS

| Phase | Name | Status | Target |
|-------|------|--------|--------|
| 1 | Foundation (Inventory + Packs) | 🟡 IN PROGRESS | 2026-04-10 |
| 2 | Design Engine (Canva-level editor) | ⬜ PLANNED | TBD |
| 3 | Product + Catalog System | ⬜ PLANNED | TBD |
| 4 | Ordering System | ⬜ PLANNED | TBD |
| 5 | Inventory + Vendor Routing | ⬜ PLANNED | TBD |
| 6 | Campaign Integration | ⬜ PLANNED | TBD |
| 7 | Logistics + Delivery | ⬜ PLANNED | TBD |
| 8 | Print Network Marketplace | ⬜ PLANNED | TBD |
| 9 | AI Assist + Automation | ⬜ PLANNED | TBD |

---

## PHASE 1 — FOUNDATION

### Schema
- [x] `PrintShop` model — vendor registry
- [x] `PrintJob` model — marketplace job posting
- [x] `PrintBid` model — vendor bids
- [x] `PrintTemplate` model — HTML templates
- [x] `PrintOrder` model — campaign orders
- [x] `LiteraturePiece` model — basic literature inventory
- [x] `LiteraturePackage` / `LiteraturePackageItem` — literature bundles
- [x] `SignInventoryItem` model — sign inventory
- [x] `AssignmentResourcePackage` — links field assignments to resources
- [ ] `PrintInventory` model — unified print inventory tracker
- [ ] `PrintInventoryLog` model — audit log for all inventory movements
- [ ] `PrintPack` model — automated bundle generator
- [ ] `PrintPackItem` model — items in a print pack

### API Routes
- [x] `GET/POST /api/print/templates` — template management
- [x] `GET/POST /api/print/jobs` — job marketplace
- [x] `GET/PATCH/DELETE /api/print/jobs/[id]` — job detail
- [x] `GET/POST /api/print/jobs/[id]/bids` — bid management
- [x] `POST /api/print/payment/create-intent` — Stripe payment
- [x] `POST /api/print/payment/release` — payment release
- [x] `GET /api/print/shops` — shop directory
- [x] `POST /api/print/shops/onboard` — Stripe Connect onboarding
- [x] `GET /api/print/preview/[slug]` — design preview
- [x] `GET /api/print/download/[slug]` — design download
- [x] `GET/POST /api/print/orders` — order management
- [x] `GET /api/print/walk-list` — walk list generation
- [ ] `GET/POST /api/print/inventory` — inventory CRUD
- [ ] `GET/PATCH/DELETE /api/print/inventory/[id]` — inventory item
- [ ] `POST /api/print/inventory/[id]/assign` — assign inventory to volunteer/event
- [ ] `POST /api/print/inventory/[id]/log` — manual inventory adjustment
- [ ] `GET/POST /api/print/packs` — print pack management
- [ ] `GET/PATCH /api/print/packs/[id]` — pack detail
- [ ] `POST /api/print/packs/generate` — auto-generate pack from turf/poll

### UI Pages
- [x] `/print` — print dashboard (product grid, operational links)
- [x] `/print/jobs` — job marketplace
- [x] `/print/jobs/new` — post new job
- [x] `/print/jobs/[id]` — job detail
- [x] `/print/shops` — shop directory
- [x] `/print/shops/register` — vendor registration
- [x] `/print/design/[slug]` — HTML template preview + order panel
- [x] `/print/products/[product]` — product detail
- [x] `/print/templates` — template gallery
- [ ] `/print/inventory` — inventory management dashboard
- [ ] `/print/packs` — print pack generator

---

## PHASE 2 — DESIGN ENGINE (Canva-level)

### Core Editor
- [ ] Canvas component with drag-and-drop (using `@dnd-kit` — already installed)
- [ ] Text element: font family, size, weight, color, alignment
- [ ] Image element: upload, crop, resize, position
- [ ] Shape element: rectangle, circle, line
- [ ] Layer system: z-index management, lock/unlock
- [ ] Brand kit auto-apply: colors, fonts, logo, candidate name
- [ ] Template system: load from `PrintTemplate.htmlTemplate`
- [ ] Undo/redo history (20-step)
- [ ] Safe zone overlay (bleed, margin guides)
- [ ] Mobile-friendly editor at 390px

### Print Validation
- [ ] DPI validation (min 300 DPI at print size)
- [ ] CMYK color mode indicator
- [ ] Bleed zone check (0.125 inch standard)
- [ ] Safe zone check (0.125 inch safe margin)
- [ ] Font embedding check
- [ ] File size estimation

### AI Features (Adoni)
- [ ] "Generate flyer from campaign data" — populate from Campaign model
- [ ] "Convert this message into print layout" — AI layout suggestion
- [ ] "Auto-adapt for different sizes" — scale and reflow

### Export
- [ ] Export to PDF (print-ready, CMYK, embedded fonts)
- [ ] Export to PNG (web preview)
- [ ] Version locking at order time (snapshot designData)

---

## PHASE 3 — PRODUCT + CATALOG SYSTEM

### Product Catalog
- [ ] `PrintProductCatalog` model — product variants with full specs
- [ ] Sizes × materials × finishes matrix
- [ ] Quantity tier pricing (dynamic, per-product)
- [ ] Rush fee calculator
- [ ] Vendor-specific pricing overrides
- [ ] Production time estimator (standard vs rush)

### Product Pages
- [ ] Full product detail pages with specs, materials, pricing table
- [ ] Size comparison tool
- [ ] Side-by-side quantity calculator
- [ ] Template gallery filtered by product

---

## PHASE 4 — ORDERING SYSTEM

### Order Flow
- [ ] Create Design → Select Product → Configure → Preview → Order
- [ ] Live pricing updates as quantity changes
- [ ] Bulk orders (multiple products in one checkout)
- [ ] Multi-address shipping (ship to HQ + to 3 volunteers)
- [ ] Split shipments management
- [ ] Design version lock at order submission
- [ ] Proof approval workflow (draft → proof → approved → printing)
- [ ] Reorder from history (1-click reorder)
- [ ] Template reuse across orders

### Checkout
- [ ] Stripe payment integration (already wired for jobs, extend to orders)
- [ ] Tax calculation (HST/GST by province)
- [ ] Shipping cost estimator
- [ ] Order confirmation email (via Resend)

---

## PHASE 5 — INVENTORY + VENDOR ROUTING

### Inventory (extends Phase 1)
- [ ] SKU auto-generation
- [ ] Batch receive (one click: order fulfilled → inventory created)
- [ ] Inventory transfer (between storage locations)
- [ ] Reorder trigger automation (below threshold → create new print job)
- [ ] Inventory reconciliation (physical count vs system)
- [ ] Waste reporting

### Vendor Routing
- [ ] Auto-routing rules: price × location × turnaround
- [ ] Vendor performance scoring
- [ ] Preferred vendor per product type
- [ ] Fallback vendor chain

---

## PHASE 6 — CAMPAIGN INTEGRATION

### Canvassing
- [ ] Literature linked to turf (turf → auto-calculate flyer qty)
- [ ] Print pack auto-generated from walk list
- [ ] Canvasser receives pack → marks depleted as they go
- [ ] Pack reconciliation on return

### Signs
- [ ] Sign inventory tied to `Sign` records (requested → fulfilled from inventory)
- [ ] Sign team gets auto-generated install kit
- [ ] Install/remove tracking consumes/returns from inventory
- [ ] Sign reorder when inventory drops below threshold

### Volunteers
- [ ] Assign materials to individual volunteer profiles
- [ ] Usage tracking per volunteer
- [ ] Return tracking

### Events
- [ ] Allocate print inventory to event record
- [ ] Event pack auto-generated from expected attendance
- [ ] Post-event reconciliation (returned + depleted)

---

## PHASE 7 — LOGISTICS + DELIVERY

### Delivery Options
- [ ] Ship to HQ address
- [ ] Ship to volunteer home address
- [ ] Local courier integration (TBD)
- [ ] Pickup at print shop

### Tracking
- [ ] Carrier tracking number storage (already in `PrintJob`)
- [ ] Status webhook from carrier (Canada Post, Purolator, UPS)
- [ ] Delivery confirmation notification
- [ ] Failed delivery handling (retry / redirect)

### Offline Mode
- [ ] Print PDF walk list with inventory checklist
- [ ] Manual paper marking
- [ ] Re-upload: scan/photo → update system

---

## PHASE 8 — PRINT NETWORK MARKETPLACE

### Vendor Network
- [ ] Verified vendor directory with ratings
- [ ] Bid auto-expiry (24h default)
- [ ] Auto-award (lowest price or fastest, configurable)
- [ ] Vendor performance dashboard
- [ ] Escrow payment hold + release on delivery confirmation
- [ ] Dispute resolution workflow

### Internal Printing
- [ ] Campaign marks self as "in-house" printer
- [ ] No vendor workflow — direct to production queue
- [ ] Cost tracking for internal jobs

---

## PHASE 9 — AI ASSIST + AUTOMATION (ADONI)

### Adoni Print Intelligence
- [ ] Quantity suggestion: "Based on your ward size and 2 canvass passes, you need ~2,800 flyers"
- [ ] Cost optimization: "Ordering 2,500 instead of 2,000 saves $0.04/unit — recommended"
- [ ] Shortage detection: "You have 340 flyers left but 6 unassigned turfs — reorder now"
- [ ] Waste alert: "23% of your last batch was unused — consider 15% smaller run next time"
- [ ] Design suggestion: "Your door hanger has 47 words — most effective are under 25"
- [ ] Auto-generate materials: "I've created a flyer draft from your campaign data — review it"
- [ ] Reorder automation: below threshold → Adoni notifies + drafts reorder job

---

## EDGE CASE REGISTRY
*See EDGE_CASES.md for full detail on all edge cases*

| # | Edge Case | Phase | Status |
|---|-----------|-------|--------|
| 1 | Design resolution < 300 DPI | 2 | ⬜ |
| 2 | Wrong bleed size | 2 | ⬜ |
| 3 | Incorrect size mapping | 3 | ⬜ |
| 4 | Inventory mismatch (system vs physical) | 5 | ⬜ |
| 5 | Lost materials mid-campaign | 1 | ⬜ |
| 6 | Duplicate orders | 4 | ⬜ |
| 7 | Vendor failure / no bids | 8 | ⬜ |
| 8 | Late delivery | 7 | ⬜ |
| 9 | Volunteer no-show (pack stranded) | 6 | ⬜ |
| 10 | Over/under printing | 1 | ⬜ |
| 11 | Multi-campaign data isolation | 1 | ✅ |
| 12 | Reassign inventory mid-campaign | 1 | ⬜ |
| 13 | Manual print override | 1 | ⬜ |
| 14 | Offline / paper-based workflow | 7 | ⬜ |

---

*This task board is the source of truth for print platform work.*
*Updated every session. Never let it fall behind the code.*
