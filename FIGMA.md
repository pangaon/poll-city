# FIGMA.md — Poll City: Project Context & Source of Truth

Read before touching anything. Live state as of April 15, 2026.

> **Conflict note:** MASTER_CLAUDE.md describes a Figma Make prototype (Vite + React Router v7 + pnpm).
> This file reflects the **actual production codebase**: Next.js 14 + Prisma + npm.
> The codebase wins on all conflicts. See Section 18 for the full diff.

---

## 1. What This Is

Poll City is an enterprise SaaS political campaign ecosystem for Canadian municipal and federal elections.

| Product | URL | Audience |
|---|---|---|
| Poll City (Campaign Platform) | app.poll.city | Campaign managers, staff, volunteers |
| Poll City Social | social.poll.city | General public, voters |
| Poll City Print | print.poll.city | Campaign print ordering |
| Marketing Site | poll.city | Prospects, leads |
| Ops Console | app.poll.city/ops | George (founder/SUPER_ADMIN only) |

Design reference: "Stripe + Linear + NationBuilder + Meta Ads Manager combined."

---

## 2. Tech Stack (Locked)

| Tool | Version | Notes |
|---|---|---|
| Next.js | 14.2.5 | App Router — NOT Vite or react-router |
| React | 18 | UI framework |
| TypeScript | 5 | Strict mode |
| Tailwind CSS | 3.4.1 | Uses tailwind.config.js — NOT v4 |
| Prisma | 5.15.0 | ORM — PostgreSQL on Railway |
| next-auth | 4.24.7 | Authentication |
| npm | — | Package manager — NOT pnpm |
| framer-motion | 12.38.0 | Animation — NOT 'motion/react' |
| recharts | 3.8.1 | Charts only |
| lucide-react | 0.395.0 | Icons only |
| react-hook-form | 7.52.0 | Must be this exact version |
| @dnd-kit/core | 6.3.1 | Drag & drop — NOT react-dnd |
| date-fns | 3.6.0 | Date utilities |
| sonner | 1.5.0 | Toasts |
| zod | 3.23.8 | Schema validation |
| leaflet + react-leaflet | 1.9.4 / 4.2.1 | Maps |
| @turf/turf | 7.3.4 | GIS / geospatial calculations |
| stripe | 22.0.0 | Payments |
| twilio | 5.13.1 | SMS |
| resend | 6.10.0 | Email delivery |
| @vercel/blob | 2.3.3 | File storage |
| @upstash/ratelimit | 2.0.8 | Rate limiting |
| papaparse | 5.4.1 | CSV parsing |
| xlsx | 0.18.5 | Excel/XLSX parsing |

---

## 3. Project File Structure

```
/
├── src/
│   ├── app/
│   │   ├── layout.tsx                   ← Root layout
│   │   ├── (app)/                       ← Authenticated campaign app (30+ modules)
│   │   │   ├── layout.tsx               ← App shell (sidebar + topbar)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── contacts/page.tsx
│   │   │   ├── canvassing/page.tsx
│   │   │   ├── field-ops/page.tsx
│   │   │   ├── field/                   ← Field sub-modules
│   │   │   ├── finance/                 ← Finance Command suite
│   │   │   ├── communications/
│   │   │   ├── signs/page.tsx
│   │   │   ├── polls/
│   │   │   ├── ops/                     ← SUPER_ADMIN operator console
│   │   │   └── [30+ other modules]
│   │   ├── (marketing)/                 ← Public marketing site
│   │   │   └── page.tsx
│   │   ├── (print)/                     ← Print-only layout (no sidebar)
│   │   │   └── print/walk-list/page.tsx
│   │   ├── social/                      ← Poll City Social app
│   │   │   ├── page.tsx
│   │   │   ├── polls/
│   │   │   ├── officials/
│   │   │   └── profile/
│   │   ├── api/                         ← All API routes
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── onboarding/page.tsx
│   ├── components/
│   │   ├── layout/                      ← sidebar.tsx, topbar.tsx, campaign-switcher.tsx
│   │   ├── adoni/                       ← adoni-chat.tsx, adoni-page-assist.tsx
│   │   ├── canvassing/                  ← Walk list, household card, quick capture
│   │   ├── gotv/                        ← GOTV war room, engine, maps
│   │   ├── polls/                       ← Swipe poll, live results, ticker
│   │   ├── dashboard/                   ← Stats, insight map, stage banner
│   │   ├── maps/                        ← campaign-map.tsx, turf-map.tsx
│   │   ├── onboarding/                  ← Setup wizard, campaign tour
│   │   ├── ops/                         ← QA overlay, verification, video status
│   │   ├── ui/                          ← Custom UI primitives
│   │   └── [domain components]
│   ├── lib/
│   │   ├── auth/helpers.ts              ← apiAuth(), authOptions
│   │   ├── db/prisma.ts                 ← Prisma client singleton
│   │   ├── adoni/                       ← Adoni AI knowledge base + actions
│   │   ├── api/errors.ts                ← Standardized error helpers
│   │   └── [utilities by domain]
│   └── styles/
├── prisma/
│   ├── schema.prisma                    ← Source of truth for all models
│   └── seeds/                           ← Seed scripts
├── CLAUDE.md                            ← Agent standing orders (DO NOT OVERWRITE)
├── package.json
├── next.config.js
└── tailwind.config.js
```

