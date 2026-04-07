# POLL CITY — MASTER AUTONOMOUS BUILD SESSION
## 7-Hour Session. Two Agents. Zero Interruptions.
## George is not available. Do not wait for him. Ever.
## Read every word of this document before touching any file.
## Last compiled: April 7, 2026

---

# SECTION 1 — WHO YOU ARE AND WHAT THIS SESSION IS

You are building Poll City — the civic operating system for Canadian democracy.
The stack: Next.js 14 App Router, TypeScript, Prisma, Railway PostgreSQL,
Vercel, Tailwind CSS, Framer Motion, dnd-kit, shadcn/ui, recharts, react-leaflet.
Repo: pangaon/poll-city. Live at poll.city.
v3.0.0 is the current base. 130+ routes. 44 Prisma models.

This session runs for 7 hours. You build continuously.
You never ask George anything. You never stay idle.
When you finish a task — you post to COORDINATION_THREAD.md and start the next.
When you hit a blocker — you document it, make the best decision, and move on.
When you need a decision George would normally make — you make it, flag it, and build.

You are not a pair programmer waiting for instructions.
You are a senior engineer with full context and full authority for 7 hours.

---

# SECTION 2 — THE NON-NEGOTIABLE RULES

Every rule here applies to every single commit, every single file, every single hour.
There are no exceptions.

## Build rules
1. `git pull` before starting ANYTHING in this session
2. `npm run build` after EVERY change — zero errors before committing
3. `npx tsc --noEmit` — zero TypeScript errors required
4. Commit after EVERY completed feature — never accumulate more than 30 minutes of work
5. Every commit message: `feat: [what] — [why it matters] — [agent: CC or Co]`
6. Push after every commit
7. Update `docs/COORDINATION_THREAD.md` after every commit
8. Update `docs/FEATURE_EXECUTION_CHECKLIST.md` after every completed feature
9. Never leave a placeholder, Coming Soon badge, or zero count visible
10. Never fake data — every stat pulls from Railway PostgreSQL

## Quality gates (must pass before any commit)
- `npx tsc --noEmit` → zero errors
- `npm run build` → clean
- No `console.log` left in API routes
- No hardcoded credentials or secrets
- No `any` types unless absolutely necessary and commented why
- Every API route: validates session, validates input with Zod, filters by campaignId

## Never do these
- Touch the other agent's file territory
- Stay idle for more than 5 minutes
- Wait for George
- Leave a feature half-built
- Skip the build check
- Use `prisma migrate reset` or `--force-reset`
- Delete existing Prisma models or fields
- Add required fields without defaults to existing models
- Use gradients anywhere except GOTV and Election Night pages
- Use spinners — shimmer skeletons only
- Put markdown in Adoni responses

## When stuck
If blocked for more than 10 minutes:
1. Revert the specific change that caused the block
2. Post the exact error to COORDINATION_THREAD.md
3. Note what you tried
4. Move to the next task on your list
5. Come back to the blocker after 2 other tasks

---

# SECTION 3 — FILE TERRITORY (ABSOLUTE — NEVER VIOLATE)

## Claude Code owns
```
src/app/api/**          ← ALL API routes
prisma/**               ← Schema, migrations, seeds
src/lib/**              ← Business logic, utilities, helpers
packages/**             ← Shared packages
scripts/**              ← Build and utility scripts
docs/**                 ← Documentation files
vercel.json
package.json
next.config.js
tsconfig.json
```

## GitHub Copilot (Co) owns
```
src/app/(app)/**        ← All authenticated app pages
src/app/(marketing)/** ← Public marketing pages
src/components/**       ← All UI components
src/hooks/**            ← React hooks
src/app/globals.css     ← Global styles
public/**               ← Static assets
```

## When you need something from the other agent's territory
Post to COORDINATION_THREAD.md with exact spec.
Build a mock or stub that lets you keep building.
The other agent picks it up and replaces the mock when they build it.
You never stop building because you need something from the other side.

---

# SECTION 4 — THE DESIGN SYSTEM (NEVER REGRESS FROM THIS)

Everything built tonight must follow these standards.
This is what was established today. No going back.

## Design tokens
```typescript
export const T = {
  navy:    "#0A2342",   // primary brand
  navy2:   "#1A3F6F",   // secondary brand
  tint:    "#E8EFF8",   // light brand background
  green:   "#1D9E75",   // success, on track
  amber:   "#EF9F27",   // warning, attention needed
  red:     "#E24B4A",   // error, urgent (NEVER use for branding)
  purple:  "#7F77DD",   // intelligence, ATLAS features
  // War room / Election Night only:
  warBg:   "#0A1628",
  warCard: "#0F1F35",
}
```

## Spring physics presets (Framer Motion)
```typescript
export const SPRINGS = {
  snappy:  { type: "spring", stiffness: 400, damping: 30 },  // buttons
  bouncy:  { type: "spring", stiffness: 300, damping: 15 },  // celebrations
  smooth:  { type: "spring", stiffness: 200, damping: 25 },  // transitions
  gentle:  { type: "spring", stiffness: 120, damping: 20 },  // drag/drop
}
```

## Rules that never break
- NO gradients anywhere except `data-page="gotv"` and `data-page="election-night"`
- NO spinners — use shimmer skeleton `animate-pulse bg-slate-200 rounded` always
- NO markdown in Adoni responses — apply `stripMarkdown()` to every message
- NO blank pages — every empty state: floating icon + headline + one action + Adoni
- Numbers are the hero: Gap at 72px, supporters at 48px, everything else is context
- `AnimatedCounter` on every changing number — `motion.dev animate()`, zero re-renders
- Spring physics on every button hover/tap: `whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}`
- Milestone celebrations: when supporters hits 100, 500, 1000, 2000 → card physically bounces
- `BroadcastChannel` pop-out available on every major widget
- dnd-kit drag/drop on dashboard, leaderboards, all list views
- Adoni: always `position: fixed; bottom: 80px; right: 20px; z-index: 9999`
- Adoni three modes: bubble (60px) → panel (400px) → fullscreen (two-column)

## Component library (already built — use these)
- `AnimatedCounter` — every number that changes
- `TallyCard` — milestone spring celebrations
- `GapWidget` — navy, spring drop, BroadcastChannel pop-out
- `RacingLeaderboard` — spring layout animations, cards physically race
- `DashboardWidget` — drag handle, fullscreen, pop-out sync
- `Skeleton` — shimmer pulse, no spinners ever
- `EmptyState` — floating icon, one action, Adoni prompt
- `Button` — spring physics on every button
- `ToastProvider` — bottom-left, auto-dismiss, undo
- `DraggableDashboard` — full dnd-kit wrapper, saves to API on every drop

Import from: `src/components/poll-city-components.tsx`

---

# SECTION 5 — NO REGRESSION RULE

The following is already built and working. Do not touch it.
Build ON TOP of it. Do not rebuild it.

