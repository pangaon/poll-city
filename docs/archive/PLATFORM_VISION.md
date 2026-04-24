# PLATFORM VISION — WHAT POLL CITY ACTUALLY IS
## Mandatory reading before touching any code.
## Synthesized from every doc in this repository — April 2026.
## Last updated: 2026-04-17 — Claude Sonnet 4.6

---

## START HERE: The Document Stack

Every session, read in this order:
1. `DOCUMENTATION_INDEX.md` — the index. Tells you what every doc is for and when to read it.
2. `FIGMA.md` — master project context (routes, design system, tech stack, page status). READ THIS BEFORE ANYTHING.
3. `CLAUDE.md` — agent standing orders, build rules, quality gates
4. `WORK_QUEUE.md` — claim your task before starting
5. `CONNECTIONS.md` — before touching Contact/Donation/Task/Event/Sign data

When building anything, also read:
- `COMPONENTS.md` — every existing component so you do not duplicate
- `SPECIFICATIONS.md` — spec index for every feature
- `SYSTEM_MAP.md` — module inventory, what is built, what is schema-only, what is future
- `GEORGE_TODO.md` — if your work creates a manual step George must take

There are 50+ markdown docs at root level and more in `docs/`. Agents who skip them build the wrong thing. Read `DOCUMENTATION_INDEX.md` first — it maps everything.

---

## THE ONE-SENTENCE TRUTH

Poll City is the civic infrastructure of Canadian democracy — a unified platform where candidates run campaigns, elected officials govern publicly, citizens participate meaningfully, and media covers it all in real time.

---

## WHAT THIS IS NOT

- Not just campaign software
- Not a CRM with extras bolted on
- Not a single product

The campaign app (app.poll.city) is one of three products. The most publicly visible product is Poll City Social — not the campaign app.

---

## THE THREE PRODUCTS

### Product 1 — Poll City Campaign OS (B2B)
**URL:** app.poll.city
**Who:** Candidates, campaign managers, parties, elected officials
**Revenue:** Subscriptions (election-type pricing) + usage overages
**Design reference:** "Stripe + Linear + NationBuilder + Meta Ads Manager combined"

The full campaign operating system: CRM, canvassing, GOTV, volunteers, events, communications (email/SMS/social), donations, finance, print, AI (Adoni), analytics, and intelligence.

**The five user personas — know them before building anything:**
1. First-time candidate (28-45, terrified, 20 minutes between meetings) — needs obvious, forgiving, encouraging, fast
2. Experienced campaign manager (5-15 campaigns, will leave if slower than their spreadsheet) — needs power, speed, control, data
3. Canvasser (volunteer, 6:30pm, phone in one hand, door hanger in the other, possibly raining) — needs one-handed, works offline, instant results
4. Field director (managing 20 volunteers across 8 turfs) — needs real-time overview, reassign on the fly
5. The candidate (calling at midnight: "are we going to win?") — needs one number: The Gap

---

### Product 2 — Poll City Social (B2C)
**URL:** social.poll.city
**Who:** All Canadian citizens + elected officials + candidates
**Revenue:** Advertising + premium features (always free for citizens)

**This is "Facebook for politics." Read that literally.**

Not a companion feature. A civic network where:
- Elected officials (councillors, MPPs, MPs, mayors) have their living public profile
- Candidates have their discovery profile and voter engagement surface
- Citizens discover who represents them, vote in polls, follow issues, join interest groups
- The public record is built — voting records, accomplishments, bills, announcements, civic projects

**What lives on Poll City Social:**
- Official profiles = the authoritative public record for each elected official
- Home feed (civic news, polls, announcements from representatives)
- Interest groups (by neighbourhood, issue, topic)
- Civic announcements (road work, permits, community projects, bills being passed into law)
- Flash polls and structured surveys (created by officials AND candidates)
- Notification engine (citizens subscribe to officials and issues)
- The consent bridge (the ONLY authorized path from Social data into a campaign CRM)
- ATLAS — the proprietary weighted sentiment algorithm

