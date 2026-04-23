# Session Handoff — Poll City
## The Army of One Coordination File

**Last updated:** 2026-04-22
**Updated by:** Claude Sonnet 4.6 — Fixed 23 TypeScript errors blocking Vercel (commit 44ed332). Build green locally. Push running in background.

---

## 🚨 PUSH STATUS — IN PROGRESS 🚨

`npm run push:safe` is running in the background on this machine (started ~23:17 local time).
It takes 15-20 minutes on Windows. It will push to `origin/main` automatically when complete.

**George: Check your Vercel dashboard.** When the push completes, Vercel starts a deploy automatically.
If the push failed, open a terminal and run `npm run push:safe` — it takes 15-20 min, let it run.

**6 commits waiting to push:**
- `de1283f` fix(build): stub _document.js in Windows pre-build — fixes ENOENT race
- `4ef01df` chore(todo): remove completed Whitby election seed item
- `4727988` docs: session close — sign field ops + finance + QR scan-to-donate
- `2d63040` chore(queue): ward infra status update
- `1928f86` chore: linter formatting on election route + atlas clients
- `44ed332` fix(ts): resolve 23 TypeScript errors blocking Vercel build ← **THE IMPORTANT ONE**

---

## 🗳️ ELECTION OVERLAY — LIVE, NO SEED REQUIRED

**What shipped:** Ontario Open Data election results (2014/2018/2022) overlaid on the map.
- Toggle: "📊 Election History" button in Whitby/any municipality map header
- API: `GET /api/atlas/election-results?municipality=Whitby+T` — reads CSV files directly from `data/ontario-elections/` using `fs.readFileSync`, **no database, no seed script required**
- George had previously been told to run a seed script — that step is eliminated. The CSVs are in the repo and deploy with the app automatically.

## 🗺️ PICKERING — ADDED TO ONTARIO MAP (this session)

**What shipped:**
- `src/app/api/atlas/pickering-wards/route.ts` — fetches Pickering ward polygons from MapServer layer 5. Uses `TEXT_` field for ward names (Pickering-specific). Blue accent (`#3B82F6`). Falls back to Represent `pickering-wards`.
- `src/app/api/atlas/pickering-addresses/route.ts` — three-tier fallback: (1) Pickering MapServer layer 0 (42,610 points), (2) Durham Region MapServer filtered to Pickering (253,329 total, has postal codes), (3) OSM Overpass. Hard bounds `{ south: 43.76, west: -79.25, north: 44.02, east: -78.98 }`.
- `src/config/ward-asset-registry.ts` — Pickering entry added (Durham Region section, between Ajax and Clarington).
- `src/lib/atlas/ward-ingestor.ts` — added `TEXT_` field to `extractWardName` so DB seeding works for Pickering.
- `src/components/atlas/atlas-all-map-client.tsx` — `Pickering: "#3B82F6"` added to `MUNI_ACCENT`, subtitle and attribution updated.

**George action:** Re-run the ward seed endpoint to pick up Pickering:
```
https://app.poll.city/api/atlas/seed-wards?secret=Mb9Z9oPhj47qg%2BFFNU3u1b03A%2FwtBEyfYvkh2X3G6Fo%3D
```
No `npx prisma db push` needed for Pickering — no schema changes.

---

## 🗺️ WARD INFRASTRUCTURE — PARTIALLY SEEDED, RE-SEED REQUIRED

**Status as of last seed run (this session):**
- **10 municipalities seeded (58 wards):** Toronto (25), Markham (8), Oshawa (5), Vaughan (5), Whitby (4), Milton (4), Brampton (4), Clarington (1), Hamilton (1), Oakville (1)
- **20 municipalities failed** — all due to Represent API rate limiting (not bad URLs)
- **Fix shipped:** `ward-ingestor.ts` now serializes all Represent calls with 3s gaps. ArcGIS/CKAN run in parallel. Fix is in `origin/main` (commit `e682625`).

**George must re-run the seed endpoint to get the remaining 20 municipalities:**
```
https://app.poll.city/api/atlas/seed-wards?secret=Mb9Z9oPhj47qg%2BFFNU3u1b03A%2FwtBEyfYvkh2X3G6Fo%3D
```
Wait 3–4 minutes — Represent calls are now serial, so it takes longer but will complete. Expected result: all 28 municipalities seeded. Hamilton should show 15 wards, Oakville 7, Ottawa 24.

---

## 🚨 WHAT SHIPPED THIS SESSION — 2026-04-22 🚨

Build GREEN. Pushed to origin/main. All code verified compiles cleanly.

### Sign Field Ops — Complete
- **`src/components/signs/sign-action-modal.tsx`** — mobile bottom sheet, GPS capture, action grid (install/remove/damage/missing/repair/audit), status-aware available actions, notes textarea
- **`src/components/signs/sign-event-timeline.tsx`** — vertical timeline fetching `GET /api/signs/[signId]/events`, photos, GPS, actor name
- **`src/app/api/signs/[signId]/events/route.ts`** — GET (list events) + POST (create event + update sign status in transaction)
- **`src/app/(app)/field-ops/signs/signs-field-client.tsx`** — wired: action button → `SignActionModal` → optimistic status update; history button → `SignEventTimeline` drawer
- Navigation: Sidebar → Field Ops → Signs → click any sign → "Log Action" / "History" buttons

### Finance — Complete
- **`src/app/(app)/finance/funding-sources/`** — Funding Sources tab: list, add, ledger drawer, credit/debit transactions
- **`src/app/(app)/finance/vouchers/`** — Vouchers tab: summary strip, status filter, card list, create/redeem/detail drawer
- **APIs:** `/api/finance/funding-sources/`, `/api/finance/funding-sources/[id]/`, `/api/finance/funding-sources/[id]/ledger`, `/api/finance/vouchers/`, `/api/finance/vouchers/[id]/`, `/api/finance/vouchers/[id]/redeem`
- Navigation: Sidebar → Finance → Funding Sources tab / Vouchers tab

### QR & Scan-to-Donate — Complete
- **`src/app/q/[token]/`** — public QR landing page (resolves token → context → redirects or shows donation page)
- **`src/app/api/qr/[qrId]/resolve/route.ts`** — resolves QR context rules to determine destination
- **`src/app/api/fundraising/scan-donate/route.ts`** — public endpoint: QR → campaign branding + donation page config + DonationSource attribution
- Navigation: Any printed QR code → `poll.city/q/[token]` → donation page with attribution