## Already working (verified)
- Campaign CRM — contacts, tags, notes, custom fields
- Canvassing — household walk list, Not Home, GOTV scoring
- Import/Export — 7 specialized CSV exports
- Sign tracking — deployment, reporting
- Donations — entry, reporting
- Polls — 7 types, anonymous voting, duplicate protection
- Push notifications — system built
- Print marketplace — 5-step wizard
- Poll City Social — tinder polls, officials, profile
- Events system — schema, Admin CRUD, Social listing, RSVP
- Help center — /help
- Settings and team management
- Analytics — 8 tabs
- Reports and Alerts
- Feature flags and tier gating
- Permission system — roles established
- Error system with user guidance
- Tooltips on form fields
- Officials directory — 3,500+ records
- GIS boundaries — imported

## Still broken (fix these first if they block you)
- `party-colours` import causing Vercel build failure → inline the function, delete the file
- Import throws unexpected server error
- Scrollbars missing on sidebar and panels
- Dashboard zero counts (fake data) → pull from real database

## Fix the `party-colours` issue first (Claude Code)
```bash
grep -r 'party-colo' src/ --include='*.ts' --include='*.tsx' -l
```
For every file found: remove the import, inline this function:
```typescript
function getPartyColour(partyName?: string | null) {
  const n = (partyName ?? '').toLowerCase();
  if (n.includes('liberal')) return { primary: '#D71920', secondary: '#FFFFFF' };
  if (n.includes('conserv') || n.includes('pc')) return { primary: '#1A4782', secondary: '#FFFFFF' };
  if (n.includes('ndp') || n.includes('new dem')) return { primary: '#F37021', secondary: '#FFFFFF' };
  if (n.includes('bloc')) return { primary: '#0088CE', secondary: '#FFFFFF' };
  if (n.includes('green')) return { primary: '#24A348', secondary: '#FFFFFF' };
  return { primary: '#1E3A8A', secondary: '#FFFFFF' };
}
```
Delete `src/lib/party-colours.ts`. Run build. Commit.

---

# SECTION 6 — CLAUDE CODE BUILD QUEUE (7 HOURS)

Read this completely before starting. Execute in order.
Each task has a time estimate. Stick to it.
If a task takes 2x its estimate → document why, continue, do not skip.

Post to COORDINATION_THREAD.md at session start:
```
## SESSION START — Claude Code — [TIME]
Build status: [passing/failing]
Starting with: Fix party-colours (Task 0)
Territory: API, Prisma, lib, docs
```

---

## TASK 0 — FIX THE VERCEL BUILD (15 minutes) — DO THIS FIRST

```bash
git pull
npm run build
```

If build fails on party-colours:
1. Find all files importing it (grep command above)
2. Inline the function in each file
3. Delete src/lib/party-colours.ts
4. `npx tsc --noEmit` → zero errors
5. `npm run build` → must pass
6. Commit: `fix: inline party colours, remove broken import — build green`
7. Push

**Do not proceed to Task 1 until Vercel is green.**

---

## TASK 1 — SECURITY HARDENING (45 minutes)

This is the commercial foundation. Without this, Poll City cannot charge for sensitive data.

### 1a — Field-level encryption
```bash
npm install prisma-field-encryption
```

Create `src/lib/db/prisma.ts` — replace existing singleton with encrypted client.
Encrypt: phone, email, address on Contact. Email on User. All financial fields on Donation.
Encryption key: `process.env.DATABASE_ENCRYPTION_KEY`

### 1b — Complete audit log on every write
Every POST/PATCH/DELETE API route must call:
```typescript
await prisma.activityLog.create({
  data: {
    campaignId,
    userId: session.user.id,
    action: 'contact.update', // entity.action format
    entityId: contact.id,
    entityType: 'Contact',
    details: JSON.stringify({ before: oldData, after: newData }),
    ipAddress: request.headers.get('x-forwarded-for') ?? 'unknown',
  }
})
```

Currently only 4 of 130+ routes have this. Add to all of them.
Use a helper function to reduce repetition:
```typescript
// src/lib/audit.ts
export async function audit(prisma, action: string, data: AuditData) {}
```

### 1c — Rate limiting
```bash
npm install @upstash/ratelimit @upstash/redis
```
Add to `src/middleware.ts`:
- Login: 5 attempts per 15 minutes per IP
- API public routes: 100 requests per minute per IP
- API authenticated routes: 1000 per minute per user

### 1d — Account lockout
After 5 failed login attempts: lock account for 15 minutes.
Store attempt count in Redis with TTL.
Return clear error message: "Account temporarily locked. Try again in 15 minutes."

### 1e — Input sanitization middleware
Create `src/lib/security/sanitize.ts`:
Detect and block SQL injection patterns, XSS patterns.
Strip script tags from all string inputs.
Log suspicious inputs to SecurityEvent table.

### 1f — Security headers
In `next.config.js` headers():
```javascript
'X-Frame-Options': 'DENY',
'X-Content-Type-Options': 'nosniff',
'Referrer-Policy': 'strict-origin-when-cross-origin',
'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'..."
```

### 1g — PIPEDA compliance
Add to Campaign model: `dataRetentionDays Int @default(365)`
Create cron `src/app/api/cron/data-retention/route.ts`:
- Runs daily
- Deletes contacts from campaigns where retentionDays have passed since election
- Anonymizes rather than deletes where aggregate data needed
- Logs deletions to audit log

Commit: `security: field encryption, complete audit log, rate limiting, account lockout, PIPEDA retention cron`

---

## TASK 2 — ATLAS CIVIC INTELLIGENCE ENGINE (60 minutes)

The proprietary polling engine. This is what makes Poll City worth $100M.
The weighting algorithm (ATLAS) is a TRADE SECRET.
Build the scaffold here. The real algorithm goes in private repo `poll-city-intelligence`.

### Schema additions to prisma/schema.prisma
```prisma
model AnonymousCivicActor {
  id              String   @id @default(cuid())
  deviceId        String   @unique  // hashed device fingerprint
  provinceCode    String?
  ageRange        String?  // '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+'
  languagePref    String   @default("en")
  priorVotingHistory String? // 'always' | 'sometimes' | 'rarely' | 'first_time'
  createdAt       DateTime @default(now())
  signals         SentimentSignal[]
}

model SentimentSignal {
  id          String   @id @default(cuid())
  actorId     String
  actor       AnonymousCivicActor @relation(fields: [actorId], references: [id])
  subjectId   String   // politician or policy ID
  subjectType String   // 'politician' | 'policy' | 'party'
  signalType  String   // 'follow' | 'unfollow' | 'poll_response' | 'share' | 'search' | 'dwell_time'
  rawSentiment Float   // -1.0 to 1.0
  weight      Float    @default(1.0) // ATLAS sets this
  createdAt   DateTime @default(now())
  @@index([subjectId, subjectType])
  @@index([actorId])
}

model ApprovalRating {
  id              String   @id @default(cuid())
  subjectId       String
  subjectType     String
  approvalScore   Float    // 0-100
  sampleSize      Int
  marginOfError   Float
  velocity        Float    @default(0) // rate of change per day
  demographicBreakdown Json?
  computedAt      DateTime @default(now())
  @@unique([subjectId, subjectType])
  @@index([subjectId])
}
```

Run: `npx prisma db push`

### Signal collector: src/lib/intelligence/signal-collector.ts
```typescript
// Fire-and-forget. Never blocks UI. Never fails visibly.
export async function collectSignal(params: {
  deviceId: string
  subjectId: string
  subjectType: string
  signalType: string
  rawSentiment: number
}) {
  // Async, non-blocking
  // k-anonymity: only publish aggregates of 100+ actors
  // identity-sentiment separation: no PII in this table
}
```

