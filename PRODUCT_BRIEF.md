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