# Poll City — Communications Platform Edge Cases

*Every edge case has: scenario, risk, resolution, affected component.*
*These are not hypotheticals. Each one has burned a real campaign somewhere.*

---

## SECTION 1: SENDING EDGE CASES

### E-001: Duplicate Send
**Scenario:** Campaign manager clicks "Send" twice quickly. Two requests hit `/api/communications/email` before the first completes.
**Risk:** 2,000 contacts receive the same email twice. CASL violation. PR nightmare.
**Resolution:** Idempotency key. On compose, generate a `sendKey = uuid()` client-side. API checks `NotificationLog` for existing `sendKey` within last 5 minutes — if found, return 409. UI disables send button on first click until response received.
**Component:** `/api/communications/email`, `/api/communications/sms`, `/api/comms/scheduled` cron runner.

### E-002: Scheduled Message Processed Twice
**Scenario:** Vercel cron fires twice for the same 5-minute window (cold start, duplicate execution).
**Risk:** Same scheduled message sent twice to entire audience.
**Resolution:** Before sending, UPDATE `scheduled_messages SET status='processing' WHERE id=? AND status='queued'` — use atomic compare-and-set. Only proceed if exactly 1 row updated. If 0 rows updated, another worker grabbed it.
**Component:** `/api/cron/send-scheduled`

### E-003: Contact Unsubscribed Between Scheduling and Sending
**Scenario:** Contact clicks unsubscribe on Oct 13. Email was scheduled on Oct 12 for Oct 14. Contact gets the email anyway.
**Risk:** CASL violation. Unsubscribed contact receives message.
**Resolution:** Audience MUST be re-resolved at send time, not at schedule time. `ScheduledMessage.filterOverride` is re-executed fresh against `contacts` table at send moment. `doNotContact = false` filter always applied regardless of original audience definition.
**Component:** `/api/cron/send-scheduled`

### E-004: Contact Added to DNC During Send Loop
**Scenario:** Bulk send iterating 5,000 contacts. Contact #3,000 replies STOP to a previous SMS while this loop is running.
**Risk:** Contact #3,000 still gets the email/SMS being sent in this loop.
**Resolution:** Acceptable. The DNC state is snapshotted at loop start. The next send to this contact will be blocked. Do NOT re-query inside the loop (too slow). Log DNC updates as they arrive and apply on next send.
**Note:** Document this limitation in the compliance audit log.

### E-005: Zero Recipients After Filter Applied
**Scenario:** Campaign manager builds audience "Ward 5 Strong Supporters with email" — audience count shows 14. Between count and send, 14 contacts are deleted or marked DNC.
**Risk:** Silent success (API sends 0 emails, returns `{ sent: 0 }`). Manager thinks 14 emails went out.
**Resolution:** Return `400` with `code: "NO_RECIPIENTS"` if resolved audience = 0. Do NOT silently succeed. UI shows: "No contacts match this audience. Filters may have changed since you last checked."
**Component:** All send endpoints.

### E-006: Audience Too Large for Single Serverless Request
**Scenario:** Campaign has 50,000 contacts. Email blast iterates all 50,000 in one serverless function.
**Risk:** Vercel timeout at 300 seconds. Function fails mid-send. Unknown how many actually received email.
**Resolution:** Batch sends > 10,000 recipients into `ScheduledMessage` chunks. Each chunk = 5,000 recipients max. Queue all chunks, cron processes sequentially. Track sent/failed per chunk in `NotificationLog.audience = { chunk: 1, totalChunks: 10 }`.
**Current limit:** Email API enforces `take: 5000`. Fine for current scale. Add chunking at 10,000 contacts.

### E-007: Resend API Key Not Configured
**Scenario:** New campaign. `RESEND_API_KEY` env var not set. Campaign manager sends blast.
**Risk:** Silent no-op. API logs "would send" but returns `{ sent: 0 }`. Manager is confused.
**Resolution:** Return `400` with `code: "INTEGRATION_UNAVAILABLE"`, `message: "Email sending is not configured for this environment."` — currently implemented as a console.log + continue. Fix to return 400 with explanation.
**Component:** `/api/communications/email`

### E-008: Twilio Number Not Configured
**Same as E-007 for SMS.** Return `400` not silent success.
**Component:** `/api/communications/sms`

