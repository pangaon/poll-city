# Poll City Research Brief

Version: v1.6.1  
Date: 2026-04-04  
Master reference: PRODUCT_BRIEF.md

## 1. Purpose and Scope

This brief consolidates the research foundation for Poll City across:

- Canadian election technology patterns and operating realities
- Privacy and communications law requirements (PIPEDA, CASL)
- Public civic data sources (Represent API, Ontario and BC election data)
- Competitive analysis and differentiation

PRODUCT_BRIEF.md remains the master product document. This file captures research rationale and evidence used to shape architecture, roadmap, and implementation priorities.

## 2. Canadian Election Technology Context

### 2.1 Municipal campaign operating constraints

Key characteristics of Canadian municipal campaigns that informed Poll City:

- Highly compressed campaign windows with nomination and election deadlines.
- Smaller teams and volunteer-heavy operations compared with federal/provincial campaigns.
- Heavy dependence on field execution: canvassing, sign deployment, GOTV calls, local events.
- Fragmented tooling in real campaigns (spreadsheets + messaging apps + ad hoc scripts).
- Need for local geographies (ward, poll, riding, postal code) and practical route planning.

Poll City design implications:

- Single platform across CRM, field, GOTV, polling, notifications, and print execution.
- Rapid onboarding and high-operability UX for volunteer and manager roles.
- Strong mobile/PWA support for canvassing and same-day operations.
- Cross-functional campaign dashboard rather than siloed modules.

### 2.2 2026 election timing context

From PRODUCT_BRIEF.md baseline planning:

- Ontario municipal election target: October 26, 2026.
- BC municipal election target: October 17, 2026.
- Nominations and operational timelines drive phase sequencing and onboarding urgency.

Research impact:

- Prioritize readiness for ward-level discovery, candidate visibility, and election-day reliability.
- Focus on two-province launch depth before broader expansion.

## 3. PIPEDA Research Summary

### 3.1 Why PIPEDA applies

Poll City handles personal information for campaign operations and civic engagement:

- Contact records, phone/email, postal/geographic attributes.
- Engagement signals (support level, follow-up status, consent events).
- Public-to-campaign bridge transfers where users intentionally share details.

PIPEDA-driven principles reflected in architecture:

- Data minimization for public APIs and DTOs.
- Purpose limitation for transferred data.
- Role-based access and campaign scoping to reduce unauthorized access.
- Auditability for significant data mutations.

### 3.2 Engineering outcomes linked to PIPEDA

Implemented or planned controls include:

- Campaign isolation by membership checks and campaignId scoping.
- Public/private DTO separation to avoid private data leakage.
- Activity logging for critical mutating operations.
- Consent bridge model with explicit transfer intent and log traceability.
- Security control roadmap for rate limiting, moderation, and data lifecycle hardening.

Open PIPEDA-adjacent items from security docs:

- Full campaign deletion workflow and retention lifecycle automation.
- Expanded consent revocation UX and lifecycle controls.
- More complete abuse protections (rate limits/CAPTCHA) before broad public scale.

## 4. CASL Research Summary

### 4.1 Practical compliance concern

Poll City supports voter/campaign communications including notifications and potential outreach channels. CASL relevance centers on:

- Consent for promotional or campaign messaging.
- Traceability and governance of outbound communications.
- Distinction between service notifications and campaign outreach.

### 4.2 Product implications

Current and planned alignment:

- Explicit opt-in flows for push notifications.
- Notification history and delivery logging through NotificationLog and related APIs.
- Consent-oriented bridge events and campaign-linked signal capture.
- Clear separation of anonymous/public interaction from authenticated campaign tools.

Future reinforcement opportunities:

- Centralized consent preference center for all channels.
- Stronger campaign-side guardrails for bulk messaging and segmentation.

## 5. Represent API Research and Usage

### 5.1 Why Represent API

Represent API is used as a high-value seed source for Canadian elected official records and geographic representation mapping.

Research conclusions:

