# Domain Map

Each domain is a logical grouping of models, business rules, and API routes. Domains are not separate services — they are organizational boundaries within the shared backend. In a future microservices architecture, each domain could become a separate service. For now, they share one database and one Next.js API layer.

---

## Identity Domain

**Owns:** User, Membership, Session (NextAuth JWT)

**Responsibility:** Who is the user, what are they allowed to do, which campaign are they in.

| Model | Description |
|---|---|
| User | Account record — email, password hash, role, activeCampaignId |
| Membership | User ↔ Campaign link with role — the authorization record |

**Key rules:**
- User.role is system-level only (SUPER_ADMIN, PUBLIC_USER etc.)
- Membership.role governs all campaign-scoped authorization
- activeCampaignId determines current campaign context for multi-campaign users
- Session JWT carries: userId, role, activeCampaignId, userName

**Package:** `packages/auth`

---

## Campaigns Domain

**Owns:** Campaign, Membership, ActivityLog

**Responsibility:** Campaign lifecycle, team management, audit trail.

| Model | Description |
|---|---|
| Campaign | Campaign organization — name, election type, dates, candidate info |
| Membership | Team members and their roles |
| ActivityLog | Immutable audit record of all campaign actions |

**Key rules:**
- Every campaign-scoped action writes to ActivityLog
- Campaign creation makes the creator an ADMIN via Membership
- Campaign data cannot be read by non-members

**Package:** Shares `packages/db`

---

## CRM Domain

**Owns:** Contact, Household, Interaction, Tag, ContactTag, CustomFieldValue, CampaignField, VolunteerProfile, Donation

**Responsibility:** Voter and supporter records. The core of Poll City Admin.

| Model | Description |
|---|---|
| Contact | Voter/supporter — 60+ fields including support level, GOTV status |
| Household | Physical address grouping |
| Interaction | Every touchpoint — door knock, phone call, email |
| Tag | Campaign-defined labels |
| ContactTag | Contact ↔ Tag assignments |
| CampaignField | Custom field definitions |
| CustomFieldValue | EAV values for custom fields |
| VolunteerProfile | Volunteer skills, availability, vehicle |
| Donation | Pledge capture |

**Key rules:**
- All CRM data is campaign-private — never exposed to Social
- Consent bridge writes to this domain only via the bridge event handler
- Bridge writes always include: userId of consenting user, timestamp, consent scope, audit log entry

**Package:** Shares `packages/db`

---

## Civic Directory Domain

**Owns:** Official, OfficialFollow, PublicQuestion

**Responsibility:** Public record of elected officials and candidates.

| Model | Description |
|---|---|
| Official | Public official profile — name, title, district, bio, contact |
| OfficialFollow | Social app: user following an official |
| PublicQuestion | Q&A between voters and officials |

**Key rules:**
- Official records are public — no campaign membership required to read
- OfficialFollow and PublicQuestion require authentication
- Official.postalCodes[] is excluded from list API responses (payload optimization)
- Official claiming (linking an official profile to a Campaign) is a future feature

**Package:** Shares `packages/db`, types in `packages/types`

---

## Polling Domain

**Owns:** Poll, PollOption, PollResponse

**Responsibility:** All poll types — binary, multiple choice, slider, ranked, swipe.

| Model | Description |
|---|---|
| Poll | Poll definition — type, visibility, campaign link, timing |
| PollOption | Options for choice-type polls |
| PollResponse | Voter responses — all types |

**Key rules:**
- Poll.visibility controls access: public (open), campaign_only (membership required), unlisted (link only)
- PollResponse stores: userId (if auth), ipHash (if anon), postalCode, value/optionId/rank
- Duplicate prevention: application-layer findFirst + DB partial unique indexes
- Raw IP never stored. ipHash is one-way SHA-256.
- Results always returned as aggregates — individual responses never exposed via public API

**Package:** Shares `packages/db`

---

## Canvassing Domain

