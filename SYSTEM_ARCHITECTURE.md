# Poll City — Communications + Social + Outreach Platform
## System Architecture

*Built 2026-04-10. Extends the existing Poll City monolith (Next.js 14 + Prisma + PostgreSQL on Railway).*
*Every decision binds to a CONTACT. Every action scopes to a CAMPAIGN.*

---

## 1. Architectural Position

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          POLL CITY MONOLITH                                 │
│                                                                             │
│  ┌─────────────┐  ┌──────────────────────────────────────────────────────┐ │
│  │  Campaign   │  │         COMMUNICATIONS PLATFORM                      │ │
│  │    CRM      │  │                                                      │ │
│  │  Contacts   │◄─►  Compose → Schedule → Send → Track → Respond → Learn │ │
│  │  Canvass    │  │                                                      │ │
│  │  GOTV       │  │  Email │ SMS │ Voice │ Push │ Social │ Inbox │ Auto  │ │
│  │  Events     │  │                                                      │ │
│  │  Donations  │  └──────────────────────────────────────────────────────┘ │
│  └─────────────┘                                                            │
│         │                          │                                        │
│         └──── ActivityLog ─────────┘                                        │
│               Contact.lastContactedAt                                       │
│               ConsentRecord                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────▼────┐         ┌─────▼──────┐      ┌─────▼──────┐
    │  Resend  │         │   Twilio   │      │ Social APIs │
    │  (Email) │         │ (SMS+Voice)│      │  FB/IG/X   │
    └──────────┘         └────────────┘      │  LI/TT/YT  │
                                             └────────────┘
```

---

## 2. Core Data Principles

### Everything Connects to a Contact
Every message send, every inbox reply, every automation action writes to:
- `contact.lastContactedAt` — recency signal used by canvassing + GOTV
- `ActivityLog` — audit trail tied to contact timeline
- `MessageDeliveryEvent` — per-recipient outcome (open, click, bounce, reply)
- `ConsentRecord` — CASL audit trail (explicit opt-in/opt-out)

### Every Query Scopes to a Campaign
No table is ever queried without `campaignId`. Zero exceptions.

### Soft Deletes Everywhere
Templates, automations, and scheduled messages have `deletedAt DateTime?`.
Never hard-delete. Filter `deletedAt: null` in all queries.

---

## 3. Module Map

| Module | Schema Models | API Namespace | UI Path | Status |
|--------|--------------|---------------|---------|--------|
| Email Blast | NewsletterCampaign, NotificationLog | /api/communications/email | /communications/email | ✓ BUILT |
| SMS Blast | NotificationLog | /api/communications/sms | /communications/sms | ✓ BUILT |
| Audience Sizing | Contact (filtered) | /api/communications/audience | /communications (compose) | ✓ BUILT |
| Social Manager | SocialAccount, SocialPost | /api/social | /communications/social | ⚠ PARTIAL (no publish) |
| Social Inbox | SocialMention | /api/social | /communications/inbox | ⚠ STUB |
| Voice Broadcast | VoiceBroadcast, VoiceBroadcastCall | /api/voice | (no UI page) | ⚠ PARTIAL |
| Newsletter | NewsletterSubscriber, NewsletterCampaign | /api/newsletters | (no comms tab) | ⚠ PARTIAL |
| Message Templates | **MessageTemplate** (NEW) | /api/comms/templates | /communications (templates tab) | ✗ NOT BUILT |
| Saved Segments | **SavedSegment** (NEW) | /api/comms/segments | /communications (audiences tab) | ✗ NOT BUILT |
| Scheduled Messages | **ScheduledMessage** (NEW) | /api/comms/scheduled | /communications (scheduled tab) | ✗ NOT BUILT |
| Automation Engine | **Automation + AutomationStep + AutomationEnrollment** (NEW) | /api/comms/automations | /communications (automations tab) | ✗ NOT BUILT |
| Unified Inbox | **InboxThread + InboxMessage** (NEW) | /api/comms/inbox | /communications/inbox | ✗ NOT BUILT |
| Delivery Tracking | **MessageDeliveryEvent** (NEW) | webhooks (inbound) | /communications (analytics tab) | ✗ NOT BUILT |
| Consent Management | **ConsentRecord** (NEW) | /api/comms/consent | /communications (settings tab) | ✗ NOT BUILT |
| Message Fatigue | **ContactMessageFrequency** (NEW) | (middleware) | n/a | ✗ NOT BUILT |
| Social Publisher | SocialPost + publish queue | /api/comms/social/publish | /communications/social | ✗ NOT BUILT |
| Analytics | MessageDeliveryEvent aggregations | /api/comms/analytics | /communications (analytics tab) | ✗ NOT BUILT |

---

## 4. Data Flow — Outbound Message

```
Campaign Manager → Compose UI
  → POST /api/comms/send
    → Resolve audience (SavedSegment or inline filters)
    → Check ConsentRecord (exclude unsubscribed, DNC, smsOptOut, emailBounced)
    → Check ContactMessageFrequency (fatigue guard: no more than N messages per contact per 7 days)
    → Create ScheduledMessage (status=queued) OR send immediately
    → For immediate sends:
        → Email: Resend API → track delivery via webhook → MessageDeliveryEvent
        → SMS: Twilio API → track delivery via webhook → MessageDeliveryEvent
        → Social: SocialPublishJob → platform API → update SocialPost.status
    → For each recipient:
        → contact.lastContactedAt = now()
        → ActivityLog entry
    → NotificationLog summary record
    → return { sent, failed, audienceSize }
