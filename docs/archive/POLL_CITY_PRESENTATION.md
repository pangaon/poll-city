# Poll City — Complete Platform Overview
### Everything. Nothing Missed. Built for Gamma.

---

## WHO WE ARE

Poll City is not campaign software. It is the infrastructure that makes Canadian democracy work better.

Founded by **George Hatzis** — 35 years in Canadian federal and provincial politics. He has worked for both the Ontario Progressive Conservative Party and the Ontario Liberal Party, and has run campaigns at every level of government. He is the only person in Canada who has successfully run and won campaigns for a PC Premier of Ontario, a Liberal Premier of Ontario, and a sitting Prime Minister. He has managed approximately 80 elected PC officials and 54 successful PC nomination campaigns.

This background is not a credential. It is the engine. Every feature in Poll City comes from hard-won field experience. The platform does not guess at what campaigns need — it knows.

**Legal and moral foundation:** Poll City is nonpartisan. It serves every party. It serves every candidate. Nonpartisanship is baked into every product decision. It is the legal and moral foundation of the company.

**Target event:** October 26, 2026 — Ontario Municipal Elections. The first major launch target. Real candidates. Real voters. Real elections. After that: US expansion (Michigan, New York, Minnesota).

---

## THE THREE PRODUCTS

### Product 1 — Poll City Campaign (B2B)
**URL:** app.poll.city

The full-stack operations platform for Canadian political campaigns. Every tool a campaign needs to organize, canvass, communicate, fundraise, and win — inside one platform, connected.

**Who it serves:** School boards, municipalities, provincial ridings, federal ridings, political parties at every level, enterprise party organizations.

**Pricing tiers:**
- School Board: $299 one-time / $79/month
- Municipal: $499 one-time / $149/month
- Provincial: $999/month
- Federal: $2,999/month
- Enterprise Party: $14,999/month

**Key differentiator:** Contacts (voters list) are UNLIMITED on every tier. No per-voter pricing. No data hostage.

---

### Product 2 — Poll City Social (B2C)
**URL:** social.poll.city

A civic engagement network for the Canadian public. Free forever. Never sells data.

**What it is:** The place every Canadian goes to understand their democracy — who represents them, what candidates stand for, whether politicians are keeping their promises.

**Core features:**
- Civic profile and voter passport for every Canadian
- Civic credits — engagement rewards system
- Public polls and petitions
- Candidate finder — who is running in your ward/riding
- Accountability tracking — elected officials' voting records and promises
- Media feed — civic news, filtered by your area
- Notification engine — alerts on your issues, your candidates, your ward
- Support signal system — show public support for candidates
- Town hall events — virtual and in-person
- Community question boards

**Privacy principle:** k-anonymity enforced at minimum 100 actors. Differential privacy. Identity-sentiment separation. No PII in sentiment tables.

---

### Product 3 — Poll City Media (B2B)
**URL:** media.poll.city

Real-time civic data as a product for media organizations, newsrooms, and broadcasters.

**Core features:**
- Live election night results dashboard and ticker
- Flash polls (rapid public opinion capture)
- Approval ratings — updated every 15 minutes via passive micro-signal aggregation
- API access for media embeds
- Election night broadcast-ready data feeds

**Revenue model:**
- Media subscriptions: $199-$499/month
- Polling-as-a-service: $499-$9,999 per poll
- Intelligence subscriptions: $499-$4,999/month

---

## THE INTELLIGENCE ENGINE — ATLAS

ATLAS is Poll City's proprietary civic sentiment engine. It processes passive micro-signals from Poll City Social to produce real-time approval ratings, updated every 15 minutes.

**What ATLAS does:**
- Aggregates passive civic engagement signals (views, shares, reactions, petition signatures, support signals, poll responses)
- Applies confidence weighting based on signal type, recency, and geographic clustering
- Produces approval ratings for elected officials and candidates at the ward, riding, provincial, and federal levels
- Detects sentiment shifts before they appear in traditional polling
- Feeds directly into Poll City Media's approval rating displays

**Privacy architecture:**
- k-anonymity: minimum 100 actors before any signal is surfaced
- Differential privacy applied to all aggregate outputs
- Identity and sentiment are permanently separated — no PII in sentiment tables
- ATLAS lives only in the private repository `poll-city-intelligence` — a trade secret, never documented in the public codebase

**Why this matters:** Traditional polling is slow, expensive, and low-frequency. ATLAS produces rolling real-time signals at a fraction of the cost. Media organizations pay for this. Political campaigns use it to understand public mood without commissioning expensive polls.

---

## THE FOUR MOBILE APPS

Poll City ships four mobile applications, built with Expo React Native (iOS and Android), sharing a component library.

### App 1 — Poll City Canvasser
**Launch:** May 2026 — built first, safest for App Store.
The field tool for door-to-door canvassers. Lightweight, fast, offline-capable.
- Today's assigned route and turf
- Door-by-door contact cards with household history
- One-tap outcome recording (16 outcomes: support levels, no answer, hostile, sign interest, volunteer interest, donor interest, and more)
- Script display and branching prompts
- Proof photo capture (signs, installs)
- Offline-first: routes, targets, scripts, and materials checklists cached locally
- Background sync when connectivity restored
- Paper fallback: printable walk packets + rapid re-entry screen for offline sessions

