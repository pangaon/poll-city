# Poll City — Client Onboarding Master

**What this file is:** A living document tracking two things simultaneously:
1. **The client journey** — every step a new campaign goes through, from signup to fully operational
2. **Platform readiness** — what's actually built vs what's a gap, for each step

When we find a gap (feature missing, broken, or not wired end-to-end), it goes here with a status.
When we build it, status updates. This file is never "done" — it grows as the platform grows.

**File lives in:** repo root, checked into git, updated every session.
**Who reads it:** AI sessions (mandatory), George (weekly check), presented to new clients as a roadmap.

**Status legend:**
- ✅ Built + wired + browser-verified
- 🔶 Built but not fully wired (code exists, connection missing)
- ❌ Gap — not built
- 🚧 In progress this session

---

## PHASE 0 — Before the Client Logs In (George's side)

These are the steps George or the platform must complete before a client's first login.

| Step | What | Status | Notes |
|---|---|---|---|
| 0-A | Campaign created in DB (provision script or signup) | ✅ | `scripts/provision-whitby-clients.ts` or `/signup` flow |
| 0-B | User account created + linked to campaign | ✅ | Provisioned via script or self-serve signup |
| 0-C | Campaign slug set (drives public website URL) | ✅ | `poll.city/candidates/[slug]` |
| 0-D | Subscription created (Stripe or manual for initial clients) | ✅ | Pro plan via provision script |
| 0-E | George added as Admin on client campaign | ✅ | Provision script adds George's account |
| 0-F | Ward boundary seeded into campaign | 🔶 | Seeder script works; clients must import own boundary via Atlas |
| 0-G | Official record linked to campaign | ✅ | Via `officialId` on Campaign |
| 0-H | Client credentials shared securely | ❌ | No delivery mechanism — George emails manually |

---

## PHASE 1 — First Login Experience

What a new client sees and does on their very first login.

### 1-A: Onboarding Wizard
**Purpose:** Walk a first-time candidate through setup in 5 steps. They should feel confident within 10 minutes.

| Item | Status | Gap/Note |
|---|---|---|
| Setup wizard gate (redirects to wizard until complete) | ✅ | `src/components/onboarding/setup-wizard-gate.tsx` |
| Step 1: Campaign basics (name, office, election date) | ✅ | |
| Step 2: Upload logo / brand colours | ✅ | |
| Step 3: Add first contact | ✅ | |
| Step 4: Set up notifications | ✅ | |
| Step 5: Completion + dashboard redirect | ✅ | |
| **Sample data shown during wizard** | ❌ | **GAP: Wizard shows empty states, not sample data to demonstrate value** |
| **Backfill existing campaigns as onboarded** | ❌ | Run `npx tsx scripts/mark-campaigns-onboarded.ts` — see GEORGE_TODO #59 |

### 1-B: Sample / Demo Data System
**Purpose:** New clients land on a populated dashboard — not empty tables. They understand the platform immediately. All sample data is clearly labeled so there's no confusion about what's real.

| Item | Status | Gap/Note |
|---|---|---|
| `Campaign.isDemo` flag in schema | ✅ | Used by sim engine only |
| Simulation engine (generates activity) | ✅ | Runs on `isDemo=true` campaigns only |
| **`hasSampleData` flag on Campaign** | ❌ | **GAP: Need separate flag — `isDemo` is for permanent demo campaigns, not new-client seed** |
| **Sample data seeded at campaign creation** | ❌ | **GAP: No contacts, donations, tasks pre-populated for new signups** |
| **Platform-wide "Sample Data" banner** | ❌ | **GAP: No visual indicator anywhere that data is sample. Client cannot tell.** |
| **One-click "Remove Sample Data" flow** | ❌ | **GAP: No route, no UI, no confirmation dialog** |
| Vendor "demo data" label (Fuel module) | ✅ | `isSeeded` on Vendor — shows "(demo data)" text |
| **Extend `isSeeded`-style label to: Contacts** | ❌ | **GAP** |
| **Extend `isSeeded`-style label to: Donations** | ❌ | **GAP** |
| **Extend `isSeeded`-style label to: Tasks** | ❌ | **GAP** |
| **Extend `isSeeded`-style label to: Events** | ❌ | **GAP** |

