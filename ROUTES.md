# ROUTES.md — Poll City Routes & Pages

> Extracted from the actual Next.js App Router filesystem as of April 15, 2026.
> Routing is filesystem-based under src/app/. There is no routes.tsx.
> All (app) routes render inside the campaign app shell (sidebar + topbar).

---

## Campaign App — src/app/(app)/

### Headquarters

| Route | Client Component | Notes |
|---|---|---|
| /dashboard | dashboard-client.tsx | Campaign command centre |
| /command-center | command-center-client.tsx | Live campaign command |
| /alerts | alerts-client.tsx | Alerts & notifications |
| /contacts | contacts-client.tsx | Voter CRM |
| /contacts/[id] | contact-detail-client.tsx | Contact detail |
| /contacts/duplicates | duplicates-client.tsx | Duplicate detection |
| /volunteers | volunteers-client.tsx | Volunteer roster |
| /volunteers/shifts | volunteer-shifts-client.tsx | Shift management |
| /volunteers/groups | volunteers-groups-client.tsx | Group management |
| /volunteers/expenses | volunteer-expenses-client.tsx | Expense tracking |
| /tasks | tasks-client.tsx | Kanban + list |
| /calendar | calendar-client.tsx | Campaign calendar |
| /calendar/candidate | candidate-schedule-client.tsx | Candidate schedule |

### Field Operations

| Route | Client Component | Notes |
|---|---|---|
| /field-ops | field-ops-client.tsx | Field ops tab hub |
| /field-ops/[id] | assignment-detail-client.tsx | Assignment detail |
| /field-ops/map | (page.tsx only) | Field map view |
| /field-ops/walk | (page.tsx only) | Mobile walk mode |
| /field-ops/signs | signs-field-client.tsx | Signs field view |
| /field-ops/scripts | (page.tsx only) | Door scripts (field) |
| /field-ops/print | (page.tsx only) | Print from field |
| /canvassing | canvassing-client.tsx | Canvassing hub |
| /canvassing/walk | walk-shell.tsx | Mobile canvassing |
| /canvassing/turf-builder | turf-builder-client.tsx | Turf assignment |
| /canvassing/scripts | scripts-client.tsx | Door scripts |
| /canvassing/print-walk-list | print-walk-list-client.tsx | Printable walk list |
| /field/programs | programs-client.tsx | Programs list |
| /field/programs/[programId] | program-detail-client.tsx | Program detail |
| /field/routes | routes-client.tsx | Routes list |
| /field/routes/[routeId] | route-detail-client.tsx | Route detail |
| /field/turf | turf-client.tsx | Turf management |
| /field/runs | runs-client.tsx | Canvassing runs |
| /field/teams | teams-client.tsx | Field teams |
| /field/lit-drops | lit-drops-client.tsx | Literature drops |
| /field/materials | materials-client.tsx | Field materials |
| /field/mobile | mobile-client.tsx | Mobile dashboard |
| /field/follow-ups | follow-ups-client.tsx | Follow-up queue |
| /field/audit | audit-client.tsx | Field audit log |
| /signs | signs-client.tsx | Signs map + board |
| /gotv | (page.tsx + components) | GOTV war room |
| /election-night | election-night-client.tsx | Election night |
| /events | events-client.tsx | Campaign events |
| /polls | (page.tsx) | Poll list |
| /polls/new | (page.tsx) | New poll |
| /polls/[id] | (page.tsx) | Poll detail |
| /polls/[id]/live | (page.tsx) | Live results |
| /lookup | (page.tsx) | Voter lookup |
| /eday | eday-client.tsx | Election day ops |

### Finance

| Route | Client Component | Notes |
|---|---|---|
| /finance | finance-overview-client.tsx | Finance Command Centre |
| /finance/budget | budget-command-client.tsx | Budget management |
| /finance/expenses | expenses-client.tsx | Expense tracking |
| /finance/purchase-requests | purchase-requests-client.tsx | Purchase requests |
| /finance/vendors | vendors-client.tsx | Vendor management |
| /finance/reimbursements | reimbursements-client.tsx | Reimbursements |
| /finance/approvals | approvals-client.tsx | Approval queue |
| /finance/reports | reports-client.tsx | Finance reports |
| /finance/audit | audit-client.tsx | Finance audit |
| /fundraising | (page.tsx) | Fundraising command |
| /donations | donations-client.tsx | Donations log |
| /billing | billing-client.tsx | Platform billing |
| /budget | budget-client.tsx | Legacy budget |

### Communications

| Route | Client Component | Notes |
|---|---|---|
| /communications | communications-client.tsx | Email & SMS hub |
| /communications/email | email-client.tsx | Email campaigns |
| /communications/sms | sms-client.tsx | SMS campaigns |
| /communications/inbox | inbox-client.tsx | Unified inbox |
| /communications/social | social-manager-client.tsx | Social media manager |
| /notifications | (page.tsx) | Voter outreach |
| /print | print-client.tsx | Print overview |
| /print/templates | templates-client.tsx | Print templates |
| /print/design/[slug] | (page.tsx) | Design editor |
| /print/jobs | jobs listing | Print jobs |
| /print/jobs/new | (page.tsx) | New job |
| /print/jobs/[id] | (page.tsx) | Job detail |
| /print/products/[product] | (page.tsx) | Product page |
| /print/inventory | (page.tsx) | Inventory |
| /print/packs | packs-client.tsx | Print packs |
| /print/shops | shops-client.tsx | Shop network |
| /print/shops/register | register-client.tsx | Register shop |
| /settings/public-page | (page.tsx) | Campaign website |

