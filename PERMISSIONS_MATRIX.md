# Poll City — Fundraising Suite Permissions Matrix

*Built 2026-04-10. Applies to all routes under /api/fundraising/ and /fundraising UI.*
*Enforced via `apiAuth()` + `guardCampaignRoute()`. Never client-side.*

---

## Role Definitions

| Role | Abbr | Description |
|------|------|-------------|
| SUPER_ADMIN | SA | Platform owner — full access all campaigns |
| CAMPAIGN_MANAGER | CM | Full campaign control — all fundraising actions |
| ADMIN | AD | Elevated campaign staff — most actions |
| VOLUNTEER | VL | Canvasser / field staff — capture only |
| VIEWER | VW | Read-only access |

---

## Donations

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View all donations | ✓ | ✓ | ✓ | own | ✓ |
| View donation detail | ✓ | ✓ | ✓ | own | ✓ |
| Create online donation (Stripe) | ✓ | ✓ | ✓ | ✓ | ✗ |
| Create offline donation (cash/cheque) | ✓ | ✓ | ✓ | ✓ | ✗ |
| Edit donation notes | ✓ | ✓ | ✓ | own | ✗ |
| Change donation status | ✓ | ✓ | ✓ | ✗ | ✗ |
| Approve donation | ✓ | ✓ | ✓ | ✗ | ✗ |
| Soft delete donation | ✓ | ✓ | ✓ | ✗ | ✗ |
| Export donation ledger CSV | ✓ | ✓ | ✓ | ✗ | ✗ |
| Bulk status update | ✓ | ✓ | ✗ | ✗ | ✗ |
| View metadataJson (raw) | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## Donor Profiles

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View donor list | ✓ | ✓ | ✓ | ✗ | ✓ |
| View donor detail | ✓ | ✓ | ✓ | ✗ | ✓ |
| Edit donor notes | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit donor tier | ✓ | ✓ | ✗ | ✗ | ✗ |
| View riskFlagsJson | ✓ | ✓ | ✓ | ✗ | ✗ |
| Merge donor profiles | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## Fundraising Campaigns (Initiatives)

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View list | ✓ | ✓ | ✓ | ✗ | ✓ |
| Create | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit | ✓ | ✓ | ✓ | ✗ | ✗ |
| Pause / archive | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## Donation Pages

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View list | ✓ | ✓ | ✓ | ✗ | ✓ |
| Create | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit / publish | ✓ | ✓ | ✓ | ✗ | ✗ |
| Pause / archive | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete (soft) | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## Recurring Plans

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View all plans | ✓ | ✓ | ✓ | ✗ | ✗ |
| Create plan | ✓ | ✓ | ✓ | ✗ | ✗ |
| Pause plan | ✓ | ✓ | ✓ | ✗ | ✗ |
| Cancel plan | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit plan amount | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## Pledges

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View pledges | ✓ | ✓ | ✓ | ✗ | ✓ |
| Create pledge | ✓ | ✓ | ✓ | ✓ | ✗ |
| Mark fulfilled | ✓ | ✓ | ✓ | ✗ | ✗ |
| Cancel pledge | ✓ | ✓ | ✓ | ✗ | ✗ |

---

## Refunds

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View refund list | ✓ | ✓ | ✓ | ✗ | ✗ |
| Initiate refund request | ✓ | ✓ | ✓ | ✗ | ✗ |
| Approve refund | ✓ | ✓ | ✗ | ✗ | ✗ |
| Process refund (Stripe) | ✓ | ✓ | ✗ | ✗ | ✗ |
| View full refund history | ✓ | ✓ | ✓ | ✗ | ✗ |

---

## Receipts

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View receipt list | ✓ | ✓ | ✓ | ✗ | ✗ |
| Generate receipt | ✓ | ✓ | ✓ | ✗ | ✗ |
| Resend receipt | ✓ | ✓ | ✓ | ✗ | ✗ |
| Void receipt | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## Reconciliation

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View reconciliation list | ✓ | ✓ | ✓ | ✗ | ✗ |
| Run reconciliation | ✓ | ✓ | ✓ | ✗ | ✗ |
| Mark as reconciled | ✓ | ✓ | ✗ | ✗ | ✗ |
| Export reconciliation report | ✓ | ✓ | ✓ | ✗ | ✗ |

---

## Compliance

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View compliance queue | ✓ | ✓ | ✓ | ✗ | ✗ |
| Approve flagged donation | ✓ | ✓ | ✗ | ✗ | ✗ |
| Block donation | ✓ | ✓ | ✗ | ✗ | ✗ |
| Exempt from limit | ✓ | ✓ | ✗ | ✗ | ✗ |
| View contribution limit config | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit contribution limits | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## Reports + Analytics

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View fundraising dashboard | ✓ | ✓ | ✓ | ✗ | ✓ |
| View detailed reports | ✓ | ✓ | ✓ | ✗ | ✗ |
| Export reports | ✓ | ✓ | ✓ | ✗ | ✗ |
| View attribution data | ✓ | ✓ | ✓ | ✗ | ✗ |

---

## Donation Sources + UTM

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View sources | ✓ | ✓ | ✓ | ✗ | ✗ |
| Create source | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit source | ✓ | ✓ | ✓ | ✗ | ✗ |
| Deactivate source | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## Audit Trail

| Action | SA | CM | AD | VL | VW |
|--------|----|----|----|----|-----|
| View donor audit log | ✓ | ✓ | ✓ | ✗ | ✗ |
| Export audit log | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## Enforcement Notes

1. All routes use `apiAuth(req)` — unauthenticated = 401.
2. All routes check `membership.findUnique({ userId, campaignId })` — non-member = 403.
3. Donation reads always include `deletedAt: null`.
4. Refund approval and compliance overrides require explicit role check (`membership.role === "CAMPAIGN_MANAGER" || session.user.role === "SUPER_ADMIN"`).
5. Stripe webhook routes (`/api/webhooks/stripe`) bypass session auth — verified by Stripe signature header.
6. Public donation pages (`/give/[slug]`) require no auth — rate limited at `rateLimit(req, "api")`.
