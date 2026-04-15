# DEPENDENCIES.md — Poll City Package Reference

> Extracted from package.json as of April 15, 2026.
> Package manager: **npm** (NOT pnpm — MASTER_CLAUDE.md was wrong about this).
> Always check package.json before installing anything new.

---

## Package Manager

```bash
npm install              # install all deps
npm install package-name # add a new package
npm run build            # must exit 0 before every push
```

---

## Core Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| next | 14.2.5 | Framework |
| react | ^18 | UI |
| react-dom | ^18 | DOM rendering |
| typescript | ^5 | Type safety (strict mode) |
| @prisma/client | ^5.15.0 | Database ORM |
| next-auth | ^4.24.7 | Authentication |

---

## UI & Styling

| Package | Version | Purpose |
|---|---|---|
| tailwindcss | ^3.4.1 | CSS framework (v3 — uses tailwind.config.js) |
| tailwind-merge | ^2.3.0 | Merge Tailwind classes safely |
| tailwindcss-animate | ^1.0.7 | Animation utilities |
| clsx | ^2.1.1 | Conditional classnames |
| lucide-react | ^0.395.0 | Icons — use exclusively |
| framer-motion | ^12.38.0 | Animation — import from 'framer-motion' |
| sonner | ^1.5.0 | Toast notifications |
| canvas-confetti | ^1.9.4 | Confetti animation |

---

## Forms & Validation

| Package | Version | Purpose |
|---|---|---|
| react-hook-form | ^7.52.0 | Forms — must be this version |
| @hookform/resolvers | ^3.6.0 | RHF schema resolvers |
| zod | ^3.23.8 | Schema validation |

---

## Data & Charts

| Package | Version | Purpose |
|---|---|---|
| recharts | ^3.8.1 | Charts — use exclusively |
| date-fns | ^3.6.0 | Date utilities |
| papaparse | ^5.4.1 | CSV parsing |
| xlsx | ^0.18.5 | Excel/XLSX parsing |

---

## Drag & Drop

| Package | Version | Purpose |
|---|---|---|
| @dnd-kit/core | ^6.3.1 | DnD core |
| @dnd-kit/sortable | ^10.0.0 | Sortable lists |
| @dnd-kit/utilities | ^3.2.2 | DnD utilities |

---

## Maps & GIS

| Package | Version | Purpose |
|---|---|---|
| leaflet | ^1.9.4 | Map rendering |
| react-leaflet | ^4.2.1 | React leaflet bindings |
| leaflet-routing-machine | ^3.2.12 | Turn-by-turn routing |
| @turf/turf | ^7.3.4 | Geospatial calculations |

---

## Backend & Infrastructure

| Package | Version | Purpose |
|---|---|---|
| prisma | ^5.15.0 | ORM + migrations (devDep) |
| bcryptjs | ^2.4.3 | Password hashing |
| jose | ^4.15.9 | JWT utilities |
| otplib | ^13.4.0 | TOTP / 2FA |
| qrcode | ^1.5.4 | QR code generation |
| dompurify | ^3.3.3 | HTML sanitisation |
| html-to-image | ^1.11.13 | Screenshot / export |

---

## Payments & Comms

| Package | Version | Purpose |
|---|---|---|
| stripe | ^22.0.0 | Payments |
| @stripe/stripe-js | ^9.0.1 | Stripe frontend |
| twilio | ^5.13.1 | SMS |
| resend | ^6.10.0 | Email delivery |
| web-push | ^3.6.7 | Push notifications |

---

## Storage & Infrastructure

| Package | Version | Purpose |
|---|---|---|
| @vercel/blob | ^2.3.3 | File storage |
| @vercel/analytics | ^2.0.1 | Analytics |
| @vercel/speed-insights | ^2.0.0 | Performance |
| @upstash/ratelimit | ^2.0.8 | Rate limiting |
| @upstash/redis | ^1.37.0 | Redis client |
| sharp | ^0.34.5 | Image processing |

---

## Auth & Security

| Package | Version | Purpose |
|---|---|---|
| @simplewebauthn/browser | ^13.3.0 | WebAuthn (passkeys) |
| @simplewebauthn/server | ^13.3.0 | WebAuthn server |

---

## Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| prisma | ^5.15.0 | Migrations + studio |
| tsx | ^4.15.7 | Run TypeScript scripts |
| ts-node | ^10.9.2 | TypeScript runtime |
| jest | ^29.7.0 | Testing |
| jest-environment-jsdom | ^29.7.0 | Jest DOM environment |
| ts-jest | ^29.1.5 | Jest TypeScript support |
| @testing-library/react | ^16.0.0 | React testing |
| @testing-library/jest-dom | ^6.4.6 | Jest DOM matchers |
| eslint | ^8 | Linting |
| eslint-config-next | 14.2.5 | Next.js ESLint config |
| autoprefixer | ^10.0.1 | CSS vendor prefixes |
| postcss | ^8 | CSS processing |
| ws | ^8.20.0 | WebSocket (scripts) |

---

## Package Selection Reference

| Need | Use |
|---|---|
| Icons | lucide-react (exclusively) |
| Charts | recharts (exclusively) |
| Animation | framer-motion |
| Forms | react-hook-form@^7.52.0 |
| Validation | zod |
| Dates | date-fns |
| Toasts | sonner |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Maps | leaflet + react-leaflet |
| CSV parsing | papaparse |
| Excel parsing | xlsx |
| Styling | cn() from @/lib/utils (clsx + tailwind-merge) |

---

## DO NOT USE

| Banned | Use instead |
|---|---|
| framer-motion imports as 'motion/react' | `import { motion } from 'framer-motion'` |
| react-router-dom | Not needed — Next.js App Router |
| react-router | Not needed — Next.js App Router |
| react-dnd | @dnd-kit/core |
| konva | HTML canvas |
| Any icon lib except lucide-react | lucide-react |
| Any chart lib except recharts | recharts |
| pnpm / yarn | npm |

---

## Before Installing Any Package

1. Check package.json — it may already be installed
2. Verify it doesn't duplicate existing functionality
3. No new dependencies without a reason (each is a supply chain risk)
4. Run `npm run build` after installing — must exit 0
