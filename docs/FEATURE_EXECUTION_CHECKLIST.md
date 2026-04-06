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
- [ ] 10. Sign Tracking  | status: Pending  | commit: -  | report: -
- [ ] 11. Donation Logging  | status: Pending  | commit: -  | report: -
- [ ] 12. Task Management  | status: Pending  | commit: -  | report: -
- [ ] 13. Poll Builder + Results  | status: Pending  | commit: -  | report: -
- [ ] 14. Push Subscription + Send  | status: Pending  | commit: -  | report: -
- [ ] 15. Campaign Analytics  | status: Pending  | commit: -  | report: -
- [ ] 16. Print Job Wizard  | status: Pending  | commit: -  | report: -
- [ ] 17. Print Bidding + Escrow Intent  | status: Pending  | commit: -  | report: -
- [ ] 18. Shop Directory + Onboarding  | status: Pending  | commit: -  | report: -
- [ ] 19. Social Feed Entry + Nav  | status: Pending  | commit: -  | report: -
- [ ] 20. Social Poll Participation  | status: Pending  | commit: -  | report: -
- [ ] 21. Social Official Profiles  | status: Pending  | commit: -  | report: -
- [ ] 22. Candidate Public Profile  | status: Pending  | commit: -  | report: -
- [ ] 23. Public Candidate Engagement  | status: Pending  | commit: -  | report: -
- [ ] 24. Officials Directory Search  | status: Pending  | commit: -  | report: -
- [ ] 25. Officials Claim Link Request  | status: Pending  | commit: -  | report: -
- [x] 26. In-App Help Center  | status: Built & Verified (public /help center + /help/[slug] video-first articles + ops /ops/videos and /ops/verify verification wall)  | commit: pending  | report: Completed with retroactive queue, mark-recorded flow, video hard gate, and Adoni training trigger
- [ ] 27. Specialized CSV Exports  | status: Pending  | commit: -  | report: -
- [ ] 28. Team Management  | status: Pending  | commit: -  | report: -
- [ ] 29. Feature Flags / Tier Gating  | status: Pending  | commit: -  | report: -
- [ ] 30. Contact Slide-Over Panel  | status: Pending  | commit: -  | report: -
- [ ] 31. Error System  | status: Pending  | commit: -  | report: -
- [ ] 32. Officials Claim Verification  | status: Pending  | commit: -  | report: -
- [ ] 33. Campaign Creation Wizard  | status: Pending  | commit: -  | report: -
- [ ] 34. Credentials Login  | status: Pending  | commit: -  | report: -
- [ ] 35. OAuth Login  | status: Pending  | commit: -  | report: -
- [ ] 36. Subscription Checkout  | status: Pending  | commit: -  | report: -
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
