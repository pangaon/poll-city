# Poll City Print Platform — EDGE CASES
*Every known failure mode. Every handling strategy.*
*No edge case is skipped. No failure is silent.*
*Last updated: 2026-04-10*

---

## LEGEND

| Symbol | Meaning |
|--------|---------|
| ✅ HANDLED | Code exists, tested |
| 🟡 PARTIAL | Handled but incomplete |
| ⬜ PLANNED | Not yet built — in a future phase |
| ⚠ RISK | Risk identified, no handling yet |

---

## CATEGORY 1 — DESIGN + FILE ISSUES

### EC-001: Design image resolution < 300 DPI ⬜ (Phase 2)
**Scenario:** User uploads a 72 DPI JPEG screenshot as their flyer image.
**Risk:** Printed output is blurry, pixelated.
**Handling:**
- On image upload: calculate effective DPI (pixels ÷ inches at print size)
- If < 150 DPI: block upload, show error "This image will print blurry. Minimum 150 DPI required."
- If 150–299 DPI: yellow warning "Image may print soft. 300 DPI recommended."
- If ≥ 300 DPI: silent pass
**API note:** DPI check on client side (instant feedback). Server-side re-check before download.

### EC-002: Wrong bleed / no bleed ⬜ (Phase 2)
**Scenario:** User's uploaded PDF has no bleed margin.
**Risk:** White edges on cut product.
**Handling:**
- Design editor shows bleed guides (0.125" default per product spec)
- Warning overlay: "Your design has no bleed. Background colours will show white edges."
- Block order if user has not acknowledged bleed warning
- Exception: products that don't require bleed (buttons, stickers with die-cut)

### EC-003: Incorrect size mapping ⬜ (Phase 3)
**Scenario:** User designs a flyer at 8.5x11 but selects the 5.5x8.5 product.
**Risk:** Design is cropped during production.
**Handling:**
- `PrintTemplate.width` × `PrintTemplate.height` locked to template
- Product selector pre-filtered to match template dimensions
- If user selects mismatched product: error "This template is 8.5×11 inches. Select a matching product or resize."

### EC-004: Font not embedded ⬜ (Phase 2)
**Scenario:** Exported PDF uses a system font not embedded.
**Risk:** Printer's system replaces font with Helvetica or Times New Roman.
**Handling:**
- Design engine uses web fonts (Google Fonts or hosted) — always embedded in export
- HTML-to-image/PDF pipeline embeds all fonts via CSS `@font-face`
- Warning on export: "Fonts embedded. Using [Font Name]."

### EC-005: CMYK vs RGB mismatch ⬜ (Phase 2)
**Scenario:** User uses RGB values for brand colours; print output shifts colour.
**Risk:** Navy #0A2342 prints as a different shade.
**Handling:**
- Show CMYK equivalent beside colour picker (conversion formula on client)
- Warning: "RGB mode. Colours may shift slightly in print. Recommended CMYK values shown."
- Download generates HTML with `color-gamut: p3` hint where supported

---

## CATEGORY 2 — INVENTORY ISSUES

### EC-006: Inventory quantity goes negative ✅ (Phase 1)
**Scenario:** Two concurrent assignment requests deplete same inventory.
**Handling:**
- `POST /api/print/inventory/[id]/assign` uses Prisma transaction with atomic decrement
- Check `availableQty >= qty` INSIDE the transaction (not before)
- If race: second request gets 409 "Insufficient inventory"
- Use `prisma.$transaction` with `SELECT FOR UPDATE` semantics

### EC-007: Physical count mismatches system count ⬜ (Phase 5)
**Scenario:** After a canvass, volunteer returns 120 flyers but system shows 150 reserved.
**Risk:** Inventory tracker becomes unreliable.
**Handling:**
- `POST /api/print/inventory/[id]/adjust` (admin only)
- Requires `notes` field explaining discrepancy
- Creates `PrintInventoryLog` with `action=adjusted`
- If adjustment > 10% of `totalQty`: flags for review in SUPER_ADMIN /ops

### EC-008: Lost materials mid-campaign ⬜ (Phase 1)
**Scenario:** Volunteer loses their pack of 200 door hangers.
**Risk:** Quantities permanently lost; system shows wrong available.
**Handling:**
- `POST /api/print/inventory/[id]/deplete` with `notes="Lost — volunteer John Smith"`
- Campaign manager must confirm before depleting
- ActivityLog entry created
- Lost items count toward `depletedQty` (no `wastedQty` — genuinely lost)

### EC-009: Inventory linked to deleted PrintOrder ⬜ (Phase 1)
**Scenario:** PrintOrder is cancelled after inventory was received.
**Risk:** `PrintInventory.orderId` FK becomes stale.
**Handling:**
- `PrintOrder` uses soft delete (add `deletedAt` column in Phase 4)
- `PrintInventory.orderId` set to nullable — order cancellation does NOT delete inventory
- Inventory persists even if source order is cancelled

### EC-010: Reorder below threshold — no action taken ⬜ (Phase 9)
**Scenario:** Flyer inventory drops below threshold; nobody notices.
**Risk:** Campaign runs out of materials before election day.
**Handling:**
- Nightly cron checks `available_qty <= reorder_threshold` for all active campaigns
- Push notification to campaign managers
- Adoni surfaces alert on next login
- Optionally: auto-draft a PrintJob for the shortfall quantity

---

## CATEGORY 3 — ORDERING ISSUES

### EC-011: Duplicate order submission ⬜ (Phase 4)
**Scenario:** User double-clicks "Order" button; two identical orders submitted.
**Handling:**
- Client: disable button on first click (optimistic UI)
- Server: idempotency check — if identical `{campaignId, templateId, quantity, designData hash}` submitted within 60 seconds: return existing order, not a new one
- Idempotency key included in POST body

### EC-012: Design changes after order submitted ⬜ (Phase 4)
**Scenario:** Campaign manager edits the template after order is approved.
**Risk:** Next order uses a different design than what was printed.
**Handling:**
- `PrintOrder.designData` is a JSON snapshot taken at submit time
- Template edits do NOT affect submitted orders
- Warning: "Design locked at order time. Changes here won't affect order #123."

### EC-013: Order placed with insufficient budget ⬜ (Phase 4)
**Scenario:** Campaign's Stripe balance insufficient for order total.
**Handling:**
- Stripe handles payment failure gracefully
- Order remains in `draft` status; not moved to `proof`
- User shown "Payment failed — check your payment method" with Stripe error message (sanitized)
- Order recoverable: user can retry payment without re-designing

---

## CATEGORY 4 — VENDOR + MARKETPLACE ISSUES

### EC-014: No bids received on a print job ⬜ (Phase 8)
**Scenario:** Job posted but no shops bid within 48 hours.
**Risk:** Campaign has no printer and deadline approaching.
**Handling:**
- Auto-reminder email to all matching shops at 24h
- Campaign notified at 48h: "No bids yet. Would you like to extend deadline or expand search area?"
- Fallback: campaign can convert to self-print (download design, use own printer)
- Adoni alert: "Your lawn sign job has 0 bids with 5 days to deadline."

### EC-015: Awarded vendor fails to deliver ⬜ (Phase 8)
**Scenario:** Vendor accepts job, takes payment, goes silent.
**Risk:** Campaign has no materials and payment is gone.
**Handling:**
- Payment held in Stripe escrow until campaign confirms delivery
- If delivery unconfirmed after `estimatedDelivery + 5 days`: auto-flag to SUPER_ADMIN
- Campaign can open dispute via `/api/print/jobs/[id]/dispute`
- Stripe dispute process initiated; payment held until resolved
- Vendor rating drops automatically

### EC-016: Vendor delivers wrong quantity ⬜ (Phase 8)
**Scenario:** Shop ships 800 flyers but order was for 1,000.
**Handling:**
- On inventory receive: "Actual received quantity" field separate from "ordered quantity"
- If `receivedQty < orderedQty * 0.95`: auto-flag shortfall, contact vendor
- Partial payment release: `receivedQty / orderedQty * total`
- Remaining payment held pending delivery of balance

---

## CATEGORY 5 — CAMPAIGN INTEGRATION ISSUES

### EC-017: Turf disbanded after print pack created ⬜ (Phase 6)
**Scenario:** Turf reassigned or deleted; print pack's `turfId` FK is stale.
**Handling:**
- `PrintPack.turfId` is nullable FK; turf deletion sets it to null (CASCADE SET NULL)
- Pack still shows historical `targetCount`
- Warning on pack detail: "Linked turf no longer exists."

### EC-018: Volunteer assigned pack but cancels day-of ⬜ (Phase 6)
**Scenario:** Canvasser receives pack assignment, then cancels. Pack is stranded.
**Risk:** 450 flyers reserved but nobody will use them.
**Handling:**
- When volunteer cancels assignment: prompt "Return print pack to inventory?"
- If confirmed: `POST /api/print/inventory/[id]/return` for all pack items
- Pack status → `returned`
- If not confirmed within 24h: pack flagged for manual reconciliation

### EC-019: Over-printing (too many materials ordered) ⬜ (Phase 9)
**Scenario:** Campaign orders 5,000 flyers for a 1,200 household ward.
**Handling:**
- Before order submission: Adoni warns "Your ward has ~1,200 households. 5,000 flyers is 4× more than typical. Consider 1,500 + 20% buffer."
- Not a hard block — campaign can override with explanation
- Post-campaign: waste report shows excess printing cost

### EC-020: Under-printing (not enough materials) ⬜ (Phase 9)
**Scenario:** 800 flyers ordered for 1,200 households; pack generation fails.
**Handling:**
- `POST /api/print/packs/generate` returns shortfall in response
- UI shows: "⚠ Shortfall: 240 door hangers. [Order More]"
- Campaign can proceed with partial pack or order more first
- Adoni suggestion: "Order ~300 more door hangers to cover this turf safely."

---

## CATEGORY 6 — MULTI-TENANCY + SECURITY

### EC-021: Campaign isolation breach ✅ (Phase 1)
**Scenario:** User knows another campaign's `inventoryId` and tries to query it.
**Handling:**
- Every `PrintInventory` query includes `campaignId` scope from session
- If `inventory.campaignId !== session campaignId`: 403 returned
- Never expose inventory IDs in public URLs

### EC-022: SUPER_ADMIN viewing all print data ⬜ (Phase 1)
**Scenario:** George needs to audit all campaigns' print activity.
**Handling:**
- `GET /api/print/inventory?adminView=all` — SUPER_ADMIN only, returns all campaigns
- Role check: `session.user.role === "SUPER_ADMIN"` in route
- Audit log: SUPER_ADMIN reads are logged to ActivityLog

### EC-023: Volunteer accessing inventory management ✅ (Phase 1)
**Scenario:** Volunteer tries to create or adjust inventory.
**Handling:**
- Role check in route: `membership.role === "CAMPAIGN_MANAGER" || "ADMIN" || "SUPER_ADMIN"`
- Volunteer gets 403
- Volunteer CAN view inventory (GET only) — they need to know pack sizes

---

## CATEGORY 7 — OFFLINE + EDGE CONNECTIVITY

### EC-024: Campaign manager offline during pack distribution ⬜ (Phase 7)
**Scenario:** Field conditions — no internet at distribution point.
**Handling:**
- Print pack as PDF before leaving HQ
- PDF includes: checklist of all items, quantities, barcode/QR for quick sync when back online
- Manual paper-based count → upload on return: CSV upload updates system

### EC-025: Print pack PDF generation fails ⬜ (Phase 7)
**Scenario:** Vercel function times out generating large pack PDF.
**Handling:**
- PDF generation is async — user gets email when ready
- Fallback: link to printable HTML version (no PDF required)
- Cache generated PDFs in Vercel Blob by `packId + updatedAt` hash

---

## CATEGORY 8 — DATA INTEGRITY

### EC-026: PrintInventory.availableQty drift ⬜ (Phase 1)
**Scenario:** Bug causes availableQty to diverge from actual logs sum.
**Handling:**
- Nightly reconciliation job: recalculate `availableQty` from log sum
- If drift detected: flag for SUPER_ADMIN, do NOT auto-correct (audit first)
- Log the drift: `action=drift_detected` in `PrintInventoryLog`

### EC-027: Pack item inventory_id pointing to deleted inventory ⬜ (Phase 1)
**Scenario:** Inventory record deleted after being linked to a pack item.
**Handling:**
- `PrintInventory` cannot be hard-deleted if `available_qty < total_qty` (EC-006)
- `PrintPackItem.inventoryId` nullable FK: deletion sets to null with warning
- Pack item shows "⚠ Inventory record removed — manual reconciliation required"

### EC-028: Concurrent pack generation for same turf ⬜ (Phase 1)
**Scenario:** Two managers simultaneously generate packs for the same turf.
**Handling:**
- No unique constraint on `(campaignId, turfId, packType)` — allowed, both packs created
- Warning shown: "Another pack exists for this turf: [Pack Name]. Review before distributing."
- Campaign must manually cancel or merge duplicate packs

---

*This file is updated whenever a new edge case is discovered.*
*If code handles a case listed as ⬜, update status to ✅.*
*If an unhandled edge case causes a bug, add it here before fixing it.*
