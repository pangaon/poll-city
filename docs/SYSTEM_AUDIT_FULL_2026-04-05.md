# Poll City Full System Audit

Date: 2026-04-05
Scope: End-to-end platform audit covering product features, user journeys, architecture, and security posture.

## 1) Executive Status

Overall status: Production-capable with strong breadth and good core controls, plus specific hardening items still recommended for strict enterprise rollout.

Current posture:
- Feature breadth: High
- Core journey coverage: High
- Campaign isolation: High
- Auth/role control: High
- Abuse prevention maturity: Medium-High
- Auditability: High
- Operational hardening completion: Medium-High

## 2) Platform Architecture Snapshot

Application stack:
- Next.js App Router + TypeScript
- Prisma ORM + PostgreSQL
- NextAuth for session/JWT authentication
- Stripe billing integration
- PWA service worker + manifest

Domain modules:
- Campaign operations (dashboard, CRM, GOTV, canvassing, tasks)
- Public candidate intake + claim flow
- Social discovery and polls
- Print marketplace
- Import/export and data ingestion pipelines
- Team, permissions, and feature gating

Data/tenant model:
- Campaign-scoped data model with membership relation used as primary authorization boundary.
- All sensitive writes/read paths expected to validate campaign membership/role before access.

## 3) Full Feature Inventory (Clearly Explained)

### A. Campaign Operations
- Dashboard operations hub: campaign metrics, widgetized overview, stock operational modes, drag layout persistence.
- Campaign switcher: context switching across user memberships.
- Contacts CRM: search, filter, tags, timeline, inline edits.
- CRM column management: drag reorder, show/hide, resize; now server-backed preference sync.
- Custom fields: per-campaign schema extension.
- Tasks: assignee, priority, lifecycle statuses.
- Budget module: itemized planning with drag-and-drop ordering.

### B. Field and GOTV
- Turf builder and route preview.
- Walk app with canvasser location and outcomes.
- GOTV upload and priority list generation.
- Door/phone data capture and interaction logging.

### C. Volunteer and Sign Ops
- Volunteer management and profile activation flows.
- Volunteer onboarding token flow.
- Volunteer groups and shifts.
- Sign request tracking (request/install/remove).

### D. Analytics and Intelligence
- Election results analytics endpoints.
- Heat map analytics support.
- Intelligence/ops modules and lookup quick actions.

### E. Public Candidate and Official Journeys
- Public candidate pages and intake forms (question/support/volunteer/sign).
- Official directory and profile pages.
- Official claim request + claim verification flow.

### F. Social Voter Surface
- Social feed entry/navigation.
- Public poll participation and results UX.
- Social official profiles with follow/question interactions.

### G. Import/Export
- Smart import analyze/clean/duplicate review/execute path.
- Enterprise fuzzy dedupe (nickname normalization + typo tolerance + contact signal reconciliation).
- Import templates (built-in + campaign custom templates).
- Targeted import execution for contacts, volunteers, documents.
- Specialized exports (contacts, GOTV, walk list, signs, donations, volunteers, interactions).

### H. Team, Auth, Billing, Platform
- Team management: invite/role update/remove with permissions matrix.
- Credentials login + OAuth availability-aware UX.
- Billing and checkout via Stripe.
- Feature flags and tier gating.
- Help center and marketing/SEO baseline.
- PWA install support.

### I. Data Ingestion and Geo
- Nationwide officials ingest with pagination and mapping.
- Nationwide boundaries ingest and federal GeoJSON persistence.
- Postal lookup and district cache endpoints.

## 4) Full User Journey Audit

### Journey 1: Campaign Staff Onboarding to Operations
1. User logs in (credentials or configured OAuth).
2. Active campaign context is resolved from membership.
3. Dashboard loads campaign-scoped metrics and widgets.
4. Staff moves into CRM/canvassing/GOTV/tasks workflows.
5. Actions are persisted and audit events recorded for major mutations.

Status: Working end-to-end.

### Journey 2: CRM + Field Execution
1. Staff filters contacts and applies tags/support updates.
2. Field teams run walk or call workflows.
3. Interactions update contact timelines and flags.
4. GOTV uploads strike/target records and produce call priorities.

Status: Working with campaign-scoped controls.

### Journey 3: Public Candidate Engagement
1. Public user visits candidate page.
2. Turnstile/CAPTCHA challenge appears when enabled.
3. User submits question/support/volunteer/sign request with captcha token.
4. Server verifies token and stores inbound signal.

Status: Fixed and hardened (captcha client/server alignment completed).