### Aggregation engine: src/lib/intelligence/aggregator.ts
```typescript
const K_ANONYMITY_THRESHOLD = 100; // minimum actors before publishing

export async function computeApprovalRating(subjectId: string, subjectType: string) {
  const signals = await prisma.sentimentSignal.findMany({
    where: { subjectId, subjectType, createdAt: { gte: new Date(Date.now() - 365 * 86400000) } },
    include: { actor: { select: { provinceCode: true, ageRange: true } } }
  });

  if (signals.length < K_ANONYMITY_THRESHOLD) return; // k-anonymity enforcement

  // PLACEHOLDER WEIGHTS — real ATLAS algorithm in poll-city-intelligence private repo
  // Simple exponential decay for now:
  let weightedSum = 0, totalWeight = 0;
  for (const signal of signals) {
    const daysSince = (Date.now() - signal.createdAt.getTime()) / 86400000;
    const decay = Math.pow(0.5, daysSince / 90); // halves every 90 days
    weightedSum += signal.rawSentiment * decay;
    totalWeight += decay;
  }
  const score = totalWeight > 0 ? ((weightedSum / totalWeight) + 1) / 2 * 100 : 50;

  await prisma.approvalRating.upsert({
    where: { subjectId_subjectType: { subjectId, subjectType } },
    create: { subjectId, subjectType, approvalScore: score, sampleSize: signals.length, marginOfError: 3.5 },
    update: { approvalScore: score, sampleSize: signals.length, computedAt: new Date() },
  });
}
```

### Intelligence cron: src/app/api/cron/intelligence/route.ts
- Runs every 15 minutes (add to vercel.json)
- Calls computeApprovalRating for every politician in the Officials table
- Updates ApprovalRating records

### Public approval API: src/app/api/v1/approval/[slug]/route.ts
Public endpoint. No auth required.
Returns: approvalScore, sampleSize, velocity, computedAt, demographicBreakdown (if 100+ per group)

Commit: `feat: ATLAS civic intelligence — signal collection, k-anonymity, aggregation engine, 15-minute cron, public approval API`

---

## TASK 3 — MEDIA SUITE BACKEND (45 minutes)

Schema additions:
```prisma
model MediaOutlet {
  id          String      @id @default(cuid())
  name        String
  domain      String?
  apiKey      String      @unique @default(cuid())
  plan        String      @default("COMMUNITY") // COMMUNITY | STANDARD | PREMIUM
  isActive    Boolean     @default(true)
  tickerItems TickerItem[]
  results     ElectionResult[]
  polls       Poll[]
  createdAt   DateTime    @default(now())
}

model TickerItem {
  id            String      @id @default(cuid())
  mediaOutletId String?
  mediaOutlet   MediaOutlet? @relation(fields: [mediaOutletId], references: [id])
  text          String
  url           String?
  type          String      @default("GENERAL") // RESULT | POLL | ALERT | GENERAL
  priority      Int         @default(5)
  isActive      Boolean     @default(true)
  expiresAt     DateTime?
  createdAt     DateTime    @default(now())
}

model ElectionResult {
  id              String      @id @default(cuid())
  mediaOutletId   String?
  mediaOutlet     MediaOutlet? @relation(fields: [mediaOutletId], references: [id])
  province        String
  municipality    String
  ward            String?
  office          String
  candidateName   String
  party           String?
  votes           Int
  percentReporting Float     @default(0)
  isLeading       Boolean    @default(false)
  isCalled        Boolean    @default(false)
  entryOneUserId  String?
  entryTwoUserId  String?
  isVerified      Boolean    @default(false) // double-entry enforced
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}

model PollSubscriber {
  id        String   @id @default(cuid())
  pollId    String
  pushToken String?
  email     String?
  phone     String?
  createdAt DateTime @default(now())
}
```

Run: `npx prisma db push`

### API routes to create:

**src/app/api/ticker/[outletId]/route.ts** — SSE stream
```typescript
// Server-Sent Events. Streams ticker items every 30 seconds.
// Access-Control-Allow-Origin: * (embeds on external sites)
// No auth required for public ticker embed
```

**src/app/api/ticker/items/route.ts** — POST/GET with API key auth

**src/app/api/results/[province]/[municipality]/route.ts** — Public results feed

**src/app/api/results/entry/route.ts** — Double-entry verification
```typescript
// First submission: creates record with entryOneUserId
// Second submission: if votes match → isVerified=true, goes live
// If mismatch → returns 409, flags for review
// Nothing goes live until two people agree
```

**src/app/api/media/outlets/route.ts** — Create outlet, return apiKey + embed code

**src/app/api/media/outlets/[id]/embed-codes/route.ts** — Returns all embed snippets

**src/app/api/polls/[id]/subscribe/route.ts** — Subscribe to poll updates

Create **public/ticker.js** — the embeddable one-liner:
```javascript
// Usage: <script src="https://poll.city/ticker.js?outlet=OUTLET_ID&theme=dark"></script>
// Connects via SSE to /api/ticker/[outletId]
// "🍁 POLL CITY LIVE" red badge + scrolling text
// Rotates items every 8 seconds
// Light/dark/top/bottom params
```

Commit: `feat: media suite backend — SSE ticker, double-entry results, media outlet API, embeddable ticker.js, poll subscriptions`

---

## TASK 4 — POLL CITY SOCIAL BACKEND (45 minutes)

### Schema additions
```prisma
model CivicProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  postalCode      String?
  ward            String?
  municipality    String?
  province        String?
  issues          String[] // housing, transit, safety, environment, etc.
  civicCredits    Int      @default(0)
  notifyResults   Boolean  @default(true)
  notifyPolls     Boolean  @default(true)
  notifyDebates   Boolean  @default(true)
  notifyEmergency Boolean  @default(true)
  quietHoursStart Int      @default(22) // 10pm
  quietHoursEnd   Int      @default(7)  // 7am
  pushToken       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model VoterPassport {
  id                 String   @id @default(cuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id])
  credits            Int      @default(0)
  badges             String[]
  pollsParticipated  Int      @default(0)
  petitionsSigned    Int      @default(0)
  eventsAttended     Int      @default(0)
  volunteeredFor     Int      @default(0)
  doorsKnocked       Int      @default(0)
  electionsParticipated Int   @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model CivicCredit {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  action      String   // CREATE_PROFILE | VOTE_IN_POLL | SIGN_PETITION | etc.
  credits     Int
  description String
  createdAt   DateTime @default(now())
}

model Petition {
  id                String   @id @default(cuid())
  createdByUserId   String
  title             String
  description       String   @db.Text
  targetMunicipality String?
  targetWard        String?
  targetOfficialId  String?
  signatureGoal     Int      @default(500)
  isPublic          Boolean  @default(true)
  status            String   @default("active") // active | delivered | closed
  signatures        PetitionSignature[]
  createdAt         DateTime @default(now())
}

model PetitionSignature {
  id         String   @id @default(cuid())
  petitionId String
  petition   Petition @relation(fields: [petitionId], references: [id])
  userId     String?
  name       String
  email      String?
  isPublic   Boolean  @default(false)
  createdAt  DateTime @default(now())
}

model OfficialPromise {
  id          String   @id @default(cuid())
  officialId  String
  promise     String   @db.Text
  madeAt      DateTime
  status      String   @default("pending") // pending | in_progress | completed | broken
  evidence    String?  @db.Text
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
  trackers    PromiseTracker[]
}

model PromiseTracker {
  id        String   @id @default(cuid())
  promiseId String
  promise   OfficialPromise @relation(fields: [promiseId], references: [id])
  userId    String
  createdAt DateTime @default(now())
  @@unique([promiseId, userId])
}
```

