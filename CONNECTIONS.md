# Poll City — Connection Map
## The User Journey Passport

Every major user action. Every downstream effect. Honest status.

**Legend:**
- ✓ CONNECTED — wired, tested, confirmed
- ⚠ PARTIAL — wired but incomplete
- ✗ NOT CONNECTED — should exist, does not
- — NOT BUILT — feature not yet built

*Last updated: 2026-04-11 (session 5) by Claude Sonnet 4.6 — client provisioning, self-service signup, invite flow, unified ops client manager*
*Read CLAUDE.md → THE BUILD CYCLE before touching anything in this file.*

---

## CLIENT ONBOARDING — SELF-SERVICE SIGNUP (/signup)

### New candidate creates their own account
| Effect | Status | Notes |
|--------|--------|-------|
| User record created (role: ADMIN) | ✓ CONNECTED | POST /api/auth/register — bcrypt hash, validatePassword policy enforced |
| Duplicate email check | ✓ CONNECTED | 409 returned with "sign in instead" message |
| Rate limited | ✓ CONNECTED | rateLimit("auth") — same bucket as login/reset |
| ActivityLog: user.register | ✓ CONNECTED | registrationMethod: "self-service" |
| Auto sign-in after registration | ✓ CONNECTED | signIn("credentials") called client-side immediately after success |
| Redirect to /campaigns/new | ✓ CONNECTED | client pushed to campaign creation wizard |
| Campaign creation wizard | ✓ CONNECTED | existing /campaigns/new flow (province→municipality→ward, official matching) |
| Post-creation 3-step setup (fields, issues, colors) | ✓ CONNECTED | existing /campaigns/new post-creation wizard |
| SetupWizardGate fires on dashboard | ✓ CONNECTED | onboardingComplete = false on new campaigns |

---

## CLIENT ONBOARDING — GEORGE PROVISIONS A CLIENT (/ops/clients)

### George provisions a new client campaign
| Effect | Status | Notes |
|--------|--------|-------|
| User created (new) or found (existing) | ✓ CONNECTED | POST /api/ops/provision — finds by email, creates placeholder account if new |
| Campaign created with unique slug | ✓ CONNECTED | slugify + collision suffix loop |
| Membership created (role: ADMIN) | ✓ CONNECTED | checked for duplicate before insert |
| activeCampaignId set for new users | ✓ CONNECTED | set at provision time so wizard gate fires on first login |
| ClientInviteToken created (7-day expiry) | ✓ CONNECTED | stored in client_invite_tokens table |
| Invite email sent via Resend | ✓ CONNECTED | branded HTML email with "Activate My Account" CTA |
| Resend not configured | ✓ CONNECTED | provision still succeeds — inviteUrl returned for manual sharing |
| Email send failure | ✓ CONNECTED | provision still succeeds — inviteUrl returned for manual sharing |
| ActivityLog: client.provisioned | ✓ CONNECTED | records adminEmail, campaignName, isNewUser, emailSent |
| New client row appears in /ops/clients | ✓ CONNECTED | loadClients() fires after successful provision |
| Existing user added to new campaign | ✓ CONNECTED | finds by email, adds membership, sends invite |
| SUPER_ADMIN only | ✓ CONNECTED | role check at start of route |

### George resends invite
| Effect | Status | Notes |
|--------|--------|-------|
| All pending tokens for user+campaign revoked | ✓ CONNECTED | updateMany status → "revoked" |
| New token issued (7-day expiry) | ✓ CONNECTED | |
| New invite email sent | ✓ CONNECTED | "Reminder" subject line |
| User already activated (lastLoginAt set) | ✓ CONNECTED | 409 returned — "they can sign in directly" |
| ActivityLog: client.invite_resent | ✓ CONNECTED | |

---

## CLIENT ONBOARDING — INVITE ACCEPTANCE (/accept-invite)

### Candidate clicks invite link
| Effect | Status | Notes |
|--------|--------|-------|
| Token validation: not found | ✓ CONNECTED | 404 "invalid" |
| Token validation: revoked | ✓ CONNECTED | 410 "revoked" |
| Token validation: already consumed | ✓ CONNECTED | 409 "used" — directs to /login |
| Token validation: expired | ✓ CONNECTED | 410 "expired" — token marked expired in DB |
| Token validation: existing user (has real account) | ✓ CONNECTED | GET returns hasRealAccount=true — page shows "sign in" CTA instead of password form |
| Password set (new user) | ✓ CONNECTED | POST /api/auth/accept-invite — validatePassword policy enforced |
| Password hash updated (bcrypt cost 12) | ✓ CONNECTED | |
| emailVerified = true | ✓ CONNECTED | set on accept |
| activeCampaignId = campaign.id | ✓ CONNECTED | set atomically with token consumption |
| lastLoginAt = now() | ✓ CONNECTED | marks account as activated — used by ops to determine invite status |
| ClientInviteToken: status = "accepted", consumedAt = now() | ✓ CONNECTED | atomic $transaction with user update |
| ActivityLog: client.invite_accepted | ✓ CONNECTED | |
| Auto sign-in after accept | ✓ CONNECTED | signIn("credentials") called client-side immediately |
| Redirect to /dashboard | ✓ CONNECTED | SetupWizardGate fires on arrival |
| Multiple tokens for same campaign (resend) | ✓ CONNECTED | only first un-expired token works; older ones revoked at resend time |
| Rate limited | ✓ CONNECTED | rateLimit("auth") on both GET and POST |

---

## OPERATOR CENTRE (/ops/clients)

### George monitors all clients
| Effect | Status | Notes |
|--------|--------|-------|
| Client health indicators (green/amber/red) | ✓ CONNECTED | /api/platform/clients — no activity 7d=amber, 14d=red, election within 30d + <100 contacts = red |
| Onboarding progress score (0–100%) | ✓ CONNECTED | 14-field count: candidateName, title, jurisdiction, dates, address, phone, email, socials, email voice |
| Features adopted (contacts/polls/donations/volunteers/signs/events) | ✓ CONNECTED | _count selects per campaign |
| Invite status (none/pending/accepted) | ✓ CONNECTED | pending = active ClientInviteToken; accepted = admin has lastLoginAt |
| Attention Queue | ✓ CONNECTED | surfaces: red health, stale onboarding, election soon + low contacts, expiring invite |
| Enter campaign (session switch) | ✓ CONNECTED | POST /api/campaigns/switch → full page reload to /dashboard |
| Resend invite from client row | ✓ CONNECTED | POST /api/ops/provision/[campaignId]/resend-invite |
| SUPER_ADMIN gated | ✓ CONNECTED | server component + /api/platform/clients both check role |

