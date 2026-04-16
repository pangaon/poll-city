# FIGMA SPEC HANDOFF
## Created: April 16, 2026 — Session close-out document

Read this at the start of any session that involves matching the Next.js app to George's Figma design.

---

## The Situation

George has built a complete UI prototype for Poll City in **Figma Make** (a separate project from this Next.js repo). The prototype is live at:

**https://valley-revise-45442235.figma.site**

The Figma Make project is on George's machine in a separate folder (not this repo). It uses Vite + react-router + Tailwind v4 + pnpm — different stack from this Next.js app.

**Goal:** Rebuild the Next.js app UI to match the Figma prototype exactly.

---

## What Already Exists in This Repo

`MASTER_CLAUDE.md` (repo root) — the master bridge document. Contains:
- Full tech stack specs
- Design system tokens (colours, typography, cards, motion)
- Route map
- Page completion status (which screens are built in Figma)
- Sidebar navigation structure
- Component patterns
- Build queue (priority order)

Read MASTER_CLAUDE.md before touching any UI work.

---

## What's Missing — The Spec Files

MASTER_CLAUDE.md references three detailed per-screen spec files that live in the Figma Make project:

| File | Contents |
|---|---|
| `poll-city-design-spec.md` | Full platform spec — every module, every screen |
| `poll-city-command-center.md` | 13-tab Field Ops Command Centre complete brief |
| `poll-city-field-ops.md` | Field Ops marketing + product design system |

**Location in Figma Make project:** `src/imports/pasted_text/`

**Action:** Check if George has added these to `docs/` in this repo. If yes — use them. If not — proceed with MASTER_CLAUDE.md §17 build queue.

---

## If Spec Files Are Not Here — Use This Prompt in Figma Make

George can paste this into the Figma Make AI chat to extract the specs:

---
*I need to export the complete build spec for this project so a Next.js developer can rebuild it exactly. Please output the following for EVERY screen in the app:*

*For each screen/route, provide:*
*1. Route path (e.g. /app/dashboard)*
*2. Page title and subtitle*
*3. Layout description (sidebar? tabs? cards? table? map?)*
*4. Every section on the page — name, what data it shows, what columns/fields appear*
*5. Every button, its label, and what it does*
*6. Every tab name (if tabbed)*
*7. Stats/KPI cards — label, what number/value, what colour*
*8. Any modals or drawers — what triggers them, what fields they contain*
*9. Empty states — what message and CTA appears*
*10. Color usage — which elements use Navy #0A2342, Green #1D9E75, Amber #EF9F27, Red #E24B4A*
*11. Any charts — type (bar/line/pie), what data, what axes*

*Output format: One section per screen, clearly labeled with the route. Be exhaustive — this is the only reference the developer has.*

*Screens to cover: All screens in the campaign staff app (Dashboard, Contacts, Canvassing, Field Ops, Walk List, Signs, Polling, Communications, Calendar, Tasks, Volunteers, Donations, Fundraising, Finance, Print, Reports, Analytics, Settings, GOTV, Election Night, Adoni) plus all Social app screens.*

---

George pastes the output here and the session can build from it.

---

## Build Queue (If Building Without Full Specs)

From MASTER_CLAUDE.md §17, in priority order:

1. Fundraising Command Centre — 9 tabs at `/fundraising` (or `/donations`)
2. Finance / Budget Suite — `/finance`
3. GOTV Module — `/gotv`
4. Election Night Dashboard — `/election-night`
5. Adoni AI global drawer
6. Contact Profile deep view — `/contacts/[id]`

---

## Key Design Rules (from MASTER_CLAUDE.md)

- **Design system:** Navy #0A2342, Green #1D9E75, Amber #EF9F27, Red #E24B4A
- **Cards:** `bg-white rounded-xl border border-gray-200` with `hover:border-[#0A2342] hover:shadow-sm`
- **Animation:** `import { motion } from 'framer-motion'` — spring `{ stiffness: 300, damping: 30 }`
- **Icons:** lucide-react only
- **Charts:** recharts only
- **Toast:** `import { toast } from 'sonner'`
- **Social app only:** dark glassmorphic `bg-white/5 backdrop-blur-xl border border-white/10`
- **Canadian context:** Toronto, April 2026 federal + October 2026 municipal, Riding 42 Parkdale–High Park, Maria T. Chen (LIB)
- **NEVER:** US political references, pnpm (use npm), motion/react (use framer-motion), spinners (use skeleton)

---

## Protected Files — Never Touch

- `src/components/adoni/adoni-chat.tsx`
- `CLAUDE.md`

---

*Last updated: April 16, 2026 — Created during session close-out by Claude Sonnet 4.6*