Run: `npx prisma db push`

### Civic credit constants and helper
```typescript
// src/lib/civic-credits.ts
export const CIVIC_CREDITS = {
  CREATE_PROFILE: 25,
  COMPLETE_PROFILE: 50,
  VERIFY_PHONE: 25,
  VOTE_IN_POLL: 5,
  SIGN_PETITION: 10,
  CREATE_PETITION: 50,
  ATTEND_EVENT: 50,
  JOIN_CAMPAIGN: 100,
  KNOCK_50_DOORS: 100,
  TRACK_PROMISE: 10,
  VOTED_MUNICIPAL: 100,
  VOTED_PROVINCIAL: 150,
  VOTED_FEDERAL: 200,
} as const;

const BADGE_THRESHOLDS = {
  first_steps: 100,
  civic_contributor: 500,
  democracy_champion: 2000,
};

export async function awardCivicCredits(
  userId: string,
  action: keyof typeof CIVIC_CREDITS,
  description: string
) { /* award credits, check badges, notify */ }
```

### API routes
- `POST/GET /api/civic/profile` — create/get civic profile
- `PATCH /api/civic/profile/preferences` — update notification prefs
- `GET/POST /api/civic/passport` — voter passport
- `POST /api/civic/passport/voted` — self-report voting (earns 100+ credits)
- `GET /api/civic/passport/badges` — earned badges
- `POST /api/civic/candidate-match` — 3 questions → ranked matches
- `POST/GET /api/civic/volunteer` — volunteer exchange
- `POST/GET /api/civic/petitions` — petition management
- `POST /api/civic/petitions/[id]/sign` — sign petition
- `GET/POST /api/civic/promises/[officialId]` — promise tracking
- `PATCH /api/civic/promises/[id]` — update promise status
- `POST /api/civic/promises/[id]/track` — follow a promise
- `GET /api/civic/polling-station` — Elections Canada polling station lookup by postal

### Notification engine: src/lib/notifications/engine.ts
```typescript
// Auto-triggers:
// - Election result verified → notify ward followers
// - Poll threshold crossed (50%, 1000 votes) → notify subscribers
// - Petition hits milestone (100, 500 sigs) → notify creator + candidates
// - Promise status updated → notify trackers
// - Emergency alert → notify all users in affected area
// - Event tomorrow reminder → notify RSVPs
// Respects quiet hours. Respects user preferences. Never spams.
```

Commit: `feat: Poll City Social backend — civic profiles, voter passport, civic credits + badges, petition platform, promise accountability, candidate matching, notification engine`

---

## TASK 5 — ADONI V2 COMPLETE BACKEND (45 minutes)

### Schema additions
```prisma
model AdoniConversation {
  id         String   @id @default(cuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  messages   Json     // array of {role, content, timestamp}
  page       String?
  phase      String?
  toolCalls  Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model AdoniUserMemory {
  id                String   @id @default(cuid())
  userId            String
  campaignId        String
  preferredName     String?
  communicationStyle String?
  topPriorities     Json?
  stressPoints      Json?
  expertiseAreas    Json?
  typicalLoginTime  String?
  prefersBrief      Boolean  @default(false)
  facts             Json?
  decisions         Json?
  openItems         Json?
  lastTopics        Json?
  unresolvedItems   Json?
  updatedAt         DateTime @updatedAt
  createdAt         DateTime @default(now())
  @@unique([userId, campaignId])
}

model AdoniReminder {
  id           String   @id @default(cuid())
  userId       String
  campaignId   String
  message      String
  scheduledFor DateTime
  isRecurring  Boolean  @default(false)
  recurPattern String?
  sent         Boolean  @default(false)
  sentAt       DateTime?
  createdAt    DateTime @default(now())
}
```

Run: `npx prisma db push`

### API route: src/app/api/adoni/chat/route.ts
```typescript
// Streaming SSE response
// Model: claude-sonnet-4-20250514 (always latest Sonnet)
// System prompt includes:
//   - Campaign stats (real numbers from DB)
//   - User name and role
//   - Current page context
//   - Days to election
//   - User memory (AdoniUserMemory)
//   - STYLE_RULES (FIRST in system prompt, non-negotiable):
//     "Never use bullet points. Never use headers. Never use markdown.
//      Never use numbered lists. Plain conversational sentences only.
//      Maximum 8 sentences. End every response with one next action.
//      Canadian English. Use 'we' not 'you'. Real names always."
// 15 tools: get_campaign_stats, search_contacts, build_smart_list,
//   update_contact_support, get_volunteer_roster, get_gotv_summary,
//   draft_email, draft_social_post, create_reminder, predict_vote_total,
//   scenario_model, get_anomalies, get_daily_brief, search_knowledge, flag_suspicious
// Updates AdoniUserMemory after every conversation
// Saves to AdoniConversation table
```

### src/app/api/adoni/suggestions/route.ts
Page-aware proactive suggestions. Role-aware. Returns 3 suggestions for current page.

### src/app/api/cron/adoni-reminders/route.ts
Runs every 15 minutes. Sends pending AdoniReminders via push notification.

### src/lib/adoni/formatting.ts
```typescript
export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

Commit: `feat: Adoni v2 — per-user memory, 15 tools, streaming, Canadian election knowledge, reminder cron, stripMarkdown utility`

---

## TASK 6 — PARTY ENTERPRISE PLATFORM (45 minutes)

```prisma
model PartyOrganization {
  id              String   @id @default(cuid())
  name            String
  shortName       String
  level           String   // federal | provincial | municipal
  province        String?
  databaseUrl     String?  // for enterprise isolation
  apiKey          String   @unique @default(cuid())
  plan            String   @default("RIDING") // RIDING | PROVINCIAL | FEDERAL
  dataRetentionDays Int    @default(365)
  createdAt       DateTime @default(now())
  ridingAssociations RidingAssociation[]
  members         PartyMember[]
  agms            PartyAGM[]
}

model RidingAssociation {
  id           String           @id @default(cuid())
  partyId      String
  party        PartyOrganization @relation(fields: [partyId], references: [id])
  ridingName   String
  ridingCode   String
  province     String
  president    String?
  email        String?
  members      PartyMember[]
  nominations  NominationRace[]
  createdAt    DateTime         @default(now())
}

model PartyMember {
  id              String           @id @default(cuid())
  partyId         String
  party           PartyOrganization @relation(fields: [partyId], references: [id])
  ridingId        String?
  riding          RidingAssociation? @relation(fields: [ridingId], references: [id])
  firstName       String
  lastName        String
  email           String?
  phone           String?
  memberSince     DateTime?
  isActive        Boolean          @default(true)
  createdAt       DateTime         @default(now())
}

