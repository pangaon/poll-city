# Poll City — Changelog

---

## [0.1.0] — MVP Build (Current)

### Built
- Full Next.js 14 app with TypeScript, Tailwind, Prisma
- NextAuth credentials auth with 3 roles (Admin, Manager, Volunteer) + Public user
- **Campaign App:**
  - Dashboard with support rate bar, stat tiles, activity feed, interaction history
  - Contacts CRM — table with search/filter, contact detail page, interaction logging
  - Canvassing — walk lists, household-first view, Not Home per household, GOTV status
  - Tasks — create, assign, priority grouping, status updates
  - Import/Export — CSV both directions, preview before import
  - AI Assist — mock mode + Anthropic/OpenAI provider abstraction
  - Settings — profile, campaign info, field configuration
- **Custom Field System:**
  - CampaignField definitions (27 types: text/boolean/select/multiselect/number/date/textarea)
  - CustomFieldValue EAV table — fully queryable, filterable, exportable
  - Built-in field visibility toggle (show/hide standard fields per campaign)
  - Appears: canvassing cards, contact detail, import/export CSV columns, API filters, stats
- **Poll City Social:**
  - Discover page — postal code lookup → reps + polls
  - Officials list + detail page + Q&A
  - Polls — binary, slider, multiple choice with results
  - Support signals
  - Profile (sign in/out, following)
  - PWA manifest

### Database (27 models)
User, Campaign, Membership, Contact, Household, Tag, ContactTag, CanvassList, CanvassAssignment, Interaction, Task, Sign, VolunteerProfile, Official, OfficialFollow, Poll, PollOption, PollResponse, GeoDistrict, SupportSignal, PublicQuestion, Notification, ServiceProvider, ServiceBooking, CampaignField, CustomFieldValue, ActivityLog

### Key contact fields added from original app review (75 screenshots)
nameTitle, middleName, nameSuffix, gender, streetNumber, streetNumberSuffix, streetName, streetType, streetDirection, unitApt, phoneAreaCode, cellAreaCode, email2, businessEmail, businessPhone, wechat, facebook, twitter, instagram, federalDistrict, federalPoll, provincialDistrict, provincialPoll, municipalDistrict, municipalPoll, gotvStatus, notHome, skipHouse, totalVotersAtAddress, isDeceased, firstChoice, secondChoice, membershipSold, isActiveMember, membershipExpiry, captain, subCaptain, source, pollDistrict

### Fixes applied (Phase 0)
- Dashboard notHome metric corrected
- Officials detail page created
- Officials Q&A API routes created
- Poll detail page created
- .gitignore created
- Sidebar cleaned

---

## Roadmap

### [0.2.0] — Phase 1: Fix Core MVP Breaks
- Campaign creation UI
- Multi-campaign switcher working end to end
- Sign tracking list view
- Volunteer management page
- Complete canvass assignment workflow

### [0.3.0] — Phase 2: Poll City Operational MVP
- Deeper household canvassing workflow
- Sign request intake + sign ops
- Volunteer scheduling
- Phone bank list generation
- Stronger AI campaign assistant

### [0.4.0] — Phase 3: Poll City Social Public MVP
- Full official profile claiming
- Richer address/postal code lookup
- Household support signals (multi-voter)
- Do-not-knock preference
- Public poll analytics

### [1.0.0] — Phase 4: Signature Features
- Campaign Services Marketplace
- GIS map view
- Push notifications
- Geo-targeting
- Monetization flows