---

## 4. Routing Map

All routes use **Next.js App Router** (filesystem-based). There is no routes.tsx.

### Campaign App — /(app)/

**Headquarters**
```
/dashboard                  → Campaign command centre
/command-center             → Live campaign command
/alerts                     → Alerts & notifications
/contacts                   → Voter CRM
/contacts/[id]              → Contact detail
/contacts/duplicates        → Duplicate detection
/volunteers                 → Volunteer roster
/volunteers/shifts          → Shift management
/volunteers/groups          → Volunteer groups
/volunteers/expenses        → Volunteer expense tracking
/tasks                      → Kanban + task list
/calendar                   → Campaign calendar
/calendar/candidate         → Candidate schedule
```

**Field Operations**
```
/field-ops                  → Field ops command (tab hub)
/field-ops/[id]             → Assignment detail
/field-ops/map              → Field map view
/field-ops/walk             → Mobile walk mode
/field-ops/signs            → Signs field view
/canvassing                 → Canvassing hub
/canvassing/walk            → Mobile canvassing
/canvassing/turf-builder    → Turf assignment tool
/canvassing/scripts         → Door scripts
/canvassing/print-walk-list → Printable walk list
/field/programs             → Programs list
/field/programs/[programId] → Program detail
/field/routes               → Routes list
/field/routes/[routeId]     → Route detail
/field/turf                 → Turf management
/field/runs                 → Canvassing runs
/field/teams                → Field teams
/field/lit-drops            → Literature drops
/field/materials            → Field materials
/field/mobile               → Mobile dashboard
/field/follow-ups           → Follow-up queue
/field/audit                → Field audit log
/signs                      → Signs management (map + board)
/gotv                       → GOTV war room
/election-night             → Election night dashboard
/events                     → Campaign events
/polls                      → Poll builder
/polls/new                  → New poll
/polls/[id]                 → Poll detail
/polls/[id]/live            → Live results
/lookup                     → Voter lookup
/eday                       → Election day ops
```

**Finance**
```
/finance                    → Finance Command Centre
/finance/budget             → Budget management
/finance/expenses           → Expense tracking
/finance/purchase-requests  → Purchase requests
/finance/vendors            → Vendor management
/finance/reimbursements     → Reimbursements
/finance/approvals          → Approval queue
/finance/reports            → Finance reports
/finance/audit              → Finance audit log
/fundraising                → Fundraising command
/donations                  → Donations log
/billing                    → Platform billing
/budget                     → Legacy budget
```

**Communications**
```
/communications             → Email & SMS hub
/communications/email       → Email campaigns
/communications/sms         → SMS campaigns
/communications/inbox       → Unified inbox
/communications/social      → Social media manager
/notifications              → Voter outreach
/print                      → Print & design
/print/templates            → Print templates
/print/design/[slug]        → Design editor
/print/jobs                 → Print jobs
/print/jobs/new             → New job
/print/jobs/[id]            → Job detail
/print/products/[product]   → Product page
/print/inventory            → Inventory
/print/packs                → Print packs
/print/shops                → Print shop network
/print/shops/register       → Register shop
/settings/public-page       → Campaign website
```

