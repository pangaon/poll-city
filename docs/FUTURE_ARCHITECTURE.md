# Poll City -- Future Architecture Plan

Date: 2026-04-07
Horizon: May 2026 -- November 2026 (Ontario Municipal Election: October 26, 2026)

---

## Current State Summary

| Metric | Value |
|---|---|
| Prisma models | 133 |
| Prisma enums | 44 |
| API routes | 195+ |
| Cron jobs | 13 (vercel.json) |
| Features built | 54 tracked (checklist) |
| Auth | NextAuth (credentials + Google OAuth) with 2FA step-up |
| Database | PostgreSQL on Railway (single instance) |
| Hosting | Vercel (serverless) |
| Caching | None (no Redis layer) |
| Real-time | None (polling only) |
| PWA | Manifest + service worker (basic) |

---

## Phase 1: Pre-Election Foundation (May -- August 2026)

### 1.1 Multi-Tenant Database Isolation

**Problem**: All campaigns share a single database with application-level scoping (`campaignId` WHERE clauses). Enterprise party accounts managing 50+ campaigns need stronger isolation guarantees.

**Plan**:
- Introduce a `Tenant` model representing a party or organization
- Add `tenantId` foreign key to `Campaign`, `User` (via membership)
- Create Prisma middleware that automatically injects `tenantId` filters on all queries
- Row-Level Security (RLS) policies on PostgreSQL for defense-in-depth
- Tenant-scoped API key issuance for external integrations

**Migration path**: Single migration adds `tenantId` columns as nullable, backfill script assigns existing campaigns to a default tenant, then enforce NOT NULL.

### 1.2 Redis Caching Layer (Upstash)

**Problem**: Every page load hits PostgreSQL directly. The 13 cron jobs and 195+ API routes have no caching, which will not survive election-night traffic.

**Plan**:
- Add `@upstash/redis` package with Edge-compatible client
- Cache tiers:
  - **L1 (60s)**: Dashboard widgets, analytics aggregations, official directory
  - **L2 (5min)**: Election results, heat map data, candidate profiles
  - **L3 (1hr)**: Sitemap, marketing pages, help center articles
- Cache invalidation via write-through pattern on mutation endpoints
- Rate limiting migrated from in-memory to Redis (already partially built)

**Hot paths to cache first**:
- `GET /api/analytics/election-results` (heavy aggregation)
- `GET /api/analytics/heat-map` (GeoJSON processing)
- `GET /api/officials/directory` (frequent public hits)
- `GET /api/public/candidates/[slug]` (public profile)

### 1.3 WebSocket Real-Time Infrastructure

**Problem**: Election night needs live results, and canvassing needs real-time field updates. Current architecture is request-response only.

**Plan**:
- Integrate Ably or Pusher for managed WebSocket channels (avoid self-hosting)
- Channel architecture:
  - `campaign:{id}:canvassing` -- live door-knock updates
  - `campaign:{id}:gotv` -- strike-off progress
  - `election:{year}:results` -- election night results feed
  - `ticker:public` -- media ticker feed
- Server-Sent Events (SSE) fallback for environments that block WebSockets
- Publish from existing API mutation endpoints (add `publish()` call after DB write)

### 1.4 Offline-First PWA Enhancement

**Problem**: Current service worker (`sw.js`) is basic. Canvassers in the field lose connectivity frequently. Walk app needs true offline capability.

**Plan**:
- Workbox integration for cache strategies (StaleWhileRevalidate for API, CacheFirst for static)
- IndexedDB queue for offline mutations (door knocks, contact updates, GPS tracks)
- Background sync API to flush queue when connectivity returns
- Conflict resolution: last-write-wins with server timestamp comparison
- Offline indicator UI component in Walk App and Quick Capture

**Priority pages for offline**:
- `/walk` -- Walk list with pre-cached turf data
- `/gotv` -- Strike-off list
- `/contacts` -- Contact lookup (cached subset)

### 1.5 CDN Edge Caching (ISR Strategy)

**Problem**: Public pages (candidate profiles, official profiles, marketing) are server-rendered on every request.

