# Poll City Print Platform — UI FLOWS
*User journey maps for every print platform flow*
*Last updated: 2026-04-10*

---

## FLOW 1 — ORDER A PRINT PRODUCT (Core Journey)

```
/print (dashboard)
  ↓ click product card
/print/products/[product] (product detail)
  ↓ "Use a Template" or "Upload My File"
/print/templates (gallery, filtered by product)
  ↓ select template
/print/design/[slug] (design viewer + order panel)
  ↓ set quantity
  ↓ "Order printing"
[CHECKOUT MODAL] (quantity, shipping address, payment)
  ↓ confirm
POST /api/print/orders → PrintOrder created (status: proof)
  ↓
[PROOF APPROVAL SCREEN] — shows design, campaign must approve
  ↓ "Approve Proof"
PATCH /api/print/orders/[id] → status: approved
  ↓
[VENDOR ROUTING] — auto-routed or manual bid post
  ↓ (Phase 4/5)
PrintJob created → vendors bid → campaign awards
  ↓
PrintJob status: in_production → shipped → delivered
  ↓
[RECEIVE INVENTORY PROMPT]
POST /api/print/inventory → PrintInventory created from order
  ↓
/print/inventory (inventory dashboard)
```

**Key states visible to user:**
- Draft (designing)
- Proof (waiting approval)
- Approved (in production)
- Shipped (tracking number shown)
- Delivered (confirm receipt)
- In Inventory (received → tracked)

---

## FLOW 2 — MANAGE INVENTORY

```
/print/inventory (inventory dashboard)
  ├── [List] All SKUs, quantities, locations, reorder alerts
  ├── [+ Add] "Receive new inventory" button
  │     ↓
  │     [RECEIVE MODAL]
  │     - Product type (dropdown)
  │     - Quantity received
  │     - Description / version
  │     - Location (hq | storage | event | in_field)
  │     - Reorder threshold (optional)
  │     - Notes
  │     - Link to existing PrintOrder (optional)
  │     - Received date
  │     POST /api/print/inventory → new record
  │
  ├── [Row: Lawn Signs — 180 available]
  │     ↓ click row
  │     [INVENTORY DETAIL DRAWER]
  │     - SKU, product type, total/available/reserved/depleted
  │     - Location picker
  │     - Reorder threshold editor
  │     - Full log (who did what, when, how much)
  │     ↓ "Assign" button
  │     [ASSIGN MODAL]
  │     - Assign to: Volunteer | Field Assignment | Event | Storage
  │     - Quantity
  │     - Notes
  │     POST /api/print/inventory/[id]/assign
  │     ↓ "Deplete" button (mark as used)
  │     POST /api/print/inventory/[id]/deplete
  │     ↓ "Adjust" button (admin: manual reconciliation)
  │     POST /api/print/inventory/[id]/adjust
  │
  └── [⚠ Reorder Alert Banner] — items below threshold
        → "Post Reorder Job" → /print/jobs/new (pre-filled)
```

**Mobile layout (390px):**
- Card list view (not table)
- Swipe right on card = quick assign
- Swipe left on card = quick deplete

---

## FLOW 3 — GENERATE A PRINT PACK

```
/print/packs (pack list)
  ↓ "Generate Pack" button
[PACK GENERATOR — modal or page]
  Step 1: Select pack type
  ┌─────────────────────────────────┐
  │  Walk Kit        Sign Kit       │
  │  Lit Drop Kit    Event Kit      │
  │  GOTV Kit                       │
  └─────────────────────────────────┘
  
  Step 2: Set scope
  - For Walk Kit / Lit Drop Kit / GOTV Kit:
    → Select Turf (dropdown, loaded from /api/turf)
    → OR enter Poll Number manually
    → System shows: "347 households in this area"
  - For Sign Kit:
    → Shows count of requested signs in area
  - For Event Kit:
    → Select Event (dropdown)
    → System shows: "Expected attendance: 120"

  Step 3: Review calculation
  ┌─────────────────────────────────────────────────┐
  │ Walk Kit — Ward 5 Poll 42                        │
  │                                                  │
  │ 347 households × 1.20 buffer = 417              │
  │ Rounded to nearest 50 → 450 units               │
  │                                                  │
  │ Flyers (8.5x11)    450 units   ✅ 1,840 avail   │
  │ Door Hangers        450 units   ⚠️  200 avail    │
  │                                 SHORTFALL: 250   │
  └─────────────────────────────────────────────────┘
  
  Step 4: Confirm or resolve shortfall
  - If shortage: "Order more" → /print/jobs/new (pre-filled)
  - If sufficient: "Create Pack"
  POST /api/print/packs/generate
  
  ↓
[PACK DETAIL PAGE]
  - Pack name (editable)
  - Items list with inventory links
  - Status: Draft
  - "Mark Fulfilled" → validates inventory, sets status
  - "Distribute" → assigns inventory, sets distributedAt
  - "Return" → marks unused items returned

Associated field assignment shown if linked.
```