### App 2 — Poll City Social
**Launch:** June 2026 — B2C, largest public audience.
The civic engagement app for every Canadian voter.

### App 3 — Poll City Campaign
**Launch:** August 2026 — full campaign management on mobile.
Campaign managers need full operational control — not a degraded experience. Every feature available on desktop is accessible on mobile.

### Shared: packages/poll-city-ui
Cross-platform component library shared across all four apps.

**App Store language strategy:** "Nonpartisan." "Community." "Civic engagement." Never: "win elections," "campaign targeting," "voter suppression."

---

## PRODUCT 1 DEEP DIVE — POLL CITY CAMPAIGN

### The Dashboard

The campaign command center. The most important number is the **GOTV Gap**.

**GOTV Gap formula:** Win Threshold minus Supporters Voted = Votes Needed Today

Layout: Two columns. Map left (60%). Command strip right (40%). The Gap is the largest element on the page.

Strike-off behavior: sub-100ms. No confirmation dialog. Undo window: 10 seconds.

**Dashboard widgets:**
- Doors assigned today / doors attempted today / contacts made today
- Supporter IDs secured today
- Undecided IDs captured
- Volunteer interest captures
- Donor interest captures
- Sign requests captured
- Routes incomplete
- Shifts unfilled
- Sign installs pending
- Literature routes pending
- Materials issued today / not returned
- No-show volunteers
- Revisit backlog
- Bad data flags
- High-priority GOTV targets remaining

---

### Contact CRM

The voter database. Multi-tenant. Every query scoped by `campaignId`. No data leakage between campaigns.

**Contact record includes:**
- Full name, address, phone, email
- Household linkage (multiple voters, same address)
- Support level (Strong Support / Leaning Support / Undecided / Leaning Opposition / Strong Opposition / Unknown)
- Funnel stage (Lead → Engaged → Supporter → Donor → Volunteer → Evangelist)
- Interaction history (every door knock, call, email, SMS, event attendance)
- Tags, notes, custom fields
- Do-not-contact flag
- Confidence score (calculated from interaction source and recency)
- Advance vote window flags
- GOTV tier assignment
- Soft delete: `deletedAt` field — records are never hard-deleted

**Confidence scoring by source:**
- In-person door canvass: 85% weight
- Internal phone bank: 60% weight
- Call centre: 30% weight
- isProxy (household member speaking for absent voter): -20% penalty
- Opponent sign visible at property: flags conflict, near-zero confidence

**Duplicate detection:**
- Automatic fuzzy matching on name + address
- Merge workflow with full audit trail
- Merge history preserved permanently

**Smart import:**
- CSV upload with column mapping
- AI-assisted field matching
- Voter file as source of truth for polls, boundaries, households, and voter totals per household

---

### Canvassing / Field Operations

The field execution system. The most important operational surface in Poll City.

**The Mission:** An enterprise-grade unified field execution operating system. Not a canvassing add-on — the field nervous system of the campaign.

#### Field Operations Hub — 13 Sections:

1. **Overview** — daily dashboard, completion rates, gap tracking
2. **Turf** — territory creation, balancing, polygon editing
3. **Routes** — route assignment, optimization, splitting/merging
4. **Canvassing** — active door-knock sessions and outcomes
5. **Literature** — lit drop coordination and quantity tracking
6. **Signs** — lawn sign lifecycle management
7. **Shifts** — volunteer shift creation, assignment, execution
8. **Teams** — field team management and crew assignment
9. **Materials** — inventory issue, return, tracking
10. **Follow-Ups** — automated follow-up queue management
11. **GOTV** — high-priority turnout target list
12. **Exceptions** — inaccessible addresses, late syncs, conflicts
13. **Audit** — immutable field audit log

#### Turf + Geography System:
- Create turfs by ward, poll number, polygon draw, or route group
- Turf balancing by: target count, household count, estimated walk time
- Route splitting and merging with drag-and-drop
- Priority locking — prevent assignment conflicts
- Map view with poll/ward overlays and target density heatmap
- Nearest-neighbor route optimizer

#### Canvassing Runs + Scripts:
- Pass types: Door-to-door ID / Persuasion / GOTV
- Phone follow-up as a distinct pass type
- Script packages with conditional branching
- 16 outcome types:
  - Strong Support / Leaning Support / Undecided / Leaning Opposition / Strong Opposition
  - Not Home / Moved / Refused / Hostile
  - Sign Requested / Volunteer Interested / Donor Interested
  - Follow-Up Required / Bad Data / Language Barrier / Inaccessible
- Route completion tracking: Fully Complete / Partially Complete / Touched-Unresolved / Inaccessible / Revisit Required
- One-tap outcome capture — designed for cold hands in the field

#### Literature Drop Operations (Phase 4):
- Quantity planning: issued / carried / dropped / returned / wasted
- Building-level drop instructions
- Packet generation per volunteer
- Route sheet export (print-ready)
- Efficiency metrics per route
- Connected to: print suite, inventory, calendar, volunteers, analytics, budget