**Plan**:
- Incremental Static Regeneration (ISR) for public routes:
  - `/candidates/[slug]` -- revalidate every 300s
  - `/officials` -- revalidate every 3600s
  - `/help`, `/help/[slug]` -- revalidate every 86400s
  - Marketing pages (`/`, `/pricing`, `/how-polling-works`) -- revalidate every 3600s
- On-demand revalidation via `revalidatePath()` when candidate/official data is updated
- Add `next.config.js` image remote patterns for candidate photos (currently empty `domains: []`)

---

## Phase 2: Election Season (September -- October 2026)

### 2.1 Election Night Real-Time Infrastructure

**Target**: October 26, 2026 from 8:00 PM -- 2:00 AM ET

**Architecture**:
```
Elections Ontario API --> Ingestion Worker --> PostgreSQL --> Redis PubSub --> Ably Channels
                                                                         --> SSE /api/results/stream
                                                                         --> Ticker /api/ticker/stream
```

- Ingestion worker polls Elections Ontario results API every 30 seconds
- Results normalized into `ElectionResult` model (already exists with 7,048 historical records)
- Redis pub/sub fans out to all connected WebSocket/SSE clients
- Ticker endpoint serves formatted results to media outlets

### 2.2 Auto-Scaling Strategy for 10x Traffic

**Baseline estimate**: Normal traffic ~500 RPM. Election night target: 5,000+ RPM.

**Vercel**:
- Upgrade to Vercel Pro for concurrent function execution (from 1 to 24 concurrent builds)
- Edge Runtime for read-heavy public endpoints (`/api/results`, `/api/ticker`, `/api/public/*`)
- Fluid compute for long-running ingestion functions

**Railway (PostgreSQL)**:
- Enable connection pooling via PgBouncer (Railway Pro)
- Read replica for analytics and public queries
- Connection limit increase from 100 to 500
- Prepared statement caching

**CDN**:
- Cloudflare in front of Vercel for DDoS protection
- Cache election results at edge with 30s TTL (matches ingestion cycle)
- Challenge page for suspicious traffic spikes

### 2.3 Results Ingestion Pipeline

**If Elections Ontario provides an API**:
- Cron endpoint `/api/cron/ingest-results` running every 30s on election night only
- Upsert into `ElectionResult` with `externalId` dedup
- Automatic WebSocket broadcast on new/updated results
- Dashboard auto-refresh for campaign war rooms

**If no official API**:
- Manual CSV upload endpoint for campaign teams
- Scraping pipeline as last resort (legal review required)
- Community-sourced results with verification workflow

### 2.4 Media Ticker Scaling

**Problem**: If 1,000+ media outlets hit `/api/ticker` simultaneously, serverless functions will throttle.

**Plan**:
- Pre-render ticker JSON to Upstash Redis on every result update
- `/api/ticker` reads from Redis only (no DB query)
- Edge Runtime for minimal cold start
- Response caching: `Cache-Control: public, s-maxage=30`
- Dedicated ticker authentication via API keys (issued to media partners)

### 2.5 Push Notification Throughput

**Target**: 100,000+ notifications within 1 hour on election night.

**Current state**: Push endpoints exist (`/api/notifications/send`, `/api/notifications/schedule`) but throughput is untested.

**Plan**:
- Batch web-push sends in groups of 1,000 using `Promise.allSettled`
- Queue notifications via Upstash QStash for reliable delivery
- Segment by campaign, then by priority tier (GOTV high-priority first)
- Failure tracking: log failed push subscriptions, auto-unsubscribe stale tokens
- Rate: ~28 notifications/second to hit 100k/hour

---

## Phase 3: Post-Election (November 2026+)

### 3.1 ATLAS Algorithm -- Placeholder to Real ML

**Current state**: ATLAS scoring uses weighted heuristics (support level, contact frequency, donation history). No actual machine learning.

**Plan**:
- Training data: 7,048 election results + canvassing contact records + GOTV outcomes
- Model: Gradient boosted trees (XGBoost) for voter propensity scoring
- Features: past voting history, canvass responses, demographics, donation patterns
- Serving: Pre-compute scores nightly via cron, store in `Contact.atlasScore`
- Evaluation: Compare ATLAS predictions against actual Oct 26 results
- Infrastructure: Python microservice on Railway, called from `/api/cron/adoni-train`

