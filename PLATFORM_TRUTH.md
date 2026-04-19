# PLATFORM TRUTH — Read this in 30 seconds. Know it cold.

This file contains the facts that have caused the most mistakes.
Read it at session start. Every session. No exceptions.

---

## WHO IS GEORGE
George Hatzis. 35 years Canadian politics. Founder of Poll City. SUPER_ADMIN on the platform.
He does not tolerate mistakes, wasted time, or wasted money. Build like it matters.

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
