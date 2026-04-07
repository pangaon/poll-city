# Poll City — System Logic Super-Matrix

> Canonical reference built from real codebase audit (April 2026).
> 88 Prisma models, 24 Adoni tools, 120+ API routes, 50+ client pages.

---

## 1. Core Platform Objects

### Campaign
- **Purpose**: Root isolation boundary. All operational data is scoped to a campaign.
- **Source of truth**: `prisma.campaign` (fields: name, slug, candidateName, electionDate, electionType, status, budget, customization JSON)
- **Upstream inputs**: Created by user, seeded by admin
- **Downstream consumers**: Every module — contacts, donations, tasks, GOTV, canvassing, events, signs, volunteers, Adoni, analytics
- **Role access**: ADMIN creates/edits; all members read
- **Scoping**: `campaignId` FK on ~50+ models
- **Adoni**: Campaign context injected into every Adoni call via `activeCampaignId`
- **When this changes**: All metric aggregations reset; Adoni context updates; dashboard refreshes

### Membership / Role
- **Purpose**: Links User to Campaign with a role
- **Source of truth**: `prisma.membership` (userId + campaignId + role enum)
- **Two RBAC systems coexist**:
  1. Legacy: `ROLE_PERMISSIONS` map in `src/lib/auth/helpers.ts` → `requirePermission()`
  2. Enterprise: `CampaignRole` with trust levels in `src/lib/permissions/` → `apiAuthWithPermission()`
- **Roles**: ADMIN, MANAGER, VOLUNTEER_LEADER, VOLUNTEER, VIEWER
- **Scoping**: User sees only campaigns they are members of; `activeCampaignId` on User model
- **When this changes**: UI permissions update; Adoni tool access changes; sidebar items change

### Contact / Household
- **Purpose**: Core voter/constituent record
- **Source of truth**: `prisma.contact` (name, email, phone, address, postalCode, supportLevel, gotvStatus, voted, votedAt, lat, lng)
- **Schema fields encrypted**: phone, email (via Prisma middleware)
- **Upstream inputs**: Import CSV, manual creation, canvassing walk list, Adoni `add_contact`
- **Downstream consumers**: Canvassing (walk lists), GOTV (strike lists, priority), Dashboard (metrics), Analytics, Donations (donor matching), Signs, Events (RSVP), Adoni (all query tools)
- **Scoping**: `campaignId` FK — absolute isolation
- **When supportLevel changes**: Dashboard supportRate updates, GOTV priority tier recalculates, Analytics breakdowns change, Adoni summaries change, Canvassing progress recalculates

### Interaction
- **Purpose**: Records every touchpoint with a contact (door knock, phone call, email, note)
- **Source of truth**: `prisma.interaction` (contactId, type enum, notes, supportLevel, issues, userId, createdAt)
- **Upstream inputs**: Walk list recording, phone bank, manual log, Adoni `record_interaction`
- **Downstream consumers**: Contact detail history, Analytics (contact rate), GOTV score (recency factor), Dashboard metrics
- **Scoping**: Via contact → campaign chain
- **When this changes**: Contact.supportLevel may update, Contact.lastContactedAt updates, GOTV score recalculates, Dashboard `doorsKnocked` increments

### Support Level
- **Canonical taxonomy** (Prisma enum `SupportLevel`):
  - `strong_support` | `leaning_support` | `undecided` | `leaning_opposition` | `strong_opposition` | `unknown`
- **BUG**: 8+ files use `"against"` / `"leaning_against"` which are NOT valid enum values
- **Stored on**: `Contact.supportLevel` (default: `unknown`)
- **Also stored on**: `Interaction.supportLevel` (records point-in-time support at each interaction)
- **Computed metrics**: Support rate = `(strong_support + leaning_support) / total_contacts`
- **ID rate**: `(total - unknown) / total` (NOTE: Adoni knowledge base incorrectly excludes opposition)