#### Sign Operations (Phase 5):
- Full lifecycle: Requested → Verified → Queued → Assigned → Out for Install → Installed → Blocked → Revisit → Removed → Lost/Damaged/Replaced → Cancelled
- Internal queue + public request portal linkage
- Inventory reservation before dispatch
- Install and removal scheduling with crew assignment
- Proof photo upload (required for installation confirmation)
- Exception queue for failed installs
- Install route generation (batch sign crews by geography)
- Connects to: contact CRM (who requested), inventory, calendar

#### Volunteer + Shift Execution (Phase 6):
- Shift types: Canvassing / Literature / Sign Install / Sign Removal / Event Field / Office / GOTV / Poll Day
- Open shifts (any qualified volunteer can claim) and assigned shifts
- Acceptance / decline workflow
- Language matching for multilingual ridings
- No-show handling with automatic reschedule triggers
- Attendance tracking: check-in / check-out
- Shift display shows: assigned materials, scripts, turf/route, team leader, meeting point, what to bring, what to return

#### Materials + Inventory (Phase 7):
- Every issued item traceable: who got it / when / for which shift / what came back / what was lost/used/wasted
- Packet types: Canvass / Literature / Sign Install / Sign Removal / GOTV / Event Outreach
- Auto-reorder trigger hooks when inventory hits threshold
- Print replenishment linkage

#### Follow-Up Automation (Phase 9):
Auto-creates follow-up tasks for:
- Supporters and undecideds not confirmed voted
- Sign requests pending install
- Donor interest captured in field
- Volunteer interest captured in field
- Wrong address / bad data flagged
- Accessibility barriers noted
- Literature miss (building not covered)
- Building retry needed
- Sign reinstall required (knocked down, blocked)
- GOTV high-priority not yet confirmed voted

Cross-system automations:
- Sign request from canvass → automatically queued in Sign Ops
- Donor interest from canvass → automatically creates fundraising lead
- Volunteer interest from canvass → automatically triggers volunteer workflow
- Undecided → creates comms follow-up or revisit task
- Bad data → flags CRM cleanup record
- Incomplete route → generates reschedule recommendation
- Materials low → triggers inventory and print alerts

---

### Volunteers

- Volunteer profile creation and skills inventory
- Language skills, availability, transportation, experience level
- Invite system (email + SMS)
- Shift signup and confirmation flow
- Hours tracking
- Volunteer funnel: recruited → trained → active → leader
- Automated check-in / check-out via mobile
- Volunteer leaderboard (engagement gamification)

---

### Events

- Event creation with type (rally, town hall, fundraiser, canvassing launch, sign pick-up, debate watch party, volunteer training)
- Guest list management
- RSVP collection (public link + internal invite)
- Attendance tracking (check-in at door)
- Post-event follow-up automation
- Event calendar with candidate appearance tracking
- Schedule conflict detection
- Calendar sync (iCal export)

---

### Donations + Fundraising

**Fundraising campaigns:**
- Named fundraising drives (spring campaign, phone-a-thon, etc.)
- Goal tracking with live thermometer
- Donor pipeline management

**Donation records:**
- Amount, date, method (cheque, e-transfer, credit card, cash, payroll deduction)
- Receipt generation (print and email)
- Refund processing with audit trail
- Recurrence plans (monthly donors)
- Pledge tracking (promised but not yet paid)
- Donor audit log (every change tracked)

**Donor profiles:**
- Lifetime giving total
- Giving frequency
- First and last gift dates
- Average gift size
- Preferred payment method
- Donor tier classification

**Finance eligibility:** Every donation validates against campaign finance rules. Soft cap warnings. Hard cap blocks.

---

### Communications Suite

**Email:**
- Drag-and-drop email builder
- Template library
- Segment-based targeting (support level, geography, volunteer status, donor status)
- Scheduled send
- Open tracking (1x1 pixel)
- Click tracking (redirect route)
- Unsubscribe management
- Newsletter campaigns with subscriber management

**SMS:**
- Bulk SMS with rate limiting
- Personalization tokens (first name, ward, candidate name)
- Two-way SMS inbox
- Opt-out management (CASL compliant)
- Campaign-scoped messaging

**Voice Broadcast:**
- Pre-recorded robocall campaigns
- Call delivery tracking
- IVR response capture

**Social Media:**
- Social account linking
- Post scheduling and management
- Mention monitoring
- Social analytics

**Message Templates:**
- Reusable scripts for phone bank, email, SMS, door scripts
- Category tagging
- Approval workflow for sensitive messages

**Saved Segments:**
- Reusable audience definitions
- Combined filters: geography + support + interaction history + tags

---

### Finance Suite

Full campaign financial management — built for Canadian campaign finance law.

**Budget management:**
- Campaign budget creation with line items
- Budget vs. actuals tracking
- Variance alerts

**Expense tracking:**
- Expense submission by any team member
- Category tagging (advertising, travel, printing, events, salaries, etc.)
- Receipt attachment
- Approval workflow (submitted → under review → approved / rejected → paid)

**Purchase requests and purchase orders:**
- Formal procurement workflow
- PO generation and tracking
- Vendor management

**Reimbursements:**
- Volunteer and staff reimbursement requests
- Bank transfer or cheque payment tracking

**Vendors:**
- Vendor directory with contact info
- Spend by vendor reports

**Financial audit log:**
- Every financial action timestamped and attributed
- Immutable for compliance purposes

**Reports:**
- Income vs. expenditure by period
- Spending by category
- Donor contribution report (required for Elections Canada filing)
- Exportable for auditor or chief financial officer

