# Poll City — Connection Map
## The User Journey Passport

Every major user action. Every downstream effect. Honest status.

**Legend:**
- ✓ CONNECTED — wired, tested, confirmed
- ⚠ PARTIAL — wired but incomplete
- ✗ NOT CONNECTED — should exist, does not
- — NOT BUILT — feature not yet built

*Last updated: 2026-04-08 by Claude Sonnet 4.6 — Priority #7 wired*
*Read CLAUDE.md → THE BUILD CYCLE before touching anything in this file.*

---

## CONTACT ACTIONS

### Create Contact (manual)
| Effect | Status | Notes |
|--------|--------|-------|
| Contact record created | ✓ CONNECTED | |
| ActivityLog entry | ✓ CONNECTED | |
| Funnel stage initialized | ✓ CONNECTED | |
| Duplicate check by email | ✗ NOT CONNECTED | silently creates duplicate |
| Duplicate check by phone | ✗ NOT CONNECTED | silently creates duplicate |

### Import Contacts (CSV)
| Effect | Status | Notes |
|--------|--------|-------|
| Contact records created | ✓ CONNECTED | |
| importSource = "csv" | ✓ CONNECTED | |
| Custom field values set | ✓ CONNECTED | |
| Duplicate detection by email | ✓ CONNECTED | wired 2026-04-08 — pre-load Map, case-insensitive |
| Duplicate detection by phone | ✓ CONNECTED | wired 2026-04-08 — normalized to last 10 digits |
| Merge with existing contact | ✓ CONNECTED | fills blank fields, does not overwrite |
| lastContactedAt set | ✗ NOT CONNECTED | stays null |
| ActivityLog entry | ✓ CONNECTED | |

### Update Contact (support level change)
| Effect | Status | Notes |
|--------|--------|-------|
| Contact.supportLevel updated | ✓ CONNECTED | |
| ActivityLog entry | ✓ CONNECTED | |
| GOTV priority list recalculates | ✗ NOT CONNECTED | stale until manual refresh |
| Funnel stage advances | ✗ NOT CONNECTED | no automatic advance on support change |
| Canvasser notified of change | ✗ NOT CONNECTED | |

### Mark Do Not Contact
| Effect | Status | Notes |
|--------|--------|-------|
| contact.doNotContact = true | ✓ CONNECTED | |
| NewsletterSubscriber unsubscribed | ✓ CONNECTED | |
| SMS opt-out recorded | ✗ NOT CONNECTED | no SMS opt-out table updated |
| Voice broadcast excluded | ✓ CONNECTED | CRTC compliance added 2026-04-08 |
| ActivityLog entry | ✗ NOT CONNECTED | no audit trail |

---

## CANVASSING / DOOR KNOCK

### Log Interaction at Door
| Effect | Status | Notes |
|--------|--------|-------|
| Interaction record created | ✓ CONNECTED | |
| contact.supportLevel updated | ✓ CONNECTED | |
| contact.lastContactedAt updated | ✓ CONNECTED | |
| contact.issues updated | ✓ CONNECTED | |
| contact.signRequested updated | ✓ CONNECTED | |
| contact.volunteerInterest updated | ✓ CONNECTED | |
| contact.followUpNeeded updated | ✓ CONNECTED | |
| Funnel advances (supporter/volunteer) | ✓ CONNECTED | |
| ActivityLog entry | ✓ CONNECTED | |
| TurfStop.visited marked | ✓ CONNECTED | wired 2026-04-08 — updateMany by contactId, non-fatal |
| GOTV priority recalculates | ✗ NOT CONNECTED | |
| Auto-create volunteer profile if interested | ✗ NOT CONNECTED | manual step required |

### Walk List Created
| Effect | Status | Notes |
|--------|--------|-------|
| CanvassList record created | ✓ CONNECTED | |
| ActivityLog entry | ✓ CONNECTED | |
| Contacts auto-assigned from filters | ✗ NOT CONNECTED | manual assignment required |

---

## COMMUNICATIONS