---

## FLOW 4 — POST A PRINT JOB (Marketplace)

```
/print/jobs/new
  Step 1: Product type (grid of 15 options)
  Step 2: Specs (quantity, size, material, deadline, file upload)
  Step 3: Budget (min / max CAD)
  Step 4: Delivery (address, city, postal)
  Step 5: Review → "Post Job"
  POST /api/print/jobs → status: posted
  ↓
  Vendors notified (email blast to shops in area)
  ↓
/print/jobs/[id] (job detail)
  - List of bids as they come in
  - "Award" button on each bid → PATCH status: awarded
  - Payment: "Pay" → Stripe PaymentIntent created, held in escrow
  - Delivery: tracking number shown when shipped
  - "Confirm Delivery" → payment released to shop
  ↓
[RECEIVE INVENTORY PROMPT] — "Job delivered. Add to inventory?"
  → pre-fills /api/print/inventory POST with job details
```

---

## FLOW 5 — FIELD OPS INTEGRATION

```
Campaign Manager creates Field Assignment (canvass walk):
/field-ops/new → FieldAssignment created

↓ in FieldAssignment detail, "Print Pack" section
  → "Generate Print Pack" button
  → POST /api/print/packs/generate?fieldAssignmentId=<id>
  → Pack auto-named after assignment, turf/poll auto-populated
  
↓ Pack created → "Distribute to Volunteer"
  → Assigns inventory items → reservedQty++
  → Assignment status updated: printPackDistributed = true
  
↓ Volunteer completes assignment
  → PATCH /api/field-assignments/[id] → completed
  → "Return Pack" prompt
  → User enters: used qty, returned qty
  → POST /api/print/inventory/[id]/deplete (used qty)
  → POST /api/print/inventory/[id]/return (returned qty)
```

---

## FLOW 6 — SIGN INVENTORY (Phase 6)

```
Contact requests a sign → Sign record created (status: requested)
↓
Campaign deploys signs → FieldAssignment (sign_install) created
↓
"Generate Sign Kit" → PrintPack (sign_install_kit)
  → Reads count of requested Signs in turf/poll area
  → Reserves that qty from SignInventoryItem + PrintInventory (lawn_sign)
↓
Sign installed → AssignmentStop completed (sign_install)
  → Sign.status = installed
  → PrintInventory depleted
  → SignInventoryItem.deployedQuantity++
↓
Sign removed → AssignmentStop completed (sign_remove)
  → Sign.status = removed
  → PrintInventory returned (if reusable) OR wasted (if damaged)
  → SignInventoryItem.deployedQuantity--
```

---

## FLOW 7 — ADONI PRINT SUGGESTIONS (Phase 9)

```
User opens /print or /print/inventory
↓
Adoni sidebar shows (if inventory issues detected):
  "You have 340 flyers left but 6 unassigned turfs. 
   Based on your canvass rate, you need at least 900 more.
   I've drafted a reorder job — want me to post it?"
  [Post Job] [Dismiss]
  
User clicks "Post Job":
  → Adoni-drafted PrintJob submitted (status: draft)
  → User redirected to /print/jobs/[id] to review before posting
```

---

## PAGE LAYOUTS

### /print/inventory (390px mobile)

```
┌─────────────────────────────────┐
│ Inventory               [+ Add] │
├─────────────────────────────────┤
│ ⚠ 1 item below reorder level   │
├─────────────────────────────────┤
│ 🟢 Flyers (8.5x11)             │
│    1,840 avail  340 reserved    │
│    [Assign] [Deplete]           │
├─────────────────────────────────┤
│ 🟢 Lawn Signs                  │
│    62 avail  28 deployed        │
│    [Assign] [Deplete]           │
├─────────────────────────────────┤
│ 🔴 Door Hangers                 │
│    200 avail  450 needed        │
│    ⚠ Below threshold            │
│    [Order More]                 │
└─────────────────────────────────┘
```

### /print/packs (390px mobile)

```
┌─────────────────────────────────┐
│ Print Packs        [Generate +] │
├─────────────────────────────────┤
│ Walk Kit — Poll 42              │
│ 450 units • 2 products          │
│ ✅ Fulfilled — distributed      │
├─────────────────────────────────┤
│ Sign Kit — Ward 5               │
│ 62 units • 1 product            │
│ 🟡 Draft — needs fulfillment    │
│ [Fulfill Pack]                  │
└─────────────────────────────────┘
```

---

*UI_FLOWS.md reflects Phase 1-2 planned flows. Updated each phase.*
