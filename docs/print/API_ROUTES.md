# Poll City Print Platform — API ROUTES
*All print API endpoints. Request + response shapes. Auth requirements.*
*Last updated: 2026-04-10*

---

## AUTH

All routes use `apiAuth(req)` from `@/lib/auth/helpers`.
All campaign-scoped routes verify membership via `prisma.membership.findUnique`.
SUPER_ADMIN routes check `session.user.role === "SUPER_ADMIN"` explicitly.

---

## EXISTING ROUTES (Phase 0)

### Templates

#### `GET /api/print/templates`
Query: `?category=<category>&active=true`
Response: `{ data: PrintTemplate[] }`

#### `POST /api/print/templates` (SUPER_ADMIN only)
Body: `{ slug, name, category, width, height, bleed?, thumbnail?, htmlTemplate, isPremium?, sortOrder? }`
Response: `{ data: PrintTemplate }` 201

---

### Print Jobs (Marketplace)

#### `GET /api/print/jobs?campaignId=<id>`
Response: `{ data: PrintJob[] }` — includes bids count

#### `POST /api/print/jobs`
Body: `{ campaignId, productType, title, quantity, description?, specs?, deadline?, deliveryAddress?, budgetMin?, budgetMax? }`
Response: `{ data: PrintJob }` 201

#### `GET /api/print/jobs/[id]?campaignId=<id>`
Response: `{ data: PrintJob & { bids: PrintBid[] } }`

#### `PATCH /api/print/jobs/[id]`
Body: `{ status?, trackingNumber?, carrier?, estimatedDelivery?, notes? }`
Transitions: `draft → posted`, `bidding → awarded`, `awarded → in_production`, `in_production → shipped`, `shipped → delivered`
Response: `{ data: PrintJob }`

#### `DELETE /api/print/jobs/[id]`
Soft: sets status = `cancelled`
Response: `{ ok: true }`

#### `GET /api/print/jobs/[id]/bids`
Response: `{ data: PrintBid[] }`

#### `POST /api/print/jobs/[id]/bids` (shop submits bid)
Body: `{ shopId, price, turnaround, notes?, fileUrl? }`
Response: `{ data: PrintBid }` 201

---

### Payment

#### `POST /api/print/payment/create-intent`
Body: `{ jobId, campaignId }`
Response: `{ clientSecret: string }`

#### `POST /api/print/payment/release`
Body: `{ jobId, campaignId }`
Triggers: PaymentIntent capture → shop paid → PrintInventory created
Response: `{ ok: true }`

---

### Shops

#### `GET /api/print/shops?province=<province>&specialty=<type>`
Response: `{ data: PrintShop[] }`

#### `POST /api/print/shops/onboard` (SUPER_ADMIN or shop owner)
Body: `{ shopId }`
Response: `{ url: string }` — Stripe Connect onboarding URL

---

### Preview + Download

#### `GET /api/print/preview/[slug]?campaignId=<id>`
Returns: HTML page (design with campaign brand applied)

#### `GET /api/print/download/[slug]?campaignId=<id>`
Returns: HTML page (print-ready, triggers browser print dialog)

---

### Orders

#### `GET /api/print/orders?campaignId=<id>`
Response: `{ data: PrintOrder[] }` — includes template info

#### `POST /api/print/orders`
Body: `{ campaignId, templateId?, productType, quantity, designData?, shippingAddr?, notes? }`
Response: `{ data: PrintOrder }` 201

---

### Walk List

#### `GET /api/print/walk-list?campaignId=<id>&turfId=<id>&format=pdf`
Response: HTML page (walk list formatted for print)

---

## NEW ROUTES (Phase 1)

### Inventory

#### `GET /api/print/inventory?campaignId=<id>`
Auth: `apiAuth` + membership
Query params:
- `productType` — filter by product type
- `location` — filter by location (hq | storage | event | in_field)
- `lowStock=true` — only show items at or below reorder threshold