model NominationRace {
  id          String   @id @default(cuid())
  ridingId    String
  riding      RidingAssociation @relation(fields: [ridingId], references: [id])
  office      String
  electionDate DateTime?
  nominationDeadline DateTime?
  status      String   @default("open") // open | closed | decided
  nominees    NominationNominee[]
  votes       NominationVote[]
  createdAt   DateTime @default(now())
}

model NominationNominee {
  id          String   @id @default(cuid())
  raceId      String
  race        NominationRace @relation(fields: [raceId], references: [id])
  memberId    String
  biography   String?  @db.Text
  photoUrl    String?
  signaturesRequired Int @default(25)
  signaturesCollected Int @default(0)
  status      String   @default("declared") // declared | qualified | withdrawn
  createdAt   DateTime @default(now())
}

model NominationVote {
  id         String   @id @default(cuid())
  raceId     String
  race       NominationRace @relation(fields: [raceId], references: [id])
  voterId    String   // party member ID, hashed for anonymity
  rankings   Json     // ranked ballot: [{nomineeId, rank}]
  createdAt  DateTime @default(now())
}

model PartyAGM {
  id          String   @id @default(cuid())
  partyId     String
  party       PartyOrganization @relation(fields: [partyId], references: [id])
  title       String
  date        DateTime
  type        String   // agm | convention | special_meeting
  resolutions PartyResolution[]
  executives  PartyExecutiveElection[]
  createdAt   DateTime @default(now())
}

model PartyResolution {
  id          String   @id @default(cuid())
  agmId       String
  agm         PartyAGM @relation(fields: [agmId], references: [id])
  title       String
  description String   @db.Text
  status      String   @default("pending") // pending | passed | failed
  votesFor    Int      @default(0)
  votesAgainst Int     @default(0)
  votesAbstain Int     @default(0)
  createdAt   DateTime @default(now())
}