**Analytics & Intel**
```
/analytics                  → Analytics suite + choropleth map
/reports                    → Reports
/resources                  → Resource library
/resources/ai-creator       → AI content creator
/officials                  → Elected officials (campaign view)
/media                      → Media contacts
/coalitions                 → Coalition management
/intelligence               → Opponent intelligence
```

**Settings & Admin**
```
/settings                   → Campaign settings
/settings/brand             → Brand kit
/settings/team              → Team management
/settings/security          → Security settings
/settings/fields            → Custom fields
/settings/recycle-bin       → Soft-deleted records
/import-export              → Data import/export
/import-export/smart-import → Smart CSV/XLSX import
/admin                      → Admin panel
/ai-assist                  → Ask Adoni (in-app)
/help                       → Help centre
```

**Operator Console (SUPER_ADMIN only)**
```
/ops                        → Platform overview
/ops/clients                → Client manager
/ops/campaigns              → All campaigns
/ops/security               → Security monitor
/ops/verify                 → Feature verification
/ops/videos                 → Videos & docs
/ops/content-review         → Content review
/ops/data-ops               → Data operations
/ops/demo-tokens            → Demo token manager
/ops/build                  → Build status
```

**Other App Routes**
```
/briefing                   → Daily briefing
/call-list                  → Call list
/capture                    → Quick capture
/supporters/super           → Super supporters
/widgets/[widgetId]         → Embeddable widgets
/forms/[id]                 → Custom form view
/forms/[id]/edit            → Form editor
/forms/[id]/results         → Form results
/campaigns                  → Campaign switcher
/campaigns/new              → New campaign
```

### Social App — /social/
```
/social                     → Social discovery feed
/social/polls               → Browse polls
/social/polls/[id]          → Poll detail + voting
/social/officials           → Elected officials directory
/social/officials/[id]      → Official profile
/social/profile             → User profile
/social/onboarding          → Onboarding flow
```

### Marketing Site — /(marketing)/
```
/                           → Marketing home
/pricing                    → Pricing page
/how-polling-works          → Education page
/officials                  → Public officials directory
/officials/[id]             → Official public profile
/candidates/[slug]          → Candidate public page
/calculator                 → Campaign cost calculator
/demo                       → Demo overview
/demo/candidate             → Candidate demo
/demo/media                 → Media demo
/demo/party                 → Party demo
/store/[slug]               → Campaign store
/townhall/[slug]            → Public townhall
/tv/[slug]                  → TV mode / results display
/help                       → Help articles
/help/[slug]                → Help article
/privacy, /privacy-policy   → Privacy policy
/terms                      → Terms of service
```

### Auth Routes
```
/login                      → Login
/signup                     → Signup
/onboarding                 → Campaign onboarding wizard
/2fa-verify                 → Two-factor auth
/accept-invite              → Accept team invitation
/join/[token]               → Join campaign via invite token
/reset-password             → Password reset
```

### Special & Standalone Routes
```
/canvass                    → Mobile canvassing app (no sidebar)
/f/[slug]                   → Public form (embeddable)
/f/[slug]/embed             → Form embed mode
/events/[eventId]           → Public event page
/claim/[slug]               → Claim official profile
/sentiment                  → Public sentiment
/unsubscribe                → Email unsubscribe
/verify-vote                → Vote verification
/volunteer/onboard/[token]  → Volunteer onboarding
```

### Print Layout — /(print)/
```
/print/walk-list            → Printable walk list (no sidebar)
```

---

## 5. Page Completion Status