---

## CAMPAIGN SETUP (First-Time Wizard)

### Manager completes setup wizard (onboarding)
| Effect | Status | Notes |
|--------|--------|-------|
| candidateName / candidateTitle / jurisdiction saved | ✓ CONNECTED | wired 2026-04-09 |
| electionDate / electionType saved | ✓ CONNECTED | wired 2026-04-09 |
| advanceVoteStart / advanceVoteEnd saved | ✓ CONNECTED | wired 2026-04-09 — drive advance vote canvass strategy |
| officeAddress / candidatePhone / candidateEmail saved | ✓ CONNECTED | wired 2026-04-09 |
| websiteUrl / twitterHandle / instagramHandle / facebookUrl saved | ✓ CONNECTED | wired 2026-04-09 |
| fromEmailName / replyToEmail saved | ✓ CONNECTED | wired 2026-04-09 — used by email blast sender |
| onboardingComplete = true | ✓ CONNECTED | wired 2026-04-09 — wizard never shows again |
| ActivityLog entry | ✓ CONNECTED | wired 2026-04-09 — onboarding_complete action |
| CampaignTour starts after wizard | ✓ CONNECTED | wizard dismisses, tour gate fires independently |
| Volunteers skip wizard | ✓ CONNECTED | membership role check in GET /api/campaigns/setup |
| Demo mode skips wizard | ✓ CONNECTED | ?demo=true bypasses gate |

---

## CONTACT ACTIONS

### Create Contact (manual)
| Effect | Status | Notes |
|--------|--------|-------|
| Contact record created | ✓ CONNECTED | |
| ActivityLog entry | ✓ CONNECTED | |
| Funnel stage initialized | ✓ CONNECTED | |
| Duplicate check by email | ✓ CONNECTED | wired 2026-04-09 — 409 + existing contact id returned |
| Duplicate check by phone | ✓ CONNECTED | wired 2026-04-09 — 409 + existing contact id returned |

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
| GOTV priority list recalculates | ✓ CONNECTED | score computed dynamically from contact.supportLevel on each /api/gotv/tiers fetch (force-dynamic, no cache) |
| Funnel stage advances | ✗ NOT CONNECTED | no automatic advance on support change |
| Canvasser notified of change | ✗ NOT CONNECTED | |

### Mark Do Not Contact
| Effect | Status | Notes |
|--------|--------|-------|
| contact.doNotContact = true | ✓ CONNECTED | |
| NewsletterSubscriber unsubscribed | ✓ CONNECTED | |
| SMS opt-out recorded | ✓ CONNECTED | wired 2026-04-09 — smsOptOut field on Contact |
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
| GOTV priority recalculates | ✓ CONNECTED | score computed dynamically from contact.supportLevel on each /api/gotv/tiers fetch |
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
| Sender display name (fromEmailName) | ✓ CONNECTED | wired 2026-04-09 — "John Smith for Ward 5 <noreply@poll.city>" |
| Reply-to address (replyToEmail) | ✓ CONNECTED | wired 2026-04-09 — campaign's reply-to used if set |
| contact.lastContactedAt updated | ✓ CONNECTED | wired 2026-04-08 — batch updateMany by email |
| Bounced contacts flagged | ✓ CONNECTED | wired 2026-04-08 — emailBounced flag, campaign-scoped, does NOT set doNotContact |
| Unsubscribe → contact.doNotContact | ⚠ PARTIAL | updates newsletterSubscriber but not contact |
| Open tracking pixel embedded | ✓ CONNECTED | wired 2026-04-16 — 1×1 GIF at /api/track/open/[token] injected into every blast email |
| Click tracking on all http(s) links | ✓ CONNECTED | wired 2026-04-16 — all hrefs rewritten to /api/track/click/[token] redirect |
| EmailTrackingEvent created on open | ✓ CONNECTED | wired 2026-04-16 — idempotent (one open event per contact per blast); $transaction with openedCount increment |
| EmailTrackingEvent created on click | ✓ CONNECTED | wired 2026-04-16 — all clicks recorded; $transaction with clickCount increment |
| NotificationLog.openedCount / clickCount | ✓ CONNECTED | wired 2026-04-16 — db33dc0 |

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
| SMS opt-out updated | ✓ CONNECTED | wired 2026-04-09 — smsOptOut field added to Contact; unsubscribe sets both doNotContact + smsOptOut |
| ActivityLog entry | ✗ NOT CONNECTED | public endpoint has no userId — ActivityLog requires FK to User |

---

## DONATIONS

### Donation Recorded
| Effect | Status | Notes |
|--------|--------|-------|
| Donation record created/updated | ✓ CONNECTED | |
| ActivityLog entry | ✓ CONNECTED | |
| Receipt email sent | ✓ CONNECTED | wired 2026-04-15 — sendDonationReceiptEmail() in fundraising webhook (payment_intent.succeeded + invoice.payment_succeeded) + receipts POST (manual) + resend route |
| contact.supportLevel updated | ✓ CONNECTED | wired 2026-04-09 — upgrade to leaning_support if unknown/undecided |
| Funnel advances to "donor" | ✓ CONNECTED | already wired in quick-capture (advanceFunnel) |
| contact.lastContactedAt updated | ✓ CONNECTED | wired 2026-04-08 — set when receipt email sent |
| doNotContact check before recording | ✗ NOT CONNECTED | |
| Major donation ($500+) → superSupporter | ✓ CONNECTED | lifecycle automation handles this |

