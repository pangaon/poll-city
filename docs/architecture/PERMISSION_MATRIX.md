# Permission Matrix

## Actor Definitions

| Actor | Description | Auth required |
|---|---|---|
| SUPER_ADMIN | Platform operator — Poll City staff | Yes |
| ADMIN | Campaign admin — full control of their campaign | Yes + Membership |
| CAMPAIGN_MANAGER | Operations staff — can manage but not delete campaigns | Yes + Membership |
| VOLUNTEER | Field worker — read contacts, log interactions, walk list | Yes + Membership |
| PUBLIC_USER | Authenticated voter using Social app | Yes (Social only) |
| ANONYMOUS | Unauthenticated visitor | No |

**Note:** ADMIN, CAMPAIGN_MANAGER, and VOLUNTEER are Membership.role values (campaign-scoped). A user can be VOLUNTEER in Campaign A and ADMIN in Campaign B simultaneously.

---

## Poll City Admin — Permissions

### Campaign Management

| Action | SUPER_ADMIN | ADMIN | CAMPAIGN_MANAGER | VOLUNTEER |
|---|---|---|---|---|
| Create campaign | ✅ | ✅ (becomes ADMIN) | ❌ | ❌ |
| Edit campaign settings | ✅ | ✅ | ❌ | ❌ |
| Delete campaign | ✅ | ❌ (Phase 2) | ❌ | ❌ |
| View campaign | ✅ | ✅ | ✅ | ✅ |
| Invite team members | ✅ | ✅ | ❌ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Switch active campaign | ✅ | ✅ (own campaigns) | ✅ (own campaigns) | ✅ (own campaigns) |

### Contacts / CRM

| Action | SUPER_ADMIN | ADMIN | CAMPAIGN_MANAGER | VOLUNTEER |
|---|---|---|---|---|
| View contacts list | ✅ | ✅ | ✅ | ✅ |
| View contact detail | ✅ | ✅ | ✅ | ✅ |
| Create contact | ✅ | ✅ | ✅ | ✅ |
| Edit contact | ✅ | ✅ | ✅ | ✅ |
| Delete contact | ✅ | ✅ | ✅ | ❌ |
| Log interaction | ✅ | ✅ | ✅ | ✅ |
| Add/remove tags | ✅ | ✅ | ✅ | ✅ |
| Import contacts | ✅ | ✅ | ✅ | ❌ |
| Export contacts | ✅ | ✅ | ✅ | ❌ |
| View custom fields | ✅ | ✅ | ✅ | ✅ |
| Create custom field | ✅ | ✅ | ✅ | ❌ |
| Edit custom field | ✅ | ✅ | ✅ | ❌ |
| Delete custom field | ✅ | ✅ | ❌ | ❌ |

### Canvassing

| Action | SUPER_ADMIN | ADMIN | CAMPAIGN_MANAGER | VOLUNTEER |
|---|---|---|---|---|
| View walk lists | ✅ | ✅ | ✅ | ✅ (own assigned) |
| Create walk list | ✅ | ✅ | ✅ | ❌ |
| Assign volunteers to list | ✅ | ✅ | ✅ | ❌ |
| Use walk list (field) | ✅ | ✅ | ✅ | ✅ |
| Log Not Home | ✅ | ✅ | ✅ | ✅ |
| Quick capture (volunteer/sign/donation) | ✅ | ✅ | ✅ | ✅ |

### GOTV

| Action | SUPER_ADMIN | ADMIN | CAMPAIGN_MANAGER | VOLUNTEER |
|---|---|---|---|---|
| View GOTV dashboard | ✅ | ✅ | ✅ | ❌ |
| Upload voted list | ✅ | ✅ | ✅ | ❌ |
| View priority call list | ✅ | ✅ | ✅ | ✅ |

### Tasks