### 3.2 Cross-Election Intelligence Publishing

**Problem**: Poll City has election data from 2014, 2018, 2022, and will have 2026. This is valuable for political researchers and media.

**Plan**:
- Public API at `/api/v2/elections` with historical query support
- Embeddable widgets (iframe + JS snippet) for election result charts
- Data export in CSV, JSON, GeoJSON formats
- Academic/media partnership program with API keys
- Blog/report publishing feature for campaign post-mortems

### 3.3 API v2 with GraphQL Option

**Current state**: 195+ REST endpoints, many with overlapping data. No versioned API.

**Plan**:
- REST v2 at `/api/v2/*` with consistent pagination, filtering, field selection
- GraphQL endpoint at `/api/graphql` using `graphql-yoga` or `pothos`
- Schema auto-generated from Prisma models
- Authentication: Bearer token (API keys) + OAuth2
- Rate limiting per API key tier
- OpenAPI 3.1 spec auto-generated from Zod schemas

### 3.4 Internationalization (French Canada)

**Problem**: Quebec and federal elections require French support. Current UI is English-only.

**Plan**:
- `next-intl` for i18n routing (`/en/dashboard`, `/fr/tableau-de-bord`)
- Translation files in `messages/en.json`, `messages/fr.json`
- Database content (help articles, notification templates) with `locale` column
- Date/number formatting via `Intl` APIs
- Priority: UI chrome first, then help center, then email templates

### 3.5 Provincial and Federal Election Support

**Problem**: Current schema and UI assume Ontario municipal elections.

**Plan**:
- Add `electionLevel` enum: `MUNICIPAL | PROVINCIAL | FEDERAL`
- Extend `Campaign` model with `electionLevel`, `province`
- Province-specific modules for different election rules (spending limits, filing deadlines)
- Federal riding boundary data from Elections Canada
- Multi-province official directory (extend Represent API integration)

---

## Technical Debt to Address

### Type Safety (Priority: High)

| Issue | Count | Fix |
|---|---|---|
| `any` type casts | ~90+ | Replace with proper types, create shared DTOs |
| NextAuth session type | 1 systemic | Extend `Session` interface in `next-auth.d.ts` with `campaignId`, `role`, `requires2FA` |
| Prisma enum string casts | ~20+ | Import enums from `@prisma/client` directly |
| Missing Zod validation | ~30 routes | Add `z.object()` parsing on all POST/PATCH inputs |

### Code Quality (Priority: Medium)

| Issue | Fix |
|---|---|
| `console.log` in production code | Replace with structured logger (`pino` or `winston`) -- pipe to Vercel Logs or external service |
| Prisma client import inconsistency | Standardize on `@/lib/db/prisma` singleton everywhere |
| Middleware Prisma import | Remove direct Prisma usage from Edge middleware (currently imports `prisma` which requires Node runtime) |
| Duplicate utility functions | Consolidate `lib/` helpers, remove dead code |

### Architecture (Priority: Medium)

| Issue | Fix |
|---|---|
| No request tracing | Add correlation IDs via middleware, propagate through API calls |
| No health check aggregation | `/api/health` should check DB, Redis, external services |
| Cron job monitoring | Add success/failure logging to all 13 cron endpoints, alert on consecutive failures |
| No database migrations CI | Add `prisma migrate deploy` to CI/CD pipeline |

---

## Infrastructure Recommendations

### Vercel (Compute + CDN)

| Tier | Use Case | Monthly Cost |
|---|---|---|
| Hobby (current) | Development | $0 |
| Pro | Production (24 concurrent builds, 1TB bandwidth, analytics) | $20/member |

### Railway (Database)

| Tier | Use Case | Monthly Cost |
|---|---|---|
| Developer (current) | Single instance, 1GB RAM | ~$5 |
| Pro | Connection pooling, 4GB RAM, read replicas | ~$25-50 |
| Election night | Temporary scale-up to 8GB RAM | ~$100 one-time |