### Public Donation Page (Stripe — unauthenticated)
| Effect | Status | Notes |
|--------|--------|-------|
| Stripe PaymentIntent created | ✓ CONNECTED | wired 2026-04-16 — POST /api/donate/[campaignSlug]/intent |
| Donation record pre-created (status=processing) | ✓ CONNECTED | wired 2026-04-16 — created before PaymentIntent; updated with paymentIntentId after |
| Contact found-or-created by email | ✓ CONNECTED | wired 2026-04-16 — findOrCreateContact() scoped by campaignId; new contacts start with funnelStage=donor |
| Contact funnelStage advanced → donor | ✓ CONNECTED | wired 2026-04-16 — Stripe webhook payment_intent.succeeded; advances if ≤ volunteer |
| contact.lastContactedAt updated | ✓ CONNECTED | wired 2026-04-16 — set in funnel advance on webhook |
| Donation status → completed on payment | ✓ CONNECTED | wired 2026-04-16 — existing Stripe webhook handler; db33dc0 |
| Receipt email sent | ✓ CONNECTED | existing Stripe webhook sendDonationReceiptEmail() fires on payment_intent.succeeded |
| Compliance evaluation | ✓ CONNECTED | existing refreshDonorProfile() called in Stripe webhook |
| recordedById = campaign admin | ✓ CONNECTED | first ADMIN/CAMPAIGN_MANAGER member used as system actor |
| Rate limiting on public endpoint | ✓ CONNECTED | rateLimit(req, "form") applied |

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
| ActivityLog / Interaction entry | ✗ NOT CONNECTED | audit() logs sign update but no entry on contact's timeline |
| contact.signRequested reverts on cancel | ✗ NOT CONNECTED | signRequested stays true even if sign request cancelled |

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

## ELECTION DAY — SCRUTINEER & RESULTS OCR

### Scrutineer assigned to polling station
| Effect | Status | Notes |
|--------|--------|-------|
| ScrutineerAssignment record created | ✓ CONNECTED | wired 2026-04-09 |
| Assignment scoped to campaign (membership verified) | ✓ CONNECTED | wired 2026-04-09 |
| Scrutineer receives push notification on assignment | ✓ CONNECTED | wired 2026-04-09 — sendPushBatch after upsert, non-fatal |
| Multi-station assignment on same day allowed | ✓ CONNECTED | wired 2026-04-09 — unique constraint updated to include pollingStation |
| Candidate signs appointment (candidateSigned) | ✓ CONNECTED | PATCH /api/eday/scrutineers/[id] |
| Scrutineer receives push notification on signing | ✓ CONNECTED | wired 2026-04-09 — push fires only on false→true transition |
| My-assignment auto-populates device | ✓ CONNECTED | wired 2026-04-09 — GET /api/eday/my-assignment |
| Credential shows unsigned warning in UI | ✓ CONNECTED | wired 2026-04-09 — eday-client.tsx |
| ActivityLog entry on assignment | ✗ NOT CONNECTED | no audit trail |

### OCR scan of polling station printout
| Effect | Status | Notes |
|--------|--------|-------|
| Image sent to Claude Vision API | ✓ CONNECTED | wired 2026-04-09 — /api/results/ocr |
| Station info pre-populated from scrutineer assignment | ✓ CONNECTED | hint merged into OCR payload |
| Extracted data shown for human review | ✓ CONNECTED | editable candidate table in eday-client |
| ocrAssisted flag set on result entry | ✓ CONNECTED | wired 2026-04-09 — LiveResult.ocrAssisted |
| Double-entry verification still required | ✓ CONNECTED | existing /api/results/entry logic intact |
| Vote count mismatch on second entry → flagged | ✓ CONNECTED | 409 response — UI shows mismatch warning |
| OCR-flagged results visible in TV mode | ✗ NOT CONNECTED | TV mode shows all LiveResults but no OCR flag indicator |
| LiveResult scoped by campaignId | ✓ CONNECTED | wired 2026-04-09 — IDOR closed; double-entry scoped per campaign |
| OCR failure shown to user | ✓ CONNECTED | wired 2026-04-09 — "error" step state in eday-client |
| Empty vote count blocked at submit | ✓ CONNECTED | wired 2026-04-09 — validation in eday-client before POST |
| 0-candidate OCR result handled | ✓ CONNECTED | wired 2026-04-09 — amber warning card if no candidates extracted |
| Sanitize prompt injection on OCR | ✓ CONNECTED | sanitizePrompt() on all user-supplied text to Claude |

### Mobile parity
| Effect | Status | Notes |
|--------|--------|-------|
| ScrutineerAssignment type in mobile/lib/types.ts | ✓ CONNECTED | wired 2026-04-09 |
| OcrResult type in mobile types | ✓ CONNECTED | wired 2026-04-09 |
| fetchMyAssignment() in mobile/lib/api.ts | ✓ CONNECTED | wired 2026-04-09 |
| ocrScanPrintout() in mobile api | ✓ CONNECTED | wired 2026-04-09 |
| submitResultEntry() in mobile api | ✓ CONNECTED | wired 2026-04-09 |
| Native camera OCR screen in mobile app | ✓ CONNECTED | wired 2026-04-09 — mobile/app/(tabs)/eday/index.tsx — full native camera OCR + result entry flow |

---

## SIMULATION ENGINE

### Simulation batch runs (cron every 5 min)
| Effect | Status | Notes |
|--------|--------|-------|
| Interactions created (source=simulation) | ✓ CONNECTED | wired 2026-04-09 |
| Contact.supportLevel updated | ✓ CONNECTED | wired 2026-04-09 |
| Contact.lastContactedAt updated | ✓ CONNECTED | wired 2026-04-09 |
| Contact.funnelStage advanced | ✓ CONNECTED | wired 2026-04-09 |
| Sign records created for sign requests | ✓ CONNECTED | wired 2026-04-09 |
| Only runs on isDemo=true campaigns | ✓ CONNECTED | hard guard in engine.ts |
| Kill switch: SIMULATION_ENABLED=false | ✓ CONNECTED | env var checked before every run |
| SUPER_ADMIN /ops run-now button | ✓ CONNECTED | wired 2026-04-09 — Demo tab |
| SUPER_ADMIN clear-sim button | ✓ CONNECTED | wired 2026-04-09 — clears all source=simulation records |
| Confidence score excluded from sim interactions | ✓ CONNECTED | source=simulation returns 0 in confidence scorer |

### Interaction Confidence Scoring
| Effect | Status | Notes |
|--------|--------|-------|
| source field on Interaction | ✓ CONNECTED | wired 2026-04-09 — canvass/internal_phone/call_center/event/social/self/simulation |
| isProxy field on Interaction | ✓ CONNECTED | wired 2026-04-09 — −20 confidence |
| opponentSign field on Interaction | ✓ CONNECTED | wired 2026-04-09 — −75 confidence |
| Contact.confidenceScore updated on interaction create | ✓ CONNECTED | wired 2026-04-09 — weighted avg of last 3 real interactions |
| Confidence feeds GOTV tier score | ✓ CONNECTED | wired 2026-04-09 — ±5pt modifier in computeGotvScore |
| Call center interactions score lower (30%) | ✓ CONNECTED | George's rule — call centres lie |
| Canvass interactions score highest (85%) | ✓ CONNECTED | face-to-face most reliable |