### Email Blast Sent
| Effect | Status | Notes |
|--------|--------|-------|
| Campaign status = sent | ✓ CONNECTED | |
| sentCount / bounceCount tallied | ✓ CONNECTED | |
| Resend delivery | ✓ CONNECTED | |
| contact.lastContactedAt updated | ✓ CONNECTED | wired 2026-04-08 — batch updateMany by email |
| Bounced contacts flagged | ✓ CONNECTED | wired 2026-04-08 — emailBounced flag, campaign-scoped, does NOT set doNotContact |
| Unsubscribe → contact.doNotContact | ⚠ PARTIAL | updates newsletterSubscriber but not contact |

### SMS Blast Sent
| Effect | Status | Notes |
|--------|--------|-------|
| NotificationLog created | ✓ CONNECTED | |
| Delivery count tracked | ✓ CONNECTED | |
| contact.lastContactedAt updated | ✓ CONNECTED | wired 2026-04-08 — batch updateMany by id |
| Failed delivery flagged on contact | ✗ NOT CONNECTED | |
| doNotContact contacts excluded | ✓ CONNECTED | |

### Newsletter Unsubscribe
| Effect | Status | Notes |
|--------|--------|-------|
| NewsletterSubscriber.status = unsubscribed | ✓ CONNECTED | |
| unsubscribedAt set | ✓ CONNECTED | |
| contact.doNotContact = true | ✓ CONNECTED | |
| SMS opt-out updated | ✗ NOT CONNECTED | no smsOptOut field on Contact model — needs schema field |
| ActivityLog entry | ✗ NOT CONNECTED | public endpoint has no userId — ActivityLog requires FK to User |

---

## DONATIONS

### Donation Recorded
| Effect | Status | Notes |
|--------|--------|-------|
| Donation record created/updated | ✓ CONNECTED | |
| ActivityLog entry | ✓ CONNECTED | |
| Receipt email sent | ✓ CONNECTED | wired 2026-04-08 — Ontario MEA compliant, via Resend |
| contact.supportLevel updated | ✗ NOT CONNECTED | donors should be at minimum leaning_support |
| Funnel advances to "donor" | ✓ CONNECTED | already wired in quick-capture (advanceFunnel) |
| contact.lastContactedAt updated | ✓ CONNECTED | wired 2026-04-08 — set when receipt email sent |
| doNotContact check before recording | ✗ NOT CONNECTED | |
| Major donation ($500+) → superSupporter | ✓ CONNECTED | lifecycle automation handles this |

---

## VOLUNTEERS

### Volunteer Profile Created
| Effect | Status | Notes |
|--------|--------|-------|
| VolunteerProfile record created | ✓ CONNECTED | |
| Funnel advances to "volunteer" | ✓ CONNECTED | |
| ActivityLog entry | ✓ CONNECTED | |
| User account linked | ✗ NOT CONNECTED | relies on pre-existing user |

### Volunteer Shift Check-In
| Effect | Status | Notes |
|--------|--------|-------|
| ShiftSignup.status = attended | ✓ CONNECTED | |
| volunteerProfile.totalHours incremented | ✓ CONNECTED | |
| ActivityLog entry | ✓ CONNECTED | |
| contact.lastContactedAt updated | ✗ NOT CONNECTED | shift check-in doesn't touch contact record |
| Milestone recognition (10/25/50 hrs) | ⚠ PARTIAL | lifecycle cron creates task but doesn't notify |

---

## EVENTS

### Event RSVP — Public Form
| Effect | Status | Notes |
|--------|--------|-------|
| EventRsvp record created | ✓ CONNECTED | |
| Contact found or created | ✓ CONNECTED | |
| Contact tagged "event-rsvp" | ✓ CONNECTED | |
| Interaction logged | ✓ CONNECTED | |
| Confirmation email sent | ✓ CONNECTED | |
| Funnel advance | ✗ NOT CONNECTED | updateEngagement() called but no advanceFunnel() |

