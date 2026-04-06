# Feature-by-Feature Execution Checklist

Date: 2026-04-05
Mode: One feature at a time (implement -> verify -> commit -> push -> report)

Completion standard: see docs/FEATURE_COMPLETION_STANDARD.md.

Status key:
- **Built & Verified**: All 8 completion gates passed. E2E user journey works. Docs updated. Video script written.
- **API Complete**: Backend route exists with auth, permissions, DB operations. NOT journey-verified. Needs: Zod on all inputs, full audit logging, CHANGELOG, USER_GUIDE, marketing update, Adoni training, video walkthrough.
- **Pending**: Not started.

Required for every item before marking **Built & Verified**:
- End-to-end user journey works (UI -> API -> DB -> read surfaces).
- Security and campaign-scope controls verified.
- Audit logging verified for writes.
- docs/CHANGELOG.md, docs/USER_GUIDE.md, and src/app/(marketing)/marketing-client.tsx updated when applicable.
- FEATURE_MATRIX.md reflects final status.
- npm run docs:check:master, npm run verify:regression, and npm run build all pass.

Dependency planning requirement before implementation starts:
- Identify external dependencies and missing keys/config.
- Identify cross-feature data impacts (dashboard, exports, analytics, dynamic fields).
- Report "ready now" versus "ready once dependency connected" in feature completion report.

