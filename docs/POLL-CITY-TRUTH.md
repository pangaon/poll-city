# POLL CITY — SINGLE SOURCE OF TRUTH
## Version 1.0 — April 6, 2026
## This document supersedes all previous individual docs.
## Both agents read this before every session.
## George reviews this weekly and updates it.
## Everything that matters lives here.

---

## SECTION 1 — WHO WE ARE AND WHY WE EXIST

Poll City is not campaign software.

Poll City is the infrastructure that makes Canadian democracy
work better — faster, more informed, more participatory,
more honest.

George has been in Canadian politics for 35 years.
He has helped elect premiers and prime ministers for
both the Liberal and Conservative parties.
That nonpartisan track record is the foundation
of everything Poll City is built on.

The promise to every user:
- Campaigns: "Run your campaign. Help your voters. Win your race."
- Citizens: "Your democracy, explained. Your voice, heard."
- Media: "Real-time data. Your branding. One line of code."
- Parties: "One platform. Every tool. More secure than anything else."

We are not trying to make money from democracy.
We are trying to make democracy work better.
The money follows from doing that well.

---

## SECTION 2 — THE THREE PRODUCTS

### Product 1 — Poll City Campaign (B2B)
Campaign operations platform for candidates, campaigns, parties, elected officials.

**URL:** app.poll.city
**Revenue:** Subscriptions (election type pricing) + usage
**Key features:** CRM, canvassing, GOTV, voice, AI (Adoni), maps, finance, print, party enterprise

**Pricing (one-time or monthly):**
```
School Board Trustee:    $299 one-time / $79/mo
Ward Councillor:         $799 / $199
Regional Councillor:     $1,299 / $299
Mayor (small):           $1,999 / $399
Mayor (large):           $2,999 / $599
MPP / MLA:               $2,499 / $499
MP:                      $3,499 / $699
Provincial Leadership:   $4,999
Federal Leadership:      $9,999
Union:                   $399 / $99
Student Gov:             $149
HOA:                     $199 / $49
Official (Municipal):    $149/mo
Official (Mayor):        $299/mo
Official (MPP/MLA):      $399/mo
Official (MP):           $499/mo
Party (Riding Assoc):    $299/mo
Party (Provincial):      $4,999/mo
Party (Federal):         $14,999/mo
```

**Contacts = voters list = UNLIMITED on every tier.**
What scales: team members, Adoni messages, email sends, SMS sends, storage quota, features.

### Product 2 — Poll City Social (B2C)
Civic engagement network for citizens.

**URL:** social.poll.city (eventually its own deployment)
**Revenue:** Advertising + premium features (always free for citizens)
**Key features:** Civic profile, notification engine, voter passport, civic credits, polls, petitions, candidate finder, accountability tracking, media feed

**The promise:** Free forever. Never sells data. Never ads against user's stated preferences.

### Product 3 — Poll City Media (B2B)
Election coverage infrastructure for news outlets and broadcasters.

**URL:** media.poll.city
**Revenue:** Media subscriptions ($199-$499/mo) + intelligence subscriptions ($499-$4,999/mo) + polling-as-a-service ($499-$9,999)
**Key features:** Live results ticker, flash polls, election night dashboard, API access, push notifications to subscribers, approval ratings

---

## SECTION 3 — THE FOUR APPS

```
App 1: Poll City Canvasser (May 2026 — BUILD FIRST)
Repo: poll-city-canvasser
Stack: React Native + Expo
Why first: Safest for App Store, clear B2B use case
App Store description: "Field operations tool for registered campaign volunteers"

App 2: Poll City Social (June 2026)
Repo: poll-city-social (eventually split from main)
Stack: React Native + Expo
Why second: Larger audience, more complex review

App 3: Poll City Campaign (August 2026)
Repo: poll-city-canvasser (shared repo)
Stack: React Native + Expo
Why third: Web app works well, mobile is enhancement

Shared: packages/poll-city-ui
Component library shared across web + native
```

