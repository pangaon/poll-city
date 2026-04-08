# Poll City — Live Build Plan
Last updated: 2026-04-08

This is the single source of truth. Everything done, everything next, nothing forgotten.

---

## SECURITY STATUS — GREEN

All critical vulnerabilities closed as of 2026-04-08.
Required env vars to set in Vercel before going live with real users:
- POLL_ANONYMITY_SALT (openssl rand -base64 32)
- IP_HASH_SALT (openssl rand -base64 32)
- GUEST_TOKEN_SECRET (openssl rand -base64 32)
- CRON_SECRET (openssl rand -base64 32)

Next security layer (when first paying client signs): Sentry error monitoring.
Full pen test: after 100 users, before Series A.

---

## WHAT IS FULLY BUILT AND VERIFIED

### Infrastructure
- [x] Next.js 14 App Router monolith on Vercel
- [x] PostgreSQL on Railway via Prisma
- [x] NextAuth JWT sessions with activeCampaignId
- [x] Multi-tenant campaign isolation
- [x] Rate limiting (95% of endpoints)
- [x] Audit logging (85% of writes)
- [x] Anomaly detection (in-memory, Sentry hooks ready)
- [x] AI prompt injection blocking
- [x] Soft deletes on Contact/Task/Sign/Volunteer/Donation/Event
- [x] Recycle bin (/settings/recycle-bin)
- [x] Version history API (/api/history)
- [x] Import rollback (24h window)
- [x] Error response hardening (no internal leakage)
- [x] Webhook replay protection

### Campaign App (app.poll.city)
- [x] Dashboard with 6 modes skeleton
- [x] Contacts — full CRM, 4,179 contact demo, filters, support levels
- [x] Canvassing — turf builder, walk list, print walk list
- [x] GOTV — gap formula, live counter
- [x] Election Night page
- [x] Volunteers — profiles, shifts, expenses
- [x] Tasks — assignment, tracking
- [x] Calendar
- [x] Communications — Email (Resend), SMS (Twilio), Social composer
- [x] Donations — recording, receipts, budget
- [x] Analytics
- [x] Reports
- [x] Settings — team, security, brand kit, permissions
- [x] Adoni AI — panel mode, fullscreen, suggestions, page assist
- [x] Adoni event bus FIXED (open-adoni event now works)
- [x] Owner console (/ops/campaigns) — SUPER_ADMIN only

### Poll City Social (social.poll.city)
- [x] /social discover page
- [x] /officials directory + profile pages
- [x] /sentiment public page (approval ratings)
- [x] Civic passport onboarding (6-screen flow, PIPEDA-compliant)
- [x] Poll voter UIs: NPS, Word Cloud, Timeline/Radar, Binary, Multiple Choice, Slider, Swipe
- [x] Live results SSE stream
- [x] Poll builder wizard (4 steps, 11 types)

### Intelligence Engine
- [x] Approval rating engine (weighted signals, exponential decay)
- [x] Sentiment signals (poll votes, follows, interactions)
- [x] Approval leaderboard and trending APIs
- [x] Autonomous content pipeline (RSS/API → Claude extraction → review queue)
- [x] Content review UI (/ops/content-review) — SUPER_ADMIN only
- [x] 5 Canadian civic sources seeded (Toronto, GC, Ontario Legislature)
- [x] Cron every 30 minutes

### Mobile
- [x] poll-city-mobile/ standalone repo initialized
- [x] mobile/ scaffold inside web repo (tabs, offline store, EAS config)

---

## WHAT IS PARTIALLY BUILT (shells that need wiring)

### Campaign App
- [ ] Dashboard 6 modes — skeleton exists, data not fully wired per mode
- [ ] CNN-level maps (Leaflet) — placeholder, not built
- [ ] TV Mode — 7 display modes — not built
- [ ] framer-motion spring physics throughout — inconsistent
- [ ] DM Sans + skeleton shimmer global override — partially applied
- [ ] Campaign health score algorithm — not built
- [ ] Print marketplace (Canva-like + Printful) — not built
- [ ] Adoni full-screen structured output panel — partial
- [ ] Contact inline cell editing (click-to-edit in table) — not built

### Social
- [ ] Virtual townhalls — designed, not built
- [ ] Notifications subscription engine — partial
- [ ] Civic calendar (.ics feed) — not built

---

## WHAT IS NOT BUILT YET (priority order)

### P0 — Blocks sales (build this week)
1. **Demo modes** — /demo/candidate, /demo/party, /demo/media
   - Ward 20 Toronto seed data, shareable 7-day token links
   - Without this: cannot demo asynchronously to prospects
   - Estimate: 1 day

2. **Contacts inline editing + bulk actions**
   - Click any cell to edit in place
   - Select 50 contacts → change support level / assign / SMS in one action
   - The mayor's feedback. Legitimate competitive gap.
   - Estimate: 1 day

### P1 — Canvasser App Store deadline (May 2026 = ~3 weeks)
3. **Canvasser mobile app** — real API integration, offline queue, TestFlight
   - Scaffold exists. Needs wiring to actual API.
   - App Store review takes 1-2 weeks on top of build
   - Estimate: 3-4 days

### P2 — Makes platform sticky for Social users
4. **Virtual townhalls** — Daily.co embed + question upvote queue + live polls
   - Estimate: 2 days

5. **Maps deep link + vCard export** — native iPhone feel for canvassers
   - Estimate: half day

6. **Civic calendar .ics feed** — unions/ratepayers subscribe their whole org
   - Estimate: half day

### P3 — Performance (before first 1,000 users)
7. **ISR on public pages** — one line per page, eliminates DB hit on every load
   - Estimate: 2 hours

8. **Upstash Redis** — caching hot queries, 200ms → 8ms
   - Estimate: 1 day

### P4 — Enterprise (before first party client)
9. **TV Mode** — 7 display modes, Chromecast/AirPlay
10. **CNN-level maps** — Leaflet choropleth, heat map, volunteer GPS
11. **Adoni full-screen structured output** — contact table, email composer, stats dashboard
12. **Multi-tenant DB isolation** — enterprise parties need this

---

## KEY DATES
- May 2026: Canvasser app App Store submission
- June 2026: Social splits to own deployment
- October 26, 2026: Ontario municipal elections (target event)

---

## ARCHITECTURE RULES (do not break these)
- Phase 1: Single Next.js monolith. One Vercel + one Railway. Do not split yet.
- File territory: Claude Code owns api/prisma/lib. GPT-Codex owns app/(app)/components/hooks.
- Adoni laws: no bullets, no headers, no markdown, max 8 sentences, Canadian English.
- Before every feature: 5 questions (TypeScript? Build? 390px? Ecosystem connected? Biggest thing biggest?)