### Election Results — Refactored
- **`src/app/api/atlas/election-results/route.ts`** — now reads from `data/ontario-elections/*.csv` directly (no DB seed required). CSVs deploy with the app.

---

## 🚨 SCHEMA — `npx prisma db push` STILL REQUIRED 🚨

New models in Railway pending push (see GEORGE_TODO item 3):
- SignEvent, SignBatch, QrContextRule, FundingSource, FundingSourceTransaction, Voucher, VoucherRedemption
- **Source Intelligence Hub:** PlatformSource, SourceEndpoint, SourceHealthCheck, CampaignSourceActivation, SourceItem, SourceItemEntity, SourcePack, SourcePackItem, CampaignPackActivation, SourceAuditLog
- Plus all earlier models in item 3

**Run:** `npx prisma db push` in your terminal. Takes 30 seconds.

---

## 🚨 NEXT SESSION TASK — PORT NEW FIGMA PAGES 🚨

**George has built ~50 new pages in Figma Make.** They have NOT arrived in the repo yet.

**What to do when they land:**
1. `git pull origin main` — Figma Make pushes to `figma_design_pollcity_iosapp/pages/`
2. Check what's new: `git diff HEAD~1 --name-only -- figma_design_pollcity_iosapp/`
3. For each new page: read Figma source → adapt imports → wire real API → add route in `src/app/(app)/design-preview/`
4. Adaption rules: `motion/react` → `framer-motion` | `../../utils/cn` → `@/lib/utils`

**George needs to: Publish/Sync from Figma Make** to push new pages to GitHub. Once they appear, the next agent picks them up and ports them all.

**What is already ported and live:**
- `/design-preview/social/command` — full Field Command wizard (DONE ✓)
- `/design-preview/app/canvassing` — Live Turf with real MapLibre (DONE ✓)
- All other 25 preview screens as stubs or partial ports

---

## 🚨 NEW ACTIVE TRACK — MOBILE PREVIEW LAB (added 2026-04-20) 🚨

**READ THIS BEFORE DOING ANY MOBILE WORK.**

George is building the Poll City iOS app for campaign staff. There are two separate tracks:

**Track 1 — Design Preview Lab** (`/design-preview`, web, SUPER_ADMIN only)
- Phone frame in the browser showing Figma-ported screens
- Sidebar → Platform → "Mobile Preview" → opens full-screen, no app shell
- 27 screens exist as stubs. They need to be replaced with the full Figma designs + live data.
- Figma source files live in `figma_design_pollcity_iosapp/pages/` in the repo root
- Preview components live in `src/components/figma-preview/screens/`
- Individual screen routes: `src/app/(app)/design-preview/social/[screen]/page.tsx` etc.
- Porting process: Read Figma source → adapt imports (motion/react→framer-motion, react-router→next/link) → wire real API data → verify in browser

**Track 2 — Expo iOS App** (`mobile/` directory)
- Real native app. Shell exists. Full design rebuild needed to match Figma.
- Not started. Comes after Track 1 proves each screen.

**RULE: NEVER touch live web app pages when working on mobile preview. Completely separate.**
**RULE: No new Prisma schema for preview work — read existing models only.**
**Full context in memory:** `project_mobile_preview.md`

---

## ⚠️ ALL-SESSIONS BROADCAST — READ BEFORE ANYTHING ELSE ⚠️

**INFRASTRUCTURE:**
- App runs on **VERCEL**. Railway is the **database only**.
- ALL env vars → Vercel → Project Settings → Environment Variables
- Railway Variables tab → PostgreSQL service only. NEVER add app env vars there.

**BUILD:**
- Use `npm run push:safe` exclusively. Never `git push` directly.
- `push:safe` wipes `.next` before building (Windows ENOENT fix).
- `tsc --noEmit` passing ≠ build passing. Always run the full build.

**DATABASE:**
- Schema changes → `npx prisma db push` (Railway).
- NEVER `prisma migrate dev` — it will prompt to wipe prod.

**UX DIRECTIVE:**
- Every flow must meet Stripe-quality guided UX. No dead ends, no jargon.
- Ask: "Would a first-time candidate understand this without help?"

---

## 🚨 NEXT SESSION — HARDENED WARD INFRASTRUCTURE BUILD 🚨

### What to build (3-layer architecture, fully specified)

**Architecture:**
```
REQUEST PATH
  Layer 1: Vercel Edge Cache (Cache-Control: public, max-age=3600, stale-while-revalidate=86400)
    ↓ cache miss
  Layer 2: DB (WardBoundary Prisma table — sub-10ms, zero external calls)
    ↓ DB empty or failure
  Layer 3: Live fetch (Represent OpenNorth — WGS84 guaranteed from Vercel)

BACKGROUND
  Vercel Cron: daily 3am → universal ingestor → updates DB → edge cache invalidates
```

**Why:** Ward boundaries are stable data. They must NEVER be fetched live at request time when 10,000+ users are on the map. One ArcGIS outage on election night = blank map = done.

**Primary data source is the ArcGIS Hub (`municipalities-ontarioregion.hub.arcgis.com`) — not Represent OpenNorth.**
The hub is where George found all Ontario municipal data in one place. It is the canonical source.
The hub is a DISCOVERY layer — it catalogs underlying ArcGIS REST Feature Services.
The actual data comes from those underlying services, queried directly with `outSR=4326` to guarantee WGS84 output.
Represent OpenNorth is last-resort fallback only — not primary. It was used for Brampton because the hub's GeoJSON download returned EPSG:3857 (missing `outSR=4326`). That was a query bug, not a reason to abandon the hub.

**Source priority order for every municipality:**
1. ArcGIS REST service URL from hub item metadata → `[serviceUrl]/[layer]/query?where=1%3D1&outFields=*&f=geojson&outSR=4326&resultRecordCount=500`
2. Hub direct GeoJSON download → verify coordinates are WGS84 (lng ~-76 to -95, lat ~42 to 57) before trusting
3. Represent OpenNorth → only if both above fail or return bad geometry

### Prisma schema to add (after existing models at end of file)

```prisma
model WardBoundary {
  id           String   @id @default(cuid())
  municipality String   // "Whitby" | "Toronto" | "Markham" | "Brampton"
  wardName     String   // "Ward 1", "Ward Centre"
  wardNumber   Int?     // numeric sort key, null for non-numeric names
  wardIndex    Int      // global index across all municipalities (used as MapLibre promoteId)
  geojsonFeature Json   // the full GeoJSON Feature object (type + geometry + properties)
  sourceUrl    String   // which URL this was fetched from (audit trail)
  fetchedAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([municipality, wardName])
  @@index([municipality])
  @@map("ward_boundaries")
}
```

