# Figma → Production Pipeline
## The exact process for every screen. No shortcuts.

---

## The 9-Step Pipeline (in order — never skip steps)

### Step 1 — George builds in Figma Make
- URL: figma.com/make/NjPh9eSDbI70BsP2bIgF0C/Poll-City
- GitHub connector is active (read-only) — Figma AI reads the Poll City repo for context
- This means the Figma AI knows the real types, schema, and component patterns → better exports
- George signals a screen is ready by saying **"X screen is ready to port"**

### Step 2 — Export from Figma Make
- In Figma Make: download / export the project code
- Copy the relevant screen file into `figma_design_pollcity_iosapp/pages/[App|Social|Marketing]/ScreenName.tsx`
- Copy the data/types file if updated: `figma_design_pollcity_iosapp/pages/Social/sc-data.ts`
- **DO NOT commit binary exports** — `.mb` files or any "TSX" file over 1MB is a binary ZIP artifact. It is gitignored. Text TSX files are tracked.

### Step 3 — Agent reads the Figma source
- Agent reads `figma_design_pollcity_iosapp/pages/[section]/ScreenName.tsx` in chunks
- Agent reads the data/types file to understand mock data shape
- Agent identifies: what data is hardcoded → what real API provides it
- **Agent NEVER ports a screen without reading the source first. No guessing.**

### Step 4 — Agent checks the real API
- Before writing any API calls, agent reads the existing Next.js route handler
- Confirms the exact response shape, field names, auth method
- If the API doesn't exist yet: flag it, don't invent it

### Step 5 — Agent ports the component
- Target file: `src/components/figma-preview/screens/[screen-name].tsx`
- **Adaptations required every time:**
  - `motion/react` → `framer-motion`
  - react-router `Link` → `next/link` `Link`
  - react-router `useLocation` → `usePathname` from `next/navigation`
  - Inline `cn` util → `import { cn } from "@/lib/utils"`
  - Hardcoded mock data → real API fetch (`useEffect` + `fetch` or server component)
- No new Prisma schema. No new npm packages without reason.

### Step 6 — Build passes
- `npm run build` exits 0. Not tsc. The full build.
- If it fails: fix before pushing. Never push a broken build.

### Step 7 — George tests in the browser
- Click path: **Sidebar → Platform → Mobile Preview → [screen]**
- Phone frame fills the viewport. Bottom nav navigates between screens.
- George clicks through, comments on what's wrong
- **NOTHING is marked done until George says it works**

### Step 8 — George approves
- George says "good" / "approved" / "next"
- Agent updates the screen status in `src/app/(app)/design-preview/page.tsx` if needed

### Step 9 — Port to Expo (future — not yet started)
- Same screen rebuilt in React Native in `mobile/app/`
- Calls the same Next.js API endpoints over the network
- George tests on a real device with Expo Go
- **This step does NOT happen until Step 7 is confirmed**

---

## Import Adaptation Cheat Sheet

| Figma Make (what comes out) | Next.js (what to change to) |
|---|---|
| `import { motion } from "motion/react"` | `import { motion } from "framer-motion"` |
| `import { Link, useLocation } from "react-router"` | `import Link from "next/link"` + `import { usePathname } from "next/navigation"` |
| `import { cn } from "../../utils/cn"` | `import { cn } from "@/lib/utils"` |
| `import { ImageWithFallback } from "../../components/figma/ImageWithFallback"` | `import Image from "next/image"` |
| Relative `../../components/ui/X` | `@/components/ui/X` (shadcn already installed) |

---

## What Lives Where

| Thing | Location |
|---|---|
| Figma Make source files | `figma_design_pollcity_iosapp/pages/` |
| Next.js preview components | `src/components/figma-preview/screens/` |
| Preview phone shell (Social) | `src/components/figma-preview/social-layout.tsx` |
| Preview phone shell (App) | `src/components/figma-preview/app-layout.tsx` |
| Preview route pages | `src/app/(app)/design-preview/[section]/[screen]/page.tsx` |
| Preview index (screen list) | `src/app/(app)/design-preview/page.tsx` |
| Expo iOS app | `mobile/app/` |
| Live web app pages | `src/app/(app)/[module]/` — **NEVER touched during preview work** |

---

## Rules That Prevent Wasted Time

1. **Never port without reading the source.** Guessing costs two sessions to fix.
2. **Never wire an API without reading the route handler.** Field names change.
3. **Never mark a screen done without George's browser confirmation.** Build green ≠ done.
4. **Never touch live web app pages during preview work.** Completely separate tracks.
5. **Never push binary files.** `.mb`, or any "TSX" file over 1MB is a binary artifact — it is gitignored.
6. **Never build the Expo version before the preview is approved.** Sequence matters.
7. **One screen per session focus.** Don't start a second screen until the first is George-approved.

---

## How the GitHub Connector Helps

**What it does:** Gives the Figma Make AI read access to the Poll City GitHub repo. When George builds a screen in Figma, the Figma AI can read real types, Prisma schema, and component patterns — so generated code is much closer to what the Next.js app needs.

**What it does NOT do:** It does not give Claude Code any access to Figma. The agent reads the exported files from `figma_design_pollcity_iosapp/` — not from Figma directly.

**Keep it read-only.** Write access would let Figma AI push directly to the repo, bypassing `npm run push:safe` and the build check. That caused 5 red Vercel deployments in April 2026. Read-only = all the value, none of the risk.

---

## Current Queue

| Screen | Figma Source | Preview Component | Status |
|---|---|---|---|
| SocialCommand (door-to-door wizard) | `figma_design_pollcity_iosapp/pages/Social/SocialCommand.tsx` | `src/components/figma-preview/screens/social-command.tsx` | **NEXT — stub only, full port needed** |
| All other screens | `figma_design_pollcity_iosapp/pages/` | `src/components/figma-preview/screens/` | Stubs |

---

*Last updated: 2026-04-20. Maintained by George Hatzis + Claude Sonnet 4.6.*
