# 🗳️ Poll City

**Campaign operations platform + civic engagement app**

Two apps, one codebase:
- **Poll City** — Campaign ops for teams (canvassing, voter CRM, tasks, AI assist)
- **Poll City Social** — Public civic engagement (polling, representatives, support signals)

---

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (local or managed)
- npm or yarn

### 1. Clone and install

```bash
git clone <your-repo-url>
cd poll-city
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/pollcity"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secret:
```bash
openssl rand -base64 32
```

### 3. Create the database

```bash
# Create the database (if local Postgres)
createdb pollcity

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 4. Seed demo data

```bash
npm run db:seed
```

This creates:
- 4 users (admin, manager, volunteer, public voter)
- 1 campaign (Ward 12 — City Council 2026)
- 10 contacts with interactions, tasks, signs
- 3 officials (municipal, provincial, federal)
- 3 active polls with responses
- Geo districts, support signals, volunteer profiles

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pollcity.dev | password123 |
| Campaign Manager | manager@pollcity.dev | password123 |
| Volunteer | volunteer@pollcity.dev | password123 |
| Public User (Social) | voter@pollcity.dev | password123 |

---

## App URLs

| URL | Description |
|-----|-------------|
| `/` | Redirects to dashboard or login |
| `/login` | Authentication |
| `/dashboard` | Campaign dashboard |
| `/contacts` | Voter CRM |
| `/contacts/[id]` | Contact detail + interaction log |
| `/canvassing` | Walk lists + volunteer assignment |
| `/tasks` | Task manager |
| `/import-export` | CSV import/export |
| `/ai-assist` | AI campaign assistant |
| `/settings` | Profile + campaign settings |
| `/social` | Poll City Social (public civic app) |
| `/social/officials` | Representative finder |
| `/social/polls` | Live polling interface |

---

## Enable AI Assist

Add to `.env.local`:

```env
# Option A: Anthropic (Claude)
AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."

# Option B: OpenAI
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
```

Without a key, AI Assist runs in **demo mode** with realistic mock responses — fully functional for testing.

---

## Database Commands

```bash
npm run db:migrate       # Run pending migrations
npm run db:generate      # Regenerate Prisma client
npm run db:seed          # Seed demo data
npm run db:studio        # Open Prisma Studio (visual DB browser)
npm run db:reset         # Drop + remigrate + reseed (destructive!)
```

---

## Testing

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run typecheck        # TypeScript type check
```

Tests cover: validators, utilities, pagination logic, CSV generation.

---

## Project Structure

```
poll-city/
├── prisma/
│   ├── schema.prisma        # Full data model (22 models)
│   └── seed.ts              # Demo data
├── src/
│   ├── app/
│   │   ├── (app)/           # Campaign ops (authenticated)
│   │   │   ├── dashboard/
│   │   │   ├── contacts/
│   │   │   ├── canvassing/
│   │   │   ├── tasks/
│   │   │   ├── import-export/
│   │   │   ├── ai-assist/
│   │   │   └── settings/
│   │   ├── social/          # Poll City Social (public PWA)
│   │   │   ├── page.tsx     # Discover (postal code → reps + polls)
│   │   │   ├── officials/   # Representative finder
│   │   │   └── polls/       # Live polling
│   │   ├── api/             # All API routes
│   │   │   ├── auth/
│   │   │   ├── contacts/
│   │   │   ├── interactions/
│   │   │   ├── tasks/
│   │   │   ├── campaigns/
│   │   │   ├── canvass/
│   │   │   ├── officials/
│   │   │   ├── polls/
│   │   │   ├── import-export/
│   │   │   ├── ai-assist/
│   │   │   └── social/
│   │   └── login/
│   ├── components/
│   │   ├── layout/          # Sidebar, TopBar
│   │   ├── ui/              # Shared UI primitives
│   │   └── social/          # Social app components
│   ├── lib/
│   │   ├── auth/            # NextAuth config + helpers
│   │   ├── db/              # Prisma singleton
│   │   ├── utils/           # Shared utilities
│   │   ├── validators/      # Zod schemas
│   │   └── ai/              # AI provider abstraction
│   ├── types/               # Global TypeScript types
│   └── middleware.ts        # Auth route protection
```

---

## Data Model Summary

| Model | Purpose |
|-------|---------|
| User | Auth + both apps |
| Campaign | Campaign container |
| Membership | User ↔ Campaign roles |
| Contact | Voter/contact record |
| Household | Address grouping |
| Tag / ContactTag | Contact labels |
| Interaction | Door knock / call / note logs |
| CanvassList | Walk list |
| CanvassAssignment | Volunteer → list |
| Task | Follow-up actions |
| Sign | Lawn sign tracking |
| VolunteerProfile | Volunteer availability |
| Official | Elected representatives |
| OfficialFollow | User → official |
| Poll | Polling questions |
| PollOption | Multiple choice options |
| PollResponse | Individual votes |
| GeoDistrict | Postal code → ward/riding |
| SupportSignal | Public support signals |
| PublicQuestion | Voter → official Q&A |
| Notification | User notifications |
| ServiceProvider / Booking | Marketplace (Phase 3) |
| ActivityLog | Audit trail |

---

## Deployment

### Vercel + Supabase (recommended for speed)

1. **Supabase**: Create project → copy connection string → add `?pgbouncer=true&connection_limit=1` suffix
2. **Vercel**: Import repo → add environment variables → deploy
3. **Post-deploy**: Run `npx prisma migrate deploy` and seed

### Railway (easiest all-in-one)

1. New project → Add PostgreSQL service
2. Add Node.js service → point to repo
3. Set env vars in Railway dashboard
4. Deploy

### Docker (self-hosted)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci && npx prisma generate && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables (production)

```env
DATABASE_URL=           # PostgreSQL connection string
NEXTAUTH_SECRET=        # 32+ char random string
NEXTAUTH_URL=           # Your production URL (https://yourdomain.com)
ANTHROPIC_API_KEY=      # Optional: enables live AI
OPENAI_API_KEY=         # Optional: alternative AI provider
```

---

## Roadmap

### Phase 2 (Next)
- [ ] Sign tracking map view
- [ ] Volunteer scheduling system
- [ ] SMS/email messaging integration
- [ ] Multi-campaign switcher UI

### Phase 3
- [ ] Campaign services marketplace
- [ ] Print/design template system
- [ ] AI voter matching engine
- [ ] Advanced analytics dashboard
- [ ] Official profile claiming flow

---

## API Documentation

See [`API.md`](./API.md) for full endpoint reference.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js (credentials) |
| Validation | Zod |
| Forms | React Hook Form |
| AI | Anthropic / OpenAI (abstracted) |
| CSV | PapaParse |
| Notifications | Sonner |
| Testing | Jest + ts-jest |

---

*Poll City v0.1.0 — Built for campaigns that win.*
