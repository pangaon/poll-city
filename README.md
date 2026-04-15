# Poll City

Enterprise SaaS campaign platform + public civic engagement app for Canadian elections.

## Products

| Product | URL | Audience |
|---|---|---|
| Campaign Platform | app.poll.city | Campaign managers, staff, volunteers |
| Poll City Social | social.poll.city | General public, voters |
| Poll City Print | print.poll.city | Campaign print ordering |
| Marketing Site | poll.city | Prospects, leads |

Design reference: "Stripe + Linear + NationBuilder + Meta Ads Manager combined."

---

## Tech Stack

| Tool | Version |
|---|---|
| Next.js | 14.2.5 (App Router) |
| React | 18 |
| TypeScript | 5 (strict) |
| Tailwind CSS | 3.4.1 |
| Prisma | 5.15.0 |
| PostgreSQL | Railway |
| next-auth | 4.24.7 |
| framer-motion | 12.38.0 |
| recharts | 3.8.1 |
| lucide-react | 0.395.0 |
| react-hook-form | 7.52.0 |
| @dnd-kit/core | 6.3.1 |
| zod | 3.23.8 |

---

## Quick Start

```bash
git clone <repo>
cd poll-city
npm install
cp .env.example .env.local
# Fill in .env.local (see GEORGE_TODO.md for Railway + Vercel vars)
npx prisma migrate dev
npm run db:seed
npm run dev
```

---

## Canadian Context

- Federal election: April 2026
- Municipal target: October 2026 (Ontario)
- Demo riding: Riding 42 — Parkdale–High Park
- Demo ward: Ward 20 — Scarborough Southwest
- Parties: LIB / CON / NDP / BQ / GRN

---

## Docs

| File | Purpose |
|---|---|
| FIGMA.md | Master context — read every session |
| CLAUDE.md | Agent standing orders — non-negotiable rules |
| COMPONENTS.md | Component library reference |
| ROUTES.md | Full route map (100+ routes) |
| DEPENDENCIES.md | Package reference |
| SPECIFICATIONS.md | Spec index |
| QUICK_START.md | Dev orientation |
| CONNECTIONS.md | Module connection map |
| WORK_QUEUE.md | Session coordination — claim tasks here |
| GEORGE_TODO.md | Manual steps only George can do |

---

## Architecture

Single Next.js monolith. One Vercel project. One Railway PostgreSQL.

- Multi-tenant: every DB query scoped by `campaignId`
- Soft deletes: Contact, Task, Sign, Donation, VolunteerProfile always have `deletedAt`
- Auth: `apiAuth(req)` for API routes, `getServerSession(authOptions)` for server components
- All user input validated with Zod at API boundaries

---

## Commands

```bash
npm run build              # Production build — must exit 0 before push
npx tsc --noEmit           # Type check
npm run dev                # Dev server
npm test                   # Test suite
npx prisma migrate dev     # Run DB migration
npm run db:studio          # Prisma GUI
npm run db:seed            # Seed demo data
npm run push:safe          # Build check + push
```

---

## Deployment

- Frontend: Vercel (auto-deploy on push to main)
- Database: Railway (PostgreSQL)
- Files: Vercel Blob
- Email: Resend
- SMS: Twilio
- Payments: Stripe

See GEORGE_TODO.md for environment variable setup.

---

Poll City — Maria T. Chen for Parkdale–High Park — Canadian Elections 2026
