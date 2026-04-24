# Poll City — Complete User Journey Map
## Every persona. Every flow. What's built. What's missing.

Last updated: 2026-04-17
Written by: Claude Sonnet 4.6 after full audit of BUILDPLAN, FEATURE_MATRIX, PRODUCT_BRIEF, SYSTEM_MAP, and codebase.

---

## THE PLATFORM HAS FOUR PRODUCT SURFACES

| Surface | URL | Audience | Status |
|---|---|---|---|
| **Campaign OS** | app.poll.city | Campaign staff | ✅ Built |
| **Poll City Social** | social.poll.city | Public voters | ⚠️ Partial |
| **Poll City Print** | Inside Campaign OS | Campaigns + Vendors | ⚠️ Partial |
| **Poll City Marketplace** | TBD | Campaigns + Merch vendors | ❌ Not built |

---

## PERSONA 1 — CAMPAIGN MANAGER

The person running the whole operation day to day.

### Journey: Campaign Setup (first day)
| Step | Route | Status |
|---|---|---|
| Create account | /login | ✅ |
| Create new campaign | /campaigns/new | ✅ |
| Set brand (colours, logo, fonts) | /settings/brand | ✅ |
| Customize candidate public page (26 features, tier-gated) | /settings/public-page | ✅ |
| Invite team members and assign roles | /settings/team | ✅ |
| Import voter file (CSV with auto-mapping) | /import-export/smart-import | ⚠️ Smart import exists — voter file with ward/poll enrichment is thin |
| Set up campaign budget | /finance/budget | ✅ |
| Configure Adoni AI preferences | (Adoni panel) | ✅ |

**Gap:** Voter file import should automatically parse ward/poll/riding and map to contacts. Currently, the smart import wizard handles general CSVs but does not enrich with electoral district data or household grouping from the file.

---

### Journey: Daily Operations Cycle
| Step | Route | Status |
|---|---|---|
| Read morning briefing | /briefing | ✅ |
| Check campaign health dashboard | /dashboard | ✅ |
| Ask Adoni for context | (floating panel or /ai-assist) | ✅ |
| Assign turf to canvassers | /field-ops | ✅ |
| Monitor canvassing in real time | /field-ops/map | ✅ |
| Review results, flag follow-ups | /field-ops → follow-ups tab | ✅ |
| See support heat map by poll district | ❌ | ❌ CNN-level Leaflet maps not built |
| Check sign requests, assign install crews | /signs | ✅ |
| Review and assign tasks | /tasks | ✅ |
| Send communications | /communications | ✅ |
| Check finance dashboard | /finance | ✅ |

**Gap:** Geographic intelligence visualization — support level choropleth by poll district, door knock completion maps, sign density maps — is not built. Leaflet is a placeholder.

---

### Journey: GOTV Week
| Step | Route | Status |
|---|---|---|
| Build GOTV target list (the formula) | /gotv | ✅ |
| Assign canvassers to final push | /field-ops | ✅ |
| Activate phone bank | /call-list | ✅ |
| Coordinate rides for supporters | /gotv → rides tab | ✅ |
| Track real-time GOTV gap | /gotv | ✅ |
| Send GOTV email/SMS blast | /communications | ✅ |
| Deploy scrutineers on election day | /eday | ✅ |
| Monitor results in election night HQ | /eday/hq | ✅ |

---

### Journey: Election Results Capture
| Step | Route | Status |
|---|---|---|
| Advance vote capture | ❌ | ⚠️ ACTIVE BUILD — another session is building this now |
| Poll-by-poll result entry on election day | ❌ | ⚠️ ACTIVE BUILD |
| War room live totals | /eday/hq | ✅ (scrutineer totals) |
| Final reconciliation and export | ❌ | ❌ Not built |

---

## PERSONA 2 — CANVASSER / FIELD WORKER

### Journey: Canvassing a Door
| Step | Route | Status |
|---|---|---|
| Open mobile app or mobile browser | /field-ops/walk (mobile) | ✅ |
| See assigned turf on map | Walk shell → map | ✅ |
| Navigate to door (deep link → Apple Maps / Google Maps) | Door card → 📍 | ✅ |
| Knock door, record support level, notes, sign request | Walk shell → door capture | ✅ |
| Record issue/concern from voter | Field capture | ✅ |
| Flag for follow-up | Walk shell | ✅ |
| Queue offline if no signal | Offline queue + auto-sync | ✅ |
| See weather forecast for canvassing day | ❌ | ❌ Not built |
| Use canvassing script with branching logic | /field-ops/scripts | ⚠️ Scripts exist, no conditional branching |

**Gap:** Weather integration (important for field planning). Canvassing script branching logic (currently scripts are static text, not interactive decision trees).

---