**Build spec (when we get to this):**
1. Add `hasSampleData Boolean @default(false)` to Campaign schema
2. Add `isSample Boolean @default(false)` to Contact, Donation, Task, Event
3. At campaign creation: seed ~20 sample contacts, 5 donations, 3 tasks, 2 events — all with `isSample=true`
4. Sidebar / top of every page: amber banner "You're viewing sample data — [Remove sample data]" when `hasSampleData=true`
5. `DELETE /api/campaigns/[id]/sample-data`: deletes all records where `isSample=true`, sets `hasSampleData=false`
6. After removal: redirect to empty dashboard with next-step prompts

---

## PHASE 2 — Campaign Headquarters Setup

What the client needs to configure before the campaign is operationally ready.

### 2-A: Public Website (My Website Editor)
**Purpose:** The candidate's public-facing website at `poll.city/candidates/[slug]`. Controlled from the campaign app.

| Item | Status | Gap/Note |
|---|---|---|
| Public website renders at `/candidates/[slug]` | ✅ | |
| My Website editor in campaign app (`/my-website`) | ✅ | Built 2026-04-21 |
| Photo upload (candidate photo + hero banner) | ✅ | Via `/api/upload/logo` |
| Platform items (add/edit/delete) | ✅ | |
| Endorsements (add/edit/delete) | ✅ | |
| FAQ (add/edit/delete) | ✅ | |
| Social links | ✅ | |
| Preview link to public website | ✅ | |
| My Website in sidebar | ✅ | |
| My Website in mobile nav More drawer | ✅ | Built 2026-04-21 |
| **Donation button connected to Stripe Express** | 🔶 | Hidden until Stripe connected — works but client must onboard Stripe first |
| **SEO meta tags on candidate page** | ❌ | **GAP: No og:title, og:image, no structured data** |
| **Custom domain support** | ❌ | **Future — not needed for Oct 2026** |

### 2-B: Poll City Social Profile
**Purpose:** The candidate's presence on Poll City Social — where voters follow and interact. Different from the campaign website.

| Item | Status | Gap/Note |
|---|---|---|
| Official record on PCS (`/social/politicians/[id]`) | ✅ | |
| "View Campaign Website" button on PCS profile | ✅ | Built 2026-04-21 |
| Follow button for voters | ✅ | |
| Newsletter signup | ✅ | |
| Candidate Q&A | ✅ | |
| Approval rating display | ✅ | |
| **Official → Candidate mode toggle** | ✅ | Built 2026-04-21 — in `/ops/social` |
| **Client can control their own PCS profile** | ❌ | **GAP: Client has no way to edit their PCS profile from campaign app** |
| **Claim profile CTA to signup** | ❌ | **GAP: Unclaimed profiles have no "claim this profile" button for visitors** |

### 2-C: Branding
**Purpose:** Logo, colours, tagline — consistent across all printed and digital materials.

| Item | Status | Gap/Note |
|---|---|---|
| Logo upload | ✅ | |
| Brand colours (primary/secondary/accent) | ✅ | |
| Tagline | ✅ | |
| **Brand kit applied to email templates** | 🔶 | Logo in email — colours not applied |
| **Brand kit applied to print walklist** | ❌ | **GAP** |

---

## PHASE 3 — The Map (Atlas Command)

**The backbone of any campaign.** Contacts on a map → turf drawing → canvassing → GOTV → election day.
Every campaign workflow starts here.

### 3-A: Ward Boundary
**Purpose:** Defines the campaign's geographic universe. Every turf, every poll, every contact is inside this boundary.

| Item | Status | Gap/Note |
|---|---|---|
| Boundary stored in `Campaign.customization.boundaryGeoJSON` | ✅ | Via Atlas import or seed script |
| Atlas import tool accepts GeoJSON | ✅ | Built 2026-04-21 |
| **Boundary displays on canvassing map** | ✅ | Fixed 2026-04-21 — API now prefers `customization.boundaryGeoJSON`; falls back to local files |
| **Boundary displays on Atlas Command map** | ❌ | **GAP: Atlas map pages don't render the boundary at all** |
| **Boundary displays on GOTV map** | ❌ | **GAP** |
| Boundary on public candidate website | ✅ | `mapCustomization()` in `candidates/[slug]/page.tsx` |
| Client can import their own boundary (Atlas UI) | ✅ | |
| Boundary seeder for Whitby clients | ✅ | `scripts/seed-whitby-boundaries.ts` |

