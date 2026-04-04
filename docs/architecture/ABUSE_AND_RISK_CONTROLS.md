# Abuse and Risk Controls

## Current Controls (Phase 1 — Implemented)

### Duplicate Vote Prevention

Two-layer system for authenticated users. One-layer for anonymous.

| Layer | Mechanism | Covers |
|---|---|---|
| Application layer | findFirst check before every poll INSERT | All poll types, all users |
| DB layer (partial indexes) | poll_responses_single_vote_uniq + poll_responses_swipe_vote_uniq | Authenticated users only |
| P2002 catch | runWithDuplicateProtection() returns HTTP 409 | DB constraint violations under race |

**Gaps:**
- Anonymous: ipHash only — VPN bypassable
- Race condition window: milliseconds, DB index is backstop
- setup-indexes.sql must be run — not automatic

### Request Body Size Guards

| Endpoint | Limit | Method |
|---|---|---|
| POST /api/polls/[id]/respond | 64KB | content-length header check |
| POST /api/import | 10MB | content-length header check |
| POST /api/gotv/upload | 5MB | content-length header check |
| POST /api/import-export | 10MB | content-length header check |

**Gap:** content-length can be omitted by clients. Vercel 4.5MB serverless limit is the secondary backstop.

### Input Validation

| Input | Validation |
|---|---|
| Binary poll value | Must be "yes" or "no" — 422 otherwise |
| Slider poll value | Must be numeric 0–100 — 422 otherwise |
| Multiple choice optionId | Must belong to the target poll — 422 otherwise |
| Swipe direction | Must be "left", "right", "up", or "skip" |
| Ranked rank value | Must be integer ≥1 and ≤ option count |
| Officials search string | Capped at 100 chars before DB query |
| Poll respond body | Geo fields capped (postalCode: 10 chars, ward/riding: 100 chars) |

### Campaign Isolation

Every campaign-data query enforces campaignId from verified membership — not client input. An attacker submitting a different campaignId in the request body gets 403.

### Cross-Tenant Authorization

- campaign-fields CREATE/UPDATE/DELETE: checks Membership.role in target campaign
- contacts DELETE: checks Membership.role in contact's campaign
- canvass/assign: verifies target userId is a member of the same campaign
- All quick-capture routes: verify requesting user's membership before writing

---

## Missing Controls (Required Before Commercial Rollout)

### 1. Rate Limiting — NOT IMPLEMENTED

**Risk:** Brute force on login, bulk voting, scraping contacts endpoint.

**Required:**
```
POST /login:                 5 attempts per IP per 15 minutes
POST /api/polls/[id]/respond: 10 per IP per hour (anonymous)
GET  /api/contacts:          100 per user per minute
POST /api/import:            10 per campaign per hour
POST /api/gotv/upload:       20 per campaign per day
All authenticated routes:    1000 per user per minute (general)
```

**Implementation:** Vercel Edge middleware using upstash/ratelimit or similar. Not in Phase 1.

### 2. CAPTCHA on Public Forms — NOT IMPLEMENTED

**Risk:** Bot voting on public polls, spam Q&A submissions.

**Required for:** POST /api/polls/[id]/respond (anonymous), POST /api/officials/[id]/questions

**Implementation:** hCaptcha or Cloudflare Turnstile. Phase 2.

### 3. Export Controls — PARTIAL

**Risk:** A compromised MANAGER account exports all campaign contacts.

**Current:** Export requires CAMPAIGN_MANAGER role (Membership.role check). Exports are logged in ActivityLog.

**Missing:** Export frequency limit. No SUPER_ADMIN notification on large exports. Phase 2.

### 4. Upload File Validation — PARTIAL

**Risk:** Malicious file uploaded to gotv/upload or import.

**Current:** File size limit (5MB/10MB via content-length). File type detection by extension.

**Missing:** MIME type validation. Malware scanning. Path traversal check on filename. Phase 2.

### 5. Campaign Data Deletion — NOT IMPLEMENTED

**Risk:** Cannot fully delete a campaign's data on request. GDPR/PIPEDA obligation.

**Required:** Complete wipe of all campaign data including contacts, interactions, logs, GOTV data.

**Implementation:** Cascade delete via Prisma + cleanup job. Phase 1 prerequisite for commercial rollout.

### 6. Session Invalidation on Campaign Switch — PARTIAL

**Risk:** User switches campaign via API but JWT still carries old activeCampaignId until next login.

**Current:** DB is updated (User.activeCampaignId). JWT is stale until re-login.

**Required:** Force JWT refresh on campaign switch. Phase 1 fix.

### 7. Anonymous Poll Voting — Bypassable

**Risk:** VPN user votes multiple times. ipHash is bypassable.

**Accepted for Phase 1.** Not a blocker for internal testing.

**Phase 2 options:** CAPTCHA, one-time anonymous token, user account required for voting on sensitive polls.

---

## Moderation Controls

### Public Q&A

Currently: No moderation. All questions submitted to officials are public by default.

**Required before public launch:**
- isPublic flag defaults to false (pending moderation) — NOT YET SET THIS WAY
- Official or platform moderator approves before public display
- Spam filter on question text
- Rate limit: 3 questions per user per official per day

### Poll Responses

Currently: No content moderation (poll responses are structured values, not free text).

For slider/binary: no text content — no moderation needed.

For future text-response polls: moderation required before public display.

---

## Consent Bridge Controls

### Current enforcement
- userId taken from session — cannot be spoofed
- campaignId must exist and be active
- Minimum fields only transferred
- ActivityLog written on every transfer
- Duplicate signals: idempotent (same user + same campaign + same signal = no duplicate contact record)

### Missing
- User-facing consent revocation UI (ConsentLog model not yet built)
- Rate limit on bridge submissions (user cannot spam volunteer signups)
- Official campaignId verification (any authenticated user can submit a signal to any campaignId — they should only see campaigns they've interacted with)

---

## SQL Injection and Input Safety

All database queries use Prisma ORM with parameterized queries. No raw SQL in application code except:

1. `prisma/setup-indexes.sql` — admin-only, run once during setup
2. No other raw SQL in the codebase

Parameterized queries via Prisma are not vulnerable to SQL injection.

---

## Dependency Security

Production dependencies: 16 packages (as of v1.2.1).
All packages are well-maintained and actively used.

**Recommended:** Run `npm audit` before each production deploy. Fix any HIGH or CRITICAL vulnerabilities before releasing.

Current audit status: Not run in this environment. Run locally before deploy.