---

## NOTIFICATION ROUTING

### Notification routing config (Campaign.notificationRoutes)
| Effect | Status | Notes |
|--------|--------|-------|
| Campaign stores alert routing config (JSON) | ✓ CONNECTED | wired 2026-04-09 — notificationRoutes field on Campaign |
| team_activity_alert respects campaign routing | ✓ CONNECTED | wired 2026-04-09 — cron/team-activity uses resolveNotificationRecipients() |
| suspension alert respects campaign routing | ✓ CONNECTED | wired 2026-04-09 — team/[id] PATCH uses resolveNotificationRecipients() |
| Admin can set routing via API | ✓ CONNECTED | wired 2026-04-09 — /api/campaigns/notification-routes PATCH |
| UI settings page for notification routing | — NOT BUILT | no UI yet — API exists, needs settings panel |
| security_alert routing | ✓ CONNECTED | defaults to ADMIN + CAMPAIGN_MANAGER, overridable |
| "All active members" mode for small campaigns | ✓ CONNECTED | mode: "all" routes to every active member |
| Named user mode (intake coordinator) | ✓ CONNECTED | mode: "users" with explicit userIds array |

---

## CANVASSING — DOOR STATE GAPS

### DO_NOT_RETURN flag (from developer pack audit)
| Effect | Status | Notes |
|--------|--------|-------|
| Contact.doNotContact blocks future contact | ✓ CONNECTED | |
| Per-door "do not return" (aggressive resident, no address contact) | ✗ NOT CONNECTED | doNotContact is person-level; need address-level "do not return" separate from person blacklist |
| Volunteer reliability score | ✗ NOT CONNECTED | no numeric reliability field; only status enum |

---

## PRODUCT ACCEPTANCE PASSPORT — SESSION 2026-04-09

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Campaign setup wizard | ✓ | — | Web only — admin flow |
| Simulation engine | ✓ | — | Web + /ops only |
| Team activity monitor | ✓ | — | Cron + push |
| Session invalidation on suspend | ✓ | ✓ | sessionVersion checked on JWT |
| E-day OCR scanner | ✓ | ✓ | Web + mobile — UX hardened, error states wired 2026-04-09 |
| Scrutineer assignment management | ✓ | ✓ | Push notifications wired; multi-station constraint fixed 2026-04-09 |
| Scrutineer credential form (printable) | ✓ | — | Web API generates HTML |
| Adoni cycling tips | ✓ | — | Web only — Adoni is web-only |
| ContactSignalLayer | ✓ API | — | Analytics API, no UI yet |
| Notification routing | ✓ API | — | API + logic wired, settings UI not built |
| Tasks page layout fix | ✓ | — | Select component w-full wrapper fixed |
| Confidence scoring on interactions | ✓ | Types wired | source/isProxy/opponentSign in mobile types |

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

---

## FIELD OPERATIONS ENGINE

*Added 2026-04-10 — Unified Field Assignment system (canvass, lit_drop, sign_install, sign_remove)*

### Create FieldAssignment (POST /api/field-assignments)
| Effect | Status | Notes |
|--------|--------|-------|
| FieldAssignment record created | ✓ CONNECTED | wired 2026-04-10 |
| AssignmentStop list auto-generated | ✓ CONNECTED | wired 2026-04-10 — canvass→contacts, lit_drop→households, sign_install→signs(requested\|scheduled), sign_remove→signs(installed) |
| AssignmentResourcePackage created | ✓ CONNECTED | wired 2026-04-10 — optional, in same transaction |
| Initial status set to assigned if assignee provided | ✓ CONNECTED | wired 2026-04-10 |
| ActivityLog entry | ✓ CONNECTED | wired 2026-04-10 |
| Scoped by campaignId + canvassing:manage | ✓ CONNECTED | wired 2026-04-10 |

### FieldAssignment Status Transitions (PATCH /api/field-assignments/[id])
| Action | Transition | Status | Notes |
|--------|-----------|--------|-------|
| publish | draft → published | ✓ CONNECTED | wired 2026-04-10 — canvassing:manage |
| assign | draft\|published → assigned | ✓ CONNECTED | wired 2026-04-10 — sets assignedUser/Volunteer/Group |
| start | assigned\|published → in_progress | ✓ CONNECTED | wired 2026-04-10 — sets startedAt, canvassing:write |
| complete | in_progress → completed | ✓ CONNECTED | wired 2026-04-10 — sets completedAt, canvassing:write |
| cancel | any → cancelled | ✓ CONNECTED | wired 2026-04-10 — canvassing:manage |
| update | no status change | ✓ CONNECTED | wired 2026-04-10 — metadata fields only |
| 409 on invalid transition | ✓ CONNECTED | wired 2026-04-10 — guard checks current status |

### Complete AssignmentStop (PATCH /api/field-assignments/[id]/stops/[stopId])
| Effect | Status | Notes |
|--------|--------|-------|
| AssignmentStop.status updated | ✓ CONNECTED | wired 2026-04-10 |
| AssignmentStop.outcome recorded (type-validated) | ✓ CONNECTED | wired 2026-04-10 — Zod schema per type |
| AssignmentStop.completedAt + completedById set | ✓ CONNECTED | wired 2026-04-10 |
| Contact.lastContactedAt updated | ✓ CONNECTED | wired 2026-04-10 — on any terminal status with contactId |
| Contact.supportLevel updated from canvass outcome | ✓ CONNECTED | wired 2026-04-10 — only on completed canvass stop |
| Contact.doNotContact set from canvass outcome | ✓ CONNECTED | wired 2026-04-10 — only on completed canvass stop |
| TurfStop.visited + visitedAt marked | ✓ CONNECTED | wired 2026-04-10 — updateMany by contactId, non-fatal |
| Sign.status = installed + installedAt (sign_install) | ✓ CONNECTED | wired 2026-04-10 — matches existing sign route pattern |
| Sign contact escalation + signPlaced (sign_install) | ✓ CONNECTED | wired 2026-04-10 — mirrors signs/route.ts logic |
| notifySignInstalled fired (sign_install) | ✓ CONNECTED | wired 2026-04-10 — async, non-fatal |
| Sign.status = removed + removedAt (sign_remove) | ✓ CONNECTED | wired 2026-04-10 |
| Household.operationHistory updated (lit_drop) | ✓ CONNECTED | wired 2026-04-10 — lit_drop timestamp recorded |
| FieldAssignment auto-completed when all stops terminal | ✓ CONNECTED | wired 2026-04-10 — counts pending stops, fires if 0 |
| ActivityLog entry (stop update) | ✓ CONNECTED | wired 2026-04-10 |
| ActivityLog entry (assignment auto-complete) | ✓ CONNECTED | wired 2026-04-10 |
| Blocked on cancelled/completed assignment | ✓ CONNECTED | wired 2026-04-10 — 409 returned |
| GOTV priority recalculates on canvass stop | ✓ CONNECTED | contact.supportLevel updated on completion → computeGotvScore() reads it live on next /api/gotv/tiers fetch |
| Auto-create volunteer profile if interested | ✗ NOT CONNECTED | manual step required |

