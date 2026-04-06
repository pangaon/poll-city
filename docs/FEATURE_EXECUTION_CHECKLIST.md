# Feature-by-Feature Execution Checklist

Date: 2026-04-05
Mode: One feature at a time (implement -> verify -> commit -> push -> report)

Completion standard: see docs/FEATURE_COMPLETION_STANDARD.md.

Required for every item before marking complete:
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
- [ ] 13. Poll Builder + Results  | status: Pending  | commit: -  | report: -
- [x] 14. Push Subscription + Send  | status: API Complete (subscribe, send, schedule, history, stats, staff-alert, test)  | commit: pre-existing  | report: 7 notification endpoints, full lifecycle
- [x] 15. Campaign Analytics  | status: API Complete (5 endpoints: campaign overview, canvassing, supporters, donations, GOTV)  | commit: 297bfcc  | report: Full analytics suite with permission gating
- [x] 16. Print Job Wizard  | status: API Complete (GET/POST jobs, download, preview, templates)  | commit: pre-existing  | report: Full print job lifecycle
- [x] 17. Print Bidding + Escrow Intent  | status: API Complete (bids CRUD, payment create-intent + release)  | commit: pre-existing  | report: Stripe payment intents for print escrow
- [x] 18. Shop Directory + Onboarding  | status: API Complete (GET/POST shops, onboard route)  | commit: pre-existing  | report: Shop registration and directory
- [ ] 19. Social Feed Entry + Nav  | status: Pending  | commit: -  | report: -
- [ ] 20. Social Poll Participation  | status: Pending  | commit: -  | report: -
- [ ] 21. Social Official Profiles  | status: Pending  | commit: -  | report: -
- [x] 22. Candidate Public Profile  | status: API Complete (GET /api/public/candidates/[slug] + support/volunteer/sign-request/question/events/donate)  | commit: pre-existing + 0653a1c  | report: Public page with Stripe donations, CRM contact creation
- [x] 23. Public Candidate Engagement  | status: API Complete (6 public interaction endpoints + Stripe checkout)  | commit: pre-existing + 0653a1c  | report: Support, volunteer, sign request, question, events, donate
- [x] 24. Officials Directory Search  | status: API Complete (GET /api/officials/directory with search, filters)  | commit: pre-existing  | report: Full directory API with postal code lookup
- [x] 25. Officials Claim Link Request  | status: API Complete (POST /api/claim/request + GET /api/claim/verify)  | commit: pre-existing  | report: Claim request and email verification flow
- [x] 26. In-App Help Center  | status: Built & Verified (public /help center + /help/[slug] video-first articles + ops /ops/videos and /ops/verify verification wall)  | commit: pending  | report: Completed with retroactive queue, mark-recorded flow, video hard gate, and Adoni training trigger
- [x] 27. Specialized CSV Exports  | status: Built (POST /api/export/targeted — 6 types, filters by street/ward/poll/support, CSV+JSON)  | commit: 0653a1c  | report: Completed with targeted export system supporting contacts, walklist, signs, gotv, volunteers, donations
- [x] 28. Team Management  | status: API Complete (GET team, PATCH/DELETE members, permission-gated, CampaignRole CRUD, audit log)  | commit: a09432c  | report: Enterprise permissions system with 55 granular permissions, 12 roles, trust levels, custom role creation
- [x] 29. Feature Flags / Tier Gating  | status: Built (33 flags, 3 tiers, campaign overrides, GET /api/feature-flags)  | commit: c6d70d8  | report: Free/Pro/Enterprise gating with sanitized overrides
- [ ] 30. Contact Slide-Over Panel  | status: Pending  | commit: -  | report: -
- [ ] 31. Error System  | status: Pending  | commit: -  | report: -
- [x] 32. Officials Claim Verification  | status: API Complete (GET /api/claim/verify with token validation)  | commit: pre-existing  | report: Email token verification for official claims
- [ ] 33. Campaign Creation Wizard  | status: Pending  | commit: -  | report: -
- [x] 34. Credentials Login  | status: API Complete (NextAuth credentials + forgot/reset password + verify-reset-token)  | commit: pre-existing  | report: Full auth flow with 2FA support
- [x] 35. OAuth Login  | status: API Complete (NextAuth [...nextauth] with Google provider)  | commit: pre-existing  | report: OAuth via NextAuth
- [x] 36. Subscription Checkout  | status: API Complete (Stripe checkout, portal, invoices, webhook)  | commit: pre-existing  | report: Full Stripe billing integration
- [ ] 37. Print Escrow Release  | status: Pending  | commit: -  | report: -
- [ ] 38. Abuse Controls (Duplicate Vote, Size Guard)  | status: Pending  | commit: -  | report: -
- [ ] 39. Rate Limiting  | status: Pending  | commit: -  | report: -
- [ ] 40. CAPTCHA  | status: Pending  | commit: -  | report: -
- [ ] 41. Anonymous Polling  | status: Pending  | commit: -  | report: -
- [ ] 42. Error Boundary Component  | status: Pending  | commit: -  | report: -
- [ ] 43. Audit Logging  | status: Pending  | commit: -  | report: -
- [ ] 44. Marketing Landing + SEO  | status: Pending  | commit: -  | report: -
- [ ] 45. Progressive Web App Install  | status: Pending  | commit: -  | report: -
- [ ] 46. User Profile Updates  | status: Pending  | commit: -  | report: -
- [ ] 47. Membership Roles/Permissions  | status: Pending  | commit: -  | report: -
- [ ] 48. Election/Official Seeding Scripts  | status: Pending  | commit: -  | report: -
- [ ] 49. Postal Code Geo Lookup Cache  | status: Pending  | commit: -  | report: -
- [ ] 50. Public/Private DTO Boundary  | status: Pending  | commit: -  | report: -
- [ ] 51. API Surface Breadth  | status: Pending  | commit: -  | report: -
- [ ] 52. Candidate Webpage Newsletter Suite  | status: Pending  | commit: -  | report: Add signup capture, subscriber ingest pipeline, and bulk import support for campaign newsletter operations
- [ ] 53. Elected Officials Newsletter Suite  | status: Pending  | commit: -  | report: Add official-profile newsletter signup, consent-aware ingest, and bulk import support for constituent communications
- [ ] 54. Toronto Mayoral Seed Reliability  | status: Parked (downtime follow-up)  | commit: -  | report: Investigate intermittent Prisma P1001 connectivity during npm run db:seed:toronto-mayor and add retry/backoff + verification output