### Journey: Canvasser Self-Service
| Step | Route | Status |
|---|---|---|
| Sign up as volunteer (via candidate public page) | /candidates/[slug] | ✅ |
| Receive token invite link | Email → /volunteer/onboard/[token] | ✅ |
| Complete volunteer profile | Onboarding flow | ✅ |
| See assigned shifts | /volunteers/shifts | ✅ |
| Check in to shift | Shift check-in (code or QR) | ✅ |
| Log mileage / expense claim | /volunteers/expenses | ✅ |
| Receive approved reimbursement | /finance/reimbursements | ⚠️ Approval chain built, actual payment (Stripe/bank) not wired |

**Gap:** Final payment of approved reimbursements is not wired to Stripe or bank transfer. Approval chain says "approved" but money doesn't move automatically.

---

## PERSONA 3 — SCRUTINEER

### Journey: Election Day Observation
| Step | Route | Status |
|---|---|---|
| Receive assignment | /eday | ✅ |
| Check in to assigned poll station | /eday | ✅ |
| Record advance/polling day votes via OCR or manual entry | /eday (scrutineer OCR tool) | ✅ |
| Flag irregularities | /eday | ✅ |
| Results flow to war room | /eday/hq | ✅ |
| Full election results capture system | ❌ | ⚠️ ACTIVE BUILD — another session is building this |

---

## PERSONA 4 — VOLUNTEER

### Journey: Volunteer Lifecycle
| Step | Route | Status |
|---|---|---|
| Discover campaign and sign up interest | /candidates/[slug] | ✅ |
| Receive token invite | Email → /volunteer/onboard/[token] | ✅ |
| Complete profile + code of conduct | Onboarding | ✅ |
| See available shifts | /volunteers/shifts | ✅ |
| Sign up for shift | Shift signup | ✅ |
| Receive SMS reminder | Comms automation | ✅ |
| Check in on event day | Check-in code / QR | ✅ |
| Submit expense claim | /volunteers/expenses | ✅ |
| Receive reimbursement | ⚠️ | ⚠️ Approved but payment not automated |

---

## PERSONA 5 — FINANCE OFFICER

### Journey: Campaign Financial Management
| Step | Route | Status |
|---|---|---|
| Set up budget by category | /finance/budget | ✅ |
| Review expense submissions | /finance/expenses | ✅ |
| Approve/reject purchase requests | /finance/approvals | ✅ |
| Manage vendor database | /finance/vendors | ✅ |
| Process reimbursements | /finance/reimbursements | ✅ |
| Run compliance report (donor limits) | /finance + compliance card | ✅ |
| Export for Elections Canada filing | /finance/reports → CSV | ✅ |
| Reconcile with fundraising | /finance/reports → reconciliation tab | ✅ |
| Full audit trail | /finance/audit | ✅ |
| Approve major print orders | Print job → Finance bridge | ✅ |

---

## PERSONA 6 — COMMUNICATIONS MANAGER

### Journey: Email / SMS Campaign
| Step | Route | Status |
|---|---|---|
| Build audience segment | /communications → Audiences tab | ✅ |
| Write email with AI assist | /communications → compose | ✅ |
| Schedule send | Scheduled messages | ✅ |
| Track opens, clicks, bounces | /communications → Analytics | ✅ |
| Handle opt-outs (STOP for SMS) | Webhook (Twilio STOP) | ✅ |
| Manage CASL consent basis | ❌ | ❌ Not built — no consent ledger, no legal basis tracking |
| Enforce fatigue guard (max frequency) | ❌ | ❌ Not built |
| Publish to Facebook / X / LinkedIn | /communications/social | ⚠️ UI built, real API calls not wired |

**Gap:** CASL compliance is critical for Canadian campaigns before any mass outreach. No consent ledger, no legal basis tracking, no proof of consent. This blocks legitimate use of the email blast feature for cold lists. **Must be built before platform is used by real campaigns.**

---

## PERSONA 7 — VOTER / PUBLIC USER

### Journey: Voter Discovery on Poll City Social
| Step | Route | Status |
|---|---|---|
| Enter postal code → see local officials | /social or /officials | ✅ |
| Follow an official | /social/officials/[id] | ✅ |
| Vote on a civic poll | /social/polls/[id] | ✅ |
| Ask a question to an official | /social/officials/[id] | ✅ |
| Create civic passport | /social/onboarding | ✅ |
| See personal civic profile | /social/profile | ✅ |
| Get notifications for followed officials | ❌ | ❌ Notification subscription partial |
| See activity feed (follows, poll results, civic events) | ❌ | ❌ Full social feed not built — /social is a discovery page only |
| Consent to share data with a campaign | ❌ | ❌ CASL consent bridge not built |

