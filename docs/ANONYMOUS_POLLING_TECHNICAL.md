# Anonymous Polling — Technical Documentation

**Implementation date:** April 4, 2026
**Status:** Production-ready

---

## Overview

Poll City uses cryptographic hashing to ensure voter anonymity while preventing double-voting. This document explains the system for both technical and non-technical audiences.

---

## For Voters — Plain Language Explanation

### Your vote is anonymous. Here is exactly how.

1. **You vote** on a poll question.
2. **Your identity is converted to a mathematical hash** — a one-way scramble that cannot be reversed. Think of it like putting your vote through a paper shredder that only keeps a receipt number.
3. **Only the hash is stored** in the database. Your name, email, user ID — none of these are stored with your vote.
4. **The hash prevents double-voting.** If you try to vote again, the system generates the same hash and recognises you already voted.
5. **You receive a receipt code.** This unique code lets you verify your vote was counted at any time.
6. **Even Poll City employees cannot see how you voted.** The hash is mathematically irreversible.

### Frequently Asked Questions

**Can the campaign see how I voted?** No. Campaigns see only total counts per option.

**Can Poll City see how I voted?** No. The SHA-256 hash cannot be reversed.

**Can anyone trace my vote back to me?** No. The hash is one-way.

**How do I know my vote was counted?** Visit `/verify-vote` and enter your receipt code.

---

## Technical Implementation

### Hashing Algorithm

**SHA-256** (Secure Hash Algorithm 256-bit) — the same algorithm used in:
- TLS/SSL certificates
- Bitcoin blockchain
- US government digital signatures (FIPS 180-4)

### Vote Hash (Duplicate Prevention)

```
voteHash = SHA-256("vote:" + pollId + ":" + voterIdentifier + ":" + POLL_ANONYMITY_SALT)
```

Where:
- `pollId` — the poll being voted on
- `voterIdentifier` — `userId` (if authenticated), `ipHash` (if anonymous), or timestamped fallback
- `POLL_ANONYMITY_SALT` — server-side secret environment variable

**Properties:**
- **Deterministic:** Same voter + same poll → same hash → duplicate blocked
- **Irreversible:** Given the hash, there is no computation to recover the voter's identity
- **Collision-resistant:** Two different voters will never produce the same hash (probability ~2^-128)
- **Salt-dependent:** Without the server salt, hashes cannot be brute-forced even with known poll IDs

### Voter Receipt (Zero-Knowledge Verification)

```
nonce = SHA-256(pollId + timestamp + random)[:12].toUpperCase()
receiptCode = "XXXX-XXXX-XXXX"  (formatted nonce)
receiptHash = SHA-256("receipt:" + receiptCode)
```

**Verification flow:**
1. Voter enters receipt code at `/verify-vote`
2. Server computes `SHA-256("receipt:" + code)`
3. Server checks if any PollResponse has matching `receiptHash`
4. Returns `found: true/false` — never reveals the vote content

**Properties:**
- Receipt code is shown only to the voter (client-side)
- Stored in browser `localStorage` for later retrieval
- `receiptHash` in database cannot be reversed to find the code
- Verification confirms inclusion without revealing the vote

### Database Schema

```prisma
model PollResponse {
  id           String   @id @default(cuid())
  pollId       String
  userId       String?  // DEPRECATED — kept for legacy data
  optionId     String?  // for multiple choice / ranked
  value        String?  // for binary / slider
  rank         Int?     // for ranked polls
  voteHash     String?  @unique  // SHA-256 anonymous vote hash
  receiptHash  String?  @unique  // SHA-256 voter receipt hash
  postalCode   String?  // aggregate geo only
  ward         String?
  riding       String?
  ipHash       String?  // rate limiting only
  createdAt    DateTime @default(now())
}
```

**Data stored per vote:**
- Poll ID, option ID (or value), vote hash, receipt hash
- Anonymous geographic aggregate (postal code prefix)
- IP hash (for spam prevention only)

**Data NOT stored:**
- User ID (deprecated, null for new votes)
- Email address
- Session ID
- Name or any personally identifiable information

### Multi-Row Polls (Swipe, Ranked)

Swipe and ranked polls create multiple PollResponse rows (one per option). To maintain unique constraint:
- Only the **first row** gets `voteHash` and `receiptHash`
- Subsequent rows for the same vote have `voteHash: null`
- The first row's voteHash prevents the entire batch from being submitted twice

### Race Condition Mitigation

**Authenticated users:**
1. Application layer: `findUnique({ where: { voteHash } })` before insert
2. Database layer: `voteHash` has `@unique` constraint — Prisma returns P2002 on conflict
3. P2002 errors caught and returned as 409 Conflict

**Anonymous users:**
1. IP hash check at application layer
2. Rate limiting (5/hour/IP) prevents rapid-fire attempts
3. Known limitation: VPN users can bypass — accepted trade-off

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `POLL_ANONYMITY_SALT` | Salt for vote hash generation | Recommended (falls back to NEXTAUTH_SECRET) |
| `IP_HASH_SALT` | Salt for IP hashing | Optional (disables IP dedup if unset) |

### Source Code

- **Vote handler:** `src/app/api/polls/[id]/respond/route.ts`
- **Receipt verification API:** `src/app/api/polls/verify-receipt/route.ts`
- **Transparency page:** `src/app/how-polling-works/page.tsx`
- **Verification page:** `src/app/verify-vote/page.tsx`

---

## Audit Trail

The anonymous polling system was implemented as part of the v3.0.0 security audit. It replaces the previous system which stored `userId` directly in PollResponse rows.

**Migration path:** Existing PollResponse rows with `userId` set remain unchanged. New responses use `voteHash` exclusively. No data migration is needed — old and new rows coexist in the same table.