**ATLAS (the secret weapon):**
A proprietary civic sentiment engine. Collects passive micro-signals from every user interaction (follows, poll responses, shares, time spent, searches, petition signatures, news reactions). Produces continuously-updated approval ratings. Unlike traditional polling (1,000 phone calls, published once, stale immediately), ATLAS processes millions of signals updated every 15 minutes.

The formula is a TRADE SECRET. It lives in the private repo `poll-city-intelligence` — NOT in this codebase. Never document the formula here. The inputs and outputs are public. The formula is not. Internally: ATLAS. Never call it "the algorithm."

Privacy protections: k-anonymity (minimum 100 actors per aggregate), differential privacy noise before publishing, identity-sentiment separation (two unlinked databases), no PII in sentiment tables ever.

---

### Product 3 — Poll City Media (B2B)
**URL:** media.poll.city
**Who:** News outlets, broadcasters
**Revenue:** Media subscriptions ($199-$499/mo) + intelligence subscriptions ($499-$4,999/mo) + polling-as-a-service ($499-$9,999)

Election coverage infrastructure for the news industry:
- Live results ticker — 10 format variants: web ticker, widget card, OG image, RSS, REST API, QR code, digital signage, push notifications, Alexa/Google Home, email block
- Flash polls for journalists to run for their audience
- Election night dashboard (CNN-level results with live updates)
- ATLAS approval ratings packaged for editorial use
- Push notifications to media subscribers on result milestones

---

## THE POLLING SUITE (Full Vision)

Current polls built: NPS, Word Cloud, Emoji, Priority, Timeline.

Full vision — 8 poll types:
1. Approval meter (sliding 0-100 approval rating)
2. Tinder swipe (yes/no on policy/candidate)
3. Issue priority (rank-order issues by importance)
4. Policy sentiment slider (spectrum positioning: left-right, cautious-bold)
5. NPS (built)
6. Head-to-head (candidate vs candidate comparison)
7. Word cloud (built)
8. Timeline (milestone-based longitudinal tracking)

Enterprise polling controls: weighted polling, sample balancing, demographic cross-tabs, response validation, anti-bot, statistical confidence scoring, geographic filtering (postal code, ward, riding, province), quota management.

Official profiles as accountability record: Not promotional. Every vote, commitment, accomplishment, controversy — tracked, public, visible. The accountability layer of democracy.

---

## THE PARTY ENTERPRISE PLATFORM

The biggest untapped revenue opportunity. NationBuilder costs parties $150k-$500k/year. Poll City replaces it for Canadian parties.

Multi-riding GOTV: Parties run in 338 federal ridings simultaneously (or 124 Ontario provincial). Org hierarchy: National HQ → Provincial office → Riding association → Field director → Canvasser. Aggregate gap metrics across all ridings in real time. Resource reallocation between ridings.

AGM voting: Digital voting for Annual General Meeting resolutions. Ranked ballot support (STV, IRV). Delegate management. Quorum tracking.

Nomination race management: Multiple candidates in a nomination contest. Delegate allocation and commitment tracking. Voting night infrastructure.

Pricing:
```
Party (Riding Association):  $299/mo
Party (Provincial):        $4,999/mo
Party (Federal):          $14,999/mo
```

---

## FULL PRICING MODEL

```
School Board Trustee:      $299 one-time / $79/mo
Ward Councillor:           $799 / $199
Regional Councillor:     $1,299 / $299
Mayor (small):           $1,999 / $399
Mayor (large):           $2,999 / $599
MPP / MLA:               $2,499 / $499
MP:                      $3,499 / $699
Provincial Leadership:   $4,999
Federal Leadership:      $9,999
Union:                     $399 / $99
Student Gov:               $149
HOA:                       $199 / $49
Official (Municipal):      $149/mo
Official (Mayor):          $299/mo
Official (MPP/MLA):        $399/mo
Official (MP):             $499/mo
Party (Riding Assoc):      $299/mo
Party (Provincial):      $4,999/mo
Party (Federal):        $14,999/mo
Media (outlet):            $199-$499/mo
Media intelligence:        $499-$4,999/mo
Polling as a service:      $499-$9,999 per poll
```