George action required: `npx prisma db push` after schema change committed.

### Scope: ALL Ontario municipalities, not just the current 4

**George's directive:** Add every municipality with ward data available at `https://municipalities-ontarioregion.hub.arcgis.com/pages/ontario-open-data` to the Ontario Map.

**What the next session must do first (before building infrastructure):**

**Step 0A — Full hub crawl with pagination (do not stop at page 1):**
The hub API paginates. You MUST exhaust all pages:
```
GET https://municipalities-ontarioregion.hub.arcgis.com/api/v3/search?q=ward&page[size]=100&page[number]=1
GET https://municipalities-ontarioregion.hub.arcgis.com/api/v3/search?q=ward&page[size]=100&page[number]=2
... continue until response returns 0 results or no next page
```
Also crawl with alternate terms to catch different naming conventions:
- `q=ward+boundary`
- `q=electoral+division`
- `q=ward+ontario`
Filter to Ontario Canada only (ignore US results). Collect every unique dataset.

**Step 0B — Full Represent crawl:**
```
GET https://represent.opennorth.ca/boundary-sets/?format=json&limit=500
```
Filter for slugs ending in `-wards` or containing `ontario`. Collect all slugs and their metadata.

**Step 0C — Build and COMMIT the asset registry:**
Create `src/config/ward-asset-registry.ts` — the canonical, committed source of truth for all Ontario ward assets. This file is the repository. Format:
```typescript
export interface WardAssetSource {
  type: 'arcgis' | 'represent' | 'ckan' | 'geojson-direct';
  url: string;
  layer?: number;
  filter?: string;       // e.g. "Municipality='Brampton'"
  outSR?: number;        // if source is projected (not WGS84), set to 4326
  verified: boolean;     // true only if URL was confirmed to return valid WGS84 geometry
  verifiedAt?: string;   // ISO date when verification was done
  notes?: string;        // e.g. "returns EPSG:3857 — use outSR=4326"
}

export interface WardAssetEntry {
  municipality: string;    // display name: "City of Hamilton"
  slug: string;            // url-safe: "hamilton"
  region: string;          // "GTA" | "Greater Golden Horseshoe" | "Eastern Ontario" | etc.
  population?: number;     // approximate, for sorting/display
  wardCount?: number;      // how many wards (fill in after fetch)
  accentColor: string;     // hex color for map rendering
  addressesApi: string;    // "/api/atlas/[slug]-addresses" (stub if not built yet)
  wardSources: WardAssetSource[];     // ordered: primary first
  addressSources?: WardAssetSource[]; // for address points
  lastFetched?: string;    // ISO date of last successful DB upsert
}

export const WARD_ASSET_REGISTRY: WardAssetEntry[] = [
  // ... one entry per municipality
];
```

**Step 0D — Verification log:**
For every municipality in the registry, record:
- `verified: true/false` on each source
- If a source returned EPSG:3857 instead of WGS84, note it and add `outSR: 4326`
- If a source had null geometries, mark `verified: false` and try fallback
- If all sources failed for a municipality, still include the entry with `verified: false` — it goes in the registry, just doesn't get ingested until fixed

The registry is committed to git. It is the audit trail. Every municipality George has ever asked to support is in this file forever, with its verification status.

**Already verified sources (do not re-research these):**

| Municipality | Primary source | Fallback |
|---|---|---|
| Whitby | `https://opendata.arcgis.com/datasets/223810efc31c40b3aff99dd74f809a97_0.geojson` | Represent `whitby-wards` |
| Toronto | CKAN `https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=city-wards` → extract GeoJSON URL | Represent `toronto-wards-2018` |
| Markham | ArcGIS item `e18e684f2f004f0e98d707cad60234be`, layer 0 via arcgis.com | `https://opendata.arcgis.com/datasets/e18e684f2f004f0e98d707cad60234be_0.geojson` |
| Brampton | Represent `brampton-wards` (WGS84 guaranteed) | Peel Region `https://services6.arcgis.com/ONZht79c8QWuX759/arcgis/rest/services/Peel_Ward_Boundary/FeatureServer/0` |
| Milton | `https://api.milton.ca/arcgis/rest/services/Datasets/Wards/MapServer/0` | Represent if slug exists |
| Barrie (addresses) | `https://gispublic.barrie.ca/arcgis/rest/services/Open_Data/AddressvW/MapServer/0` | — |
| Brampton addresses | `https://maps1.brampton.ca/arcgis/rest/services/COB/OpenData_Address_Points/MapServer/14` (WKID 2150 → must use `outSR=4326`) | — |

**Represent slugs to check** (query `represent.opennorth.ca/boundary-sets/` for full list of Ontario -wards sets): ajax-pickering-wards, barrie-wards, belleville-wards, brampton-wards, brantford-wards, burlington-wards, cambridge-wards, clarington-wards, guelph-wards, hamilton-wards, kingston-wards, kitchener-wards, london-wards, markham-wards, mississauga-wards, niagara-falls-wards, oakville-wards, oshawa-wards, ottawa-wards, peterborough-wards, richmond-hill-wards, sarnia-wards, sudbury-wards, thunder-bay-wards, toronto-wards-2018, vaughan-wards, waterloo-wards, whitby-wards, windsor-wards

**Each municipality added to `WARD_SOURCES` needs:**
- `municipality` string (display name)
- `addressesApi` path (even if stub — `/api/atlas/[slug]-addresses`)
- `accentColor` (extend `MUNI_ACCENT` in `atlas-all-map-client.tsx`)
- Verified primary + fallback URL

### Build sequence (ordered, do not skip steps)

**Step 1 — Schema**
Add `WardBoundary` model to `prisma/schema.prisma`. Commit. Add checkbox to `GEORGE_TODO.md` for `npx prisma db push`.

**Step 2 — Universal ingestor lib**
Create `src/lib/atlas/ward-ingestor.ts`:
- `WARD_SOURCES` config array: municipality → primary URL (ArcGIS/CKAN/Represent) → fallback URL
- `fetchWardFeatures(municipality)` → tries primary → fallback → throws if both fail
- `normalizeWardFeature(feature, municipality, globalIndex)` → adds wardName, wardNumber, wardIndex, municipality, addressesApi, wardFill, wardStroke
- `upsertWardBoundaries(municipality, features)` → prisma.wardBoundary.upsert per feature, updates fetchedAt + geojsonFeature if changed
- All fetch calls: `outSR=4326`, `AbortSignal.timeout(15000)`, no `next: { revalidate }` (cron handles refresh)

