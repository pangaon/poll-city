# Poll City Feature Matrix (v3.0.0 — Security Release)

Source inputs reviewed:
- PRODUCT_BRIEF.md
- STATUS_REPORT.md
- docs/architecture/ABUSE_AND_RISK_CONTROLS.md
- docs/architecture/AUDIT_AND_LOGGING_SPEC.md
- docs/architecture/API_AND_INTEGRATION_CONTRACTS.md
- RESEARCH_BRIEF.md
- SECURITY_BLUEPRINT.md

Verification note: all master references above are present in this repository.

v1.8.0 additions included in this baseline:
- Volunteer onboarding flow (`/volunteer/onboard/[token]`, `/api/volunteer/onboard/[token]`)
- Volunteer groups and shifts (`/volunteers/groups`, `/volunteers/shifts`, related APIs)
- Canvassing scripts (`/canvassing/scripts`, `/api/canvassing/scripts`)
- Campaign ops modules: media, coalitions, intelligence, events, volunteer expenses, budget
- Lookup quick actions (`/api/lookup/quick-action`) with field encounter logging
- Super supporters module (`/supporters/super`)

| Feature Name | Category | Status | Page Route | API Route | Database Model | Has Real Data | Priority | Notes |
|---|---|---|---|---|---|---|---|---|
| Campaign Dashboard Widgets | Campaign Operations | ✅ Built & Verified | /dashboard | /api/campaigns/current | Campaign, Membership | Yes | High | Preset layouts + widget persistence implemented. |
| Campaign Switcher | Campaign Operations | ✅ Built & Verified | /campaigns | /api/campaigns/switch | User, Campaign, Membership | Yes | High | Active campaign context switching works. |
| CRM Contact Management | Contacts & CRM | ✅ Built & Verified | /contacts | /api/contacts, /api/contacts/column-preferences | Contact, Tag, ContactTag, CrmColumnPreference | Yes | High | Search/filtering/tagging/pagination plus server-synced column preferences (order/visibility/widths). |
| Contact Detail + Timeline | Contacts & CRM | ✅ Built & Verified | /contacts/[id] | /api/contacts/[id], /api/interactions | Contact, Interaction | Yes | High | Campaign-scoped access checks in place. |
| Custom Fields | Contacts & CRM | ✅ Built & Verified | /settings/fields | /api/campaign-fields, /api/custom-field-values | CampaignField, CustomFieldValue | Yes | Medium | Per-campaign custom schema. |
| Turf Builder | Canvassing & Field | ✅ Built & Verified | /canvassing/turf-builder | /api/turf, /api/turf/preview | Turf, TurfStop | Strong | High | Added campaign-scoped leaderboard aggregation, lifecycle audit logs, and turf-size guardrails. |
| Walk App + GPS | Canvassing & Field | ✅ Built & Verified | /canvassing/walk | /api/canvasser/location, /api/canvass | CanvassAssignment, CanvasserLocation | Partial | High | Field execution flows implemented. |
| GOTV Priority + Upload | GOTV | ✅ Built & Verified | /gotv | /api/gotv, /api/gotv/upload, /api/gotv/priority-list | GotvBatch, Contact | Yes | High | Upload + call priority list available. |
| Volunteer Management | Volunteers | ✅ Built & Verified | /volunteers | /api/volunteers, /api/volunteers/bulk-activate | VolunteerProfile, User | Yes | Medium | Bulk activation/deactivation supported. |
| Sign Tracking | Signs | ✅ Built & Verified | /signs | /api/signs, /api/signs/quick-capture | Sign, SignRequest | Partial | Medium | Request/install/remove flow present. |
| Donation Logging | Donations | ✅ Built & Verified | /donations | /api/donations, /api/donations/quick-capture | Donation | Partial | Medium | Manual capture and list operational. |
| Task Management | Tasks | ✅ Built & Verified | /tasks | /api/tasks, /api/tasks/[id] | Task | Yes | Medium | Status/priority/assignee lifecycle. |
| Poll Builder + Results | Polls | ✅ Built & Verified | /polls | /api/polls, /api/polls/[id], /api/polls/[id]/respond | Poll, PollOption, PollResponse | Yes | High | Multiple poll types and result views. |
| Push Subscription + Send | Notifications & Push | ✅ Built & Verified | /notifications | /api/notifications/subscribe, /api/notifications/send | PushSubscription, NotificationLog | Partial | High | Scheduling/history/stats are implemented. |
| Campaign Analytics | Analytics | ✅ Built & Verified | /analytics | /api/analytics/election-results, /api/analytics/heat-map | ElectionResult, Contact | Yes | Medium | Heat maps and exports available. |
| Print Job Wizard | Print Marketplace | ✅ Built & Verified | /print/jobs/new | /api/print/jobs | PrintJob | Partial | High | Multi-step request flow built. |
| Print Bidding + Escrow Intent | Print Marketplace | ✅ Built & Verified | /print/jobs/[id] | /api/print/jobs/[id]/bids, /api/print/payment/create-intent | PrintBid, PrintPayment | Partial | High | Bid compare and staged payment present. |
| Shop Directory + Onboarding | Print Marketplace | ✅ Built & Verified | /print/shops, /print/shops/register | /api/print/shops, /api/print/shops/onboard | PrintShop | Partial | Medium | Stripe Connect onboarding linked. |
| Social Feed Entry + Nav | Poll City Social | ✅ Built & Verified | /social | /api/social/my-notifications | User, Notification | Partial | Medium | Top and bottom social navigation present. |
| Social Poll Participation | Poll City Social | ✅ Built & Verified | /social/polls, /social/polls/[id] | /api/polls, /api/polls/[id]/respond | PollResponse | Yes | Medium | Public voting and result UX available. |
| Social Official Profiles | Poll City Social | ✅ Built & Verified | /social/officials, /social/officials/[id] | /api/officials, /api/officials/[id]/questions | Official, PublicQuestion, OfficialFollow | Yes | Medium | Question and follow experiences present. |
| Candidate Public Profile | Candidate Public Pages | ✅ Built & Verified | /candidates/[slug] | /api/public/candidates/[slug] | Campaign, Official | Partial | High | Public campaign microsite implemented. |
| Public Candidate Engagement | Candidate Public Pages | ✅ Built & Verified | /candidates/[slug] | /api/public/candidates/[slug]/question, /support, /volunteer, /sign-request | Question, SupportSignal, SignRequest | Partial | High | Public inbound actions flow into campaign data. |
| Officials Directory Search | Officials Directory | ✅ Built & Verified | /officials | /api/officials/directory, /api/officials | Official | Yes | High | Postal/search + filters + pagination. |
| Officials Claim Link Request | Claim Flow | ✅ Built & Verified | /claim/[slug] | /api/claim/request | Official | Yes | High | Resend email provider wired (v3.0.0). |
| In-App Help Center | Support | ✅ Built & Verified | /help | — | — | Yes | Medium | 16 articles across 13 categories with search (v4.0.0). |
| Specialized CSV Exports | Import/Export | ✅ Built & Verified | /import-export | /api/export/* (7 endpoints), /api/import/templates, /api/import/volunteers/execute, /api/import/documents/execute | ExportLog, CampaignImportTemplate, CampaignDocument | Yes | High | Added enterprise import templates and target-specific volunteer/document execution with audit logs (v4.0.5). |
| Team Management | Team | ✅ Built & Verified | /settings/team | /api/team, /api/team/invite | Membership | Yes | High | Role change, invite, remove (v4.0.0). |
| Feature Flags / Tier Gating | Billing | ✅ Built & Verified | — | src/lib/feature-flags.ts | — | Yes | High | 21 features × 5 plans with FeatureGate component (v4.0.0). |
| Contact Slide-Over Panel | CRM | ✅ Built & Verified | /contacts | /api/contacts/[id] | Contact | Yes | High | Inline edit, support level, notes, activity (v4.0.0). |
| Error System | UX | ✅ Built & Verified | — | src/lib/errors.ts | — | Yes | Medium | 25+ error codes with recovery actions (v4.0.0). |
| Officials Claim Verification | Claim Flow | ✅ Built & Verified | /claim/[slug] | /api/claim/verify | Official | Partial | High | Token verification + claim status update. |
| Campaign Creation Wizard | Campaign Registration | ✅ Built & Verified | /campaigns/new | /api/campaigns | Campaign | Yes | Medium | Municipal flow now enforces province + municipality and only backend-supported election enums. |
| Credentials Login | Authentication | ✅ Built & Verified | /login | /api/auth/[...nextauth] | User, Membership | Yes | High | Session/JWT auth path validated. |
| OAuth Login | Authentication | ✅ Built & Verified | /login | /api/auth/[...nextauth], /api/auth/providers-status | User | Yes | Medium | Provider status endpoint + environment-aware login UI with graceful fallback to credentials. |
| Subscription Checkout | Billing & Payments | ✅ Built & Verified | /billing | /api/stripe/checkout, /api/stripe/webhook | Subscription | Partial | High | Checkout + webhook updates implemented. |
| Print Escrow Release | Billing & Payments | ✅ Built & Verified | /print/jobs/[id] | /api/print/payment/release | PrintPayment | Partial | High | Release endpoint exists for completion flow. |
| Abuse Controls (Duplicate Vote, Size Guard) | Security | ✅ Built & Verified | /polls, /social/polls/[id] | /api/polls/[id]/respond | PollResponse | Yes | High | App checks + DB uniqueness backstops in place. |
| Rate Limiting | Security | ✅ Built & Verified | — | All public routes | — | Yes | High | Sliding-window limiter: auth (10/min), form (5/hr), read (100/min). v3.0.0. |
| CAPTCHA | Security | ✅ Built & Verified | /claim/[slug], /candidates/[slug] | /api/claim/request, /api/public/candidates/[slug]/* | — | Yes | Medium | Cloudflare Turnstile verification enforced on public intake routes. |
| Anonymous Polling | Security / Polls | ✅ Built & Verified | /how-polling-works, /verify-vote | /api/polls/[id]/respond, /api/polls/verify-receipt | PollResponse (voteHash, receiptHash) | Yes | High | SHA-256 vote hashing, voter receipts. v3.0.0. |
| Error Boundary Component | Code Quality | ✅ Built & Verified | — | — | — | Yes | Medium | Reusable ErrorBoundary wraps major sections. v3.0.0. |
| Audit Logging | Security | ✅ Built & Verified | — | Cross-cutting | ActivityLog | Yes | High | ActivityLog wiring present across campaign mutations. |
| Marketing Landing + SEO | Marketing Site | ✅ Built & Verified | / | — | — | Yes | Medium | Hero postal search, voter section, OG metadata and icons now set. |
| Progressive Web App Install | Mobile PWA | ✅ Built & Verified | / (global) | /sw.js | Notification, PushSubscription | Partial | Medium | Manifest + service worker + install hooks active. |
| User Profile Updates | User Management | ✅ Built & Verified | /settings | /api/users/[id] | User | Yes | Medium | Profile edit and role display available. |
| Membership Roles/Permissions | User Management | ✅ Built & Verified | /admin (partial shell) | Cross-cutting | Membership, Role enum | Yes | High | Backend role checks implemented broadly. |
| Election/Official Seeding Scripts | Data Ingestion | ✅ Built & Verified | — | — | Official, ElectionResult, GeoDistrict | Yes | High | Nationwide ingest now pages all representatives (`/representatives?limit=200&offset=*`) and all boundary sets/boundaries across Canada, with federal GeoJSON collection persistence. |
| Postal Code Geo Lookup Cache | Data Ingestion | ✅ Built & Verified | /lookup | /api/geo, /api/geo/municipalities, /api/geo/wards | GeoDistrict | Yes | Medium | Lookup and district cache flow operational. |
| Public/Private DTO Boundary | API Coverage | ✅ Built & Verified | Mixed | /api/officials, /api/polls, /api/public/* | Official, Poll, Contact | Yes | High | DTO separation documented and reflected in route behavior. |
| API Surface Breadth | API Coverage | ✅ Built & Verified | Mixed | 70+ endpoints under /api/* | Multiple | Yes | High | Broad functional coverage across campaign + social + print. |