### Geography / Turf / Ward / Poll
- **GeoDistrict**: Cache table for ward/riding geo boundaries (postalPrefix, level, name, boundary GeoJSON)
- **Turf**: Campaign-scoped polygon for canvassing (name, boundary, contactIds, assignedUserId, status)
- **TurfStop**: Individual door/address within a turf (contactId, status, order)
- **Scoping**: GeoDistrict is global; Turf is campaign-scoped
- **Downstream**: Maps, Canvassing walk lists, GOTV ward breakdowns
- **When turf completed**: Campaign progress recalculates, Canvassing stats update

### Lists (Canvass / Walk / Strike)
- **CanvassList**: Named collection of canvass assignments for a campaign
- **CanvassAssignment**: Links a canvass list to a user (volunteer)
- **Walk list**: Realized as Turf + TurfStops (ordered contacts to visit)
- **Strike list**: GOTV execution — contacts to mark as voted (via GotvBatch/GotvRecord or VotedListUpload)
- **Scoping**: All campaign-scoped

### Task / Assignment
- **Purpose**: Campaign work items (call X, deliver signs, follow up)
- **Source of truth**: `prisma.task` (title, description, status, priority, dueDate, assigneeId, campaignId)
- **Adoni tools**: `list_tasks`, `complete_task`, `create_task`
- **When this changes**: Dashboard task counts update, Adoni task summaries update

### Volunteer / Team
- **VolunteerProfile**: Extended profile for volunteers (skills, availability, hoursLogged)
- **VolunteerGroup**: Named team with members and leader
- **VolunteerShift**: Scheduled time slot with signups and attendance
- **VolunteerExpense**: Reimbursement requests (submitted → approved → reimbursed)
- **Scoping**: All campaign-scoped via membership chain
- **When volunteer joins**: Team count updates, Canvassing assignment pool grows

### Literature / Assets / Scripts
- **Literature**: Campaign materials (flyers, palm cards) — name, type, fileUrl
- **CanvassScript**: Branching conversation scripts for door-knocking
- **Scoping**: Campaign-scoped

### GOTV State
- **Contact fields**: `voted` (boolean), `votedAt` (datetime), `gotvStatus` (enum: not_checked, not_home, will_vote, voted, refused)
- **GotvBatch / GotvRecord**: Bulk vote-marking batches
- **VotedListUpload**: Poll-provided voter lists for strike-off
- **GOTV Score**: Computed by `src/lib/gotv/score.ts` — composite of support level + engagement + recency + commitment → 0-100 → P1/P2/P3/P4 tiers
- **BUG**: Three competing tier systems exist (see Section 4)
- **When voter marked voted**: Gap closes, GOTV score updates, Strike list updates, Dashboard/Command Center update

### Signs (Lawn Signs)
- **Source of truth**: `prisma.sign` (contactId, type, status, address, lat, lng, installedAt, removedAt)
- **Lifecycle**: requested → approved → installed → removed
- **Adoni tool**: `create_sign_request`
- **Scoping**: Campaign-scoped

### Events
- **Source of truth**: `prisma.event` (name, type, date, location, capacity, campaignId)
- **EventRsvp**: Links contacts to events with attendance status
- **Adoni tool**: `create_event`

### Donations
- **Source of truth**: `prisma.donation` (amount, donorName, donorEmail, contactId, campaignId)
- **Amount field encrypted** via Prisma middleware
- **Compliance**: Ontario $25,000 donation cap enforced by Adoni `log_donation`
- **Adoni tools**: `get_donation_summary`, `log_donation`

### Notifications
- **PushSubscription**: WebPush subscription per user
- **Notification**: In-app notification (title, body, read status, userId)
- **Scoping**: User-level (not campaign-scoped)

### Adoni (AI Assistant)
- **24 tools** across 8 permission categories
- **Campaign isolation**: Every tool query includes `campaignId` filter
- **RBAC**: `TOOL_REQUIRED_PERMISSION` map checked before execution
- **Max 5 tool-use rounds** per conversation turn
- **Knowledge base**: Campaign-specific context injected into system prompt
- **Memory**: Per-campaign conversation memory via `AdoniMemory` model

