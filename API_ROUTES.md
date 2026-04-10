# Poll City — Communications Platform API Routes

*All routes under `/api/comms/` (new namespace, clean separation from existing `/api/communications/`).*
*Every route: `apiAuth(req)` first, then `guardCampaignRoute()`, then logic.*
*Every query: `campaignId` scoped. Every response: no raw errors to client.*

---

## Existing Routes (do not duplicate)

| Route | Method | What it does |
|-------|--------|-------------|
| `/api/communications/email` | POST | Bulk email blast via Resend |
| `/api/communications/sms` | POST | Bulk SMS blast via Twilio |
| `/api/communications/audience` | POST | Count + sample audience |
| `/api/newsletters/campaigns` | GET/POST | Newsletter campaigns CRUD |
| `/api/newsletters/subscribers` | GET/POST | Subscriber management |
| `/api/voice/*` | GET/POST | Voice broadcast management |
| `/api/social/*` | GET/POST | Social account/post management |

---

## New Routes — Phase 1: Templates

### `GET /api/comms/templates`
**Query params:** `campaignId`, `channel` (optional), `page`, `limit`
**Returns:** Paginated list of `MessageTemplate` records for the campaign.
**Auth:** Any campaign member.

### `POST /api/comms/templates`
**Body:**
```json
{
  "campaignId": "string",
  "channel": "email|sms|push",
  "name": "string",
  "subject": "string (email only)",
  "bodyHtml": "string (email only)",
  "bodyText": "string",
  "previewText": "string (email only)"
}
```
**Returns:** Created `MessageTemplate`.
**Auth:** ADMIN, CAMPAIGN_MANAGER.
**Validation:** Zod. `bodyText` max 1000 for SMS. `bodyHtml` max 100,000 for email.

### `GET /api/comms/templates/[templateId]`
**Returns:** Single template with `campaignId` scope check.
**Auth:** Any campaign member.

### `PUT /api/comms/templates/[templateId]`
**Body:** Partial template fields (same as POST).
**Returns:** Updated template.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `DELETE /api/comms/templates/[templateId]`
**Action:** Soft delete (`deletedAt = now()`).
**Returns:** `{ success: true }`.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

---

## New Routes — Phase 2: Segments

### `GET /api/comms/segments`
**Query params:** `campaignId`, `includeCount` (boolean — triggers live count)
**Returns:** List of `SavedSegment` records with optional live counts.
**Auth:** Any campaign member.

### `POST /api/comms/segments`
**Body:**
```json
{
  "campaignId": "string",
  "name": "string",
  "description": "string",
  "filterDefinition": {
    "supportLevels": ["strong_support", "leaning_support"],
    "wards": ["Ward 5"],
    "tagIds": ["tag_abc"],
    "funnelStages": ["supporter", "volunteer"],
    "excludeDnc": true,
    "volunteerOnly": false,
    "donorOnly": false,
    "lastContactedBefore": "2026-01-01T00:00:00Z",
    "hasEmail": true,
    "hasPhone": false,
    "postalCodes": ["M5V"]
  },
  "isDynamic": true
}
```
**Returns:** Created `SavedSegment` with `lastCount`.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `PUT /api/comms/segments/[segmentId]`
**Body:** Partial segment fields.
**Returns:** Updated segment.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `DELETE /api/comms/segments/[segmentId]`
**Action:** Soft delete.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `POST /api/comms/segments/[segmentId]/count`
**Action:** Re-run segment query, update `lastCount + lastCountedAt`.
**Returns:** `{ count: number, sample: Contact[5] }`.
**Auth:** Any campaign member.

---

## New Routes — Phase 3: Scheduled Messages

### `GET /api/comms/scheduled`
**Query params:** `campaignId`, `status` (optional), `channel` (optional)
**Returns:** Paginated list of `ScheduledMessage` records.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `POST /api/comms/scheduled`
**Body:**
```json
{
  "campaignId": "string",
  "channel": "email|sms",
  "templateId": "string (optional)",
  "segmentId": "string (optional)",
  "filterOverride": { ...filterDefinition },
  "subject": "string (email)",
  "bodyHtml": "string (email)",
  "bodyText": "string",
  "sendAt": "2026-10-20T09:00:00Z",
  "timezone": "America/Toronto"
}
```
**Validation:** `sendAt` must be > now(). Either `segmentId` or `filterOverride` required.
**Returns:** Created `ScheduledMessage`.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `PUT /api/comms/scheduled/[messageId]`
**Constraint:** Can only update if `status = 'queued'`.
**Returns:** Updated message OR `409` if already processing/sent.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `DELETE /api/comms/scheduled/[messageId]`
**Action:** Sets `status = 'cancelled'` if queued. 409 if already sent.
**Returns:** `{ success: true }`.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