model StaffAccessLog {
  id              String   @id @default(cuid())
  staffUserId     String
  staffName       String
  staffEmail      String
  customerId      String
  customerType    String   // party | campaign
  dataType        String
  action          String   // read | update | delete | export
  ticketId        String?
  reason          String
  ip              String
  userAgent       String
  queryDescription String?
  rowsAccessed    Int?
  createdAt       DateTime @default(now())
}
```

Run: `npx prisma db push`

### API routes
- `POST/GET /api/party/organizations` — create and list party orgs
- `GET/PATCH /api/party/organizations/[id]` — manage org
- `POST/GET /api/party/organizations/[id]/ridings` — riding associations
- `POST/GET /api/party/organizations/[id]/members` — member management
- `POST/GET /api/party/nominations/[raceId]/vote` — ranked ballot voting
- `POST/GET /api/party/agms` — AGM management
- `POST /api/party/agms/[id]/vote` — resolution voting
- `GET /api/party/organizations/[id]/access-log` — staff access log (enterprise only)
- `POST /api/party/organizations/[id]/export` — full data export
- `POST /api/party/organizations/[id]/delete-request` — data deletion with cooling period

### Ranked ballot implementation
```typescript
// src/lib/party/ranked-ballot.ts
// Instant-runoff voting (most common in Canadian internal elections)
export function computeRankedBallotResult(ballots: RankedBallot[]): RankedBallotResult {
  // Standard IRV: eliminate lowest, redistribute. Repeat until majority.
}
```

Commit: `feat: party enterprise platform — organization hierarchy, riding associations, member management, nomination races, ranked ballot AGM voting, staff access logs, data export`

---

## TASK 7 — GEORGE OPERATOR SYSTEM (30 minutes)

### Schema additions
```prisma
model OperatorNotification {
  id        String   @id @default(cuid())
  type      String   // build_success | build_failure | new_customer | security | scale_warning
  title     String
  body      String
  data      Json?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model DemoToken {
  id          String   @id @default(cuid())
  type        String   // candidate | party | media
  prospectName String?
  prospectEmail String?
  token       String   @unique @default(cuid())
  views       Int      @default(0)
  lastViewedAt DateTime?
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}
```

Run: `npx prisma db push`

### API routes
- `POST /api/webhooks/vercel` — receives deploy webhook, sends push to George
- `GET /api/cron/health-monitor` — hourly health check, alerts on thresholds
- `POST /api/ops/notify` — send push notification to George
- `POST /api/ops/test-alert` — test the notification system
- `GET/POST /api/ops/demos` — generate demo tokens with QR codes
- `GET /api/ops/demos/[token]/view` — track prospect views

### Health monitor thresholds (alert George)
```typescript
const THRESHOLDS = {
  VERCEL_BANDWIDTH_WARN: 0.80,
  RAILWAY_STORAGE_WARN: 0.70,
  ANTHROPIC_SPEND_WARN: 500, // per month
  TWILIO_BALANCE_WARN: 50,   // dollars remaining
  ERROR_RATE_WARN: 0.01,     // 1% of requests
  P99_RESPONSE_WARN: 500,    // milliseconds
};
```

### vercel.json cron additions
```json
{
  "crons": [
    { "path": "/api/cron/health-monitor", "schedule": "0 * * * *" },
    { "path": "/api/cron/adoni-reminders", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/intelligence", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/data-retention", "schedule": "0 2 * * *" }
  ]
}
```

Commit: `feat: George operator system — deploy webhooks, hourly health monitor, push to phone, demo generator with prospect tracking`

---

## TASK 8 — TV MODE BACKEND (20 minutes)

Campaign model additions:
```prisma
tvEnabled     Boolean @default(false)
tvToken       String? @unique @default(cuid())
tvRotate      Boolean @default(true)
tvRotateSec   Int     @default(30)
tvModes       String[] // ['war-room', 'gotv', 'volunteers', 'results', 'social', 'fundraising', 'election-day']
```

Run: `npx prisma db push`

### API routes
- `GET /api/tv/[slug]/stats` — all campaign stats for TV display (validated by token)
- `GET /api/tv/[slug]/feed` — last 20 activity items (validated by token)
- `GET /api/tv/[slug]/volunteers` — volunteer leaderboard (validated by token)
- `GET /api/tv/[slug]/results` — election results for Mode 4 (validated by token)

All TV routes: validate token from URL query param, return non-sensitive data only (no emails/phones), 30-second ISR cache.

Commit: `feat: TV mode backend — 4 data endpoints, token validation, 30s cache, no PII exposure`

---

## TASK 9 — PRINT MARKETPLACE BACKEND (20 minutes)

```prisma
model PrintTemplate {
  id          String   @id @default(cuid())
  name        String
  category    String   // lawn-sign | door-hanger | flyer | palm-card | button | shirt
  width       Float
  height      Float
  bleed       Float    @default(0.125)
  thumbnail   String
  htmlTemplate String  @db.Text
  isPremium   Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  orders      PrintOrder[]
}

model PrintOrder {
  id           String   @id @default(cuid())
  campaignId   String
  campaign     Campaign @relation(fields: [campaignId], references: [id])
  templateId   String?
  template     PrintTemplate? @relation(fields: [templateId], references: [id])
  productType  String
  quantity     Int
  status       String   @default("draft") // draft | proof | approved | printing | shipped | delivered
  designData   Json
  downloadUrl  String?
  supplierOrderId String?
  totalPrice   Decimal?
  shippingAddr Json?
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

Run: `npx prisma db push`

### API routes
- `GET /api/print/templates` — list all templates by category
- `POST /api/print/orders` — create print order
- `GET /api/print/orders` — campaign's order history
- `POST /api/print/download` — generate print-ready PDF (puppeteer or @react-pdf/renderer)

### Seed 15 print templates: prisma/seeds/print-templates.ts
Lawn Sign 18x24 (classic + modern), Door Hanger (info + survey), Flyer 8.5x11 (campaign + event), Palm Card 4x6, Postcard (GOTV + thank you), Button 2.25", Bumper Sticker, T-Shirt, Tote Bag, Hat.

```bash
npm run db:seed:print-templates
```

Commit: `feat: print marketplace backend — templates schema, order management, PDF generation, 15 seed templates`

---

## TASK 10 — FULL AUDIT AND CLEANUP (30 minutes)

When all above tasks are complete:

```bash
npx tsc --noEmit
npm run build
npm audit
grep -r "console.log" src/app/api/ --include="*.ts" | wc -l
grep -r "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx"
grep -r "any;" src/app/api/ --include="*.ts" | wc -l
```

Fix every error found.

Run FEATURE_EXECUTION_CHECKLIST.md — mark every completed task ✅.

Post final status to COORDINATION_THREAD.md:
```
## CLAUDE CODE SESSION COMPLETE — [TIME]
Tasks completed: [list all 10]
Build: ✅ passing
TypeScript: ✅ zero errors
Security: ✅ hardened
Prisma models added: [count]
API routes added: [count]
Remaining blockers: [any]
What Co needs from me: [any stubs or mocks needed]
George action needed: [any env vars or personal actions]
```

---

# SECTION 7 — COPILOT (Co) BUILD QUEUE (7 HOURS)

Post to COORDINATION_THREAD.md at session start:
```
## SESSION START — GitHub Copilot (Co) — [TIME]
Build status: [passing/failing]
Starting with: Fix party-colours if still broken, then Task 1
Territory: app pages, components, hooks, styles
```

---

## Co TASK 0 — VERIFY BUILD IS GREEN (10 minutes)

```bash
git pull
npm run build
```

If build is still failing on party-colours → help Claude Code fix it.
This is the only time you touch `src/lib/` — to help fix a critical blocker.
Post to COORDINATION_THREAD.md when done.

---

## Co TASK 1 — DESIGN SYSTEM FOUNDATION (30 minutes)

Create `src/lib/design-system.ts`:
```typescript
export const T = { /* all tokens from Section 4 */ }
export const SPRINGS = { /* all spring presets from Section 4 */ }
export function getCampaignMood(daysToElection: number, gap: number | null) {
  if (daysToElection === 0) return 'election_day';
  if (gap !== null && gap <= 0) return 'winning';
  if (gap !== null && gap < 100) return 'close';
  if (daysToElection < 10) return 'final_push';
  if (daysToElection < 30) return 'momentum';
  return 'foundation';
}
```

Ensure `poll-city-components.tsx` exists at `src/components/poll-city-components.tsx`.
If it does not exist: create it with all 10 components from Section 4.
Ensure `poll-city-global-override.css` is imported at bottom of `src/app/globals.css`.

Commit: `ui: design system foundation — tokens, springs, campaign mood engine, component library confirmed`

---

## Co TASK 2 — ADONI UI COMPLETE (60 minutes)

`src/components/ai/adoni.tsx` — the complete component:

**Bubble mode (default):**
- 60px circular button, bottom-right, fixed position
- Navy background, PC logo or maple leaf
- Notification badge (red dot with count)
- Spring bounce on new suggestion
- Drag target — campaign items can be dragged onto Adoni

**Panel mode:**
- 400px slide-in from right
- Content area shifts left (does not overlap)
- Header: "Adoni" + campaign name + mode toggle buttons
- Message list: plain text bubbles, no markdown ever
- Apply `stripMarkdown()` to every message displayed
- Input: text field + send button + mic button (mobile voice)
- Suggested actions: 4 buttons when no conversation started

**Full screen mode:**
- Two columns
- Left (480px): conversation history + input
- Right: AdoniOutputPanel
  - When `get_campaign_stats` called → renders stat cards
  - When `build_smart_list` called → renders contact table
  - When `draft_email` called → renders email preview with "Open in Composer"
  - When `get_gotv_summary` called → renders P1/P2/P3/P4 breakdown
  - Default: 4 suggested action buttons

**Mode cycle:** Cmd+Shift+A → bubble → panel → fullscreen → bubble

**Voice input (mobile):**
Long-press bubble → voice mode activates
Web Speech API — no library needed
"Mark 123 Main as Not Home" → triggers action directly
Works offline — queues for sync

**Greeting by time:**
Morning: "Good morning [name]. [open item or stat]."
Evening: "Good evening [name]. [how is the day going]."

Commit: `ui: Adoni complete — bubble/panel/fullscreen, voice input, drag target, no markdown ever, streaming display, structured output panel`

---

## Co TASK 3 — DASHBOARD 6 MODES FULLY BUILT (60 minutes)

`src/app/(app)/dashboard/dashboard-client.tsx` — 6 mode tabs that actually work.

**Mode 1: Overview**
12-column grid layout.
Row 1: "Good [time], [Name]. Your election is in [X] days."
Row 2: 4 stat cards — Gap (AnimatedCounter 72px), Supporters (AnimatedCounter 48px), Doors Today, Volunteers Active
Row 3: Activity feed (last 20 actions), Quick actions (3 buttons)
Row 4: DraggableDashboard with widgets (map, GOTV gauge, finance progress, volunteer leaderboard)

**Mode 2: Canvass**
Active turfs list with completion percentage
Walk list summary by area
Canvasser status (active, completed, idle)
Today's door knock progress bar
Quick launch: "Start Canvassing" → opens walk list

**Mode 3: GOTV**
GapWidget (center, large)
P1/P2/P3/P4 breakdown with RacingLeaderboard
Voted counter with progress bar (AnimatedCounter)
Priority call list (top 20 P1s not yet confirmed voted)
Election day countdown

**Mode 4: Finance**
Raised vs limit thermometer
Recent donations (last 10)
Top donors (opt-in only)
Spending by category
Compliance status (green/amber/red)

**Mode 5: Election Day**
Full screen war room
Clock (counting down to polls close)
Voted counter (hero, AnimatedCounter)
Scrutineer reports coming in
Poll-by-poll status
Volunteer deployment

**Mode 6: Advance Vote**
Advance vote period dates
Supporters who have advance voted
Reminder schedule for confirmed supporters

Commit: `ui: dashboard 6 modes fully built — all tabs functional with real data, AnimatedCounter, GapWidget, draggable widgets`

---

## Co TASK 4 — TV MODE UI (45 minutes)

`src/app/tv/[slug]/tv-client.tsx` — the full war room display

Dark background (#0a0e1a). Full viewport. No scrollbars.
Poll City logo + campaign name + live clock (ticking every second) in header.
Mode pills at top.
Auto-rotates through enabled modes.
Refreshes data every 30 seconds via SWR.

**7 displays implemented:**

Mode 1 — War Room: supporter count, countdown, doors today, volunteer count, activity ticker at bottom
Mode 2 — GOTV Tracker: giant voted counter, progress bar, remaining to goal
Mode 3 — Volunteer Leaderboard: RacingLeaderboard with spring animations, top 10, "Volunteer of the Day" spotlight
Mode 4 — Results Night: CNN-style, poll-by-poll entry form for scrutineers, candidate vs candidate bars, confetti on taking lead
Mode 5 — Social Wall: mentions feed, supporter pledges, scrolling live
Mode 6 — Fundraising: thermometer, donor ticker, top donors
Mode 7 — Election Day Ops: all stats, voted hero, volunteers deployed, turfs covered

**Dashboard TV button:**
In `src/app/(app)/dashboard/` header — TV icon button.
Opens right-side panel with: preview, cast instructions, mode selection toggles, rotation speed slider, copy link button.

**Settings page section:**
TV Mode section with token display/regenerate.

Keyboard shortcuts: Space (pause), arrows (skip), F (fullscreen), 1-7 (jump to mode), Escape (exit).

Commit: `ui: TV mode — 7 displays, war room dark theme, CNN results night, confetti, auto-rotate, keyboard shortcuts, dashboard TV button`

---

## Co TASK 5 — POLL CITY SOCIAL UI (45 minutes)

`src/app/(app)/social/` — the civic feed

**Civic profile setup wizard:**
Step 1: Enter postal code → shows ward and representatives
Step 2: Select issues that matter (housing, transit, safety, environment, schools, taxes)
Step 3: Notification preferences (results, polls, debates, emergency)
Step 4: Complete → Voter Passport created, civic credits awarded

**Social feed page:**
Flash polls from candidates in area (vote directly from feed)
Petitions gaining momentum nearby
Candidate updates and announcements
Local news curated by issue preference
Election night results as they come in
Each item: vote/sign/follow from the card — no page navigation needed

**Politician profile page with ATLAS:**
90-day approval rating trend chart (recharts line chart)
Velocity indicator (rising/falling/stable)
Promises tracker (list with status badges)
Flash polls by this official
Events and town halls
"Follow" button → earns 5 civic credits

**Voter Passport page:**
Credit total (AnimatedCounter)
Badge grid (earned badges highlighted, unearned greyed)
Civic history timeline
"I Voted" button (election day) with celebration animation

**Candidate Finder:**
3 questions → animated match reveal
Shows top 5 with match percentage and explanation
No account required — postal code only

Commit: `ui: Poll City Social — setup wizard, civic feed, politician profiles with ATLAS charts, voter passport, candidate finder`

---

## Co TASK 6 — PERMISSION SYSTEM UI (30 minutes)

`src/app/(app)/settings/team/` — complete team management

**Role management:**
Show all 11 roles with description
For each member: role badge, edit button
Super Admin: the only one who can change roles
Visual: role chip with colour coding

**QR join flow:**
In settings → Team → "Add Team Member" → generates QR code
QR links to `/join/[token]`
Public join page: simple form (name, email, phone)
Auto-assigns "Volunteer" role
Campaign manager gets notification
Role upgradeable after joining

**Role-scoped sidebar:**
Import from `usePermissions()` hook (Claude Code creates this)
If hook not ready: mock it with full-access for now
Volunteer sees: only their walk list
Finance Manager sees: donations, expenses, reports
Field Director sees: canvassing, volunteers, GOTV

**Permission visual for each feature:**
Settings → Permissions page
Grid: roles vs features
Green checkmark / grey dash
Super Admin toggle: enables/disables feature for each role

Commit: `ui: permission system — role management, QR join flow, role-scoped sidebar, permission grid`

---

## Co TASK 7 — MEDIA DASHBOARD UI (30 minutes)

`src/app/(app)/media/` — visible to MediaOutlet accounts only

**Sections:**

Your Ticker:
- Live preview of the ticker (shows current items)
- Copy embed code button (one click)
- "Add item" form: text, URL, type, priority, expires

Your Polls:
- Flash poll creator (question + options + close date)
- Live vote counts
- Embed code per poll

Election Results:
- Double-entry form: province, municipality, ward, candidate, votes, % reporting
- Shows "Waiting for second entry" badge
- "Verified ✅" badge when both entries match

Embed Codes:
- All embed snippets in one place
- One-click copy for each
- Dark/light/top/bottom ticker variants

Analytics:
- Impressions, votes, clicks (last 7 days)
- recharts bar chart

Commit: `ui: media outlet dashboard — ticker management, double-entry results, embed code generator, analytics`

---

## Co TASK 8 — PRINT MARKETPLACE UI (30 minutes)

`src/app/(app)/print/` — the Vistaprint for campaigns

**Main page /print:**
Hero: "Professional Print Materials — Delivered to Your Door"
Category grid (big visual cards):
Lawn Signs, Door Hangers, Flyers, Palm Cards, Postcards,
Buttons & Pins, T-Shirts, Hats, Tote Bags, Bumper Stickers,
Banners, Window Clings, Yard Stakes, Table Covers, Pens/Promo

Each card: product image, starting price, turnaround, "Design Now →"

Active Orders panel: status tracker for each active order

**Design tool /print/design/[templateId]:**
Two-panel layout (left sidebar + center canvas + right sidebar)

Center canvas: live product preview with editable elements

"Apply My Brand Kit" button — fills everything automatically from campaign brand:
- Campaign name, candidate name, tagline
- Primary colour → background
- Secondary colour → text/accents
- Logo → standard position
- Font → applied everywhere
- Phone, website auto-filled

Left sidebar: layer list, click to select
Right sidebar: product specs, quantity with price calculator, Download/Order/Save buttons

Price calculator updates live as quantity changes.

**Public merch store /store/[slug]:**
Campaign colours as header
Product grid with Printful mockup images
Supporter checkout via Stripe
"All proceeds support the campaign"

Commit: `ui: print marketplace — category grid, in-browser design tool, Apply Brand Kit, price calculator, public merch store`

---

## Co TASK 9 — COMMUNICATIONS SUITE UI (30 minutes)

`src/app/(app)/communications/` — all comms in one place

**Tabs:**
Email Composer, SMS Composer, Social Posts, Press, Call Scripts

**Email Composer:**
To: dropdown (all contacts, P1 supporters, volunteers, custom list)
Subject line with AI assist button
Rich text body
Schedule send or send now
Track opens/clicks

**SMS Composer:**
Character counter (160 per segment)
CASL opt-out auto-appended
Schedule send
Delivery report

**Social Posts:**
Platform selector (Twitter/X, Facebook, Instagram, LinkedIn)
Character limit indicator per platform
Image attach
Adoni drafts on request
Post now or schedule

**Press section:**
Media request inbox (journalists who sent requests via Poll City Social)
Draft response with Adoni assist
Media contact list

**Call Scripts:**
Script library for different call types (GOTV, volunteer recruitment, donation ask)
Adoni generates scripts on request

Commit: `ui: communications suite — email/SMS/social composer, press inbox, call scripts`

---

## Co TASK 10 — FINAL PASS AND AUDIT (30 minutes)

When all tasks complete:

1. Check every page has a proper empty state (not a blank screen)
2. Check every number on every page uses AnimatedCounter
3. Check every button has spring physics (whileHover + whileTap)
4. Check every loading state uses Skeleton (no spinners anywhere)
5. Check Adoni is visible on every authenticated page
6. Check mobile responsiveness at 390px viewport
7. Check dark mode only on GOTV and Election Night
8. Check no gradients anywhere else
9. Run `npm run build` → must pass clean

Update FEATURE_EXECUTION_CHECKLIST.md.

Post final status to COORDINATION_THREAD.md:
```
## Co SESSION COMPLETE — [TIME]
Tasks completed: [list all 10]
Build: ✅ passing
Design system: ✅ enforced
Empty states: ✅ everywhere
Animated counters: ✅ all numbers
Spring physics: ✅ all buttons
Remaining: [any UI waiting for CC backend]
```

---

# SECTION 8 — COORDINATION PROTOCOL

## At session start (both agents)
1. `git pull`
2. `npm run build`
3. Read COORDINATION_THREAD.md — check what the other built
4. Post your session start message
5. Begin Task 0

## Every 30 minutes (both agents)
Post progress to COORDINATION_THREAD.md:
```
## PROGRESS UPDATE — [Agent] — [TIME]
Completed: [what]
Building: [current task]
Next: [what after]
Blockers: [any]
Needs from other agent: [specific requests]
```

## When you need something from the other agent
Post to COORDINATION_THREAD.md with exact specification.
Build a mock or stub. Keep building. Never block.

## When you finish everything
Read COORDINATION_THREAD.md for anything the other agent flagged.
Help resolve any blockers.
If still time remaining: check FEATURE_EXECUTION_CHECKLIST.md for ⏳ Pending items.
Pick highest priority. Build it. Document it.

## Self-spawn rule (advanced)
If you identify a specialist task that would significantly benefit from
a dedicated focused session (e.g., performance optimization, specific complex feature):
Open a new VS Code window with a focused prompt for that specialist work.
Post to COORDINATION_THREAD.md that you have spawned a specialist.
Monitor and merge their work.

---

# SECTION 9 — GEORGE'S TODO LIST
## Things only George can do — AI cannot do these

### 🔴 CRITICAL — do before agents can fully function
These things break features until done.

| # | Task | Where | Time | Blocks |
|---|------|--------|------|--------|
| 1 | Add ANTHROPIC_API_KEY to Vercel | console.anthropic.com → API keys → Vercel env | 5 min | Adoni completely dead |
| 2 | Run `npx prisma db push` on hotspot | Terminal in VS Code, must be on internet | 2 min | Schema changes not live |
| 3 | Add NEXTAUTH_SECRET to Vercel | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` → paste | 3 min | Auth broken in prod |
| 4 | Set NEXTAUTH_URL=https://www.poll.city | Vercel env | 1 min | Auth redirects broken |

### 🟡 IMPORTANT — do this week

| # | Task | Where | Time | Blocks |
|---|------|--------|------|--------|
| 5 | Generate and add VAPID keys | `npx web-push generate-vapid-keys` → 3 Vercel vars | 5 min | Push notifications dead |
| 6 | Add RESEND_API_KEY | resend.com (free) → Vercel | 5 min | All email disabled |
| 7 | Add POLL_ANONYMITY_SALT | `openssl rand -hex 32` → Vercel | 2 min | Anonymous polls disabled |
| 8 | Add CRON_SECRET | `openssl rand -hex 16` → Vercel | 2 min | Cron jobs unprotected |
| 9 | Add DATABASE_ENCRYPTION_KEY | `openssl rand -hex 32` → Vercel | 2 min | Field encryption inactive |
| 10 | Enable Railway daily backups | railway.app → DB → Settings → Backups | 2 min | No disaster recovery |
| 11 | Find GEORGE_USER_ID | Log in → visit poll.city/api/auth/session → copy "id" → Vercel | 3 min | Operator notifications fail |

### 🟢 SOON — this month

| # | Task | Where | Time | Blocks |
|---|------|--------|------|--------|
| 12 | Apple Developer Account | developer.apple.com → $99 USD | 15 min | iOS TestFlight impossible |
| 13 | Google OAuth credentials | console.cloud.google.com | 15 min | Google login disabled |
| 14 | Stripe live keys | dashboard.stripe.com | 15 min | Real payments disabled |
| 15 | Twilio account | twilio.com | 15 min | All SMS disabled |
| 16 | Set up Resend domain verification | resend.com → Domains → add poll.city DNS | 10 min | Emails go to spam |
| 17 | Register Vercel webhook | Vercel → project → Settings → Deploy Hooks → add poll.city/api/webhooks/vercel | 5 min | Phone notifications don't fire |
| 18 | Set up Upstash Redis (free) | upstash.com | 10 min | Rate limiting in-memory only |
| 19 | Set up Cloudflare Turnstile | dash.cloudflare.com | 10 min | CAPTCHA not showing |
| 20 | Install Poll City Social PWA on phone | Go to poll.city on phone → Share → Add to Home Screen → allow notifications | 3 min | Can't receive operator notifications |

### 📞 BUSINESS — personal calls and outreach only George can make

| # | Task | Notes |
|---|------|-------|
| 21 | Call ONE person running in October 2026 | Show them the demo. Charge them $799. This is the most important thing. |
| 22 | Reach out to 3-5 Ontario local news outlets | Free Standard media access → "Powered by Poll City" attribution + case study |
| 23 | Contact a riding association president you know personally | First party enterprise conversation. Prove it works. Get a testimonial. |
| 24 | Contact AMO (Association of Municipalities Ontario) | Ask about data processor arrangements for voters lists |
| 25 | Set up private repo `poll-city-intelligence` | For ATLAS algorithm. George + max 2 developers. NDAs required. |
| 26 | Sign NDAs with anyone who touches ATLAS | This is the Coca-Cola formula. Protect it. |

### 📋 SETUP COMMANDS (run these when you have time)

```bash
# Generate all secrets at once — paste each output into Vercel
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # NEXTAUTH_SECRET
openssl rand -hex 32   # DATABASE_ENCRYPTION_KEY
openssl rand -hex 32   # POLL_ANONYMITY_SALT
openssl rand -hex 16   # CRON_SECRET
openssl rand -hex 16   # HEALTH_CHECK_SECRET

# Generate VAPID keys
npx web-push generate-vapid-keys
# Add: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY

# Run after prisma db push
npm run db:seed:officials    # 7,048+ Canadian officials
npm run db:seed:ward20       # 5,000 Ward 20 Toronto contacts (demo data)
npm run db:seed:help         # Help centre articles
npm run db:seed:media        # Election night demo data
npm run db:seed:print-templates  # 15 print templates
```

---

# SECTION 10 — THE VISION NORTH STAR

Both agents read this before building anything.
When in doubt about any decision — come back to this.

Poll City is not a dashboard.
It is a moment.

The moment at 9:23pm on October 26, 2026
when someone gets a push notification:
"Ward 20 result: Jane Smith wins — thank you for following this race."

That person was not a campaign manager.
They were a voter who cared.
And Poll City made them feel like they were there.

Every feature you build tonight serves that moment.
Every API route. Every component. Every notification.
Every empty state. Every animation. Every loading skeleton.

All of it exists so that moment happens for millions of Canadians
who have never felt connected to their local democracy before.

Build for those moments. Not for the demo. Not for the investor.
For the person who gets that notification and smiles.

Named after his son. Built to help people. That is the story.

🇨🇦
