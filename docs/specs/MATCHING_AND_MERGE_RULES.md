# Poll City CRM — Matching and Merge Rules

*Last updated: 2026-04-10. Governs all identity resolution, deduplication, and merge operations.*

---

## 1. Matching Philosophy

Identity resolution is a spectrum, not a binary. Two records may be the same person with 95% confidence or 45% confidence. We act differently at each tier.

**The Golden Rule:** When in doubt, flag for human review. Never auto-merge without 100% signal certainty. A wrong merge is worse than a duplicate.

---

## 2. Confidence Tiers

| Tier | Score | Signals Required | Action |
|------|-------|-----------------|--------|
| **EXACT** | 95–100 | Identical normalized email OR identical normalized phone | Auto-create DuplicateCandidate. UI shows as "Exact Match — High Confidence." Merge requires one-click confirmation. |
| **HIGH** | 80–94 | Two or more strong signals (name score > 0.88 + same address, or email + name partial match) | Auto-create DuplicateCandidate. Requires review. |
| **MEDIUM** | 60–79 | One strong signal + one weak signal (name score 0.75-0.87 + same postal code) | Auto-create DuplicateCandidate. Surfaces in review queue. |
| **LOW** | 40–59 | Single weak signal (name score only, no contact info match) | Do NOT auto-create DuplicateCandidate. Available only in manual "Find Duplicates" scan. |

---

## 3. Signal Weights

Each signal contributes a score used to calculate the overall confidence score.

| Signal | Max Points | Notes |
|--------|-----------|-------|
| Exact normalized email match | 50 | `toLowerCase().trim()` normalized |
| Exact normalized phone match | 45 | Last 10 digits, strip formatting |
| Name Jaro-Winkler score > 0.95 | 25 | Handles typos, middle names |
| Name Jaro-Winkler score 0.85-0.94 | 15 | Likely match |
| Exact normalized address match | 20 | Full address normalized |
| Same postal code | 5 | Weak signal alone |
| Same ward | 3 | Very weak alone |
| Same household | -30 | Penalty: household co-members should NOT be merged |
| Both marked as deceased | +10 | Increases confidence, does not trigger merge |
| Existing DNC on one only | No impact | DNC status is not a deduplication signal |

**Total score formula:** Sum of all matching signals. Capped at 100. Subtract household penalty if applicable.

---

## 4. Normalization Rules

Before any comparison, ALL fields must be normalized:

### Email Normalization
```
email.toLowerCase().trim()
```
Gmail: strip dots and plus-aliases — `j.smith+test@gmail.com` → `jsmith@gmail.com`

### Phone Normalization
```
strip all non-digits
take last 10 digits
```
`(416) 555-1234` → `4165551234`
`+1-416-555-1234` → `4165551234`

### Name Normalization
```
firstName.toLowerCase().trim()
lastName.toLowerCase().trim()
strip punctuation
```
Apply Jaro-Winkler similarity for comparison, not equality.
Common nickname expansions: Jon/Jonathan, Bob/Robert, Bill/William, Liz/Elizabeth, etc.

### Address Normalization
```
toLowerCase().trim()
expand: St → Street, Ave → Avenue, Rd → Road, Blvd → Boulevard
strip unit/apt prefix for primary match: "Unit 2" / "Apt 4B" normalized separately
```

---

## 5. Merge Survivor Selection

When a merge is confirmed, the **survivor record** retains the merged identity. The **absorbed record** is soft-deleted.

### Field Resolution Rules

| Field | Rule |
|-------|------|
| `firstName`, `lastName` | Explicit user choice — no default |
| `email` | Explicit user choice; if one is bounced, prefer non-bounced |
| `phone`, `phone2` | Explicit user choice; if one is verified, prefer verified |
| `address1`–`postalCode` | Explicit user choice |
| `supportLevel` | Explicit user choice — never auto-resolved |
| `doNotContact` | **Always take TRUE** — most restrictive wins |
| `smsOptOut` | **Always take TRUE** — most restrictive wins |
| `emailBounced` | **Always take TRUE** — most restrictive wins |
| `isDeceased` | **Always take TRUE** — most restrictive wins |
| `volunteerInterest` | Take TRUE if either is TRUE |
| `signRequested` | Take TRUE if either is TRUE |
| `notes` | Concatenate (survivor notes first, absorbed notes appended with separator) |
| `tags` | Union of both tag sets |
| `issues` | Union of both issue arrays |
| `funnelStage` | Most advanced stage wins |
| `gotvStatus` | Explicit user choice |
| `confidenceScore` | Average of both scores |
| `createdAt` | Oldest record date preserved |
| `externalId` | Survivor's value preserved; absorbed stored in MergeHistory |
| `importSource` | Survivor's value preserved |