Response:
```json
{
  "data": [
    {
      "id": "...",
      "sku": "FLYER-V1-001",
      "productType": "flyer",
      "description": "8.5x11 Fall 2026 flyer",
      "totalQty": 2500,
      "availableQty": 1840,
      "reservedQty": 340,
      "depletedQty": 280,
      "wastedQty": 40,
      "location": "hq",
      "reorderThreshold": 500,
      "receivedAt": "2026-09-01T10:00:00Z",
      "orderId": "..."
    }
  ],
  "summary": {
    "totalItems": 4820,
    "availableItems": 3200,
    "reorderAlerts": 1
  }
}
```

#### `POST /api/print/inventory`
Auth: `apiAuth` + membership (CAMPAIGN_MANAGER+)
Body:
```json
{
  "campaignId": "...",
  "productType": "flyer",
  "description": "8.5x11 Fall 2026 flyer",
  "totalQty": 2500,
  "location": "hq",
  "reorderThreshold": 500,
  "notes": "Received from Minuteman Press Oct 1",
  "receivedAt": "2026-10-01T14:00:00Z",
  "orderId": "..."
}
```
Response: `{ data: PrintInventory }` 201
Side effect: Creates `PrintInventoryLog` entry with action=`received`

#### `GET /api/print/inventory/[id]?campaignId=<id>`
Response:
```json
{
  "data": { ...PrintInventory },
  "logs": [ { ...PrintInventoryLog, user: { name } } ]
}
```

#### `PATCH /api/print/inventory/[id]`
Body: `{ location?, reorderThreshold?, notes?, description? }`
Does NOT change quantities directly — use `/adjust` or `/assign` for that.
Response: `{ data: PrintInventory }`

#### `DELETE /api/print/inventory/[id]`
Only allowed if `availableQty === totalQty` (no quantity has been committed).
Response: `{ ok: true }` or `{ error: "Cannot delete inventory with committed quantities" }` 409

#### `POST /api/print/inventory/[id]/assign`
Auth: CAMPAIGN_MANAGER+
Body:
```json
{
  "campaignId": "...",
  "qty": 150,
  "assignmentType": "field_assignment",
  "referenceId": "...",
  "notes": "Assigned to John Smith turf walk"
}
```
`assignmentType`: `volunteer | field_assignment | event | storage`
Side effects:
- Decrements `availableQty` by `qty`
- Increments `reservedQty` by `qty`
- Creates `PrintInventoryLog` entry (action=`assigned`)
Response: `{ data: PrintInventory }`
Errors:
- 409 if `qty > availableQty`
- 400 if `qty <= 0`

#### `POST /api/print/inventory/[id]/return`
Body: `{ campaignId, qty, notes?, referenceId? }`
Side effects:
- Increments `availableQty` by `qty`
- Decrements `reservedQty` by `qty`
- Creates `PrintInventoryLog` (action=`returned`)
Response: `{ data: PrintInventory }`

#### `POST /api/print/inventory/[id]/deplete`
Body: `{ campaignId, qty, notes?, referenceId? }`
Marks items as used (cannot be un-depleted).
Side effects:
- Decrements `reservedQty` by `qty` (if reserved) OR `availableQty` (if not reserved)
- Increments `depletedQty` by `qty`
- Creates `PrintInventoryLog` (action=`depleted`)
Response: `{ data: PrintInventory }`

#### `POST /api/print/inventory/[id]/adjust`
Auth: ADMIN+
Body: `{ campaignId, qty, notes }` — qty can be positive or negative
Manual reconciliation.
Side effects:
- Adjusts `availableQty` by `qty`
- Adjusts `totalQty` if positive (new stock) or `wastedQty` if negative
- Creates `PrintInventoryLog` (action=`adjusted`)
Response: `{ data: PrintInventory }`

---

### Print Packs