CONTACTS = VOTERS LIST = UNLIMITED on every tier. What scales: team members, Adoni messages, email sends, SMS sends, storage quota, features.

---

## ARCHITECTURE

### Current State (Phase 1 — now to June 2026)

Single Next.js 14 monolith. One Vercel. One Railway PostgreSQL.
```
src/app/
  (app)/     <- Campaign OS (authenticated, 30+ modules)
  social/    <- Poll City Social (public)
  api/       <- Shared backend (120+ routes)
```

CRITICAL: No `prisma/migrations/` directory. Project uses `npx prisma db push`. A migration baseline must be established before first real customer.

### Phase 2 (June 2026)
Poll City Social gets own Next.js app and Vercel project. Shares Railway DB and auth.

### Phase 3 (Post October 2026)
Full separation. Each product on own infrastructure. Shared API gateway. Do not build this now.

`apps/` and `packages/` directory stubs exist but all code still lives in `src/`. Do not move code until George decides.

---

## THE CONSENT BRIDGE (LEGAL REQUIREMENT)

A citizen on Poll City Social who follows, votes, or fills out a form is NOT automatically added to a campaign's CRM. That violates CASL.

The only authorized path:
1. Citizen explicitly opts in ("Share my contact info with [Candidate Name]'s campaign")
2. Consent event logged: timestamp, IP hash, exact consent text shown
3. Campaign receives ConsentEvent record
4. Campaign can contact within scope of stated purpose
5. Citizen can revoke at any time

CASL compliance is a P0 legal blocker before any campaign uses Communications for cold outreach. Without a consent ledger, every bulk send to cold lists is illegal.

---

## THE GOTV GAP (Most Important Metric)

Gap = Win Threshold minus Supporters Voted

Everything on election day serves The Gap. It must always be the largest, most visible element. Never cover it. Never minimize it.

Campaigns lose because supporters do not vote, not because they do not have enough supporters. GOTV delivers 5-15% turnout lift. In a 47-vote race, that decides the winner.

Priority tiers (canonical source: `src/lib/gotv/score.ts`):
- P1 (>=80): Most reliable — call election morning
- P2 (60-79): Reliable — call day before + morning
- P3 (40-59): Unreliable supporters — start 3 days out
- P4 (<40): Soft supporters — focus P1-P3 first

---

## CRITICAL BUGS (fix before first customer)

### Bug 1 — Support Level Taxonomy (CRITICAL, SILENT)
8+ files use "against" / "leaning_against" instead of correct Prisma enum values "strong_opposition" / "leaning_opposition". Opposition metrics show as 0 in analytics, GOTV priority, and canvassing.

Files affected: api/analytics/campaign/route.ts:51, api/canvassing/street-priority/route.ts:43, api/intelligence/zone-analysis/route.ts:49, api/contacts/bulk-update/route.ts:8, lib/validators/voice.ts:23, api/voice/webhook/route.ts:58, api/gotv/priority-list/route.ts:24, canvassing/walk/walk-shell.tsx:93, prisma/seeds/ward20-demo.ts:92-97.

Canonical taxonomy: strong_support | leaning_support | undecided | leaning_opposition | strong_opposition | unknown

### Bug 2 — Three Competing GOTV Tier Systems (CRITICAL)
1. src/lib/gotv/score.ts — correct composite algorithm (canonical)
2. api/analytics/gotv/route.ts — oversimplified, wrong
3. analytics-client.tsx — hardcoded 35/25/25/15 percentages (not real data)

All consumers must use score.ts. The other two must be deprecated.

### Bug 3 — Demo Data Contamination (MAJOR)
Multiple pages show hardcoded numbers that mask API failures silently:
- Adoni: supportRate: 58, doorsToday: 212 hardcoded in two files
- Analytics: synthetic random-walk time series, fake volunteer leaderboard
- Analytics: hardcoded 87/68/45/22% conversion rates
- Command center: MOCK_VOLUNTEERS and MOCK_ACTIVITY never replaced by real data

If an API fails, users see static demo data and believe the system works.

### Bug 4 — ID Rate Formula Mismatch
Code: (total - unknown) / total. Adoni: (supporters + undecided) / total (undercounts, excludes opposition).

