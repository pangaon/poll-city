# Data Classification Matrix

## Three Data Classes

Every field, model, and API response belongs to exactly one of these three classes. Data does not move between classes without explicit authorization and audit logging.

```
┌─────────────────────┐     Consent Bridge      ┌─────────────────────┐
│   CAMPAIGN-PRIVATE  │ ←─────────────────────── │  CONSENT-GATED      │
│   (Admin only)      │   (logged, minimal,       │  BRIDGE             │
│                     │    user-initiated)         │  (Social → Admin)   │
└─────────────────────┘                           └─────────────────────┘
                                                         ↑
                              User explicit action       │
                                                         │
                                                  ┌─────────────────────┐
                                                  │  PUBLIC /           │
                                                  │  PUBLIC-PROFILE     │
                                                  │  (Social display)   │
                                                  └─────────────────────┘
```

---

## Class 1: Campaign-Private

**Definition:** Data created and owned by a campaign. Never exposed outside the campaign. Never accessible via Social routes. Never included in any public API response.

**Who can access:** Campaign members only (Membership.role determines what they can see/edit)

**How it's protected:** Every API route that touches this data calls `apiAuth()` + `membership.findUnique()`. No exceptions.

### Models — Campaign-Private

| Model | Why private |
|---|---|
| Contact | Contains voter names, addresses, phones, support levels, notes |
| Household | Groups contacts — campaign-internal |
| Interaction | Voter touchpoint history — private campaign intelligence |
| Task | Internal campaign operations |
| CanvassList | Walk list — campaign strategy |
| CanvassAssignment | Who is canvassing where |
| GotvBatch | Uploaded voted lists from elections office |
| GotvRecord | Individual matched records from voted list |
| Donation | Pledge records — financial sensitivity |
| VolunteerProfile | Volunteer skills and availability |
| Tag | Campaign-defined labels |
| ContactTag | Contact label assignments |
| CampaignField | Custom field definitions |
| CustomFieldValue | Custom field values per contact |
| ActivityLog | Internal audit trail |
| Notification (campaign type) | Staff-facing alerts |

### Fields — Always Campaign-Private (on Contact model)

```
firstName, lastName, email, phone, phone2, address1, address2
supportLevel, gotvStatus, notHome, followUpNeeded, followUpDate
notes, issues, signRequested, signPlaced, volunteerInterest
doNotContact, isDeceased, skipHouse
externalId, importSource, source
membershipSold, isActiveMember, membershipExpiry
captain, subCaptain, partyMember
federalPoll, provincialPoll, municipalPoll, pollDistrict
firstChoice, secondChoice
facebook, twitter, instagram, wechat, businessEmail, businessPhone
```

---

## Class 2: Public / Public-Profile

**Definition:** Data intended for public consumption. Created by Admin users but displayed to anyone. No authentication required to read.

**Who can access:** Anyone

**How it's protected:** No personal data in this class. Content is reviewed before being marked public. API routes for this data require no auth and return only public-safe fields.

### Models — Public

| Model | What makes it public |
|---|---|
| Official | isActive = true + selected fields only (no postalCodes, claimedByUserId) |
| Poll | visibility = "public" or "unlisted" |
| PollOption | Belongs to a public poll |
| PollResponse | Never returned individually — aggregate results only |
| PublicQuestion | isPublic = true — both question and official answer |
| GeoDistrict | Reference data — no personal information |
| ElectionResult | Historical public election data |
| OfficialFollow | Count only — not individual follower identities |

### What is NEVER included in Public API responses

The following fields are excluded from all public-facing API routes even when the model is in the public class:

```
Official:  postalCodes[], claimedByUserId, claimedAt
Poll:      campaignId (when visibility = public — not relevant to public)
PollResponse: userId, ipHash (individual records never returned)
```

---

## Class 3: Consent-Gated Bridge

**Definition:** Data that flows from Poll City Social into Poll City Admin's CRM, **only** when the user has explicitly consented to a specific purpose. This is the only authorized Social → Admin data channel.

**Who controls it:** The PUBLIC_USER who generated it. They can revoke at any time.

**How it's protected:**
1. Trigger: explicit user action only (button press, form submit, checkbox)
2. Scope: minimum fields for the stated purpose
3. Destination: specific campaign that the user consented to
4. Audit: always logged in ActivityLog with `action: "consent_bridge_transfer"`
5. Revocation: user can revoke via `/social/profile`

### Bridge Signal Types

| Signal type | What flows to Admin CRM | What is NOT transferred |
|---|---|---|
| Support signal | officialId, signalType (support/oppose/neutral), userId (hashed to contactId or new contact), postalCode | Full Social profile, email, phone |
| Volunteer opt-in | firstName (optional), phone (optional), postalCode, availability note, campaignId | Email (unless explicitly provided), full address |
| Sign request | address (self-provided), signType, campaignId | Full Social profile, email, other addresses |
| Contact permission | userId → linked to contactId, campaignId, permissionScope (call/email/text) | Any data not in scope |
| Update opt-in | userId → linked to contactId, campaignId, notificationType | Any data not in scope |

### CRM Record Created by Bridge

When a bridge signal creates or updates a Contact record, it sets:
- `source: "social_consent_bridge"`
- `consentedAt: [timestamp]`
- `consentScope: [what they agreed to]`
- Only the minimum fields above — no other contact fields are populated

The following fields are NEVER populated by the bridge:
```
supportLevel (set only by canvassers with real interaction data)
notes (internal only)
interactions (only created by campaign staff)
tags (internal only)
gotvStatus, followUpNeeded, captain, subCaptain (internal only)
```

### Audit Log Entry (always written)

```json
{
  "action": "consent_bridge_transfer",
  "entityType": "contact",
  "entityId": "[contactId created or updated]",
  "campaignId": "[campaignId]",
  "userId": "[campaignMemberId who processed it — system user for automatic]",
  "details": {
    "signalType": "volunteer_optin",
    "consentingUserId": "[Social userId]",
    "fieldsTransferred": ["firstName", "phone", "postalCode"],
    "consentScope": "volunteer_contact",
    "timestamp": "[ISO 8601]"
  }
}
```

---

## Data Class Summary Table

| Model / Feature | Class | Notes |
|---|---|---|
| Contact record | Campaign-private | All fields — never exposed outside campaign |
| Contact in Social user's profile | Does not exist | No contact record visible in Social |
| Official profile | Public | Selected fields only |
| Public poll | Public | Aggregate results only |
| Campaign_only poll | Campaign-private | Membership required to vote or view |
| Poll vote (authenticated) | Campaign-private (partially) | userId stored — not returned publicly |
| Poll vote (anonymous) | Pseudonymous | ipHash only — not personally identifiable |
| Support signal (before consent) | Public-safe | Aggregated — no individual identity |
| Support signal (after consent) | Consent-gated bridge | Minimal fields, logged, revocable |
| Volunteer signup via Social | Consent-gated bridge | User-initiated only |
| Sign request via Social | Consent-gated bridge | Address self-provided by user |
| GOTV data | Campaign-private | Sensitive — elections office data |
| Activity log | Campaign-private | Internal audit — no public access |
| Notification content | Campaign-private | User's own only |