### Journey: Voter Engages With Candidate
| Step | Route | Status |
|---|---|---|
| Find candidate's public page | /candidates/[slug] | ✅ |
| See customized page (up to 26 features based on tier) | /candidates/[slug] | ✅ |
| Sign up as supporter | Candidate page → /api/public/candidates/[slug]/support | ✅ |
| Request a lawn sign | Candidate page → sign request | ✅ |
| Sign up as volunteer | Candidate page → volunteer signup | ✅ |
| Donate | Candidate page → /donate/[slug] | ✅ |
| Vote on candidate's live poll embed | Candidate page → embedded poll | ✅ |
| Ask a question to the candidate | Candidate page → question | ✅ |
| Attend a virtual town hall | /townhall/[slug] | ✅ |
| Data from above flows to Campaign CRM | /api/public/candidates → CRM | ✅ |

**Note:** The voter → campaign inbound flow IS built. Supporters, sign requests, volunteer signups, donations, questions all flow into the CRM.

**Gap:** The Social → Campaign consent bridge (where a voter on Poll City Social explicitly consents to being contacted by a specific campaign) is not built. Voters who engage on /social don't automatically flow into campaign CRMs — they need to explicitly engage via the candidate's page.

---

## PERSONA 8 — CANDIDATE (the individual running)

### Journey: Managing Their Public Profile
| Step | Route | Status |
|---|---|---|
| Claim official profile | /claim/[slug] | ✅ |
| Customize public page | /settings/public-page | ✅ (1089 lines, 26 features, tier-gated) |
| See page view analytics | /analytics (Pro+ tier) | ✅ |
| Review questions from voters | CRM or /contacts | ✅ |
| Respond to questions | ❌ | ❌ Candidates can't respond to public questions from the app |
| Manage candidate schedule | /calendar/candidate | ✅ |
| Add accomplishments, endorsements | /settings/public-page | ✅ |
| View supporter wall | Public page + CRM | ✅ |

**Gap:** Candidates cannot reply to voter questions from within the platform. Questions come in but responses are not wired.

---

## PERSONA 9 — PRINT VENDOR

### Journey: Vendor Operations
| Step | Route | Status |
|---|---|---|
| Register as vendor | /print/shops/register | ✅ (Stripe Connect onboarding) |
| See active print job requests | /print/shops | ⚠️ Directory exists, vendor-specific job view unclear |
| Submit bid on a job | /print/jobs/[id] → bids | ✅ |
| Get selected, start production | Status update | ⚠️ Status updates are manual, no vendor portal |
| Update production status | ❌ | ❌ No vendor portal — vendors can't log in and update status |
| Deliver, trigger escrow release | /api/print/payment/release | ⚠️ API exists, UI trigger unclear |
| Receive payment | Stripe Connect | ✅ |

**Gap:** Vendors have no dedicated portal. They can register via Stripe Connect but cannot log in to see their jobs, update production status, or communicate with the campaign. This is a P0 gap for the print marketplace to function.

---

## PERSONA 10 — PLATFORM ADMIN (George)

### Journey: Managing All Campaigns
| Step | Route | Status |
|---|---|---|
| See all active campaigns and health | /ops | ✅ |
| See all campaigns list with details | /ops/campaigns | ✅ |
| Review content queue (autonomous pipeline) | /ops/content-review | ✅ |
| Manage demo tokens | /ops/demo-tokens | ✅ |
| Monitor security events | /ops/security | ✅ |
| Verify features across platform | /ops/verify | ✅ |
| Manage training videos / docs | /ops/videos | ✅ |
| Full founder cockpit with attention queue | ❌ | ❌ /ops exists but is not the full HQ vision (per-client health indicators, attention queue, revenue tracking) |

---

## WHAT IS NOT BUILT — GAP REGISTER

### CRITICAL GAPS (block real campaigns from using the platform)

| Gap | Impact | Notes |
|---|---|---|
| **CASL consent management** | 🔴 Legal risk | No consent ledger, no legal basis tracking. Cannot send mass email to cold lists legally without this. Must be built before any real campaign uses Communications. |
| **Migration baseline** | 🔴 Data risk | `npx prisma migrate dev --name initial_baseline` must be run before first real customer. Any future schema change without this could corrupt production data. |
| **Vendor portal** | 🔴 Marketplace broken | Print vendors have no way to log in, see their jobs, or update production status. Print marketplace can't function without this. |
| **Voter file import enrichment** | 🟠 Core workflow | Import exists but voter file with ward/poll/household/riding data is not parsed and enriched into contacts automatically. This is how every campaign starts. |

---

### SIGNIFICANT GAPS (platform works without them, but feels incomplete)