**App Store strategy — what Apple looks for:**
- Nonpartisan: "We work with all parties" must be provable
- No voter manipulation: we do not tell people who to vote for
- Clear B2B purpose for Canvasser app
- Privacy nutrition label: no data sold, no cross-site tracking
- Use words: "nonpartisan", "community", "civic engagement"
- Avoid words: "win elections", "campaign targeting"

---

## SECTION 4 — THE ARCHITECTURE

### Current (Phase 1 — now to June 2026)
Single Next.js monolith. Subdomain routing via next.config.js.
All on one Vercel deployment. One Railway database.
app.poll.city → campaign dashboard
social.poll.city → civic network
media.poll.city → media tools

### Phase 2 (June — October 2026)
Poll City Social gets own Next.js app and Vercel project.
Shares Railway database. Shares auth (same NEXTAUTH_SECRET).
Zero downtime migration using DNS switch.

### Phase 3 (Post October 2026)
Full separation. Each product on own infrastructure.
Shared API gateway. This is a 3-month engineering project.
Do not build this now.

### File territory (NEVER violate)
Claude Code owns:
- `src/app/api/**`
- `prisma/**`
- `src/lib/**`
- `vercel.json`, `package.json`, `next.config.js`

GPT-Codex owns:
- `src/app/(app)/**`
- `src/app/(marketing)/**`
- `src/components/**`
- `src/hooks/**`
- `public/**`
- `src/app/globals.css`

### The private repository
Name: `poll-city-intelligence`
Contains: ATLAS algorithm (the proprietary weighting engine)
Access: George + maximum 2 trusted developers
Never document outside this repo. Trade secret.

---

## SECTION 5 — THE INTELLIGENCE ENGINE (ATLAS)

**What it is:**
A proprietary civic sentiment engine that collects
passive micro-signals from every user interaction,
tracks sentiment longitudinally per anonymous user,
and produces the most accurate real-time approval
ratings in Canadian political history.

**How it differs from traditional polling:**
Traditional: 1,000 phone calls, published once, stale immediately.
ATLAS: millions of passive signals, updated every 15 minutes,
more accurate as the dataset grows, never stale.

**The signals (published openly — builds trust):**
Follow, unfollow, share, poll response, search, time spent,
click through, dismiss, petition sign, comment sentiment,
news reaction, prior voting history (self-reported).

**The algorithm (ATLAS — trade secret):**
Lives only in `poll-city-intelligence` (private repo).
Inputs and outputs are public. Formula is not.
Internally called ATLAS. Never referred to as "algorithm."

**Privacy protections:**
- k-anonymity: minimum 100 actors per published aggregate
- Differential privacy: calibrated noise added before publishing
- Identity-sentiment separation: two unlinked databases
- No PII in sentiment tables — ever

**Revenue from ATLAS:**
- Intelligence subscriptions: $499-$4,999/month
- Polling as a service: $499-$9,999 per poll
- Academic licensing: $999-$2,999/year

---

## SECTION 6 — ADONI

**Identity:**
Named after George's son.
Model: claude-sonnet-4-20250514 (always latest Sonnet).
The AI Chief of Staff for every Poll City campaign.

**The law — non-negotiable:**
- Never uses bullet points. Never.
- Never uses headers or bold text.
- Never uses numbered lists.
- Never uses markdown of any kind.
- Writes in plain conversational sentences.
- Maximum 8 sentences per response.
- Ends every substantive response with one next action.
- Speaks Canadian English (colour, centre, cheque).
- Uses "we" not "you."
- Real names. Real streets. Real numbers.
- Security is in role-scoping, not in hiding data.

**Role scoping:**
Each role gets real data scoped to what they need.
A canvasser gets their walk list with real addresses.
They do not get campaign-wide supporter counts.
This is the security model — not anonymization.

**Modes:**
Bubble (default) → Panel (side, pushes content) → Full screen (two-column workspace).
Cmd+Shift+A cycles through modes.
Panel PUSHES content left. Never covers it.
TV page: Adoni does not exist. Isolated layout.

**Full screen output panel:**
When Adoni uses a tool → right panel renders structured output.
Contact list → clean table.
Email draft → full email preview with "Open in Composer" button.
Daily brief → visual stats dashboard.
GOTV summary → P1/P2/P3/P4 breakdown with voted counter.