- [x] 1. Campaign Dashboard Widgets  | status: Built & Verified (server-synced layout + local fallback)  | commit: pending  | report: Completed with cross-device persistence and regression/build pass
- [x] 2. Campaign Switcher  | status: Built & Verified (session-consistent switch + redirect + validation)  | commit: pending  | report: Completed with immediate context update and improved switch reliability
- [x] 3. CRM Contact Management  | status: Built & Verified (multi-column sorting + API sort whitelist + operator hints)  | commit: pending  | report: Completed with Shift+click multi-sort for large-list campaign triage
- [x] 4. Contact Detail + Timeline  | status: Built & Verified (unified timeline + filters + search + activity log integration)  | commit: pending  | report: Completed with single-stream contact history for operator review and faster follow-up decisions
- [x] 5. Custom Fields  | status: Built & Verified (persistent ordering + card/table placement toggles + action hardening)  | commit: pending  | report: Completed with practical dynamic-field configuration controls for campaign workflows
- [x] 6. Turf Builder  | status: Built & Verified (leaderboard campaign scoping fix + assignment/status audit logs + turf size guardrails)  | commit: pending  | report: Completed with safer turf creation limits and accountable field operations
- [x] 7. Walk App + GPS  | status: Built & Verified (household visited tracking + campaign-scoped household visit API + offline queue support)  | commit: pending  | report: Completed with address-level completion tracking for field accountability
- [x] 8. GOTV Priority + Upload  | status: Built & Verified (tabbed GOTV engine + tiers API + election-day command metrics)  | commit: pending  | report: Completed with campaign-scoped scoring, strike-off progress, and live command-center pacing
- [x] 9. Volunteer Management  | status: Built & Verified (shift-hour crediting + expense approval transitions + volunteer ops stats dashboard)  | commit: pending  | report: Completed with manager-grade oversight for volunteer labor and reimbursements
- [x] 10. Sign Tracking  | status: API Complete (GET/PATCH/POST quick-capture + audit log + notifications)  | commit: pre-existing  | report: Backend complete — UI pending (GPT-Codex)
- [x] 11. Donation Logging  | status: API Complete (GET/PATCH donations + permission-gated + Stripe public checkout)  | commit: feb5be1  | report: Backend complete with permissions. Public Stripe donation at /api/public/candidates/[slug]/donate
- [x] 12. Task Management  | status: API Complete (GET/POST tasks + PATCH/DELETE [id])  | commit: pre-existing  | report: Backend complete — UI pending (GPT-Codex)
- [x] 13. Poll Builder + Results  | status: API Complete (GET/POST polls, GET/PATCH [id], POST/GET respond, GET verify-receipt)  | commit: pre-existing  | report: Full poll lifecycle with anonymous voting and receipt verification
- [x] 14. Push Subscription + Send  | status: API Complete (subscribe, send, schedule, history, stats, staff-alert, test)  | commit: pre-existing  | report: 7 notification endpoints, full lifecycle
- [x] 15. Campaign Analytics  | status: API Complete (5 endpoints: campaign overview, canvassing, supporters, donations, GOTV)  | commit: 297bfcc  | report: Full analytics suite with permission gating
- [x] 16. Print Job Wizard  | status: API Complete (GET/POST jobs, download, preview, templates)  | commit: pre-existing  | report: Full print job lifecycle
- [x] 17. Print Bidding + Escrow Intent  | status: API Complete (bids CRUD, payment create-intent + release)  | commit: pre-existing  | report: Stripe payment intents for print escrow
- [x] 18. Shop Directory + Onboarding  | status: API Complete (GET/POST shops, onboard route)  | commit: pre-existing  | report: Shop registration and directory
- [x] 19. Social Feed Entry + Nav  | status: API Complete (social accounts, posts, mentions CRUD + approval workflow)  | commit: pre-existing  | report: Multi-platform social management backend
- [x] 20. Social Poll Participation  | status: API Complete (polls accessible via social consent + notification system)  | commit: pre-existing  | report: Poll participation through social consent flow
- [x] 21. Social Official Profiles  | status: API Complete (officials directory, approval ratings, sentiment, questions)  | commit: pre-existing  | report: Full official profile API with public engagement
- [x] 22. Candidate Public Profile  | status: API Complete (GET /api/public/candidates/[slug] + support/volunteer/sign-request/question/events/donate)  | commit: pre-existing + 0653a1c  | report: Public page with Stripe donations, CRM contact creation
- [x] 23. Public Candidate Engagement  | status: API Complete (6 public interaction endpoints + Stripe checkout)  | commit: pre-existing + 0653a1c  | report: Support, volunteer, sign request, question, events, donate
- [x] 24. Officials Directory Search  | status: API Complete (GET /api/officials/directory with search, filters)  | commit: pre-existing  | report: Full directory API with postal code lookup
- [x] 25. Officials Claim Link Request  | status: API Complete (POST /api/claim/request + GET /api/claim/verify)  | commit: pre-existing  | report: Claim request and email verification flow
- [x] 26. In-App Help Center  | status: Built & Verified (public /help center + /help/[slug] video-first articles + ops /ops/videos and /ops/verify verification wall)  | commit: pending  | report: Completed with retroactive queue, mark-recorded flow, video hard gate, and Adoni training trigger
- [x] 27. Specialized CSV Exports  | status: Built (POST /api/export/targeted — 6 types, filters by street/ward/poll/support, CSV+JSON)  | commit: 0653a1c  | report: Completed with targeted export system supporting contacts, walklist, signs, gotv, volunteers, donations
- [x] 28. Team Management  | status: API Complete (GET team, PATCH/DELETE members, permission-gated, CampaignRole CRUD, audit log)  | commit: a09432c  | report: Enterprise permissions system with 55 granular permissions, 12 roles, trust levels, custom role creation
- [x] 29. Feature Flags / Tier Gating  | status: Built (33 flags, 3 tiers, campaign overrides, GET /api/feature-flags)  | commit: c6d70d8  | report: Free/Pro/Enterprise gating with sanitized overrides
- [ ] 30. Contact Slide-Over Panel  | status: Pending (hardening + docs/video gate done; final manual journey verification pending)  | commit: -  | report: Added load-error retry and save-failure surfacing, updated USER_GUIDE and contacts walkthrough script; remaining step is live UAT pass
- [x] 31. Error System  | status: Built (src/lib/errors/api-errors.ts — 18 typed error codes, standardized responses for auth/campaign/validation/rate-limit/tier/server errors)  | commit: pending  | report: Standardized error system ready for adoption across all API routes
- [x] 32. Officials Claim Verification  | status: API Complete (GET /api/claim/verify with token validation)  | commit: pre-existing  | report: Email token verification for official claims
- [x] 33. Campaign Creation Wizard  | status: API Complete (POST /api/campaigns with Zod validation, slug gen, auto-seeds 12 permission roles, links creator as admin with trust 5)  | commit: 09aeec4+  | report: Full campaign creation with enterprise permissions auto-seeded
- [x] 34. Credentials Login  | status: API Complete (NextAuth credentials + forgot/reset password + verify-reset-token)  | commit: pre-existing  | report: Full auth flow with 2FA support
- [x] 35. OAuth Login  | status: API Complete (NextAuth [...nextauth] with Google provider)  | commit: pre-existing  | report: OAuth via NextAuth
- [x] 36. Subscription Checkout  | status: API Complete (Stripe checkout, portal, invoices, webhook)  | commit: pre-existing  | report: Full Stripe billing integration
- [x] 37. Print Escrow Release  | status: API Complete (POST /api/print/payment/release)  | commit: pre-existing  | report: Stripe escrow release for completed print jobs
- [x] 38. Abuse Controls (Duplicate Vote, Size Guard)  | status: API Complete (rate limiting on all public endpoints, Turnstile CAPTCHA, poll vote dedup via receipt)  | commit: pre-existing  | report: Rate limiting + CAPTCHA + dedup
- [x] 39. Rate Limiting  | status: API Complete (enforceLimit on all mutation endpoints, per-user + per-IP)  | commit: pre-existing  | report: Redis-backed rate limiting across all public and auth endpoints
- [x] 40. CAPTCHA  | status: API Complete (Cloudflare Turnstile on public forms — support, volunteer, sign-request, question)  | commit: pre-existing  | report: Turnstile verification with graceful degradation
- [x] 41. Anonymous Polling  | status: API Complete (POST /api/polls/[id]/respond with receipt-based anonymity)  | commit: pre-existing  | report: Anonymous voting with receipt verification
- [x] 42. Error Boundary Component  | status: Built (ErrorBoundary resetKeys support + contacts list/detail integration)  | commit: pending  | report: Added recoverable UI boundary wrappers for Contacts routes with campaign/contact reset keys and fallback messaging
- [x] 43. Audit Logging  | status: API Complete (ActivityLog model used across all write operations)  | commit: pre-existing  | report: Campaign-scoped audit log on all mutations
- [x] 44. Marketing Landing + SEO  | status: Built (dynamic sitemap with candidate pages + official profiles, robots.txt, OG metadata on key pages)  | commit: pending  | report: SEO sitemap enhanced with dynamic candidate and official pages
- [x] 45. Progressive Web App Install  | status: Built (manifest.json + sw.js + icons + shortcuts for Walk List and Quick Capture)  | commit: pre-existing  | report: PWA installable with standalone display and app shortcuts
- [x] 46. User Profile Updates  | status: API Complete (PATCH /api/users/[id])  | commit: pre-existing  | report: User profile update endpoint
- [x] 47. Membership Roles/Permissions  | status: Built (Enterprise RBAC with 55 perms, 12 roles, trust levels, custom roles, CampaignRole CRUD)  | commit: a09432c  | report: Full enterprise permissions system
- [x] 48. Election/Official Seeding Scripts  | status: Built (22 seed scripts in prisma/seeds/ — officials, election results, boundaries, print templates, security rules, sample data)  | commit: pre-existing  | report: Comprehensive seed library
- [x] 49. Postal Code Geo Lookup Cache  | status: API Complete (GET /api/geo with postal code lookup + GeoDistrict cache)  | commit: pre-existing  | report: Geo lookup with ward/riding resolution
- [x] 50. Public/Private DTO Boundary  | status: Implemented (public API routes at /api/public/* return limited fields, internal routes require auth)  | commit: pre-existing  | report: Clear separation between public and authenticated API surfaces
- [x] 51. API Surface Breadth  | status: Built (195+ API routes covering all platform features)  | commit: various  | report: Comprehensive API coverage verified by Adoni training scan
- [x] 52. Candidate Webpage Newsletter Suite  | status: API Complete (subscribe, subscribers CRUD, bulk import, newsletter campaigns CRUD, send via Resend, CASL consent tracking)  | commit: b040f45  | report: Full newsletter system with consent-aware subscription and campaign sending
- [x] 53. Elected Officials Newsletter Suite  | status: API Complete (same API with officialId support, NewsletterSubscriber/NewsletterCampaign dual-scoped to campaign or official)  | commit: b040f45  | report: Shared newsletter infrastructure for both candidate and official use cases
- [ ] 54. Toronto Mayoral Seed Reliability  | status: Parked (downtime follow-up)  | commit: -  | report: Investigate intermittent Prisma P1001 connectivity during npm run db:seed:toronto-mayor and add retry/backoff + verification output