---

## SIGN OPS — FIELD COMMAND (Chunk 10 — 2026-04-11)

### Record Field Attempt with sign_requested outcome (POST /api/field/attempts)
| Effect | Status | Notes |
|--------|--------|-------|
| FieldAttempt record created (outcome=sign_requested) | ✓ CONNECTED | |
| FollowUpAction(sign_ops, priority=high) created | ✓ CONNECTED | pre-existing |
| Sign record auto-created from contact address | ✓ CONNECTED | wired 2026-04-11 — Chunk 10 |
| FollowUpAction.signId linked to new Sign | ✓ CONNECTED | wired 2026-04-11 |
| Contact.signRequested = true | ✓ CONNECTED | wired 2026-04-11 |
| Sign lat/lng from canvasser GPS if provided | ✓ CONNECTED | wired 2026-04-11 |
| Contact has no address → no Sign created (safe skip) | ✓ CONNECTED | guard on contact.address1 |

### Update Sign Status — Field Crew (PATCH /api/field/signs/[signId])
| Effect | Status | Notes |
|--------|--------|-------|
| Sign.status updated (scheduled/installed/removed/declined) | ✓ CONNECTED | wired 2026-04-11 |
| Sign.installedAt set on installed | ✓ CONNECTED | wired 2026-04-11 |
| Sign.removedAt set on removed | ✓ CONNECTED | wired 2026-04-11 |
| FollowUpAction(sign_ops) auto-completed on installed/removed | ✓ CONNECTED | wired 2026-04-11 |
| FollowUpAction(sign_ops) set to in_progress on scheduled | ✓ CONNECTED | wired 2026-04-11 |
| Contact.signPlaced = true on install | ✓ CONNECTED | wired 2026-04-11 — mirrors signs/route.ts |
| Contact.supportLevel escalated on install | ✓ CONNECTED | wired 2026-04-11 — unknown/leaning/undecided → strong_support |
| Contact.lastContactedAt updated on install | ✓ CONNECTED | wired 2026-04-11 |
| AuditLog entry | ✓ CONNECTED | wired 2026-04-11 |

### Sign Ops Field View (GET /api/field/signs)
| Effect | Status | Notes |
|--------|--------|-------|
| Signs enriched with sign_ops follow-up + requesting canvasser | ✓ CONNECTED | wired 2026-04-11 |
| Summary counts by status in response | ✓ CONNECTED | wired 2026-04-11 |
| Queue mode (status=requested only) | ✓ CONNECTED | wired 2026-04-11 — ?queue=1 |
| campaignId scoped + canvassing:read permission | ✓ CONNECTED | wired 2026-04-11 |

### /field-ops/signs dedicated page
| Feature | Status | Notes |
|---------|--------|-------|
| Sign Queue tab (pending requests from canvassers) | ✓ BUILT | wired 2026-04-11 |
| Sign Board tab (full status filter + bulk management) | ✓ BUILT | wired 2026-04-11 |
| Inline Schedule / Installed / Remove / Decline actions | ✓ BUILT | wired 2026-04-11 |
| Stats strip (Requested / Scheduled / Installed / Removed) | ✓ BUILT | wired 2026-04-11 |
| Requestor attribution (canvasser name + time) | ✓ BUILT | wired 2026-04-11 |

---

---

## PRINT INVENTORY + PRINT PACKS

*Added 2026-04-10 — Phase 1 of the enterprise Print Platform*

### Receive Print Inventory (POST /api/print/inventory)
| Effect | Status | Notes |
|--------|--------|-------|
| PrintInventory record created | ✓ CONNECTED | wired 2026-04-10 |
| PrintInventoryLog entry (action=received) | ✓ CONNECTED | wired 2026-04-10 — audit trail starts here |
| campaignId scoped + membership check | ✓ CONNECTED | wired 2026-04-10 |
| CAMPAIGN_MANAGER+ only | ✓ CONNECTED | wired 2026-04-10 — VOLUNTEER cannot create |
| Optional link to source PrintOrder | ✓ CONNECTED | wired 2026-04-10 — orderId FK, unique constraint |
| Auto-generated SKU | ✓ CONNECTED | wired 2026-04-10 — <PRODUCT>-<base36 timestamp> |
| Reorder threshold stored | ✓ CONNECTED | wired 2026-04-10 — alert check on GET |

### Assign Inventory (POST /api/print/inventory/[id]/assign)
| Effect | Status | Notes |
|--------|--------|-------|
| availableQty decremented atomically | ✓ CONNECTED | wired 2026-04-10 — Prisma transaction, race condition safe |
| reservedQty incremented | ✓ CONNECTED | wired 2026-04-10 |
| PrintInventoryLog entry (action=assigned) | ✓ CONNECTED | wired 2026-04-10 |
| 409 on insufficient inventory (EC-006) | ✓ CONNECTED | wired 2026-04-10 — check inside transaction |
| referenceId stored (field assignment, pack, etc.) | ✓ CONNECTED | wired 2026-04-10 |

### Return Inventory (POST /api/print/inventory/[id]/return)
| Effect | Status | Notes |
|--------|--------|-------|
| availableQty incremented | ✓ CONNECTED | wired 2026-04-10 |
| reservedQty decremented | ✓ CONNECTED | wired 2026-04-10 |
| PrintInventoryLog entry (action=returned) | ✓ CONNECTED | wired 2026-04-10 |
| Over-return blocked (409) | ✓ CONNECTED | wired 2026-04-10 |

