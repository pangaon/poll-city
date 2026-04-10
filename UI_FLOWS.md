# Poll City — Communications Platform UI Flows

*All flows live within `/communications/` (existing path, extending the existing hub).*
*Existing file: `src/app/(app)/communications/communications-client.tsx` (2501 lines).*
*The Communications Command Center is the single entry point. All channels accessible from one place.*

---

## 0. Hub Entry Point — Communications Command Center

**Route:** `/communications`
**File:** `communications-client.tsx`
**Tabs (existing structure, extend as needed):**

```
[ Overview ] [ Compose ] [ Scheduled ] [ Inbox ] [ Templates ] [ Automations ] [ Analytics ] [ Settings ]
```

**Sidebar stats (always visible):**
- Total sent this week
- Inbox unread count (live polling every 30s)
- Scheduled pending count
- Active automations count

**Empty states (Adoni-powered):**
- First time: "No messages sent yet." → Adoni: "Your first message is one step away. Start with an email to your strong supporters — that's your base."
- No automations: Adoni: "You're doing this manually. Set up a welcome series for new supporters — it takes 3 minutes and runs itself."

---

## 1. Compose Tab — Unified Message Composer

**Path within hub:** Tab click → replaces main content area (no navigation)

### Flow 1A: New Email Blast

```
[1] Click "Compose" tab
[2] Select channel: [ Email ] [ SMS ] [ Push Notification ]
    → Email selected
[3] Build audience:
    Option A: Pick saved segment (dropdown from /api/comms/segments)
    Option B: Build inline:
      - Support levels (multi-select chips)
      - Wards (multi-select)
      - Tags (multi-select)
      - Funnel stages (multi-select)
      - Has email: [✓]
      - Exclude DNC: [✓]
    → Live audience count updates as filters change (debounced, 500ms, calls /api/communications/audience)
    → "X contacts with email addresses" banner
[4] Write message:
    Option A: Blank (rich text editor)
    Option B: Load from template (modal, browse /api/comms/templates?channel=email)
    - Subject line field
    - Rich text body (TipTap or similar, already in codebase)
    - Personalization tokens: {{firstName}}, {{lastName}}, {{ward}}, {{candidateName}}
    - Preview: renders personalized version with sample contact data
    - Character/word count
[5] Schedule or send:
    [ Send Now ]  [ Schedule for Later → date/time picker → /api/comms/scheduled POST ]
    Preview button: sends test to manager's own email
[6] Confirmation modal:
    "Send to 847 contacts? This cannot be undone."
    Subject: [preview]
    Audience: [summary]
    [ Cancel ] [ Send ]
[7] Success state:
    "Sending to 847 contacts. You'll see results in Analytics."
    Adoni: "Great timing — Tuesday morning emails get the best open rates in this ward."
```

### Flow 1B: New SMS Blast

Same as 1A with:
- Channel = SMS
- Body = plain text only (1000 char max, shows SMS segment count)
- Preview shows CASL suffix: " Reply STOP to opt out. [CampaignName]"
- Character counter shows remaining chars in current 160-char segment
- No rich text — plain textarea

### Flow 1C: Social Post Compose

```
[1] Click "Compose" tab → select "Social Post"
[2] Select accounts (multi-select, fetched from /api/comms/social/posts):
    ☐ @JohnSmithWard5 (Facebook)
    ☐ @JohnSmithWard5 (Instagram)
    ☐ @JohnSmith_Ward5 (X)
    → Per-platform character counters update as user types
[3] Write content:
    - Text area (enforces strictest selected platform limit)
    - Media upload (drag + drop → /api/upload → stored in MediaLibrary)
    - Media library picker (browse existing assets)
    - Hashtag suggestions (based on campaign's existing posts)
    - Link URL field (optional)
[4] Per-platform preview:
    Toggle between platforms — shows how post will appear
[5] Approval workflow (if campaign requires it):
    [ Submit for Approval ] → SocialPost.status = pending_approval → notify admins
    OR (if user has approve permission):
    [ Schedule ] [ Post Now ]
[6] Schedule: date/time picker → SocialPublishJob created
[7] Post now: immediate → SocialPublishJob status = in_progress → platform API call
```

---

## 2. Scheduled Tab