| Action | SUPER_ADMIN | ADMIN | CAMPAIGN_MANAGER | VOLUNTEER |
|---|---|---|---|---|
| View all tasks | ✅ | ✅ | ✅ | Own only |
| Create task | ✅ | ✅ | ✅ | ✅ |
| Assign task to any member | ✅ | ✅ | ✅ | ❌ |
| Complete task | ✅ | ✅ | ✅ | Own only |
| Delete task | ✅ | ✅ | ✅ | ❌ |

### Polling (Admin side)

| Action | SUPER_ADMIN | ADMIN | CAMPAIGN_MANAGER | VOLUNTEER |
|---|---|---|---|---|
| Create public poll | ✅ | ✅ | ✅ | ❌ |
| Create campaign_only poll | ✅ | ✅ | ✅ | ❌ |
| View campaign poll results | ✅ | ✅ | ✅ | ✅ |
| Delete poll | ✅ | ✅ | ❌ | ❌ |

---

## Poll City Social — Permissions

| Action | PUBLIC_USER (auth) | ANONYMOUS |
|---|---|---|
| Browse officials list | ✅ | ✅ |
| View official detail | ✅ | ✅ |
| Follow an official | ✅ | ❌ |
| Ask a question to official | ✅ | ❌ |
| View public polls | ✅ | ✅ |
| Vote on public poll | ✅ (identified) | ✅ (pseudonymous) |
| View poll results | ✅ | ✅ |
| Submit support signal | ✅ | ❌ |
| Submit volunteer opt-in | ✅ | ❌ |
| Request a sign | ✅ | ❌ |
| Grant contact permission | ✅ | ❌ |
| View own profile | ✅ | ❌ |
| Manage notification prefs | ✅ | ❌ |
| Revoke any consent | ✅ | ❌ |

---

## Consent Bridge — Permissions

The consent bridge is the only channel for Social → Admin data flow.

| Action | Who can authorize | What data flows | Audit logged |
|---|---|---|---|
| Support signal to campaign | PUBLIC_USER (explicit action) | officialId, signalType, userId, postalCode | Always |
| Volunteer opt-in | PUBLIC_USER (form submit) | name (optional), phone (optional), postalCode, campaignId | Always |
| Sign request | PUBLIC_USER (form submit) | address, signType, campaignId | Always |
| Contact permission grant | PUBLIC_USER (explicit checkbox) | userId, campaignId, permissionScope | Always |
| Update opt-in | PUBLIC_USER (explicit checkbox) | userId, campaignId, notificationType | Always |
| Consent revocation | PUBLIC_USER at any time | userId, campaignId, what was revoked | Always |

**Hard rules:**
- No action triggers data transfer without an explicit user-initiated event
- Minimum data only — only fields necessary for the stated purpose
- Campaign cannot read Social user's full profile — only the specific fields consented to
- Bridge writes are idempotent — duplicate submissions do not create duplicate CRM entries

---

## Print — Permissions (Phase 1, inside Admin)

| Action | SUPER_ADMIN | ADMIN | CAMPAIGN_MANAGER | VOLUNTEER |
|---|---|---|---|---|
| View sign requests | ✅ | ✅ | ✅ | ✅ |
| Update sign status | ✅ | ✅ | ✅ | ✅ |
| Create print order | ✅ | ✅ | ✅ | ❌ |
| View service providers | ✅ | ✅ | ✅ | ❌ |
| Book a service | ✅ | ✅ | ✅ | ❌ |

---

## Data Visibility Rules

| Data class | Admin read | Social read | Anonymous read |
|---|---|---|---|
| Campaign-private contacts | Campaign members only | ❌ Never | ❌ Never |
| Campaign-private polls | Campaign members only | ❌ Never | ❌ Never |
| Campaign-private tasks | Campaign members only | ❌ Never | ❌ Never |
| Public official profiles | ✅ (same as Social) | ✅ | ✅ |
| Public polls | ✅ | ✅ | ✅ |
| Poll results | Aggregate only | Aggregate only | Aggregate only |
| Consent bridge records | Own campaign only | ❌ | ❌ |
| Activity logs | ADMIN + MANAGER only | ❌ | ❌ |