### Deplete Inventory (POST /api/print/inventory/[id]/deplete)
| Effect | Status | Notes |
|--------|--------|-------|
| depletedQty incremented | ✓ CONNECTED | wired 2026-04-10 — drains reserved first, then available |
| availableQty or reservedQty decremented | ✓ CONNECTED | wired 2026-04-10 |
| PrintInventoryLog entry (action=depleted) | ✓ CONNECTED | wired 2026-04-10 |
| Insufficient stock blocked (409) | ✓ CONNECTED | wired 2026-04-10 |

### Adjust Inventory (POST /api/print/inventory/[id]/adjust)
| Effect | Status | Notes |
|--------|--------|-------|
| availableQty adjusted (manual reconciliation) | ✓ CONNECTED | wired 2026-04-10 — ADMIN+ only |
| totalQty increases on positive adjust | ✓ CONNECTED | wired 2026-04-10 |
| wastedQty increases on negative adjust | ✓ CONNECTED | wired 2026-04-10 |
| PrintInventoryLog entry (action=adjusted) | ✓ CONNECTED | wired 2026-04-10 |
| Notes required (audit requirement) | ✓ CONNECTED | wired 2026-04-10 — Zod min(1) |

### Generate Print Pack (POST /api/print/packs/generate)
| Effect | Status | Notes |
|--------|--------|-------|
| PrintPack record created | ✓ CONNECTED | wired 2026-04-10 |
| PrintPackItem records created (one per product type) | ✓ CONNECTED | wired 2026-04-10 |
| targetCount from Turf.totalDoors (if turfId) | ✓ CONNECTED | wired 2026-04-10 |
| targetCount from Household count (if pollNumber) | ✓ CONNECTED | wired 2026-04-10 — deletedAt filtered |
| targetCount from Event.maxCapacity (if eventId) | ✓ CONNECTED | wired 2026-04-10 |
| Sign count for sign_install_kit | ✓ CONNECTED | wired 2026-04-10 — status: requested\|scheduled |
| Buffer calculation: ceil(targetCount × (1 + bufferPct) / 50) × 50 | ✓ CONNECTED | wired 2026-04-10 |
| Inventory sufficiency check per product type | ✓ CONNECTED | wired 2026-04-10 — returns shortfall in response |
| Best available inventory auto-selected | ✓ CONNECTED | wired 2026-04-10 — highest availableQty first |
| campaignId scoped | ✓ CONNECTED | wired 2026-04-10 |
| ActivityLog entry for pack generation | ✗ NOT CONNECTED | not yet wired |

### Distribute Print Pack (PATCH /api/print/packs/[id] → distributed)
| Effect | Status | Notes |
|--------|--------|-------|
| PrintPack.status = distributed | ✓ CONNECTED | wired 2026-04-10 |
| distributedAt timestamp set | ✓ CONNECTED | wired 2026-04-10 |
| Inventory reserved for all items (availableQty - requiredQty) | ✓ CONNECTED | wired 2026-04-10 — atomic per item |
| PrintInventoryLog entry per item (action=assigned, referenceType=pack) | ✓ CONNECTED | wired 2026-04-10 |
| PrintPackItem.fulfilledQty updated | ✓ CONNECTED | wired 2026-04-10 |
| Insufficient stock blocks distribution (409) | ✓ CONNECTED | wired 2026-04-10 |
| FieldAssignment.printPacketUrl updated on distribute | ✗ NOT CONNECTED | pack→assignment link is stored but URL not generated |

### Print Inventory → Low Stock Alert
| Effect | Status | Notes |
|--------|--------|-------|
| reorderAlerts count in GET /api/print/inventory summary | ✓ CONNECTED | wired 2026-04-10 |
| UI badge shows reorder alert count | ✓ CONNECTED | wired 2026-04-10 — inventory-client.tsx |
| Push notification to campaign manager when below threshold | ✗ NOT CONNECTED | nightly cron not yet wired |
| Adoni proactive shortage alert | ✗ NOT CONNECTED | Phase 9 |

---

---

## FINANCE SUITE

*Added 2026-04-10 — Phases 1-5 built. Phase 6 pending (cross-system integration).*
*GAP-004: Finance ↔ Print/Signs/Events | GAP-005: Finance ↔ Fundraising reconciliation*

### Budget Created (POST /api/finance/budgets)
| Effect | Status | Notes |
|--------|--------|-------|
| CampaignBudget record created | ✓ CONNECTED | wired 2026-04-10 |
| BudgetLine records created (per category) | ✓ CONNECTED | wired 2026-04-10 |
| campaignId scoped | ✓ CONNECTED | |
| ActivityLog / FinanceAuditLog entry | ✓ CONNECTED | wired 2026-04-10 |
| Print orders committed against budget line | ✗ NOT CONNECTED | GAP-004 |
| Sign costs committed against budget line | ✗ NOT CONNECTED | GAP-004 |
| Event costs committed against budget line | ✗ NOT CONNECTED | GAP-004 |
| Donation revenue posted to budget (revenue side) | ✗ NOT CONNECTED | GAP-005 — write-through not wired; read-side reconciliation surfaced at /finance/reports → Reconciliation tab (0188808) |

### Expense Submitted (POST /api/finance/expenses)
| Effect | Status | Notes |
|--------|--------|-------|
| FinanceExpense record created (status=draft) | ✓ CONNECTED | wired 2026-04-10 |
| BudgetLine.committedAmount incremented on submit | ✓ CONNECTED | wired 2026-04-10 |
| BudgetLine.actualAmount incremented on approve | ✓ CONNECTED | wired 2026-04-10 |
| FinanceAuditLog entry | ✓ CONNECTED | wired 2026-04-10 |
| Approval task created for manager | ✗ NOT CONNECTED | no task auto-created on submit |
| Push notification to approver | ✗ NOT CONNECTED | |
| Vendor record linked | ✓ CONNECTED | optional vendorId FK |