---

## SECTION 7 — GOTV — THE GAP

The single most important metric on election day:
"You need X more supporters to vote today to win."

Everything on the GOTV page serves The Gap.

**The Gap formula:**
```
Win threshold = estimated votes needed to win
(based on historical turnout × competitive adjustment)

Supporters voted = contacts where supportLevel=SUPPORTER AND voted=true

Gap = win threshold - supporters voted
```

**The GOTV page layout:**
Two columns. Map left (60%). Command strip right (40%).
The Gap: largest element on the right column.
Fixed bottom tab bar: Priority List | Strike Off | Upload Voted | Election Day.
Never scrolls. Never hides. Always visible.

**Strike off:** Sub-100ms response. Large search. Hit Enter. Gap drops. Undo 10 seconds. No confirmation dialog.

**Priority actions below the gap:**
Call These Now (P1 not yet voted today).
Rides Needed (flagged for ride assistance).
Upload Voted List (with time since last upload).
Poll Reports (scrutineer entries).

---

## SECTION 8 — TRUST AND DATA ISOLATION

**George's guarantee:**
35 years. Both parties. Premiers and prime ministers.
He has never once crossed the information wall.
Poll City is built on that same principle — provably, not just stated.

**The six technical guarantees:**
1. Database isolation per enterprise party (different DB instance)
2. Staff access requires ticket + generates immutable log
3. All data stored on Canadian servers only
4. Party data never used for product improvement (opt-in only)
5. Complete data export on request, certificate of deletion on termination
6. Change of control clause — party can terminate if Poll City is acquired

**The legal layer:**
Data Processing Agreement signed by George personally (not just company).
Party is data controller. Poll City is data processor.
PIPEDA compliant. 72-hour breach notification.
Subpoena protocol: notify party, resist overbroad demands.

**The audit trail:**
StaffAccessLog: every access by any Poll City employee.
Party admins can view their own log at any time.
If log says zero — they believe it because they can verify.

---

## SECTION 9 — SEO AND PERFORMANCE

**Performance targets (non-negotiable):**
- Every API route: under 200ms
- Every page load: under 1 second
- Signal collection: under 5ms (fire and forget)
- Strike off: under 100ms
- Embed widget: under 20KB

**How we achieve this:**
- Maps: load only when in viewport
- Charts: lazy load with skeletons
- Adoni: loads after page content (non-blocking)
- Images: WebP, max 200KB, Vercel Image Optimization
- API: edge caching headers on all public routes
- Database: cursor pagination (not offset), pre-computed aggregates, indexes on every query field used in WHERE

**SEO requirements:**
- Dynamic sitemap including all candidate pages, polls, results, help articles
- OpenGraph metadata on every public page
- JSON-LD structured data (Person schema for candidates, Event schema, Dataset schema for results)
- OG images include "poll.city" watermark — when shared, people know where it is from
- Canonical URLs on all pages
- Robots.txt: allow public, disallow authenticated

**Image tagging:**
Every shared image from Poll City includes:
- Alt text always (accessibility + SEO)
- OpenGraph image with candidate/poll data
- "Via Poll City" in shared images
- poll.city URL in every embed

---

## SECTION 10 — NOTIFICATION SYSTEM

Three notification audiences:

**1. George (operator notifications):**
Push notifications to George's phone for:
- Build failures (from CI/CD)
- Security events (high/critical severity)
- Scale warnings (approaching limits)
- First customer sign-up
- Payment received
- Server errors spiking
See: George Notification System (Section 13 of this doc)

**2. Campaign users (product notifications):**
In-app + email + optional SMS for:
- Import completed overnight
- Adoni morning brief
- GOTV alerts (supporters falling behind pace)
- Security events on their account
- Team member joined
- Poll results milestone
- Print job ready

**3. Citizens on Poll City Social:**
Push + email + SMS (based on preferences) for:
- Election results in their ward
- Flash poll they can vote in
- Candidate update from someone they follow
- Debate starting in 1 hour
- Emergency civic alert
- Petition milestone
- Accountability update (promise kept/broken)