### Analytics & Intel

| Route | Client Component | Notes |
|---|---|---|
| /analytics | analytics-client.tsx | Analytics + choropleth map |
| /reports | reports-client.tsx | Reports |
| /resources | resource-library-client.tsx | Resource library |
| /resources/ai-creator | ai-creator-client.tsx | AI content creator |
| /officials | (app) officials | Campaign official view |
| /media | (page.tsx) | Media contacts |
| /coalitions | coalitions-client.tsx | Coalition management |
| /intelligence | (page.tsx) | Opponent intel |

### Settings & Admin

| Route | Client Component | Notes |
|---|---|---|
| /settings | settings-client.tsx | Campaign settings |
| /settings/brand | brand-client.tsx | Brand kit |
| /settings/team | team-client.tsx | Team management |
| /settings/security | security-client.tsx | Security settings |
| /settings/fields | fields-client.tsx | Custom fields |
| /settings/recycle-bin | recycle-bin-client.tsx | Soft-deleted records |
| /import-export | (page.tsx) | Data import/export |
| /import-export/smart-import | (page.tsx) | Smart CSV/XLSX import |
| /admin | admin-party-client.tsx | Admin panel |
| /ai-assist | ai-assist-client.tsx | Ask Adoni (in-app) |
| /help | (page.tsx) | Help centre |

### Operator Console (SUPER_ADMIN only)

| Route | Notes |
|---|---|
| /ops | Platform overview |
| /ops/clients | Client manager |
| /ops/campaigns | All campaigns |
| /ops/security | Security monitor |
| /ops/verify | Feature verification |
| /ops/videos | Videos & docs |
| /ops/content-review | Content review |
| /ops/data-ops | Data operations |
| /ops/demo-tokens | Demo token manager |
| /ops/build | Build status |

### Other App Routes

| Route | Notes |
|---|---|
| /briefing | Daily briefing |
| /call-list | Call list |
| /capture | Quick capture |
| /supporters/super | Super supporters |
| /widgets/[widgetId] | Embeddable widget |
| /forms/[id] | Custom form view |
| /forms/[id]/edit | Form editor |
| /forms/[id]/results | Form results |
| /campaigns | Campaign switcher |
| /campaigns/new | New campaign |

---

## Social App — src/app/social/

| Route | Component | Notes |
|---|---|---|
| /social | social-discover-client.tsx | Discovery feed |
| /social/polls | polls-client.tsx | Browse polls |
| /social/polls/[id] | poll-detail-client.tsx | Poll detail + voting |
| /social/officials | officials-client.tsx | Elected officials |
| /social/officials/[id] | official-detail-client.tsx | Official profile |
| /social/profile | profile-client.tsx | User profile |
| /social/onboarding | onboarding-flow.tsx | Onboarding |

---

## Marketing Site — src/app/(marketing)/

| Route | Notes |
|---|---|
| / | Marketing home |
| /pricing | Pricing page |
| /how-polling-works | Education page |
| /officials | Public officials directory |
| /officials/[id] | Official public profile |
| /candidates/[slug] | Candidate public page |
| /calculator | Campaign cost calculator |
| /demo | Demo overview |
| /demo/candidate | Candidate demo |
| /demo/media | Media demo |
| /demo/party | Party demo |
| /store/[slug] | Campaign store |
| /townhall/[slug] | Public townhall |
| /tv/[slug] | TV mode / results display |
| /help | Help articles |
| /help/[slug] | Help article |
| /privacy, /privacy-policy | Privacy policy |
| /terms | Terms of service |
| /sentiment | Public sentiment |

---

## Auth Routes

| Route | Notes |
|---|---|
| /login | Login |
| /signup | Signup |
| /onboarding | Campaign onboarding wizard |
| /2fa-verify | Two-factor auth verification |
| /accept-invite | Accept team invitation |
| /join/[token] | Join campaign via invite link |
| /reset-password | Password reset |
| /debug-access | Debug access (dev only) |

---

## Special / Standalone Routes

| Route | Notes |
|---|---|
| /canvass | Mobile canvassing (standalone, no sidebar) |
| /f/[slug] | Public form (embeddable) |
| /f/[slug]/embed | Form embed mode |
| /events/[eventId] | Public event page |
| /claim/[slug] | Claim official profile |
| /unsubscribe | Email unsubscribe |
| /verify-vote | Vote verification |
| /volunteer/onboard/[token] | Volunteer onboarding |

---

## Print Layout — src/app/(print)/

| Route | Notes |
|---|---|
| /print/walk-list | Printable walk list (no sidebar) |

---

## Adding New Routes

1. Create directory: `src/app/(app)/new-feature/`
2. Add `page.tsx` (server component — handles auth)
3. Add `new-feature-client.tsx` (client component — handles UI)
4. Add to sidebar in `src/components/layout/sidebar.tsx`
5. Run `npm run build` — exits 0 before pushing

**Dynamic route naming is a contract.** Before creating a new dynamic segment, check:
`find src/app -type d -name "[*]"` — mismatched slug names at the same path level crash the build.

---

## Page Layout Pattern

```tsx
// page.tsx — server component
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { FeatureClient } from "./feature-client";

export default async function FeaturePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <FeatureClient />;
}
```

```tsx
// feature-client.tsx — client component
"use client";

export function FeatureClient() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4 sticky top-0 z-10">
        {/* page header */}
      </div>
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        {/* page content */}
      </div>
    </div>
  );
}
```