### Import / Export
- **ImportJob**: Tracks CSV import lifecycle (uploaded → mapping → processing → complete/failed)
- **ImportMapping**: Column mapping rules (source column → target field)
- **Export**: 9 export API routes (contacts, donations, interactions, tasks, volunteers, signs, events, polls, analytics)
- **Adoni tool**: `export_contacts` with natural language filter parsing

---

## 2. Cross-Module Dependency Table

| Trigger Event | What Updates |
|---|---|
| **Support level changes** | Contact record, Dashboard supportRate, GOTV priority tier, Analytics breakdown, Adoni campaign summary, Canvassing progress stat, Map marker color |
| **Voter marked voted** | Contact.voted/votedAt/gotvStatus, GOTV gap counter, Strike list strike-off, Command Center live count, Dashboard turnout metric, Adoni GOTV summary |
| **Turf completed** | Turf.status, Campaign canvassing progress %, Dashboard turf completion, Canvassing page stats |
| **Team deployed** | CanvassAssignment created, Turf.assignedUserId set, Volunteer shift signup, Active canvassers list updates |
| **Invite accepted** | Membership created, User.activeCampaignId set, Sidebar shows campaign, Role permissions activate |
| **Literature attached** | CanvassList or Turf metadata updated, Walk list shows literature |
| **Interaction recorded** | Interaction row created, Contact.supportLevel may update, Contact.lastContactedAt updates, GOTV score recalculates, Dashboard doorsKnocked increments, Analytics contact rate updates |
| **Donation logged** | Donation record created, Contact.isDonor flag, Dashboard totalRaised updates, Spending limit progress, Adoni donation summary |
| **Task completed** | Task.status → completed, Dashboard task count, Adoni task summary, Activity log entry |
| **Sign installed** | Sign.status → installed, Map sign marker appears, Dashboard sign count, Adoni sign summary |
| **Contact imported** | Contact records created, Dashboard total contacts updates, Tag associations created, Dedup check runs |
| **Event created** | Event record, Calendar updates, Adoni event list, Notification to team |

---

## 3. Current Repo Inconsistencies (CRITICAL FINDINGS)

### 3A. Support Level Taxonomy Mismatch (CRITICAL BUG)

**8+ files use `"against"` / `"leaning_against"` instead of schema values `"strong_opposition"` / `"leaning_opposition"`.**

| File | Impact |
|---|---|
| `api/analytics/campaign/route.ts:51` | Opposition count always 0 in campaign analytics |
| `api/canvassing/street-priority/route.ts:43` | Opposition streets never flagged |
| `api/intelligence/zone-analysis/route.ts:49` | Zone opposition always 0 |
| `api/contacts/bulk-update/route.ts:8` | Bulk update Zod allows invalid values |
| `lib/validators/voice.ts:23` | Voice webhook rejects valid enum values |
| `api/voice/webhook/route.ts:58` | Phone bank writes invalid enum to DB |
| `api/gotv/priority-list/route.ts:24` | P4 tier always empty |
| `canvassing/walk/walk-shell.tsx:93` | Walk list "Against" button sends wrong value |
| `prisma/seeds/ward20-demo.ts:92-97` | Seed data uses `as any` to bypass |

### 3B. Three Competing GOTV Tier Systems (CRITICAL)

1. **`src/lib/gotv/score.ts`**: Full composite algorithm (support + engagement + recency + commitment) → score 0-100 → P1(80+)/P2(60-79)/P3(40-59)/P4(<40)
2. **`api/analytics/gotv/route.ts`**: Simple mapping: P1=strong_support, P2=leaning_support, P3=undecided, P4=opposition
3. **`analytics-client.tsx`**: Hardcoded 35/25/25/15 percentage split — not real data at all

### 3C. ID Rate Formula Mismatch

- Everywhere: `(total - unknown) / total` (all identified contacts including opposition)
- Adoni knowledge base: `(supporters + undecided) / total` (excludes opposition = undercounts)

### 3D. Demo Fallback Contamination