---

## New Routes — Phase 4: Analytics

### `GET /api/comms/analytics`
**Query params:** `campaignId`, `channel` (optional), `startDate`, `endDate`
**Returns:**
```json
{
  "summary": {
    "totalSent": 4200,
    "totalDelivered": 4150,
    "totalOpened": 1890,
    "totalClicked": 340,
    "totalReplied": 67,
    "totalBounced": 50,
    "totalUnsubscribed": 12,
    "openRate": 0.455,
    "clickRate": 0.082,
    "replyRate": 0.016,
    "unsubscribeRate": 0.003
  },
  "byChannel": { "email": {...}, "sms": {...} },
  "byDate": [{ "date": "2026-10-01", "sent": 200, "opened": 95, ... }],
  "topMessages": [{ "id": "...", "subject": "...", "openRate": 0.61 }],
  "attribution": {
    "messagesWithConversion": 43,
    "estimatedSupportersConverted": 38
  }
}
```
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `GET /api/comms/analytics/[messageId]`
**Returns:** Detailed stats for a single newsletter_campaign or scheduled_message.
**Includes:** Delivery funnel, top clicked links, geographic breakdown by ward.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

---

## New Routes — Phase 5: Unified Inbox

### `GET /api/comms/inbox`
**Query params:** `campaignId`, `status` (open|assigned|resolved|archived), `channel`, `assignedToId`, `page`
**Returns:** Paginated `InboxThread` list with last message preview, unread counts, contact summary.
**Auth:** Any campaign member.

### `GET /api/comms/inbox/[threadId]`
**Returns:** Thread metadata + full `InboxMessage` history.
**Side effect:** Marks all messages as `isRead = true`, decrements `unreadCount`.
**Auth:** Any campaign member.

### `POST /api/comms/inbox/[threadId]/reply`
**Body:**
```json
{
  "body": "string",
  "templateId": "string (optional)"
}
```
**Action:** Send reply via thread's channel (Twilio for SMS, Resend for email, platform API for social).
**Side effects:** Creates `InboxMessage` (direction=outbound), updates `contact.lastContactedAt`, creates `ActivityLog`.
**Returns:** Created `InboxMessage`.
**Auth:** Any campaign member.

### `PATCH /api/comms/inbox/[threadId]`
**Body:** `{ status?, assignedToId?, tags?, isPriority? }`
**Returns:** Updated thread.
**Auth:** Any campaign member.

### `GET /api/comms/inbox/stats`
**Query params:** `campaignId`
**Returns:** `{ open: 14, assigned: 3, unread: 7, bySelf: 2 }`
**Auth:** Any campaign member.

---

## New Routes — Phase 6: Automation Engine

### `GET /api/comms/automations`
**Query params:** `campaignId`, `isActive` (boolean), `triggerType`
**Returns:** Automation list with enrollment counts.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `POST /api/comms/automations`
**Body:**
```json
{
  "campaignId": "string",
  "name": "string",
  "description": "string",
  "triggerType": "support_level_changed",
  "triggerConditions": { "supportLevel": "strong_support" },
  "allowReEnrollment": false,
  "enrollmentCooldownDays": 30,
  "steps": [
    { "stepOrder": 0, "stepType": "send_email", "config": { "templateId": "tmpl_abc" }, "nextStepOrder": 1 },
    { "stepOrder": 1, "stepType": "wait_duration", "config": { "days": 3 }, "nextStepOrder": 2 },
    { "stepOrder": 2, "stepType": "send_sms", "config": { "body": "Hi {{firstName}}..." }, "nextStepOrder": null }
  ]
}
```
**Returns:** Created automation with steps.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `PUT /api/comms/automations/[automationId]`
**Constraint:** Cannot edit if `isActive = true`. Must deactivate first.
**Returns:** Updated automation.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `PATCH /api/comms/automations/[automationId]/activate`
**Action:** Sets `isActive = true`. Validates all steps have valid config before activating.
**Returns:** `{ success: true, validationErrors: [] }`.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `PATCH /api/comms/automations/[automationId]/deactivate`
**Action:** Sets `isActive = false`. Active enrollments continue until complete.
**Returns:** `{ success: true, activeEnrollments: number }`.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `DELETE /api/comms/automations/[automationId]`
**Action:** Soft delete. Cancels active enrollments.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `GET /api/comms/automations/[automationId]/enrollments`
**Query params:** `status`, `page`
**Returns:** Enrollment list with contact summaries and current step.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `DELETE /api/comms/automations/[automationId]/enrollments/[enrollmentId]`
**Action:** Cancel single enrollment. Creates ActivityLog entry on contact.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

