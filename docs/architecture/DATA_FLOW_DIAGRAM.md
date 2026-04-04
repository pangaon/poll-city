# Data Flow Diagram

## 1. Admin → Publish → Social

Campaign staff create content in Admin. Content is published to Social when made public.

```
POLL CITY ADMIN (private)
        │
        │  Campaign Manager creates:
        │  - Public poll (visibility = "public")
        │  - Official profile (isActive = true)
        │  - Official answers a PublicQuestion
        │
        ▼
   [PUBLISH ACTION]
   Sets visibility flag in database
   No separate data copy — same record
        │
        ▼
POLL CITY SOCIAL (public)
        │
        │  Social app reads:
        │  GET /api/polls (visibility: "public")
        │  GET /api/officials (isActive: true)
        │  GET /api/officials/[id]/questions (isPublic: true)
        │
        ▼
   Public display — no personal data
   Aggregate results only for polls
```

**What cannot be published:**
- Campaign-private polls (campaign_only) — visible only to members
- Contact data — never
- Internal scores, tags, notes — never
- GOTV data — never

---

## 2. Social → Consent → CRM

A voter in Social takes an explicit action. With explicit consent, minimum data flows to the campaign CRM.

```
POLL CITY SOCIAL
        │
        │  User takes explicit action:
        │  - Clicks "Support Campaign" button
        │  - Submits volunteer signup form
        │  - Requests a lawn sign
        │  - Checks "Allow campaign to contact me"
        │
        ▼
   [CONSENT GATE]
   User must:
   1. Be authenticated (PUBLIC_USER session)
   2. Have explicitly initiated the action
   3. See clear disclosure of what data will be shared
   4. Confirm (button/submit — not pre-checked)
        │
        ▼
   POST /api/social/signal
   (or future: POST /api/social/consent)
        │
        │  Payload (minimum fields only):
        │  - userId (Social user)
        │  - campaignId (which campaign)
        │  - signalType (volunteer / support / sign_request / contact_permission)
        │  - consentScope (what they agreed to)
        │  - userProvided fields only (address, name if given)
        │
        ▼
   [BRIDGE HANDLER]
   Server-side only:
   1. Validates consent record is genuine
   2. Looks up or creates Contact in campaign CRM
   3. Sets source = "social_consent_bridge"
   4. Writes minimum fields only
   5. Creates ActivityLog entry (mandatory)
   6. Does NOT copy: email from Social profile, full name if not provided,
      any field the user did not explicitly submit
        │
        ▼
POLL CITY ADMIN — CRM
        │
        │  Campaign sees:
        │  - New contact or updated contact
        │  - consentScope on the record
        │  - Source: "social_consent_bridge"
        │  - Follow-up flag if appropriate
        │
        ▼
   Campaign staff can now:
   - Follow up within the consented scope
   - NOT see the user's full Social profile
   - NOT see their full address unless they provided it
   - NOT see their voting history or poll responses
```

**What the bridge NEVER does:**
- Automatically transfer data without user action
- Copy email address unless user typed it into the form
- Copy poll vote history
- Copy Social following list
- Create a contact record with any field the user did not provide

---

## 3. Print Order Flow (Phase 1 — inside Admin)

```
POLL CITY SOCIAL
        │
        │  Voter submits sign request
        │  (consent-gated bridge)
        │
        ▼
POLL CITY ADMIN — Signs queue
        │
        │  Campaign manager sees sign request
        │  Status: Requested
        │
        ▼
   [ASSIGN to team]
   assignedTeam = "East Zone Crew"
   Status: Scheduled
        │
        ▼
   [INSTALL]
   Volunteer marks installed, uploads photo
   Status: Installed
   installedAt: [timestamp]
        │
        ▼
   [REMOVE] (at campaign end)
   Status: Removed
   removedAt: [timestamp]
```

**Future Print flow (Phase 2+):**
```
Admin → Print order created
     → Print vendor receives order (vendor portal)
     → Vendor produces materials
     → Delivery tracked
     → Distribution logged by zone
```

---

## 4. GOTV Election Day Data Flow

```
ELECTIONS OFFICE
        │
        │  Exports "who has voted today" list
        │  (CSV, Excel, or pipe-delimited)
        │
        ▼
POLL CITY ADMIN — GOTV Upload
        │
        │  Campaign manager uploads file
        │  POST /api/gotv/upload
        │
        ▼
   [FUZZY MATCHER]
   Matches voted records against campaign's supporters
   by: name + address similarity scoring
        │
        ▼
   Matched supporters: Contact.gotvStatus = "voted"
   Unmatched records: stored in GotvRecord without contactId
        │
        ▼
GOTV DASHBOARD
        │
        │  Shows live:
        │  - % of your supporters who have voted
        │  - Priority list: supporters who haven't voted yet
        │  - Call list: ordered by priority
        │
        ▼
FIELD TEAMS
        │
        │  Walk lists auto-exclude voters who have voted
        │  Call lists auto-exclude voters who have voted
        │  Time not wasted on people who already voted
```

---

## 5. Session and Identity Flow

```
USER VISITS ANY PAGE
        │
        ▼
   middleware.ts
        │
        ├─── Public route (/social/*, /api/geo, etc.)
        │    └── Pass through — no redirect
        │
        └─── Protected route (/(app)/*, /api/contacts, etc.)
             └── Check NextAuth JWT
                      │
                      ├─── No valid session → redirect to /login
                      │
                      └─── Valid session
                               │
                               ▼
                          API routes: apiAuth() + membership.findUnique()
                          Pages: resolveActiveCampaign()
                               │
                               ├─── No membership → redirect /login
                               │
                               └─── Valid membership
                                        │
                                        ▼
                                   Read activeCampaignId from session
                                   (set by campaign switcher or default to first)
                                        │
                                        ▼
                                   All queries scoped to campaignId
```