| Module | Status | Notes |
|---|---|---|
| Marketing Home | Built | (marketing)/page.tsx |
| Dashboard | Built | Campaign command centre |
| Contacts / CRM | Built | Full voter database |
| Contact Detail | Built | /contacts/[id] |
| Canvassing | Built | Map + walk list + mobile |
| Field Ops | Built | Tab hub + sub-module pages |
| Signs | Built | Map + board view |
| GOTV | Built | War room + engine |
| Election Night | Built | Live results dashboard |
| Finance Command | Built | 9-tab finance suite |
| Fundraising | Built | Fundraising hub |
| Donations | Built | Donation log |
| Communications | Built | Email/SMS/social |
| Print & Design | Built | Full print portal |
| Analytics | Built | Choropleth map + charts |
| Reports | Built | Analytics suite |
| Calendar | Built | 4-view calendar |
| Candidate Schedule | Built | /calendar/candidate |
| Tasks | Built | Kanban + list |
| Volunteers | Built | Roster + shifts |
| Polls | Built | Poll builder + live results |
| Resource Library | Built | /resources |
| AI Content Creator | Built | /resources/ai-creator |
| Officials (app) | Built | Coalition intelligence |
| Intelligence | Built | Opponent intel |
| Settings | Built | Full settings suite |
| Import/Export | Built | Smart CSV/XLSX import |
| Admin | Built | Admin panel |
| Ops Console | Built | SUPER_ADMIN platform view |
| Social Feed | Built | Public polling app |
| Social Polls | Built | Browse + vote |
| Social Officials | Built | Public officials directory |
| Adoni AI | Built | Chat drawer + page assist |
| Help Centre | Built | Articles + video player |

---

## 6. Design System (Locked)

### Colours
| Token | Hex | Usage |
|---|---|---|
| Navy | #0A2342 | Primary brand, headings |
| Green | #1D9E75 | Success, CTAs, active states |
| Amber | #EF9F27 | Warnings, in-progress |
| Red | #E24B4A | Danger, overdue, alerts |
| Slate-950 | #020617 | Sidebar background (actual) |
| White | #FFFFFF | Panel backgrounds |
| Gray-50 | #F9FAFB | Page background |
| Gray-200 | #E5E7EB | Borders |
| Gray-500 | #6B7280 | Secondary text |

### Party Colours
| Party | Hex | Tailwind class |
|---|---|---|
| LIB | #dc2626 | red-600 |
| CON | #2563eb | blue-600 |
| NDP | #ea580c | orange-600 |
| BQ | #06b6d4 | cyan-500 |
| GRN | #16a34a | green-700 |

### Typography (Inter)
| Role | Size | Weight | Colour |
|---|---|---|---|
| H1 | 20px | Bold | Navy |
| H2 | 16px | Semibold | Navy |
| Body | 14px | Regular | Gray-700 |
| Label | 12px | Semibold uppercase | Gray-500 |
| Stat | 28px | Bold | Navy |

### Badge Colours
| State | Classes |
|---|---|
| ACTIVE / COMPLETE / OK | bg-green-100 text-green-800 |
| IN PROGRESS / ASSIGNED | bg-amber-100 text-amber-800 |
| DRAFT / INACTIVE | bg-gray-100 text-gray-600 |
| OVERDUE / ALERT / LOW | bg-red-100 text-red-800 |
| LOCKED / GOTV | bg-blue-100 text-blue-900 |

### Motion (framer-motion)
```tsx
import { motion, AnimatePresence } from 'framer-motion';
const spring = { type: "spring", stiffness: 300, damping: 30 };
```

### Cards
```tsx
// Standard card
<div className="rounded-xl border border-gray-200 bg-white hover:border-[#0A2342] hover:shadow-sm transition-all">

// Social glassmorphic
<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
```

### Social App (Dark)
- bg-slate-950 base
- Glassmorphic: `bg-white/5 backdrop-blur-xl border border-white/10`
- Neon: `shadow-[0_0_20px_rgba(59,130,246,0.3)]`

---

## 7. Canadian Election Context (Mandatory)

| Rule | Detail |
|---|---|
| Elections | Canadian federal (April 2026) + Ontario municipal (October 2026) |
| Federal riding | Riding 42 — Parkdale–High Park |
| Municipal ward | Ward 20 — Scarborough Southwest |
| Parties | LIB / CON / NDP / BQ / GRN only |
| City | Toronto |
| Area codes | 416 / 647 |
| Addresses | Toronto streets (Dundas, Queen, Roncesvalles, Bloor, Kingston Rd) |
| Postal codes | M6R, M6P, M6K, M6H, M1E, M1J |
| Date format | April 12, 2026 or 2026-04-12 |
| Currency | CAD ($) |
| No Lorem Ipsum | All data must be realistic Canadian |

