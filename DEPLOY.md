# Poll City — Deployment Guide
## From zip to live URL in ~15 minutes

---

## Step 1: Unzip and push to GitHub

```bash
# Unzip the package
unzip poll-city-mvp-custom-fields.zip
cd poll-city

# Initialize git
git init
git add .
git commit -m "feat: Poll City MVP initial commit"

# Create a new private repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/poll-city.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create a PostgreSQL database

**Option A: Railway (recommended — easiest)**
1. Go to [railway.app](https://railway.app) → New Project → Add PostgreSQL
2. Click your Postgres service → Variables → Copy `DATABASE_URL`

**Option B: Supabase**
1. Go to [supabase.com](https://supabase.com) → New Project
2. Settings → Database → Connection String → URI mode
3. Copy the URL, add `?pgbouncer=true&connection_limit=1` to the end

**Option C: Neon (serverless, free tier)**
1. Go to [neon.tech](https://neon.tech) → New Project
2. Copy the connection string

---

## Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Add these environment variables:

```
DATABASE_URL          = (paste your postgres URL from Step 2)
NEXTAUTH_SECRET       = (run: openssl rand -base64 32)
NEXTAUTH_URL          = https://your-project.vercel.app
```

5. Click **Deploy**

---

## Step 4: Run migrations and seed

After deploy completes, open Vercel → your project → Settings → Functions (or use Vercel CLI):

**Via Vercel CLI:**
```bash
npm install -g vercel
vercel login
vercel env pull .env.local   # pulls your env vars locally

# Run migrations against production DB
DATABASE_URL="your-prod-url" npx prisma migrate deploy

# Seed demo data
DATABASE_URL="your-prod-url" npx tsx prisma/seed.ts
```

**Or via Railway CLI (if using Railway):**
```bash
railway run npx prisma migrate deploy
railway run npx tsx prisma/seed.ts
```

---

## Step 5: Verify the live app

Open your Vercel URL and test:

| Route | What to check |
|-------|--------------|
| `/login` | Login form loads, no errors |
| `admin@pollcity.dev` / `password123` | Auth works, redirects to dashboard |
| `/dashboard` | Stats show real numbers (10 contacts, etc.) |
| `/contacts` | Contact list loads, search works |
| `/contacts/[id]` | Contact detail loads with interactions |
| `/canvassing` | Canvass lists show |
| `/canvassing/walk` | Household walk list renders |
| `/tasks` | Task list loads |
| `/import-export` | CSV export downloads |
| `/ai-assist` | AI panel loads (mock mode banner shows) |
| `/settings` | Settings page loads |
| `/settings/fields` | Field config loads |
| `/social` | Social landing page loads |
| `/social/officials` | Officials list loads |
| `/social/polls` | Polls list loads |

---

## Optional: Enable live AI

Add to Vercel environment variables:
```
ANTHROPIC_API_KEY = sk-ant-...
```
Or:
```
OPENAI_API_KEY = sk-...
```

Redeploy. The "Demo mode" banner on AI Assist will disappear.

---

## Local development

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Edit .env.local with your local postgres URL and secrets

# Run migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Start dev server
npm run dev
# Open http://localhost:3000
```

---

## Demo accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pollcity.dev | password123 |
| Manager | manager@pollcity.dev | password123 |
| Volunteer | volunteer@pollcity.dev | password123 |
| Public (Social) | voter@pollcity.dev | password123 |

---

## Troubleshooting

**"Prisma Client not generated"**
```bash
npx prisma generate
```

**"Cannot find module @prisma/client"**
```bash
npm install && npx prisma generate
```

**Database connection error on Vercel**
- Add `?sslmode=require` to your DATABASE_URL if using Railway
- Add `?pgbouncer=true&connection_limit=1` if using Supabase

**Empty pages after seed**
- Check that `NEXTAUTH_URL` matches your actual Vercel URL exactly
- Check Vercel function logs for API errors
