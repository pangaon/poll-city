## v1.8.0 Completion Summary - April 4, 2026

This pass completes the campaign operations expansion for volunteer coordination, field lookup velocity, and execution intelligence.

Release note: this section was refreshed during the v1.8.0 stabilization pass to align product messaging with implemented routes and APIs.

### Delivered modules

- Volunteer onboarding: secure token flow for profile completion and code-of-conduct acceptance.
- Volunteer groups: team grouping, leadership assignment, and group messaging.
- Volunteer shifts: shift creation, signup/check-in, and reminder triggers.
- Canvassing scripts: script library for field and phone workflows.
- Lookup quick actions: one-tap field updates with interaction logging and GPS capture.
- Media tracker: press/coverage record system.
- Coalition tracker: coalition and endorsement tracking.
- Opponent intelligence: competitive intel capture by source/confidence.
- Events tracker: campaign events and RSVP-ready structures.
- Volunteer expenses: reimbursement request tracking.
- Budget tracker: category-level allocation/spend/remaining monitoring.
- Super supporters: high-value supporter identification and task assignment workflow.

### Platform impact

- Expanded Prisma schema to include campaign operations entities for volunteers, coalitions, scripts, intel, events, expenses, and budgets.
- Added API surface and route pages for each module in authenticated app navigation.
- Added turf assignment support to volunteer groups.
- Added social profile "My Volunteering" view to expose active volunteer-interest consent links.

Done. I expanded it into a full developer pack in the canvas.

It now includes:

* full product definitions
* architecture spec
* database/entity model
* permissions model
* API/module plan
* MVP, Phase 2, Phase 3 breakdown
* detailed workflows
* dashboard requirements
* notifications strategy
* analytics/reporting requirements
* security/privacy requirements
* module backlog
* sprint sequence
* developer acceptance criteria
* an architect/Claude master build prompt

This is now in much better shape to hand to a real developer.

Next strongest move is turning this into one of these two formats:

1. a **technical PRD + backlog pack** broken into epics/stories
2. a **Claude-ready execution pack** broken into exact build prompts file by file

Pick one and I’ll structure it properly.

---

## Candidate and Official Page Customization

Poll City's candidate public page is the most important monetization surface — it is the face a candidate presents to every voter. Each of the 26 customization features below is tier-gated so candidates upgrade to unlock more.

### Tier access levels
- **Free** — basic page, default blue theme, no customization
- **Starter** — branding (colours + logo) + 6 themes
- **Pro** — all visual, content, SEO, analytics, QR code features
- **Official** — same as Pro + elected official widgets (office hours, committees, voting record, accomplishments, newsletter)
- **Command** — white-label (remove Poll City branding, custom CSS, custom footer text, custom domain)

### The 26 Features

| # | Feature | Tier |
|---|---------|------|
| 1 | **Primary colour** — hero gradient and accent colour picker | Starter+ |
| 2 | **Accent colour** — button and link colour | Starter+ |
| 3 | **Logo upload** — replaces default initials avatar | Starter+ |
| 4 | **6 Themes** — Classic Blue, Bold Red, Modern Dark, Clean White, Campaign Green, Royal Purple | Starter+ |
| 5 | **5 Font pairs** — Playfair/SourceSans, Inter/Inter, Merriweather/OpenSans, Montserrat/Lato, Georgia/Arial | Pro+ |
| 6 | **4 Page layouts** — Professional (headshot left), Modern (full-width hero), Bold (large type), Minimal (clean whitespace) | Pro+ |
| 7 | **Hero banner image** — full-bleed custom background image URL | Pro+ |
| 8 | **Hero video** — autoplay background video in hero section | Pro+ |
| 9 | **Social proof bar** — top bar showing supporter count | Pro+ |
| 10 | **Countdown timer** — days until election date | Pro+ |
| 11 | **Live poll widget** — public polls embedded on page | Pro+ |
| 12 | **Door counter** — live "doors knocked" counter | Pro+ |
| 13 | **Supporter wall** — names of recent supporters | Pro+ |
| 14 | **Endorsements** — up to 10 endorsement cards with org logo and quote | Pro+ |
| 15 | **Custom FAQ** — up to 10 Q&A items | Pro+ |
| 16 | **Email capture widget** — email sign-up box with custom headline and button text | Pro+ |
| 17 | **Donation widget** — donate button with custom amounts | Pro+ |
| 18 | **Office hours** — up to 5 day/time/location entries | Official+ |
| 19 | **Committees** — up to 10 committee name/role entries | Official+ |
| 20 | **Voting record URL** — link to official voting record | Official+ |
| 21 | **Accomplishments timeline** — up to 20 dated accomplishments | Official+ |
| 22 | **Newsletter signup** — with custom newsletter name | Official+ |
| 23 | **Town hall scheduler** — Calendly/booking URL integration | Official+ |
| 24 | **SEO title and description** — custom meta tags for Google | Pro+ |
| 25 | **QR code** — downloadable QR code (PNG + SVG) with custom label and 3 sizes | Pro+ |
| 26 | **White label** — hide Poll City branding, custom CSS, custom footer text | Command only |