### Purchase Request Created + Approved
| Effect | Status | Notes |
|--------|--------|-------|
| FinancePurchaseRequest record created | ✓ CONNECTED | wired 2026-04-10 |
| Approval workflow: draft → submitted → approved/rejected | ✓ CONNECTED | wired 2026-04-10 |
| FinancePurchaseOrder created from approved PR | ✓ CONNECTED | wired 2026-04-10 |
| BudgetLine reserved on PR approval | ✓ CONNECTED | wired 2026-04-10 |
| FinanceAuditLog entries | ✓ CONNECTED | wired 2026-04-10 |
| Print order auto-created from approved PR | ✗ NOT CONNECTED | GAP-004 |

### Reimbursement Submitted (POST /api/finance/reimbursements)
| Effect | Status | Notes |
|--------|--------|-------|
| FinanceReimbursement record created | ✓ CONNECTED | wired 2026-04-10 |
| Approval flow: submitted → approved/rejected → paid | ✓ CONNECTED | wired 2026-04-10 |
| BudgetLine.actualAmount updated on approval | ✓ CONNECTED | wired 2026-04-10 |
| FinanceAuditLog entry | ✓ CONNECTED | wired 2026-04-10 |
| Receipt attachment stored | ✗ NOT CONNECTED | receipt field exists, upload not wired |
| Reimbursement payment auto-notification | ✗ NOT CONNECTED | |

---

## CALENDAR SUITE

*Phase 1+2 APIs built (730833e). Phase 3 candidate schedule + sync stub built (b5170f0). Phase 4 cross-system wiring + Phase 5 reminders cron wired 2026-04-11.*
*GAP-002: db push required on Railway | GAP-006: CONNECTED (0188808) | GAP-007: CONNECTED (0188808) | GAP-008: CONNECTED (0188808)*

### Calendar Item Created (POST /api/campaign-calendar/items)
| Effect | Status | Notes |
|--------|--------|-------|
| CalendarItem record created | ✓ CONNECTED | /api/campaign-calendar/items — CRUD built 730833e |
| Role check (WRITE_ROLES only) | ✓ CONNECTED | POST/PATCH/DELETE require ADMIN/CM/SUPER_ADMIN — hardened 2026-04-11 |
| sanitizeUserText on title/description/location | ✓ CONNECTED | prompt injection guard — hardened 2026-04-11 |
| IDOR validation on eventId/taskId | ✓ CONNECTED | cross-campaign entity leak blocked — hardened 2026-04-11 |
| CalendarItemAssignment record created | ✓ CONNECTED | included in POST /items |
| Conflict detection run | ✓ CONNECTED | ScheduleConflict auto-created for high-priority types (candidate_appearance, debate, media_appearance, protected_time, travel_block) — hardened 2026-04-11 |
| CalendarReminder scheduled | ✓ CONNECTED | CalendarReminder created via POST /api/campaign-calendar/items/[itemId]/reminders |
| CalendarReminder cron fired | ✓ CONNECTED | /api/cron/calendar-reminders — dispatches in_app/email/sms — wired 2026-04-11 |
| CalendarAuditLog entry | ✓ CONNECTED | every mutation logs to CalendarAuditLog |
| Event created → CalendarItem auto-created | ✓ CONNECTED | GAP-006 — postEventCalendarItem() wired in POST /api/events — 0188808 |
| ScheduledMessage created → CalendarItem auto-created | ✓ CONNECTED | GAP-007 — postScheduledMessageCalendarItem() wired in POST /api/comms/scheduled — 0188808 |
| Print order confirmed → CalendarItem auto-created | ✓ CONNECTED | GAP-008 — postPrintOrderCalendarItem() wired in POST /api/print/orders — 0188808 |
| Volunteer shift created → CalendarItem auto-created | ✓ CONNECTED | GAP-009 — postVolunteerShiftCalendarItem() wired in POST /api/volunteers/shifts — 2026-04-11 |
| Task created (with dueDate) → CalendarItem auto-created | ✓ CONNECTED | GAP-010 — postTaskCalendarItem() wired in POST /api/tasks — 2026-04-11 |
| Field assignment created → CalendarItem auto-created | ✗ NOT CONNECTED | GAP-011 — helper exists (postFieldAssignmentCalendarItem), no wiring point yet |

### Candidate Appearance (Phase 3 — built b5170f0)
| Effect | Status | Notes |
|--------|--------|-------|
| CandidateAppearance record created | ✓ CONNECTED | POST /api/campaign-calendar/appearances |
| One-per-CalendarItem enforced | ✓ CONNECTED | 409 if duplicate |
| Appearance updated | ✓ CONNECTED | PATCH /api/campaign-calendar/appearances/[appearanceId] |
| Candidate schedule view (full joined read) | ✓ CONNECTED | GET /api/campaign-calendar/candidate-schedule |
| Schedule meta (next debate, next media, election day) | ✓ CONNECTED | returned in meta field |
| CalendarAuditLog entry | ✓ CONNECTED | every appearance mutation logged |

### Calendar Sync (Phase 3 stub — built b5170f0)
| Effect | Status | Notes |
|--------|--------|-------|
| CalendarSyncAccount created (pending_auth) | ✓ CONNECTED (stub) | POST /api/campaign-calendar/sync |
| Sync trigger | ✓ CONNECTED (stub) | POST /api/campaign-calendar/sync/[accountId]/trigger — logs run, no real sync |
| Google Calendar sync (real OAuth) | ✗ NOT CONNECTED | GAP-024 — stub only |
| Apple / Outlook / iCal sync (real OAuth) | ✗ NOT CONNECTED | GAP-024 |

---

## FUNDRAISING SUITE

*Full suite built 2026-04-10 — schema, APIs, compliance engine, Fundraising Command Center UI.*
*Phase 7 (comms integration) wired 2026-04-11. Phase 4 (Stripe) skeleton present — needs STRIPE_SECRET_KEY in Railway env.*

### Donation recorded (offline / manual entry)
| Effect | Status | Notes |
|--------|--------|-------|
| Donation record created | ✓ CONNECTED | POST /api/fundraising/donations — full model |
| Compliance evaluated (annual limit, anonymous cap, corporate check) | ✓ CONNECTED | compliance.ts evaluateCompliance() — runs on every intake |
| complianceStatus set (approved/review/rejected) | ✓ CONNECTED | |
| DonorProfile refreshed (lifetime total, tier, status) | ✓ CONNECTED | refreshDonorProfile() called after write |
| FundraisingCampaign.raisedAmount synced | ✓ CONNECTED | atomic increment on parent campaign |
| Contact.lastContactedAt updated | ✓ CONNECTED | wired 2026-04-11 Phase 7 |
| Contact → donor funnel advance | ✓ CONNECTED | funnelStage → donor if ≤ volunteer; wired 2026-04-11 Phase 7 |
| ActivityLog entry | ✓ CONNECTED | audit() writes to activityLog on every donation.create |
| "Donors" SavedSegment auto-created | ✓ CONNECTED | idempotent upsert on first donation per campaign; wired 2026-04-11 Phase 7 |
| DonorAuditLog entry | ✓ CONNECTED | sensitive donor changes logged to immutable audit table |

