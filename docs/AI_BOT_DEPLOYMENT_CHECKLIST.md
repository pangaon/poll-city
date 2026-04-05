# AI Bot Deployment Checklist

Date: 2026-04-05

## A) What I Can Do For You (inside this codebase)

1. Create and maintain bot role definitions and orchestration docs.
2. Add CI gates (build, lint, tests, security checks).
3. Implement code changes requested by bots.
4. Generate deployment scripts and runbooks.
5. Produce daily and release audit reports.

## B) What You Must Provide (external account ownership)

1. Account access and approvals:
- GitHub repository admin
- Vercel project/team admin
- Database provider admin
- Apple Developer + App Store Connect access

2. Secrets and keys:
- OPENAI_API_KEY or Azure OpenAI credentials
- DATABASE_URL
- NEXTAUTH_SECRET and NEXTAUTH_URL
- RESEND_API_KEY
- TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY
- STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
- Optional integrations from docs/ENVIRONMENT_VARIABLES.md

3. Compliance and legal decisions:
- Data retention policy
- Incident response owner
- Privacy policy owner

## C) Minimum Deployment Sequence

1. Add required secrets in Vercel and GitHub Actions.
2. Enable branch protection on main.
3. Enable required status checks:
- build
- test
- security-scan
4. Configure staging and production environments.
5. Run first dry-run release on staging.
6. Sign off and deploy to production.

## D) iOS-Specific Deployment Sequence

1. Create app record in App Store Connect.
2. Configure bundle identifier and signing.
3. Create CI signing strategy (manual or fastlane match).
4. Build and distribute to TestFlight.
5. Run beta validation cycle.
6. Promote to production after go/no-go review.

## E) Fast Start (Today)

1. Confirm toolchain decision: React Native for iOS-first with Android-ready base.
2. Confirm auth strategy: JWT access + rotating refresh.
3. Confirm offline scope: read cache + queued writes for interactions first.
4. Confirm API versioning: /api/v1.
5. Start Week 1 architecture sprint.