### Relation Re-pointing

All relations are re-pointed to the survivor record:
- `Interaction` (contactId → survivorId)
- `Task` (contactId → survivorId)
- `Donation` (contactId → survivorId)
- `Sign` (contactId → survivorId)
- `EventRsvp` (contactId → survivorId)
- `GotvRecord` (contactId → survivorId)
- `ContactNote` (contactId → survivorId)
- `ContactRelationship` (fromContactId/toContactId → survivorId, dedupe by type)
- `ContactRoleProfile` (merge: if both have same roleType, keep survivor's; add absorbed's unique roles)
- `SupportProfile` (explicit field decisions or keep survivor's)
- `AssignmentStop` (contactId → survivorId)
- `TurfStop` (contactId → survivorId)
- `VoiceBroadcastCall` (contactId → survivorId)
- `VolunteerProfile` (if both exist: keep survivor's; log absorbed profile in MergeHistory)

---

## 6. Protected Merge Conditions (Never Auto-Merge)

The following conditions BLOCK automatic merge and REQUIRE explicit admin confirmation with a typed "MERGE" confirmation:

1. Both contacts have existing Stripe payment history (donation.paymentIntentId is not null on either)
2. Both contacts have active VolunteerProfile records
3. Either contact has interactions from the last 30 days
4. Either contact has a signed event RSVP (status = "going" or "checked_in") for an upcoming event
5. The absorbed contact has `doNotContact = true` and the survivor does not (warn: survivor will be DNC after merge)

---

## 7. Auto-Link vs Review

| Scenario | Auto-link? | Create DuplicateCandidate? |
|----------|-----------|--------------------------|
| Import detects exact email match | No | Yes (confidence=exact) |
| Import detects exact phone match | No | Yes (confidence=exact) |
| Import detects HIGH confidence match | No | Yes (confidence=high) |
| Import detects MEDIUM confidence match | No | Yes (confidence=medium) |
| Import detects LOW confidence match | No | No (available in manual scan only) |
| Manual "scan for duplicates" invoked | N/A | Creates all tiers including low |

**We never auto-link or auto-merge.** Every merge requires a human decision. Every auto-link goes through the review queue.

---

## 8. Unmerge Safeguards

Merges cannot be fully reversed. However:

1. `MergeHistory.absorbedSnapshotJson` contains the complete contact record at time of merge
2. Admins can manually create a new contact from the snapshot if needed
3. Interaction history cannot be cleanly split post-merge (all records point to survivor)
4. This limitation is shown to the user BEFORE confirming any merge

UI warning (shown at top of merge modal):
> **Merges are permanent.** All interaction history, donations, and timeline entries will be combined. A snapshot of the absorbed contact is saved, but history cannot be cleanly separated after merging. Proceed only if you are certain these are the same person.

---

## 9. Deduplication at Import

Every contact import runs these checks in order:

1. Normalize email + phone for all incoming rows
2. Load existing contacts (email set + phone set) into memory maps
3. For each incoming row:
   a. Exact email match → create DuplicateCandidate(confidence=exact), DO NOT create new contact OR update existing
   b. Exact phone match → create DuplicateCandidate(confidence=exact), DO NOT create new contact OR update existing
   c. No exact match → run name+address heuristic against top-N existing contacts in same postal code
   d. HIGH or MEDIUM confidence → create DuplicateCandidate, create new contact with note "Possible duplicate — review"
   e. No match → create new contact

Import result report shows:
- Created: N
- Matched (exact): N (review required)
- Possible duplicates (high/medium): N
- Failed rows: N (with reasons)

---

## 10. Ongoing Duplicate Detection

Beyond import, duplicates can arise from:
- Canvass captures (new contact added at door)
- Form submissions (public signup form)
- Event RSVPs
- Donation records

Each of these creation paths runs the same email+phone exact-match check and creates DuplicateCandidate rows if matches found.

A background deduplication scan (POST /api/crm/duplicates/scan) runs name+address heuristic across all contacts in a campaign. This is a manual-trigger operation (expensive) run by ADMIN users when data quality is suspected to be low.