---

## New Routes — Phase 7: Social Publishing

### `POST /api/comms/social/publish`
**Body:**
```json
{
  "campaignId": "string",
  "socialAccountIds": ["acct_abc", "acct_def"],
  "content": "string",
  "mediaUrls": ["https://..."],
  "linkUrl": "string (optional)",
  "hashtags": ["#ward5", "#Toronto"],
  "scheduledFor": "2026-10-15T10:00:00Z (null = immediate)"
}
```
**Action:** Creates `SocialPost` + one `SocialPublishJob` per account.
**Returns:** `{ socialPostId, jobs: [{ id, platform, status }] }`.
**Auth:** ADMIN, CAMPAIGN_MANAGER.
**Validation:** Content length checked per platform (X: 280, LinkedIn: 3000, FB: 63,206).

### `POST /api/comms/social/posts/[postId]/approve`
**Action:** Sets `SocialPost.status = approved`, triggers publishing jobs.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `POST /api/comms/social/posts/[postId]/reject`
**Body:** `{ reason: "string" }`
**Action:** Sets `SocialPost.status = rejected`.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `GET /api/comms/social/posts`
**Query params:** `campaignId`, `status`, `platform`, `page`
**Returns:** Paginated social posts with job status.
**Auth:** Any campaign member.

### `GET /api/comms/social/metrics`
**Query params:** `campaignId`, `platform`, `startDate`, `endDate`
**Returns:** Aggregate reach, impressions, engagement by platform + date.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

---

## New Routes — Phase 8: Consent Management

### `GET /api/comms/consent`
**Query params:** `campaignId`, `contactId` (optional), `channel`, `status`
**Returns:** Consent records. If `contactId` provided, current status per channel.
**Auth:** ADMIN, CAMPAIGN_MANAGER.

### `POST /api/comms/consent`
**Body:**
```json
{
  "campaignId": "string",
  "contactId": "string",
  "channel": "email|sms|voice|push",
  "status": "explicit_opt_in|opted_out",
  "source": "manual|import|form_submission",
  "consentText": "string (what user agreed to)",
  "ipAddress": "string"
}
```
**Returns:** Created `ConsentRecord`.
**Auth:** ADMIN, CAMPAIGN_MANAGER (for manual). Public for form submissions.

### `GET /api/comms/consent/audit`
**Query params:** `campaignId`, `startDate`, `endDate`
**Returns:** Audit export of all consent events (for CASL compliance documentation).
**Auth:** ADMIN only.

---

## Webhook Routes (Inbound — no session required)

### `POST /api/webhooks/resend`
**Payload:** Resend delivery event (delivered, opened, clicked, bounced, complained, unsubscribed)
**Validation:** `svix-signature` header verification
**Action:** Create `MessageDeliveryEvent`. On bounce: `contact.emailBounced = true`. On unsubscribe: `contact.doNotContact = true` + new `ConsentRecord`.
**Returns:** `200 OK` always (Resend expects 200 to stop retrying).

### `POST /api/webhooks/twilio`
**Payload:** Twilio status callback or inbound SMS
**Validation:** `X-Twilio-Signature` HMAC-SHA1
**Action (status):** Update `VoiceBroadcastCall` or create `MessageDeliveryEvent`.
**Action (inbound SMS):** Find/create `InboxThread`, create `InboxMessage`, notify assigned staff.
**On STOP keyword:** `contact.smsOptOut = true` + `ConsentRecord(status=opted_out)`.

### `POST /api/webhooks/facebook`
**Payload:** Facebook Webhooks (messages, mentions, comments)
**Validation:** `X-Hub-Signature-256`
**Action:** Create/update `SocialMention` or `InboxMessage`.

### `POST /api/webhooks/instagram`
**Payload:** Instagram Webhooks (mentions, comments, DMs)
**Validation:** `X-Hub-Signature-256` (same Facebook app)
**Action:** Same as Facebook handler.

---

## Cron Routes (Vercel Cron)

