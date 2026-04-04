# Route Map

## Poll City Admin Routes — `/(app)/*`

All routes require authentication and active campaign membership.

| Route | Purpose | Auth | Min Role |
|---|---|---|---|
| `/dashboard` | Campaign overview — stats, activity, support bar | Required | VOLUNTEER |
| `/contacts` | Voter/supporter CRM — list, search, filter | Required | VOLUNTEER |
| `/contacts/[id]` | Contact detail — profile, interactions, tasks, custom fields | Required | VOLUNTEER |
| `/canvassing` | Walk list management — create, assign lists | Required | VOLUNTEER |
| `/canvassing/walk` | Mobile walk list — household-first canvassing | Required | VOLUNTEER |
| `/tasks` | Task management — create, assign, track | Required | VOLUNTEER |
| `/gotv` | Election day dashboard — upload voted lists, track pull % | Required | CAMPAIGN_MANAGER |
| `/call-list` | Candidate call list — auto-generated, tap to call | Required | VOLUNTEER |
| `/lookup` | Address lookup — search voter, notify staff | Required | VOLUNTEER |
| `/capture` | Quick capture — volunteer, sign, donation on the fly | Required | VOLUNTEER |
| `/import-export` | CSV import and export | Required | CAMPAIGN_MANAGER |
| `/import-export/smart-import` | AI-assisted column mapping import wizard | Required | CAMPAIGN_MANAGER |
| `/ai-assist` | AI campaign assistant | Required | VOLUNTEER |
| `/settings` | Campaign and profile settings | Required | CAMPAIGN_MANAGER |
| `/settings/fields` | Custom field configuration | Required | CAMPAIGN_MANAGER |
| `/campaigns/new` | Create a new campaign | Required | Any authenticated |

**Print routes (Phase 1 — embedded in Admin, not yet built):**

| Route | Purpose | Status |
|---|---|---|
| `/print` | Print hub — orders, templates | Placeholder |
| `/print/signs` | Sign tracking list and map | Not built |
| `/print/orders` | Print order management | Not built |
| `/print/distribution` | Distribution tracking | Not built |

---

## Poll City Social Routes — `/social/*`

Public routes: no authentication required to browse.
Interaction routes: authentication required to vote, follow, ask questions.

| Route | Purpose | Auth | Notes |
|---|---|---|---|
| `/social` | Discover — postal code → local reps + polls | Optional | Public browsing |
| `/social/officials` | Officials list — search, filter by level | Optional | Public |
| `/social/officials/[id]` | Official detail — bio, Q&A, follow | Optional to view | Auth to follow/ask |
| `/social/polls` | Public polls list | Optional | Public |
| `/social/polls/[id]` | Poll detail — vote, results (all 5 types) | Optional to view | Auth for identified vote |
| `/social/profile` | User profile — following, preferences | Required | Social user settings |

**Consent bridge entry points (embedded in Social routes):**

| Action | Route | Data collected | Consent gate |
|---|---|---|---|
| Support signal | `/social/officials/[id]` | officialId, signalType, postalCode | Explicit button press |
| Volunteer opt-in | `/social` or `/social/officials/[id]` | name, phone (optional), postalCode | Explicit form submit |
| Sign request | `/social/officials/[id]` | address, signType | Explicit form submit |
| Contact permission | Any Social page | userId, campaignId, scope | Explicit checkbox |
| Update opt-in | Any Social page | userId, campaignId, notificationType | Explicit checkbox |

---

## Shared API Routes — `/api/*`

### Public (no auth required)
| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET POST | NextAuth — login, session, JWT |
| `/api/geo` | GET | Postal code → ward/riding lookup |
| `/api/officials` | GET | Public officials list |
| `/api/officials/[id]` | GET | Public official detail |
| `/api/officials/[id]/questions` | GET POST | Public Q&A |
| `/api/polls/[id]/respond` | GET POST | Vote and get results (visibility enforced inside) |
| `/api/social/signal` | POST | Consent-gated support signal |

### Admin — Auth + Membership required
| Route | Method | Purpose |
|---|---|---|
| `/api/campaigns` | GET POST | Campaign management |
| `/api/campaigns/switch` | GET POST | Switch active campaign |
| `/api/contacts` | GET POST | Contacts CRM |
| `/api/contacts/[id]` | GET PATCH DELETE | Single contact |
| `/api/contacts/streets` | GET | Street names for canvassing filter |
| `/api/interactions` | GET POST | Interaction logging |
| `/api/tasks` | GET POST | Tasks |
| `/api/tasks/[id]` | GET PATCH DELETE | Single task |
| `/api/canvass` | GET POST | Canvass lists |
| `/api/canvass/assign` | POST | Assign to list |
| `/api/gotv` | GET | GOTV stats |
| `/api/gotv/upload` | POST | Upload voted list |
| `/api/gotv/priority-list` | GET | Unsupported voters |
| `/api/call-list` | GET | Candidate call list |
| `/api/call-list/[id]` | PATCH | Update call status |
| `/api/campaign-fields` | GET POST PATCH DELETE | Custom field management |
| `/api/custom-field-values` | GET POST | Custom field values |
| `/api/import` | POST | Smart import |
| `/api/import-export` | GET POST | CSV export/import |
| `/api/ai-assist` | POST | AI assistant |
| `/api/donations/quick-capture` | POST | Donation pledge |
| `/api/volunteers/quick-capture` | POST | Volunteer signup |
| `/api/signs/quick-capture` | POST | Sign request |
| `/api/notifications/staff-alert` | POST | Staff notification |
| `/api/polls` | GET POST | Poll management |
| `/api/users/[id]` | PATCH | User profile |

---

## HQ / Subscriber Dashboard Routes (Phase 1 — inside Admin)

| Route | Purpose | Status |
|---|---|---|
| `/settings` | Campaign info, billing tier | Exists (partial) |
| `/settings/fields` | Custom field configuration | Exists |
| `/analytics` | Cross-channel analytics | Not built |
| `/billing` | Subscription management | Not built |

---

## Route Protection Summary

| Route group | Middleware | Auth required | Campaign membership required |
|---|---|---|---|
| `/(app)/*` | `middleware.ts` enforces session | Yes | Yes — via `resolveActiveCampaign()` on every server page |
| `/social/*` | `middleware.ts` allows public access | No (optional) | No |
| `/api/[campaign-routes]` | `apiAuth()` in route handler | Yes | Yes — `membership.findUnique` in every handler |
| `/api/[public-routes]` | None | No | No |
| `/login` | `middleware.ts` redirects if already authed | No | No |
