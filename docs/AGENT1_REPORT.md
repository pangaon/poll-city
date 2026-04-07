# Agent 1 Report: API Routes Missing Session Validation
Generated: 2026-04-07

## Routes Missing Auth

### Potentially Sensitive — No Session Validation
- `src/app/api/officials/[id]/sentiment/route.ts` (POST) — accepts sentiment signals with no auth, only rate limiting. Could allow anonymous vote-stuffing of approval scores.
- `src/app/api/maps/ward-boundary/route.ts` (GET) — exposes campaign contact geo data (ward/riding boundaries + contact info via GeoDistrict) with no auth.
- `src/app/api/adoni/train/route.ts` (GET) — the GET handler returns Adoni training state with no auth. POST is protected.
- `src/app/api/help/articles/[slug]/feedback/route.ts` (POST) — accepts feedback writes with no auth or rate limiting.

### Intentionally Public — Rate-Limited or Captcha-Protected
- `src/app/api/officials/route.ts` (GET) — public official directory, rate-limited
- `src/app/api/officials/[id]/route.ts` (GET) — public official detail, rate-limited
- `src/app/api/officials/directory/route.ts` (GET) — public official directory with pagination, rate-limited
- `src/app/api/officials/approval/trending/route.ts` (GET) — public trending data, rate-limited
- `src/app/api/officials/approval/leaderboard/route.ts` (GET) — public leaderboard, rate-limited
- `src/app/api/officials/[id]/approval/route.ts` (GET) — public approval score, rate-limited
- `src/app/api/geo/route.ts` (GET) — public rep lookup by postal/address, rate-limited
- `src/app/api/public/candidates/[slug]/route.ts` (GET) — public candidate page data
- `src/app/api/public/candidates/[slug]/volunteer/route.ts` (POST) — public form, captcha + rate-limited
- `src/app/api/public/candidates/[slug]/question/route.ts` (POST) — public form, captcha + rate-limited
- `src/app/api/public/candidates/[slug]/sign-request/route.ts` (POST) — public form, captcha + rate-limited
- `src/app/api/public/candidates/[slug]/support/route.ts` (POST) — public form, captcha + rate-limited
- `src/app/api/public/candidates/[slug]/events/route.ts` (GET) — public events, rate-limited
- `src/app/api/public/candidates/[slug]/donate/route.ts` (POST) — public donation via Stripe, rate-limited
- `src/app/api/public/events/[eventId]/rsvp/route.ts` (POST) — public RSVP, captcha + rate-limited
- `src/app/api/polls/[id]/respond/route.ts` (GET, POST) — public/anonymous voting by design, rate-limited
- `src/app/api/polls/verify-receipt/route.ts` (GET) — public receipt verification, rate-limited

### Static / Health / Reference — Auth Not Expected
- `src/app/api/health/route.ts` (GET) — health check endpoint
- `src/app/api/resources/templates/route.ts` (GET) — static template list
- `src/app/api/resources/templates/[slug]/route.ts` (GET, HEAD) — downloadable template files
- `src/app/api/print/templates/route.ts` (GET) — print template catalog
- `src/app/api/help/articles/route.ts` (GET) — public help articles
- `src/app/api/help/articles/[slug]/route.ts` (GET) — public help article detail
- `src/app/api/help/search/route.ts` (GET) — public help search

### Webhook — Secret-Based Auth (Not Session)
- `src/app/api/voice/webhook/route.ts` (POST) — Twilio status callback, no auth (relies on Twilio calling convention)
- `src/app/api/call-center/webhook/[secret]/route.ts` (POST) — webhook secret in URL path

## Summary
4 of 107 route handlers have potentially missing auth that warrants review.
28 routes are intentionally public (rate-limited, captcha-protected, or static).
75 routes have proper session validation via apiAuth, apiAuthWithPermission, CRON_SECRET, or validateDebugAccess.