NEVER use: Democrat, Republican, US states, US area codes, US addresses.

---

## 8. Sidebar Navigation (Actual — from src/components/layout/sidebar.tsx)

Role-aware, dynamically composed at runtime.

**SUPER_ADMIN (prepended at top):**
```
OPERATOR CENTRE
  Platform Overview     /ops
  Client Manager        /ops/clients
  All Campaigns         /ops/campaigns
  Security Monitor      /ops/security
```

**Standard (ADMIN/MANAGER/STAFF):**
```
HEADQUARTERS
  Dashboard             /dashboard
  Command Center        /command-center
  Alerts                /alerts
  Contacts              /contacts
  Volunteers            /volunteers
  Tasks                 /tasks
  Calendar              /calendar
  Candidate Schedule    /calendar/candidate

FIELD OPERATIONS
  Field Ops             /field-ops
  Programs              /field-ops?tab=programs
  Routes                /field-ops?tab=routes
  Turf                  /field-ops?tab=turf
  Runs                  /field-ops?tab=runs
  Lit Drops             /field-ops?tab=lit-drops
  Teams                 /field-ops?tab=teams
  Follow-Ups            /field-ops?tab=follow-ups
  GOTV                  /gotv
  Election Night        /election-night
  Events                /events
  Polls                 /polls
  Voter Lookup          /lookup

FINANCE
  Finance Command       /finance
  Fundraising           /fundraising
  Donations             /donations
  Legacy Budget         /budget
  Billing               /billing

COMMUNICATIONS
  Email & SMS           /communications
  Social Media          /communications/social
  Voter Outreach        /notifications
  Print & Design        /print
  Campaign Website      /settings/public-page

ANALYTICS & INTEL
  Analytics             /analytics
  Reports               /reports
  Resource Library      /resources
  Officials             /officials
  Media Contacts        /media
  Coalitions            /coalitions
  Opponent Intel        /intelligence

SETTINGS & ADMIN
  Settings              /settings
  Brand Kit             /settings/brand
  Team                  /settings/team
  Security              /settings/security
  Import / Export       /import-export
  Recycle Bin           /settings/recycle-bin
  Help                  /help
  [ADMIN+] Videos & Docs, Verify Features, Security Monitor
  [SUPER_ADMIN+] Content Review, Permission Control Center
```

**Canvasser role:** My Turf, My Tasks, Ask Adoni only.

**Finance role:** Finance suite + My Account only.

Bottom: "Ask Adoni" button (dispatches `pollcity:open-adoni` event), Ctrl+K search hint, Privacy/Terms links.

---

## 9. Role-Based Access

| Feature | SUPER_ADMIN | ADMIN | MANAGER | STAFF | VOLUNTEER |
|---|---|---|---|---|---|
| Ops Console | ✓ | — | — | — | — |
| Finance | ✓ | ✓ | ✓ | View | — |
| Contacts (full) | ✓ | ✓ | ✓ | ✓ | Walk list only |
| Delete contacts | ✓ | ✓ | ✓ | — | — |
| Settings | ✓ | ✓ | Limited | — | — |
| Reports | ✓ | ✓ | ✓ | View | — |
| Billing | ✓ | ✓ | — | — | — |
| Content Review | ✓ | — | — | — | — |

George = SUPER_ADMIN.

---

## 10. Key Module Specs

### Field Ops (/field-ops)
Tab hub with query-param tabs: `?tab=programs|routes|turf|runs|lit-drops|teams|follow-ups`.
Standalone pages under /field/ for full CRUD.
Pipeline: Programs → Routes → Turf → Runs → GOTV

### Polls (/polls)
Question types: Yes/No, Multiple Choice, Scale (1–5), Open Text, Ranked Choice.
Live results at /polls/[id]/live.

### Communications (/communications)
Channels: Email / SMS / Social. Adoni AI drawer available.
Sub-routes: /communications/email, /communications/sms, /communications/inbox, /communications/social

### Finance (/finance)
Full suite: Budget, Expenses, Purchase Requests, Vendors, Reimbursements, Approvals, Reports, Audit.
Separate /fundraising and /donations routes.