- Useful bootstrap source for officials directory breadth.
- Good fit for public discoverability and official profile backfill.
- Requires normalization and validation layers for production reliability.

### 5.2 Integration shape in Poll City

Observed project patterns aligned with research:

- Seed and ingest scripts under prisma/seeds for officials and geography enrichment.
- Official model captures jurisdictional and contact/public profile fields.
- Public APIs expose safe official data for directory and social experiences.
- Geo lookup APIs support postal-driven discovery and cache behavior.

Known constraints and mitigation direction:

- Upstream completeness and freshness vary by locality.
- Poll City stores normalized local copies rather than relying on runtime-only upstream calls.
- Enrichment and correction paths should remain available for data quality improvement.

## 6. Ontario and BC Election Data Research

### 6.1 Ontario election data

Research and implementation focus include:

- Municipal context: ward and poll district discovery.
- Election result datasets across prior cycles for analytics and trend mapping.
- Localized support for campaign planning, targeting, and visualization.

Poll City usage:

- ElectionResult-backed analytics routes for historical performance views.
- Heat map endpoints and dashboard widgets for campaign interpretation.

### 6.2 BC election data

Research conclusions:

- BC provides strategic expansion value alongside Ontario for 2026 timelines.
- Data availability and granularity are municipality-dependent.
- Product must tolerate uneven source structure and naming conventions.

Design implications:

- Flexible ingestion scripts and schema mappings.
- Province-aware filtering and discoverability in officials/directory flows.

### 6.3 Data quality strategy from research

- Keep normalized data models with provenance-aware ingest scripts.
- Use seeded baseline + ongoing updates for election and official records.
- Avoid exposing internal-only records directly; enforce DTO boundaries.

## 7. Competitive Analysis Summary

### 7.1 Tooling landscape observed

Typical alternatives in municipal campaign environments:

- General-purpose CRMs not tailored to election workflows.
- Point solutions for texting/calls, separate mapping tools, and manual print workflows.
- Agency-managed campaign websites disconnected from voter operations.

### 7.2 Competitive gaps identified

Common pain points in alternatives:

- Fragmented workflow across multiple tools.
- Limited Canadian municipal localization.
- Weak integration between field canvassing and voter database updates.
- Minimal bridge between public civic engagement and campaign CRM.
- Little/no integrated print marketplace with bid and payment control.

### 7.3 Poll City differentiation from research

Poll City differentiation thesis:

- Unified campaign operations suite instead of stitched stack.
- Canadian municipal-first product strategy (Ontario + BC launch depth).
- Officials directory + social engagement surface plus campaign ops back office.
- Integrated print marketplace (jobs, bids, payment lifecycle).
- Security and compliance orientation included in core architecture docs.

## 8. Research-Driven Product Decisions (Traceability)

The following decisions map directly to this research:

- Public officials directory with postal and region-based discovery.
- Poll City Social as voter engagement and signal collection surface.
- Consent bridge to convert civic engagement into campaign-actionable data.
- Campaign-scoped authorization and DTO boundaries for privacy/security.
- Push notifications with subscription management and history/stats.
- Election analytics module backed by historical result datasets.
- Print marketplace to reduce campaign operational fragmentation.

## 9. Risks and Open Research Items

### 9.1 Data and legal risk themes

- Province/municipality data freshness and schema drift.
- Public-form abuse risks without universal rate limiting/CAPTCHA.
- Consent lifecycle completeness for all communication channels.

### 9.2 Next research tasks

- Formal source registry for Ontario/BC official result datasets with refresh cadence.
- Channel-by-channel CASL control matrix (email, SMS, push, campaign notices).
- Data retention/deletion policy implementation specification tied to legal obligations.
- Expanded competitive teardown by municipality size and campaign budget tier.

## 10. Relationship to Master Documentation

- PRODUCT_BRIEF.md remains the authoritative product and roadmap source.
- This brief provides research context and rationale that informed those decisions.
- Security-specific policy and controls are further detailed in SECURITY_BLUEPRINT.md.