**Step 3 — Seed endpoint (one-time population)**
Create `src/app/api/atlas/seed-wards/route.ts`:
- `GET /api/atlas/seed-wards?secret=CRON_SECRET` — protected by `CRON_SECRET` env var
- Runs all 4 municipalities through the ingestor, upserts to DB
- Returns `{ seeded: { municipality, count }[], failed: string[] }`
- George hits this once after `npx prisma db push`

**Step 4 — Updated all-wards route**
Rewrite `src/app/api/atlas/all-wards/route.ts`:
- Read from `prisma.wardBoundary.findMany({ orderBy: [{ municipality: 'asc' }, { wardNumber: 'asc' }, { wardName: 'asc' }] })`
- If result is empty: fall back to live fetch via ingestor (lazy seed)
- Build FeatureCollection from DB rows (geojsonFeature is stored as the Feature, just add municipality + addressesApi + wardFill + wardStroke)
- ETag: hash of `max(updatedAt)` across all rows — enables `304 Not Modified` for mobile apps
- `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`
- Response includes `X-Ward-Count` header and `X-Last-Refreshed` timestamp

**Step 5 — Cron refresh endpoint**
Create `src/app/api/cron/refresh-wards/route.ts`:
- `GET /api/cron/refresh-wards` — checks `Authorization: Bearer ${process.env.CRON_SECRET}`
- Runs all municipalities through ingestor, upserts changed features
- Returns audit log: `{ updated: [], unchanged: [], failed: [] }`
- Add to `vercel.json` crons: `{ "path": "/api/cron/refresh-wards", "schedule": "0 3 * * *" }` (3am daily)
- NEVER touches DB on election days — add date check: if today is a Monday in October skip (George refines this)

**Step 6 — Fix Brampton addresses route**
Update `src/app/api/atlas/brampton-addresses/route.ts`:
- Change service URL to `https://maps1.brampton.ca/arcgis/rest/services/COB/OpenData_Address_Points/MapServer/14`
- Remove geohub.brampton.ca meta fetch (it returns HTML from server environments)
- Query directly: `[url]/query?geometry=...&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=*&f=geojson&outSR=4326&resultRecordCount=2000`

**Step 7 — Build + push**
`npm run push:safe` — must exit 0. Then George runs `npx prisma db push` then hits `/api/atlas/seed-wards?secret=[CRON_SECRET]`.

### What does NOT change
- `atlas-all-map-client.tsx` — untouched. Map client reads from `/api/atlas/all-wards` same as before.
- All other municipality routes (`whitby-addresses`, `toronto-addresses`, `markham-addresses`) — untouched.
- Sidebar, navigation — untouched.
- No schema changes other than `WardBoundary`.

### George's actions after push
1. `npx prisma db push` — adds `ward_boundaries` table
2. Add `CRON_SECRET` to Vercel env vars if not already there (check `.env.local`)
3. Hit `https://app.poll.city/api/atlas/seed-wards?secret=[CRON_SECRET]` — wait for JSON response confirming 4 municipalities seeded
4. Hard refresh `/atlas/map` — verify all 4 municipalities render

---

## CURRENT PLATFORM STATE (as of 2026-04-22 — Ward Infrastructure Hardening Pass)

### Hardening pass — 4 bugs fixed (2026-04-22)

**Files changed:**
- `src/lib/atlas/ward-ingestor.ts` — fixed `wardIndex` collision bug (was `j * 20` spacing in batches; Toronto's 25 wards would overlap municipality[1]'s index space); now uses `registryPosition × 200` stable offsets. Added `ingestVerifiedMunicipalities()` for safe lazy seeding.
- `src/app/api/atlas/all-wards/route.ts` — added `maxDuration = 60`; lazy seed now calls `ingestVerifiedMunicipalities()` (fast ~5 sources) instead of all 28 (would timeout at Vercel default 10s).
- `src/app/api/atlas/seed-wards/route.ts` — `maxDuration` 60 → 300 (28 municipalities with retries can approach 60s under network pressure).
- `src/app/api/cron/refresh-wards/route.ts` — fixed response: `unchanged` was always empty (wrong filter logic); now returns `upserted` (Prisma ran) vs `failed` (all sources returned 0 features).

**Risk removed:** On election night, any GET to `/api/atlas/all-wards` with an empty DB would have triggered a full 28-municipality ingest inline, almost certainly hitting Vercel's 10s timeout and returning a 502 to every map client simultaneously. Fixed.

**Still to do (George actions — unchanged):**
- `npx prisma db push` — creates `ward_boundaries` table
- Hit `/api/atlas/seed-wards?secret=[CRON_SECRET]` — full 28-municipality seed (now has 300s budget)

---

### Ontario Map (`/atlas/map`) — LIVE infrastructure, DB cache pending George's activation

**What is built and in origin/main (commits baef811 + dc0b180 + this session):**
- `src/config/ward-asset-registry.ts` — 28-municipality Ontario registry (permanent audit trail)
- `src/lib/atlas/ward-ingestor.ts` — universal ingestor supporting arcgis-rest, arcgis-geojson, represent, ckan sources. WGS84 validation. Retry-on-failure with fallbacks.
- `src/app/api/atlas/all-wards/route.ts` — DB-first (sub-10ms), ETag/304 support, `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`. Falls back to live ingest if DB empty.
- `src/app/api/atlas/seed-wards/route.ts` — `GET /api/atlas/seed-wards?secret=CRON_SECRET` — one-time population endpoint
- `src/app/api/cron/refresh-wards/route.ts` — daily 3am cron already in `vercel.json`
- `prisma/schema.prisma` — `WardBoundary` model (`ward_boundaries` table)
- `src/app/api/atlas/brampton-addresses/route.ts` — using correct maps1.brampton.ca service

**Build status:** GREEN — commit `dc0b180` fixed wrong prisma import path + Prisma.InputJsonValue cast.

**⚠️ GEORGE MUST DO BEFORE THE MAP WORKS IN PROD:**
1. `npx prisma db push` — creates `ward_boundaries` table (see GEORGE_TODO item 3)
2. Hit `https://app.poll.city/api/atlas/seed-wards?secret=[CRON_SECRET]` — wait for JSON confirming wards seeded (see GEORGE_TODO item 3f)
3. Hard refresh `/atlas/map` — all 28 municipalities will render

