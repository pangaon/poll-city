# QUICK_START.md — Poll City Fast Orientation

> For AI agents: read FIGMA.md first. This file is a quick-reference companion.
> For human devs: this gets you running in under 5 minutes.

---

## Read In This Order (Every Session)

1. **FIGMA.md** — master context, tech stack, routes, design system (always first)
2. **CLAUDE.md** — agent standing orders and quality gates (non-negotiable rules)
3. **COMPONENTS.md** — what components exist before building new ones
4. **SPECIFICATIONS.md** — spec index, links to architecture docs
5. **ROUTES.md** — full route map before adding or modifying routes
6. **DEPENDENCIES.md** — packages before running npm install

---

## Key Files

| File | When to open it |
|---|---|
| src/app/(app)/[module]/page.tsx | Every new feature — check auth pattern |
| src/components/layout/sidebar.tsx | Adding a new route to navigation |
| prisma/schema.prisma | Before any database work |
| src/lib/auth/helpers.ts | API route auth (apiAuth) |
| src/lib/api/errors.ts | Error response format |
| CLAUDE.md | When unsure about any rule |
| CONNECTIONS.md | Before touching Contact/Donation/Task/Event/Sign data |

---

## Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build — MUST exit 0 before every push
npx tsc --noEmit     # TypeScript check (not a substitute for build)
npm run db:generate  # Re-generate Prisma client after schema changes
npm run db:migrate   # Run new migration: npx prisma migrate dev --name <desc>
npm run db:studio    # Prisma Studio GUI
npm run db:seed      # Seed demo data
npm test             # Run test suite
```

---

## Party Colours

| Party | Hex | Tailwind |
|---|---|---|
| LIB | #dc2626 | red-600 |
| CON | #2563eb | blue-600 |
| NDP | #ea580c | orange-600 |
| BQ | #06b6d4 | cyan-500 |
| GRN | #16a34a | green-700 |

---

## Most-Used Imports

```tsx
// Navigation (Next.js — NOT react-router)
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { redirect } from "next/navigation";

// Auth
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { apiAuth } from "@/lib/auth/helpers";

// Database
import { prisma } from "@/lib/db/prisma";

// Icons
import { Search, ChevronRight, Users, BarChart3 } from 'lucide-react';

// Animation
import { motion, AnimatePresence } from 'framer-motion';

// Charts
import { LineChart, Line, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Toasts
import { toast } from 'sonner';

// Styling
import { cn } from "@/lib/utils";

// Errors
import { apiError, notFound, forbidden } from "@/lib/api/errors";

// AI safety
import { sanitizePrompt } from "@/lib/ai/sanitize-prompt";
```

---

## Rules (Critical)

```
DO:
- npm run build exits 0 before every push — no exceptions
- Read files before editing them
- Scope every DB query by campaignId
- Filter deletedAt: null on Contact/Task/Sign/Donation/VolunteerProfile
- Use apiAuth(req) for API routes
- Use getServerSession(authOptions) for server components
- Validate all input with Zod at API boundaries
- Use framer-motion for animations
- Use lucide-react for icons
- Use recharts for charts
- Use Canadian 2026 data in all mocks

DON'T:
- Push without a green build
- Use any in TypeScript (use unknown + narrowing)
- Log raw error objects to the client
- Skip rate limiting on public routes
- Hard-delete Contact/Task/Sign/Donation/VolunteerProfile records
- Use npm or yarn commands — use npm (not pnpm)
- Return cross-campaign data
- Use US political references
- Add new packages without checking package.json first
```

---

## Canadian Context Quick-Ref

| Item | Value |
|---|---|
| Federal election | April 2026 |
| Municipal target | October 2026 (Ontario) |
| Demo riding | Riding 42 — Parkdale–High Park |
| Demo ward | Ward 20 — Scarborough Southwest |
| Demo candidate | Maria T. Chen (LIB) — federal |
| City | Toronto |
| Area codes | 416 / 647 |
| Date format | April 12, 2026 |
| Currency | CAD ($) |

---

## Active Build Queue (as of April 15, 2026)

Check WORK_QUEUE.md for the live task list (claimed/done/pending).

Current build priorities:
1. Signs module — signs-client.tsx (in progress, modified)
2. Voter file import enrichment — smart-import
3. Print walk list enrichment — context-aware, assignment-linked
4. Email open/click tracking — pixel + redirect routes
5. Mobile app — mobile/ directory (serves all roles: CMs + canvassers + scrutineers)

---

## Adding a New Feature (Step-by-Step)

1. Check WORK_QUEUE.md — claim the task before starting
2. Read CONNECTIONS.md — understand what the feature connects to
3. Create `src/app/(app)/[feature]/page.tsx` (server component, handles auth)
4. Create `src/app/(app)/[feature]/[feature]-client.tsx` (client component, handles UI)
5. Create API route at `src/app/api/[feature]/route.ts` (use `apiAuth`, scope by `campaignId`)
6. Add Zod validation at the API boundary
7. Add to sidebar in `src/components/layout/sidebar.tsx`
8. If DB changes needed: `npx prisma migrate dev --name [description]`
9. Update CONNECTIONS.md
10. Run `npm run build` — must exit 0
11. Commit and push

---

## Conflict Resolution

MASTER_CLAUDE.md (Figma Make prototype) says things that conflict with this repo:

| Topic | MASTER_CLAUDE.md | This codebase |
|---|---|---|
| Framework | Vite 6 | Next.js 14.2.5 |
| Package manager | pnpm | npm |
| Animation | motion/react | framer-motion |
| CSS version | Tailwind v4 | Tailwind v3.4.1 |
| Routing | react-router v7 | Next.js App Router |
| Drag & drop | react-dnd | @dnd-kit/core |

**The codebase wins on all conflicts.** FIGMA.md Section 18 has the full list.
