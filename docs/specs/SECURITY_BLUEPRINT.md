# Poll City Security Blueprint

Version: v3.0.0  
Date: 2026-04-04  
Master reference: PRODUCT_BRIEF.md

## 1. Purpose

This blueprint records the security architecture, decisions, and implementation posture for Poll City. It consolidates controls already implemented, controls in progress, and controls required before broader commercial rollout.

PRODUCT_BRIEF.md is the master product document; this file is the security decision companion.

## 2. Security Objectives

Primary objectives:

- Protect campaign, voter, and platform data against unauthorized access.
- Enforce tenant isolation between campaigns.
- Minimize data exposure through strict API contracts.
- Provide verifiable audit trails for critical actions.
- Align engineering controls with Canadian privacy obligations (PIPEDA) and campaign communication constraints.

## 3. Threat Model Overview

### 3.1 High-priority risks

- Cross-tenant data leakage between campaigns.
- Credential abuse and brute-force behavior on auth endpoints.
- Public endpoint abuse (poll voting, question spam, scraping).
- Data exfiltration via broad export functionality.
- Payment and webhook abuse in Stripe flows.
- Inconsistent consent handling across engagement channels.

### 3.2 Attack surfaces

- Public APIs (`/api/polls`, `/api/officials`, social/claim endpoints).
- Auth/session boundaries and role escalation risks.
- Campaign-mutating APIs (contacts, tasks, imports, notifications).
- File and CSV upload paths.
- Payment webhooks and platform marketplace payouts.

## 4. Security Architecture Decisions

### 4.1 Tenant isolation and authorization

Core decision: campaign data is always scoped by validated membership and server-side campaign context, never by untrusted client payload alone.

Implemented patterns:

- Membership role checks at campaign mutation points.
- Campaign-scoped query filters for contacts/tasks/fields and related entities.
- Cross-tenant assignment prevention for canvassing and volunteer operations.
- Middleware/public-path controls to isolate authenticated app routes.

Result:

- Campaign A users cannot read/write Campaign B data through standard route paths.

### 4.2 Public/private DTO boundary

Core decision: strict API contract separation.

Implemented patterns:

- Public DTOs for officials/polls expose only explicitly safe fields.
- Private campaign DTOs remain inaccessible from public routes.
- Identity-sensitive fields (for example internal IDs or private campaign metadata) withheld from public responses.

Result:

- Reduces accidental data overexposure and aligns with least-privilege data sharing.

### 4.3 Input and mutation protections

Implemented controls:

- Poll duplicate-vote controls (app checks + DB uniqueness backstops for authenticated cases).
- Request body size checks on major ingest/respond endpoints.
- Poll/value validation and bounded string/geo fields.
- Structured error handling and conflict signaling for duplicate/race conditions.

Remaining work:

- Global rate limiting policy enforcement.
- CAPTCHA on abuse-prone public write paths.

## 5. OWASP Alignment Summary

This is a practical control mapping against OWASP-style concerns.

### A01 Broken Access Control

Current state: partially mitigated, high-priority ongoing.

- Role/membership checks and campaign scoping are broadly implemented.
- Middleware and route-level checks protect private app surfaces.
- Residual risk remains where business-logic gaps could appear in new endpoints.

### A02 Cryptographic Failures

Current state: partially mitigated.

- Signed claim tokens use HMAC with server secret.
- Secure third-party payment channels via Stripe APIs.
- Further hardening needed for broader encryption-at-rest narratives and key rotation playbook documentation.

### A03 Injection

Current state: mostly mitigated.

- Prisma ORM parameterization used for core query paths.
- Raw SQL usage limited to controlled setup scripts.
- Continue to validate any future raw query additions.

### A04 Insecure Design

Current state: improving.

- Abuse controls doc exists with explicit missing-control backlog.
- Threat-aware backlog includes rate limiting, moderation, export controls, and data lifecycle features.

### A05 Security Misconfiguration

Current state: partially mitigated.

- Environment-driven configuration for auth, payments, notifications.
- Fallbacks added for several env-dependent paths to avoid unsafe runtime behavior.
- Ongoing need: environment baseline checklist and deployment hardening runbook.

### A07 Identification and Authentication Failures

Current state: partially mitigated.

- NextAuth credentials + optional OAuth; JWT session model.
- Missing central lockout/rate limiting controls for brute-force resilience.

### A09 Security Logging and Monitoring Failures

Current state: partially mitigated.

- ActivityLog covers many campaign mutations and bridge actions.
- Notification and delivery logs available.
- Missing dedicated security event dashboard and anomaly alerting.

## 6. Encryption and Secret Handling

### 6.1 In transit

- TLS is required in deployed environments.
- Stripe and external integrations use HTTPS endpoints.

### 6.2 At rest

- Data relies on managed PostgreSQL and provider-level encryption controls.
- Sensitive app logic avoids storing raw payment card data.

### 6.3 Application secrets

Key secrets include:

- `NEXTAUTH_SECRET` for auth/session and claim token signing context.
- Stripe secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
- VAPID keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).

Engineering decisions:

- Secret values sourced from environment variables.
- Added runtime-safe fallbacks where appropriate to prevent crash-only behavior.
- Public keys are only exposed where intended (browser-side VAPID public key).

## 7. VAPID and Push Security

Push stack decisions:

- Web Push subscriptions stored server-side with campaign/user context.
- VAPID keypair controls origin trust for push message signing.
- Subscription APIs and send/schedule/history paths include campaign-aware logic.
- Notification delivery tracking supports auditability and abuse investigation.

