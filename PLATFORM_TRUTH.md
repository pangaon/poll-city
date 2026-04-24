# PLATFORM TRUTH — Read this in 30 seconds. Know it cold.

This file contains the facts that have caused the most mistakes.
Read it at session start. Every session. No exceptions.

---

## WHO IS GEORGE
George Hatzis. 35 years Canadian politics. Founder of Poll City. SUPER_ADMIN on the platform.
He does not tolerate mistakes, wasted time, or wasted money. Build like it matters.

## THE FOUR CODEBASES — KNOW ALL OF THEM BEFORE TOUCHING ANYTHING

There are FOUR deployable products in this repo. Never assume there is only one.

| Directory | What it is | Stack | Status |
|---|---|---|---|
| `src/` | Poll City web app — campaign OS + social + marketing | Next.js 14, Vercel | Live at app.poll.city |
| `mobile/` | Poll City Campaign mobile app — canvassers, field, eday | Expo (React Native) | Built, NOT on App Store |
| `mobile-pcs/` | Poll City Social mobile app — public voters, discovery | Expo (React Native) | Built, NOT on App Store |
| `desktop/` | Poll City desktop app — Mac (.dmg) + Windows (.exe) | Electron | Built, NOT distributed |

Also present (NOT apps):
- `figma_design_pollcity_iosapp/` — Figma iOS design reference files
- `ops/` — George's AI bots and automation scripts
- `apps/`, `packages/` — future monorepo stubs, no active code

**Both mobile apps need Apple credentials in their `eas.json` before any iOS build.**
- `mobile/eas.json` — placeholder values: YOUR_APPLE_ID, YOUR_APP_STORE_CONNECT_APP_ID, YOUR_TEAM_ID
- `mobile-pcs/eas.json` — placeholder values: REPLACE_WITH_APPLE_ID, etc.
- Bundle IDs: `com.pollcity.app` (campaign) · `ca.pollcity.social` (social)

## INFRASTRUCTURE (burned 1 hour getting this wrong on 2026-04-18)
- **App runs on VERCEL** — vercel.com → pangaon's projects → poll-city
- **Railway is the DATABASE ONLY** — PostgreSQL, nothing else
- **ALL env vars go in Vercel** → Settings → Environment Variables
- Never tell George to add env vars in Railway. Ever.

## THE ONLY WAY TO PUSH
```
npm run push:safe
```
Never `git push` directly. Never `npm run build` then push separately.
`push:safe` builds first. If build fails, it does not push. That's the point.

## UX STANDARD — STRIPE QUALITY
Every user-facing flow must be as guided and clear as Stripe's onboarding.
Every step: what it does, why it matters, what comes next. No dead ends. No jargon.
Ask: "would a first-time candidate understand this without help?" If no — rewrite it.

## DATABASE RULES
- Every query touching campaign data must be scoped by `campaignId`
- Every query on Contact/Task/Sign/Donation must filter `deletedAt: null`
- Schema changes require `npx prisma db push` run by George (AI can't reach Railway)

## BEFORE TELLING GEORGE TO DO ANYTHING
1. Verify it actually needs doing — check if it's already done first
2. Verify you know which service/platform it lives on
3. Give exact steps — never "go to the settings" without saying which settings on which platform
4. If you're not sure, say so. Do not guess.

---
*Last updated: 2026-04-18. Update this file when new critical facts emerge.*
