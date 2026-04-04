# Deployment Plan

## Phase 1 — Single App Deploy (Current)

### Architecture
```
One GitHub repo
One Next.js 14 app
One Vercel deployment
One PostgreSQL database (Railway)
```

### Environment Variables (all required)

| Variable | What it does | Where to get it |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Railway → Postgres service → Variables |
| `NEXTAUTH_SECRET` | Encrypts session JWTs | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full app URL for OAuth callbacks | Your Vercel deployment URL |
| `NEXT_PUBLIC_APP_NAME` | Display name | Set to: `Poll City` |
| `NEXT_PUBLIC_APP_URL` | Public URL for links | Same as `NEXTAUTH_URL` |
| `IP_HASH_SALT` | One-way IP hashing for poll rate limiting | `openssl rand -base64 16` |
| `ANTHROPIC_API_KEY` | AI assist (optional) | console.anthropic.com |

### Deploy Command Sequence (exact order)

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:indexes    # REQUIRED — creates partial unique indexes for poll vote protection
npm run db:seed       # Creates demo users, campaign, officials, polls
npm run build         # Must exit 0
```

### Vercel Configuration
- Framework: Next.js (auto-detected)
- Build command: `npm run build` (default)
- Output directory: `.next` (default)
- Node.js version: 18.x or higher
- All env vars entered in Vercel → Settings → Environment Variables

### Database Index Verification (run after db:indexes)
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'poll_responses';

-- Must see:
-- poll_responses_single_vote_uniq
-- poll_responses_swipe_vote_uniq
```

### Post-Deploy Smoke Test
1. Login page appears at root URL
2. Login with admin@pollcity.dev / password123
3. Dashboard loads with real numbers
4. /social loads without login and shows postal code input
5. /api/geo?postalCode=M4C returns district data (no auth)

---

## Phase 2 — Separated Frontends, Shared Backend

### Architecture
```
One GitHub monorepo (pnpm workspaces)
Two Next.js apps
Two Vercel deployments
One PostgreSQL database (shared)
Shared packages (published via workspace)
```

### Domains
| App | Domain |
|---|---|
| Poll City Admin | admin.pollcity.com |
| Poll City Social | pollcity.com |
| Shared API | Served by admin.pollcity.com/api or dedicated API service |

### Directory Structure
```
/
├── apps/
│   ├── admin-web/          ← Poll City Admin (Next.js)
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env.local
│   │
│   ├── social-web/         ← Poll City Social (Next.js)
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env.local
│   │
│   └── print-web/          ← Poll City Print (future)
│
├── packages/
│   ├── auth/               ← Shared NextAuth config
│   ├── db/                 ← Prisma client + schema
│   ├── types/              ← Shared TypeScript types
│   ├── permissions/        ← Policy-check helpers
│   ├── api-contracts/      ← DTO definitions
│   ├── ui/                 ← Shared UI components
│   ├── events/             ← Bridge event types
│   ├── config/             ← Env validation
│   ├── maps/               ← GIS utilities
│   └── print-core/         ← Print order logic
│
├── prisma/                 ← Schema lives here (shared)
│   ├── schema.prisma
│   ├── seed.ts
│   └── setup-indexes.sql
│
└── package.json            ← Workspace root
```

### Phase 2 Deploy Sequence
```bash
# From workspace root
pnpm install

# Database (run once)
pnpm db:push
pnpm db:indexes
pnpm db:seed

# Build both apps
pnpm --filter admin-web build
pnpm --filter social-web build

# Deploy to Vercel (separate projects, same org)
vercel deploy apps/admin-web --prod
vercel deploy apps/social-web --prod
```

### Environment Variables — Phase 2

Both apps share DATABASE_URL and NEXTAUTH_SECRET.
NEXTAUTH_URL differs per app.

| Variable | admin-web | social-web |
|---|---|---|
| DATABASE_URL | Same connection string | Same connection string |
| NEXTAUTH_SECRET | Same value | Same value |
| NEXTAUTH_URL | https://admin.pollcity.com | https://pollcity.com |
| NEXT_PUBLIC_APP_NAME | Poll City Admin | Poll City |
| IP_HASH_SALT | Same value | Same value |

---

## Phase 3 — Enterprise / Dedicated Instance

### For high-value campaigns requiring data isolation:

```
Dedicated PostgreSQL instance
Dedicated Vercel deployment (or AWS/GCP)
Separate domain: [campaign].pollcity.com or [campaign].com
Separate DATABASE_URL pointing to dedicated DB
Separate NEXTAUTH_SECRET for session isolation
```

### Migration from shared to dedicated
1. Export all campaign data via data export tool (not yet built)
2. Import into fresh dedicated database
3. Run schema + indexes + seed
4. Update DNS to point campaign domain to new deployment
5. Notify campaign team of new URL

---

## Rollback Plan

If a deployment breaks:

```bash
# Vercel: instant rollback via dashboard
# Vercel UI → Deployments → Find previous → Promote to Production

# Database: schema rollback not yet supported (no migrations)
# Prevention: always test npm run build locally before pushing
# Prevention: run typecheck before pushing: npm run typecheck
```

### Migration note
The project currently uses `prisma db push` (no migration history).
Before Phase 2, switch to `prisma migrate`:

```bash
# One-time: create baseline migration from current schema
npx prisma migrate dev --name init

# After: all schema changes use
npx prisma migrate dev --name [descriptive_name]
npx prisma migrate deploy   # in CI/CD
```

This gives: rollback capability, migration history, audit of schema changes.

---

## Secrets Management

### Phase 1
- All secrets in Vercel environment variables
- `.env.local` for local development only (gitignored)
- Never commit secrets to git

### Phase 2+
- Consider Vercel env var groups to sync across deployments
- Consider AWS Secrets Manager or Doppler for team secret management
- Rotate NEXTAUTH_SECRET and IP_HASH_SALT on security incidents
- DATABASE_URL rotation requires: update Vercel env var → redeploy

### Gitignore rules (must remain in .gitignore)
```
.env
.env.local
.env.production
.env.*.local
node_modules/
.next/
```