### Print (/print)
Full print portal: Templates, Design editor, Jobs, Products, Inventory, Packs, Shops.

### Adoni AI
- Senior campaign manager persona — male (he/him), never she/her
- No markdown in responses — plain paragraph text only, max 8 sentences
- Opens via `window.dispatchEvent(new CustomEvent("pollcity:open-adoni", { detail: { prefill } }))`
- Listener lives at `src/components/adoni/adoni-chat.tsx` — do not add a second listener
- Canadian English spelling (colour, neighbour, programme)

### GOTV (/gotv)
War room, engine, map at `src/components/gotv/`.

---

## 11. Poll City Social

Mobile-first, 390px viewport.
- Swipe polling at `src/components/polls/swipe-poll.tsx`
- Dark glassmorphic panels, neon fills, spring animation
- Route group: /social/

---

## 12. Images & Assets

- Logo: `/public/logo.png` — served via Next.js public dir
- Images: use Next.js `<Image>` from `next/image`
- Maps: dynamic import with `ssr: false`
- Charts: recharts with `ResponsiveContainer`
- No Figma asset scheme in this codebase

---

## 13. Protected Files — Never Edit Without Being Asked

```
src/components/adoni/adoni-chat.tsx   ← Adoni event listener
CLAUDE.md                             ← Agent standing orders
prisma/seed.ts                        ← Demo data (add only, never remove)
src/app/(marketing)/                  ← Marketing pages
```

---

## 14. Tailwind Configuration

- Tailwind v3.4.1 — uses `tailwind.config.js`
- Global styles in `src/app/globals.css`
- `cn()` utility from `@/lib/utils` wraps `clsx` + `tailwind-merge`

---

## 15. Component Patterns (Next.js)

**Server component (page.tsx):**
```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";

export default async function FeaturePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <FeatureClient />;
}
```

**Client component (*-client.tsx):**
```tsx
"use client";
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export function FeatureClient() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4 sticky top-0 z-10">
        {/* header */}
      </div>
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        {/* content */}
      </div>
    </div>
  );
}
```

**API route:**
```tsx
// src/app/api/feature/route.ts
import { apiAuth } from "@/lib/auth/helpers";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { session, campaignId } = await apiAuth(req);
  if (!session) return new Response("Unauthorized", { status: 401 });
  // Always scope by campaignId — no exceptions
}
```

---

## 16. Data Consistency Rules

- Numbers must match across related tabs
- All dates = April 2026 (federal) or October 2026 (municipal)
- Toronto streets, real postal codes, real poll numbers
- Riding 42 / Parkdale–High Park for federal; Ward 20 / Scarborough Southwest for municipal
- Soft deletes: always filter `deletedAt: null` in Prisma queries
- Always scope by `campaignId` — leaking data across campaigns is catastrophic

---

## 17. Build Queue (What's Next)

See QUICK_START.md for the active build queue.

Always update the App Router directory AND `src/components/layout/sidebar.tsx` when adding routes.

---

## 18. Corrections from MASTER_CLAUDE.md (Codebase Wins)

| MASTER_CLAUDE.md says | Actual codebase |
|---|---|
| Vite 6 | Next.js 14.2.5 |
| pnpm | npm |
| react-router v7 | Next.js App Router (filesystem) |
| Tailwind v4, no tailwind.config.js | Tailwind v3.4.1, uses tailwind.config.js |
| motion from 'motion/react' | framer-motion 12.38.0 |
| react-hook-form 7.55.0 | react-hook-form 7.52.0 |
| react-dnd 16 | @dnd-kit/core 6.3.1 |
| /src/app/routes.tsx | Does not exist — App Router only |
| /src/app/pages/App/ | Does not exist — routes in src/app/(app)/ |
| /src/styles/theme.css | Does not exist — uses tailwind.config.js |
| /src/imports/pasted_text/*.md | Does not exist in this codebase |
| shadcn/ui in /ui/ | Custom UI primitives, not shadcn |
| @mui/material | Not installed |
| recharts 2 | recharts 3.8.1 |
| Candidate.tsx / ElectedOfficials.tsx | Figma Make prototype only — not in Next.js app |