Operational guidance:

- Rotate VAPID keys with migration plan for existing subscriptions.
- Validate subscription ownership and expiration handling.

## 8. Stripe and Stripe Connect Security

### 8.1 Core Stripe billing

- Checkout sessions created server-side.
- Webhook signatures verified with `STRIPE_WEBHOOK_SECRET`.
- Subscription status persisted based on trusted webhook events.

### 8.2 Print marketplace + Stripe Connect

- Print shops onboard via server-generated Stripe Connect links.
- Payment intent and release flows kept on trusted server routes.
- Platform fee and payout lifecycle managed in backend flow.

Security implications:

- Protect against forged webhook/event payloads.
- Validate role/ownership before payment release actions.
- Preserve auditable transaction state transitions.

## 9. PIPEDA Compliance Engineering Controls

Controls implemented or partially implemented:

- Data minimization in public APIs through DTO boundaries.
- Tenant isolation to restrict access to campaign-owned personal data.
- Audit logging for critical data mutations.
- Consent bridge behavior with explicit event capture and limited transfer fields.

Controls still required for stronger compliance posture:

- Full data retention/deletion lifecycle automation.
- Broader consent lifecycle tooling (review/revoke/manage by channel).
- Expanded abuse protections to reduce unauthorized or automated data collection.

## 10. Data Governance and Logging

Current logging posture:

- ActivityLog records campaign-relevant create/update/delete and transfer actions.
- NotificationLog captures push send and delivery metadata.
- System-level security event logging (lockouts, anomaly alerts) remains limited.

Security recommendation:

- Add centralized security telemetry and alert rules for auth abuse, unusual exports, and cross-tenant anomaly patterns.

## 11. v3.0.0 Security Audit — Findings and Fixes (April 4, 2026)

Comprehensive OWASP-style audit completed. Full details in `docs/SECURITY_AUDIT_REPORT.md`.

### Fixed in v3.0.0:
- ✅ **Rate limiting:** Sliding-window limiter with 3 tiers (auth/form/read) applied to all public endpoints
- ✅ **Authentication gaps:** 2 unauthenticated mutation endpoints fixed (volunteer shift check-in, shift reminders)
- ✅ **Upload hardening:** Magic byte validation added; campaign membership verified before upload
- ✅ **Error message disclosure:** Raw error messages removed from API responses
- ✅ **Input validation:** Zod schemas added to all remaining unvalidated endpoints
- ✅ **Anonymous polling:** SHA-256 vote hashing system replaces userId storage in PollResponse
- ✅ **Voter receipt system:** Zero-knowledge vote verification via receipt codes
- ✅ **Database indexes:** Performance indexes added for Contact, ElectionResult, VolunteerProfile, PollResponse
- ✅ **IDOR fix:** Volunteer shift check-in verifies signupId belongs to target shift

### Remaining Gaps:
- CAPTCHA on anonymous/public abuse-prone submissions (recommended: Cloudflare Turnstile)
- Export guardrails and large-export alerting
- Complete campaign deletion and lifecycle retention controls
- Session refresh/invalidation improvements after campaign context changes
- Moderation workflow defaults for public Q&A content

## 12. Security Implementation Roadmap

### Phase A — COMPLETED (v3.0.0)

- ✅ Enforce endpoint-level rate limits (sliding window, 3 tiers)
- ✅ Fix all authentication gaps
- ✅ Harden upload verification (magic bytes + membership check)
- ✅ Implement anonymous polling with cryptographic vote hashing
- ✅ Add voter receipt verification system

### Phase B (short-term)

- Add CAPTCHA for anonymous writes (Cloudflare Turnstile recommended)
- Add export frequency guardrails and privileged alerts
- Add consent revocation and communication preference center

### Phase C (operational maturity)

- Security dashboard and alerting automation
- Secret rotation runbooks and periodic verification
- Formal recurring control reviews against OWASP and privacy obligations
- Upgrade Next.js to v15+ to resolve critical dependency vulnerability

## 13. Security Decision Register (Condensed)

- Decision: campaign-scoped authorization at API layer.  
  Reason: prevent cross-tenant leakage.  
  Status: implemented broadly.

- Decision: strict public/private DTO contract separation.  
  Reason: privacy-by-design and data minimization.  
  Status: implemented for officials/polls and campaign-private data.

- Decision: signed claim verification token flow.  
  Reason: protect profile-claim integrity.  
  Status: implemented with HMAC signing.

- Decision: Stripe/Connect server-managed payment lifecycle.  
  Reason: avoid exposing payment trust boundaries to client.  
  Status: implemented.

- Decision: push notification security with VAPID keypair.  
  Reason: authenticated push signing and delivery trust.  
  Status: implemented.

- Decision: anonymous polling with SHA-256 vote hashing.  
  Reason: voter trust requires provable anonymity — userId must never be stored alongside vote.  
  Status: implemented v3.0.0. See docs/ANONYMOUS_POLLING_TECHNICAL.md.

- Decision: sliding-window rate limiting with tiered thresholds.  
  Reason: prevent abuse of public endpoints (DDoS, scraping, email spam).  
  Status: implemented v3.0.0. Three tiers: auth (10/min), form (5/hr), read (100/min).

## 14. Relationship to Master Documentation

- PRODUCT_BRIEF.md is the canonical product strategy and scope reference.
- This blueprint translates product scope into concrete security architecture and controls.
- Research rationale supporting these controls is documented in RESEARCH_BRIEF.md.
