# Contributing to Poll City

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+
- A `.env` file with required variables (see `.env.example` if present)

## Initial Setup

1. Install dependencies:
   - `npm install`
2. Generate Prisma client:
   - `npx prisma generate`
3. Apply database migrations:
   - `npx prisma migrate deploy`
4. (Optional, local dev) seed data:
   - `npx prisma db seed`

## Run Locally

1. Start dev server:
   - `npm run dev`
2. Open app:
   - `http://localhost:3000`

## Quality Gates

Run before opening a PR:

1. Type check:
   - `npx tsc --noEmit`
2. Production build:
   - `npm run build`
3. Tests (if you changed tested areas):
   - `npm test`

## Branch and Commit Guidance

1. Create a branch from `main`.
2. Keep commits focused and atomic.
3. Use clear conventional commit messages (for example `fix:`, `feat:`, `docs:`).

## Database and Prisma Notes

- Keep schema changes in `prisma/schema.prisma` plus generated migration files.
- Avoid breaking existing enums or columns without migration strategy.
- Re-run `npx prisma generate` after schema changes.

## Security and Privacy Expectations

- Never log secrets, tokens, or passwords.
- Prefer environment-variable fallbacks where runtime-safe.
- Keep public and private DTO boundaries intact for API responses.

## Pull Request Checklist

- [ ] Code builds and type-checks cleanly
- [ ] New routes have auth/privacy checks if needed
- [ ] New UI has loading/error states where appropriate
- [ ] Documentation updated (`README.md`, `docs/CHANGELOG.md`, or feature docs)
- [ ] No debug routes or leftover `console.log` in production code
