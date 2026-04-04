# Audit and Logging Specification

## What Gets Logged

Every action that creates, modifies, or deletes campaign data writes to `ActivityLog`. This is non-negotiable and applies to all three data classes.

### Mandatory Audit Events

| Action | entityType | action value | Who triggers |
|---|---|---|---|
| Contact created | contact | created | Campaign staff |
| Contact updated | contact | updated | Campaign staff |
| Contact deleted | contact | deleted | Campaign staff |
| Interaction logged | interaction | logged_interaction | Campaign staff |
| Task created | task | created | Campaign staff |
| Task completed | task | completed | Campaign staff |
| Canvass list created | canvassList | created | Manager |
| Volunteer assigned to list | canvassAssignment | assigned | Manager |
| GOTV list uploaded | gotvBatch | uploaded | Manager |
| Contacts struck from lists | contact | gotv_struck | System (on upload) |
| CSV import completed | campaign | import_completed | Manager |
| CSV export completed | campaign | export | Manager |
| Campaign created | campaign | created | Admin |
| Team member invited | membership | invited | Admin |
| Team member role changed | membership | role_changed | Admin |
| Team member removed | membership | removed | Admin |
| Poll created | poll | created | Manager |
| Consent bridge transfer | contact | consent_bridge_transfer | System (on bridge signal) |
| Custom field created | campaignField | created | Manager |
| Custom field deleted | campaignField | deleted | Admin |
| Sign request received | sign | requested | System or Volunteer |
| Sign installed | sign | installed | Volunteer |
| Sign removed | sign | removed | Volunteer |

### Consent Bridge — Special Logging Rule

Every consent bridge transfer MUST produce two log entries:
1. An `ActivityLog` entry (campaign-private) recording what data was transferred and from whom
2. A consent record (future ConsentLog model — not yet built) accessible by the user who consented for revocation purposes

Current implementation (Phase 1): ActivityLog only. ConsentLog is Phase 2.

---

## ActivityLog Schema

```typescript
model ActivityLog {
  id          String   @id @default(cuid())
  campaignId  String
  userId      String   // who performed the action
  action      String   // see action values above
  entityType  String   // what type of thing was affected
  entityId    String   // the ID of the thing
  details     Json?    // additional context
  createdAt   DateTime @default(now())
}
```

### details field structure

The `details` field is a JSON blob. Required fields by action type:

**contact updated:**
```json
{ "fields": ["firstName", "supportLevel"] }
```

**consent_bridge_transfer:**
```json
{
  "signalType": "volunteer_optin",
  "consentingUserId": "[Social userId]",
  "fieldsTransferred": ["firstName", "phone", "postalCode"],
  "consentScope": "volunteer_contact",
  "timestamp": "2026-04-01T12:00:00Z"
}
```

**import_completed:**
```json
{
  "sourceFile": "voters.csv",
  "imported": 247,
  "updated": 12,
  "skipped": 3,
  "errors": 1
}
```

**gotv_struck:**
```json
{
  "batchId": "[GotvBatch.id]",
  "struckCount": 47,
  "matchScore": 92
}
```

---

## Who Can See Logs

| Actor | Can see |
|---|---|
| SUPER_ADMIN | All campaigns' logs |
| ADMIN | Own campaign's logs only |
| CAMPAIGN_MANAGER | Own campaign's logs only |
| VOLUNTEER | Cannot see audit logs |
| PUBLIC_USER | Cannot see audit logs |
| ANONYMOUS | Cannot see audit logs |

A user can see their own consent records (when ConsentLog is built). They cannot see other users' consent records.

---

## What Is NEVER Logged

- Passwords or password hashes
- Session tokens or JWTs
- Raw IP addresses (only ipHash is stored, and only for polls)
- Credit card or payment data
- Any field that was not intentionally captured

---

## Retention Policy

Phase 1: No automated retention or deletion. All logs kept indefinitely.

Phase 2 requirements (before commercial rollout):
- Retain ActivityLog for minimum 7 years (legal requirement for political finance records in Canada)
- Implement campaign data deletion that includes ActivityLog purge after retention period
- Implement consent record retention matching the consent period

---

## Log Access UI

Phase 1: No UI. ActivityLog exists in database. ADMIN and MANAGER can query via db:studio or direct DB access.

Phase 2 (required before commercial rollout): ActivityLog viewer in Admin settings.

---

## System Events (not yet implemented — Phase 2)

Events that should eventually be logged at the platform level (not campaign level):

| Event | Priority |
|---|---|
| Failed login attempts | Phase 2 |
| Account lockout | Phase 2 |
| Campaign created | Phase 1 (in ActivityLog as "created") |
| Subscription change | Phase 3 |
| SUPER_ADMIN action on any campaign | Phase 2 |
| Database index health check | Phase 2 |
| Rate limit exceeded | Phase 2 |