---

### Print Suite

**Print design engine:**
- Live split-pane HTML design editor
- Debounced real-time preview
- Colour, logo, and text overrides
- CSS-scaled thumbnail library for template selection
- Asset upload via Vercel Blob
- 5 built-in HTML templates (door card, lawn sign, flyer, rack card, palm card)

**Print inventory:**
- Inventory tracking by item type
- Receipt logging (incoming stock)
- Issue logging (outgoing to volunteers and teams)
- Return logging
- Waste / loss tracking
- Reorder threshold alerts

**Print jobs:**
- Job creation with quantity and template selection
- Status tracking: draft → submitted → in production → shipped → received
- Cost tracking per job

**Print packs:**
- Bundle templates into kits (canvass pack = door card + lit + address label)
- Issue packs to shifts

**Walk list printing:**
- Context-aware: different formats for canvassing vs. literature drop vs. sign installation
- Assignment-linked (prints the specific route assigned to the volunteer)
- Format selector (letter, legal, A4)
- Configurable columns (address, name, support level, notes, outcome checkbox)

---

### Signs (Standalone + Field-Integrated)

- Sign request intake (public form + internal entry)
- Sign inventory management (4x4, 4x8, window, etc.)
- Installation scheduling and crew assignment
- Location verification (address confirmation)
- Proof photo capture
- Removal scheduling (post-election cleanup)
- Sign density map overlay
- Sign vs. canvass support correlation analytics

---

### Tasks + Task Boards

- Task creation with assignee, due date, priority, category
- Kanban board view
- Bulk task creation from templates
- Task templates for recurring workflows
- Campaign-wide task completion metrics
- Task activity log
- Integration with volunteer shifts and events

---

### Intelligence + Opponent Research

- Opponent profile tracking
- Voting record analysis
- Public statement library
- Media mention monitoring
- Vulnerability flagging
- Opposition research brief generation via Adoni

---

### Election Day Operations (E-Day)

The most time-sensitive surface in the platform.

**Poll management:**
- Each polling station assigned a scrutineer
- Scrutineer assignment with contact info and shift times
- Live results data entry as votes are counted
- Parallel vote tracking per station

**GOTV strike-off:**
- Sub-100ms confirmation of voted supporters
- Undo window: 10 seconds (fat finger protection)
- High-confidence supporters with no strike-off become urgent call targets
- Advance vote unreachable flag: supporters who didn't answer during advance period flagged as E-day priority

**Election night:**
- Live results dashboard
- Station-by-station progress
- Winning threshold tracker
- Lead/lag indicator by poll
- Export-ready for media

---

### Adoni — The AI Campaign Manager

Adoni is not a chatbot. He is a senior campaign manager. He has been to George's school.

**Adoni's laws (non-negotiable):**
- Never uses bullet points, headers, bold, numbered lists, or any markdown
- Plain conversational sentences only
- Maximum 8 sentences per response
- Ends every substantive response with one clear next action
- Canadian English spelling (colour, centre, cheque, programme)
- Uses "we" not "you"
- Uses real names, real streets, real numbers — never generic placeholders
- Warm, direct, professional tone — like a senior campaign manager talking to a junior one

**Adoni's modes:**
- Bubble (collapsed) → Panel (pushes content left, never covers it) → Full screen
- Keyboard shortcut: Cmd+Shift+A cycles modes

**What Adoni knows:**
- Full campaign context: contacts, interactions, GOTV gap, donations, volunteers, events, tasks
- Page-aware: on /canvassing he draws on canvassing wisdom; on /gotv he draws on GOTV and E-day wisdom
- Historical wisdom from George's 35-year career (George's Brain knowledge base)
- Real-time campaign data injected on every request

**George's Brain — the secret weapon:**
George has a private admin interface to continuously "brain dump" his 35 years of expertise into Adoni. Every new entry becomes part of Adoni's context.

Categories: canvassing / GOTV / volunteers / messaging / fundraising / crisis management / nomination campaigns / election day