**Path:** `/communications` → Scheduled tab

```
List of ScheduledMessage records (status=queued):
┌──────────────────────────────────────────────────────────────────┐
│ [Email] Welcome to the campaign    → Oct 20 at 9:00am           │
│ Audience: Strong supporters (847)  Channels: Email              │
│ [Edit] [Cancel]                                                  │
├──────────────────────────────────────────────────────────────────┤
│ [SMS] Election day reminder        → Oct 27 at 8:30am           │
│ Audience: All supporters (2,341)   Channels: SMS                │
│ [Edit] [Cancel]                                                  │
└──────────────────────────────────────────────────────────────────┘

Filters: [ All ] [ Email ] [ SMS ] [ Social ]
Sorted by: send date ascending

Empty state: "No messages scheduled. Use Compose to schedule a message."
```

**Edit flow:**
- Opens Compose flow pre-populated with message data
- Can change audience, content, send time
- Cannot edit if status = processing/sent

---

## 3. Inbox Tab

**Route:** `/communications/inbox` (existing page, needs full backend wiring)

```
┌──────────────────────────────┬───────────────────────────────────────┐
│ THREADS LIST                 │ MESSAGE THREAD                        │
│                              │                                       │
│ Filter: [All] [SMS] [Social] │ [Contact: Jane Smith]                 │
│         [Email] [Open] [Mine]│ [Ward 5 · Strong Supporter]           │
│                              │ [Profile →] [Assign to ▼] [Resolve]  │
│ ● Jane Smith          SMS   │                                       │
│   "Thanks, I'll be there"   │ ┌─────────────────────────────────┐   │
│   2m ago · Ward 5            │ │ Oct 15, 9:14am                  │   │
│                              │ │ Campaign: "Are you coming to..." │  │
│ ○ @voter_bob         X      │ └─────────────────────────────────┘   │
│   "Great event last night"  │                                       │
│   15m ago                    │ ┌─────────────────────────────────┐   │
│                              │ │ Oct 15, 9:22am   Jane           │   │
│ ○ Mike Jones          SMS   │ │ "Thanks I'll definitely be there"│  │
│   "Can I put a sign up?"    │ └─────────────────────────────────┘   │
│   1h ago · Ward 3            │                                       │
│                              │ [ Quick reply templates ▼ ]          │
│ [Load more...]               │ ┌──────────────────────────────────┐  │
│                              │ │ Type reply... (Ctrl+Enter sends) │  │
│                              │ └──────────────────────────────────┘  │
│                              │ [Send]                                │
└──────────────────────────────┴───────────────────────────────────────┘
```

**Inbox states:**
- Unread (bold, blue dot)
- Assigned to me
- Assigned to other (shows avatar)
- Resolved (greyed out)
- Priority (orange flag)

**Thread actions:**
- Assign to staff member (dropdown of campaign members)
- Add tag (free text + existing tags)
- Mark priority
- Resolve
- View full contact profile (link to `/contacts/[id]`)

**Quick reply templates:**
- Fetched from `/api/comms/templates?channel=sms` or `channel=email`
- Select template → pre-fills reply box
- Tokens auto-replaced with contact data

---

## 4. Templates Tab

**Path within hub:** Templates tab

```
[ + New Template ]                    Filter: [ Email ] [ SMS ] [ Push ] [ All ]

┌────────────────────────────────────────────────────────────────────┐
│ 📧 Strong Supporter Welcome          Email          Last used: 3d  │
│ "Thanks for your support, {{firstName}}..."                        │
│ [Preview] [Edit] [Duplicate] [Delete]                              │
├────────────────────────────────────────────────────────────────────┤
│ 💬 Volunteer Ask                      SMS           Last used: 1w  │
│ "Hi {{firstName}}, would you consider volunteering..."             │
│ [Preview] [Edit] [Duplicate] [Delete]                              │
└────────────────────────────────────────────────────────────────────┘
```

**New template flow:**
1. Click "+ New Template"
2. Modal: Name, Channel
3. If email: subject field + rich text editor (same as Compose)
4. If SMS: plain text (160 char indicator)
5. Personalization tokens shown as clickable chips → insert at cursor
6. Save → `POST /api/comms/templates`