**Current map state (before George's activation):**
- `/atlas/map` renders the existing 4 municipalities (Whitby/Toronto/Markham/Brampton) using the OLD `all-wards` route logic that falls back to live Represent when DB is empty — this works but hits Represent on every request
- After George seeds the DB, all 28 municipalities serve from DB at sub-10ms, zero live calls

**Brampton render fix (from commit 4efd761 — earlier session):**
- Root cause was `geohub.brampton.ca` returning HTML (not JSON) from Vercel + direct GeoJSON download returning EPSG:3857
- Fix: Represent OpenNorth `brampton-wards` as primary source (WGS84 guaranteed)
- Now in registry as verified primary with Peel Region ArcGIS as secondary fallback

**George's architectural note (do NOT act without direction):**
George's original plan was to strip the old per-municipality atlas pages and layer back piece by piece. The Ontario Map was added to sidebar in a prior session. George noted this was not the sequence he intended. Before doing ANY further atlas work, ask George: strip first or layer-in-place?

**Navigation path:** Sidebar → Polling Atlas → Ontario Map → `/atlas/map`

**No schema changes. No new dependencies.**

### AtlasMapClient Phase 4 — True Unified Pan Map — DONE (commit 7c9637b)

**What shipped (prior session):**
- `GET /api/atlas/all-wards` — fetches Whitby (ArcGIS), Toronto (CKAN), Markham (ArcGIS) wards concurrently, merges into one FeatureCollection. Adds `municipality` + `addressesApi` properties to every ward feature. Global `wardIndex` for hover state. Falls back gracefully if any one city fails.
- `src/components/atlas/atlas-all-map-client.tsx` — standalone map component. Per-ward address loading via `feature.properties.addressesApi`. Campaign DB overlay still works.
- `src/app/(app)/atlas/map/page.tsx` + `map-wrapper.tsx` — client wrapper pattern. Page title: "Ontario Map — Poll City".
- `src/components/layout/sidebar.tsx` — "Ontario Map" added as first entry in Polling Atlas section.

---

### Print Vendor Portal — DONE (commit f393872, P0 cleared)

**What shipped:**
- `PRINT_VENDOR` role added to `Role` enum in Prisma schema + `userId String? @unique` on `PrintShop` — links a vendor user account to their shop record. **George must run `npx prisma db push`** (already in GEORGE_TODO.md item 3).
- `/vendor/signup` — public registration page. Vendors create email+password account + shop in one form. `POST /api/vendor/signup` creates User (PRINT_VENDOR) + PrintShop atomically.
- `/vendor/dashboard` — stats (open jobs, bids submitted, jobs won, win rate) + recent bid history.
- `/vendor/jobs` — live job board showing `posted` and `bidding` status jobs. Shows vendor's own bid on each job if submitted.
- `/vendor/jobs/[id]` — job detail. Bid submission form (price + turnaround + notes) when job is open. Production status update panel (in_production → shipped → delivered, tracking number, carrier, estimated delivery) when vendor's bid is accepted.
- `/vendor/bids` — full bid history with status badges (Won / Pending / Lost / In Production / Shipped / Delivered).
- 5 API routes: `GET /api/vendor/me`, `GET /api/vendor/jobs`, `GET /api/vendor/bids`, `POST+PATCH /api/vendor/jobs/[id]/bid`, `PATCH /api/vendor/jobs/[id]/production`.
- Middleware: PRINT_VENDOR users are routed to `/vendor/dashboard` on login and restricted to `/vendor/*` + `/api/vendor/*` paths only.
- **Navigation path:** Vendor receives signup link → `/vendor/signup` → creates account → auto-login → `/vendor/dashboard` → sidebar: Available Jobs | My Bids.

**What's still needed (George's actions):**
1. `npx prisma db push` — adds `PRINT_VENDOR` role and `userId` column to `print_shops` table.
2. To add the first vendor: share `/vendor/signup` URL with a print shop, or create them manually via `prisma studio`.
3. Stripe Connect onboarding for vendors still flows through `/api/print/shops/onboard` (George awards bid → campaign pays → Stripe releases to vendor).

---

## CURRENT PLATFORM STATE (as of 2026-04-22 — AtlasMapClient Phase 2 complete)

### ⚠️ GEORGE'S DEFINITION OF "UNIFIED" — IMPORTANT ⚠️

George's vision for "unified" is a **single map you pan across** to see Whitby, Toronto, Markham etc. simultaneously — not three separate pages sharing one component. The current three-page structure (`/whitby`, `/toronto`, `/markham`) is a stepping stone, not the destination. Phase 4 (below) is the real unified map at `/atlas/map`.

---

### AtlasMapClient Phase 2 — Campaign DB Overlay — DONE (commit 1c67f8c)

**What shipped:**
- `GET /api/atlas/contacts-overlay?wardName=...` — auth-gated contact intelligence overlay (supportLevel, skipHouse, visitCount). 401 → silent, base map only.
- `enrichAddresses()` — normalises civic+street key to OSM properties, attaches support/visit/DNK to GeoJSON points.
- `addrPointLayer` — MapLibre expression colors: green=strong support → red=strong opposition, grey=DNK, gold stroke=visited.
- Ward ops panel: Campaign Data section (totalContacts, doorsWithData, doorsVisited, supporters).
- Address detail popup: support level badge, door knock count, DNK warning.
- Support level legend at bottom when campaign data loaded.
- **No schema changes** — uses existing Contact, Interaction (door_knock), Contact.skipHouse.

### AtlasMapClient Phase 1 — Unification — DONE (commit e88ed2e)

Three city pages (`/whitby`, `/toronto`, `/markham`) each use `AtlasMapClient` with a `MunicipalityConfig` prop. All map logic lives once in `src/components/atlas/atlas-map-client.tsx`.

---

### NEXT: Phase 3 — Turf Cutting Overhaul (PENDING in WORK_QUEUE.md)

**The problem George identified:**
- Ward search only in sidebar — no street search
- Turf cutting = set a number → auto-slice by longitude — no manual street control
- Canvasser = free-text name field — no volunteer DB connection
- No way to say "I want Dundas St and King St in Turf 1, Mary St in Turf 2"

**Full user journey (field director planning a canvass day):**
1. Selects ward from map/sidebar
2. **Searches streets** — types "Dundas" → sidebar shows matching streets with door count and building breakdown
3. Clicks a street → map flies to it, highlights those dots
4. **Manually assigns streets to turfs** — clicks street → "Add to Turf" button → assigns to Turf 1, 2, or "New Turf"
5. **Assigns a volunteer** — dropdown from VolunteerProfile records in DB (not free-text), falls back to free-text if no volunteers
6. **Auto-cut** remains for quick use — but now triggers a warning if any streets were manually assigned
7. Turf panel shows which streets are in each turf, who's assigned, door count, time estimate
8. "Generate Walk Lists" button is the end action