### Live Preview
The `/settings/public-page` page builder renders a live mini-preview of the candidate page in a side panel that updates in real-time as settings change. No save needed to see the result.

### Tier gate UI
Every locked section shows a grey overlay with a lock icon, the required plan name, and an "Upgrade Now →" button to `/billing`. Locked features are always visible — candidates see exactly what they would get by upgrading.

### Analytics
The `pageViews` field on the Campaign model is incremented on every candidate page load via a client-side POST to `/api/campaigns/[id]/customization`. The `/analytics` page (Pro+) shows total page views over time.

---

## Canada-Wide Election Calendar 2026

Poll City is live for two primary Canadian provincial election markets in 2026:

- **Ontario Municipal Elections**: October 26, 2026 (nominations open May 1, close August 21, 2026)
- **BC Municipal Elections**: October 17, 2026

These two provinces represent 444 municipalities and 7,000+ elected officials that are integrated into Poll City Social for voter engagement and candidate discoverability.

---

## Advanced Features Roadmap

### Turf Cutting and Route Optimization

- Smart turf creation by ward, poll number, street, odd/even sides
- Route optimization — shortest walking path between doors
- Google Maps walking directions door to door
- Poll-by-poll assignment and tracking
- Street-by-street odd/even split for canvassing efficiency
- Real-time canvasser GPS location tracking on manager map
- Turf completion percentage live updates
- Auto-reassign incomplete turfs to available canvassers
- Canvasser performance leaderboard

### Election Data Visualization

- Support level heat maps per poll district
- Voter turnout heat maps vs 2022 and 2018 results
- Support level choropleth maps by ward
- Door knock completion maps
- Sign density maps
- Donation heat maps
- Volunteer coverage maps
- Time-series charts showing support level changes over campaign
- Poll-by-poll breakdown tables
- Export all maps as PNG for campaign use

### Dashboard Drag and Drop Customization

- Drag and drop widget placement
- Show/hide any widget
- Resize widgets
- Save custom layouts per user
- Pre-built layouts: Field View, Finance View, GOTV View, Overview
- Mobile dashboard layout separate from desktop
- Real-time data refresh on all widgets
- Widget library: contacts added today, doors knocked, sign requests, volunteer hours, donation total, GOTV progress, supporter map, call list progress

### Additional Platform Features

- Canvassing script builder with branching logic
- Voter file import with automatic field mapping
- Duplicate contact detection and merge
- Household grouping for door knocking
- Do not knock and do not call flags visible in field app
- Weather integration showing forecast for canvassing days
- Shift scheduling for volunteers with SMS reminders
- Event management — create, promote, track attendance
- Media library for campaign assets
- Bulk SMS to supporters CASL compliant
- Campaign budget tracker
- Opponent sign spotting with map
- School board trustee district data
- Federal and provincial riding overlap display

---

## Master Product and System Specification (v5.0.0 Consolidated)

Date: 2026-04-05
Source: user-provided "DOCUMENT 1" and "DOCUMENT 2" synthesis.

### Deduplication Rule (Mandatory)

If an item appears in multiple docs, keep one canonical source only.
All duplicate mentions must reference that canonical source instead of redefining it.

### Canonical Source Map (Single Source of Truth)

- Product modules and scope: this file (`PRODUCT_BRIEF.md`)
- Research rationale and market context: `RESEARCH_BRIEF.md`
- Security controls and compliance implementation: `SECURITY_BLUEPRINT.md`
- Feature build/verify status matrix: `FEATURE_MATRIX.md`
- Build and contributor process controls: `docs/FEATURE_COMPLETION_STANDARD.md`, `docs/DEVELOPER_HANDOFF_PROTOCOL.md`
- Cross-developer coordination and handoffs: `docs/COORDINATION_THREAD.md`, `docs/PROGRESS_LOG.md`

## 1) System Overview

Poll City is a modular political-engagement ecosystem with four coordinated product surfaces plus a unified control center:

- Poll City (Campaign OS)
- Poll City Social (public/voter network + polling engine)
- Poll City Print (on-demand campaign logistics + vendor network)
- Poll City Marketplace (merch + fundraising engine)
- Unified enterprise dashboard (cross-surface control center)

## 2) Product Breakdown