```

## 5. Data Flow — Inbound Message (Unified Inbox)

```
Platform Webhook (Twilio SMS reply / Social DM / Social comment)
  → POST /api/webhooks/twilio | /api/webhooks/[platform]
    → Verify webhook signature
    → Look up Contact by phone/handle
    → Find or create InboxThread (campaignId + contactId + channel)
    → Append InboxMessage
    → Update InboxThread.lastMessageAt + unreadCount
    → If first reply → create ActivityLog entry on Contact
    → If automation trigger = "reply_received" → enroll in Automation
    → Push notification to assigned staff (via PushSubscription)
```

## 6. Data Flow — Automation Engine

```
Trigger fires (e.g., contact.supportLevel changed to "strong_support")
  → Query Automations WHERE campaignId + trigger.type = "support_level_change"
                         AND trigger.conditions.supportLevel = "strong_support"
  → For each matching Automation:
    → Check AutomationEnrollment (not already enrolled, not on cooldown)
    → Create AutomationEnrollment (status=active, currentStep=0)
  → Cron job every 5 minutes (vercel cron):
    → Find active enrollments WHERE nextRunAt <= now()
    → Execute current step (send email / send SMS / wait / update contact / create task)
    → Advance to next step OR complete/fail enrollment
    → Write ActivityLog on contact
```

## 7. Social Media Architecture

```
SocialAccount (campaign → platform → credentials, encrypted)
  │
  ├── SocialPost (draft → pending_approval → approved → scheduled → publishing → published/failed)
  │     └── SocialPublishJob (queued → in_progress → done/failed, with retry count)
  │
  └── SocialMention (ingested by polling or webhook)
        └── InboxThread (if needs response → routes to Unified Inbox)
```

### Platform OAuth Flow
1. Campaign manager hits `/settings/social-connect`
2. Redirect to platform OAuth
3. Platform returns token → POST `/api/comms/social/connect` → stored encrypted in `SocialAccount.accessTokenEnc`
4. Background sync (cron, 15min) ingests new mentions into `SocialMention`

### Publishing Queue
- `SocialPost.scheduledFor` set → cron picks up, creates `SocialPublishJob`
- Publisher calls platform API, updates `SocialPost.status` + `externalPostId`
- Failure → exponential backoff, max 3 retries, then `status=failed` with `failureReason`

---

## 8. Scheduled Message Queue

```
ScheduledMessage (campaignId, channel, audienceDefinition, sendAt, status=queued)
  │
  ↓ Cron: every 5 minutes
  → Find messages WHERE sendAt <= now() AND status = 'queued'
  → Lock row (status = 'processing')
  → Resolve audience (re-execute segment query at send time, not at schedule time)
  → Send via appropriate channel handler
  → status = 'sent' | 'failed'
  → Create NotificationLog summary
```

**Critical:** Audience is resolved at send time, not schedule time. A contact who opted out between scheduling and send time must be excluded.

---

## 9. CASL / Consent Architecture

```
ConsentRecord
  contactId | campaignId | channel | consentType | status | source | ip | userAgent | timestamp

consent.status:
  'explicit_opt_in'   ← form submission, checkbox, confirmed
  'soft_opt_in'       ← pre-existing relationship (canvass contact)
  'opted_out'         ← unsubscribe link, STOP reply, DNC flag
  'pending'           ← imported but not confirmed

Rules:
  Email → require explicit_opt_in OR soft_opt_in
  SMS   → require explicit_opt_in (CASL + CRTC)
  Push  → require explicit_opt_in (browser permission)
  Voice → require explicit_opt_in + CRTC call window check
  Social DMs → platform consent, no Poll City record needed
```

---

## 10. Analytics Data Model

Every MessageDeliveryEvent feeds into roll-up aggregations:

```
MessageDeliveryEvent
  messageId | contactId | campaignId | channel | eventType | timestamp | metadata

eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'unsubscribed' | 'complained'

Aggregations (computed on-read, cached 60s):
  open_rate = COUNT(opened) / COUNT(delivered)
  click_rate = COUNT(clicked) / COUNT(delivered)
  reply_rate = COUNT(replied) / COUNT(delivered)
  conversion_rate = COUNT(contacts who became supporter/donor after message) / COUNT(delivered)