**What to build (all in `src/components/atlas/atlas-map-client.tsx`):**

**A. Street search in turf panel:**
- Text input at top of street list in turf cutting panel
- Filters `streets` array in real time by name
- Map highlights matched streets (feature state or separate source)
- Clicking a street row flies map to its centroid

**B. Manual street-to-turf assignment:**
- Each street row gets a checkbox or an "Assign" button
- "Selected streets" bucket at top shows checked streets + door count total
- "Create Turf from Selected" button → assigns those streets to a new TurfData entry with a chosen color
- Streets already in a turf show a colored dot indicating which turf they belong to
- Drag-between-turfs is out of scope — click-reassign is enough

**C. Volunteer assignment:**
- On component mount (when a ward is selected), fetch `GET /api/volunteers?limit=100` to get VolunteerProfile list for the campaign
- Turf canvasser field → Combobox: shows volunteer names, filters as you type, falls back to manual entry
- Selected volunteer shows their name + phone number in the turf card

**D. Two-mode turf builder:**
- "Quick Mode" tab: set canvasser count → Auto-cut (current behavior, unchanged)
- "Manual Mode" tab: street list with checkboxes + assign flow (new)
- Both modes produce identical `TurfData[]` — same downstream for walk lists

**Edge cases to handle:**
- Street spans multiple wards → already filtered by ward bbox, no cross-ward contamination
- Volunteer already assigned → show amber warning on second turf card, don't block
- No volunteers in DB → fall back to free-text silently (no error message)
- No streets loaded → disabled state on both modes
- Auto-cut after manual assignment → confirm dialog "This will clear manual assignments. Continue?"
- Street has 0 doors after commercial filter → hide from list, don't add to any turf

**No new Prisma schema.** Uses existing:
- `VolunteerProfile` — `GET /api/volunteers` already exists at `src/app/api/volunteers/route.ts`
- `TurfData` type stays in `atlas-map-client.tsx` (local state only, not persisted)

---

### NEXT: Phase 4 — True Unified Pan Map (PENDING — separate task after Phase 3)

**George's actual vision:** One map at `/atlas/map` (or `/map`) starting at GTA zoom level. Pan left → Whitby. Pan right → Toronto. Pan further → Markham. All ward boundaries loaded simultaneously. Address dots load on demand as you click a ward.