---

## SECTION 2: CONTACT DATA EDGE CASES

### E-009: Invalid Phone Number Format
**Scenario:** Contact has phone `"416 555"` (incomplete). SMS blast includes them.
**Risk:** Twilio rejects the call. Logged as failed. But repeated failures add up — campaign's Twilio account may get flagged.
**Resolution:** At contact creation/import: normalize phone numbers with libphonenumber or similar. Store E.164 format (`+14165551234`). Reject invalid numbers at import time. Mark `contact.phoneInvalid = true` on first Twilio rejection.
**Component:** Contact import, `/api/communications/sms`

### E-010: Invalid Email Address
**Scenario:** Contact has email `"jane@"` or `"jane.smith"`.
**Risk:** Resend rejects. Adds to bounce count. May affect sender reputation.
**Resolution:** Validate email format at import with regex. Flag `contact.emailInvalid = true` on first hard bounce. Exclude `emailInvalid = true` contacts from future sends automatically.
**Component:** Contact import, `/api/communications/email`, Resend webhook handler.

### E-011: Deceased Contact Receives Message
**Scenario:** Contact marked `isDeceased = true` but family member reports receiving a campaign SMS.
**Risk:** Deeply offensive. Family complaints. Media story.
**Resolution:** `isDeceased: true` contacts MUST be excluded at the WHERE clause level in all send queries. Currently implemented. Verify this never gets removed in refactors.
**Component:** All audience queries. Add integration test: `isDeceased = true` contact never appears in send query results.

### E-012: Duplicate Phone Number (Two Contacts)
**Scenario:** `555-1234` belongs to both "John Smith" and "Jane Smith" (data entry error).
**Risk:** Contact gets two SMS messages in same blast. Confusing (personalized to two different names).
**Resolution:** Phone number deduplication at audience build time: `SELECT DISTINCT phone FROM contacts WHERE ...`. Use the first match by `lastContactedAt DESC`. Flag duplicates in import UI for manual resolution.
**Component:** `/api/comms/segments`, all send endpoints.

### E-013: Contact with Same Email as Unsubscribed Contact
**Scenario:** Contact A unsubscribes. Later, Contact B (different record, same email `jane@email.com`) is imported. Contact B receives email blast.
**Risk:** "Jane" gets email after unsubscribing.
**Resolution:** `ConsentRecord` lookups check by `email` field, not just `contactId`. At send time, cross-reference email against `consent_records WHERE email=? AND channel='email' AND status='opted_out'` — exclude regardless of which contactId.
**Component:** Email send logic.

---

## SECTION 3: INBOX + REPLY EDGE CASES

### E-014: Multiple Staff Reply to Same Thread Simultaneously
**Scenario:** Two campaign managers both see an unread inbox thread and both start typing replies. Both hit send.
**Risk:** Voter receives two replies within seconds. Looks disorganized.
**Resolution:** Show typing indicator when another user is composing in the thread (WebSocket or optimistic lock). On send: check `inbox_messages WHERE thread_id=? AND direction='outbound' AND created_at > now()-30s` — if exists, warn: "A reply was just sent by [name]. Send anyway?"
**Component:** `inbox-thread.tsx`, `/api/comms/inbox/[threadId]/reply`

### E-015: Inbox Thread Flood (Election Day)
**Scenario:** Campaign sends election day SMS to 2,000 contacts at 8am. 400 people reply "Thank you!" All 400 create new inbox threads simultaneously.
**Risk:** Inbox UI freezes. Staff overwhelmed. Real messages from people needing help get buried.
**Resolution:** Inbox should support "bulk resolve" — select multiple threads with same keyword/pattern → resolve all. Add "low priority" auto-tag for common replies ("thanks", "will do", "👍"). Sort by priority first. Cap `/api/comms/inbox` page size at 25.
**Component:** Inbox UI, `/api/comms/inbox`

### E-016: Reply to Non-Existent or Expired Thread
**Scenario:** Campaign sends SMS. Contact replies 6 months later. `ScheduledMessage` record was cleaned up (or message is too old to match).
**Risk:** Reply arrives at Twilio webhook. Cannot match to campaign/contact. Gets dropped silently.
**Resolution:** Match on `contact.phone` first. If thread > 90 days old, create new thread. Never drop inbound messages. If no campaign match, log to error monitoring with phone (redacted after first 4 digits).
**Component:** `/api/webhooks/twilio`

