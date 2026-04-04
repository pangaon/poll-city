# Migration Plan

## Phase 1 → Phase 2: From One App to Split Apps

### Trigger Conditions

Do not migrate until ALL of the following are true:
- [ ] Phase 1 is deployed and live-tested
- [ ] At least one campaign is actively using it
- [ ] The consent bridge is fully implemented and tested
- [ ] Rate limiting is implemented (Phase 1 prerequisite for commercial)
- [ ] The team can support two separate CI/CD pipelines

---

## Step 1: Set Up Monorepo Workspace

Current structure is a single Next.js app. Migration converts it to a pnpm workspace.

```bash
# At repo root
npm install -g pnpm

# Initialize workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Move current app into apps/admin-web
mkdir -p apps/admin-web
mv src apps/admin-web/
mv public apps/admin-web/
mv next.config.js apps/admin-web/
mv tailwind.config.ts apps/admin-web/
mv tsconfig.json apps/admin-web/
mv jest.config.ts apps/admin-web/
mv postcss.config.js apps/admin-web/
# Keep prisma/ at root — shared by all apps
# Keep package.json at root — workspace root
```

**Risk:** Moving files breaks the existing Vercel deployment if done without updating the Vercel project root.
**Mitigation:** Update Vercel → Settings → Root Directory to `apps/admin-web` before deploying.

---

## Step 2: Extract Shared Packages

Extract shared code into `packages/` one package at a time. Do not extract everything at once.

**Order (safest first):**

1. `packages/types` — TypeScript interfaces and enums (no runtime code)
2. `packages/config` — env validation and constants
3. `packages/auth` — NextAuth config and session helpers
4. `packages/db` — Prisma client singleton
5. `packages/permissions` — policy-check helpers
6. `packages/api-contracts` — DTO types
7. `packages/ui` — shared UI components

Each package gets its own `package.json` with a name like `@poll-city/types`.

```json
{
  "name": "@poll-city/types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts"
}
```

**Risk at each extraction:** Import paths break across the app.
**Mitigation:** Run `npm run typecheck` after each extraction before moving to the next.

---

## Step 3: Create apps/social-web

Social app is currently `apps/admin-web/src/app/social/*`. Extract it.

```bash
mkdir -p apps/social-web/src/app
cp -r apps/admin-web/src/app/social/* apps/social-web/src/app/
# Copy layout, login shared components
# Update imports to use @poll-city/* packages
# Remove all /(app)/* imports from social-web
```

**Breaking change:** Social app must NEVER import from `packages/db` directly. It calls the API layer only.

**Test:** Build social-web in isolation. It must compile with zero imports from admin-web.

---

## Step 4: Verify Product Boundary

After extraction, run this audit:

```bash
# social-web must have zero imports of campaign-private models
grep -r "from.*packages/db" apps/social-web/src/ | grep -v "node_modules"
# Must return empty

# social-web must have zero imports of /(app) routes
grep -r "from.*admin-web" apps/social-web/src/
# Must return empty
```

---

## Step 5: Separate Vercel Deployments

```bash
# Create two Vercel projects (same org, same GitHub repo)
# Project 1: poll-city-admin
#   Root directory: apps/admin-web
#   Build command: pnpm build
#
# Project 2: poll-city-social
#   Root directory: apps/social-web
#   Build command: pnpm build

# Both share DATABASE_URL and NEXTAUTH_SECRET
# NEXTAUTH_URL differs per project
```

---

## Prisma Schema Migration (db push → migrate)

This must happen before Phase 2. Currently using `db push` with no migration history.

```bash
# Generate baseline migration from current schema (run against production DB)
npx prisma migrate dev --name init_baseline

# This creates:
# prisma/migrations/[timestamp]_init_baseline/migration.sql

# From now on, schema changes use:
npx prisma migrate dev --name [descriptive_name]

# In production CI/CD:
npx prisma migrate deploy
```

**Why this matters:** Without migration history, rollback is impossible and schema drift is hard to detect.

---

## User Impact During Migration

Users will not notice the split if:
1. URLs stay the same during migration (temporary redirect rules)
2. Sessions remain valid (same NEXTAUTH_SECRET)
3. The database is not modified during migration
4. Deployment is done with zero-downtime (Vercel handles this)

**What might break:**
- Any hardcoded absolute URLs pointing to the old single deployment
- Any bookmarks to internal admin routes (if admin moves to admin.pollcity.com)

**Mitigation:** Redirect rules at DNS/Vercel level. Old URLs redirect to new URLs for 90 days.

---

## Rollback Plan for Migration

If the split breaks something:

1. Revert `apps/admin-web` to the pre-split structure (git revert)
2. Update Vercel root directory back to repo root
3. Deploy the reverted version
4. Database is untouched — no rollback needed there

The database migration (db push → migrate) is the irreversible step. Take a full database backup before running it.