### Journey 4: Official Claim
1. Official opens claim page.
2. Completes captcha where required.
3. Submits claim request and receives verification path.
4. Claim verify endpoint validates and updates claim state.

Status: Working; verification flow present.

### Journey 5: Smart Import Enterprise Path
1. User uploads CSV/Excel/TSV.
2. System analyzes columns and proposes mappings.
3. User applies template and selects target entity.
4. Duplicate review and clean checks run.
5. Import executes to selected entity and logs outcomes.

Status: Working for contacts/volunteers/documents; custom_fields execution still placeholder in current wizard flow.

### Journey 6: Voter Social Interaction
1. Voter discovers officials/candidates by location/search.
2. Voter responds to polls and optionally follows officials.
3. Candidate/official sees engagement through platform views.

Status: Working with duplicate-vote protections and hashed identity controls.

### Journey 7: Print Marketplace
1. Campaign creates print job request.
2. Shops bid on jobs.
3. Campaign selects bid and proceeds with escrow intent/release routes.

Status: Core flows built; real-world process operations depend on environment/payment setup.

### Journey 8: Billing and Subscription
1. User enters billing area.
2. Subscription status loads by user.
3. Checkout/webhook routes manage subscription lifecycle.

Status: Working baseline with Stripe integration.

## 5) Security Audit (Full)

### A. Authentication and Session Controls
Implemented:
- NextAuth-based session/JWT path.
- Secret wiring and active campaign/session propagation hardening.
- OAuth provider availability awareness in login UX.

Risk level: Low-Medium.

### B. Authorization and Tenant Isolation
Implemented:
- Membership checks for campaign access across protected APIs.
- Role-based controls on sensitive operations (team, exports, admin paths).
- Cross-campaign contact access restrictions added in key surfaces (including AI assist and quick-capture routes).

Risk level: Low for core paths; requires continuous route-by-route verification as APIs grow.

### C. Abuse Controls
Implemented:
- CAPTCHA on public candidate intake and claim request paths.
- Poll duplicate protections (application checks + DB constraints for authenticated patterns).
- Request size guards on major import/upload endpoints.

Known limitations:
- Anonymous poll abuse remains more bypassable than authenticated paths.
- Some size-guard strategy depends on content-length presence.

Risk level: Medium for high-adversarial public traffic.

### D. Input Validation and Data Safety
Implemented:
- Strong schema validation in many routes (zod + route-level checks).
- Enum/status validation in high-risk mutating routes.
- Safe URL checks in document-import execution path.

Risk level: Low-Medium.

### E. Auditability and Logging
Implemented:
- ActivityLog model and broad audit event coverage for campaign mutations/import/export.
- Import logs include processed/imported/updated/skipped/error counts.

Known gaps:
- Dedicated in-app audit log viewer is still a future-phase item.
- ConsentLog dual-record model noted as future enhancement.

Risk level: Low for backend traceability, Medium for operator UX/accessibility.

### F. Dependency and Operational Security
Implemented/Recommended:
- Build/typecheck gate passing.
- Regular npm audit and deployment-time scanning recommended.
- DB index/setup scripts and migration discipline required for full guarantees.

Risk level: Medium operationally if release discipline is inconsistent.

## 6) Current High-Value Gaps (Enterprise Readiness Delta)

1. Custom fields import execution path in wizard is not fully implemented.
2. Public abuse hardening can be extended with stricter global rate limiting and bot controls on all relevant anonymous routes.
3. Log access UX (admin-facing audit viewer) should be completed to close operational governance loop.
4. Seed/ingest reliability depends on stable DB connectivity and rerun strategy for long jobs.
5. Full compliance lifecycle tasks (retention/deletion/consent UX) should be completed for strict commercial governance profiles.

## 7) Readiness Summary

Ready now:
- Broad enterprise campaign workflows (CRM, canvassing, GOTV, team, exports, imports).
- Public candidate engagement with captcha enforcement.
- Officials and social surfaces with core interaction loops.
- Import templates and target-specific volunteer/document ingestion.

Recommended before strict enterprise/compliance launch:
- Close listed delta items.
- Re-run end-to-end security smoke tests and abuse simulations.
- Validate DB migration/deploy workflow and monitoring runbooks.

## 8) Source of Truth References

Primary source documents in this repository:
- FEATURE_MATRIX.md
- AUDIT_FIXES.md
- DEFECTS.md
- docs/architecture/ABUSE_AND_RISK_CONTROLS.md
- docs/architecture/AUDIT_AND_LOGGING_SPEC.md
- docs/CHANGELOG.md
- docs/USER_GUIDE.md