| Gap | Impact | Notes |
|---|---|---|
| **Social → Campaign consent bridge** | 🟠 Revenue gap | Voters on Poll City Social can't explicitly consent to being contacted by a campaign. This is the key monetization link between the two platforms. |
| **Geographic maps (CNN-level)** | 🟠 Strategy tool | Leaflet choropleth maps (support by poll, door knock completion, sign density) are not built. Campaign managers make decisions based on geography. |
| **Canvassing script branching** | 🟠 Field quality | Scripts exist as static text. No conditional logic (if voter says X, go to branch Y). |
| **Candidate Q&A responses** | 🟠 Public engagement | Voters can ask questions on the candidate page but candidates have no way to respond publicly. |
| **Volunteer payment automation** | 🟡 Ops friction | Reimbursements are approved but payment (Stripe or bank transfer) is not automated. |
| **Social feed** | 🟡 Retention | Poll City Social has discovery and polls but no activity feed — no reason for a voter to come back. |
| **Weather integration** | 🟡 Field planning | Canvassers and CMs plan based on weather. Simple API integration. |
| **Comms fatigue guard** | 🟡 Quality | No maximum contact frequency enforcement across channels. |
| **Social publishing (real API)** | 🟡 Comms | Facebook/X/LinkedIn post API calls are stubbed — UI exists, real posting not wired. |
| **Calendar Google/Outlook OAuth** | 🟡 Ops | Two-way sync is a stub. Real OAuth integration needed. |

---

### FUTURE SURFACES (separate products in the vision, not yet started)

| Product | Description | Status |
|---|---|---|
| **Campaign Services Network** | "Uber for campaign services" — on-demand canvassers, sign install crews, lit-drop teams, with ratings + marketplace pricing | ❌ Not started |
| **Poll City Marketplace** | Campaign merch stores — multi-product, multi-vendor, revenue splits, Shopify-compatible flows | ❌ Not started |
| **George's Brain (CampaignWisdom)** | Living knowledge base of George's 35 years in Canadian politics, extracted from Otter recordings, integrated into Adoni | ❌ Not started |
| **TV Mode** | 7 election night display modes for press room, Chromecast/AirPlay | ❌ Not started |
| **Simulation Engine** | Real-time campaign activity simulator for demos and training | ❌ Not started (seed data is current sim) |
| **Mobile App (App Store)** | React Native app in `mobile/` is built and API-connected but not published | ⚠️ May 2026 deadline |
| **Poll City Social (full)** | Civic engagement features beyond polls and officials — feed, notifications, consent bridge, civic calendar full integration | ⚠️ Foundation built |
| **HQ Dashboard** | Full founder ops cockpit with per-client health indicators, attention queue, revenue tracking | ⚠️ `/ops` is a starting point |

---

## JOURNEY COHERENCE ISSUES

Things that are built but don't connect to each other properly:

| Issue | Details |
|---|---|
| **Poll City Social ↔ Campaign CRM** | Voters on /social are isolated from campaigns. The bridge only exists if a voter explicitly goes to /candidates/[slug]. Two platforms need a consent-gated connection. |
| **Brand Kit → Outputs** | `/settings/brand` is fully built (colours, logo, fonts) but these settings are not applied to email templates, print designs, or the candidate public page. It's a settings page that sets nothing. |
| **Sign requests → Signs module** | When a voter requests a sign via the candidate public page, does that create a Sign record in /signs? This needs to be verified. |
| **QR Capture → CRM** | The QR capture pipeline was recently wired (capture.ts WIP from prior session). Verify it is committed and working end-to-end. |
| **Donation → Fundraising → Finance** | Multiple pipelines exist: /donations (manual), /donate/[slug] (public Stripe), /fundraising (management). Are all three flowing to the same finance ledger? |
| **Volunteer signup via public page → Volunteer module** | When a voter volunteers via /candidates/[slug], does a VolunteerProfile get created and appear in /volunteers? |

---

## PLATFORM COHERENCE SCORE

| Area | Score | Notes |
|---|---|---|
| Campaign Operations (CRM + Field + GOTV) | 9/10 | Full enterprise. Map visualization is the only major gap. |
| Finance | 9/10 | Complete. Payment automation for reimbursements is the gap. |
| Communications | 7/10 | Phases 1-7 solid. CASL consent is a legal gap before use. |
| Print Marketplace | 5/10 | Campaign side is good. Vendor portal doesn't exist. |
| Fundraising | 8/10 | Strong. Stripe integrated. Compliance engine good. |
| Candidate Public Pages | 8/10 | 26-feature builder is built. Q&A responses missing. |
| Poll City Social | 5/10 | Foundation solid. No feed, no consent bridge, no notifications. |
| Intelligence (CIE + RCAE + Analytics) | 7/10 | Built. Geographic maps are the major gap. |
| Mobile App | 6/10 | Field functionality is real. Not published. |
| Platform Admin (Ops) | 7/10 | Core ops solid. Full HQ cockpit vision not realized. |

---

*This file is the user journey truth. Code is the proof. Keep them in sync.*
*Every new feature session should ask: which user journey does this advance, and does it connect?*