```

Attribution window: 72 hours. If a contact changes support level within 72h of receiving a message, that message gets attribution credit.

---

## 11. Integration Map

| Integration | Used For | Credential Storage | Env Var |
|------------|----------|-------------------|---------|
| Resend | Transactional + bulk email | Server-side only | `RESEND_API_KEY` |
| Twilio | SMS blast, Voice broadcast, Phone bank, inbound SMS | Server-side only | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Facebook Graph API | Social posts, DMs, mentions | `SocialAccount.accessTokenEnc` (AES-256) | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| Instagram Graph API | Social posts, mentions | `SocialAccount.accessTokenEnc` | (via Facebook app) |
| X API v2 | Social posts, mentions, DMs | `SocialAccount.accessTokenEnc` | `X_CLIENT_ID`, `X_CLIENT_SECRET` |
| LinkedIn API | Social posts | `SocialAccount.accessTokenEnc` | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| TikTok API | Social posts | `SocialAccount.accessTokenEnc` | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` |

---

## 12. Security Model

All communications routes:
- `apiAuth(req)` — session validation first, before any DB call
- `guardCampaignRoute()` — membership + role check
- `campaignId` on every query — no cross-campaign data possible
- Rate limiting: `enforceLimit(req, "export", userId)` on all blast endpoints
- Sanitization: `sanitizeUserText()` on all message content before DB write
- Consent check: every outbound send queries `contact.doNotContact`, `smsOptOut`, `emailBounced`

Webhook endpoints (inbound):
- Twilio: HMAC-SHA1 signature validation (`X-Twilio-Signature`)
- Social platforms: per-platform signature (Facebook: `X-Hub-Signature-256`, etc.)
- No session required (webhook caller is external system)
- Rate limit by IP + webhook secret

---

## 13. Connection Points to Existing Systems

| Comms Action | Downstream Effect | Model |
|-------------|------------------|-------|
| Email/SMS sent to contact | contact.lastContactedAt = now() | Contact |
| Email/SMS sent to contact | ActivityLog entry | ActivityLog |
| Unsubscribe link clicked | contact.doNotContact = true | Contact |
| SMS STOP reply | contact.smsOptOut = true | Contact |
| Email bounce | contact.emailBounced = true | Contact |
| Automation: "volunteer signup" trigger | create VolunteerProfile | VolunteerProfile |
| Automation: "event RSVP" action | create EventRsvp | EventRsvp |
| Social post published | SocialPost.status = published | SocialPost |
| Social mention ingested | routes to InboxThread | InboxThread |
| Inbox reply sent | contact.lastContactedAt = now() | Contact |
| Automation enroll/advance | ActivityLog on contact | ActivityLog |
| Message delivered to donor contact | ConversionAttribution check (72h window) | MessageDeliveryEvent |

---

*This document is the architectural truth for the Communications Platform.*
*Every API route, schema model, and UI component must conform to it.*
*George reads the diff. Update this when the architecture changes.*

---

# CRM + CONTACT INTELLIGENCE SUITE — 2026-04-10

## Architectural Position

The CRM suite is the person intelligence nervous system of Poll City.
It wraps the existing Contact model with rich metadata layers:
- ContactNote: visibility-controlled notes (all_members | managers_only | admin_only)
- ContactRelationship: directed graph of person connections
- ContactRoleProfile: one contact holds many roles (voter + donor + volunteer)
- SupportProfile: composite scoring layer (0-100 scores, flag set)
- DuplicateCandidate: dedupe queue for identity resolution
- MergeHistory: immutable audit trail for every merge
- ContactAuditLog: field-level audit log for every CRM write

## Data Flow

Canvass → Contact.supportLevel → SupportProfile.supportScore recalculates
Donation → Contact.funnelStage → ContactRoleProfile.donor role activated
Event RSVP → ContactRoleProfile.event_attendee activated
Import → DuplicateCandidate rows created where confidence ≥ 60
Merge → MergeHistory created, absorbed contact deletedAt set, all relations re-pointed

## API Namespace

All new CRM routes live under /api/crm/:
- /api/crm/contacts/[id]/notes (GET, POST, DELETE)
- /api/crm/contacts/[id]/relationships (GET, POST, DELETE)
- /api/crm/contacts/[id]/roles (GET, POST, PATCH)
- /api/crm/contacts/[id]/support-profile (GET, PATCH)
- /api/crm/contacts/[id]/audit (GET)
- /api/crm/duplicates (GET, POST decision)
- /api/crm/merge (POST)
- /api/crm/segments (GET, POST, PUT, DELETE)

## Security

Every /api/crm/ route: apiAuth() → membership check → campaignId scope.
Merge requires membership.role === "ADMIN" || session.user.role === "SUPER_ADMIN".
ContactNote visibility enforced at query time based on role.
Admin-only notes never returned to VOLUNTEER or VOLUNTEER_LEADER.

## Connection Points

Every CRM write fires:
- ContactAuditLog entry
- ActivityLog entry (for timeline visibility)
- Contact.updatedAt touch

Merge fires:
- MergeHistory entry
- All Interaction, Task, Donation, Sign, EventRsvp re-pointed to survivor
- Absorbed contact soft-deleted (deletedAt set)
- DuplicateCandidate.decision = "merged"