### Compliance review queue
| Effect | Status | Notes |
|--------|--------|-------|
| Over-limit donations flagged | ✓ CONNECTED | complianceStatus = "review" |
| Anonymous over-cap flagged | ✓ CONNECTED | |
| Corporate/union entity detected | ✓ CONNECTED | entity name heuristic in compliance.ts |
| Approve / Exempt / Block actions | ✓ CONNECTED | PATCH /api/fundraising/donations/[donationId] |

### Receipt lifecycle
| Effect | Status | Notes |
|--------|--------|-------|
| Receipt generated on demand | ✓ CONNECTED | POST /api/fundraising/receipts — idempotent |
| Receipt number format: REC-YEAR-RANDOM | ✓ CONNECTED | |
| Receipt resend | ✓ CONNECTED | POST /api/fundraising/receipts/[id] |
| Receipt void | ✓ CONNECTED | DELETE /api/fundraising/receipts/[id] |
| Email delivery of receipt (Stripe payments) | ✓ CONNECTED | sendDonationReceiptEmail() → Stripe webhook on payment_intent.succeeded + invoice.payment_succeeded; wired 2026-04-11 Phase 7 |
| Email delivery of receipt (manual trigger) | ✓ CONNECTED | POST /api/fundraising/receipts → sendReceiptEmail() via receipt-email.ts; wired 2026-04-11 Phase 7 |

### Recurring plan
| Effect | Status | Notes |
|--------|--------|-------|
| RecurrencePlan created | ✓ CONNECTED | POST /api/fundraising/recurring |
| Pause / Resume / Cancel | ✓ CONNECTED | PATCH /api/fundraising/recurring/[planId] |
| Auto-charge on schedule | ✗ NOT CONNECTED | Phase 4 (Stripe Billing) |
| Failure alert to campaign manager | ✗ NOT CONNECTED | Phase 7 |

### Refund lifecycle
| Effect | Status | Notes |
|--------|--------|-------|
| Refund requested | ✓ CONNECTED | POST /api/fundraising/refunds — validates refundable balance |
| Approve / Reject / Process | ✓ CONNECTED | PATCH /api/fundraising/refunds/[id] |
| Donation.refundedAmount updated on process | ✓ CONNECTED | |
| Donation status → refunded / partially_refunded | ✓ CONNECTED | |
| DonorProfile lifetime total corrected | ✓ CONNECTED | refreshDonorProfile() called after process |
| Stripe refund API called | ✗ NOT CONNECTED | Phase 4 |

### Pledge
| Effect | Status | Notes |
|--------|--------|-------|
| Pledge created | ✓ CONNECTED | POST /api/fundraising/pledges |
| Pledge status updated (partial/fulfilled/overdue) | ✓ CONNECTED | PATCH /api/fundraising/pledges/[id] |
| Donation linked to pledge | ✗ NOT CONNECTED | no auto-link when donation matches pledge |

### Stripe integration (Phase 4 — NOT YET BUILT)
| Effect | Status | Notes |
|--------|--------|-------|
| Stripe PaymentIntent created | — NOT BUILT | |
| Webhook → donation created | — NOT BUILT | |
| Stripe Billing → recurring plans | — NOT BUILT | |
| Failed charge → RecurrencePlan.failureCount++ | — NOT BUILT | |

---

---

## CANDIDATE INTELLIGENCE ENGINE (CIE) — 2026-04-17

Platform-level. Not campaign-scoped. All data is public/platform, not tenant-private.

### News Article ingested
| Effect | Status | Notes |
|--------|--------|-------|
| NewsArticle persisted (dedup by url) | ✓ CONNECTED | news-pipeline.ts |
| NewsSignal created per detected phrase | ✓ CONNECTED | detectCandidateSignals() |
| CandidateLead created or score updated | ✓ CONNECTED | resolveCandidate() + resolver.ts |
| CandidateProfile auto-created on auto_verified | ✓ CONNECTED | news-pipeline.ts |
| IntelSourceHealth record created per run | ✓ CONNECTED | processDataSource() |
| DataSource.lastCheckedAt updated | ✓ CONNECTED | processDataSource() |
| audit() logged | ✓ CONNECTED | /api/intel/leads POST, PATCH |

### CandidateLead manually reviewed
| Effect | Status | Notes |
|--------|--------|-------|
| verificationStatus updated (verify/reject/merge) | ✓ CONNECTED | PATCH /api/intel/leads/[id] |
| CandidateProfile created on manual verify | ✓ CONNECTED | PATCH /api/intel/leads/[id] |
| audit() logged on every review action | ✓ CONNECTED | PATCH /api/intel/leads/[id] |

### Candidate outreach initiated
| Effect | Status | Notes |
|--------|--------|-------|
| Eligibility check (30-day cooldown) | ✓ CONNECTED | checkOutreachEligibility() |
| CandidateOutreachAttempt created | ✓ CONNECTED | recordOutreachAttempt() |
| audit() logged | ✓ CONNECTED | POST /api/intel/outreach |
| Email actually sent | ✗ NOT CONNECTED | stubbed — needs Resend template wired in |
| CandidateProfile.officialId set on conversion | ✗ NOT CONNECTED | manual step for now |
| convertedToUser flag | ✗ NOT CONNECTED | needs hook from onboarding flow |

### CIE → downstream systems
| Effect | Status | Notes |
|--------|--------|-------|
| CandidateProfile → Official (on election) | ✗ NOT CONNECTED | manual promotion only |
| CandidateProfile → onboarding pre-fill | ✗ NOT CONNECTED | future phase |
| New lead → ops alerts | ✗ NOT CONNECTED | future: alert SUPER_ADMIN on high-confidence lead |

---

*This file is the truth. If code and this file disagree, fix the code.*
*Updated every session. Never let it fall behind.*
