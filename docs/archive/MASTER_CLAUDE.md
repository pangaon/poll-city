# MASTER_CLAUDE.md — Poll City: Complete Project Handoff Document
**Last Updated:** April 15, 2026 | **Version:** 2.1 (corrected for actual Next.js codebase)

---

## 🤖 INSTRUCTIONS FOR CLAUDE (READ THIS FIRST)

Hey Claude — welcome to the Poll City project. This is a single master document containing everything you need to get up to speed and start coding. Here's what to do:

### Step 1 — Split this file into individual docs

The user has already created these empty files in this project root:
- `FIGMA.md`
- `CLAUDE.md`
- `COMPONENTS.md`
- `DEPENDENCIES.md`
- `DOCUMENTATION_INDEX.md`
- `QUICK_START.md`
- `README.md`
- `ROUTES.md`
- `SPECIFICATIONS.md`

Use the content in the sections below (each clearly labeled ## FILE: filename.md) to populate each file. Overwrite existing content.

### Step 2 — Read FIGMA.md first, always

FIGMA.md is the master context. Read it before touching any code.

### Step 3 — Key rules (corrected for actual Next.js codebase)

1. Package manager: npm — NOT pnpm or yarn
2. Routing: Next.js App Router (filesystem-based) — NOT react-router. No routes.tsx.
3. Animation: import { motion } from 'framer-motion' — NOT 'motion/react'
4. Images: use Next.js <Image> from 'next/image'. No figma:asset/ scheme.
5. Fonts: via next/font or global CSS — no /src/styles/fonts.css in this codebase
6. Protected: NEVER edit src/components/adoni/adoni-chat.tsx or CLAUDE.md
7. Canadian context: Toronto, April 2026 (federal) + October 2026 (Ontario municipal), LIB/CON/NDP/BQ/GRN, Riding 42 / Parkdale–High Park (federal), Ward 20 / Scarborough Southwest (municipal)
8. No Tailwind font overrides unless user asks
9. tailwind.config.js IS required — this codebase uses Tailwind v3.4.1, not v4
10. Check package.json before installing any package

### Step 4 — Current build state

This is a full production Next.js 14 codebase with 100+ routes, Prisma/PostgreSQL,
next-auth, Stripe, Twilio, Resend. All major modules are built.

NOT a Figma Make prototype. The Figma Make prototype (Vite + react-router) is a
separate project. Do not apply Figma Make conventions here.

See FIGMA.md §5 for full page completion status.

---

## FILE: FIGMA.md

# FIGMA.md — Poll City: Project Context & Source of Truth

Read before touching anything. Live state as of April 15, 2026.

## 1. What This Is

Poll City is an enterprise SaaS political campaign ecosystem for Canadian federal elections.

| Product | URL | Audience |
|---|---|---|
| Poll City (Campaign Platform) | app.poll.city | Campaign managers, staff, volunteers |
| Poll City Social | social.poll.city | General public, voters |
| Poll City Print | print.poll.city | Campaign print ordering (future) |
| Marketing Site | poll.city | Prospects, leads |
| Ops Console | app.poll.city/ops | George (founder/SUPER_ADMIN only) |

Design reference: "Stripe + Linear + NationBuilder + Meta Ads Manager combined."

## 2. Tech Stack (Locked)

| Tool | Version | Notes |
|---|---|---|
| Next.js | 14.2.5 | Framework — App Router, NOT Vite |
| React | 18 | UI framework |
| TypeScript | 5 | Strict mode |
| Tailwind CSS | 3.4.1 | Uses tailwind.config.js — NOT v4 |
| Prisma | 5.15.0 | ORM — PostgreSQL on Railway |
| next-auth | 4.24.7 | Authentication |
| npm | — | Package manager — NOT pnpm or yarn |
| framer-motion | 12.38.0 | From 'framer-motion' — NOT 'motion/react' |
| recharts | 3.8.1 | Charts only |
| lucide-react | 0.395.0 | Icons only |
| react-hook-form | 7.52.0 | Must be this exact version |
| sonner | 1.5.0 | import { toast } from 'sonner' |
| @dnd-kit/core | 6.3.1 | Drag & drop — NOT react-dnd |
| date-fns | 3.6.0 | Date utilities |
| zod | 3.23.8 | Validation |
| leaflet + react-leaflet | 1.9.4 / 4.2.1 | Maps (dynamic import, ssr: false) |

## 3. Project File Structure

/
├── src/
│   ├── app/
│   │   ├── layout.tsx                   ← Root layout (Next.js)
│   │   ├── (app)/                       ← Authenticated campaign app (30+ modules)
│   │   │   ├── layout.tsx               ← App shell
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── contacts/page.tsx
│   │   │   ├── canvassing/page.tsx
│   │   │   ├── field-ops/page.tsx
│   │   │   ├── field/                   ← Field sub-modules
│   │   │   ├── finance/                 ← Finance Command suite
│   │   │   ├── communications/
│   │   │   ├── signs/page.tsx
│   │   │   ├── polls/
│   │   │   ├── ops/                     ← SUPER_ADMIN console
│   │   │   └── [30+ other modules]
│   │   ├── (marketing)/                 ← Public marketing site
│   │   ├── (print)/                     ← Print layout (no sidebar)
│   │   ├── social/                      ← Poll City Social app
│   │   └── api/                         ← API routes
│   ├── components/
│   │   ├── layout/                      ← sidebar.tsx ← PROTECTED (Adoni listener)
│   │   ├── adoni/                       ← adoni-chat.tsx ← PROTECTED
│   │   ├── canvassing/
│   │   ├── gotv/
│   │   ├── polls/
│   │   ├── maps/
│   │   ├── dashboard/
│   │   └── ui/                          ← Custom UI primitives
│   ├── lib/
│   │   ├── auth/helpers.ts              ← apiAuth(), authOptions
│   │   ├── db/prisma.ts                 ← Prisma client
│   │   └── api/errors.ts               ← Error helpers
│   └── styles/
├── prisma/
│   ├── schema.prisma                    ← Source of truth for data models
│   └── seeds/
├── MASTER_CLAUDE.md
├── FIGMA.md
├── CLAUDE.md                            ← PROTECTED — agent standing orders
├── ROUTES.md
├── COMPONENTS.md
├── DEPENDENCIES.md
├── SPECIFICATIONS.md
├── QUICK_START.md
├── DOCUMENTATION_INDEX.md
├── package.json
├── next.config.js
└── tailwind.config.js                   ← Required for Tailwind v3

## 4. Routing Map

All routes use **Next.js App Router** (filesystem-based). No routes.tsx.
See ROUTES.md for the full 100+ route map. Key routes:

/                        → Marketing Home
/dashboard               → Dashboard
/contacts                → Contacts / Voter Database
/contacts/[id]           → Contact detail
/canvassing              → Canvassing
/field-ops               → Field Ops (tab hub)
/field/programs          → Programs
/field/turf              → Turf
/field/routes            → Routes
/field/runs              → Runs
/field/lit-drops         → Lit Drops
/polls                   → Polling Engine
/communications          → Communications
/communications/email    → Email
/communications/sms      → SMS
/communications/social   → Social media manager
/calendar                → Campaign Calendar
/calendar/candidate      → Candidate Schedule
/tasks                   → Tasks
/volunteers              → Volunteers
/donations               → Donations
/fundraising             → Fundraising
/finance                 → Finance Command Centre
/signs                   → Signs Management
/print                   → Print & Design
/analytics               → Analytics + choropleth map
/reports                 → Reports
/settings                → Settings
/ops                     → Operator Console (SUPER_ADMIN only)
/gotv                    → GOTV War Room
/election-night          → Election Night Dashboard
/social                  → Poll City Social feed
/social/polls            → Browse polls
/social/officials        → Elected officials (public)
/social/profile          → User profile

## 5. Page Completion Status

| Page | Status | Notes |
|---|---|---|
| Marketing Home | Built | Home.tsx |
| Dashboard | Built | Campaign command centre |
| Candidate Hub | COMPLETE | 5-tab profile, Maria T. Chen |
| Elected Officials | COMPLETE | Full directory, filter/search |
| Contacts | Built | CRM / voter database |
| Canvassing | Built | Map + walk list |
| Field Ops | Built | 13-tab enterprise module |
| Walk List | Built | Route-optimized door list |
| Lit Drops | Built | Literature drop management |
| Signs | Built | Map + board view |
| Polling | Built | Poll builder + results |
| Communications | Built | Email/SMS/voice |
| Calendar | Built | 4-view calendar |
| Tasks | Built | Kanban + list |
| Volunteers | Built | Roster + shifts |
| Donations | Built | Basic donation log |
| Print | Built | Print & logistics |
| Media | Built | Content library |
| Reports | Built | Analytics suite |
| Settings | Built | Campaign settings |
| Admin | Built | Ops console |
| Social Feed | Built | Swipe polling |
| Social Trending | Built | Trending issues |
| Social Create | Built | Poll creation |
| Social Command | Built | Command centre |
| Social Notifications | Built | Notifications |
| Social Profile | Built | User profile |

## 6. Design System (Locked)

### Colours
| Token | Hex | Usage |
|---|---|---|
| Navy | #0A2342 | Primary brand, sidebar, headings |
| Green | #1D9E75 | Success, CTAs, active |
| Amber | #EF9F27 | Warnings, in-progress |
| Red | #E24B4A | Danger, overdue, alerts |
| White | #FFFFFF | Panel backgrounds |
| Gray-50 | #F9FAFB | Page background |
| Gray-200 | #E5E7EB | Borders |
| Gray-500 | #6B7280 | Secondary text |

### Typography (Inter)
| Role | Size | Weight | Color |
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

### Motion
- Spring: { stiffness: 300, damping: 30 }
- AnimatePresence for enter/exit
- import { motion } from 'motion/react'

### Cards
- rounded-xl border border-gray-200 bg-white
- Hover: hover:border-[#0A2342] hover:shadow-sm
- Progress bars: rounded-full h-1.5 bg-gray-100 with green fill

### 2030 Dark Mode (Social app ONLY)
- bg-white/5 backdrop-blur-xl border border-white/10
- Neon edge lighting, dark navy/slate base
- Live recharts with neon fills

## 7. Canadian Election Context (Mandatory)

ALL data must reflect Canadian federal election context.

| Rule | Detail |
|---|---|
| Election | Canadian federal, April 2026 |
| Riding | Riding 42 — Parkdale–High Park |
| Parties | LIB / CON / NDP / BQ / GRN only |
| City | Toronto |
| Area codes | 416 / 647 |
| Addresses | Toronto streets (Dundas, Queen, Roncesvalles, Bloor) |
| Candidate | Maria T. Chen (LIB) |
| Postal codes | M6R, M6P, M6K, M6H |
| Date format | April 12, 2026 or 2026-04-12 |
| Currency | CAD ($) |
| No Lorem Ipsum | All data must be realistic Canadian |

NEVER use: Democrat, Republican, US states, US area codes, US addresses.

## 8. Sidebar Navigation

AppLayout.tsx provides the shell:

COMMAND
  Dashboard
  Candidate Hub       ← /app/candidate
  Command Centre

PEOPLE
  Contacts / Voters   ← /app/contacts
  Volunteers          ← /app/volunteers
  Elected Officials   ← /app/officials

FIELD
  Canvassing          ← /app/canvassing
  Field Ops           ← /app/field-ops
  Signs               ← /app/signs
  Walk Lists          ← /app/walk-list
  Lit Drops           ← /app/lit-drops

OUTREACH
  Communications      ← /app/communications
  Polls               ← /app/polling
  Tasks               ← /app/tasks

MONEY
  Donations           ← /app/donations

EXECUTION
  Print & Orders      ← /app/print
  Calendar            ← /app/calendar
  Media / Content     ← /app/media

INTELLIGENCE
  Reports & Analytics ← /app/reports

PLATFORM
  Settings            ← /app/settings
  Admin               ← /app/admin

Top bar: Campaign selector | Global search | Notification bell | Quick actions (+) | User avatar + role | Dark/light toggle

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

George = SUPER_ADMIN.

## 10. Key Module Specs

### Field Ops (/app/field-ops) — 13 Tabs
Dashboard · Programs · Routes · Turf · Runs · Lit Drops · Signs · Teams · Materials · Follow-Ups · GOTV · Mobile · Audit
Pipeline: Programs → Routes → Turf → Runs → GOTV

### Signs (/app/signs)
Map view + List view + Add Sign modal. Campaign manager macro view.

### Polling (/app/polling)
Question types: Yes/No, Multiple Choice, Scale (1–5), Open Text, Ranked Choice.

### Communications (/app/communications)
Tabs: Compose | Inbox | Scheduled | Templates | Audiences | History | Social | Settings
Channels: Email / SMS / Voice. Adoni AI drawer available.

### Donations (/app/donations) — 9 Tabs
Overview | Campaigns | Donors | Donations | Receipts | Recurring | Pledges | Compliance | Reports

### Print (/app/print)
Overview | Templates | Design | Jobs/Orders | Products | Inventory | Packs | Shops | Walk Lists

### Adoni AI
- "Senior campaign manager available 24/7" persona
- No markdown in responses — plain paragraph text only
- Right-side drawer or full-screen mode

## 11. Poll City Social

Mobile-first, simulated iOS, 390px viewport.
- Swipe: right=Support, left=Oppose, up=Strongly Support, down=Strongly Oppose
- Dark glassmorphic panels, neon fills, spring animation

## 12. Images & Assets

- Raster (Figma): import img from "figma:asset/abc123.png" — NO path prefix
- SVGs: /src/imports/ via relative path
- New images: ImageWithFallback component
- Stock photos: unsplash_tool only — never hallucinate URLs
- Local: Poll_City_Logo.png, Poll_city_logo.jpg, IMG_3247.png, image.png–image-6.png

## 13. Protected Files — Never Edit

/src/app/components/figma/ImageWithFallback.tsx
/pnpm-lock.yaml

## 14. Tailwind v4 Rules

- No tailwind.config.js
- No text-2xl, font-bold, leading-none unless user requests
- Tokens → /src/styles/theme.css
- Fonts → /src/styles/fonts.css ONLY
- Custom → /src/styles/custom.css

## 15. Component Patterns

Page shell:
export function PageName() {
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

Stat card:
<div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#0A2342] hover:shadow-sm transition-all cursor-pointer">
  <div className="flex items-center justify-between mb-2">
    <div className="p-2 rounded-lg bg-blue-50"><Icon className="w-4 h-4 text-blue-600" /></div>
    <ChevronRight className="w-4 h-4 text-gray-400" />
  </div>
  <div className="text-2xl font-bold text-[#0A2342]">{value}</div>
  <div className="text-xs text-gray-500 mt-1">{label}</div>
</div>

Badge:
<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">ACTIVE</span>

## 16. Data Consistency Rules

- Numbers must match across all tabs (24 routes on dashboard = 24 rows in Routes tab)
- All dates = April 2026
- Toronto streets, real postal codes, real poll numbers only
- Riding 42 / Parkdale–High Park everywhere

## 17. Build Queue (What's Next)

1. Fundraising Command Centre — 9-tab at /app/donations
2. Finance / Budget Suite — /app/finance (not yet routed)
3. GOTV Module — /app/gotv (not yet routed)
4. Election Night Dashboard — /app/election-night (not yet routed)
5. Ops Console enrichment — /app/admin
6. Contact Profile deep view — /app/contacts/[id]
7. Adoni AI global drawer
8. Marketing Site full build

Always update routes.tsx AND AppLayout.tsx sidebar when adding routes.

---

## FILE: CLAUDE.md

# IMPORTANT — Do NOT overwrite CLAUDE.md when populating files

CLAUDE.md is the Poll City agent standing orders file (537 lines, tracked by git).
It contains the full operating system for every AI session: build cycle, security rules,
architecture rules, Adoni laws, anti-hallucination rules, and reporting format.

When re-populating doc files from MASTER_CLAUDE.md, **skip CLAUDE.md**.
The codebase wins — and the codebase's CLAUDE.md is authoritative.

The short dev guide below is for reference only. Do not use it to overwrite CLAUDE.md.

---

# Poll City - Development Reference (supplement to CLAUDE.md)

## Overview

Enterprise SaaS campaign platform + Poll City Social public polling app.
Built with Next.js 14, React 18, TypeScript 5, Prisma 5, PostgreSQL.

CRITICAL: Canada-based. April 2026 federal election + October 2026 Ontario municipal.
Riding 42 / Parkdale–High Park (federal). Ward 20 / Scarborough Southwest (municipal).
Parties: LIB/CON/NDP/BQ/GRN. Toronto addresses, 416/647. NEVER use US political references.

## Tech Stack (actual)

| Tool | Details |
|---|---|
| Next.js 14.2.5 | Framework — App Router |
| React 18 + TypeScript 5 | Core |
| npm | Package manager — NOT pnpm/yarn |
| Tailwind CSS v3.4.1 | Uses tailwind.config.js |
| Prisma 5.15.0 | ORM — PostgreSQL on Railway |
| next-auth 4.24.7 | Authentication |
| framer-motion 12 | Animation — import from 'framer-motion' |
| recharts 3.8.1 | Charts |
| lucide-react 0.395.0 | Icons |
| react-hook-form 7.52.0 | MUST use this exact version |
| @dnd-kit/core 6.3.1 | Drag & drop |
| zod 3.23.8 | Validation |

## Design System

Colours: Navy #0A2342, Green #1D9E75, Amber #EF9F27, Red #E24B4A
Party: LIB #dc2626 | CON #2563eb | NDP #ea580c | BQ #06b6d4 | GRN #16a34a
Social app: bg-slate-950 base, glassmorphic bg-white/5 backdrop-blur-xl

Cards: bg-white rounded-xl border border-gray-200
Hover: hover:border-[#0A2342] hover:shadow-sm
Styling: cn() from @/lib/utils (clsx + tailwind-merge)

## Import Patterns (Next.js)

// Images — Next.js Image (no figma:asset in this codebase)
import Image from 'next/image';

// Icons
import { Search, User } from 'lucide-react';

// Animation
import { motion } from 'framer-motion';

// Charts
import { LineChart, Line, ResponsiveContainer } from 'recharts';

// Toast
import { toast } from 'sonner';

// Auth (server component)
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

// Auth (API route)
import { apiAuth } from "@/lib/auth/helpers";

// Database
import { prisma } from "@/lib/db/prisma";

// Styling
import { cn } from "@/lib/utils";

## Mock Data Pattern

const mockVoters = [
  {
    id: '1',
    name: 'Sarah Chen',
    address: '123 Queen St W, Toronto',
    phone: '(416) 555-0123',
    party: 'LIB',
    riding: 'Parkdale–High Park',
  }
];

## Rules

DO:
- npm run build exits 0 before every push
- Read files before editing
- Scope every DB query by campaignId
- Filter deletedAt: null on Contact/Task/Sign/Donation/VolunteerProfile
- Use apiAuth(req) for API routes
- Use getServerSession(authOptions) for server components
- Use Canadian 2026 context everywhere
- Use lucide-react for icons
- Use recharts for charts
- Use framer-motion for animation

DON'T:
- Push without a green build
- Use pnpm or yarn (use npm)
- Use US political references
- Create tailwind.config.js (it already exists — leave it)
- Use any TypeScript (use unknown + narrowing)
- Skip Zod validation at API boundaries
- Hard-delete Contact/Task/Sign/Donation/VolunteerProfile records

---

## FILE: ROUTES.md

# Poll City - Routes & Pages

## Campaign Platform

| Route | Component | Status |
|---|---|---|
| / | Marketing/Home.tsx | Built |
| /app | App/Dashboard.tsx | Built |
| /app/contacts | App/Contacts.tsx | Built |
| /app/canvassing | App/Canvassing.tsx | Built |
| /app/field-ops | App/FieldOps.tsx | Built (13 tabs) |
| /app/walk-list | App/WalkList.tsx | Built |
| /app/lit-drops | App/LitDrops.tsx | Built |
| /app/polling | App/Polling.tsx | Built |
| /app/communications | App/Communications.tsx | Built |
| /app/calendar | App/Calendar.tsx | Built |
| /app/tasks | App/Tasks.tsx | Built |
| /app/volunteers | App/Volunteers.tsx | Built |
| /app/donations | App/Donations.tsx | Built |
| /app/signs | App/Signs.tsx | Built |
| /app/print | App/Print.tsx | Built |
| /app/media | App/Media.tsx | Built |
| /app/reports | App/Reports.tsx | Built |
| /app/settings | App/Settings.tsx | Built |
| /app/admin | App/Admin.tsx | Built |
| /app/candidate | App/Candidate.tsx | COMPLETE |
| /app/officials | App/ElectedOfficials.tsx | COMPLETE |

## Social App

| Route | Component |
|---|---|
| /social | Social/SocialFeed.tsx |
| /social/trending | Social/SocialTrending.tsx |
| /social/create | Social/SocialCreate.tsx |
| /social/command | Social/SocialCommand.tsx |
| /social/notifications | Social/SocialNotifications.tsx |
| /social/profile | Social/SocialProfile.tsx |

## Adding New Routes

1. Create /src/app/(app)/new-feature/page.tsx (server component — handles auth)
2. Create /src/app/(app)/new-feature/new-feature-client.tsx (client component — handles UI)
3. Add to sidebar in /src/components/layout/sidebar.tsx

## Page Layout Pattern

export default function PageName() {
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

---

## FILE: COMPONENTS.md

# Poll City - Component Library

## Custom Components (/src/app/components/)

| Component | Purpose |
|---|---|
| AppSwitcher.tsx | Toggles Social / Campaign mode |
| FieldOpsMap.tsx | Interactive field operations map |
| InstallationInterface.tsx | Sign installation tracking |
| NewSignRequestModal.tsx | New sign request modal |
| figma/ImageWithFallback.tsx | Use instead of img tag for new images |

## UI Library (/src/app/components/ui/)

Layout: card, tabs, separator, accordion, resizable
Forms: button, input, textarea, select, checkbox, radio-group, switch, slider, form, label
Overlays: dialog, alert-dialog, sheet, drawer, popover, tooltip
Navigation: dropdown-menu, navigation-menu, sidebar, breadcrumb, pagination, command
Feedback: alert, badge, progress, skeleton, sonner
Data: table, avatar, calendar, chart
Utilities: scroll-area, carousel, toggle, toggle-group

## Common Import Examples

import { Button } from './components/ui/button';
import { Card, CardHeader, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { toast } from 'sonner';

## Patterns

Glassmorphic panel:
<div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">

Party badge:
<Badge className="bg-red-500/20 text-red-400 border-red-500/30">LIB</Badge>

Status badge:
<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">ACTIVE</span>

Neon card:
<div className="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] p-4">

---

## FILE: DEPENDENCIES.md

# Poll City - Dependencies

## Package Manager: npm

npm install package-name
npm install package-name@version
# Check package.json first — it may already be installed

## Core Packages (actual from package.json)

| Package | Version | Purpose |
|---|---|---|
| next | 14.2.5 | Framework |
| react | ^18 | Core |
| react-dom | ^18 | DOM |
| @prisma/client | ^5.15.0 | ORM |
| next-auth | ^4.24.7 | Auth |
| tailwindcss | ^3.4.1 | Styling |
| lucide-react | ^0.395.0 | Icons |
| recharts | ^3.8.1 | Charts |
| framer-motion | ^12.38.0 | Animation |
| react-hook-form | ^7.52.0 | Forms — must be this version |
| @hookform/resolvers | ^3.6.0 | RHF resolvers |
| zod | ^3.23.8 | Validation |
| date-fns | ^3.6.0 | Dates |
| @dnd-kit/core | ^6.3.1 | Drag & drop |
| @dnd-kit/sortable | ^10.0.0 | Sortable lists |
| sonner | ^1.5.0 | Toasts |
| leaflet | ^1.9.4 | Maps |
| react-leaflet | ^4.2.1 | React maps |
| @turf/turf | ^7.3.4 | GIS |
| stripe | ^22.0.0 | Payments |
| twilio | ^5.13.1 | SMS |
| resend | ^6.10.0 | Email |
| canvas-confetti | ^1.9.4 | Confetti |
| papaparse | ^5.4.1 | CSV |
| xlsx | ^0.18.5 | Excel |

## Package Selection

| Need | Package |
|---|---|
| Icons | lucide-react |
| Charts | recharts |
| Animation | framer-motion |
| Forms | react-hook-form@^7.52.0 |
| Validation | zod |
| Dates | date-fns |
| Toasts | sonner |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Maps | leaflet + react-leaflet |

## DO NOT USE
- pnpm or yarn → use npm
- framer-motion imported as 'motion/react' → use `import { motion } from 'framer-motion'`
- react-router or react-router-dom → not needed, Next.js App Router handles routing
- react-dnd → use @dnd-kit/core
- Any icon lib other than lucide-react
- Any chart lib other than recharts

---

## FILE: SPECIFICATIONS.md

# Poll City - Specifications Index

## Master Spec Documents in /src/imports/pasted_text/

### poll-city-design-spec.md
Full platform spec — every module:
Auth flow, Setup Wizard, Dashboard, Contacts/CRM, Canvassing, Field Ops (mega-module), Polling Engine, Communications, Calendar, Volunteers, Donations, Fundraising Command Centre, Finance/Budget Suite, Signs, Print, Tasks, Events, Analytics, GOTV, Election Night, Adoni AI, Settings, Ops Console (George), Multi-tenant UX, Role-based access.
Also covers: Marketing site (poll.city), Social app (social.poll.city), Print portal (print.poll.city).

### poll-city-command-center.md
13-tab Field Ops Command Centre complete Figma brief.
Every tab fully specced with exact data, columns, states, and sample data.
Tabs: Dashboard, Programs, Routes, Turf, Runs, Lit Drops, Signs, Teams, Materials, Follow-Ups, GOTV, Mobile, Audit.
Includes side drawer pattern and create modal pattern.
Mobile viewport (390px) spec for Dashboard tab.

### poll-city-field-ops.md
Field Ops marketing + product design system.
Layer A: Marketing site preview assets (hero, product showcase, feature callouts).
Layer B: Full product UI/UX (Turf Builder, Walk List, Mobile Canvassing, Lit Drop, Sign Crew, Volunteer, Communications, Calendar, Reporting, Offline/Paper mode).
Required functional logic and states (empty, loading, active, completed, paused, error, conflict, offline).

## Spec Priority
1. Design Spec → visual and UX matters
2. Feature Specs → functional requirements
3. CLAUDE.md → technical implementation

## Quick Reference

| Feature | Spec File |
|---|---|
| Dashboard | poll-city-design-spec.md |
| Field Ops | poll-city-command-center.md |
| Canvassing | poll-city-field-ops.md |
| Signs | poll-city-command-center.md |
| Fundraising | poll-city-design-spec.md |
| Finance | poll-city-design-spec.md |
| GOTV | poll-city-command-center.md |
| Social App | poll-city-design-spec.md |
| Print Portal | poll-city-design-spec.md |
| Ops Console | poll-city-design-spec.md |
| Adoni AI | poll-city-design-spec.md |

---

## FILE: QUICK_START.md

# Poll City - Quick Start

## Read In This Order
1. FIGMA.md — master context (always first)
2. CLAUDE.md — dev conventions
3. COMPONENTS.md — UI components
4. SPECIFICATIONS.md — spec index
5. ROUTES.md — route map

## Key Files

| File | When |
|---|---|
| /src/app/App.tsx | Always — root entry |
| /src/app/routes.tsx | Adding/changing routes |
| /src/styles/theme.css | Before any styling |
| /src/imports/pasted_text/*.md | Before building features |

## Party Colors

LIB: red    #dc2626
CON: blue   #2563eb
NDP: orange #ea580c
BQ:  cyan   #06b6d4
GRN: green  #16a34a

## Common Imports

import { Button } from './components/ui/button';
import { Card, CardHeader, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Search, ChevronRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { toast } from 'sonner';

## Rules

DO: pnpm, Canadian 2026 context, check package.json, edit existing files, .tsx only
DON'T: npm/yarn, US political refs, HTML files, tailwind.config.js, font overrides

## Current Status (April 15, 2026)

COMPLETE: Candidate Hub, Elected Officials, Household Canvassing rebuild

BUILD QUEUE:
1. Fundraising Command Centre (/app/donations — 9 tabs)
2. Finance / Budget Suite (/app/finance)
3. GOTV Module (/app/gotv)
4. Election Night Dashboard (/app/election-night)
5. Adoni AI global drawer
6. Contact Profile deep view (/app/contacts/[id])

---

## FILE: README.md

# Poll City

Enterprise SaaS campaign platform + public social polling app for the 2026 Canadian federal election.

## Products

- Poll City (app.poll.city) — Campaign operations
- Poll City Social (social.poll.city) — Public swipe polling
- Poll City Print (print.poll.city) — Campaign print (future)

Design reference: "Stripe + Linear + NationBuilder + Meta Ads Manager combined."

## Tech Stack

React 18 + TypeScript, Vite 6, Tailwind CSS v4, react-router v7, recharts, motion, pnpm

## Canadian Context

April 2026 federal election. Riding 42 — Parkdale–High Park. Candidate: Maria T. Chen (LIB). Toronto. 416/647. Parties: LIB, CON, NDP, BQ, GRN.

## Docs

- FIGMA.md — Master context (read first)
- CLAUDE.md — Dev guide
- COMPONENTS.md — Component library
- ROUTES.md — Route map
- DEPENDENCIES.md — Package reference
- SPECIFICATIONS.md — Spec index
- /src/imports/pasted_text/ — Full master specs

## Commands

pnpm install
pnpm add package-name
cat package.json

---

## FILE: DOCUMENTATION_INDEX.md

# Poll City - Documentation Index

## Start Here

| File | Purpose |
|---|---|
| FIGMA.md | Master context — read before every session |
| CLAUDE.md | Dev conventions and rules |
| QUICK_START.md | Fast orientation |

## Reference

| File | Purpose |
|---|---|
| COMPONENTS.md | 50+ components with usage |
| ROUTES.md | All 27 routes |
| DEPENDENCIES.md | All packages |
| SPECIFICATIONS.md | Spec index |

## Master Specs (/src/imports/pasted_text/)

| File | Contents |
|---|---|
| poll-city-design-spec.md | Full platform — every module |
| poll-city-command-center.md | Field Ops 13-tab Figma brief |
| poll-city-field-ops.md | Field Ops marketing + product design |

## By Task

| Task | Read |
|---|---|
| Build new feature | SPECIFICATIONS.md → spec → CLAUDE.md → COMPONENTS.md |
| Add route | ROUTES.md → routes.tsx → AppLayout.tsx |
| Build UI | COMPONENTS.md → theme.css |
| Install package | DEPENDENCIES.md → package.json → pnpm add |
| Modify styles | theme.css → design spec |

---

## 🔄 UPDATE PATH

How to keep docs in sync as you build:

STEP 1: After completing a feature, update this file:
"Update MASTER_CLAUDE.md — I just built [feature name]"

STEP 2: Claude updates the relevant ## FILE: section(s) here

STEP 3: Tell Claude in VS Code:
"Re-read MASTER_CLAUDE.md and re-populate all the individual doc files"

ONE FILE. ONE PASTE. DONE.

IMPORTANT: This codebase is Next.js 14, NOT a Figma Make prototype.
When updating ## FILE: sections, always use:
- npm (not pnpm)
- framer-motion (not motion/react)
- Next.js App Router (not react-router)
- tailwind.config.js (Tailwind v3, not v4)
- See FIGMA.md §18 for the full corrections table

Update when you:
- Complete a new page or feature
- Add routes (update the routing map in ## FILE: FIGMA.md and ## FILE: ROUTES.md)
- Install packages (update ## FILE: DEPENDENCIES.md)
- Create new components (update ## FILE: COMPONENTS.md)
- Change sidebar navigation (update sidebar section in ## FILE: FIGMA.md)
- Modify design system (update design system in ## FILE: FIGMA.md)
- Change the active build queue (update ## FILE: QUICK_START.md)

---

Poll City — Maria T. Chen for Parkdale–High Park — April 2026