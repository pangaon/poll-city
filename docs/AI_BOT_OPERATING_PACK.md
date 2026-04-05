# AI Bot Operating Pack (Enterprise Delivery)

Date: 2026-04-05
Owner: Poll City Product and Engineering

## 1) Objective

Run a coordinated AI workforce that behaves like a 16-role enterprise team and ships safely with gates.

## 2) Bot Team (16 Roles)

| Bot | Mission | Inputs | Outputs | Hard Gate |
|---|---|---|---|---|
| Product Lead Bot A | Prioritization and release scope | Audit backlog, roadmap, incidents | Prioritized sprint plan | No unscoped work enters sprint |
| Product Lead Bot B | Journey and acceptance criteria | UX goals, feature requests | Stories with acceptance criteria | Stories must be testable |
| Backend Bot A | Auth, permissions, tenancy | API requirements, schema | Auth-safe API changes | Auth checks required |
| Backend Bot B | Core domains (contacts, officials, interactions) | Domain specs | Endpoint and data updates | No cross-tenant leakage |
| Backend Bot C | Reliability and exports | Load goals, export requirements | Streaming/batch-safe APIs | No hard caps without paging |
| Web Bot A | Admin workflow UX | Product stories | Admin UI changes | Accessibility + loading/error states |
| Web Bot B | CRM/Field/GOTV UX | Product stories | Campaign operations UX | Keyboard + mobile baseline |
| Web Bot C | Billing/settings/help UX | Product stories | Billing and settings UX | Empty-state and error-state coverage |
| iOS Bot A | App architecture and auth | Mobile requirements | Navigation + auth/session shell | Secure token handling |
| iOS Bot B | Data layer and offline | Sync strategy | Cache/store + queue foundations | Conflict handling defined |
| iOS Bot C | Sync, push, telemetry | Notification and monitoring plans | Push + sync + app telemetry | Background behavior verified |
| QA Bot A | Web/API regression | Acceptance criteria, routes | Regression suite and reports | Failing tests block release |
| QA Bot B | Mobile E2E + contracts | Mobile slices + API contracts | Mobile E2E and contract tests | Contract drift blocks release |
| DevOps Bot | CI/CD and environment ops | Pipelines, infra goals | Build/release automation | No release without green gates |
| Security Bot | AppSec and abuse controls | Threat model, auth/public routes | Security checks and remediation list | Critical findings block release |
| Design Bot | Enterprise workflow UX | Journey maps, usage goals | UX specs and interaction patterns | Task completion clarity |

## 3) Orchestration Flow

1. Intake: Product Lead Bot A classifies request (critical/high/medium, feature/security/perf).
2. Decomposition: Product Lead Bot B produces stories and acceptance criteria.
3. Parallel Build: Backend/Web/iOS bots execute by domain.
4. Verification: QA bots run regression and contract checks.
5. Security Review: Security bot runs mandatory checks.
6. Release Decision: DevOps bot confirms pipeline and deploy gates.
7. Audit Closure: Product Lead Bot A publishes final delivery note.

## 4) Definitions of Done (Applies to every task)

1. Code merged with passing checks.
2. Build passes clean.
3. Security checklist run and documented.
4. User-facing docs updated when behavior changes.
5. Changelog updated.
6. Rollback path documented for risky changes.

## 5) Required Runtime Integrations

1. Source control and CI: GitHub repository access with Actions enabled.
2. Model provider: OpenAI API key (or Azure OpenAI) for orchestration prompts.
3. Deploy platform: Vercel (web) and Apple App Store Connect (iOS).
4. Error monitoring: Sentry (web + iOS) or equivalent.
5. Tracing/metrics: Datadog/New Relic/Grafana stack.
6. Secrets manager: GitHub Actions Secrets + platform env secrets.

## 6) API Keys and Logins Needed

### Core platform

- GitHub org admin or repo admin login
- Vercel team owner/admin login
- PostgreSQL provider admin login (Railway/Supabase/AWS)
- Domain/DNS provider login

### Product features

- OpenAI or Azure OpenAI API key
- Resend API key
- Cloudflare Turnstile secret and site keys
- Stripe secret and webhook keys
- Optional: Twilio API credentials
- Optional: Upstash Redis REST URL and token
- Optional: Apple Sign In / Google OAuth credentials

### Mobile

- Apple Developer account (Team Agent/Admin)
- App Store Connect access
- Bundle ID and signing certificates/profiles
- TestFlight tester group setup

## 7) Governance and Safety Rules

1. No production deploy on red CI.
2. No schema-destructive DB operations.
3. Security critical/high findings must be fixed before release.
4. Any auth/public route change requires security bot review.
5. All exports/imports must be load-tested at realistic campaign scale.

## 8) Reporting Cadence

1. Daily bot report (completed, in-progress, blockers, risk).
2. Weekly enterprise readiness report.
3. Release report with artifact links (build, tests, security output).