Each entry includes:
- The rule (George's insight)
- When it applies (context)
- Why it works (reasoning)
- Exceptions and nuance (edge cases)
- Priority level (1=critical/E-day, 2=important, 3=nice-to-know)
- Confidence score

**The pitch:** Every Poll City client gets George as their campaign manager. The only person in Canada who has won at the Premier level for both major parties, and worked with a sitting Prime Minister.

**Adoni's capabilities:**
- Morning briefing: active status, GOTV gap, new sign-ups, revenue, security events, one thing needing attention
- Route balancing suggestions
- Turf priority recommendations
- Revisit priority for undecideds
- Script improvement recommendations
- Low-performing route flags
- Sign crew batching by geography
- Field day summaries
- Follow-up suggestions after canvassing sessions
- Material shortage flags
- Donor follow-up recommendations
- Crisis response guidance (opponent attacks, bad press, internal conflicts)

**Loop Test Engine:**
- Library of real campaign scenarios
- Adoni answers each scenario
- George reviews: correct / missing nuance / wrong
- Gaps flagged → George adds wisdom → scenario re-runs
- Score tracks Adoni's improvement over time

---

### Analytics + Reports

- Contact acquisition rate by source
- Canvassing completion rate by turf
- Support level distribution over time
- Donor conversion funnel
- Volunteer engagement rates
- Event attendance trends
- Communication open and click rates
- GOTV progress by poll
- Field operations efficiency (contacts per hour, doors per volunteer)
- Exportable reports for campaign post-mortems

---

### Calendar Suite

- Candidate schedule management (appearances, events, media)
- Campaign calendar (canvassing dates, fundraisers, debates)
- Staff and volunteer schedule coordination
- Schedule conflict detection
- Calendar sync with Google Calendar / iCal
- CalendarItem assignment to team members
- Reminder system

---

### GOTV — Get Out the Vote

The single most important module. Every other system feeds into this.

**The Gap:** The largest number on the page. Win threshold minus supporters voted = votes needed today.

**GOTV tiers:**
- Tier 1: Strong supporters, in-person canvass confirmed, high confidence score
- Tier 2: Leaning supporters, phone-confirmed
- Tier 3: Soft supporters, call-centre sourced (low confidence weight)

**Advance vote strategy:**
- Canvassing during advance vote windows prioritizes streets near advance polling stations
- Banking votes early frees E-day resources and reduces risk
- Supporter who doesn't answer during advance period → confidence score automatically drops 25 points → flagged as E-day priority ("advance_unreachable")

**Polling station priority formula:**
With limited time on E-day, rank polls by: confirmed supporters × average confidence score

**Confidence source weights:**
- In-person door canvass: 85%
- Internal phone bank: 60%
- Call centre: 30%
- isProxy (another household member claiming support): -20%
- Opponent sign visible at property: near-zero (conflict flag)

**Call Centre Verification Feature:**
Assign 20 random call-centre-sourced "supporter" contacts to trusted office volunteers as verification calls. They confirm or update the record. This:
- Cleans the data
- Tracks call centre accuracy rate over time
- Feeds the accuracy rate back into the confidence weight for the whole campaign
- Gives office volunteers a meaningful task

---

### Community Case Management

- Constituent issue tracking (for elected officials using Poll City)
- Case intake from public web form
- Assignment to team members
- Status tracking (open → in progress → resolved / referred)
- Response logging
- Integration with contact CRM

---

### Briefing Documents

- Auto-generated daily briefing for the candidate and campaign manager
- Includes: GOTV status, upcoming events, pending decisions, communication performance, fundraising updates
- Adoni delivers the 7am brief in conversational form

---

### Import / Export

- CSV import for voter files, contact lists, donation records
- Smart import with AI-assisted field matching
- Column mapping UI
- Duplicate detection during import
- Export to CSV for any data type
- Voter file is the source of truth: it defines polls, ward boundaries, household structures, and voter totals per household

---

### Ops Console (George's Cockpit — SUPER_ADMIN only)

The master control panel for managing all client campaigns at scale.

**Visible to George only:**
- All campaigns across all clients (live status)
- Health indicators: last activity, GOTV progress, billing status, data quality
- Attention queue: campaigns with anomalies, failures, or stalled activity
- Simulation engine controls
- Debug tools
- Demo token generation (shareable 7-day access links)
- Feature flag management

**Demo modes:**
- /demo/candidate — Ward 20 Toronto, full mid-campaign dashboard with real seed data
- /demo/party — Multi-riding Ontario provincial scale, AGM voting, nomination race
- /demo/media — Election night results, ticker embed, flash poll, 90-day approval chart

---

## PRODUCT 2 DEEP DIVE — POLL CITY SOCIAL

### The Vision

Poll City Social is the civic network for every Canadian who is not running a campaign but wants to participate meaningfully in democracy. It is free forever. It never sells data. It earns trust by earning trust.

### Civic Profile + Voter Passport

Every Canadian creates a civic profile:
- Municipality, province, federal riding
- Elected representatives at every level (auto-populated from official data)
- Issues they care about (from a curated taxonomy)
- Candidates they are following
- Their civic activity history (polls voted, petitions signed, events attended, questions submitted)
- Civic credits earned

**Voter Passport:** A private record of the user's democratic participation. Never shared. Never sold. The user's own history of being a citizen.

### Civic Credits

A gamified engagement system. Credits earned for:
- Completing civic profile
- Voting in a public poll
- Signing a petition
- Attending a town hall
- Asking a question of an elected official
- Sharing civic content
- Referring a friend

Credits unlock: profile badges, priority Q&A access, early flash poll access.

### Public Polls + Petitions

**Polls:**
- Created by any verified user, campaign, or media organization
- Multiple types: Yes/No, multiple choice, ranked choice, slider scale
- Geographic scoping: national / provincial / municipal / ward-level
- Real-time results with demographic breakdowns (where k-anonymity permits)
- Share-ready results graphics

**Petitions:**
- Target: elected official / government body
- Signature collection with email verification
- Progress bar and milestone notifications
- Delivery mechanism (automated PDF with signatures to the target)

### Candidate Finder + Accountability Tracking

**Candidate Finder:**
- Enter your address → see every candidate running in your ward, riding, school board, and school board region
- Candidate profile: party, biography, platform promises, endorsements
- Comparison tool: side-by-side on key issues

**Accountability Tracking:**
- Elected officials' promise tracking (promises made during campaign vs. actions taken in office)
- Voting record (where available from public data)
- Attendance record
- Community issue response rate
- Public grade: calculated from the above

### ATLAS — Approval Ratings

On Poll City Social, public citizens see:
- Live approval ratings for every elected official (powered by ATLAS)
- Trending up/down indicators
- Geographic breakdown of approval
- Issue-level sentiment (environment, housing, transit, crime, etc.)

What they do not see: how ATLAS calculates it, whose data it uses, or any individual signals. Only aggregate results with k-anonymity protection.

### Town Hall Events + Community Questions

- Virtual and in-person town hall event listings
- RSVP system
- Live Q&A queue (upvoted by attendees)
- Post-event transcript and summary (Adoni-generated)
- Question archive: unasked questions stay on the official's community board

### Media Feed

- Civic news aggregated from Canadian newsrooms
- Filtered by your municipality, riding, issues
- No ads. No tracking. No engagement bait.
- "Most civic" algorithm — ranks content by civic value, not rage-clicks

### Notification Engine

- Alerts when your representative votes
- Alerts when a petition you signed reaches a milestone
- Alerts when a new candidate announces in your riding
- Alerts on town hall events near you
- Alerts when approval ratings shift significantly
- Weekly civic digest

### Social Accounts for Candidates

Candidates can create a verified Poll City Social presence:
- Candidate profile page
- Direct Q&A board (questions from citizens)
- Promise tracking (public commitment list)
- Community case intake

---

## PRODUCT 3 DEEP DIVE — POLL CITY MEDIA

### The Product

Poll City Media sells civic data to newsrooms, broadcasters, and media organizations. The data comes from two sources: ATLAS (passive sentiment engine) and active polls run through Poll City Social.

### Live Election Night Dashboard

- Real-time results as polls close and counts come in
- Station-by-station breakdown
- Projected winner (with confidence interval)
- Historical comparison
- Seat count tracker for multi-seat elections
- Export: CSV, JSON, API

### Live Results Ticker

- Embeddable HTML widget for any newsroom website
- Auto-updating (WebSocket or polling)
- Branded to the newsroom or neutral Poll City branding
- Configurable: all races / specific region / specific candidate

### Flash Polls

- Rapid public opinion capture on breaking news
- 15-minute to 48-hour polls
- Geo-targeted by municipality, riding, or province
- Results available in real time
- Methodology documentation included (required for responsible media use)

### Approval Ratings API

- REST API for media organizations to pull current approval ratings
- JSON response with confidence intervals
- Rate limited by subscription tier
- Webhook support for real-time updates when ratings shift

### Election Night Package

- Custom-branded election night dashboard for specific broadcaster
- White-label option
- Dedicated support line on election night
- Pre-configured for the specific election (municipality, riding list, candidate list)
- Pricing: $9,999 one-time per election night event

---

## THE PLATFORM ARCHITECTURE

### Technical Stack

- **Frontend:** Next.js 14 App Router + TypeScript (strict mode — no `any`)
- **Database:** PostgreSQL via Railway
- **ORM:** Prisma — full type-safe schema with migrations
- **Auth:** NextAuth.js with JWT strategy + 2FA support
- **UI components:** shadcn/ui + Tailwind CSS + Framer Motion
- **Animation:** Spring physics (stiffness: 300, damping: 30) — Framer Motion throughout
- **File storage:** Vercel Blob
- **Email:** Resend
- **SMS:** Twilio
- **Payments:** Stripe
- **AI:** Anthropic Claude API (Adoni is powered by Claude Sonnet)
- **Maps:** MapLibre (open-source, no Google Maps dependency)
- **Deployment:** Vercel (Next.js) + Railway (PostgreSQL)

### Multi-Tenancy Architecture

Every database record that touches campaign data is scoped by `campaignId`. This is not optional — it is a hard architectural rule.

A user knowing a `campaignId` does not grant them access to that campaign's data. Membership verification is required for every query. Leaking one campaign's data to another is treated as a catastrophic trust failure.

**Roles:** SUPER_ADMIN / CAMPAIGN_MANAGER / CANVASSER / VOLUNTEER / READ_ONLY

**Permission model:** Role-based access control via the Member model. Every API route validates membership before returning data.

### Security Architecture

- Every API route authenticates before doing anything (`apiAuth(req)` for campaign routes)
- All user input validated with Zod at every API boundary
- Campaign data always scoped — membership verified before any record returned
- SUPER_ADMIN routes check `session.user.role === "SUPER_ADMIN"` explicitly — middleware alone is never sufficient
- Raw error objects never returned to the client (standardized error helpers)
- Secrets in environment variables only (never in code)
- AI prompt injection protection: all user-supplied text going to Claude passes through `sanitizePrompt()` first
- Rate limiting: public endpoints and form submissions each have their own rate limit buckets
- Soft deletes: Contact, Task, Sign, Volunteer, Donation, Event all have `deletedAt` — records never hard-deleted

### Deployment Architecture

**Phase 1 (now — June 2026):** Single Next.js monolith. Subdomain routing. One Vercel project + one Railway PostgreSQL.
- app.poll.city → Campaign App
- social.poll.city → Poll City Social (same codebase, subdomain routing)
- media.poll.city → Poll City Media (same codebase, subdomain routing)

**Phase 2 (June — October 2026):** Social gets its own Next.js app and Vercel project. Shared Railway DB + authentication.

**Phase 3 (post-October 2026):** Full separation. Shared API gateway. Three independent deployments. Three-month project — not being built now.

### Infrastructure Roadmap (not yet built)

- P0: Upstash Redis caching (eliminates database bottleneck at scale)
- P0: ISR (Incremental Static Regeneration) for all public pages
- P1: WebSocket via Ably or Pusher (required for election night + real-time canvassing)
- P1: Offline PWA enhancement (IndexedDB queue, Workbox service worker)
- P2: Multi-tenant database isolation for enterprise party tier
- P2: Full election night results pipeline

---

## THE DATABASE — COMPLETE MODEL INVENTORY

Over 100 Prisma models across all domains. Key models by category:

**Authentication:**
User, Account, Session, VerificationToken, TwoFactorToken

**Campaign + Multi-Tenancy:**
Campaign, Member, MemberPermission, CampaignBudget, BudgetLine

**Contacts + CRM:**
Contact, Household, Interaction, ContactNote, ContactRelationship, ContactRoleProfile, SupportProfile, DuplicateCandidate, MergeHistory, ContactAuditLog, CustomFieldValue, Tag

**GOTV + Electoral:**
GotvTier, GotvRide, GotvFollowUp, PrecinctRace, PollingDivision, TurfStop, Turf, CanvasserLocation, GeoBoundary, WardBoundary, MunicipalityBoundary

**Field Operations (Chunk 6+):**
FieldProgram, Route, FieldTarget, FieldShift, FieldShiftAssignment, ScriptTemplate, ScriptPackage, FieldAttempt, FollowUpAction, FieldTeam, FieldTeamMember, FieldAuditLog

**Finance:**
FinanceExpense, FinanceVendor, FinancePurchaseRequest, FinancePurchaseOrder, FinanceReimbursement, FinanceAuditLog

**Fundraising:**
FundraisingCampaign, DonorProfile, Donation, Receipt, Refund, RecurrencePlan, Pledge, DonorAuditLog

**Communications:**
NotificationLog, SmsLog, Newsletter, NewsletterSubscriber, Email, MessageTemplate, SavedSegment, ScheduledMessage

**Events + Calendar:**
Event, EventGuest, EventRsvp, CalendarItem, CalendarItemAssignment, ScheduleConflict, CalendarReminder, CandidateAppearance, CalendarSyncAccount, CalendarSyncLog

**Print:**
PrintTemplate, PrintDesignAsset, PrintOrder, PrintInventory, PrintInventoryLog, PrintPack, PrintPackItem

**Signs:**
Sign, SignRequest

**Volunteers:**
VolunteerProfile, VolunteerInvite, ShiftSignup

**Public / Social / Civic:**
Official, Polling, Poll, PollVote, CivicProfile, TownHallEvent, Question, Mention, TaskBoard, Task, TaskTemplate

**AI + Intelligence:**
CampaignWisdom (George's Brain — future build), ActivityLog, SocialAccount, SocialPost, SocialMention, OpponentIntel

**Election Day:**
WitnessingUser, VoiceBroadcast, VoiceBroadcastCall, ScrutineerAssignment, LiveResult

**Community:**
CommunityCase, BotUser

---

## BUILD ROADMAP — WHERE WE ARE

### Completed Chunks (as of April 2026)

1. Assignment detail page — full stop list, progress bar, action buttons
2. Print Walk List Phase 1 — wired to assignment detail, entry points surfaced
3. Field Ops / Canvassing unification — Canvassing absorbed into Field Ops hub
4. Unified Command Centre — sub-routes fixed, Live Map / Walk / Scripts / Print all render as proper routes
5. Seed expansion — voter file simulation (25 polls, ~6,000 households, ~14,400 contacts) + full enrichment
6. Field Domain Model — 13 enums + 12 models + all 8 planning docs + DB migrated
7. Print Design Engine Phase 2 — live design editor, CSS-scaled template library, asset upload, 5 HTML templates
8. Phase 2: Turf + Geography + Route Planning — APIs + UI + nearest-neighbor optimizer + turf balancing
9. Phase 3: Canvassing Runs + Scripts + Outcomes — APIs + UI + OutcomeCaptureDrawer (16 outcomes) + one-tap logging

### Next in Queue

10. Phase 4: Literature Drop Operations (APIs + UI)
11. Phase 5: Sign Ops inside Field (APIs + UI)
12. Phase 6: Volunteer + Team + Shift Execution (APIs + UI)
13. Phase 7: Inventory + Print + Materials Packaging
14. Phase 8: Mobile + Offline + Paper Fallback + Re-Entry
15. Phase 9: Follow-Up Logic + GOTV + Cross-System Automations
16. Phase 10: AI Assist (Adoni) + Hardening + Audit

---

## KEY DATES

| Date | Event |
|---|---|
| May 2026 | Poll City Canvasser mobile app — App Store submission |
| June 2026 | Poll City Social mobile app — App Store submission + Social splits to own deployment |
| August 2026 | Poll City Campaign mobile app — App Store submission |
| October 26, 2026 | **Ontario Municipal Elections — first major launch target** |
| Post-October 2026 | US expansion: Michigan, New York, Minnesota |

---

## THE SIMULATION ENGINE

For demos, onboarding, and George's own testing — a full data simulation engine runs inside the platform.

**What it simulates:**
- Realistic canvassing activity (door knocks, outcomes, timestamps, volunteer names)
- Donation patterns over a realistic campaign timeline
- Volunteer sign-ups and shift activity
- Event RSVPs and attendance
- GOTV progress curves

**Seed data:** Ward 20 Toronto, 25 polls, ~6,000 households, ~14,400 contacts, realistic support level distribution.

**Kill switch rule:** The simulation engine must be disabled before the first real customer goes live. It corrupts real statistics. George will record dashboard videos while the simulation runs — these become marketing demos and interactive sight designs.

---

## PRICING ARCHITECTURE

### Poll City Campaign

| Tier | Monthly | One-Time Setup | Contacts |
|---|---|---|---|
| School Board | $79 | $299 | Unlimited |
| Municipal | $149 | $499 | Unlimited |
| Provincial | $999 | Included | Unlimited |
| Federal | $2,999 | Included | Unlimited |
| Enterprise Party | $14,999 | Custom | Unlimited |

### Poll City Social
Free forever. Revenue comes from Campaign and Media products.

### Poll City Media

| Product | Price |
|---|---|
| Media subscription | $199-$499/month |
| Intelligence subscription | $499-$4,999/month |
| Polling-as-a-service | $499-$9,999 per poll |
| Election night white-label package | $9,999 one-time per election |

### ATLAS (Intelligence Engine)
Sold bundled into Media subscriptions and as standalone intelligence subscriptions.

---

## WHAT MAKES THIS DIFFERENT

### 1. Built by someone who has actually won
Every feature in Poll City comes from a specific campaign experience George has had. Not from surveys. Not from focus groups. From standing in a riding office at 10pm trying to figure out which polls still have unconfirmed supporters.

### 2. Contacts are unlimited at every tier
Every competitor charges per contact or per voter record. Poll City does not. Unlimited contacts is a philosophical commitment: campaigns should not be punished for doing their job.

### 3. The GOTV Gap is the product
Every other platform buries GOTV inside a feature list. Poll City makes it the largest number on the screen. That single number — votes needed today — is what wins and loses elections. It belongs at the center of everything.

### 4. The confidence scoring system
No other campaign platform calculates confidence scores on supporter records. Poll City knows that a call-centre "yes" is worth 30 cents on the dollar compared to an in-person canvass confirmation. This changes how E-day resources are deployed. It wins close races.

### 5. The field ops system is enterprise-grade
Most canvassing tools are apps. Poll City's field ops system is an operating system — turf management, route optimization, shift execution, materials tracking, follow-up automation, and cross-system wiring all in one unified hub.

### 6. Adoni carries 35 years of expertise
No other campaign platform has this. Every Adoni interaction draws from George's catalogued experience — advance vote strategy, call centre verification, apartment density rules, polling station priority formulas. You do not get a chatbot. You get the campaign manager who has been there.

### 7. Nonpartisan by design
Poll City works for every party because it was built by someone who has worked for every party. There is no partisan bias in the tool. This is both a legal necessity and a competitive advantage: a tool that only works for one side is worth half the market.

### 8. Canadian-first, then expansion
Built for Canadian elections law, Canadian data privacy law, and Canadian democratic norms. CASL compliant. Elections Canada ready. October 2026 Ontario municipal elections are the proving ground. Then US expansion with a platform already hardened in the field.

---

## GEORGE'S OPERATOR NOTIFICATIONS

George receives push notifications for:
- Build failures
- Security incidents
- Site down
- First customer acquired
- Payment received
- Scale warnings

**Scale thresholds:**
- Vercel: alert at 80% / critical at 95%
- Railway DB: alert at 70% / critical at 90%
- Railway compute: alert at 80% / critical at 95%
- Anthropic API spend: alert at $500/month / critical at $800/month
- Twilio balance: alert at $50 remaining / urgent at $20 remaining

**Daily 7am Adoni brief includes:**
- Active campaigns status
- New sign-ups last 24 hours
- Revenue last 24 hours
- Security events (if any)
- Server health summary
- One thing that needs George's attention today

---

## THE CLAIM YOUR PROFILE CONVERSION FUNNEL

For sitting elected officials: Poll City Social already has their public profile (constructed from public data). A "Claim your profile" CTA on the pricing page creates urgency and surprise.

The message: "Your profile already exists. Constituents are already checking your accountability rating. Claim it to take control of your narrative — add your platform, respond to questions, track your own promises."

This is a marketing tactic designed specifically for the incumbent market. Incumbents are more likely to have an operations budget. The surprise of seeing their profile already exist creates urgency.

---

## THE SPIRIT

Poll City is for Canadian democracy. Real candidates. Real voters. Real elections.

The October 2026 Ontario municipal elections are the first major target. A first-time candidate trying to win their school board seat should have the same tools as a party with a $5 million budget — just scaled to their size.

George built this platform because he spent 35 years watching good candidates lose because they had worse tools than their opponents. That ends here.

---

*Document generated April 11, 2026. Covers the complete Poll City ecosystem: Campaign App, Poll City Social, Poll City Media, ATLAS Intelligence Engine, Mobile Apps, Adoni AI, Field Operations, Finance, Print, and full technical architecture.*