**Preview modal:**
- Renders with sample data (campaign's first contact or "Jane Smith" fallback)
- Shows both HTML preview and plain text fallback
- "Send test email to myself" button

---

## 5. Automations Tab

**Path within hub:** Automations tab

```
[ + New Automation ]              Filter: [ Active ] [ Draft ] [ All ]

┌──────────────────────────────────────────────────────────────────────┐
│ ● Strong Supporter Welcome Series        Active   124 enrolled       │
│ Trigger: support_level → strong_support                              │
│ Steps: Email → Wait 3d → SMS → Create Task                          │
│ [View] [Deactivate] [Edit]                                           │
├──────────────────────────────────────────────────────────────────────┤
│ ○ Volunteer Onboarding                   Draft    0 enrolled         │
│ Trigger: volunteer_signup                                            │
│ Steps: Email → Wait 1d → SMS                                         │
│ [View] [Activate] [Edit] [Delete]                                    │
└──────────────────────────────────────────────────────────────────────┘
```

**Automation builder flow:**
```
[1] Name + description
[2] Choose trigger:
    ┌───────────────────────────────────────┐
    │ When a contact...                      │
    │ ○ Changes support level to [dropdown] │
    │ ○ Advances funnel stage to [dropdown] │
    │ ○ Gets tag [tag picker]               │
    │ ○ Submits form [form picker]          │
    │ ○ Makes a donation                    │
    │ ○ Signs up as volunteer               │
    │ ○ RSVPs to an event                   │
    │ ○ Has not been contacted in [N] days  │
    │ ○ [N] days before election            │
    └───────────────────────────────────────┘
[3] Build steps (drag-and-drop):
    ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
    │ Send Email     │  →  │ Wait 3 days    │  →  │ Send SMS       │
    │ [template ▼]   │     │                │     │ [body...]      │
    └────────────────┘     └────────────────┘     └────────────────┘
              ↑
         [ + Add step ]
    Step types: Send Email | Send SMS | Wait | Update Contact |
                Add Tag | Create Task | Branch (if/then)
[4] Enrollment settings:
    - Allow re-enrollment: [toggle]
    - Cooldown: [30] days
[5] Save as draft → validate → activate
```

**Validation before activation:**
- All step configs complete (no empty templates)
- All referenced templates exist and are active
- Trigger conditions valid
- At least one action step (not just wait steps)

---

## 6. Analytics Tab

**Path within hub:** Analytics tab

```
Date range: [Last 7 days ▼]          Channel: [All ▼]

┌─────────┬──────────┬──────────┬──────────┬──────────┐
│  Sent   │Delivered │  Opened  │  Clicked │  Replied │
│  4,200  │  4,150   │  1,890   │   340    │    67    │
│         │  98.8%   │  45.5%   │   8.2%   │   1.6%  │
└─────────┴──────────┴──────────┴──────────┴──────────┘

[Delivery funnel chart — bar chart: sent → delivered → opened → clicked]

[Messages table]
┌──────────────────────────────┬────────┬───────┬───────┬────────┬─────────┐
│ Message                      │Channel │  Sent │Opened │Clicked │   Sent  │
├──────────────────────────────┼────────┼───────┼───────┼────────┼─────────┤
│ Oct 15: Get out the vote!    │Email   │ 1,247 │ 58.3% │ 12.1%  │Oct 15   │
│ Oct 13: Event reminder       │SMS     │   834 │   n/a │   n/a  │Oct 13   │
│ Oct 10: Thank you email      │Email   │   421 │ 44.2% │  7.8%  │Oct 10   │
└──────────────────────────────┴────────┴───────┴───────┴────────┴─────────┘
[Click row → drill-through to per-message analytics]
```

**Per-message detail view:**
- Full delivery funnel (sent → delivered → opened → clicked)
- Top clicked links
- Unsubscribes from this message
- Geographic breakdown (by ward)
- Attribution: "3 supporters converted within 72h"

---

## 7. Settings Tab (Communications)

**Path within hub:** Settings tab

Sections:
1. **Sender Identity**
   - From name: "[Campaign name field, pre-filled from campaign setup]"
   - Reply-to email: "[email field]"
   - SMS number: "[Twilio number, read-only — configured by admin]"

2. **Connected Accounts**
   - Social account manager (list of connected accounts per platform)
   - Connect new: [Facebook] [Instagram] [X] [LinkedIn] [TikTok]
   - Each shows: handle, status (active/error), last synced
   - Disconnect button

3. **Compliance**
   - CASL footer text (email — non-removable)
   - SMS opt-out suffix (non-removable)
   - View consent audit log → `/api/comms/consent/audit`

4. **Integrations**
   - Resend configured: [✓ / Configure]
   - Twilio configured: [✓ / Configure]

5. **Fatigue Limits**
   - Max emails per contact per 7 days: [3]
   - Max SMS per contact per 7 days: [2]
   - Show warning / skip over-limit contacts: [toggle]

---

## 8. Social Manager Page

**Route:** `/communications/social`
**File:** `social-manager-client.tsx` (853 lines — existing)

**Extend with:**

### Post Queue View
```
[ Compose New Post ]            Filter: [ All ] [ Scheduled ] [ Published ] [ Failed ]
Platform: [ All ] [ Facebook ] [ Instagram ] [ X ] [ LinkedIn ]

SCHEDULED (3)
┌──────────────────────────────────────────────────────────────────────┐
│ Oct 20, 10:00am  [Facebook] [Instagram]                              │
│ "Proud to announce our endorsement from the teachers' union..."      │
│ [image thumbnail]                                                    │
│ [Edit] [Cancel]                                  Posted by: You     │
└──────────────────────────────────────────────────────────────────────┘

PUBLISHED (14)
┌──────────────────────────────────────────────────────────────────────┐
│ Oct 15, 9:00am   [X]                                                 │
│ "Great turnout at our Ward 5 community meeting last night!"          │
│ 47 likes  12 shares  89 impressions                                  │
│ [View on platform ↗]                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Social Streams (Mentions + DMs)
```
Tab: [ Posts ] [ Mentions ] [ DMs ]

MENTIONS (feeds from SocialMention)
┌──────────────────────────────────────────────────────────────────────┐
│ @localreporter_T   X   · Positive sentiment                          │
│ "@JohnSmithWard5 great platform, you have my vote"                   │
│ Oct 15, 2:34pm                                                       │
│ [Reply in Inbox] [Tag contact] [Dismiss]                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 9. Mobile Behaviour (390px)

All Communications views collapse to:
- **Compose:** Full-width, single-column flow
- **Inbox:** Threads list → tap → opens full-screen thread (no split view)
- **Automations:** Read-only view on mobile. Edit forces desktop warning.
- **Templates:** Scroll list + modal for create/edit
- **Scheduled:** Card list, no table
- **Analytics:** Summary cards only (no table on mobile — use charts)

---

## 10. Adoni Integration Points

Adoni is accessible from any Communications view via the standard chat trigger.

Pre-fill examples (dispatched via `pollcity:open-adoni` custom event):

```javascript
// From Analytics tab - low open rate
window.dispatchEvent(new CustomEvent("pollcity:open-adoni", {
  detail: { prefill: "My last email had a 12% open rate. What should I try differently?" }
}))

// From Compose - help writing
window.dispatchEvent(new CustomEvent("pollcity:open-adoni", {
  detail: { prefill: "Write a get out the vote SMS for strong supporters in Ward 5." }
}))

// From Automations tab - empty state
window.dispatchEvent(new CustomEvent("pollcity:open-adoni", {
  detail: { prefill: "What automations should I set up first for my campaign?" }
}))
```

Adoni never surfaces in Inbox — that's human-to-human territory.

---

## File Map (what to create / extend)

| File | Action | Notes |
|------|--------|-------|
| `src/app/(app)/communications/communications-client.tsx` | Extend | Add Templates, Automations, Analytics tabs |
| `src/app/(app)/communications/inbox/inbox-client.tsx` | Rebuild | Wire to `/api/comms/inbox` backend (currently stub) |
| `src/app/(app)/communications/social/social-manager-client.tsx` | Extend | Add approval workflow, metrics, streams |
| `src/components/comms/template-editor.tsx` | Create | Shared email/SMS template editor |
| `src/components/comms/automation-builder.tsx` | Create | Step builder + trigger config |
| `src/components/comms/segment-builder.tsx` | Create | Audience filter builder with live count |
| `src/components/comms/analytics-funnel.tsx` | Create | Delivery funnel chart component |
| `src/components/comms/inbox-thread.tsx` | Create | Thread view with reply box |

---

# CRM COMMAND CENTER — UI FLOWS — 2026-04-10

## 0. CRM Command Center (/crm)

Route: /crm
File: src/app/(app)/crm/page.tsx + crm-client.tsx

Sections (left nav or top tabs):
[ Overview ] [ Contacts ] [ Households ] [ Segments ] [ Duplicates ] [ Relationships ] [ Imports ] [ Bulk Actions ] [ Data Quality ] [ Audit ]

Overview widgets:
- Total contacts (this campaign)
- New this week
- Households count
- Duplicate candidates pending review (badge if > 0)
- Contacts missing phone
- Contacts missing email
- Contacts missing address
- High-priority supporters
- Active volunteers
- Lapsed donors (no donation > 6 months)
- Bounced email contacts
- Do-not-contact count
- Data quality alerts (% complete profiles)

## 1. Contact Profile — Extended Tabs

Existing profile (/contacts/[id]) gains new tabs alongside Overview/Timeline:

[ Overview ] [ Timeline ] [ Notes ] [ Relationships ] [ Roles ] [ Score ] [ Audit ]

### Notes Tab
- Shows all visible notes (visibility filter by role server-side)
- Pinned notes floated to top
- Quick add: textarea + type selector + visibility selector + [Save Note] button
- Each note: type badge, timestamp, author name, visibility badge, [Pin] [Delete] buttons
- Internal-only notes shown with amber border. Admin-only with red border.

### Relationships Tab
- Two sections: "This person is..." (outgoing) + "Known to this person" (incoming)
- Each relationship: linked contact name (clickable → their profile), relationship type badge, strength dots (1-5), notes
- [Add Relationship] button → modal: search contacts, pick type, set strength
- Delete button per relationship (CAMPAIGN_MANAGER+ only)

### Roles Tab
- List of role profiles: voter | donor | volunteer | supporter | staff | etc.
- Each role: type badge, status badge (active/inactive/pending), metadata preview
- [Add Role] button → dropdown of unassigned role types + status picker
- Toggle active/inactive per role

### Score Tab (CAMPAIGN_MANAGER+ only)
- Support Score: 0-100 slider with live preview
- Turnout Likelihood: 0-100
- Persuasion Priority: 0-100
- Volunteer Potential: 0-100
- Donor Potential: 0-100
- Issue Affinity: tag chips (issue + score)
- Flags: toggle grid (High Value, High Priority, Hostile, Needs Follow-Up, Compliance Review)
- [Save Score] button
- Last assessed: timestamp + assessor name

### Audit Tab (CAMPAIGN_MANAGER+ only)
- Paginated timeline of all ContactAuditLog entries
- Each entry: action badge, field name, old value → new value, actor name, timestamp, source badge
- Filter by: entityType, action, date range

## 2. Dedupe Queue (/crm → Duplicates tab)

Layout: Split panel
Left: List of DuplicateCandidate cards (sorted by confidenceScore desc)
  - Each card: "John Smith vs John D. Smith" | confidence badge | score | signals summary
  - Selected candidate highlighted

Right: Merge preview panel
  - Contact A fields vs Contact B fields side by side
  - Signals breakdown (email match ✓, phone match ✗, name score 0.92, address score 0.70)
  - Field-by-field survivor picker (radio buttons: A | B | custom)
  - [Confirm Merge] button (ADMIN only) | [Mark Not Duplicate] | [Defer] buttons

Filter: All | Exact | High | Medium | Low | Deferred
Stats bar: X pending | Y merged this week | Z marked not-duplicate

## 3. Household Profile (/households/[id])

Household header: address | ward | poll | total voters
Members list: each member → name link, role in household, supporter status badge, last contacted
Stats:
- Supporter mix (strong/leaning/undecided/opposition) as mini bar
- Donor history: total donated, last donation date
- Volunteer: any volunteers in household (Y/N + who)
- Canvass history: visited/not visited, last door date
- Sign status: requested/installed/removed
Household notes (separate from contact notes)
[Visit Household] → opens canvassing flow for first uncontacted member