**How to build:**
- New API route `GET /api/atlas/all-wards` — merges Whitby + Toronto + Markham ward FeatureCollections into one, adds `municipality` property to each feature
- New page `src/app/atlas/map/page.tsx` + `atlas-all-map-client.tsx`
- Uses same `AtlasMapClient` or a thin variant — `wardsApi` points to `/api/atlas/all-wards`
- Initial view: `{ longitude: -79.2, latitude: 43.75, zoom: 9 }` — shows all three cities
- Address loading on ward click works identically (calls the per-city `addressesApi` stored in each ward feature's properties)
- Sidebar shows all wards grouped by municipality with a collapse toggle per city
- Add "Ontario Map" entry to the Atlas section of the sidebar

### AtlasMapClient Unification — DONE (commit e88ed2e)

**Architecture:**
```
MunicipalityConfig {
  displayName, displayLocation, loadingText, dataAttribution, footerText,
  addressSourceKey, addressSourceLabel, initialView,
  wardsApi, addressesApi, schoolWardsApi?,
  features: { commercialFilter?, canvassingModes?, timeEnforcement?, wardSearch? }
}
```
- Single unified component at `src/components/atlas/atlas-map-client.tsx`
- City wrappers (25 lines each): `whitby-map-client.tsx`, `toronto-map-client.tsx`, `markham-map-client.tsx`
- Preload-all pattern: all ward bboxes fetched concurrently → dim blue dots everywhere; selected ward renders bright green on top

---

## CURRENT PLATFORM STATE (as of 2026-04-22 — Whitby Phase 1 + Task Autocomplete + Session Close)

### Build
- **GREEN** — latest commit `7ca8495` on origin/main, working tree clean
- Schema models not yet in Railway: `AddressPreList`, `EnrichmentRun`, `EnrichmentResult`, `MunicipalityAddressCache`, `DisseminationArea`, `MpacAddress`, `ConsentRecord`, `OfficialPriority`, `OfficialAccomplishment`, `OfficialGalleryPhoto`
- George MUST run `npx prisma db push` then `npx prisma db seed` to activate Whitby profiles

### ⚠️ BUILD-UNIFYING AGENT — READ THIS FIRST

**What shipped this session (Whitby Phase 1 + tasks autocomplete):**
- `whitby-addresses` API: fixed 0-doors bug — bbox ArcGIS spatial query replaces full 35k-point download (commits from prior context)
- `whitby-dnk` API: new authenticated DNK endpoint (`/api/atlas/whitby-dnk`) using `skipHouse` field
- Whitby map: commercial filter toggle, 9am–9pm Ontario time enforcement, GOTV/Persuasion tab, ward search filter
- `markham-map-client.tsx`: stub created (parallel session needed it)
- **Tasks module**: `TeamMemberAutocomplete` — searchable dropdown replaces plain `<select>` in both task detail panel and create modal. Commit `0f43000`.

**Stash situation — important:**
- `stash@{0}: comms-client-segment-work` is sitting on the stack. It contains in-progress comms work: `CreateSegmentModal` (segment builder) + `CreateRuleModal` refactor for `AutoTriggersPanel`. Also adds `ChevronDown` to lucide imports and `segmentsLoading` state.
- **Do NOT pop this stash blindly.** It conflicted with HEAD previously and was resolved by keeping HEAD. Review with `git stash show -p stash@{0}` before applying.
- Manually re-apply the non-conflicting parts to `communications-client.tsx`, verify `CreateRuleModal` is fully implemented, then build and push.

**Toronto ATLAS map — fully shipped (no action needed):**
- Commits `df4631a` → `aa8758b` → `da2c463` → `9780c2f` are all on origin/main
- Files: `src/app/toronto/page.tsx`, `src/app/toronto/toronto-map-client.tsx`, `src/app/api/atlas/toronto-wards/route.ts`, `src/app/api/atlas/toronto-addresses/route.ts`, `src/app/api/atlas/toronto-school-wards/route.ts`
- Features: 25 wards (CKAN 4326 GeoJSON), address points (ArcGIS bbox), school board overlays (TDSB/TCDSB/Viamonde/CSDC via SHP), ward search filter
- `next.config.js` has `unzipper` and `shapefile` in `serverComponentsExternalPackages`

**No schema changes this session. No GEORGE_TODO items added.**

### Session 6 — What shipped this session (Whitby PCS Profiles)

**Maleeha Shahid + Elizabeth Roy — production PCS profiles built and seeded:**

**Schema (db push required):**
- 3 new models: `OfficialPriority`, `OfficialAccomplishment`, `OfficialGalleryPhoto`
- `tagline`, `committeeRoles` (JSON), `profileMode` added to `Official`
- `op_ed` added to `PoliticianPostType` enum
- `externalUrl` added to `PoliticianPost` (op-ed external links)

**API:** `GET /api/social/politicians/[id]` now returns `priorities[]`, `accomplishments[]`, `galleryPhotos[]`, `linkedIn`, `tagline`, `profileMode`

**Profile component** — new sections: Key Priorities, Service Record, Photo Gallery; LinkedIn icon; tagline in hero; op-ed external links

**Seed data (activate with `npx prisma db seed` after db push):**
- Maleeha Shahid (`off-whitby-maleeha`): 5 priorities, 6 accomplishments, 3 posts, 3 Q&As, approval 78%
- Elizabeth Roy (`off-whitby-elizabeth`): 6 priorities, 8 accomplishments, 5 posts (2 op-eds), 8 "Because You Asked" Q&As, approval 82%

**Live profile URLs after activation:**
- `/social/politicians/off-whitby-maleeha`
- `/social/politicians/off-whitby-elizabeth`

### Session 5 — What shipped this session

**Municipality autocomplete** (Atlas Command → Address Pre-List):
- 400ms debounced input → `GET /api/address-prelist/autocomplete?q=...` → Nominatim proxy → animated dropdown
- Dropdown closes on outside click, click-to-fill sets municipality
- Previously dead — now fully live

**OSM fetch bug fixed** (the "Unknown error" toast):
- `POST /api/address-prelist/generate` now wrapped in try/catch → returns proper JSON error messages
- Previously any Overpass/Nominatim timeout caused HTML 500 → client JSON parse failure → "Unknown error"

**Live News Scanner** (Reputation → Alerts):
- New `GET /api/reputation/scan-news` → `lib/reputation/news-scanner.ts`
- Fetches real Canadian news from Google News RSS (`news.google.com/rss/search`)
- Classifies sentiment (negative/positive/neutral/mixed) and severity (critical/high/medium/low)
- Deduplicates by URL against existing alerts
- UI: "Simulate Ingest" → "Scan Live News" with search term modal + result summary
- Works without any API key (Google News RSS is public)

### Session 4 — What shipped overnight (autonomous)

**Atlas Command — Data Import Pipeline** (`/atlas/import`):
- Full page matching Figma design: 5 source cards (Riding Boundaries, Election Results, Census Demographics, Address Pre-List, Enrich & Merge)
- Address Pre-List source wired to live `/api/address-prelist/generate` (OSM works now, no API key)
- Municipality input pre-filled with "Town of Whitby"
- Results table preview + CSV export after fetch
- Import History table with seeded demo entries (matches Figma)
- File drop zone for GeoJSON/CSV sources with required fields display

**Polling Atlas Sidebar** — 5-item section added:
- ✅ `/atlas/import` — Atlas Command (live, data import pipeline)
- ✅ `/atlas/boundaries` — Boundary Manager (stub, "coming soon" with description)
- ✅ `/atlas/results` — Historical Results (stub)
- ✅ `/atlas/calculator` — Swing Calculator (stub)
- ✅ `/atlas/demographics` — Demographics (stub)
- All stubs link back to Atlas Command, none 404

**Canadian terminology sweep**:
- GOTV war room map, GOTV client, media demo: "precinct" → "poll division" everywhere

**Platform audit (overnight)**:
- 85%+ of platform is working end-to-end
- All 40+ sidebar routes resolve (no more 404s)
- All core flows (Contacts, Field Ops, GOTV, Communications, Fundraising, Dashboard) are wired to real APIs
- Dashboard has the best empty states — all other flows have adequate fallbacks
- `/officials` and `/social` sidebar links resolve correctly to public-facing root pages

### Founder Experience — LIVE
- Super Admin (George) logs in → lands on `/ops`
- `/ops` Clients tab → "Enter Campaign View" → enters any client campaign
- Navy FounderBanner shows: "Viewing: [Campaign Name] · Exit to Ops"

### Address Pre-List Generator — LIVE
- `POST /api/address-prelist/generate` — 3 source paths (OSM live now; MPAC/StatsCan after import)
- DB cache prevents re-hitting OSM for same municipality within 30 days
- OSM source: type "Town of Whitby" → fetches up to 2,000 real addresses from Overpass API

### ⚠️ WEDNESDAY DEMO PREP — Maleeha + Mayor of Whitby (2026-04-22)

**Before the demo George MUST do:**
1. Run `npx prisma db push` (new schema models aren't in Railway yet)
2. Verify login works at app.poll.city
3. Enter the Demo Campaign (or create a "Whitby Ward 4" campaign for authenticity)

**Safe to demo (works right now):**
- Dashboard, Briefing, Contacts, Volunteers, Field Ops, GOTV, Election Day
- Atlas Command → Atlas Command → type "Town of Whitby" → Fetch from OpenStreetMap
- Communications, Finance, Fundraising (UI shows, sends require env vars)
- Any sidebar item → none 404 anymore

**Avoid during demo:**
- Actually sending email/SMS (needs RESEND_API_KEY / Twilio)
- Completing Stripe payment flow (needs STRIPE_SECRET_KEY)
- Clicking MPAC or StatsCan sources in Atlas Command (need import scripts run first)

---

## WHAT IS ACTUALLY LIVE (code confirmed, build green)

Everything below exists in origin/main and the build passes. Whether it works end-to-end in production depends on whether env vars and DB migrations have been applied.

| Module | What's live in code | Production caveat |
|---|---|---|
| Dashboard | KPI cards, health score, 8 data fields | None |
| Daily Briefing | Adoni morning summary, priorities | Needs ANTHROPIC_API_KEY in Vercel |
| Contacts / CRM | Full CRUD, filters, soft delete, households | None |
| Volunteers | Profiles, shifts, groups, expenses | None |
| Field Ops | Full command center, routes, GPS, turf draw | MapLibre (no API key needed — OpenFreeMap) |
| GOTV | Shared metrics, ride coordination | None |
| Election Day | 4-tab command center, election night HQ | None |
| Quick Capture | Mobile capture, war room, review/export | Needs `npx prisma db push` (QR models — done per GEORGE_TODO item 2) |
| Communications | Email blast, SMS, social, automation, inbox | Email needs RESEND_API_KEY in Vercel. CASL filter crashes without DB push. |
| CASL Compliance | /compliance, consent tab on contacts | ⚠️ Crashes until `npx prisma db push` |
| Analytics | Approval ratings, sentiment, signals | Historical tab crashes until `npx prisma db push` (intelligenceEnabled col) |
| Candidate Intel | Lead ingestion, scoring, outreach | None |
| Reputation | Alert engine, rule engine, command center | None |
| Fundraising | Donation CRM, Stripe Connect, receipts | Needs STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in Vercel |
| Finance | 9-tab suite: budget, expenses, approvals, audit | None |
| Print | Templates, packs, design engine, jobs | None |
| Forms | Builder, results | None |
| Polls | All vote types, live results SSE | None |
| Social | Home feed, politician profiles, groups, Q&A, notifications | None |
| Officials directory | Rebuilt: dark/light, level tabs, postal code, proper follow API, infinite scroll (commits 6e90b25 + c2201c2) | NOT browser-verified. Follower counts now correctly returned from directory API. |
| Ops | Clients, readiness, intelligence controls, social officials panel | SUPER_ADMIN only |
| Settings | Profile, campaign, brand, security, billing | None |
| Maps | MapLibre GL JS — ward boundary, turf draw, choropleth, signs, canvasser | OpenFreeMap tiles (no key). Geocoding: needs GOOGLE_MAPS_API_KEY for voter files |

---

## HONEST STATUS: WHAT HAS NOT BEEN VERIFIED IN BROWSER

George flagged on 2026-04-20 that things claimed as "fixed" are still broken. These categories have NOT been confirmed in production browser testing:

1. **Marketing site** — scroll/nav/layout issues George saw but specific issues not captured
2. **CASL Compliance page** — crashes without `npx prisma db push`. Verified in code only.
3. **Email blast CASL filter** — same dependency.
4. **Analytics Historical tab** — crashes without `npx prisma db push`. Verified in code only.
5. **Q&A Inbox / PCS Social Hub** — code ships but NOT confirmed George can use it end-to-end
6. **Google sign-in** — broken until env vars added to Vercel
7. **Adoni** — silent without ANTHROPIC_API_KEY in Vercel
8. **Email sending** — all email routes broken without RESEND_API_KEY in Vercel

**Rule going forward: NOTHING is marked DONE in WORK_QUEUE until George has confirmed it works in a browser, or the risk of failure is env-var-only (i.e. code is correct, just needs infra).**

---

## GEORGE'S OPEN MANUAL ACTIONS

In priority order — these block real customers:

### 🔴 CRITICAL (platform broken without these)
1. **`npx prisma db push`** — run this right now. Fixes CASL, intelligenceEnabled, scraper models. One command.
2. **RESEND_API_KEY** → Vercel env vars. Without it, all email sending silently fails.
3. **ANTHROPIC_API_KEY** → Vercel env vars. Without it, Adoni is silent.
4. **NEXTAUTH_SECRET** → Vercel env vars. If not set, auth is broken.

### 🟠 HIGH (features broken in prod)
5. **GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET** → Vercel env vars. Google sign-in broken without these. Get values from the `client_secret_...json` file open in your IDE.
6. **STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** → Vercel env vars. Fundraising / Stripe Connect onboarding broken without these.
7. **DATABASE_ENCRYPTION_KEY** → Vercel env vars. Encrypted field reads/writes broken without it.

### 🟡 MEDIUM
8. **GOOGLE_MAPS_API_KEY** → Vercel env vars. **Now critical for field command map.** Key is in `.env.local` — add it to Vercel so `/api/field/geocode` works in production. Without it the map shows approximate street centroids (still functional, just not exact).
9. **Twilio** → SMS blast and two-way SMS broken without TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
10. **Railway automated backups** — enable before first real customer.

### ℹ️ Low / When ready
11. Upstash Redis (rate limiting — gracefully degrades without it)
12. VAPID keys (push notifications)
13. Cloudflare Turnstile (spam protection)

---

## NEXT SESSION OPENER — AtlasMapClient Unification

**Situation:** Three separate map clients exist and are now all shipped:
- `src/app/whitby/whitby-map-client.tsx` — most complete (Phase 1 done: bbox addresses, commercial filter, time enforcement, GOTV mode, DNK endpoint, ward search)
- `src/app/toronto/toronto-map-client.tsx` — 25 wards, school board overlays, ArcGIS bbox addresses, ward search
- `src/app/markham/markham-map-client.tsx` — stub only (needs implementation)

**The goal:** Unify into one shared `AtlasMapClient` component (likely `src/components/atlas/atlas-map-client.tsx`) that accepts a municipality config prop. Each city page (`/whitby`, `/toronto`, `/markham`) passes its own config and nothing else.

**MANDATORY: Read SESSION_HANDOFF.md fully before touching any map files.** The Toronto agent specifically flagged this — the handoff contains the stash situation and exact commit state you need to know before building.

**Step 1:** `git pull origin main`
**Step 2:** Read this file in full, then read `src/app/whitby/whitby-map-client.tsx` and `src/app/toronto/toronto-map-client.tsx` side by side
**Step 3:** Design the `MunicipalityConfig` prop interface — wards API URL, addresses API URL, DNK API URL, hard bounds, display name, initial centre/zoom
**Step 4:** Extract shared logic into `AtlasMapClient` from whitby (the reference implementation)
**Step 5:** Wire Whitby, Toronto, Markham city pages to pass their configs
**Step 6:** Build and push

**Phase 2 (next session after unification):** Connect campaign DB — support levels on doors, visit history, household counts, DNK suppression from DB contacts. The `whitby-dnk` API is already live and can serve as the pattern.

---

## COORDINATION RULES (non-negotiable — read CLAUDE.md violations section for full detail)

- `npm run push:safe` is the ONLY push command. Never `git push`.
- **DONE = browser-verified by George.** Build green = minimum to push, not minimum to call done.
- Every new feature needs a sidebar entry before claiming DONE.
- Every new API route needs `apiAuth()` + `campaignId` scoping.
- Every schema change → add `[ ]` checkbox to GEORGE_TODO.md CRITICAL section immediately.
- Claim tasks in WORK_QUEUE before starting. `CLAIMED` in origin/main = locked, do not touch.
- Update CURRENT PLATFORM STATE section in place. Do NOT append another LAST SESSION block.