### `GET /api/cron/send-scheduled`
**Schedule:** `*/5 * * * *` (every 5 minutes)
**Action:** Pick up queued `ScheduledMessage` records where `sendAt <= now()`, send, update status.
**Security:** `Authorization: Bearer ${CRON_SECRET}` header check.

### `GET /api/cron/automation-runner`
**Schedule:** `*/5 * * * *` (every 5 minutes)
**Action:** Pick up `AutomationEnrollment` records where `nextRunAt <= now() AND status IN (active, waiting)`. Execute next step. Advance enrollment.
**Security:** Same CRON_SECRET check.

### `GET /api/cron/social-sync`
**Schedule:** `*/15 * * * *` (every 15 minutes)
**Action:** Refresh SocialAccount tokens if expiring within 24h. Ingest new mentions from connected platforms. Update `SocialPublishJob` metrics.
**Security:** Same CRON_SECRET check.

### `GET /api/cron/delivery-attribution`
**Schedule:** `0 */1 * * *` (every hour)
**Action:** Find `MessageDeliveryEvent` records from last 72h. Check if corresponding contact changed support level or made donation after message. Set `attributed_to_conversion = true`.
**Security:** Same CRON_SECRET check.

---

## Route Security Summary

| Route type | Auth method | Scope check |
|-----------|-------------|-------------|
| All `/api/comms/*` | `apiAuth(req)` | `guardCampaignRoute(campaignId, userId, minRole)` |
| Webhook routes | Signature verification (HMAC) | Campaign looked up via webhook secret |
| Cron routes | `CRON_SECRET` bearer token | Internal only, not user-accessible |
| Public consent (form) | None | Rate limited by `enforceLimit(req, "form")` |

---

## Error Response Standard

All errors use `src/lib/api/errors.ts`. Never return raw error objects.

```json
{ "error": "Human-readable message", "code": "MACHINE_CODE", "details": {} }
```

Common codes:
- `UNAUTHORIZED` — no valid session
- `FORBIDDEN` — valid session, insufficient role
- `NOT_FOUND` — resource doesn't exist in this campaign
- `CONFLICT` — e.g., scheduled message already sent
- `VALIDATION_FAILED` — Zod parse error
- `RATE_LIMITED` — too many requests
- `NO_RECIPIENTS` — audience filter returns 0 contacts
- `INTEGRATION_UNAVAILABLE` — Twilio/Resend/platform not configured

---

# FINANCE SUITE API ROUTES — 2026-04-10

All finance routes require `apiAuth(req)` + campaign membership.
All money values use `Decimal` (12,2). Never Float.

## /api/finance/budgets — Budget management
- GET ?campaignId — list campaign budgets
- POST — create budget { campaignId, name, totalBudget, currency, startDate, endDate }
- GET /[id] — budget with lines summary
- PATCH /[id] — update status/dates
- GET /[id]/forecast — pacing + overage

## /api/finance/budget-lines — Budget line hierarchy
- GET ?budgetId — list lines
- POST — create line { campaignBudgetId, campaignId, name, category, plannedAmount }
- PATCH /[id] — update line
- POST /[id]/transfer — move amount to another line

## /api/finance/expenses — Expense capture
- GET ?campaignId&status&from&to&budgetLineId — filtered list
- POST — create expense { campaignId, budgetLineId, amount, expenseDate, description }
- PATCH /[id] — update draft expense
- POST /[id]/submit — submit for approval
- POST /[id]/approve — approve (manager+)
- POST /[id]/reject — reject with reason
- DELETE /[id] — soft delete

## /api/finance/vendors — Vendor registry
- GET ?campaignId — list vendors
- POST — create vendor
- GET /[id] — vendor + spend summary
- PATCH /[id] — update vendor
- DELETE /[id] — soft delete

## /api/finance/purchase-requests — Pre-spend approval
- GET ?campaignId&status — list PRs
- POST — create PR
- POST /[id]/submit — submit
- POST /[id]/approve — approve
- POST /[id]/reject — reject

## /api/finance/purchase-orders — Formal POs
- GET ?campaignId — list POs
- POST — create PO
- PATCH /[id] — update

## /api/finance/vendor-bills — Invoice tracking
- GET ?campaignId&status — list bills
- POST — record bill
- POST /[id]/mark-paid — mark paid

## /api/finance/reimbursements — Reimbursements
- GET ?campaignId — list (own for members, all for managers)
- POST — create
- POST /[id]/submit — submit
- POST /[id]/approve — approve
- POST /[id]/reject — reject
- POST /[id]/mark-paid — mark paid

