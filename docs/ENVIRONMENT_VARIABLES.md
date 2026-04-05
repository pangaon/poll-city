# Poll City Environment Variables

All environment variables used by Poll City. Required vars must be set or the app will refuse to boot in production.

## Required (production startup)

| Variable | Purpose | How to obtain |
|---|---|---|
| `NEXTAUTH_SECRET` | Signs NextAuth JWTs. Rotating invalidates all sessions. | `openssl rand -base64 32` |
| `DATABASE_URL` | PostgreSQL connection string (Prisma). | Railway / Supabase / RDS dashboard |
| `NEXTAUTH_URL` | Public base URL of the deployment. | e.g. `https://poll.city` |

## Optional (feature flags — will warn at startup if missing)

| Variable | Feature disabled when missing |
|---|---|
| `ANTHROPIC_API_KEY` | Adoni AI assistant, AI creator, daily briefings |
| `RESEND_API_KEY` | Transactional email (password reset, claim, cron briefings) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | SMS sending |
| `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push notifications |
| `POLL_ANONYMITY_SALT` | Anonymous poll vote hashing (required for anti-fraud) |
| `IP_HASH_SALT` | Anonymous poll IP hashing (required for anti-fraud) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing / subscriptions / print escrow |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Bot protection on public forms (fails closed in production) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting (upstash.com) |
| `CRON_SECRET` | Vercel cron auth header — required for scheduled jobs |
| `HEALTH_CHECK_SECRET` | Internal health diagnostics header (`x-health-secret`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth sign-in |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` | Apple OAuth sign-in |

## Security notes

- Never commit `.env`, `.env.local`, or any file containing secrets.
- Rotate `NEXTAUTH_SECRET` immediately if the environment is ever compromised. All users will have to log in again.
- `POLL_ANONYMITY_SALT` and `IP_HASH_SALT` must be **different** random strings. Rotating them disconnects prior anonymous responses from their hashed identities, which is the desired property in a privacy incident.
- `CRON_SECRET` should be long (32+ bytes). Cron endpoints verify the `Authorization: Bearer <CRON_SECRET>` header.

## Startup validation

`src/lib/env-check.ts` runs at auth-options module load. Missing required vars throw in production. Missing optional vars print a warning listing each feature that is disabled.