**Quiet hours:** Always enforced. 10pm-7am default. Emergency alerts bypass.

---

## SECTION 11 — MARKETING MODE / DEMOS

Three demo modes exist in the app (George only — behind debug access):

**Demo Mode 1 — For Candidates:**
Loads Ward 20 Toronto seed data (5,000 contacts).
Shows the full campaign dashboard as if mid-campaign.
Shows Adoni giving a real briefing.
Shows the GOTV command centre with real gap numbers.
Shows the map with real heat data.
URL: /demo/candidate

**Demo Mode 2 — For Political Parties:**
Shows multi-riding view (Ontario provincial scale).
Shows AGM voting interface.
Shows nomination race flow.
Shows data isolation diagram.
URL: /demo/party

**Demo Mode 3 — For Media:**
Shows election night results dashboard.
Shows ticker embed with live data.
Shows flash poll with live results.
Shows approval rating chart with 90-day trend.
URL: /demo/media

**Sending to prospects (without them logging in):**
Generate a shareable demo link:
/demo/[type]?token=[one-time-token]
Token expires in 7 days.
Shows a read-only demo with real seed data.
No account required. No credit card.
"Start your free trial" button at every step.

---

## SECTION 12 — BUILDING STANDARDS

### The ecosystem mindset
Every feature connects to everything else.
Before building anything, ask:
- Does this connect to Adoni? (Add a page brief)
- Does this produce notifications? (Wire to engine)
- Does this produce ticker content? (Wire to ticker)
- Does this affect SEO? (Add metadata)
- Does this need an empty state? (Build one)
- Does this need a help article? (Create stub)

### Empty states
Every page with no data shows:
- Warm, educational explanation of why this matters
- What to do next (always one clear action)
- The why before the what
Never: blank screen, "No data yet", spinner that never stops.

### Error states
Every error shows:
- What went wrong in plain English
- Whether their data is safe (always reassure)
- What to do next
- A way to get help

### Loading states
Every loading state shows:
- Skeleton placeholders (never blank + spinner)
- Estimated wait time if over 2 seconds
- Progress bar if import/processing

### Mobile
Every component works at 390px (iPhone 14 Pro).
Touch targets: minimum 44×44px.
No hover-only interactions.
Test at mobile size before every commit.

### iOS readiness (from day one)
- No localStorage (use React state or database)
- No hover states as primary interaction
- Touch events alongside click events
- 44px minimum touch targets
- Safe area insets respected
- Works in Safari mobile

### Commit message format
```
type: feature name — what it does — ecosystem connections
```
Types: feat | fix | security | ui | seo | seed | schema | infra

### The five questions before every commit
1. Does TypeScript pass? (`npx tsc --noEmit`)
2. Does the build pass? (`npm run build`)
3. Does it work at 390px?
4. Does it connect to the ecosystem (Adoni, notifications, ticker)?
5. Is the most important thing the biggest thing on the page?

---

## SECTION 13 — GEORGE'S NOTIFICATION SYSTEM

George is not always at his PC.
He needs to know what is happening on the site from his phone.
This is not a nice-to-have. It is operational infrastructure.

### What George needs to know immediately:
- 🔴 Build failed (fix needed)
- 🔴 Security incident (high/critical severity)
- 🔴 Site is down or degraded
- 🟡 First new customer signed up
- 🟡 Payment received
- 🟡 Server costs approaching budget
- 🟡 Database approaching storage limit
- 🟡 Approaching Vercel bandwidth limit
- 🟢 Successful deploy completed
- 🟢 Import completed for a customer overnight
- 🟢 Daily summary (midnight)

### How it works:
George installs Poll City Social as a PWA on his phone.
He enables push notifications.
His user ID is flagged as OPERATOR in the system.
Operator-level notifications are sent to him automatically.

The notification engine already exists (Section 10).
George's notifications are the same system with OPERATOR targeting.

### The scale warnings (every developer must implement):
When any of these thresholds are approached — George gets notified.