## /api/finance/approvals/queue — Unified approval queue
- GET ?campaignId — all pending approvals

## /api/finance/reports/overview — Finance dashboard
- GET ?campaignId — planned/committed/actual/remaining

## /api/finance/import/expenses — CSV import
## /api/finance/export/expenses — CSV export
## /api/finance/audit — Audit log viewer

---

# CRM + CONTACT INTELLIGENCE API ROUTES — 2026-04-10

All routes under /api/crm/. Auth: apiAuth() + membership check. Scope: campaignId always.

## Notes

### GET /api/crm/contacts/[id]/notes
Query: campaignId
Returns: all notes visible to the caller's role (visibility filter applied server-side)
Auth: Any campaign member

### POST /api/crm/contacts/[id]/notes
Body: { campaignId, body, noteType?, visibility?, isPinned? }
Returns: created ContactNote
Auth: Any campaign member (admin-only notes require ADMIN role)
Validation: Zod. body max 5000 chars.

### DELETE /api/crm/contacts/[id]/notes/[noteId]
Auth: Own notes (any role) or any note (ADMIN/CM only)
Soft-delete not applicable — notes are hard-deleted (content privacy)

## Relationships

### GET /api/crm/contacts/[id]/relationships
Query: campaignId
Returns: { outgoing: ContactRelationship[], incoming: ContactRelationship[] }
Auth: CAMPAIGN_MANAGER and above

### POST /api/crm/contacts/[id]/relationships
Body: { campaignId, toContactId, relationshipType, strength?, notes?, source? }
Returns: created ContactRelationship + mirror relationship created automatically
Auth: CAMPAIGN_MANAGER and above
Note: Creates bidirectional edges (A→B and B→A with inverse relationship type)

### DELETE /api/crm/contacts/[id]/relationships/[relId]
Auth: CAMPAIGN_MANAGER and above
Note: Deletes both directions

## Role Profiles

### GET /api/crm/contacts/[id]/roles
Query: campaignId
Returns: ContactRoleProfile[] for this contact
Auth: Any campaign member

### POST /api/crm/contacts/[id]/roles
Body: { campaignId, roleType, roleStatus?, metadataJson? }
Returns: created ContactRoleProfile
Auth: CAMPAIGN_MANAGER and above

### PATCH /api/crm/contacts/[id]/roles/[roleId]
Body: { roleStatus?, metadataJson? }
Returns: updated ContactRoleProfile
Auth: CAMPAIGN_MANAGER and above

## Support Profile

### GET /api/crm/contacts/[id]/support-profile
Query: campaignId
Returns: SupportProfile (upsert on first call — creates blank profile if none exists)
Auth: CAMPAIGN_MANAGER and above

### PATCH /api/crm/contacts/[id]/support-profile
Body: { supportScore?, turnoutLikelihood?, persuasionPriority?, volunteerPotential?, donorPotential?, issueAffinityJson?, flagHighValue?, flagHighPriority?, flagHostile?, flagNeedsFollowUp?, flagComplianceReview?, notes? }
Returns: updated SupportProfile
Auth: CAMPAIGN_MANAGER and above
Side effect: ContactAuditLog entry written

## Audit Log

### GET /api/crm/contacts/[id]/audit
Query: campaignId, page?, limit?
Returns: ContactAuditLog[] paginated, newest first
Auth: CAMPAIGN_MANAGER and above

## Duplicates

### GET /api/crm/duplicates
Query: campaignId, decision? (pending|merged|not_duplicate|deferred), page?, limit?
Returns: DuplicateCandidate[] with contactA and contactB includes
Auth: CAMPAIGN_MANAGER and above

### POST /api/crm/duplicates/[dupeId]/decide
Body: { campaignId, decision: "not_duplicate"|"deferred", notes? }
Returns: updated DuplicateCandidate
Auth: CAMPAIGN_MANAGER and above

## Merge

### POST /api/crm/merge
Body: { campaignId, survivorId, absorbedId, fieldDecisions: { [field]: "survivor"|"absorbed" } }
Returns: { survivor: Contact, mergeHistoryId: string }
Auth: ADMIN and above (CAMPAIGN_MANAGER cannot merge)
Side effects:
  - All Interaction, Task, Donation, Sign, EventRsvp, GotvRecord re-pointed to survivor
  - Absorbed contact soft-deleted (deletedAt = now)
  - MergeHistory created
  - DuplicateCandidate(s) for this pair updated to decision=merged, survivorId set
  - ContactAuditLog entry written
  - ActivityLog entry written
