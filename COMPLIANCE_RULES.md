# Poll City — Fundraising Compliance Rules

*Built 2026-04-10. Jurisdiction-configurable. Ontario municipal defaults applied.*
*Rules are policy objects — never hardcoded into business logic.*

---

## Architecture: Compliance as Policy Objects

Every campaign has a compliance configuration stored in a `ComplianceConfig` JSON on `FundraisingCampaign` or fetched from a campaign-level settings record. Rules evaluate at donation creation time and again at manual review.

### ComplianceConfig shape (JSON)
```json
{
  "jurisdiction": "ontario_municipal",
  "annualLimitPerDonor": 1200,
  "singleTransactionLimit": null,
  "anonymousLimit": 25,
  "allowCorporate": false,
  "allowUnion": false,
  "allowForeignNational": false,
  "requireEmployer": false,
  "requireOccupation": false,
  "aggregateByHousehold": false,
  "blockMode": "review",
  "warningThreshold": 0.9,
  "currency": "CAD"
}
```

- `blockMode: "review"` — flags over-limit donations for manual review instead of hard-blocking
- `blockMode: "block"` — hard-blocks the donation attempt
- `warningThreshold: 0.9` — warn at 90% of limit

---

## Rule Set

### R-001 — Annual Donor Limit
**Jurisdiction:** Ontario Municipal Elections Act, s. 88.9
**Default limit:** $1,200 CAD per individual per calendar year per campaign
**Logic:**
1. Sum all `Donation.amount` for `contactId` + `campaignId` + year where `status` NOT IN (cancelled, refunded).
2. If `sum + newAmount > limit`:
   - `blockMode: "review"` → set `complianceStatus = flagged`, add to review queue
   - `blockMode: "block"` → reject with 422 + message
3. If `sum + newAmount > limit * warningThreshold` → set `complianceStatus = flagged` + allow with warning

**Edge case:** Partial refund reduces aggregate. Full refund removes from aggregate entirely.

---

### R-002 — Anonymous Donation Cap
**Default limit:** $25 CAD (Ontario)
**Logic:**
- Donation where `contactId IS NULL` AND `amount > anonymousLimit` → hard block (never review-only)
- Exception: Named in-person cash at event with entry in notes → ADMIN override, audit logged

---

### R-003 — Corporate/Union Ineligibility
**Logic:**
- Contact name or employer containing corporate/union keywords → flag `complianceStatus = flagged`
- Keywords: `inc, corp, ltd, llc, co., company, limited, incorporated, holdings, enterprises, group, union, local, ufcw, cupe, osstf, opseu, unifor, seiu, ibew, iamaw, usw, amalgamated`
- ADMIN/CM can manually exempt with reason (logged to DonorAuditLog)
- `allowCorporate: true` in config bypasses this check

---

### R-004 — Foreign National Restriction
**Logic:**
- If `allowForeignNational: false` (default) and donor address is outside Canada → flag for review
- In-person donations with no address → note only, no hard block
- Stripe Card metadata: billing country checked against `CA`

---

### R-005 — Employer/Occupation Requirement
**Logic:**
- If `requireEmployer: true` AND donation amount > threshold (typically $100+) AND `contact.employer IS NULL` → flag for review
- Does not block online donations — creates task for follow-up

---

### R-006 — Duplicate Payment Detection
**Logic:**
- On Stripe webhook `payment_intent.succeeded`:
  1. Check `Donation.paymentIntentId` for existing record
  2. If found and `status = processed` → reject webhook as duplicate (idempotent, return 200)
  3. If found and `status = pledged` → update to processed (normal flow)
- On manual entry: check `externalTransactionId` uniqueness per campaign

---

### R-007 — Double-Booking (Offline)
**Logic:**
- On manual offline entry: if `contactId` + `amount` + `donationDate` within 5 minutes → warn with conflict flag
- Does not block (operator confirmation required)
- Logged to DonorAuditLog as `suspected_duplicate`

---

### R-008 — Recurring Payment Failure
**Logic:**
- On Stripe `invoice.payment_failed`:
  1. Update `RecurrencePlan.status = failed`
  2. Create `Donation` record with `donationStatus = failed`
  3. Trigger automation: `recurring_payment_failed` → contact email
  4. After 3 consecutive failures → `RecurrencePlan.status = cancelled`

---

### R-009 — Refund After Limit Aggregation
**Logic:**
- On Refund processed: recalculate `DonorProfile.lifetimeGiving`
- On partial refund: subtract `refundAmount` from donor annual aggregate
- On full refund: remove donation amount from donor annual aggregate entirely
- Re-evaluate compliance status of any subsequent donations that were in `flagged` state due to this donor's aggregate

---

### R-010 — Receipt Before Finalization
**Logic:**
- `DonationReceipt` cannot be generated if `Donation.donationStatus = pledged` or `failed`
- Receipt generation allowed only for `processed` or `receipted` status
- If receipt sent in error on a reversal → void receipt, create new receipt noting correction

---

## Review Queue Workflow

1. Donation flagged → `complianceStatus = flagged`, `donationStatus` stays as-is
2. Appears in `/fundraising/compliance` queue
3. CM/ADMIN reviews donor history, documentation
4. Actions:
   - **Approve** → `complianceStatus = approved`, donation proceeds normally
   - **Exempt** → `complianceStatus = exempted`, reason required, logged
   - **Block** → `complianceStatus = blocked`, `donationStatus = cancelled`, donor notified
5. All decisions logged to `DonorAuditLog` with `actorUserId` + `oldValueJson` + `newValueJson`

---

## Warning vs Blocking Rules

| Rule | Warning Mode | Block Mode |
|------|-------------|------------|
| Over annual limit | ✓ (if blockMode=review) | ✓ (if blockMode=block) |
| Anonymous over cap | ✗ | Always blocks |
| Corporate/union flag | ✓ | ✓ (if allowCorporate=false + blockMode=block) |
| Foreign national | ✓ | ✓ (configurable) |
| Duplicate payment | ✗ | Always blocks (idempotency) |
| Double-offline-entry | ✓ (warn only) | Never blocks |
| Missing employer | ✓ | Never blocks |
| Receipt before finalized | ✗ | Always blocks |

---

## Audit Requirements

Every compliance decision (approve/block/exempt/override) writes to `DonorAuditLog`:
- `entityType: "Donation" | "DonorProfile"`
- `action: "compliance_approved" | "compliance_blocked" | "compliance_exempted" | "limit_override"`
- `oldValueJson`: previous complianceStatus + donor aggregate
- `newValueJson`: new complianceStatus + reason
- `actorUserId`: user who made the decision
- `createdAt`: timestamp (immutable)

DonorAuditLog records are never soft-deleted. They are immutable by design.

---

## Ontario Municipal Defaults (Elections Act Reference)

| Parameter | Default | Source |
|-----------|---------|--------|
| Annual limit per individual | $1,200 | MEA s. 88.9(1) |
| Anonymous cap | $25 | MEA s. 88.9(6) |
| Corporate contributions | Prohibited | MEA s. 88.9(3) |
| Union contributions | Prohibited | MEA s. 88.9(3) |
| Foreign national | Prohibited | MEA s. 88.9(4) |
| Contribution period | Calendar year | MEA s. 88.9 |

*Always verify current limits with Elections Ontario before each election cycle.*
*These defaults are configurable per campaign and do not constitute legal advice.*