### E-017: Social DM from Unlinked Account
**Scenario:** Facebook DM arrives from someone who is not in the contacts database.
**Risk:** Message dropped or linked to wrong contact.
**Resolution:** Create a stub contact on first DM receipt. `firstName = "Facebook User"`, `lastName = "@handle"`, tag `"inbox-origin"`. Campaign manager can merge/update later. Never drop a message because the sender isn't in the CRM.
**Component:** Facebook/Instagram webhook handler.

---

## SECTION 4: SOCIAL MEDIA EDGE CASES

### E-018: Social API Token Expired Mid-Schedule
**Scenario:** Campaign manager schedules 10 posts for next month. Facebook token expires in 2 weeks. Posts 7-10 fail silently.
**Risk:** Content doesn't get published. Campaign notices too late.
**Resolution:** Cron job checks token expiry daily. Alert campaign manager if any token expires within 7 days: push notification + inbox alert. Mark `SocialAccount.status = 'token_expiring'`. Block new scheduling against expiring accounts until renewed.
**Component:** `/api/cron/social-sync`, `SocialAccount` model.

### E-019: Platform API Rate Limit Hit During Publishing
**Scenario:** Campaign tries to publish 5 posts in 1 minute to Instagram. Instagram rate limits after post #2.
**Risk:** Posts 3-5 fail. `SocialPublishJob.status = failed`. Campaign doesn't know.
**Resolution:** Exponential backoff: on rate limit (HTTP 429), set `next_retry_at = now() + 15min`, increment `attempt_count`. After 3 failures, set `status = 'failed'` and push notification to campaign manager. Never silently abandon a queued post.
**Component:** `SocialPublishJob`, `/api/cron/social-sync`

### E-020: Post Approved But Platform Rejects It
**Scenario:** Campaign manager approves a post with an image. Platform API rejects because image dimensions are wrong (e.g., Instagram requires 4:5 ratio).
**Risk:** Post looks published but isn't. Manager doesn't notice.
**Resolution:** Validate image dimensions before allowing publish. Per-platform dimension guides:
- Instagram: 1:1 (1080×1080), 4:5 (1080×1350), 16:9 (1080×608)
- X: 16:9 recommended, 5MB max
- Facebook: 1200×630 for link posts
Show warnings in Compose UI. On API rejection: set `failureReason = platform error message`, push notification.
**Component:** Compose UI, `SocialPublishJob`

### E-021: Account Disconnected While Posts Queued
**Scenario:** Campaign manager revokes Facebook access in Facebook settings (not in Poll City). Queued posts fail.
**Risk:** Scheduled content doesn't go out.
**Resolution:** On any API call returning 401/403 for a `SocialAccount`: set `status = 'disconnected'`, cancel queued jobs, push alert to campaign manager: "Your Facebook account has been disconnected. Please reconnect to resume scheduled posts."
**Component:** Social API calls, `SocialAccount.status`

### E-022: Cross-Post Character Limit Violation
**Scenario:** Manager writes a 300-character post for Facebook, selects "also post to X". X limit is 280 characters.
**Risk:** X post gets truncated or rejected.
**Resolution:** In Compose UI: show per-platform character counters. Highlight when content exceeds platform limit. Offer: "Create platform-specific version" for X. Cannot submit cross-post if any platform is over limit unless explicit override.
**Component:** `social-manager-client.tsx`

---

## SECTION 5: AUTOMATION ENGINE EDGE CASES

### E-023: Contact Enrolled in Two Automations Sending Same Day
**Scenario:** Contact triggers "Support Level Change" automation (sends email) and "Tag Added" automation on the same day. Both send emails in step 1.
**Risk:** Contact receives 2 campaign emails in one day. Fatigue risk. CASL grey area.
**Resolution:** `ContactMessageFrequency` table. Before any automation step fires `send_email` or `send_sms`: check if contact already received N messages on this channel today. If so, delay step until tomorrow. Don't skip — delay.
**Component:** Automation runner cron, `ContactMessageFrequency`