### 3-B: Polling Stations
**Purpose:** Where voters physically cast their ballot. Every campaign must know: which contacts go to which station, how many supporters at each station, and where to deploy scrutineers on election day.

| Item | Status | Gap/Note |
|---|---|---|
| **`PollingStation` model in schema** | ❌ | **GAP — CRITICAL** |
| **Polling stations on canvassing map** | ❌ | **GAP — CRITICAL** |
| **Polling stations importable (CSV/Elections Canada)** | ❌ | **GAP** |
| **Contact → polling station assignment** | ❌ | **GAP: `pollNumber` exists as string on Contact, but no station record to link to** |
| Polling station field on scrutineer assignment | ✅ | String field on `ScrutineerAssignment` — not a FK relation |
| **Poll number → station geographic lookup** | ❌ | **GAP** |
| **GOTV: supporters by polling station** | ❌ | **GAP: GOTV has no station-level breakdown** |
| **Election day: results by polling station** | ❌ | **GAP: eday hq has no station-specific results view** |
| **Polling station accessibility flags** | ❌ | **GAP: Important for AODA compliance** |

**Build spec (this is a session-level build):**
```
PollingStation {
  id, campaignId, name, address, lat, lng
  pollNumbers  String[]  // ["001", "002"] — elections authority codes
  capacity     Int?
  accessible   Boolean   @default(true)
  notes        String?
}
```
Connection chain: Contact.pollNumber → PollingStation.pollNumbers[] → map pin → GOTV list → scrutineer assignment → election day results

### 3-C: Turf Drawing
**Purpose:** Campaign manager draws turf polygons on the map and assigns them to canvassers.

| Item | Status | Gap/Note |
|---|---|---|
| Draw turf polygon on map | ✅ | |
| Assign turf to volunteer | ✅ | |
| Turf status tracking (assigned/in_progress/completed) | ✅ | |
| **Turf respects ward boundary** | ❌ | **GAP: Can draw turf outside the ward boundary** |
| **Turf contact count (live)** | 🔶 | Estimated, not live from DB |
| Print walk list for turf | 🔶 | Exists but prints website not list — see `project_print_walklist.md` |

### 3-D: Address Points (Voter Universe)
**Purpose:** Every door in the ward loaded as a point on the map. Without this, the map is empty.

| Item | Status | Gap/Note |
|---|---|---|
| Smart import CSV (voter file) | ✅ | |
| Address geocoding (Google Maps / Nominatim) | ✅ | |
| Address points as contact pins on map | ✅ | |
| **Address Pre-List Generator** | 🔶 | Fixed 2026-04-21 — now saves to `AddressPreList` DB + shows on map; needs `npx prisma db push` on Railway |
| OSM address source in Atlas | ✅ | |
| **Elections Canada voter file format** | ❌ | **GAP: Specific column mapping not defined** |

---

## PHASE 4 — People (CRM)

### 4-A: Contacts
| Item | Status | Gap/Note |
|---|---|---|
| Contact list with search/filter | ✅ | |
| Contact detail page | ✅ | |
| Support level tracking | ✅ | |
| Do Not Contact flag | ✅ | |
| Soft delete | ✅ | |
| **Bulk import from voter file** | ✅ | |
| **Contact → polling station link** | ❌ | **GAP (see 3-B)** |
| **Household grouping** | 🔶 | `householdId` field exists — no UI for household view |

### 4-B: Volunteers
| Item | Status | Gap/Note |
|---|---|---|
| Volunteer list | ✅ | |
| Turf assignment | ✅ | |
| Volunteer skills tracking | ✅ | |
| **Volunteer app (mobile)** | 🔶 | Canvasser walk view exists — full mobile app in progress |

---

## PHASE 5 — Communications