---

## THE CANVASSING REALITY

Read SUBJECT-MATTER-BIBLE.md section 3 in full before building any canvassing feature.

What actually happens at a door:
- 60-70% nobody answers — mark Not Home in under 10 seconds
- Supporter — capture sign request, volunteer, call preference quickly
- Opposed — one tap, walk away
- Undecided — most important conversation; Adoni script accessible but not intrusive

The canvassing app must:
- Work one-handed always. Phone in one hand, door hanger in the other.
- Work offline — signal dies in apartment buildings
- Walk list ordered for efficiency (one side of street, then the other)
- Result buttons instant (Not Home, Supporter, Undecided, Against, Refused)
- Opposition intelligence: canvasser taps any house on the map, records what they see (our sign, opposition sign, count), takes 3 seconds, never breaks stride

The door card appearance:
```
308 King Street East — Unit 4
SARAH CHEN
Previously: Undecided (March 15)
"Interested in transit issue"

[SUPPORTER]    [UNDECIDED]
[AGAINST]      [NOT HOME]

[Script up]  [More options]  [Skip]
```

---

## MOBILE APP STRATEGY

Technology: React Native + Expo. NOT a web wrapper.
Apple rejects web wrappers. Capacitor camera/GPS is unreliable for field ops. PWA push on iOS is severely limited.

Four apps:
1. Poll City Canvasser — May 2026 (deadline)
2. Poll City Social — June 2026
3. Poll City Campaign — August 2026
4. Shared: packages/poll-city-ui

App Store compliance:
- Use: "nonpartisan", "community", "civic engagement"
- Never use: "win elections", "campaign targeting"
- Privacy label: no data sold, no cross-site tracking
- Guideline 4.2: must use native UI, navigation, gestures — offline SQLite + GPS provide native-only value

---

## CANADIAN LEGAL REQUIREMENTS

CASL (Anti-Spam Law):
- Consent for promotional/campaign messaging must be explicit, specific, revocable, and logged
- Consent ledger is P0 before mass email to cold lists
- Service notifications are CASL-exempt; campaign outreach is CASL-regulated

PIPEDA (Privacy):
- All PII encrypted at rest (phone, email via Prisma middleware)
- Campaign isolation absolute — campaignId on every query
- Purpose limitation, data minimization, audit trail for mutations
- All data on Canadian servers only

CRTC (SMS/Phone):
- Must identify caller
- Allow opt-out on every message
- No calls before 9am or after 9pm
- Platform enforces these automatically

Campaign Finance (Ontario example):
- Individual cap: $1,200
- Corporate/union: prohibited
- Anonymous: max $25
- Spending limit: lesser of ($5,000 + $0.20 x electors) or $25,000
- Platform enforces all of this automatically and invisibly

---

## MARKET SEQUENCING

Phase 1 (now): Ontario + BC municipal elections, October 2026. 444 municipalities, 7,000+ elected officials. Ward Councillor tier ($799) is the primary customer.

Phase 2 (2027): Provincial elections — Ontario, BC, Alberta, Quebec. MPP/MLA tier ($2,499).

Phase 3 (2027-28): Federal elections. 338 ridings. MP tier ($3,499) + Party federal ($14,999/mo).

Phase 4 (after October 2026): US expansion — Michigan, New York, Minnesota. FEC compliance auto-detected by state. Same platform, USD pricing, same trust architecture.

---

## WHAT IS BUILT TODAY (April 2026)

Tier 1 — Production Ready: Authentication, Campaign setup/onboarding, Contact CRM, Dashboard (6 modes), GOTV, Field Ops/Canvassing, Signs, Events, Volunteers, Tasks, Donations, Adoni AI, Campaign public website

Tier 2 — Built, Needs Enrichment: Communications Hub (7 phases), Analytics, Finance Suite (5 phases), Calendar Suite, Print marketplace, Resource library, Automation engine

Tier 3 — Schema defined, UI/APIs pending: Fundraising Suite, Communications Templates/Segments/Scheduled/Inbox/Analytics/Social Publishing/CASL Consent/Fatigue Guard