### E-024: Automation Referenced Template Deleted
**Scenario:** Automation step 1 uses "Welcome Email" template. Manager deletes the template. Automation continues enrolling new contacts.
**Risk:** Enrollment reaches step 1, template is gone, email fails. Enrollment stuck in `failed` state.
**Resolution:** Soft deletes prevent this — templates have `deletedAt`. But at activation time: validate all step `templateId` references exist. At runtime: if template not found, fail enrollment gracefully with `error_message = "Template tmpl_abc was deleted"`, create task for campaign manager to fix automation.
**Component:** Automation builder validation, automation runner

### E-025: Contact Deleted Mid-Automation
**Scenario:** Contact is soft-deleted (doNotContact) while enrolled in a 5-step automation at step 3.
**Risk:** Steps 4-5 continue sending to deleted contact.
**Resolution:** At each step execution: re-fetch contact and check `deletedAt IS NULL AND doNotContact = false`. If either true: cancel enrollment, log reason. Do NOT continue.
**Component:** Automation runner cron

### E-026: Automation Runs Forever (No End Condition)
**Scenario:** Automation has a loop: step 1 = "Add tag X", step 2 = "Wait 1 day", step 3 = "Remove tag X" → but trigger is "Tag X added" = re-enrollment loop.
**Risk:** Contact enrolled indefinitely, receives messages forever.
**Resolution:** `AutomationEnrollment.steps_executed` counter. Cap at 50 steps per enrollment. If exceeded: cancel with `error_message = "Safety limit reached"`. Push alert to campaign manager.
**Component:** Automation runner

### E-027: Election Date Trigger Fires Early
**Scenario:** Automation set to fire "7 days before election". Campaign's `electionDate` is changed after automation created.
**Risk:** Automation fires at wrong time.
**Resolution:** `date_relative_to_election` trigger re-calculates at check time against current `campaign.electionDate`, not the date stored at trigger creation. If `electionDate` is null, the automation does not fire — log warning.
**Component:** Automation trigger check logic

---

## SECTION 6: COMPLIANCE + CONSENT EDGE CASES

### E-028: CASL: Soft Opt-In Expiry
**Scenario:** Contact was added to campaign 3 years ago via a door knock (soft opt-in). CASL 3-year rule means this consent has expired.
**Risk:** Sending to expired consent = CASL violation.
**Resolution:** `ConsentRecord` has `created_at`. Before email send: check if most recent `soft_opt_in` consent is > 1095 days old (3 years) AND no subsequent explicit opt-in. Exclude contact + flag for re-consent campaign.
**Note:** This is a Phase 8 feature. Log it now, enforce when CASL audit engine is built.
**Component:** `/api/comms/consent`, email send logic

### E-029: CRTC Voice Broadcast Outside Legal Hours
**Scenario:** Voice broadcast scheduled for 7am Saturday. CRTC rules: calls prohibited before 9am and after 9:30pm in recipient's local timezone.
**Risk:** Legal violation. CRTC complaint.
**Resolution:** `VoiceBroadcast.callWindowStart = "09:00"`, `callWindowEnd = "21:30"`. Enforce at cron execution time, not at scheduling time. Convert send time to contact's local timezone (use `postalCode` → timezone lookup). If outside window, delay call to 9:00am next permitted day.
**Component:** Voice broadcast cron, `VoiceBroadcast` model (already has these fields)

### E-030: Consent Conflict — Imported as DNC, Now Signs Up on Form
**Scenario:** Contact was marked DNC via CSV import. Later, same person submits a volunteer signup form and explicitly opts in to email.
**Risk:** Which wins — DNC or new explicit opt-in?
**Resolution:** Explicit opt-in WINS. New `ConsentRecord(status='explicit_opt_in')` is appended. `contact.doNotContact` is cleared. Activity log note: "Explicit consent re-established via form submission on [date]". This overrides the import-sourced DNC.
**Component:** Form submission handler, `/api/comms/consent`