| Item | Status | Gap/Note |
|---|---|---|
| Email blast (Resend) | ✅ | Requires Resend API key |
| SMS blast (Twilio) | ✅ | Requires Twilio credentials |
| CASL consent tracking | ✅ | |
| CASL compliance page | ✅ | |
| **Email open/click tracking** | ❌ | **GAP: pixel route + click redirect built-in but not wired** — see `project_email_tracking_pixel.md` |
| Automation engine | ✅ | |
| **Inbound email reply routing** | ❌ | **GAP: Resend inbound not configured** — see GEORGE_TODO #59 |

---

## PHASE 6 — Finance

| Item | Status | Gap/Note |
|---|---|---|
| Donation intake (Stripe) | ✅ | Requires campaign to connect Stripe Express |
| Donation list | ✅ | |
| Budget tracking | ✅ | |
| Finance reports | 🔶 | UI exists, depth limited |
| **Receipts (CRA-compliant for political donations)** | ❌ | **GAP** |
| **Third-party advertising expense tracking** | ❌ | **GAP: Ontario election law requires this** |
| Expense tracking | 🔶 | Built — UI needs depth |

---

## PHASE 7 — Election Day

| Item | Status | Gap/Note |
|---|---|---|
| E-day ops dashboard | ✅ | |
| Scrutineer assignment | ✅ | |
| GOTV ride coordination | ✅ | |
| **Polling station map on election day** | ❌ | **GAP: No station pins on eday map** |
| **Results by polling station** | ❌ | **GAP: No station-specific results entry** |
| War room (live dashboard) | ✅ | |
| Election night HQ | ✅ | |

---

## GAP REGISTRY
*Gaps we've discovered — prioritized for building. Each links back to the relevant phase above.*

### P0 — CRITICAL (blocks demo or first real client)

| Gap | Phase | Impact |
|---|---|---|
| Sample data UX (banner + one-click remove) | 1-B | New clients can't tell what's real vs sample |
| Polling stations — no model, no map layer | 3-B | Backbone of GOTV and election day |
| Boundary visible on Atlas map pages | 3-A | Clients can't see their ward in Atlas |
| Turf respects ward boundary | 3-C | Can draw outside ward |

### P1 — HIGH (needed before first paid client goes live)

| Gap | Phase | Impact |
|---|---|---|
| Client controls their own PCS profile | 2-B | Clients have no way to edit their public social profile |
| Claim profile CTA on unclaimed PCS profiles | 2-B | Lost conversion opportunity |
| Email open/click tracking | 5 | No engagement data on comms |
| SEO on candidate public website | 2-A | Google doesn't index candidate pages |

### P2 — MEDIUM (needed before October 2026 election)

| Gap | Phase | Impact |
|---|---|---|
| Polling station → contact assignment | 3-B, 4-A | GOTV list sorted by station |
| Elections Canada voter file format | 3-D | Can't import official voter lists |
| CRA-compliant donation receipts | 6 | Legal requirement |
| Third-party advertising expense tracking | 6 | Ontario election law |
| Household grouping UI | 4-A | Canvassers knock once per household |
| Print walk list fix | 3-C | Prints wrong thing |

---

## CANVASSING MAP — What It Needs to Show

This is what a campaign manager should see when they open the map. Current state vs target:

| Layer | Current | Target |
|---|---|---|
| Ward/riding boundary | 🔶 Partial — from filesystem or customization | ✅ From customization, always accurate |
| Contact/voter pins | ✅ | |
| Support level colours on pins | ✅ | |
| Turf polygons | ✅ | |
| Volunteer positions (live) | ✅ | |
| Signs | ✅ | |
| **Polling station pins** | ❌ | ❌ Not built |
| **Polling station service area** | ❌ | ❌ Not built |
| **No-knock zones** | ❌ | ❌ Not built |
| Heat map (support density) | ✅ | |

---

## HOW TO USE THIS FILE

**When you find a gap:** Add it to the Gap Registry with phase, impact.
**When you build it:** Update the status in the relevant phase table (🔶 or ✅), remove from Gap Registry.
**When a client asks "can the platform do X?":** Check here first. Honest answer.
**New session opener:** Read this file after SESSION_HANDOFF.md. It tells you what's wired and what isn't.

---

*Created: 2026-04-21 | Maintained by AI sessions + George*
*Every gap in this file is a bug waiting to cause a lost client. Fix in priority order.*