### Event RSVP — Staff Entry
| Effect | Status | Notes |
|--------|--------|-------|
| EventRsvp record created | ✓ CONNECTED | waitlist logic included |
| Contact record updated | ✓ CONNECTED | wired 2026-04-08 — lastContactedAt, tag, resolves by email |
| ActivityLog entry | ✓ CONNECTED | wired 2026-04-08 |
| Funnel advance | ✓ CONNECTED | wired 2026-04-08 — advances to supporter |
| Confirmation email to attendee | ✗ NOT CONNECTED | |

---

## GOTV

### Voted List Upload
| Effect | Status | Notes |
|--------|--------|-------|
| contact.voted = true | ✓ CONNECTED | |
| contact.votedAt set | ✓ CONNECTED | |
| Gap recalculated | ✓ CONNECTED | |
| ActivityLog entry | ✓ CONNECTED | |
| Funnel advances to "voter" | ✓ CONNECTED | wired 2026-04-08 — bulkAdvanceFunnel |
| Canvassers notified (their supporter voted) | ✗ NOT CONNECTED | |

---

## SIGNS

### Sign Request (public form)
| Effect | Status | Notes |
|--------|--------|-------|
| contact.signRequested = true | ✓ CONNECTED | |
| Contact tagged "sign-requested" | ✓ CONNECTED | |
| Deploy task auto-created | ✓ CONNECTED | |
| Interaction logged | ✓ CONNECTED | |

### Sign Installed
| Effect | Status | Notes |
|--------|--------|-------|
| Sign.status = installed | ✓ CONNECTED | |
| Notification sent | ✓ CONNECTED | |
| contact.signPlaced = true | ✓ CONNECTED | wired 2026-04-08 |
| contact.supportLevel escalated | ✓ CONNECTED | wired 2026-04-08 — escalates to strong_support, never downgrades |
| contact.lastContactedAt updated | ✓ CONNECTED | wired 2026-04-08 |

---

## LIFECYCLE AUTOMATION (nightly cron)

| Automation | Status | Notes |
|-----------|--------|-------|
| Stale pledge follow-up task | ✓ CONNECTED | |
| Major donation → superSupporter + task | ✓ CONNECTED | |
| Volunteer milestone tasks | ✓ CONNECTED | |
| Overdue task notifications | ✓ CONNECTED | |
| Election countdown reminders | ✓ CONNECTED | |
| followUpDate reached → task | ✓ CONNECTED | |
| No-show volunteer → review task | ✓ CONNECTED | |
| Automated outreach messages sent | ✗ NOT CONNECTED | tasks only, no actual messages |
| Long-inactive contacts flagged | ✗ NOT CONNECTED | |
| Sign requested 60+ days → escalation | ✗ NOT CONNECTED | |
| ActivityLog for cron run | ✗ NOT CONNECTED | no record of what ran |

---

## PRIORITY BUILD ORDER
*Based on downstream damage — fix root causes first*

| # | Connection to wire | Why it matters |
|---|-------------------|----------------|
| 1 | ✓ contact.lastContactedAt on email/SMS/task complete | DONE 2026-04-08 |
| 2 | ✓ CSV import deduplication by email + phone | DONE 2026-04-08 |
| 3 | ✓ Donation receipt email | DONE 2026-04-08 — Ontario MEA compliant |
| 4 | ✓ Donation → funnel advance to donor | DONE — was already wired in quick-capture |
| 5 | ✓ Voted upload → funnel advance to voter | DONE 2026-04-08 |
| 6 | ✓ Staff event RSVP → contact update + funnel | DONE 2026-04-08 |
| 7 | ✓ TurfStop.visited on door knock | DONE 2026-04-08 |
| 8 | ✓ Email bounce → contact flag | DONE 2026-04-08 — emailBounced field, campaign-scoped |
| 9 | ✓ Sign installed → contact.signPlaced + support escalation | DONE 2026-04-08 |
| 10 | ⚠ Unsubscribe → SMS opt-out + ActivityLog | PARTIAL — deletedAt filter fixed; SMS/ActivityLog blocked by missing schema fields |

---

*This file is the truth. If code and this file disagree, fix the code.*
*Updated every session. Never let it fall behind.*