| Location | Issue |
|---|---|
| Analytics page | Synthetic random-walk time series, fake volunteer leaderboard, hardcoded event data, hardcoded P1-P4 conversion rates (87/68/45/22%) |
| Command center | `MOCK_VOLUNTEERS` and `MOCK_ACTIVITY` are permanent state — never replaced by API data |
| TV mode | Entirely hardcoded demo data, no campaign connection |
| Election night | Mock uses "Sarah Chen" while seed uses "Sam Rivera" |
| Dashboard studio | FALLBACK object with hardcoded numbers masks API failures silently |
| Adoni chat (2 files) | Identical hardcoded `supportRate: 58, doorsToday: 212` placeholder in both `adoni.tsx` and `adoni-chat.tsx` |

### 3E. Two RBAC Systems

Legacy `ROLE_PERMISSIONS` map and enterprise `CampaignRole` with trust levels coexist. Most routes use legacy. ~15 routes use enterprise. No unified enforcement.

### 3F. Campaign Scoping Via Client-Supplied ID

Most API routes accept `campaignId` from query params (client chooses). They verify membership, but the client selects which campaign. Enterprise routes use `session.user.activeCampaignId` directly.

---

## 4. Canonical Truth Model

### One Support Taxonomy

```
strong_support | leaning_support | undecided | leaning_opposition | strong_opposition | unknown
```

All code must use these exact values. No aliases. No shortcuts.

UI labels can be friendly ("Strong Support", "Leaning Opposition") but data values must match the Prisma enum.

### One Metric Layer

| Metric | Formula | Scope |
|---|---|---|
| Support Rate | `(strong_support + leaning_support) / total_contacts * 100` | Campaign, ward, street, zone |
| ID Rate | `(total - unknown) / total * 100` | Campaign |
| Contact Rate | `contacts_with_interaction / total_contacts * 100` | Campaign |
| GOTV Score | `computeGotvScore()` from `src/lib/gotv/score.ts` | Per-contact |
| GOTV Tier | P1(≥80) / P2(60-79) / P3(40-59) / P4(<40) from score | Per-contact |
| Gap | `winThreshold - supportersVoted` | Campaign |
| Turnout Rate | `voted / confirmedSupporters * 100` | Campaign |
| Doors Knocked | `count(interactions where type=door_knock)` | Campaign |

### One Propagation Logic

When `Contact.supportLevel` changes:
1. Contact record updates in DB
2. GOTV score recomputes (on next read)
3. All aggregations that include this contact recalculate on next API call
4. No client-side caching of stale support data (all reads are fresh from DB)

### One Demo Truth Model

- Canonical demo campaign: `ward-12-2026` ("Ward 12 — City Council 2026", candidate Sam Rivera)
- All seeds should target this campaign or create clearly separate ones
- All mock/fallback data should either use real API data or show an explicit "No data available" state
- No synthetic time series, no fake leaderboards, no hardcoded percentages

---

## 5. Implementation Order

### Phase 1: Data Integrity (CRITICAL — fix broken data pathways)
1. Fix support level taxonomy across all 8+ files → use Prisma enum values only
2. Fix voice validator to accept real enum values
3. Fix GOTV priority-list P4 tier to use `leaning_opposition`
4. Fix Adoni knowledge base ID rate formula
5. Unify GOTV tier computation: all consumers use `score.ts` engine

### Phase 2: Demo Truth Cleanup
6. Replace analytics synthetic data with real API data or honest empty states
7. Replace command center permanent mock with real API integration
8. Remove hardcoded GOTV percentage splits
9. Fix seed inconsistencies (ward20 enum values, SUPER_ADMIN role)

### Phase 3: Architecture Unification
10. Converge RBAC systems (migrate legacy routes to enterprise permission engine)
11. Standardize campaign scoping (server-side `activeCampaignId` over client-supplied)
12. Consolidate StatCard/MetricCard/AnimatedCounter implementations

### Phase 4: Hardening
13. Add rate limiting to export routes
14. Enforce voice webhook auth when secrets are unset
15. Add missing Zod validation to remaining public endpoints