### E-031: Unsubscribe Link with Invalid or Stale Contact ID
**Scenario:** CASL footer link: `/unsubscribe?c={{contactId}}`. Contact ID is stale (contact merged), or someone manually modifies the URL.
**Risk:** Wrong contact unsubscribed. Or 500 error.
**Resolution:** Unsubscribe endpoint:
1. Validate `contactId` is a valid CUID (regex)
2. Confirm contact belongs to campaign in URL (query with both)
3. If not found: show "You have been unsubscribed" anyway (don't reveal whether record exists)
4. Log failed lookup attempts
**Component:** `/api/public/unsubscribe` (existing)

---

## SECTION 7: SCHEDULING + TIMEZONE EDGE CASES

### E-032: Timezone Mismatch on Schedule
**Scenario:** Campaign manager in BC (PST) schedules email for "Oct 20 at 9:00am". Contacts are in Ontario (EST). Email goes out at 9am PST = 12pm EST.
**Risk:** Suboptimal send time. Manager intended Ontario morning.
**Resolution:** All scheduled times stored in UTC. UI shows timezone selector (default: `campaign.jurisdiction` timezone). Display confirmation: "This will send at 9:00am EDT (2:00pm UTC)".
**Component:** `ScheduledMessage.timezone`, Compose UI

### E-033: Daylight Saving Time Boundary
**Scenario:** Message scheduled for Nov 2 at 8:00am EST. Clocks fall back Nov 1. Is that 8am EST or EDT?
**Risk:** Message sends an hour early or late.
**Resolution:** Store all times as UTC. Compute UTC equivalent using `date-fns-tz` with target timezone at schedule time. The stored UTC value is unambiguous. Display in UI: "Sunday, Nov 2 at 8:00am EST".
**Component:** All scheduling, display logic

---

## SECTION 8: BULK SEND + PERFORMANCE EDGE CASES

### E-034: Send Loop Fails Halfway Through
**Scenario:** Sending to 3,000 contacts via Resend. Network hiccup at contact #1,500. Error thrown. Promise chain breaks.
**Risk:** First 1,500 received email. Last 1,500 did not. `NotificationLog` shows `sent=0, failed=0` (never written).
**Resolution:** `try/catch` per recipient, not per batch. Track `sentContactIds[]`. After loop (successful or failed): always write `NotificationLog` with actual counts. Use `finally` block. Log the failure point.
**Component:** Email + SMS blast endpoints

### E-035: Resend Rate Limit (100 emails/second)
**Scenario:** Sending 5,000 emails. Resend's free tier allows 100 emails/second. At scale, requests may be throttled.
**Risk:** 429 responses from Resend. Some emails fail or are delayed.
**Resolution:** Add 10ms delay between each Resend call (`await new Promise(r => setTimeout(r, 10))`). For paid Resend plans, this limit is higher. Add retry logic: on 429, wait 1 second, retry once, then mark as failed.
**Component:** Email blast loop

### E-036: Database Connection Pool Exhausted During Blast
**Scenario:** Large blast triggers 5,000 DB writes (`contact.lastContactedAt` updates) simultaneously.
**Risk:** Connection pool exhausted. Database queries time out. Other platform features break during send.
**Resolution:** Batch `updateMany` calls: split `sentContactIds` into chunks of 500. `updateMany` is one query per chunk = far fewer connections. Current implementation does one `updateMany` for all — good. Keep it.
**Component:** Post-send contact update logic

---

## SECTION 9: SECURITY EDGE CASES

### E-037: Webhook Replay Attack
**Scenario:** Attacker captures a valid Twilio webhook payload and replays it 100 times to `/api/webhooks/twilio`.
**Risk:** Creates 100 duplicate inbox messages. Floods contact's timeline.
**Resolution:** Twilio includes `X-Twilio-Signature` which is timestamp-bound. Validate signature AND check `external_message_id` in `inbox_messages` for deduplication. On duplicate: return 200 (don't alert attacker) but skip processing.
**Component:** `/api/webhooks/twilio`

### E-038: Message Content Injection via Personalization Tokens
**Scenario:** Contact's first name is `<script>alert(1)</script>`. Email blast uses `{{firstName}}`.
**Risk:** XSS if email is rendered in a web preview. HTML injection in email clients.
**Resolution:** `sanitizeUserText()` applied to all contact data before personalization substitution. Also: HTML entity-encode all token replacements in HTML emails. For SMS: strip HTML entirely.
**Component:** Personalization logic in email + SMS blast

### E-039: Campaign Manager Sends Message to Another Campaign's Contacts
**Scenario:** Request body contains `campaignId` of Campaign B, but manager only has access to Campaign A.
**Risk:** Data leak + unauthorized access.
**Resolution:** `guardCampaignRoute(campaignId, userId, "CAMPAIGN_MANAGER")` checks membership in the REQUESTED campaign, not the active campaign. If no membership: 403. This is the current pattern — verify every new comms route uses it.
**Component:** All `/api/comms/*` routes

### E-040: Social Access Token Leakage in API Response
**Scenario:** `/api/comms/social-accounts` returns the full `SocialAccount` record including `accessTokenEnc`.
**Risk:** Encrypted token exposed to client. If encryption is weak, token is compromised.
**Resolution:** NEVER return `accessTokenEnc`, `refreshTokenEnc`, or `tokenExpiresAt` in API responses. Select only: `id`, `platform`, `handle`, `displayName`, `status`, `lastSyncedAt`. Enforce via explicit Prisma `select` statements — never return the full model.
**Component:** All social account API responses

---

## SECTION 10: PRINT + CANVASSING INTEGRATION EDGE CASES

### E-041: Message Generates Script That Contradicts Canvass Script
**Scenario:** AI generates a canvass script from an email. But the email emphasizes transit, while the canvass territory's voters care about potholes.
**Risk:** Volunteer uses wrong script. Voter feels disconnected from campaign message.
**Resolution:** When generating canvass script from message: pass `contact.issues` distribution for the target ward as context. Adoni synthesizes ward priorities into script. Not a technical edge case — a product design requirement. Add to Adoni's `generate_canvass_script` tool context.
**Component:** Adoni tool: `generate_canvass_script`

### E-042: Print Job Triggered for Non-Printable Channel
**Scenario:** Automation step "send to print" fires for an SMS-only contact (no address).
**Risk:** Print job created with no delivery address.
**Resolution:** Print integration checks: `contact.address` must be non-null before creating print job. If null: skip this step + log `error_message = "No address on file"`. Do not fail entire enrollment.
**Component:** Automation runner, print trigger logic

---

## SECTION 11: OFFLINE MODE EDGE CASES

### E-043: Exported Call List Contact Has Opted Out Since Export
**Scenario:** Volunteer downloads call list at 9am. At 10am, contact calls campaign and says "remove me." Manager marks DNC. Volunteer calls contact at 11am from the downloaded list.
**Risk:** DNC contact is called. CASL violation.
**Resolution:** PDF/CSV export lists include "Generated at [timestamp]" warning. Call list page shows: "Download a fresh list before calling — this list may be up to [X] hours old." No technical fix possible for offline lists — this is a process control, not a code fix.
**Component:** Print/call list export UI, export timestamp display

---

*Last updated: 2026-04-10*
*Add new edge cases here as they are discovered. Never remove — mark as resolved with fix date.*

---

## SECTION 6: CRM + IDENTITY RESOLUTION EDGE CASES

### C-001: Same Person Imported Twice — Slight Name Difference
Scenario: "Jon Smith" and "Jonathan Smith" imported from two different sources.
Risk: Two contacts for same person. Duplicate outreach. Inflated count.
Resolution: Import runs name fuzzy-match (Jaro-Winkler > 0.85) + address match. Creates DuplicateCandidate with confidence=high. Does NOT auto-merge. Human reviews.
Component: Import pipeline → /api/import/volunteers/execute, /api/crm/duplicates

### C-002: Shared Phone Number (Household Landline)
Scenario: Three household members all have the same landline as their phone.
Risk: Phone-based duplicate detection creates 3 DuplicateCandidates between all members.
Resolution: If contacts share the same householdId, phone match is NOT treated as duplicate signal. Household co-membership reduces confidence from "high" to "low" automatically.
Component: DuplicateCandidate confidence calculation

### C-003: Same Email Shared by Family Members
Scenario: Two contacts both have jsmith@gmail.com (shared family email).
Risk: Duplicate detection fires. Both are separate real people.
Resolution: Email match alone = confidence=high (not exact). User can mark "not duplicate" → DuplicateCandidate.decision = not_duplicate. Email-match dedupe re-scoring should check householdId.
Component: DuplicateCandidate confidence, /api/crm/duplicates

### C-004: Apartment Number Missing → False Household Merge
Scenario: Two people at "123 Main St, Unit 2" and "123 Main St, Unit 4" imported without unit numbers. Both become "123 Main St". Household match fires.
Resolution: Address matching MUST include unit/apt normalization. If unit fields differ or one is missing, confidence drops to medium. Never auto-assign household from partial address match.
Component: Householding engine

### C-005: Merge Accidentally Combines Two Different People — Same Name
Scenario: Two "Robert Brown" contacts from different wards. Manager merges them thinking they're the same person. They are not.
Risk: Data from Person A applied to Person B's record. Two people's interaction history combined. Cannot be cleanly undone.
Resolution:
  - Merge preview must prominently show: address, email, phone, support level, interaction count from both
  - Require typed confirmation: "Type MERGE to confirm"
  - MergeHistory records full absorbedSnapshotJson — not a full unmerge but data can be manually recovered
  - Flag unmerge limitation in UI: "Merges cannot be fully undone. Contact support if this was an error."
Component: Merge preview UI, POST /api/crm/merge

### C-006: Contact Archived But Referenced by Donations or Canvassing
Scenario: Contact soft-deleted. Donation record still references contactId. History is visible but contact "doesn't exist."
Resolution: Soft-deleted contacts are accessible by ID for historical reads. Donation list includes contact name from snapshot. Never hard-delete contacts with linked donations or interactions.
Component: DELETE /api/contacts/[id], Donation queries

### C-007: Duplicate Created by Offline Sync
Scenario: Canvasser captures a new contact offline. Same contact was added online while offline. Both sync and create two records.
Resolution: Offline sync endpoint runs duplicate check on upload. If email or phone match found, creates DuplicateCandidate instead of creating second contact. Shows conflict in canvasser's app on next sync.
Component: Offline sync endpoint, mobile app sync

### C-008: Bulk Update Touches Protected Record
Scenario: Bulk support level update includes a contact marked doNotContact or deceased.
Resolution: Bulk update filters out deceased contacts automatically. doNotContact contacts can have support level updated (support level and DNC are independent). isDeceased contacts are always excluded from bulk operations.
Component: /api/contacts/bulk-update

### C-009: Import Row Missing Key Fields
Scenario: CSV row has last name only. No first name, no email, no phone.
Resolution: Row imports as partial contact. Flagged for data quality review. DuplicateCandidate NOT created (insufficient signals). Shows in Data Quality dashboard as "Incomplete Profile."
Component: Import pipeline

### C-010: Relationship Points to Archived Contact
Scenario: Contact A has relationship to Contact B. Contact B is soft-deleted.
Resolution: ContactRelationship.isActive remains true but contact resolution shows "[Archived Contact]" with their name. Relationship visible in audit but not in active relationship graph.
Component: GET /api/crm/contacts/[id]/relationships

### C-011: Primary Household Contact Removed
Scenario: Household has 4 members. Primary contact is removed (soft-deleted). Household primaryContactId now points to a deleted record.
Resolution: On soft-delete of a contact, check if they are the primaryContact of any household. If so, auto-promote the next oldest active member. If no active members remain, household.primaryContactId = null.
Component: DELETE /api/contacts/[id] → household update

### C-012: Support Profile Flag Conflict — Deceased Contact Still Getting Emails
Scenario: SupportProfile.flagDeceased = true but Contact.doNotContact = false. Campaign sends email blast without filtering deceased.
Resolution: flagDeceased = true MUST behave identically to doNotContact = true for all outbound communications. Email, SMS, Voice, and automation exclusion all check both fields. SupportProfile flags are additive constraints.
Component: All blast endpoints, /api/communications/email, /api/communications/sms

### C-013: Manual Override Must Always Audit
Scenario: Admin manually overrides a SupportProfile score to 95 on a low-engagement contact. No record of why.
Resolution: Every SupportProfile PATCH creates a ContactAuditLog entry with: fieldName, oldValueJson, newValueJson, actorUserId, source="manual".
Component: PATCH /api/crm/contacts/[id]/support-profile
