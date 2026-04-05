# AI Bot Runbook

Date: 2026-04-05

## Purpose

Single-command runbook for daily enterprise bot gates and reporting.

## Daily command

Run:

```bash
npm run ai:ops:daily
```

This command runs:

1. `npm run security:gates`
2. `npm run test:contracts`
3. `npm run build`

## CI workflow

GitHub Actions workflow:

- `.github/workflows/enterprise-gates.yml`

Jobs:

1. `quality` (lint, test, build)
2. `security-and-contracts` (security gates, API contract checks)

## Daily reporting

Use template:

- `ops/ai-bots/templates/daily-report-template.md`

## Human approvals required

1. Production deploy approval
2. Secret/key rotation approval
3. App Store/TestFlight release approval

## Escalation policy

1. Any failed build or failed security gate blocks release.
2. Any critical security finding blocks merge.
3. Any API contract drift blocks mobile release.