#### `GET /api/print/packs?campaignId=<id>`
Query params:
- `packType` — walk_kit | sign_install_kit | lit_drop_kit | event_kit | gotv_kit
- `status` — draft | fulfilled | distributed | returned
- `fieldAssignmentId` — filter by assignment

Response:
```json
{
  "data": [
    {
      "id": "...",
      "name": "Ward 5 Poll 42 Walk Kit",
      "packType": "walk_kit",
      "targetCount": 347,
      "bufferPct": 0.20,
      "status": "fulfilled",
      "items": [
        { "productType": "flyer", "requiredQty": 420, "fulfilledQty": 420 },
        { "productType": "door_hanger", "requiredQty": 420, "fulfilledQty": 400 }
      ]
    }
  ]
}
```

#### `POST /api/print/packs`
Auth: CAMPAIGN_MANAGER+
Body:
```json
{
  "campaignId": "...",
  "name": "Ward 5 Poll 42 Walk Kit",
  "packType": "walk_kit",
  "targetCount": 347,
  "bufferPct": 0.20,
  "turfId": "...",
  "pollNumber": "42",
  "fieldAssignmentId": "...",
  "items": [
    { "productType": "flyer", "requiredQty": 420, "inventoryId": "..." },
    { "productType": "door_hanger", "requiredQty": 420, "inventoryId": "..." }
  ]
}
```
Response: `{ data: PrintPack & { items: PrintPackItem[] } }` 201

#### `GET /api/print/packs/[id]?campaignId=<id>`
Response: `{ data: PrintPack & { items: PrintPackItem[], inventory: PrintInventory[] } }`

#### `PATCH /api/print/packs/[id]`
Body: `{ status?, notes?, fieldAssignmentId? }`
Status transitions:
- `draft → fulfilled` — validates all items have inventory assigned
- `fulfilled → distributed` — sets `distributedAt`, fires inventory `assigned` log
- `distributed → returned` — fires partial/full `returned` log for unreturned items
Response: `{ data: PrintPack }`

#### `POST /api/print/packs/generate`
Auth: CAMPAIGN_MANAGER+
Auto-calculates pack requirements from campaign data.

Body:
```json
{
  "campaignId": "...",
  "packType": "walk_kit",
  "turfId": "...",
  "pollNumber": "42",
  "bufferPct": 0.20,
  "fieldAssignmentId": "...",
  "productTypes": ["flyer", "door_hanger"]
}
```

Server-side logic:
1. If `turfId`: fetch `turf.totalDoors` as `targetCount`
2. If `pollNumber` (no turf): count households in poll from `Household` table
3. Calculate `requiredQty = Math.ceil(targetCount * (1 + bufferPct) / 50) * 50`
4. Check available inventory for each `productType`
5. Create `PrintPack` + `PrintPackItem` records
6. Return pack with inventory sufficiency status

Response:
```json
{
  "data": {
    ...PrintPack,
    "items": [
      {
        "productType": "flyer",
        "requiredQty": 450,
        "inventorySufficient": true,
        "inventoryAvailable": 1840,
        "inventoryId": "..."
      },
      {
        "productType": "door_hanger",
        "requiredQty": 450,
        "inventorySufficient": false,
        "inventoryAvailable": 200,
        "shortfall": 250
      }
    ]
  }
}
```

---

## ERROR RESPONSES

All errors follow the standard Poll City error format:
```json
{ "error": "Human-readable message", "details": { ... } }
```

| Status | Meaning |
|--------|---------|
| 400 | Invalid input (Zod validation failed) |
| 401 | Not authenticated |
| 403 | Not a member of this campaign |
| 404 | Record not found |
| 409 | Conflict (duplicate, inventory shortage, invalid state transition) |
| 500 | Internal server error (never exposes raw error) |

---

## RATE LIMITING

Print API routes are authenticated campaign routes — standard `rateLimit(req, "api")` applies.
The `/api/print/preview/[slug]` and `/api/print/download/[slug]` are also authenticated.

---

*API_ROUTES.md reflects Phase 1 state. Updated each phase.*