### Upstash Redis

| Use Case | Monthly Cost |
|---|---|
| Rate limiting + session cache (10k commands/day) | $0 (free tier) |
| Full caching layer (1M commands/day) | $10 |
| Election night burst (10M commands/day) | ~$50 one-time |

### Upstash QStash (Message Queue)

| Use Case | Monthly Cost |
|---|---|
| Push notification batching, async jobs | $0 (free: 500 messages/day) |
| Election night volume | $10 |

### Cloudflare (DDoS + CDN)

| Tier | Use Case | Monthly Cost |
|---|---|---|
| Free | DNS + basic DDoS protection | $0 |
| Pro | WAF + advanced DDoS + analytics | $20 |

### Sentry (Error Monitoring)

| Tier | Use Case | Monthly Cost |
|---|---|---|
| Developer | 5k errors/month, basic alerting | $0 |
| Team | 50k errors/month, performance monitoring | $26 |

### PostHog (Product Analytics)

| Tier | Use Case | Monthly Cost |
|---|---|---|
| Free | 1M events/month, session replay | $0 |
| Growth | Custom dashboards, feature flags | $0 (generous free tier) |

### Ably or Pusher (Real-Time)

| Tier | Use Case | Monthly Cost |
|---|---|---|
| Free | 100 concurrent connections, dev/staging | $0 |
| Pro | 10k concurrent connections (election night) | $50-100 |

---

## Cost Projections

| Scale | DB | Compute | Redis | Real-Time | Monitoring | Total |
|---|---|---|---|---|---|---|
| 10 campaigns (current) | $5 | $0-20 | $0 | $0 | $0 | ~$25-50/mo |
| 100 campaigns | $25 | $20 | $10 | $0 | $26 | ~$80-200/mo |
| 1,000 campaigns | $50 | $40 | $30 | $50 | $26 | ~$200-800/mo |
| Election night spike | +$100 | +$200 | +$50 | +$100 | +$50 | ~$500 one-time |

**Notes**:
- Costs assume Vercel Pro ($20/seat) with 1-2 team members
- Railway costs scale with actual CPU/memory usage
- Election night spike is a temporary 24-hour scale-up
- All services have free tiers sufficient for development and low-volume production

---

## Implementation Priority Matrix

| Priority | Item | Phase | Effort | Impact |
|---|---|---|---|---|
| P0 | Upstash Redis caching | 1 | 1 week | Eliminates DB bottleneck |
| P0 | ISR for public pages | 1 | 2 days | Immediate performance gain |
| P0 | Structured logging | 1 | 3 days | Observability for all phases |
| P1 | WebSocket integration | 1 | 1 week | Required for Phase 2 |
| P1 | Offline PWA enhancement | 1 | 2 weeks | Field team productivity |
| P1 | `any` type cleanup | 1 | 1 week | Code quality baseline |
| P1 | Middleware Prisma removal | 1 | 1 day | Edge compatibility fix |
| P2 | Multi-tenant isolation | 1 | 2 weeks | Enterprise sales prerequisite |
| P2 | Election night pipeline | 2 | 2 weeks | Core election feature |
| P2 | Push notification scaling | 2 | 1 week | GOTV effectiveness |
| P3 | GraphQL API | 3 | 3 weeks | Developer ecosystem |
| P3 | French i18n | 3 | 4 weeks | Quebec market |
| P3 | ATLAS ML migration | 3 | 6 weeks | Competitive advantage |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Elections Ontario has no public API | High | High | Build manual upload + community reporting fallback |
| Election night DB overwhelmed | Medium | Critical | Redis caching + read replica + connection pooling |
| Vercel function cold starts on spike | Medium | Medium | Edge Runtime for hot paths + pre-warming |
| Railway network unreachable (observed) | Known | Low | Represent API calls moved to Railway cron or proxy |
| Push notification provider throttling | Low | Medium | QStash queue with retry + multiple provider fallback |
| Prisma connection pool exhaustion | Medium | High | PgBouncer + `connection_limit` in schema + pool monitoring |

---

*This document should be reviewed and updated monthly. Next review: May 7, 2026.*