**Owns:** CanvassList, CanvassAssignment, GotvBatch, GotvRecord

**Responsibility:** Walk list management and election day operations.

| Model | Description |
|---|---|
| CanvassList | Named walk list assigned to a volunteer |
| CanvassAssignment | Contact → list assignment |
| GotvBatch | One uploaded voted list from elections office |
| GotvRecord | Individual record from a voted list — matched or unmatched |

**Key rules:**
- All canvassing data is campaign-private
- GOTV upload fuzzy-matches voted list against campaign supporters
- Matched contacts are marked gotvStatus = "voted" in the Contact model
- CanvassAssignment target userId must be a member of the same campaign

**Package:** Shares `packages/db`

---

## Publishing Domain

**Owns:** Poll (public-facing), Official (public-facing), PublicQuestion (answered)

**Responsibility:** The content pipeline from Admin to Social.

This is not a separate set of models — it is the subset of existing models that are intentionally public-facing. The publishing act is:
- Setting Poll.visibility = "public"
- Marking Official.isActive = true
- Official answering a PublicQuestion (setting answeredAt)

**Key rules:**
- Admin creates content; Social displays it
- No direct write path from Social to campaign-private content
- Publish is a permission-controlled action requiring CAMPAIGN_MANAGER or above

**Package:** Shared API layer — no separate package needed in Phase 1

---

## Notifications Domain

**Owns:** Notification, NotificationTemplate

**Responsibility:** In-app notifications, future push and email delivery.

| Model | Description |
|---|---|
| Notification | Per-user notification — title, body, type, isRead |
| NotificationTemplate | Reusable templates for campaign notifications |

**Key rules:**
- All notifications are strictly opt-in (user preference flags on User model)
- Campaigns may send notifications only to users who have opted in to that campaign
- No global blasts
- Push delivery (FCM/APNs) is Phase 3

**Package:** `packages/events` (event bus for triggering notifications)

---

## GIS Domain

**Owns:** GeoDistrict, Contact geo fields, Sign geo fields

**Responsibility:** Geographic data — postal prefix mapping, lat/lng on contacts and signs.

| Model | Description |
|---|---|
| GeoDistrict | Postal prefix → ward/riding/district mapping |

**Key rules:**
- GeoDistrict is public reference data — no campaign membership required
- Contact lat/lng and address fields are campaign-private
- Sign lat/lng is campaign-private
- Map visualization is Phase 4

**Package:** `packages/maps`

---

## Print Domain

**Owns:** Sign, ServiceProvider, ServiceBooking, QrCode, QrScan

**Responsibility:** Physical campaign materials — signs, print orders, distribution.

| Model | Description |
|---|---|
| Sign | Lawn sign — request, assign, install, remove lifecycle |
| ServiceProvider | Print vendors and campaign service companies |
| ServiceBooking | Campaign booking a service |
| QrCode | Generated QR codes for contacts, volunteers, events, polls |
| QrScan | Scan events |

**Key rules:**
- Sign data is campaign-private
- ServiceProvider is shared (public marketplace — future)
- Sign requests from Social flow through the consent bridge before entering this domain
- QR code tokens must not expose contact details without authentication

**Package:** `packages/print-core`

---

## Audit Domain

**Owns:** ActivityLog

**Responsibility:** Immutable record of all campaign actions, including consent bridge transfers.

| Field | Mandatory |
|---|---|
| campaignId | Always |
| userId | Always |
| action | Always |
| entityType | Always |
| entityId | Always |
| details | Context-dependent |
| createdAt | Auto |

**Key rules:**
- ActivityLog is append-only — no updates or deletes
- Consent bridge transfers always create an ActivityLog entry with action: "consent_bridge_transfer"
- Audit log is campaign-private — only visible to ADMIN and CAMPAIGN_MANAGER of that campaign
- UI for browsing ActivityLog is not yet built

**Package:** Shares `packages/db`