Tier 4 — Future / Planned: Turf drawing UI, Voice broadcast, Google/Outlook calendar sync, Design editor (print), Brand kit applied to outputs, Voter file import, Poll City Social full feed, HQ dashboard, George's Brain

Mobile: React Native app in mobile/, wired to real API, awaiting App Store submission.

Active builds (claimed 2026-04-17): Quick Capture election results system, Poll City Social Phase 1 rebuild, Visual Website Builder.

---

## WHAT MUST HAPPEN BEFORE FIRST REAL CUSTOMER

1. npx prisma migrate dev --name initial_baseline — migration baseline (George's action)
2. All 30+ environment variables set in Vercel (see GEORGE_TODO.md)
3. Railway automated backups enabled (2 minutes, Settings > Backups)
4. CASL consent ledger built
5. Support level taxonomy bug fixed across 8+ files
6. Demo data fallbacks replaced with real API or honest empty states
7. GOTV tier systems unified to src/lib/gotv/score.ts

---

## ADONI LAWS (non-negotiable)

1. No bullet points. Ever.
2. No markdown headers. Ever.
3. No markdown formatting of any kind.
4. Maximum 8 sentences per response.
5. Ends every substantive response with one next action.
6. Canadian English: colour, centre, cheque, programme.
7. Uses "we" not "you."
8. Warm, direct, professional — senior campaign manager tone.
9. Event bus: window.dispatchEvent(new CustomEvent("pollcity:open-adoni", { detail: { prefill } }))
   One listener, one place: src/components/adoni/adoni-chat.tsx. Never add another.

---

## FACTS AGENTS CONSISTENTLY GET WRONG

1. FIGMA.md is the master context doc. Read it before anything. Not CLAUDE.md first. DOCUMENTATION_INDEX.md first, then FIGMA.md.

2. Poll City Social is not a "social module" — it is a separate product. "Facebook for politics." Officials, candidates, citizens, polls, interest groups, civic announcements, bills, ATLAS.

3. There are 50+ markdown docs at root level and many more in docs/. Read DOCUMENTATION_INDEX.md for the full map. Agents who skip them build the wrong thing.

4. apps/ and packages/ are stubs only — no code has been moved there yet. All code lives in src/. Do not move anything.

5. Three GOTV tier systems coexist in the codebase. They produce different P1-P4 assignments. analytics-client.tsx uses completely hardcoded fake percentages. This causes wrong campaign decisions on real data.

6. ATLAS lives in a PRIVATE REPO (poll-city-intelligence). Do not document the formula here. Do not try to implement it in this codebase.

7. No prisma/migrations/ directory. Project uses db push. Migration baseline must be established before production.

8. The consent bridge is a legal requirement, not a feature. CASL. Campaigns cannot legally email cold lists without it.

9. Stripe Connect is the donation model. Campaigns connect their own Stripe Express account. Donations flow directly to their bank. Poll City takes a platform fee.

10. The canvasser is always one-handed. Phone in one hand, door hanger in the other. Every touch target must be reachable with a thumb from the bottom of the screen.

11. Hardcoded demo data masks API failures silently. If an API fails, pages show static numbers instead of an error. Users think the system works when it is broken.

12. Two RBAC systems coexist (legacy ROLE_PERMISSIONS map and enterprise CampaignRole). 145 old routes use legacy, 15 new routes use enterprise. They must eventually converge.

13. Campaign finance compliance is not optional. Ontario caps, receipt requirements, and spending limits must be enforced automatically. Poll City does this. Never build a feature that bypasses it.

14. George is named in the codebase. SUPER_ADMIN is George. His notifications, ops console, and operator-level features are built specifically for him as a person, not as an abstract admin user.

---

## THE SPIRIT

George has 35 years in Canadian politics. Both Liberal and Conservative. Premiers and prime ministers.
The October 2026 Ontario municipal elections are the first major target.
Every feature might be used by a first-time candidate trying to win their ward.
Build it like it matters. Because it does.

---

*Written 2026-04-17 by Claude Sonnet 4.6 after reading every document in this repository.*
*Update this when the vision changes. Never let it fall behind the platform.*
