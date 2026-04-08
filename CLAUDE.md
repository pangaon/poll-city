# Poll City — Agent Standing Orders

This file is read automatically by every AI agent that works on this codebase.
These are not suggestions. They are non-negotiable rules.
George built this with 35 years in Canadian politics. Respect the craft.

---

## WHO WE ARE

Poll City is a full-stack political campaign platform serving Canadian candidates,
parties, and the public. It runs on Next.js 14 App Router + TypeScript + Prisma +
PostgreSQL (Railway) + Vercel. Three products share one monolith:
- **Campaign App** (app.poll.city) — CRM, canvassing, GOTV, donations, comms
- **Poll City Social** (social.poll.city) — civic engagement for the public
- **Intelligence Engine** — approval ratings, autonomous content, analytics

The platform owner is George. His word is final.

---

## THE MOST IMPORTANT RULE

**Run `npm run build` locally before every `git push`. Zero exceptions.**

`npx tsc --noEmit` is not enough. Next.js enforces routing rules that TypeScript
does not check. A passing `tsc` with a failing build is a lie. We do not lie here.

If the build fails: fix it before pushing. Do not push a broken build and call it done.
Do not tell George something is live until the Vercel deployment is green.

---

## BUILD CHECKLIST (run before every commit)

```
npm run build        ← must exit 0
npx tsc --noEmit     ← must exit 0
```

If either fails: stop, diagnose, fix, then re-run both.

---

## ARCHITECTURE RULES

1. **Single monolith.** One Next.js app. One Vercel project. One Railway PostgreSQL.
   Do not propose microservices, separate repos, or new databases.
   Exception: mobile app lives in `mobile/` inside this repo.

2. **Multi-tenant always.** Every DB query that touches campaign data must be
   scoped by `campaignId`. No exceptions. Leaking one campaign's data to another
   is a catastrophic trust failure.

3. **Dynamic route naming is a contract.** When adding API routes under an existing
   dynamic segment, match the existing slug name exactly.
   - `/api/events/[eventId]/...` — use `eventId`, not `id`
   - `/api/polls/[id]/...` — use `id`
   - `/api/officials/[id]/...` — use `id`
   Check `find src/app -type d -name "\[*\]"` before creating any new dynamic routes.
   Mismatched slugs at the same path level crash the entire build.

4. **Prisma schema changes require a migration.**
   Always run: `npx prisma migrate dev --name <description> --skip-seed`
   Never edit the schema without migrating. Never use `db push` in production.

5. **No new npm packages without a reason.** If a feature can be built with what's
   already installed, build it that way. Every new dependency is a supply chain risk
   and a maintenance burden.

---

## SECURITY RULES (non-negotiable)

1. Every API route must authenticate before doing anything. Use `apiAuth(req)` from
   `@/lib/auth/helpers` for campaign routes. Use `getServerSession(authOptions)` for
   server components.

2. Never trust user input. Validate with Zod at every API boundary.

3. Campaign data is always scoped. Verify `membership` before returning any campaign
   record. A user knowing a `campaignId` is not authorization.

4. SUPER_ADMIN routes check `session.user.role === "SUPER_ADMIN"` explicitly.
   Never rely on middleware alone for this.

5. Never log or return raw error objects to the client. Use the standardized error
   helpers in `@/lib/api/errors.ts`.

6. Never store secrets in code. They go in environment variables.
   See `.env.example` for the full list of required vars.

7. AI prompt injection: all user-supplied text going to Claude must pass through
   `sanitizePrompt()` from `@/lib/ai/sanitize-prompt.ts` first.

8. Rate limiting: public endpoints use `rateLimit(req, "api")`. Form submissions
   use `rateLimit(req, "form")`. Do not skip rate limiting on any public route.

---

## CODE STANDARDS

1. **TypeScript must be strict.** No `any` unless there is no alternative and you
   leave a comment explaining why. Use `unknown` and narrow it.

2. **Read before editing.** Never modify a file you haven't read in full (or at least
   the relevant section). Blind edits break things.

3. **Do not gold-plate.** Build exactly what was asked. No extra abstraction layers,
   no speculative future-proofing, no unsolicited refactors.

4. **Soft deletes everywhere.** Contact, Task, Sign, Volunteer, Donation, Event all
   have `deletedAt DateTime?`. Always filter `deletedAt: null` in queries. Never
   hard-delete these records.

5. **Optimistic UI.** When building client-side mutations, update state immediately
   and revert on error. Never make users wait for a spinner on simple edits.

6. **framer-motion for all animations.** Spring physics: `{ type: "spring", stiffness: 300, damping: 30 }`.
   Use `AnimatePresence` for enter/exit. The palette is Navy `#0A2342`, Green `#1D9E75`,
   Amber `#EF9F27`, Red `#E24B4A`.

7. **Mobile-first.** Every UI component must work at 390px width. Test it.

---

## ADONI LAWS (the AI assistant — do not break these)

Adoni is Poll City's AI assistant. He has a personality. Respect it.

1. No bullet points in Adoni responses.
2. No markdown headers in Adoni responses.
3. No markdown formatting of any kind in Adoni responses.
4. Maximum 8 sentences per response.
5. Canadian English spelling (colour, neighbour, programme).
6. Warm, direct, professional tone — like a senior campaign manager.
7. Adoni opens via `window.dispatchEvent(new CustomEvent("pollcity:open-adoni", { detail: { prefill } }))`.
   The listener lives in `src/components/adoni/adoni-chat.tsx`. Do not add a second listener anywhere else.
8. Never remove or replace the existing Adoni event listener. The mayor noticed when it broke.

---

## FILE TERRITORY

George maintains specific areas. Do not rewrite these without being asked:
- `src/components/adoni/` — Adoni's personality and memory
- `src/app/(marketing)/` — public-facing marketing pages
- `prisma/seed.ts` — demo data (edit only to add, never to remove)

Safe zones for AI agents:
- `src/app/api/` — API routes
- `src/lib/` — shared utilities
- `prisma/schema.prisma` — schema (but always migrate after)
- `mobile/` — mobile app

---

## WHAT HAPPENED LAST TIME (learn from it)

In April 2026, background agents built excellent features but pushed without running
`npm run build`. Two dynamic route conflicts caused 10+ consecutive failed Vercel
deployments. George saw a wall of red and nearly had a heart attack.

The fix was 5 minutes of work. The anxiety was unnecessary and could have been avoided.

**The lesson: a green local build before push is a courtesy to George, not a formality.**

---

## REPORTING TO GEORGE

George runs a campaign. He doesn't have time for hedging or technobabble.
When you finish work:
1. State what is live (not what you built — what is *live*).
2. List any manual steps George needs to take.
3. Flag any risks honestly. Do not bury bad news.
4. Be concise. George can read a diff.

Do not claim something works until you have verified it works.
Do not tell George a deployment is green until you have seen the green dot.

---

## THE SPIRIT OF THIS PROJECT

This platform is for Canadian democracy. Real candidates. Real voters. Real elections.
The October 2026 Ontario municipal elections are the first major target.
Every feature you build might be used by a first-time candidate trying to win their ward.
Build it like it matters. Because it does.

---

*These standing orders were written by Claude Sonnet 4.6 on 2026-04-08 at George's direction.
They apply to every AI agent — past, present, and future — that works on this codebase.*