```
Vercel bandwidth: warn at 80%, alert at 95%
Railway database size: warn at 70%, alert at 90%
Railway compute: warn at 80%, alert at 95%
Anthropic API spend: warn at $500/mo, alert at $800/mo
Twilio balance: warn at $50 remaining, alert at $20 remaining
Upstash rate limit hits: warn at 1000/day
Error rate: warn at 1%, alert at 5% of requests
P99 response time: warn at 500ms, alert at 1000ms
```

These check every hour via cron.
George gets a push notification the moment a threshold is crossed.
The notification tells him exactly what is happening and what to do.

### The daily 7am brief from Adoni:
Every morning at 7am George gets a push notification:
"Good morning. Here is where things stand."

Tapping it opens Poll City Social showing:
- Active campaigns (count)
- New sign-ups in last 24 hours
- Revenue in last 24 hours
- Any security events overnight
- Server health (green/amber/red)
- Top support tickets
- One thing that needs his attention today

This is Adoni working for George, not for a campaign.
Same engine. Different data. Different audience.

---

## SECTION 14 — US EXPANSION PLAN

**When:** After October 26, 2026 Ontario municipal elections.
**Why then:** Real data, real case studies, real results.

**First markets:** Michigan, New York, Minnesota.
Similar density to Ontario. Municipal races where startups can compete.

**What changes:**
- FEC compliance instead of Elections Canada
- State-specific campaign finance laws (auto-detected by state)
- County-level administration
- USD pricing (same tiers, convert at current rate)
- Different voter registration system (no universal registration)
- TCPA compliance for SMS (stricter in some states)

**What stays the same:**
- Everything we built. All of it.
- ATLAS works the same way
- Adoni works the same way
- The trust architecture is stronger (Canadian privacy laws are better — use that as a selling point in the US)

**US pricing:** Same election-type model. Convert to USD.
Ward Councillor equivalent → City Council → $799 USD.

---

## SECTION 15 — WHAT GEORGE NEEDS TO DO

These cannot be done by agents. Only George can do these.

**Before deploying tonight's build:**
1. Add environment variables to Vercel (see list in MASTER-OVERNIGHT-BUILD.md)
2. Enable Railway daily backups (railway.app → database → Settings → Backups)

**After deploying:**
3. Run seed data: `npm run db:seed:ward20` and `npm run db:seed:help`
4. Visit `/debug-access?key=yourpassphrase` to activate debug suite
5. Find your user ID: visit `/api/auth/session`, copy the "id" field, add as GEORGE_USER_ID in Vercel
6. Generate VAPID keys: `npx web-push generate-vapid-keys` → add both to Vercel
7. Create private repo: `poll-city-intelligence` (for ATLAS algorithm)

**Within 7 days:**
8. Contact Anthropic enterprise for Zero Data Retention: console.anthropic.com
9. Contact AMCTO about voters list service provider access
10. Commission a security audit (any reputable Canadian cybersecurity firm)
11. Have a lawyer draft the Data Processing Agreement

**The most important thing:**
12. Call one person you know who is running in October 2026.
    Show them the demo. Charge them $799.
    That first customer matters more than any feature.

---

## APPENDIX — DOCUMENT INDEX

This document supersedes:
- PRODUCT_BRIEF.md (merged into Sections 1-3)
- MASTER_ARCHITECTURE.md (merged into Section 4)
- ADONI_MASTER.md (merged into Section 6)
- ADONI_CAPABILITIES_AND_TRAINING.md (merged into Section 6)
- ADONI_PUBLIC_SPEC.md (merged into Section 6)
- PERMISSION_SYSTEM_COMPLETE.md (merged into MASTER-OVERNIGHT-BUILD.md)
- FEATURE_COMPLETION_STANDARD.md (merged into Section 12)
- STRICT_AGENT_PROMPT.md (merged into Section 12)

Still active (referenced but not merged):
- COORDINATION_THREAD.md — live communication log between agents
- FEATURE_EXECUTION_CHECKLIST.md — live build status tracker
- MASTER-OVERNIGHT-BUILD.md — complete task list for both agents

Prompt files (send to agents when relevant):
- 04 through 23 in /prompts/ — specific feature build prompts
- MASTER-OVERNIGHT-BUILD.md — the complete overnight build (use this one)