### 2.1 Poll City (Campaign OS)

Purpose: full campaign operating system for candidates, teams, and political organizations.

Core modules:

1. Voter CRM
- Contact profiles
- Support tagging
- Interaction logs
- Household grouping
- Issue tracking
- Voting likelihood scoring

2. Canvassing System
- Mobile-first walk app
- Map-based walk lists
- Poll/ward/riding geo segmentation
- Real-time capture of support, issues, notes, sign requests, and follow-ups

3. Campaign Intelligence Engine
- Support heatmaps
- Geographic issue trends
- Volunteer performance tracking
- Predictive turnout modeling

4. Volunteer Management
- Signup funnel
- Scheduling and shift tracking
- Performance and communication tools

5. Event System
- RSVP management
- QR check-in
- Attendance tracking
- Donor tagging

6. Messaging Engine
- SMS
- Email
- Push notifications
- Geo-targeted delivery

7. Sign and Literature Tracking
- Inventory, install, and removal tracking
- Opponent sign reporting

8. Campaign Services Network (Uber-style)
- On-demand sign teams, canvassers, and lit-drop crews
- Ratings and marketplace pricing

### 2.2 Poll City Social (Public Platform)

Purpose: public engagement, civic identity, and enterprise polling.

Core capabilities:

1. User system
- Account creation (email/phone/social)
- Postal/address identity context
- Anonymous and verified participation modes

2. Civic mapping
- Address -> elected officials and candidates by jurisdiction

3. Polling engine
- Flash polls
- Structured surveys
- Geo polls
- Demographic polling
- Live election polling
- Issue-based polling

4. Enterprise polling controls
- Weighted polling
- Sample balancing
- Response validation
- Anti-bot controls
- Statistical confidence scoring

5. Cross-industry applicability
- Political, corporate, media, government, NGO, and education workflows

6. Engagement
- Comments, reactions, sharing, follows, and candidate questions

7. Consent bridge (critical)
- Explicit opt-in before sharing campaign-actionable signals
- Revocation and data minimization constraints

### 2.3 Poll City Print

Purpose: campaign print logistics and fulfillment.

- Campaign print ordering (signs, flyers, banners, apparel)
- Vendor onboarding and bidding
- Production and delivery tracking workflow

### 2.4 Poll City Marketplace

Purpose: campaign merch and fundraising monetization.

- Multi-product campaign stores
- Multi-vendor support
- Revenue split logic
- Commerce integration (including Shopify-compatible backend flows)

### 2.5 Unified Dashboard

Single-login control center for campaign managers, officials, and organizations:

- CRM overview
- Poll analytics
- Messaging control
- Financial tracking
- Print operations
- Marketplace revenue

## 3) Technical Architecture and Build Instructions

### 3.1 Frontend

- Web: Next.js SSR + Tailwind UI
- Mobile: React Native (Expo or bare RN based on performance constraints)

### 3.2 Backend

- Node.js API layer (Fastify-preferred performance target where applicable)
- Service domains: auth, users, campaigns, polling, messaging, print, marketplace, analytics

### 3.3 Data and Infra

- Primary DB: PostgreSQL
- Secondary cache/session: Redis
- Analytics warehouse: BigQuery or ClickHouse (phase-dependent)
- Infra target: AWS or GCP with Kubernetes and CDN edge support

### 3.4 Authentication and Access

- JWT-based auth
- RBAC
- Multi-tenant campaign isolation

### 3.5 Performance Requirements

- App size target under 50MB for mobile package constraints
- API response target under 200ms for hot paths
- Real-time updates through websocket/streaming channels where required

### 3.6 AI Integration

- Hybrid OpenAI and Claude usage
- Messaging recommendations
- Poll insights
- Voter segmentation
- Workflow automation recommendations

### 3.7 Security Requirements

- End-to-end encryption strategy by context
- GDPR/PIPEDA-aligned controls
- Campaign-level data segregation
- Audit logging
- Rate limiting and DDoS controls

### 3.8 Critical Data Flow

- Poll City Social -> Consent -> Poll City CRM only when user explicitly opts in

### 3.9 Build Phases

Phase 1 (MVP, 8-12 weeks): auth, polling, basic CRM, canvassing, dashboard

Phase 2: print, marketplace, messaging

Phase 3: AI optimization, predictive analytics, services marketplace

### 3.10 Non-Negotiable Standards

- Clean architecture (no shortcut monolith regressions)
- Full API documentation
- Test coverage target over 80%
- CI/CD discipline
- Version control hygiene

## 4) Final Delivery Directive

This ecosystem is not a prototype scope.
It is an enterprise multi-product platform designed for municipal, provincial, federal, and eventual global scale operations.
